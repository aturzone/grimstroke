import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gateway, readSession, signSession } from '@core/serve/gateway.ts';
import { hashPassword } from '@core/serve/login.ts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('the session cookie', () => {
  it('names its person, and cannot be edited into another', () => {
    const s = signSession('rend', 'secret');
    expect(readSession(s, 'secret')).toBe('rend');
    const forged = s.replace(
      Buffer.from('rend').toString('base64url'),
      Buffer.from('sina').toString('base64url'),
    );
    expect(readSession(forged, 'secret')).toBeUndefined();
    expect(readSession(s, 'another secret')).toBeUndefined();
    expect(readSession(signSession('rend', 'secret', 0), 'secret', 1e13)).toBeUndefined();
  });
});

describe('the gateway', () => {
  let dir = '';
  let close = (): void => {};
  const port = 7981;
  const base = `http://127.0.0.1:${port}`;
  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'gs-gw-'));
    // A stand-in workspace: says whose folder it runs in and which token it was handed.
    const stub = join(dir, 'stub.mjs');
    writeFileSync(
      stub,
      `import { createServer } from 'node:http';
const a = process.argv; const port = Number(a[a.indexOf('--port') + 1]); const token = a[a.indexOf('--token') + 1];
createServer((req, res) => {
  const ok = req.headers['x-grimstroke-token'] === token;
  res.writeHead(ok ? 200 : 401, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ home: process.env.GRIMSTROKE_HOME, ok }));
}).listen(port, '127.0.0.1');`,
    );
    const g = gateway({
      users: [
        { user: 'rend', hash: hashPassword('r-pass') },
        { user: 'sina', hash: hashPassword('s-pass') },
      ],
      dir,
      port,
      cli: stub,
      firstPort: 7982,
      secret: 'test-secret',
    });
    close = g.close;
    await new Promise((done) => setTimeout(done, 700));
  });
  afterAll(() => {
    close();
    rmSync(dir, { recursive: true, force: true });
  });

  const login = async (user: string, password: string): Promise<string> => {
    const res = await fetch(`${base}/login`, {
      method: 'POST',
      body: new URLSearchParams({ user, password }),
      redirect: 'manual',
    });
    return res.status === 303 ? ((res.headers.get('set-cookie') ?? '').split(';')[0] ?? '') : '';
  };

  it('keeps each person in their own workspace', async () => {
    const rend = await login('rend', 'r-pass');
    const sina = await login('sina', 's-pass');
    const a = (await (await fetch(`${base}/api/state`, { headers: { cookie: rend } })).json()) as {
      home: string;
      ok: boolean;
    };
    const b = (await (await fetch(`${base}/api/state`, { headers: { cookie: sina } })).json()) as {
      home: string;
      ok: boolean;
    };
    expect(a).toEqual({ home: join(dir, 'rend'), ok: true });
    expect(b).toEqual({ home: join(dir, 'sina'), ok: true });
  });

  it('turns away a wrong password, a forged cookie and no cookie at all', async () => {
    expect(await login('rend', 's-pass')).toBe('');
    const forged = `gsu=${signSession('rend', 'not-the-secret')}`;
    expect((await fetch(`${base}/api/state`, { headers: { cookie: forged } })).status).toBe(401);
    const page = await fetch(`${base}/`, { headers: { accept: 'text/html' }, redirect: 'manual' });
    expect(page.headers.get('location')).toBe('/login');
  });

  it('serves the app files a phone needs before anyone signs in', async () => {
    const m = await fetch(`${base}/manifest.webmanifest`);
    expect(m.status).toBe(200);
    expect(((await m.json()) as { start_url: string }).start_url).toBe('/today');
    expect((await fetch(`${base}/sw.js`)).status).toBe(200);
  });
});
