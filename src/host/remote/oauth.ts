/**
 * Signing in through the browser instead of pasting a token, and checking that a webhook really
 * came from the service.
 *
 * Both sign-ins need an OAuth application registered with the service -- that is the service's
 * rule, not this program's -- so they are offered only once one is configured:
 *
 *   GitHub, device flow    GRIMSTROKE_GITHUB_CLIENT_ID=<the app's client id>
 *                          (an OAuth app with "device flow" enabled; no secret is needed)
 *   GitLab, PKCE           GRIMSTROKE_GITLAB_APP_<HOST>=<the application id>, HOST in capitals
 *                          with dots and dashes as underscores (GIT_EXAMPLE_COM); the app's
 *                          redirect URI is http://127.0.0.1:<port>/api/remote/oauth/callback
 *                          and its scope "api". No secret: PKCE is for exactly this.
 *
 * Without them, a pasted token is the way in -- the guided setup explains every step of that.
 */

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { call } from '~/host/remote/http.ts';

// ---------------------------------------------------------------- GitHub device flow

export function githubClientId(): string | undefined {
  return process.env.GRIMSTROKE_GITHUB_CLIENT_ID || undefined;
}

export interface DeviceStart {
  device: string;
  code: string;
  url: string;
  interval: number;
  expiresIn: number;
}

/** Ask GitHub for a code the person types at github.com/login/device. */
export async function deviceStart(
  clientId: string,
  base = 'https://github.com',
): Promise<DeviceStart> {
  const reply = await call<{
    device_code: string;
    user_code: string;
    verification_uri: string;
    interval?: number;
    expires_in?: number;
  }>(`${base}/login/device/code`, () => {}, {
    method: 'POST',
    body: { client_id: clientId, scope: 'repo' },
  });
  const b = reply.body;
  return {
    device: b.device_code,
    code: b.user_code,
    url: b.verification_uri,
    interval: b.interval ?? 5,
    expiresIn: b.expires_in ?? 900,
  };
}

/** Has the person finished? A token when they have; 'pending' or 'slow' while not; an error if refused. */
export async function devicePoll(
  clientId: string,
  device: string,
  base = 'https://github.com',
): Promise<{ token?: string; wait?: 'pending' | 'slow'; error?: string }> {
  const reply = await call<{ access_token?: string; error?: string; error_description?: string }>(
    `${base}/login/oauth/access_token`,
    () => {},
    {
      method: 'POST',
      body: {
        client_id: clientId,
        device_code: device,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      },
    },
  );
  const b = reply.body;
  if (b.access_token) return { token: b.access_token };
  if (b.error === 'authorization_pending') return { wait: 'pending' };
  if (b.error === 'slow_down') return { wait: 'slow' };
  return { error: b.error_description ?? b.error ?? 'GitHub did not say' };
}

// ---------------------------------------------------------------- GitLab PKCE

export function gitlabAppId(host: string): string | undefined {
  return (
    process.env[`GRIMSTROKE_GITLAB_APP_${host.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`] ||
    undefined
  );
}

export interface Pkce {
  verifier: string;
  challenge: string;
  state: string;
}

/** A verifier, its S256 challenge, and an unguessable state, per RFC 7636. */
export function pkce(): Pkce {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge, state: randomBytes(18).toString('base64url') };
}

export function authorizeUrl(
  host: string,
  appId: string,
  redirect: string,
  p: Pkce,
  base = `https://${host}`,
): string {
  const q = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirect,
    response_type: 'code',
    state: p.state,
    scope: 'api',
    code_challenge: p.challenge,
    code_challenge_method: 'S256',
  });
  return `${base}/oauth/authorize?${q}`;
}

export async function exchangeCode(
  host: string,
  appId: string,
  redirect: string,
  code: string,
  verifier: string,
  base = `https://${host}`,
): Promise<string> {
  const reply = await call<{ access_token?: string; error_description?: string }>(
    `${base}/oauth/token`,
    () => {},
    {
      method: 'POST',
      body: {
        client_id: appId,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirect,
        code_verifier: verifier,
      },
    },
  );
  if (!reply.body.access_token)
    throw new Error(reply.body.error_description ?? 'GitLab gave no token');
  return reply.body.access_token;
}

/** Sign-ins waiting for the browser to come back, by state. Kept ten minutes, used once. */
const waiting = new Map<
  string,
  { host: string; verifier: string; redirect: string; book?: string; at: number }
>();

export function remember(
  state: string,
  entry: { host: string; verifier: string; redirect: string; book?: string },
): void {
  for (const [key, value] of waiting) if (Date.now() - value.at > 600_000) waiting.delete(key);
  waiting.set(state, { ...entry, at: Date.now() });
}

export function recall(
  state: string,
): { host: string; verifier: string; redirect: string; book?: string } | undefined {
  const entry = waiting.get(state);
  waiting.delete(state);
  return entry && Date.now() - entry.at <= 600_000 ? entry : undefined;
}

// ---------------------------------------------------------------- webhooks

export function hookSecret(): string {
  return randomBytes(24).toString('base64url');
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Is this delivery really from the service? GitHub signs the body (X-Hub-Signature-256), Gitea
 * too (X-Gitea-Signature), GitLab sends the secret itself (X-Gitlab-Token). No secret, no trust.
 */
export function verifyHook(
  secret: string | undefined,
  headers: Record<string, string | string[] | undefined>,
  body: Buffer,
): boolean {
  if (!secret) return false;
  const get = (name: string): string | undefined => {
    const v = headers[name];
    return Array.isArray(v) ? v[0] : v;
  };
  const gitlab = get('x-gitlab-token');
  if (gitlab !== undefined) return same(gitlab, secret);
  const mac = createHmac('sha256', secret).update(body).digest('hex');
  const github = get('x-hub-signature-256');
  if (github !== undefined) return same(github, `sha256=${mac}`);
  const gitea = get('x-gitea-signature') ?? get('x-forgejo-signature');
  if (gitea !== undefined) return same(gitea, mac);
  return false;
}
