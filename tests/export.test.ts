/**
 * Assertions measured on real rendered PNGs.
 *
 * Deliberately not whole-image baselines. Output is stable within one browser
 * build and changes with the next, so a baseline breaks on every upgrade and
 * teaches whoever maintains it to accept the new one unread -- which feels like
 * coverage and is not. These assert things that must hold whatever the renderer's
 * version.
 */

import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { exportPage } from '~/export/playwright.ts';
import { page } from '~/notebook.ts';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const DEVICE = join(FIXTURES, 'device.png');
const PLATE = [18, 32, 64] as const;

let available = false;
try {
  await import('playwright');
  available = true;
} catch {
  available = false;
}

const out = mkdtempSync(join(tmpdir(), 'grimstroke-test-'));

/** Count exact matches of one colour, by decoding the PNG in a browser. */
async function colourCount(file: string, colour: readonly number[]): Promise<number> {
  const { chromium, firefox } = await import('playwright');
  const engine = firefox ?? chromium;
  const browser = await engine.launch({ headless: true });
  try {
    const tab = await browser.newPage();
    const base64 = readFileSync(file).toString('base64');
    return (await tab.evaluate(
      async ([data, target]) => {
        const image = new Image();
        image.src = `data:image/png;base64,${data as string}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return -1;
        ctx.drawImage(image, 0, 0);
        const { data: pixels } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const [r, g, b] = target as number[];
        let n = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i] === r && pixels[i + 1] === g && pixels[i + 2] === b) n += 1;
        }
        return n;
      },
      [base64, [...colour]] as const,
    )) as number;
  } finally {
    await browser.close();
  }
}

describe.skipIf(!available)('exported pages', () => {
  let plain = '';

  beforeAll(async () => {
    plain = join(out, 'plain.png');
    await exportPage(page('plain', { width: 800 }).image(DEVICE).render(), plain);
  }, 120_000);

  it('does not alter the picture it is showing', async () => {
    // The halftone laid dots across the images in an early version. Exact
    // equality, no threshold.
    expect(await colourCount(plain, PLATE)).toBeGreaterThan(40_000);
  }, 120_000);

  it('actually loaded the image', async () => {
    // A page showing a broken-image icon looks like a record and proves nothing.
    expect(await colourCount(plain, PLATE)).toBeGreaterThan(0);
  }, 120_000);

  it('covers a redacted region completely', async () => {
    const file = join(out, 'redacted.png');
    await exportPage(
      page('redacted', { width: 800 })
        .image(DEVICE, { marks: [{ rect: 'pct:0,0,100,100', kind: 'redact' }] })
        .render(),
      file,
    );
    expect(await colourCount(file, PLATE)).toBe(0);
  }, 120_000);

  it('is the width it was asked for', async () => {
    const file = join(out, 'width.png');
    const result = await exportPage(page('w', { width: 640 }).text('x').render(), file);
    expect(result.width).toBe(640);
    expect(result.height).toBeGreaterThan(0);
  }, 120_000);

  it('repeats exactly within one browser build', async () => {
    const spec = page('repeat', { width: 500 }).text('same').render();
    const a = await exportPage(spec, join(out, 'a.png'));
    const b = await exportPage(spec, join(out, 'b.png'));
    expect(a.sha256).toBe(b.sha256);
  }, 120_000);
});

describe('without a browser', () => {
  it('renders anyway, because render() opens nothing', () => {
    const rendered = page('offline').title('No browser here').text('still fine').render();
    expect(rendered.html).toContain('No browser here');
    expect(rendered.selector).toBe('.mount');
  });
});
