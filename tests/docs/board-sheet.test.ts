import type { BoardSpec } from '@core/docs/board.ts';
import { apply, onSheet } from '@core/docs/board-patch.ts';
import { describe, expect, it } from 'vitest';

const page = (items: BoardSpec['items']): BoardSpec => ({
  id: 'book:x:p1',
  items,
  extent: [0, 0, 560, 800],
  sheet: { book: 'x', bookTitle: 'x', leaf: 'p1', index: 0, count: 1 },
});

describe('a page has an edge', () => {
  it('keeps a moved or added item inside the sheet', () => {
    const r = apply(page([{ id: 'n', at: [10, 10], size: [200, 100] }]), [
      { op: 'move', id: 'n', at: [900, -50] },
      { op: 'add', item: { id: 'm', at: [-300, 2000], size: [100, 80] } },
    ]);
    expect(r.spec.items.find((i) => i.id === 'n')?.at).toEqual([360, 0]);
    expect(r.spec.items.find((i) => i.id === 'm')?.at).toEqual([0, 720]);
  });

  it('leaves a board without an edge alone', () => {
    const r = apply({ id: 'workspace', items: [{ id: 'n', at: [0, 0] }] }, [
      { op: 'move', id: 'n', at: [9000, -9000] },
    ]);
    expect(r.spec.items[0]?.at).toEqual([9000, -9000]);
  });

  it('brings back what was already lost off a page', () => {
    const [lost] = onSheet([{ id: 'l', at: [1400, 300], size: [240] }], 560, 800);
    expect(lost?.at).toEqual([320, 300]);
  });
});
