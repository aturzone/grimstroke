import { createDecipheriv, createECDH, createHmac, createPublicKey, verify } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { TodayEntry } from '~/draw/today/gather.ts';
import { dueAt, encryptPush, makeVapid, vapidAuth } from '~/host/serve/push.ts';

const hkdf = (salt: Buffer, ikm: Buffer, info: Buffer, n: number): Buffer => {
  const prk = createHmac('sha256', salt).update(ikm).digest();
  return createHmac('sha256', prk)
    .update(Buffer.concat([info, Buffer.from([1])]))
    .digest()
    .subarray(0, n);
};

describe('a push message', () => {
  it('is encrypted so the browser it is for, and only it, reads it back (RFC 8291)', () => {
    // The browser's side: its key pair and its auth secret.
    const ua = createECDH('prime256v1');
    ua.generateKeys();
    const auth = Buffer.from('0123456789abcdef');
    const sub = {
      endpoint: 'https://push.example/x',
      keys: { p256dh: ua.getPublicKey().toString('base64url'), auth: auth.toString('base64url') },
    };
    const body = encryptPush(Buffer.from('{"title":"Dinner"}'), sub);

    const salt = body.subarray(0, 16);
    expect(body.readUInt32BE(16)).toBe(4096);
    const idlen = body.readUInt8(20);
    const asPublic = body.subarray(21, 21 + idlen);
    const shared = ua.computeSecret(asPublic);
    const info = Buffer.concat([Buffer.from('WebPush: info\0'), ua.getPublicKey(), asPublic]);
    const ikm = hkdf(auth, shared, info, 32);
    const cek = hkdf(salt, ikm, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
    const nonce = hkdf(salt, ikm, Buffer.from('Content-Encoding: nonce\0'), 12);
    const sealed = body.subarray(21 + idlen);
    const decipher = createDecipheriv('aes-128-gcm', cek, nonce);
    decipher.setAuthTag(sealed.subarray(sealed.length - 16));
    const plain = Buffer.concat([
      decipher.update(sealed.subarray(0, sealed.length - 16)),
      decipher.final(),
    ]);
    expect(plain.at(-1)).toBe(2);
    expect(plain.subarray(0, -1).toString()).toBe('{"title":"Dinner"}');
  });

  it('is signed with the workspace key, for the push service it goes to (RFC 8292)', () => {
    const vapid = makeVapid();
    const header = vapidAuth(
      'https://fcm.googleapis.com/fcm/send/abc',
      vapid,
      Date.UTC(2026, 8, 28),
    );
    const [, token, key] = /^vapid t=([^,]+), k=(.+)$/.exec(header) ?? [];
    expect(key).toBe(vapid.publicKey);
    const [h, c, sig] = (token ?? '').split('.');
    const claims = JSON.parse(Buffer.from(c ?? '', 'base64url').toString());
    expect(claims.aud).toBe('https://fcm.googleapis.com');
    const raw = Buffer.from(vapid.publicKey, 'base64url');
    const pub = createPublicKey({
      key: {
        kty: 'EC',
        crv: 'P-256',
        x: raw.subarray(1, 33).toString('base64url'),
        y: raw.subarray(33).toString('base64url'),
      },
      format: 'jwk',
    });
    expect(
      verify(
        'sha256',
        Buffer.from(`${h}.${c}`),
        { key: pub, dsaEncoding: 'ieee-p1363' },
        Buffer.from(sig ?? '', 'base64url'),
      ),
    ).toBe(true);
  });
});

describe('when a thing is announced', () => {
  const entry = (kind: TodayEntry['kind'], when: string, hasTime: boolean): TodayEntry =>
    ({
      address: 'w',
      id: 'a',
      kind,
      title: 't',
      where: { title: 'w', href: '/' },
      when,
      hasTime,
      done: false,
    }) as TodayEntry;
  it('is before an event, before a reminder, and at nine for a day with no time', () => {
    const at = new Date(2026, 8, 28, 20, 0);
    expect(dueAt(entry('event', at.toISOString(), true))).toBe(at.getTime() - 15 * 60_000);
    expect(dueAt(entry('reminder', at.toISOString(), true))).toBe(at.getTime() - 10 * 60_000);
    expect(dueAt(entry('event', at.toISOString(), false))).toBe(new Date(2026, 8, 28, 9).getTime());
    expect(dueAt(entry('habit', at.toISOString(), true))).toBeUndefined();
  });
});
