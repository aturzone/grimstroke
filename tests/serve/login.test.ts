import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkPassword, hashPassword } from '@core/serve/login.ts';
import { type Serving, serve } from '@core/serve/server.ts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('the password', () => {
  it('is kept only as a hash that checks the right one and no other', () => {
    const h = hashPassword('purple elephant');
    expect(h.startsWith('scrypt$')).toBe(true);
    expect(checkPassword('purple elephant', h)).toBe(true);
    expect(checkPassword('purple elephant ', h)).toBe(false);
    expect(checkPassword('', h)).toBe(false);
  });
});

describe('the login door', () => {
  let dir = '';
  let serving: Serving;
  let base = '';
  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'gs-login-'));
    serving = await serve({
      dir,
      port: 0,
      token: 'agent-key',
      login: { user: 'atur', hash: hashPassword('secret one') },
    });
    base = `http://127.0.0.1:${serving.port}`;
  });
  afterAll(async () => {
    await serving.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('sends a browser with no session to the login page', async () => {
    const res = await fetch(`${base}/`, { headers: { accept: 'text/html' }, redirect: 'manual' });
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/login');
    const api = await fetch(`${base}/api/today`);
    expect(api.status).toBe(401);
  });

  it('refuses a wrong password and lets the right one in', async () => {
    const wrong = await fetch(`${base}/login`, {
      method: 'POST',
      body: new URLSearchParams({ user: 'atur', password: 'nope' }),
      redirect: 'manual',
    });
    expect(wrong.status).toBe(401);
    const right = await fetch(`${base}/login`, {
      method: 'POST',
      body: new URLSearchParams({ user: 'atur', password: 'secret one' }),
      redirect: 'manual',
    });
    expect(right.status).toBe(303);
    const cookie = right.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('HttpOnly');
    const inside = await fetch(`${base}/api/today`, {
      headers: { cookie: cookie.split(';')[0] ?? '' },
    });
    expect(inside.status).toBe(200);
  });

  it("still takes the token, as an agent's key", async () => {
    const res = await fetch(`${base}/api/today`, {
      headers: { 'x-grimstroke-token': 'agent-key' },
    });
    expect(res.status).toBe(200);
  });
});
