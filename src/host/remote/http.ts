/**
 * Asking a service something: with the token, with a timeout, and with the ETag of the last
 * answer, so asking again about something that has not changed costs nothing (on GitHub a 304
 * does not count against the rate limit at all).
 *
 * Failures come back as a RemoteError carrying the service's own words -- "Not Found", "403
 * Forbidden: Resource not accessible by personal access token" -- because a card that says
 * "error" teaches nobody what to fix.
 */

export class RemoteError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface Cached {
  etag: string;
  body: unknown;
  headers: Record<string, string>;
}

export interface Reply<T> {
  body: T;
  headers: Record<string, string>;
  /** True when the service said nothing changed and the cached answer was used. */
  cached: boolean;
}

export type Auth = (headers: Record<string, string>) => void;

/** The ETag cache, per process: small, and rebuilt by the first request after a restart. */
const cache = new Map<string, Cached>();
const MAX = 800;

/** A request; GETs are cached by URL and token owner. */
export async function call<T>(
  url: string,
  auth: Auth,
  init: { method?: string; body?: unknown; timeout?: number } = {},
): Promise<Reply<T>> {
  const method = init.method ?? 'GET';
  const headers: Record<string, string> = {
    accept: 'application/json',
    'user-agent': 'grimstroke',
  };
  auth(headers);
  const key = `${headers.authorization ?? headers['private-token'] ?? ''}|${url}`;
  const old = method === 'GET' ? cache.get(key) : undefined;
  if (old) headers['if-none-match'] = old.etag;
  if (init.body !== undefined) headers['content-type'] = 'application/json';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeout ?? 15000);
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
      signal: controller.signal,
    });
  } catch (error) {
    throw new RemoteError(
      0,
      controller.signal.aborted
        ? `${new URL(url).host} did not answer in time`
        : `${new URL(url).host} could not be reached (${error instanceof Error ? error.message : String(error)})`,
    );
  } finally {
    clearTimeout(timer);
  }
  const out: Record<string, string> = {};
  res.headers.forEach((value, name) => {
    out[name] = value;
  });
  if (res.status === 304 && old) return { body: old.body as T, headers: old.headers, cached: true };
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }
  if (!res.ok) throw new RemoteError(res.status, messageOf(res.status, body, res.statusText));
  const etag = res.headers.get('etag');
  if (method === 'GET' && etag) {
    if (cache.size > MAX) cache.delete(cache.keys().next().value as string);
    cache.set(key, { etag, body, headers: out });
  }
  return { body: body as T, headers: out, cached: false };
}

/** The service's own explanation, whichever shape it came in. */
function messageOf(status: number, body: unknown, fallback: string): string {
  const b = body as { message?: unknown; error?: unknown; errors?: unknown } | undefined;
  const said =
    typeof b?.message === 'string'
      ? b.message
      : typeof b?.error === 'string'
        ? b.error
        : Array.isArray(b?.message)
          ? (b as { message: unknown[] }).message.join('; ')
          : typeof body === 'string' && body.length < 200
            ? body
            : fallback;
  const hint =
    status === 401
      ? ' -- the token was refused; make a new one and connect again'
      : status === 403
        ? ' -- the token is not allowed to do that; it may need more scopes'
        : status === 404
          ? ' -- not there, or the token cannot see it'
          : '';
  return `${status} ${said}${hint}`;
}

/** The next page's URL from a Link header, GitHub and GitLab style. */
export function nextLink(headers: Record<string, string>): string | undefined {
  const link = headers.link;
  if (!link) return undefined;
  for (const part of link.split(',')) {
    const m = /<([^>]+)>;\s*rel="next"/.exec(part);
    if (m) return m[1];
  }
  return undefined;
}
