import { describe, expect, it } from 'vitest';
import type { BookSpec } from '~/draw/doc/book/model.ts';
import { apply, BookPatchError, invert } from '~/draw/doc/book/patch.ts';

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
