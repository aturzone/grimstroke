/**
 * Render every palette, every block, every frame and every paper, for someone
 * to LOOK at.
 *
 * This is the only instrument for the class of problem that does not reduce to
 * a number: a badge four pixels off, a tear that eats a chip, a palette that
 * reads as mud, a hand-drawn circle that still looks like an <ellipse>. Run it
 * after changing anything in the stylesheet, the palettes or the look modules.
 *
 * The output is gitignored. It is not a baseline and nothing compares against
 * it -- output is stable within one browser build and changes with the next, so
 * a baseline breaks on every upgrade and teaches whoever maintains it to accept
 * the new one unread.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { board } from '~/draw/doc/board/build.ts';
import type { BookSpec } from '~/draw/doc/book/model.ts';
import { renderShelf, renderSpread } from '~/draw/doc/book/render.ts';
import type { RenderedPage } from '~/draw/doc/model.ts';
import { page } from '~/draw/doc/page/build.ts';
import { FRAMES } from '~/draw/look/frame.ts';
import { PAPERS } from '~/draw/look/grid.ts';
import { PALETTES } from '~/draw/look/palette.ts';
import { DEFAULT_FACE } from '~/draw/material/face/model.ts';
import { CATALOGUE } from '~/draw/material/face/parts.ts';
import { exportPages } from '~/host/export.ts';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const FIXTURES = join(ROOT, 'tests', 'fixtures');
const OUT = join(ROOT, 'tools', 'looksheet');
const UI = join(FIXTURES, 'ui.png');

function everyBlock(id: string, paletteId: string, direction: 'ltr' | 'rtl'): RenderedPage {
  const rtl = direction === 'rtl';
  return page(id, { palette: paletteId, direction, width: 720, paper: 'ruled', grain: 0.8 })
    .title(rtl ? 'دکمه ورود با پس‌زمینه هم‌رنگ است' : 'Every block, in one page')
    .chip('critical')
    .chip(paletteId)
    .trail(rtl ? 'کیف پول' : 'Wallet', rtl ? 'ردیف بالا' : 'Top row')
    .heading(rtl ? 'دست‌نویس' : 'Written by hand', 2, { hand: true })
    .text(
      rtl
        ? 'رنگ دکمه `#4070F0` روی زمینه `#4070F0` — نسبت `1.02:1` اندازه‌گیری شد.'
        : 'Measured `#4070F0` on `#4070F0` — ratio `1.02:1`, against a `3:1` threshold.',
    )
    .label(rtl ? 'یک برچسب ماژیکی' : 'a marker label')
    .label(rtl ? 'روی مرکب' : 'on the ink', { tone: 'ink' })
    .bullets('A first measured fact', 'A second one, longer, so the wrap can be judged')
    .table([
      ['what', 'expected', 'measured'],
      ['contrast', '3:1', '1.02:1'],
    ])
    .image(UI, {
      caption: 'Build 102',
      marks: [
        { rect: 'pct:22,30,64,5', kind: 'redact' },
        { rect: 'pct:22,37,64,5', kind: 'circle', note: 'Two-factor is off.' },
        { rect: 'pct:22,73,22,7', kind: 'box', badge: '1', note: 'The control is here.' },
        { rect: 'pct:24,58,30,4', kind: 'highlight' },
      ],
    })
    .note('A sticky note, in its own palette.', { title: 'measured' })
    .code('Cubit — from Success\n     to NetworkError', 'app log')
    .quote('A requirement, quoted exactly.', 'spec clause 2')
    .divider()
    .render();
}

/** Every way a picture can be mounted, in one column, at one palette. */
function everyFrame(): RenderedPage {
  const p = page('frames', {
    palette: 'studio',
    paper: 'squared',
    grain: 0.8,
    width: 560,
    imageMaxHeight: 260,
  });
  p.heading('Every frame', 1, { hand: true });
  for (const kind of FRAMES) p.image(UI, { frame: kind, caption: kind });
  return p.render();
}

/** Every ruling, and every mark a hand can make. */
function everyHand(): RenderedPage {
  const p = page('hand', { palette: 'studio', grain: 0.8, width: 720, imageMaxHeight: 620 });
  p.heading('Every mark a hand makes', 1, { hand: true, colour: '#1f3fd0' });
  p.image(UI, {
    frame: 'none',
    marks: [
      { rect: 'pct:22,37,64,5', kind: 'circle', colour: '#1f3fd0' },
      { rect: 'pct:22,37,64,5', kind: 'arrow', from: 'bottom', colour: '#1f3fd0' },
      { rect: 'pct:24,58,30,4', kind: 'highlight', colour: '#ffd23f' },
      { rect: 'pct:22,24,30,4', kind: 'underline', colour: '#15654f' },
      { rect: 'pct:22,73,22,7', kind: 'box', note: 'a hard box, for a measurement' },
      { rect: 'pct:3,18,14,4', kind: 'arrow', from: 'end', colour: '#c0392b' },
    ],
  });
  return p.render();
}

function everyPaper(): Array<{ page: RenderedPage; out: string }> {
  return PAPERS.map((kind) => ({
    page: page(`paper-${kind}`, { palette: 'studio', paper: kind, grain: 0.8, width: 420 })
      .heading(kind, 2, { hand: true })
      .text('Paper wants tooth, not a tint.')
      .spacer(110)
      .render(),
    out: join(OUT, `paper-${kind}.png`),
  }));
}

