/**
 * Several people on one server, each with a workspace of their own.
 *
 * The gateway is the only thing the world reaches. It keeps the names and password hashes,
 * shows the login page, and hands each signed-in person's requests to their own grimstroke --
 * a separate process with its own data folder and its own token, listening only on this
 * machine. Nothing is shared between two people but this door: not the store, not the event
 * streams, not the caches.
 *
 * Who is signed in is a cookie the gateway signs (name, expiry, HMAC), so one person cannot
 * become another by editing it. The workspace behind never sees a password.
 */

import { spawn } from 'node:child_process';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, request, type ServerResponse } from 'node:http';
import { join } from 'node:path';
import { checkPassword, failures, form, loginPage, place, secure } from '@core/serve/login.ts';
import { publicFile } from '@core/serve/shell.ts';

export interface GatewayUser {
  user: string;
  hash: string;
}

export interface GatewayOptions {
  users: GatewayUser[];
  /** Each person's workspace is kept in <dir>/<name>. */
  dir: string;
  port: number;
  host?: string;
  /** The grimstroke to start for each person: the path to its cli.js. */
  cli: string;
  /** Where the first workspace port starts; each person takes the next. */
  firstPort?: number;
  /** Signs the session cookie; generated when absent (sessions then end with a restart). */
  secret?: string;
}

const COOKIE = 'gsu';
const MONTH = 60 * 60 * 24 * 30;

export function signSession(user: string, secret: string, now = Date.now()): string {
  const until = Math.floor(now / 1000) + MONTH;
  const body = `${Buffer.from(user).toString('base64url')}.${until}`;
  const mac = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${mac}`;
}

export function readSession(
  value: string | undefined,
  secret: string,
  now = Date.now(),
): string | undefined {
  if (!value) return undefined;
  const [name, until, mac] = value.split('.');
  if (!name || !until || !mac) return undefined;
  const want = createHmac('sha256', secret).update(`${name}.${until}`).digest();
  const got = Buffer.from(mac, 'base64url');
  if (got.length !== want.length || !timingSafeEqual(got, want)) return undefined;
  if (Number(until) * 1000 < now) return undefined;
  return Buffer.from(name, 'base64url').toString('utf8');
}

function cookieOf(req: IncomingMessage, name: string): string | undefined {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return undefined;
}

/** A name safe to use as a folder: letters, digits, dot, dash, underscore. */
function folder(name: string): string {
  if (!/^[A-Za-z0-9._-]{1,40}$/.test(name))
    throw new Error(`not a usable name: ${JSON.stringify(name)}`);
  return name;
}

export function readUsers(file: string): GatewayUser[] {
  const raw = JSON.parse(readFileSync(file, 'utf8')) as unknown;
  if (!Array.isArray(raw)) throw new Error('the users file is a list of { user, hash }');
  return raw.map((u) => {
    const { user, hash } = u as Record<string, unknown>;
    if (typeof user !== 'string' || typeof hash !== 'string')
      throw new Error('each user needs a user and a hash');
    return { user: folder(user), hash };
  });
}

export function gateway(options: GatewayOptions): { close(): void } {
  const secret = options.secret ?? randomBytes(32).toString('base64url');
  const first = options.firstPort ?? 7801;
  const behind = new Map<string, { port: number; token: string }>();

  // Each person's own grimstroke, restarted if it stops.
  const children: Array<{ kill(): void }> = [];
  let closing = false;
  options.users.forEach((u, i) => {
    const port = first + i;
    const token = randomBytes(24).toString('base64url');
    const home = join(options.dir, folder(u.user));
    mkdirSync(home, { recursive: true });
    behind.set(u.user, { port, token });
    const start = (): void => {
      const child = spawn(
        process.execPath,
        [options.cli, 'serve', '--host', '127.0.0.1', '--port', String(port), '--token', token],
        {
          env: {
            ...process.env,
            GRIMSTROKE_HOME: home,
            GRIMSTROKE_LOGIN_USER: '',
            GRIMSTROKE_LOGIN_HASH: '',
          },
          stdio: 'ignore',
        },
      );
      children.push(child);
      child.on('exit', () => {
        if (!closing) setTimeout(start, 2000);
      });
    };
    start();
  });

  const cookieFlags = (req: IncomingMessage): string =>
    `Path=/; HttpOnly; SameSite=Lax; Max-Age=${MONTH}${secure(req) ? '; Secure' : ''}`;

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const path = new URL(req.url ?? '/', 'http://x').pathname;
    const user = readSession(cookieOf(req, COOKIE), secret);

    // The app's own files hold nobody's data, and a manifest is fetched without the session.
    const shell = publicFile(path);
    if (shell) {
      res.writeHead(200, { 'content-type': shell.type, 'cache-control': 'no-cache' });
      res.end(shell.body);
      return;
    }
    if (path === '/logout') {
      res.writeHead(303, {
        location: '/login',
        'set-cookie': `${COOKIE}=; Path=/; HttpOnly; Max-Age=0`,
      });
      res.end();
      return;
    }
    if (path === '/login' && req.method === 'POST') {
      const where = place(req);
      const record = failures.get(where);
      if (record && record.until > Date.now()) {
        res.writeHead(429, { 'content-type': 'text/html; charset=utf-8' });
        res.end(loginPage('Too many tries. Wait a minute, then try again.'));
        return;
      }
      const body = await form(req);
      const name = body.get('user')?.trim() ?? '';
      const found = options.users.find((u) => u.user === name);
      if (!found || !checkPassword(body.get('password') ?? '', found.hash)) {
        const count = (record?.count ?? 0) + 1;
        failures.set(where, { count, until: count >= 5 ? Date.now() + 60_000 : 0 });
        await new Promise((done) => setTimeout(done, 700));
        res.writeHead(401, { 'content-type': 'text/html; charset=utf-8' });
        res.end(loginPage('That name and password do not match.'));
        return;
      }
      failures.delete(where);
      res.writeHead(303, {
        location: '/',
        'set-cookie': `${COOKIE}=${signSession(found.user, secret)}; ${cookieFlags(req)}`,
      });
      res.end();
      return;
    }
    if (path === '/login') {
      if (user && behind.has(user)) {
        res.writeHead(303, { location: '/' });
        res.end();
        return;
      }
      res.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      });
      res.end(loginPage());
      return;
    }

    const target = user ? behind.get(user) : undefined;
    if (!target) {
      const wantsPage = req.method === 'GET' && (req.headers.accept ?? '').includes('text/html');
      if (wantsPage) {
        res.writeHead(303, { location: '/login' });
        res.end();
      } else {
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'sign in first' }));
      }
      return;
    }

    // Passed through as it is, streamed both ways: the event streams stay open.
    const headers = { ...req.headers, 'x-grimstroke-token': target.token };
    delete headers.cookie;
    const upstream = request(
      { host: '127.0.0.1', port: target.port, method: req.method, path: req.url, headers },
      (answer) => {
        const out = { ...answer.headers };
        // The workspace's own cookie is its business with the gateway, not the browser's.
        delete out['set-cookie'];
        res.writeHead(answer.statusCode ?? 502, out);
        answer.pipe(res);
      },
    );
    upstream.on('error', () => {
      if (!res.headersSent) res.writeHead(502, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'the workspace is starting; try again in a moment' }));
    });
    req.pipe(upstream);
  }

  const server = createServer((req, res) => {
    handle(req, res).catch(() => {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
  });
  server.listen(options.port, options.host ?? '127.0.0.1');
  return {
    close() {
      closing = true;
      for (const c of children) c.kill();
      server.close();
    },
  };
}
