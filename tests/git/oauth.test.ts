import { createHash, createHmac } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  authorizeUrl,
  devicePoll,
  deviceStart,
  exchangeCode,
  pkce,
  recall,
  remember,
  verifyHook,
} from '@core/git/oauth.ts';
import { describe, expect, it } from 'vitest';

describe('signing in with the browser', () => {
  it('makes a PKCE pair whose challenge is the S256 of the verifier', () => {
    const p = pkce();
    expect(p.challenge).toBe(createHash('sha256').update(p.verifier).digest('base64url'));
    expect(p.state.length).toBeGreaterThan(16);
    const url = new URL(
      authorizeUrl('git.example.com', 'app1', 'http://127.0.0.1:7777/api/remote/oauth/callback', p),
    );
    expect(url.origin).toBe('https://git.example.com');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('scope')).toBe('api');
  });

  it('lets a state be used once, and only once', () => {
    remember('s1', { host: 'h', verifier: 'v', redirect: 'r' });
    expect(recall('s1')).toMatchObject({ host: 'h', verifier: 'v' });
    expect(recall('s1')).toBeUndefined();
    expect(recall('never')).toBeUndefined();
  });

  it('runs the device flow and the code exchange against a service', async () => {
    let polls = 0;
    const server = createServer(async (req, res) => {
      let body = '';
      for await (const c of req) body += c;
      const b = JSON.parse(body || '{}');
      res.setHeader('content-type', 'application/json');
      if (req.url === '/login/device/code')
        return res.end(
          JSON.stringify({
            device_code: 'dev',
            user_code: 'ABCD-1234',
            verification_uri: 'https://github.com/login/device',
            interval: 1,
          }),
        );
      if (req.url === '/login/oauth/access_token') {
        polls += 1;
        return res.end(
          JSON.stringify(
            polls < 2 ? { error: 'authorization_pending' } : { access_token: 'gho_new' },
          ),
        );
      }
      if (req.url === '/oauth/token')
        return res.end(
          JSON.stringify(
            b.code_verifier === 'ver'
              ? { access_token: 'oauth-token' }
              : { error_description: 'bad verifier' },
          ),
        );
      res.statusCode = 404;
      res.end('{}');
    });
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const start = await deviceStart('client', base);
    expect(start).toMatchObject({ device: 'dev', code: 'ABCD-1234' });
    expect(await devicePoll('client', 'dev', base)).toEqual({ wait: 'pending' });
    expect(await devicePoll('client', 'dev', base)).toEqual({ token: 'gho_new' });
    expect(await exchangeCode('h', 'app', 'r', 'code', 'ver', base)).toBe('oauth-token');
    await expect(exchangeCode('h', 'app', 'r', 'code', 'wrong', base)).rejects.toThrow(
      /bad verifier/,
    );
    server.close();
  });
});

describe('webhooks', () => {
  const body = Buffer.from('{"action":"closed"}');
  it('trusts a delivery signed with the secret, from any of the services', () => {
    const mac = createHmac('sha256', 'shh').update(body).digest('hex');
    expect(verifyHook('shh', { 'x-hub-signature-256': `sha256=${mac}` }, body)).toBe(true);
    expect(verifyHook('shh', { 'x-gitea-signature': mac }, body)).toBe(true);
    expect(verifyHook('shh', { 'x-gitlab-token': 'shh' }, body)).toBe(true);
  });
  it('refuses a wrong signature, a missing one, and any delivery when there is no secret', () => {
    expect(verifyHook('shh', { 'x-hub-signature-256': 'sha256=00' }, body)).toBe(false);
    expect(verifyHook('shh', {}, body)).toBe(false);
    expect(verifyHook(undefined, { 'x-gitlab-token': 'anything' }, body)).toBe(false);
  });
});
