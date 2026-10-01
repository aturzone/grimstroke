/**
 * The workspace, on a port.
 *
 * `grimstroke serve` and the whole product is a URL. No install, no extension,
 * no desktop build, and no browser automation between a person and their work.
 * An agent talks to the same server over plain HTTP, which needs nothing at
 * all -- not even a browser.
 *
 * Bound to the loopback interface and guarded by a token generated at startup.
 * A board holds screenshots of whatever its owner was working on, and "it is
 * only on localhost" is not an access control policy on a shared machine.
 *
 * This file is the door: the token, the static files, and the order routes are asked in.
 * What is behind it lives beside it -- pages.ts for the surfaces a person opens, api.ts for
 * the JSON an agent posts, live.ts for the documents being held and watched.
 */

import { randomBytes } from 'node:crypto';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname } from 'node:path';
import { useClock } from '~/draw/doc/surface.ts';
import { useDefaultPalette, usePalettes } from '~/draw/look/palette.ts';
import { api } from '~/host/serve/api.ts';
import {
  type Ask,
  accepted,
  appBundle,
  appUrl,
  cookie,
  header,
  listen,
  readBody,
  send,
  TYPES,
} from '~/host/serve/http.ts';
import { issueApi } from '~/host/serve/issue.ts';
import { Live } from '~/host/serve/live.ts';
import { type Login, loginDoor } from '~/host/serve/login.ts';
import { lookOf, THEME_PALETTE } from '~/host/serve/look.ts';
import { pages } from '~/host/serve/pages.ts';
import { Push } from '~/host/serve/push.ts';
import { keepFresh, oauthCallback, remoteApi } from '~/host/serve/remote.ts';
import { publicFile } from '~/host/serve/shell.ts';
import { slash } from '~/host/serve/slash.ts';
import { today, todaySources } from '~/host/serve/today.ts';
import { Store } from '~/host/store/store.ts';

export interface ServeOptions {
  port?: number;
  /** Loopback only unless someone says otherwise, and they have to mean it. */
  host?: string;
  dir?: string;
  /** Provided rather than generated, for a caller that wants a stable URL. */
  token?: string;
  board?: string;
  /** A name and password to sign in with, for a workspace served beyond this computer. */
  login?: Login;
}

export interface Serving {
  url: string;
  port: number;
  token: string;
  store: Store;
  close(): Promise<void>;
}

export async function serve(options: ServeOptions = {}): Promise<Serving> {
  // Cards that count days, and say "today", are drawn against the real time here.
  useClock(Date.now);
  const store = new Store(options.dir === undefined ? {} : { dir: options.dir });
  await store.ready();

  const token = options.token ?? randomBytes(24).toString('base64url');
  const host = options.host ?? '127.0.0.1';
  const live = new Live(store);
  // Cards on open pages are asked about again every minute.
  const stopFresh = keepFresh(live);
  // Reminders to this workspace's owner's devices, looked at once a minute (host/serve/push.ts).
  const push = new Push(store.dir);
  const board = options.board ?? 'workspace';
  const remind = setInterval(() => {
    void (async () => {
      const look = await lookOf(store);
      const q = look.feel.quiet;
      const h = new Date().getHours();
      const hushed = q
        ? q.from < q.to
          ? h >= q.from && h < q.to
          : h >= q.from || h < q.to
        : false;
      await push.tick(await todaySources(live, board), new Date(), hushed);
    })().catch(() => {});
  }, 60_000);
  remind.unref();

  const server = createServer((req, res) => {
    handle(req, res).catch((error) => {
      send(res, 500, { error: error instanceof Error ? error.message : String(error) });
    });
  });

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const path = url.pathname;

    // The token may arrive in the URL once, and is then kept in a cookie so
    // that every later request -- including the ones the browser makes for
    // fonts and images -- carries it without it being in the address bar.
    // The one path a service sends a browser back to, without the workspace token: it proves
    // itself with a single-use state instead (see oauthCallback).
    // The app's own files -- manifest, icons, service worker -- hold nobody's data.
    const shell = publicFile(path);
    if (shell) {
      res.writeHead(200, { 'content-type': shell.type, 'cache-control': 'no-cache' });
      res.end(shell.body);
      return;
    }
    if (path === '/api/remote/oauth/callback') {
      await oauthCallback({ req, res, url, path, board: options.board ?? 'workspace' }, live);
      return;
    }
    const supplied =
      url.searchParams.get('t') ?? header(req, 'x-grimstroke-token') ?? cookie(req, 'gs');
    // With a login, the door is the login page; the token still works as an agent's key.
    if (options.login) {
      const signedIn = accepted(supplied, token);
      if (await loginDoor(req, res, path, options.login, token, signedIn)) return;
    }
    if (!accepted(supplied, token)) {
      send(res, 401, { error: 'bad or missing token' });
      return;
    }
    if (url.searchParams.get('t')) {
      res.setHeader('Set-Cookie', `gs=${token}; Path=/; SameSite=Strict; HttpOnly`);
    }

    if (path === '/app.js') {
      serveApp(req, res, url.searchParams.has('v'));
      return;
    }

    // Board assets and fonts, served from the allowlist the renderer built.
    if (path.startsWith('/a/') || path.startsWith('/f/')) {
      const source = live.source(path.slice(1));
      if (!source || !existsSync(source)) {
        send(res, 404, { error: 'not served' });
        return;
      }
      res.writeHead(200, {
        'content-type': TYPES[extname(source).toLowerCase()] ?? 'application/octet-stream',
        'cache-control': 'public, max-age=31536000, immutable',
      });
      createReadStream(source).pipe(res);
      return;
    }

    // The owner's colours for the palettes, for every page drawn in this request.
    const look = await lookOf(store);
    usePalettes(look.palettes);
    useDefaultPalette(THEME_PALETTE[look.theme]);
    const ask: Ask = { req, res, url, path, board: options.board ?? 'workspace' };
    if (await pushApi(ask, push, live)) return;
    if (await pages(ask, live)) return;
    if (await today(ask, live, [appUrl()])) return;
    if (await slash(ask, live, [appUrl()])) return;
    if (await issueApi(ask, live)) return;
    if (await remoteApi(ask, live)) return;
    if (await api(ask, live)) return;
    send(res, 404, { error: 'no such thing here' });
  }

  const port = await listen(server, options.port ?? 0, host);
  return {
    url: `http://${host}:${port}/?t=${token}`,
    port,
    token,
    store,
    close: () =>
      new Promise<void>((done) => {
        stopFresh();
        clearInterval(remind);
        live.close();
        server.close(() => done());
      }),
  };
}

