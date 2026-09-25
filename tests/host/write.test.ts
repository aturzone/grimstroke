import { describe, expect, it } from 'vitest';
import type { BookSpec } from '~/draw/doc/book/model.ts';
import type { Block } from '~/draw/material/model.ts';
import {
  column,
  columns,
  firstEmptyPage,
  planFlow,
  planWrite,
  settleMoves,
  tidyMoves,
  type WriteBlock,
} from '~/host/write.ts';

const book: BookSpec = { id: 'b', minLeaves: 10, leaves: [{ id: 'l1', items: [] }] };
const para = (n: number): Block => ({
  kind: 'text',
  text: `Paragraph ${n}. ${'words '.repeat(60)}`,
});

describe('writing a document', () => {
  it('sets the column at the page margins', () => {
    expect(column(book)).toEqual({ at: [40, 44], width: 480, height: 682 });
    expect(column({ pageSize: 'a4' }).width).toBe(560);
  });

  it('pours blocks onto as many pages as they need, in order', async () => {
    const blocks = Array.from({ length: 14 }, (_, i) => para(i));
    const plan = await planFlow(book, blocks, { measure: false });
    expect(plan.pages.length).toBeGreaterThan(1);
    expect(plan.pages.flat()).toEqual(blocks);
    expect(plan.measured).toBe(false);
    expect(plan.warnings.join()).toMatch(/estimate/);
  });

  it('never leaves a heading alone at the foot of a page', async () => {
    const blocks: Block[] = [
      para(1),
      para(2),
      para(3),
      para(4),
      { kind: 'heading', text: 'Next part', level: 2 },
      para(5),
      para(6),
    ];
    const plan = await planFlow(book, blocks, { measure: false });
    for (const page of plan.pages.slice(0, -1))
      expect(page[page.length - 1]?.kind).not.toBe('heading');
    expect(plan.pages.flat()).toEqual(blocks);
  });

  it('starts after the last page with anything on it', () => {
    expect(firstEmptyPage(book)).toBe(1);
    expect(
      firstEmptyPage({
        ...book,
        leaves: [
          { id: 'a', items: [] },
          { id: 'b', items: [{ id: 'x', at: [0, 0], block: { kind: 'divider' } }] },
        ],
      }),
    ).toBe(3);
  });

  it('lines items up as a column, a row or a grid with even gaps', () => {
    const items = [
      { id: 'a', at: [100, 100] as [number, number] },
      { id: 'b', at: [400, 50] as [number, number] },
      { id: 'c', at: [10, 300] as [number, number] },
    ];
    const boxes = [
      { id: 'a', x: 100, y: 100, w: 200, h: 80 },
      { id: 'b', x: 400, y: 50, w: 100, h: 40 },
      { id: 'c', x: 10, y: 300, w: 150, h: 60 },
    ];
    const col = tidyMoves(items, boxes, ['a', 'b', 'c'], { as: 'column', gap: 10, at: [0, 0] });
    expect(col.map((m) => m.at)).toEqual([
      [0, 0],
      [0, 90],
      [0, 140],
    ]);
    const row = tidyMoves(items, boxes, ['a', 'b'], { as: 'row', gap: 10, at: [0, 0] });
    expect(row.map((m) => m.at)).toEqual([
      [0, 0],
      [210, 0],
    ]);
    const grid = tidyMoves(items, boxes, ['a', 'b', 'c'], {
      as: 'grid',
      columns: 2,
      gap: 10,
      at: [0, 0],
    });
    expect(grid.map((m) => m.at)).toEqual([
      [0, 0],
      [210, 0],
      [0, 90],
    ]);
  });
});

describe('a document with figures, references and columns', () => {
  const doc: WriteBlock[] = [
    { kind: 'heading', text: 'Setup' },
    { kind: 'text', text: 'The numbers are in {ref: Timings}; the steps are on {ref: Steps}.' },
    {
      kind: 'table',
      rows: [
        ['run', 'ms'],
        ['a', '12'],
      ],
      head: true,
      caption: 'Timings',
    },
    ...Array.from({ length: 10 }, (_, i) => para(i)),
    { kind: 'heading', text: 'Steps' },
    { kind: 'text', text: 'Back to {ref: setup}, and {ref: nowhere}.' },
  ];

  it('numbers figures and keeps each with its caption', async () => {
    const plan = await planWrite(book, doc, { measure: false, from: 1 });
    expect(plan.figures).toEqual([{ n: 1, caption: 'Timings', page: 1 }]);
    const figure = plan.pages.flat(2).find((b) => b.kind === 'stack');
    expect(figure?.kind === 'stack' && figure.blocks.map((b) => b.kind)).toEqual(['table', 'text']);
    expect(JSON.stringify(figure)).toContain('Figure 1. Timings');
  });

  it('writes in the page each reference points at, and says which it could not find', async () => {
    const plan = await planWrite(book, doc, { measure: false, from: 1 });
    const text = JSON.stringify(plan.pages);
    const steps = plan.refs.find((r) => r.to === 'Steps')?.page;
    expect(steps).toBeGreaterThan(1);
    expect(text).toContain('figure 1, page 1');
    expect(text).toContain(`on page ${steps}.`);
    expect(text).toContain('Back to page 1');
    expect(text).toContain('page ?');
    expect(plan.warnings.join()).toMatch(/nowhere/);
  });

  it('sets two columns side by side and fills one before the next', async () => {
    const two = columns(book, 2);
    expect(two.xs).toEqual([40, 294]);
    expect(two.width * 2 + 28).toBe(480);
    const one = await planWrite(book, doc, { measure: false, from: 1 });
    const plan = await planWrite(book, doc, { measure: false, from: 1, columns: 2 });
    expect(plan.columns).toBe(2);
    expect(plan.pages[0]?.length).toBe(2);
    expect(plan.pages.flat(2).length).toBe(one.pages.flat(2).length);
  });
});

describe('moving apart what overlaps', () => {
  it('slides what lies on something down below it, in reading order, and leaves ink and stickers', () => {
    const items = [
      { id: 'h', at: [40, 40], block: { kind: 'heading', text: 'A long heading' } },
      { id: 't', at: [40, 90], block: { kind: 'text', text: 'Under it' } },
      { id: 'n', at: [60, 100], block: { kind: 'text', text: 'And this' } },
      { id: 's', at: [50, 60], block: { kind: 'sticker', mark: 'done' } },
      { id: 'i', at: [40, 60], ink: { d: 'M0 0 L10 10' } },
    ] as never;
    const boxes = [
      { id: 'h', x: 40, y: 40, w: 400, h: 110 },
      { id: 't', x: 40, y: 90, w: 400, h: 30 },
      { id: 'n', x: 60, y: 100, w: 200, h: 40 },
      { id: 's', x: 50, y: 60, w: 80, h: 80 },
      { id: 'i', x: 40, y: 60, w: 10, h: 10 },
    ];
    const moves = settleMoves(items, boxes, 10);
    expect(moves).toEqual([
      { op: 'move', id: 't', at: [40, 160] },
      { op: 'move', id: 'n', at: [60, 200] },
    ]);
  });
});
