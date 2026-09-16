/**
 * Turning a rendered page into a PNG.
 *
 * Playwright is an OPTIONAL peer. A caller that already drives a browser -- and
 * an agent working through a browser tool usually does -- can take the HTML from
 * render() and screenshot it itself; this module exists so the ones that do not
 * are not stuck.
 *
 * Everything is served from memory and from an explicit allowlist rather than
 * from temporary files or data: URLs: nothing to clean up, no base64 inflating a
 * screenshot by a third, a real http origin so @font-face and document.fonts
 * behave, and no path the page can reach that the caller did not name.
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve as resolvePath } from 'node:path';
import type { RenderedPage } from '~/types.ts';

const ORIGIN = 'http://grimstroke.local';

const TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff2': 'font/woff2',
};

export interface ExportOptions {
  /** firefox, chromium or webkit. */
  engine?: 'firefox' | 'chromium' | 'webkit';
  /** Device pixel ratio. 2 for a page that will be looked at closely. */
  dpr?: number;
  /** Where to import playwright from, when it is not resolvable by name. */
  playwrightModule?: string;
}

export interface ExportResult {
  path: string;
  width: number;
  height: number;
  bytes: number;
  /**
   * Printed for a caller that wants to know whether anything changed. It is
   * deliberately not compared against a stored baseline: output is stable within
   * one browser build and changes with the next, so a baseline breaks on every
   * upgrade and teaches whoever maintains it to accept the new one unread.
   */
  sha256: string;
  engine: string;
  engineVersion: string;
  warnings: string[];
}

interface PlaywrightLike {
  [key: string]: { launch(options: { headless: boolean }): Promise<BrowserLike> } | undefined;
}

interface BrowserLike {
  newContext(options: { deviceScaleFactor: number }): Promise<ContextLike>;
  version(): string;
  close(): Promise<void>;
}

interface ContextLike {
  route(pattern: string, handler: (route: RouteLike) => Promise<void>): Promise<void>;
  newPage(): Promise<PageLike>;
  close(): Promise<void>;
}

interface RouteLike {
  request(): { url(): string };
  abort(): Promise<void>;
  fulfill(response: {
    status?: number;
    contentType?: string;
    body: string | Buffer;
  }): Promise<void>;
}

interface PageLike {
  goto(url: string, options: { waitUntil: 'load' }): Promise<unknown>;
  evaluate(fn: () => unknown): Promise<unknown>;
  $(selector: string): Promise<ElementLike | null>;
}

interface ElementLike {
  screenshot(options: { type: 'png' }): Promise<Buffer>;
  boundingBox(): Promise<{ width: number; height: number } | null>;
}

async function loadPlaywright(from?: string): Promise<PlaywrightLike> {
  try {
    return (await import(from ?? 'playwright')) as PlaywrightLike;
  } catch (error) {
    throw new Error(
      'playwright is not available. It is an optional peer: install it, or take ' +
        'renderPage().html and screenshot it with the browser you already have. ' +
        `(${error instanceof Error ? error.message : String(error)})`,
    );
  }
}

/** One browser launch for a whole notebook. */
export async function exportPages(
  jobs: Array<{ page: RenderedPage; out: string }>,
  options: ExportOptions = {},
): Promise<ExportResult[]> {
  if (jobs.length === 0) return [];
  const playwright = await loadPlaywright(options.playwrightModule);
  const engineName = options.engine ?? 'firefox';
  const engine = playwright[engineName];
  if (!engine) throw new Error(`unknown engine ${engineName}`);

  const browser = await engine.launch({ headless: true });
  const results: ExportResult[] = [];
  try {
    for (const job of jobs) {
      const context = await browser.newContext({ deviceScaleFactor: options.dpr ?? 1 });
      const allow = new Map<string, string>();
      for (const [served, source] of Object.entries(job.page.assets)) {
        allow.set(served, resolvePath(source));
      }

      await context.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== ORIGIN) return route.abort();
        const key = url.pathname.replace(/^\//, '');
        if (key === '' || key === 'index.html') {
          return route.fulfill({
            status: 200,
            contentType: 'text/html; charset=utf-8',
            body: job.page.html,
          });
        }
        const source = allow.get(key);
        if (!source) return route.abort();
        return route.fulfill({
          status: 200,
          contentType: TYPES[extname(source).toLowerCase()] ?? 'application/octet-stream',
          body: await readFile(source),
        });
      });

      const tab = await context.newPage();
      await tab.goto(`${ORIGIN}/`, { waitUntil: 'load' });
      // Without this the screenshot can catch a half-painted fallback font,
      // which looks like a font bug in whatever is being documented.
      await tab.evaluate(() => document.fonts.ready);

      const element = await tab.$(job.page.selector);
      if (!element) {
        await context.close();
        throw new Error(`the page has no ${job.page.selector} to capture`);
      }
      const buffer = await element.screenshot({ type: 'png' });
      const box = await element.boundingBox();
      await mkdir(dirname(resolvePath(job.out)), { recursive: true });
      await writeFile(job.out, buffer);
      await context.close();

      const scale = options.dpr ?? 1;
      results.push({
        path: job.out,
        width: Math.round((box?.width ?? 0) * scale),
        height: Math.round((box?.height ?? 0) * scale),
        bytes: buffer.length,
        sha256: createHash('sha256').update(buffer).digest('hex'),
        engine: engineName,
        engineVersion: browser.version(),
        warnings: job.page.warnings,
      });
    }
  } finally {
    await browser.close();
  }
  return results;
}

export async function exportPage(
  page: RenderedPage,
  out: string,
  options: ExportOptions = {},
): Promise<ExportResult> {
  const [result] = await exportPages([{ page, out }], options);
  if (!result) throw new Error('nothing was exported');
  return result;
}
