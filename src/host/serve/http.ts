/**
 * The HTTP plumbing: bodies in, JSON out, the token, and where the built app is.
 *
 * node:http and nothing else. The same instinct that hand-writes PNG with `zlib` rather than
 * taking an image library: a dependency is a thing that will one day not install on the
 * machine that needs it, and this is the machine that needs it.
 */

import { timingSafeEqual } from 'node:crypto';
import { existsSync, statSync } from 'node:fs';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
};

/** Bodies are small -- a patch, not a payload. An asset upload is the exception. */
const MAX_BODY = 64 * 1024 * 1024;

export function listen(server: Server, port: number, host: string): Promise<number> {
  return new Promise((done, fail) => {
    server.once('error', fail);
    server.listen(port, host, () => {
      const address = server.address();
      done(typeof address === 'object' && address ? address.port : port);
    });
  });
}

export function send(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': TYPES['.json'] as string,
    'content-length': Buffer.byteLength(text),
  });
  res.end(text);
}

export function html(res: ServerResponse, markup: string): void {
  res.writeHead(200, { 'content-type': TYPES['.html'] as string });
  res.end(markup);
}

export function header(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

export function cookie(req: IncomingMessage, name: string): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return undefined;
}

/**
 * Compare in constant time, and only after the lengths match.
 *
 * timingSafeEqual throws on a length mismatch, which would itself leak the
 * length, so the check is length first and then contents -- and the length of
 * a token generated here is not a secret.
 */
export function accepted(supplied: string | undefined, token: string): boolean {
  if (!supplied) return false;
  const a = Buffer.from(supplied);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function readRaw(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY) throw new Error('body too large');
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

export async function readBody(req: IncomingMessage): Promise<unknown> {
  const raw = (await readRaw(req)).toString('utf8');
  if (raw.trim() === '') return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`body is not JSON: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Where the built app is.
 *
 * Walk up looking for dist/app.js, the same way the renderer finds its fonts,
 * so it works from source during development and from the package once it is
 * installed.
 */
export function appBundle(): string | undefined {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i += 1) {
    const candidate = join(dir, 'dist', 'app.js');
    if (existsSync(candidate)) return candidate;
    dir = dirname(dir);
  }
  return undefined;
}

/**
 * The app script's address, with its version in it: a phone keeps it until the next build
 * instead of fetching half a megabyte again on every page it opens.
 */
export function appUrl(): string {
  const file = appBundle();
  if (!file) return '/app.js';
  const stamp = statSync(file);
  return `/app.js?v=${stamp.size.toString(36)}${Math.round(stamp.mtimeMs).toString(36)}`;
}

/** One request, with everything a route needs to answer it. */
export interface Ask {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  path: string;
  /** The board to open when a request names none. */
  board: string;
}
