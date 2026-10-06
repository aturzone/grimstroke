/**
 * A door with a name and a password, for a workspace served beyond this computer.
 *
 * On localhost the token in the address is the key. On a server reached from a phone that is
 * not enough -- an address is shared, remembered by browsers, written in logs -- so a workspace
 * started with GRIMSTROKE_LOGIN_USER and GRIMSTROKE_LOGIN_HASH shows a login page instead, and a
 * right name and password hand the browser the same session cookie the token would have.
 *
 * The password is never stored: only its scrypt hash, as "scrypt$<salt hex>$<hash hex>" (make
 * one with `grimstroke hash-password`). Failed attempts are slowed, and after five a place is
 * shut out for a minute.
 */

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

export interface Login {
  user: string;
  hash: string;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function checkPassword(password: string, stored: string): boolean {
  const [kind, salt, hash] = stored.split('$');
  if (kind !== 'scrypt' || !salt || !hash) return false;
  const want = Buffer.from(hash, 'hex');
  const got = scryptSync(password, Buffer.from(salt, 'hex'), want.length);
  return want.length === got.length && timingSafeEqual(want, got);
}

/** The login configured in the environment, if any. */
export function loginFromEnv(env: NodeJS.ProcessEnv = process.env): Login | undefined {
  const user = env.GRIMSTROKE_LOGIN_USER?.trim();
  const hash = env.GRIMSTROKE_LOGIN_HASH?.trim();
  return user && hash ? { user, hash } : undefined;
}

export const failures = new Map<string, { count: number; until: number }>();

export function place(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
  return first || req.socket.remoteAddress || 'unknown';
}

export function secure(req: IncomingMessage): boolean {
  return req.headers['x-forwarded-proto'] === 'https';
}

export function loginPage(message = ''): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>grimstroke</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 16px;
    background: #ecebe6; color: #15120f; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, sans-serif; }
  form { width: min(360px, 100%); display: grid; gap: 14px; padding: 24px 22px 22px;
    background: #fcfaf4; border: 1.5px solid #2a2622; border-radius: 10px; box-shadow: 4px 5px 0 rgba(0,0,0,.3); }
  .mark { display: flex; align-items: center; gap: 10px; font-size: 20px; font-weight: 700; }
  .mark b { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; background: #1f3fd0; color: #fff; font-size: 18px; }
  label { display: grid; gap: 6px; font-size: 13px; color: #5b5750; }
  input { height: 46px; padding: 0 12px; border: 1.5px solid #c9c5bc; border-radius: 8px; background: #fff; font: inherit; font-size: 16px; color: inherit; }
  input:focus { outline: 2.5px solid #1f3fd0; outline-offset: 1px; border-color: transparent; }
  button { height: 48px; border: 0; border-radius: 8px; background: #1f3fd0; color: #fff; font: inherit; font-size: 16px; font-weight: 600; cursor: pointer; }
  .error { margin: 0; color: #b3261e; font-size: 14px; }
</style></head>
<body><form method="post" action="/login">
  <div class="mark"><b>g</b>grimstroke</div>
  ${message ? `<p class="error" role="alert">${message}</p>` : ''}
  <label>name<input name="user" autocomplete="username" autocapitalize="none" required autofocus></label>
  <label>password<input name="password" type="password" autocomplete="current-password" required></label>
  <button type="submit">open the workspace</button>
</form></body></html>`;
}

export async function form(req: IncomingMessage): Promise<URLSearchParams> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > 8192) break;
    chunks.push(chunk as Buffer);
  }
  return new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
}

/**
 * The login routes, and the answer for a request that has no session. Returns true when it has
 * answered; false means the request is let through to the workspace.
 */
export async function loginDoor(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
  login: Login,
  token: string,
  signedIn: boolean,
): Promise<boolean> {
  const cookieFlags = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}${secure(req) ? '; Secure' : ''}`;

  if (path === '/logout') {
    res.writeHead(303, { location: '/login', 'set-cookie': `gs=; Path=/; HttpOnly; Max-Age=0` });
    res.end();
    return true;
  }

  if (path === '/login' && req.method === 'POST') {
    const where = place(req);
    const record = failures.get(where);
    if (record && record.until > Date.now()) {
      res.writeHead(429, { 'content-type': 'text/html; charset=utf-8' });
      res.end(loginPage('Too many tries. Wait a minute, then try again.'));
      return true;
    }
    const body = await form(req);
    const ok =
      body.get('user')?.trim() === login.user &&
      checkPassword(body.get('password') ?? '', login.hash);
    if (!ok) {
      const count = (record?.count ?? 0) + 1;
      failures.set(where, { count, until: count >= 5 ? Date.now() + 60_000 : 0 });
      await new Promise((done) => setTimeout(done, 700));
      res.writeHead(401, { 'content-type': 'text/html; charset=utf-8' });
      res.end(loginPage('That name and password do not match.'));
      return true;
    }
    failures.delete(where);
    res.writeHead(303, { location: '/', 'set-cookie': `gs=${token}; ${cookieFlags}` });
    res.end();
    return true;
  }

  if (path === '/login') {
    if (signedIn) {
      res.writeHead(303, { location: '/' });
      res.end();
      return true;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(loginPage());
    return true;
  }

  if (signedIn) return false;
  // A browser asking for a page is shown the door; anything else is told it is not allowed.
  const wantsPage = req.method === 'GET' && (req.headers.accept ?? '').includes('text/html');
  if (wantsPage) {
    res.writeHead(303, { location: '/login' });
    res.end();
  } else {
    res.writeHead(401, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'sign in first' }));
  }
  return true;
}
