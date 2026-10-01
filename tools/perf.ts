/**
 * How fast the board moves, measured.
 *
 *   pnpm perf              headless Firefox: software rendering, the worst case
 *   pnpm perf --headed     a real window on this machine, so the real GPU does the drawing
 *
 * Builds a board of 200 items and 2000 strokes in a throwaway workspace, serves it, and counts
 * the frames the browser actually paints while the camera pans at fit, pans zoomed in, and
 * zooms -- the three things a hand does most. Frames are counted with requestAnimationFrame
 * during a fixed stretch of scripted camera moves, one move per frame, so the number is what a
 * person would see, not how fast the script could ask.
 *
 * Needs `pnpm build` first (the server serves dist/app.js) and Playwright's Firefox.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { BoardItem, BoardSpec } from '~/draw/doc/board/model.ts';
import { desk } from '~/face/index.ts';
import { serve } from '~/host/serve/server.ts';
import { Store } from '~/host/store/store.ts';

const headed = process.argv.includes('--headed');
const seconds = 3;

function board(): BoardSpec {
  const items: BoardItem[] = [];
  let seed = 7;
  const rnd = (): number => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 200; i++) {
    const at: [number, number] = [Math.round(rnd() * 6000), Math.round(rnd() * 4000)];
    const kind = i % 4;
    items.push({
      id: `item-${i}`,
      at,
      z: i,
      ...(rnd() < 0.3 ? { rotation: Math.round((rnd() - 0.5) * 12) } : {}),
      ...(kind === 0
        ? {
            size: [240, 160] as [number, number],
            block: { kind: 'note' as const, text: `Note ${i}\n\n- one\n- two` },
          }
        : kind === 1
          ? { block: { kind: 'label' as const, text: `label ${i}` } }
          : kind === 2
            ? {
                size: [300] as [number],
                block: {
                  kind: 'text' as const,
                  text: `A paragraph of text number ${i}, long enough to wrap onto a second line.`,
                },
              }
            : { size: [96] as [number], block: { kind: 'sticker' as const, mark: 'star' } }),
    });
  }
  for (let i = 0; i < 2000; i++) {
    const x = Math.round(rnd() * 6000);
    const y = Math.round(rnd() * 4000);
    const points = Array.from(
      { length: 12 },
      (_, k) =>
        `${k === 0 ? 'M' : 'L'}${Math.round(k * 8 + rnd() * 6)},${Math.round(Math.sin(k / 2) * 14 + rnd() * 6)}`,
    );
    items.push({
      id: `ink-${i}`,
      at: [x, y],
      z: 200 + i,
      ink: {
        d: points.join(' '),
        colour: ['#1f3fd0', '#c0392b', '#15654f'][i % 3] as string,
        weight: 2.5,
        tool: 'pen',
      },
    });
  }
  return { id: 'perf', paper: 'squared', palette: 'studio', items, version: 1 };
}

async function main(): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 'grimstroke-perf-'));
  const store = new Store({ dir });
  await store.writeBoard(board());
  const serving = await serve({ dir, token: 'perf', board: 'perf', face: desk });
  const { firefox } = await import('playwright');
  const browser = await firefox.launch({ headless: !headed });
  const page = await (
    await browser.newContext(
      // --phone: a phone's screen as it draws it -- small, at three device pixels to each one.
      process.argv.includes('--phone')
        ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 }
        : { viewport: { width: 1440, height: 900 } },
    )
  ).newPage();
  await page.goto(`http://127.0.0.1:${serving.port}/?t=perf`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const run = (
    name: string,
    script: string,
  ): Promise<{ name: string; fps: number; worst: number }> =>
    page.evaluate(
      ([label, body, secs]) =>
        new Promise<{ name: string; fps: number; worst: number }>((done) => {
          const app = (
            window as unknown as {
              grimstroke: {
                view: {
                  moveBy(x: number, y: number): void;
                  zoomTo(z: number, p: { x: number; y: number }): void;
                  zoom: number;
                };
                fitAll(): void;
              };
            }
          ).grimstroke;
          const step = new Function('app', 'i', body as string) as (
            a: typeof app,
            i: number,
          ) => void;
          let frames = 0;
          let worst = 0;
          let last = performance.now();
          const end = last + (secs as number) * 1000;
          const tick = (now: number): void => {
            worst = Math.max(worst, now - last);
            last = now;
            frames += 1;
            step(app, frames);
            if (now < end) requestAnimationFrame(tick);
            else
              done({
                name: label as string,
                fps: Math.round((frames / (secs as number)) * 10) / 10,
                worst: Math.round(worst),
              });
          };
          requestAnimationFrame(tick);
        }),
      [name, script, seconds] as const,
    );

  const results = [];
  await page.evaluate(() =>
    (window as unknown as { grimstroke: { fitAll(): void } }).grimstroke.fitAll(),
  );
  await page.waitForTimeout(300);
  results.push(
    await run('pan at fit', 'app.view.moveBy(Math.sin(i / 20) * 14, Math.cos(i / 25) * 9);'),
  );
  await page.evaluate(() => {
    const app = (
      window as unknown as {
        grimstroke: { view: { zoomTo(z: number, p: { x: number; y: number }): void } };
      }
    ).grimstroke;
    app.view.zoomTo(1, { x: 720, y: 450 });
  });
  await page.waitForTimeout(300);
  results.push(
    await run('pan at 100%', 'app.view.moveBy(Math.sin(i / 20) * 14, Math.cos(i / 25) * 9);'),
  );
  const zoomScript =
    'app.view.zoomTo(0.35 + 0.6 * (0.5 + 0.5 * Math.sin(i / 30)), { x: 720, y: 450 });';
  results.push(await run('zoom in and out', zoomScript));
  // --probe: the same zoom with one kind of effect switched off at a time, to see what costs.
  if (process.argv.includes('--probe')) {
    for (const [label, css] of [
      ['no filters', '.viewport * { filter: none !important; }'],
      ['no shadows', '.viewport * { box-shadow: none !important; }'],
      [
        'no grain',
        '.viewport *::before, .viewport *::after { background-image: none !important; }',
      ],
      ['no masks', '.viewport * { mask-image: none !important; clip-path: none !important; }'],
    ] as const) {
      await page.evaluate((text) => {
        const style = document.createElement('style');
        style.id = 'probe';
        style.textContent = text;
        document.head.append(style);
      }, css);
      results.push(await run(`zoom, ${label}`, zoomScript));
      await page.evaluate(() => document.getElementById('probe')?.remove());
    }
  }

  const gpu = await page.evaluate(() => {
    const c = document.createElement('canvas').getContext('webgl');
    const info = c?.getExtension('WEBGL_debug_renderer_info');
    return info ? String(c?.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'unknown';
  });
  console.log(
    `grimstroke perf -- 200 items, 2000 strokes, ${headed ? 'headed' : 'headless'} Firefox ${browser.version()}`,
  );
  console.log(`renderer: ${gpu}`);
  for (const r of results)
    console.log(
      `  ${r.name.padEnd(18)} ${String(r.fps).padStart(5)} fps   worst frame ${r.worst} ms`,
    );
  await browser.close();
  await serving.close();
  rmSync(dir, { recursive: true, force: true });
}

void main();
