/**
 * Render every palette and every block type, for someone to LOOK at.
 *
 * This is the only instrument for the class of problem that does not reduce to a
 * number: a badge four pixels off, a tear that eats a chip, a palette that reads
 * as mud. Run it after changing anything in the stylesheet or the palettes.
 *
 * The output is gitignored. It is not a baseline and nothing compares against it.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportPages } from '~/export/playwright.ts';
import { page } from '~/notebook.ts';
import { PALETTES } from '~/theme/palette.ts';
import type { RenderedPage } from '~/types.ts';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const FIXTURES = join(ROOT, 'tests', 'fixtures');
const OUT = join(ROOT, 'tools', 'looksheet');

function everyBlock(id: string, paletteId: string, direction: 'ltr' | 'rtl'): RenderedPage {
  const rtl = direction === 'rtl';
  return page(id, { palette: paletteId, direction, width: 720 })
    .title(rtl ? 'دکمه ورود با پس‌زمینه هم‌رنگ است' : 'Every block, in one page')
    .chip('critical')
    .chip(paletteId)
    .trail(rtl ? 'کیف پول' : 'Wallet', rtl ? 'ردیف بالا' : 'Top row')
    .text(
      rtl
        ? 'رنگ دکمه `#4070F0` روی زمینه `#4070F0` — نسبت `1.02:1` اندازه‌گیری شد.'
        : 'Measured `#4070F0` on `#4070F0` — ratio `1.02:1`, against a `3:1` threshold.',
    )
    .bullets('A first measured fact', 'A second one, longer, so the wrap can be judged')
    .table([
      ['what', 'expected', 'measured'],
      ['contrast', '3:1', '1.02:1'],
    ])
    .image(join(FIXTURES, 'device.png'), {
      caption: 'Build 102',
      marks: [
        { rect: 'pct:8,64,80,8', badge: '1', note: 'The control is here.' },
        { rect: 'pct:6,22,74,5', kind: 'redact' },
      ],
    })
    .note('A sticky note, in its own palette.', { title: 'measured' })
    .code('Cubit — from Success\n     to NetworkError', 'app log')
    .quote('A requirement, quoted exactly.', 'spec clause 2')
    .divider()
    .render();
}

async function main(): Promise<void> {
  const jobs: Array<{ page: RenderedPage; out: string }> = [];
  for (const palette of PALETTES) {
    jobs.push({
      page: everyBlock(`blocks-${palette.id}`, palette.id, 'ltr'),
      out: join(OUT, `blocks-${palette.id}.png`),
    });
  }
  jobs.push({ page: everyBlock('rtl-newsprint', 'newsprint', 'rtl'), out: join(OUT, 'rtl.png') });

  const results = await exportPages(jobs, { engine: 'firefox' });
  for (const result of results) {
    console.warn(
      `${result.path.padEnd(64)} ${result.width}x${result.height} ${Math.round(result.bytes / 1024)}KB`,
    );
    for (const warning of result.warnings) console.warn(`   warn: ${warning}`);
  }
  console.warn(`\n${results.length} pages in ${OUT}\nNow look at them.`);
}

await main();
