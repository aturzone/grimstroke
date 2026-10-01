/**
 * The responsive audit: every surface, at phone, tablet, laptop and desktop sizes, both ways
 * round, in Firefox -- and the build fails if chrome overlaps, runs off the window, or the page
 * scrolls sideways.
 *
 *   node --import ./tools/register.mjs tools/layout.ts
 *
 * It runs on a workspace of its own in a temporary directory, seeded with what makes layouts
 * break: a notebook connected to a repository (the repository tab), a right-to-left notebook
 * with a long name (the top bar), a board, and the "/" bar open. It found a dozen real faults the
 * first time it was run by hand (R15), which is why it now runs on every check.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { BookSpec } from '~/draw/doc/book/model.ts';
import { desk } from '~/face/index.ts';
import { serve } from '~/host/serve/server.ts';

const SIZES: Array<[number, number]> = [
  [360, 740],
  [390, 844],
  [768, 1024],
  [1024, 768],
  [1280, 720],
  [1920, 1080],
];

const dir = mkdtempSync(join(tmpdir(), 'grimstroke-layout-'));
const serving = await serve({ dir, port: 0, token: 'layout', face: desk });

const en: BookSpec = {
  id: 'field',
  title: 'Field notes',
  remote: {
    provider: 'gitlab',
    host: 'git.example.com',
    repo: 'team/a-rather-long-repository-name',
  },
  minLeaves: 12,
  leaves: [
    {
      id: 'one',
      items: [
        {
          id: 'h',
          at: [40, 44],
          size: [480],
          block: { kind: 'heading', text: 'What the audit found' },
        },
        {
          id: 't',
          at: [40, 110],
          size: [480],
          block: { kind: 'text', text: 'A page with words on it.' },
        },
      ],
    },
  ],
};
const fa: BookSpec = {
  id: 'fa',
  title: 'دفترچه‌ی میدانی با نامی نسبتاً بلند',
  direction: 'rtl',
  minLeaves: 8,
  leaves: [
    {
      id: 'one',
      items: [{ id: 'h', at: [40, 44], size: [480], block: { kind: 'heading', text: 'گزارش' } }],
    },
  ],
};
await serving.store.writeBook(en);
await serving.store.writeBook(fa);

const PAGES = [
  '/',
  '/today',
  '/slash',
  '/shelf',
  '/book?id=field',
  '/page?book=field&leaf=one',
  '/book?id=fa',
  '/page?book=fa&leaf=one',
  '/profile',
  '/print?book=field',
];

const { firefox } = (await import('playwright')) as typeof import('playwright');
const browser = await firefox.launch();
const failures: string[] = [];

// As designed at every size, then with the roundest corners at a phone and a laptop: a big radius
// must not push anything off.
const RUNS: Array<{ corners: number; sizes: Array<[number, number]> }> = [
  { corners: 1, sizes: SIZES },
  {
    corners: 3,
    sizes: [
      [390, 844],
      [1280, 720],
    ],
  },
];
for (const run of RUNS) {
  await fetch(`${serving.url.replace(/\/\?.*$/, '')}/api/look`, {
    method: 'POST',
    headers: { 'x-grimstroke-token': serving.token, 'content-type': 'application/json' },
    body: JSON.stringify({ corners: run.corners }),
  });
  for (const [w, h] of run.sizes) {
    for (const path of PAGES) {
      const context = await browser.newContext({
        viewport: { width: w, height: h },
        hasTouch: w < 800,
      });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const sep = path.includes('?') ? '&' : '?';
      await page.goto(`${serving.url.replace(/\/\?.*$/, '')}${path}${sep}t=${serving.token}`, {
        waitUntil: 'networkidle',
      });
      await page.waitForTimeout(500);
      const found = await page.evaluate(() => {
        const visible = (el: Element): boolean => {
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return (
            cs.visibility !== 'hidden' &&
            cs.display !== 'none' &&
            r.width > 2 &&
            r.height > 2 &&
            !el.closest('dialog,[hidden]')
          );
        };
        const name = (el: Element): string =>
          ((el as HTMLElement).dataset.gs ? `[${(el as HTMLElement).dataset.gs}]` : '') +
          `.${[...el.classList].slice(0, 2).join('.')}`;
        const fixed = [...document.querySelectorAll('body *')].filter(
          (el) =>
            getComputedStyle(el).position === 'fixed' &&
            visible(el) &&
            !el.closest('.gs-toasts') &&
            !el.matches(
              '.gs-drop,.gs-empty,[data-gs="viewport"],[data-gs="rule"],.pages-grid,.ss-layer,.ss-scrim',
            ),
        );
        const parts: Element[] = [];
        for (const el of fixed) {
          if (el.matches('.gs-top')) parts.push(...[...el.children].filter(visible));
          else parts.push(el);
        }
        const issues: string[] = [];
        const boxes = parts.map((el) => [name(el), el.getBoundingClientRect()] as const);
        for (const [n, r] of boxes) {
          if (r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1)
            issues.push(`${n} runs off the window`);
        }
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            const [a, ra] = boxes[i] as (typeof boxes)[number];
            const [b, rb] = boxes[j] as (typeof boxes)[number];
            const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
            const iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
            const pi = parts[i] as Element;
            const pj = parts[j] as Element;
            if (ix > 3 && iy > 3 && !pi.contains(pj) && !pj.contains(pi))
              issues.push(`${a} overlaps ${b}`);
          }
        }
        if (document.documentElement.scrollWidth > innerWidth + 1)
          issues.push('the page scrolls sideways');
        return issues;
      });
      // The "/" bar, open, must fit the window.
      if (path.startsWith('/page') || path === '/') {
        await page.keyboard.press('/');
        await page.waitForTimeout(250);
        await page.locator('[data-gs="shape-input"]').fill('dinner with priya friday 8pm');
        await page.waitForTimeout(200);
        const bar = await page.locator('.ss-shell').boundingBox();
        if (!bar || bar.x < 0 || bar.x + bar.width > w + 1)
          found.push('the "/" bar does not fit the window');
      }
      for (const f of [...new Set(found), ...errors.map((e) => `error: ${e}`)])
        failures.push(`${w}x${h} ${path}: ${f}`);
      await context.close();
    }
  }
}

await browser.close();
await serving.close();
rmSync(dir, { recursive: true, force: true });

if (failures.length) {
  console.error(`layout: ${failures.length} problem${failures.length === 1 ? '' : 's'}`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(
  `layout: ${PAGES.length} surfaces at ${SIZES.length} sizes, nothing overlaps or runs off`,
);