function serveApp(req: IncomingMessage, res: ServerResponse, versioned: boolean): void {
  const file = appBundle();
  if (!file) {
    send(res, 500, { error: 'dist/app.js is missing. Run `pnpm build` first.' });
    return;
  }
  /*
   * Never cached without asking.
   *
   * The bundle is served from one fixed URL, and with no cache header at all a browser
   * applies its own heuristic freshness: after a rebuild the page kept running the
   * PREVIOUS app, so newly wired controls did nothing and the only symptom was silence.
   * The board's HTML is generated per request anyway; the script must follow it.
   */
  const stamp = statSync(file);
  const etag = `W/"${stamp.size.toString(16)}-${stamp.mtimeMs.toString(16)}"`;
  // The address with its version in it never changes what it holds: kept a year. The bare one
  // is asked about each time -- and answered "not changed" when it has not, which it never was.
  const cache = versioned ? 'public, max-age=31536000, immutable' : 'no-cache';
  if (!versioned && req.headers['if-none-match'] === etag) {
    res.writeHead(304, { etag, 'cache-control': cache });
    res.end();
    return;
  }
  res.writeHead(200, { 'content-type': TYPES['.js'] as string, 'cache-control': cache, etag });
  createReadStream(file).pipe(res);
}

/** A device asks to be told, stops being told, or asks for a first one to see it works. */
async function pushApi(ask: Ask, push: Push, live: Live): Promise<boolean> {
  const { path, req, res } = ask;
  if (path === '/api/push/key' && req.method === 'GET') {
    send(res, 200, { publicKey: await push.publicKey() });
    return true;
  }
  if (path === '/api/push/subscribe' && req.method === 'POST') {
    let fresh: boolean;
    try {
      fresh = await push.subscribe((await readBody(req)) as never);
    } catch (error) {
      send(res, 400, { error: error instanceof Error ? error.message : String(error) });
      return true;
    }
    if (!fresh) {
      send(res, 200, { reached: 0 });
      return true;
    }
    // A first one at once, for a new device: it sees that it reaches it, and how it looks.
    const reached = await push.send({
      title: 'Reminders are on',
      body: 'This device will be told before what you plan, even with grimstroke shut.',
      url: '/today',
      tag: 'hello',
    });
    send(res, 200, { reached });
    return true;
  }
  if (path === '/api/push/unsubscribe' && req.method === 'POST') {
    const { endpoint } = (await readBody(req)) as { endpoint?: string };
    if (endpoint) await push.unsubscribe(endpoint);
    send(res, 200, {});
    return true;
  }
  void live;
  return false;
}
