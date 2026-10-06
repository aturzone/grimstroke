/**
 * Reminders that reach a phone with the page shut: Web Push, from this workspace to its owner's
 * devices.
 *
 * A browser that allowed notifications gives the page a subscription -- an address at its push
 * service and two keys. The workspace keeps them (with its own VAPID keys, made on first use)
 * in its data folder, and once a minute looks at the day: an event fifteen minutes before it
 * starts, a reminder ten minutes before, anything dated with no time at nine that morning, are
 * each announced once to every device of this workspace's owner, and only theirs.
 *
 * The message is encrypted as RFC 8291 says (aes128gcm, the keys agreed over P-256) and the
 * request signed as RFC 8292 says (a VAPID JWT), both with node:crypto alone.
 */

import {
  createCipheriv,
  createECDH,
  createHmac,
  createPrivateKey,
  type ECDH,
  generateKeyPairSync,
  type JsonWebKey,
  randomBytes,
  sign,
} from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gatherToday, type TodayEntry } from '@core/day/gather.ts';

export interface PushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

interface PushState {
  vapid: { publicKey: string; privateJwk: JsonWebKey };
  subscriptions: PushSubscription[];
  /** What has been announced (key -> when), so a restart does not say it twice. */
  sent: Record<string, number>;
}

const b64u = (b: Buffer): string => b.toString('base64url');
const unb64u = (s: string): Buffer => Buffer.from(s, 'base64url');

function hkdf(salt: Buffer, ikm: Buffer, info: Buffer, length: number): Buffer {
  const prk = createHmac('sha256', salt).update(ikm).digest();
  return createHmac('sha256', prk)
    .update(Buffer.concat([info, Buffer.from([1])]))
    .digest()
    .subarray(0, length);
}

