import { describe, expect, it } from 'vitest';
import type { BookSpec } from '~/draw/doc/book/model.ts';
import type { Block } from '~/draw/material/model.ts';
import { column, firstEmptyPage, planFlow, tidyMoves } from '~/host/write.ts';

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
