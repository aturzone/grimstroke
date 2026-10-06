import type { BookSpec } from '@core/docs/book.ts';
import { apply, BookPatchError, invert } from '@core/docs/book-patch.ts';
import { describe, expect, it } from 'vitest';

const leaf = (id: string) => ({ id, blocks: [{ kind: 'text' as const, text: id }] });
const base = (): BookSpec => ({
  id: 'b',
  leaves: ['a', 'b', 'c', 'd', 'e'].map(leaf),
  cover: { colour: '#1f3fd0', stickers: [{ id: 's1', kind: 'label', at: [50, 50], text: 'live' }] },
});

describe('patching a notebook', () => {
  it('does not touch the notebook it was given', () => {
    const before = base();
    const snapshot = JSON.stringify(before);
    apply(before, [{ op: 'leaf.remove', id: 'c' }]);
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it('moves a run of leaves as one group', () => {
    // Reordering a chapter one leaf at a time is both tedious and wrong: each
    // single move shifts the indices under the next one.
    const out = apply(base(), [{ op: 'leaf.move', ids: ['d', 'e'], to: 1 }]);
    expect(out.spec.leaves.map((l) => l.id)).toEqual(['a', 'd', 'e', 'b', 'c']);
  });

  it('puts a moved group back where it came from', () => {
    const before = base();
    const ops = [{ op: 'leaf.move' as const, ids: ['d', 'e'], to: 1 }];
    const after = apply(before, ops).spec;
    const back = apply(after, invert(before, ops)).spec;
    expect(back.leaves.map((l) => l.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('clamps a destination past the end rather than losing the leaves', () => {
    const out = apply(base(), [{ op: 'leaf.move', ids: ['a'], to: 99 }]);
    expect(out.spec.leaves.map((l) => l.id)).toEqual(['b', 'c', 'd', 'e', 'a']);
  });

  it('inserts a leaf where it was asked to', () => {
    const out = apply(base(), [{ op: 'leaf.add', leaf: leaf('new'), at: 2 }]);
    expect(out.spec.leaves.map((l) => l.id)).toEqual(['a', 'b', 'new', 'c', 'd', 'e']);
  });

  it('refuses to bind the same leaf in twice', () => {
    expect(() => apply(base(), [{ op: 'leaf.add', leaf: leaf('a') }])).toThrow(BookPatchError);
  });

  it('restores a removed leaf to its own index, not to the end', () => {
    const before = base();
    const ops = [{ op: 'leaf.remove' as const, id: 'c' }];
    const back = apply(apply(before, ops).spec, invert(before, ops)).spec;
    expect(back.leaves.map((l) => l.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('archives rather than deletes, and records when', () => {
    // The archive is a library of finished notebooks, not a bin.
    const out = apply(base(), [{ op: 'archive', archived: true, at: '2026-04-02T00:00:00Z' }]);
    expect(out.spec.archived).toBe(true);
    expect(out.spec.archivedAt).toBe('2026-04-02T00:00:00Z');
    expect(out.spec.leaves).toHaveLength(5);
  });

  it('takes a book back out of the archive', () => {
    const away = apply(base(), [{ op: 'archive', archived: true }]).spec;
    expect(apply(away, [{ op: 'archive', archived: false }]).spec.archived).toBe(false);
  });

  it('keeps the rest of the cover when one part of it changes', () => {
    const out = apply(base(), [{ op: 'cover', patch: { material: 'cloth' } }]);
    expect(out.spec.cover?.colour).toBe('#1f3fd0');
    expect(out.spec.cover?.stickers).toHaveLength(1);
  });

  it('moves a sticker and puts it back', () => {
    const before = base();
    const ops = [
      { op: 'sticker.update' as const, id: 's1', patch: { at: [10, 90] as [number, number] } },
    ];
    const after = apply(before, ops).spec;
    expect(after.cover?.stickers?.[0]?.at).toEqual([10, 90]);
    const back = apply(after, invert(before, ops)).spec;
    expect(back.cover?.stickers?.[0]?.at).toEqual([50, 50]);
  });

  it('bumps the version on every write', () => {
    expect(apply(base(), [{ op: 'book', patch: { title: 'x' } }]).spec.version).toBe(1);
  });
});

describe('a page is a small board', () => {
  const book = (): BookSpec => ({
    id: 'b',
    minLeaves: 10,
    leaves: [{ id: 'l1', blocks: [{ kind: 'heading', text: 'Tuesday' }] }],
  });
  const note = {
    id: 'n',
    at: [100, 200] as [number, number],
    block: { kind: 'note' as const, text: 'hi' },
  };

  it('folds a column of blocks into one stack at the margins', () => {
    const { spec } = apply(book(), [{ op: 'leaf.items', id: 'l1', ops: [] }]);
    const [stack] = spec.leaves[0]?.items ?? [];
    expect(stack).toMatchObject({ id: 'l1-column', at: [40, 44], block: { kind: 'stack' } });
    expect(spec.leaves[0]?.blocks).toBeUndefined();
  });

  it('takes the board vocabulary, and undoes it', () => {
    const start = apply(book(), [{ op: 'leaf.items', id: 'l1', ops: [] }]).spec;
    const ops = [
      { op: 'leaf.items' as const, id: 'l1', ops: [{ op: 'add' as const, item: note }] },
    ];
    const added = apply(start, ops).spec;
    expect(added.leaves[0]?.items?.map((item) => item.id)).toEqual(['l1-column', 'n']);
    const moved = apply(added, [
      { op: 'leaf.items', id: 'l1', ops: [{ op: 'move', id: 'n', at: [5, 6] }] },
    ]).spec;
    expect(moved.leaves[0]?.items?.[1]?.at).toEqual([5, 6]);
    const back = apply(added, invert(start, ops)).spec;
    expect(back.leaves[0]?.items?.map((item) => item.id)).toEqual(['l1-column']);
  });

  it('writes the blank pages up to one that is written on', () => {
    const { spec } = apply(book(), [
      { op: 'leaf.items', id: 'blank-4', ops: [{ op: 'add', item: note }] },
    ]);
    expect(spec.leaves.map((leaf) => leaf.id)).toEqual(['l1', 'blank-2', 'blank-3', 'blank-4']);
    expect(spec.leaves[3]?.items?.[0]?.id).toBe('n');
  });

  it('refuses a page that is not there, in the board words', () => {
    expect(() => apply(book(), [{ op: 'leaf.items', id: 'nope', ops: [] }])).toThrow(/no leaf/);
    expect(() =>
      apply(book(), [{ op: 'leaf.items', id: 'l1', ops: [{ op: 'remove', id: 'ghost' }] }]),
    ).toThrow(BookPatchError);
  });
});