/** Every cover material, a full shelf, and a spread with every block on it. */
function everyBook(): Array<{ page: RenderedPage; out: string }> {
  const filled = (n: number, p: string): BookSpec['leaves'] =>
    Array.from({ length: n }, (_, i) => ({
      id: `${p}${i}`,
      blocks: [{ kind: 'text', text: 'x' }],
    }));

  const books: BookSpec[] = [
    {
      id: 'cloth',
      title: 'Cloth',
      palette: 'studio',
      minLeaves: 48,
      leaves: filled(22, 'a'),
      cover: {
        colour: '#1f3fd0',
        material: 'cloth',
        title: 'Wallet\naudit',
        spine: 'Wallet audit',
        stickers: [
          {
            id: 's1',
            kind: 'label',
            at: [68, 76],
            width: 46,
            rotation: -7,
            text: 'live',
            colour: '#ffd23f',
          },
          { id: 's2', kind: 'shape', at: [24, 82], width: 16, shape: 'circle', colour: '#ff2e63' },
        ],
      },
    },
    {
      id: 'kraft',
      title: 'Kraft',
      palette: 'studio',
      minLeaves: 80,
      leaves: filled(64, 'b'),
      cover: {
        colour: '#c6512b',
        material: 'kraft',
        title: 'Design\nreview',
        spine: 'Design review',
        stickers: [
          { id: 's3', kind: 'shape', at: [50, 9], width: 46, rotation: -4, shape: 'tape' },
        ],
      },
    },
    {
      id: 'leather',
      title: 'Leather',
      palette: 'studio',
      minLeaves: 24,
      leaves: [],
      cover: {
        colour: '#15654f',
        material: 'leather',
        title: 'Field\nnotes',
        spine: 'Field notes',
      },
    },
    {
      id: 'plastic',
      title: 'Plastic',
      palette: 'studio',
      minLeaves: 36,
      leaves: filled(12, 'c'),
      cover: { colour: '#e0a21a', material: 'plastic', title: 'Sprint 14', spine: 'Sprint 14' },
    },
    {
      id: 'card',
      title: 'Card',
      palette: 'studio',
      archived: true,
      minLeaves: 60,
      leaves: filled(60, 'd'),
      cover: { colour: '#6b4e9e', material: 'card', title: 'Q1\nmigration', spine: 'Q1 migration' },
    },
  ];

  const spread: BookSpec = {
    id: 'spread',
    title: 'Every block, bound',
    palette: 'newsprint',
    paper: 'ruled',
    grain: 0.7,
    minLeaves: 40,
    leaves: [
      {
        id: 'a',
        blocks: [
          { kind: 'heading', text: 'Tuesday', level: 1, hand: true, colour: '#1f3fd0' },
          { kind: 'text', text: 'Measured `#4070F0` on `#4070F0` — ratio `1.02:1`.' },
          { kind: 'bullets', items: ['A first measured fact', 'A second one, a little longer'] },
          { kind: 'note', text: 'Nobody turns it on.', title: 'measured' },
        ],
      },
      {
        id: 'b',
        paper: 'squared',
        blocks: [
          { kind: 'heading', text: 'What to do', level: 2, hand: true },
          { kind: 'label', text: 'ship blocker' },
          {
            kind: 'table',
            rows: [
              ['what', 'expected', 'measured'],
              ['contrast', '3:1', '1.02:1'],
            ],
            head: true,
          },
          { kind: 'code', text: 'Cubit — from Success\n     to NetworkError', label: 'app log' },
          { kind: 'quote', text: 'A requirement, quoted exactly.', cite: 'spec clause 2' },
        ],
      },
    ],
  };

  return [
    { page: renderShelf(books), out: join(OUT, 'shelf.png') },
    { page: renderSpread(spread, { leaf: 0 }), out: join(OUT, 'spread.png') },
  ];
}

/**
 * Every part of a character, in one art style, with a profile card at the end.
 *
 * Laid out on a board and drawn by the board's own renderer, so what is looked at is exactly
 * what a board, a card and a cover show. It is how the pixel style was found to have twenty
 * parts that drew nothing and a face two columns off centre.
 */
function everyFace(style: 'ink' | 'pixel'): RenderedPage {
  const b = board(`faces-${style}`, { palette: 'studio', paper: 'blank' });
  let x = 0;
  let y = 0;
  for (const [slot, parts] of Object.entries(CATALOGUE)) {
    b.label(slot, { at: [0, y], size: [120] }, { tone: 'ink', hand: false });
    x = 140;
    for (const one of parts) {
      b.place(
        {
          kind: 'face',
          character: {
            id: `${style}-${slot}-${one.id}`,
            style,
            tilt: 0,
            parts: { ...DEFAULT_FACE.parts, [slot]: one.id },
          },
        },
        { at: [x, y], size: [96] },
      );
      x += 104;
    }
    y += 124;
  }
  const person = {
    id: `${style}-card`,
    name: 'Rio Tanaka',
    role: 'design lead',
    bio: 'Draws the boxes. Owns the palette.',
    details: [{ label: 'team', value: 'platform' }],
    style,
    parts: { ...DEFAULT_FACE.parts, hair: 'wave', outfit: 'hoodie', glasses: 'round' },
    palette: { accent: '#00b3a8', cloth: '#c0392f', hair: '#6b4423' },
  };
  b.place({ kind: 'profile', character: person }, { at: [140, y + 20], size: [300] });
  return b.render();
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
  jobs.push({ page: everyFrame(), out: join(OUT, 'frames.png') });
  jobs.push({ page: everyHand(), out: join(OUT, 'hand.png') });
  jobs.push(...everyPaper());
  jobs.push(...everyBook());
  jobs.push({ page: everyFace('ink'), out: join(OUT, 'faces-ink.png') });
  jobs.push({ page: everyFace('pixel'), out: join(OUT, 'faces-pixel.png') });

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