/** The body of a push message: the payload encrypted for this one subscription (RFC 8291). */
export function encryptPush(
  payload: Buffer,
  sub: PushSubscription,
  ephemeral?: ECDH,
  salt = randomBytes(16),
): Buffer {
  const uaPublic = unb64u(sub.keys.p256dh);
  const authSecret = unb64u(sub.keys.auth);
  // A new key pair for every message, as the RFC asks; a test may hand one in.
  const own = ephemeral ?? createECDH('prime256v1');
  if (!ephemeral) own.generateKeys();
  const asPublic = own.getPublicKey();
  const shared = own.computeSecret(uaPublic);
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic]);
  const ikm = hkdf(authSecret, shared, keyInfo, 32);
  const cek = hkdf(salt, ikm, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
  const nonce = hkdf(salt, ikm, Buffer.from('Content-Encoding: nonce\0'), 12);
  const cipher = createCipheriv('aes-128-gcm', cek, nonce);
  const body = Buffer.concat([
    cipher.update(Buffer.concat([payload, Buffer.from([2])])),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  const header = Buffer.alloc(16 + 4 + 1);
  salt.copy(header, 0);
  header.writeUInt32BE(4096, 16);
  header.writeUInt8(asPublic.length, 20);
  return Buffer.concat([header, asPublic, body]);
}

/** The Authorization header for a push service (RFC 8292). */
export function vapidAuth(endpoint: string, vapid: PushState['vapid'], now = Date.now()): string {
  const aud = new URL(endpoint).origin;
  const head = b64u(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u(
    Buffer.from(
      JSON.stringify({
        aud,
        exp: Math.floor(now / 1000) + 12 * 3600,
        sub: 'https://github.com/aturzone/grimstroke',
      }),
    ),
  );
  const key = createPrivateKey({ key: vapid.privateJwk, format: 'jwk' });
  const signature = sign('sha256', Buffer.from(`${head}.${claims}`), {
    key,
    dsaEncoding: 'ieee-p1363',
  });
  return `vapid t=${head}.${claims}.${b64u(signature)}, k=${vapid.publicKey}`;
}

export function makeVapid(): PushState['vapid'] {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = publicKey.export({ format: 'jwk' });
  const raw = Buffer.concat([Buffer.from([4]), unb64u(jwk.x as string), unb64u(jwk.y as string)]);
  return { publicKey: b64u(raw), privateJwk: privateKey.export({ format: 'jwk' }) };
}

/** One workspace's push: its keys, its devices, what it has said. */
export class Push {
  private state: PushState | undefined;
  private readonly file: string;

  constructor(dir: string) {
    this.file = join(dir, 'push.json');
  }

  private async load(): Promise<PushState> {
    if (this.state) return this.state;
    try {
      this.state = JSON.parse(await readFile(this.file, 'utf8')) as PushState;
    } catch {
      this.state = { vapid: makeVapid(), subscriptions: [], sent: {} };
      await this.save();
    }
    return this.state;
  }

  private async save(): Promise<void> {
    if (this.state) await writeFile(this.file, JSON.stringify(this.state), { mode: 0o600 });
  }

  async publicKey(): Promise<string> {
    return (await this.load()).vapid.publicKey;
  }

  /** Keep a device; true when it is one not seen before. */
  async subscribe(sub: PushSubscription): Promise<boolean> {
    if (!sub?.endpoint?.startsWith('https://') || !sub.keys?.p256dh || !sub.keys?.auth) {
      throw new Error('not a push subscription');
    }
    const state = await this.load();
    const known = state.subscriptions.some((s) => s.endpoint === sub.endpoint);
    state.subscriptions = [...state.subscriptions.filter((s) => s.endpoint !== sub.endpoint), sub];
    await this.save();
    return !known;
  }

  async unsubscribe(endpoint: string): Promise<void> {
    const state = await this.load();
    state.subscriptions = state.subscriptions.filter((s) => s.endpoint !== endpoint);
    await this.save();
  }

  /** Say something to every device; a device its push service no longer knows is forgotten. */
  async send(message: { title: string; body: string; url: string; tag?: string }): Promise<number> {
    const state = await this.load();
    let reached = 0;
    const payload = Buffer.from(JSON.stringify(message));
    for (const sub of [...state.subscriptions]) {
      try {
        const res = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            authorization: vapidAuth(sub.endpoint, state.vapid),
            'content-encoding': 'aes128gcm',
            'content-type': 'application/octet-stream',
            ttl: '3600',
            urgency: 'high',
          },
          body: new Uint8Array(encryptPush(payload, sub)),
        });
        if (res.status === 404 || res.status === 410) await this.unsubscribe(sub.endpoint);
        else if (res.ok) reached += 1;
      } catch {
        // The push service did not answer this minute; the next thing will try again.
      }
    }
    return reached;
  }

  /**
   * The minute's look at the day: what is due to be announced now and has not been. `hushed`
   * says whether this hour is a quiet one; what falls in it waits until it is over, while there
   * is still time for it to matter.
   */
  async tick(
    sources: Parameters<typeof gatherToday>[0],
    now: Date,
    hushed: boolean,
  ): Promise<void> {
    const state = await this.load();
    if (!state.subscriptions.length || hushed) return;
    const t = now.getTime();
    for (const e of gatherToday(sources, now).today) {
      const at = dueAt(e);
      if (at === undefined || e.done) continue;
      const end = e.when ? new Date(e.when).getTime() + 60 * 60_000 : at + 60 * 60_000;
      if (t < at || t > end) continue;
      const key = `${e.address}:${e.id}:${e.when}`;
      if (state.sent[key]) continue;
      state.sent[key] = t;
      await this.save();
      const time =
        e.hasTime && e.when
          ? new Date(e.when).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })
          : 'today';
      await this.send({
        title: e.title,
        body: `${e.kind === 'event' ? 'at' : 'due'} ${time} · ${e.where.title}`,
        url: e.where.href,
        tag: key,
      });
    }
    // What was said more than a week ago is forgotten.
    for (const [k, v] of Object.entries(state.sent))
      if (t - v > 7 * 86_400_000) delete state.sent[k];
  }
}

/** When a thing on the day is announced: before an event, before a reminder, or at nine. */
export function dueAt(e: TodayEntry): number | undefined {
  if (!e.when || (e.kind !== 'event' && e.kind !== 'reminder')) return undefined;
  const when = new Date(e.when);
  if (!e.hasTime) return new Date(when.getFullYear(), when.getMonth(), when.getDate(), 9).getTime();
  return when.getTime() - (e.kind === 'event' ? 15 : 10) * 60_000;
}

/** The service worker that shows a push and opens its card: served at /sw.js, for all of '/'. */
export const SERVICE_WORKER = `self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('push', (event) => {
  let m = { title: 'grimstroke', body: '', url: '/today' };
  try { m = Object.assign(m, event.data ? event.data.json() : {}); } catch (e) {}
  event.waitUntil(self.registration.showNotification(m.title, {
    body: m.body, tag: m.tag, data: { url: m.url }, icon: '/icon-192.png', badge: '/icon-192.png',
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/today';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((all) => {
    for (const c of all) { if ('focus' in c) { c.navigate(url); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
`;
