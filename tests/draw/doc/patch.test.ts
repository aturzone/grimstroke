import { describe, expect, it } from 'vitest';
import type { BoardSpec } from '~/draw/doc/board/model.ts';
import type { Op } from '~/draw/doc/board/patch.ts';
import { apply, invert, PatchError, topZ } from '~/draw/doc/board/patch.ts';

const base = (): BoardSpec => ({
  id: 'b',
  items: [
    { id: 'a', at: [0, 0], block: { kind: 'text', text: 'one' } },
    { id: 'b', at: [10, 10], z: 4, block: { kind: 'text', text: 'two' } },
  ],
});

describe('patching a board', () => {
  it('does not touch the board it was given', () => {
    // The server keeps the authoritative copy and undo keeps the old one, so
    // an in-place edit here would quietly rewrite history.
    const before = base();
    const snapshot = JSON.stringify(before);
    apply(before, [{ op: 'move', id: 'a', at: [99, 99] }]);
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it('bumps the version on every write', () => {
    const one = apply(base(), [{ op: 'move', id: 'a', at: [1, 1] }]).spec;
    expect(one.version).toBe(1);
    expect(apply(one, [{ op: 'move', id: 'a', at: [2, 2] }]).spec.version).toBe(2);
  });

  it('applies all of a patch or none of it', () => {
    // Half-applied edits from an agent that got one id wrong are far worse to
    // recover from than a rejection.
    const before = base();
    expect(() =>
      apply(before, [
        { op: 'move', id: 'a', at: [5, 5] },
        { op: 'move', id: 'nope', at: [5, 5] },
      ]),
    ).toThrow(PatchError);
    expect(before.items[0]?.at).toEqual([0, 0]);
  });

  it('refuses to rename an item in place', () => {
    // Every reference to it would break, including the one the app is holding
    // while it drags the thing.
    const out = apply(base(), [{ op: 'update', id: 'a', patch: { id: 'renamed' } as never }]);
    expect(out.spec.items[0]?.id).toBe('a');
  });

  it('refuses to add an id that is already there', () => {
    expect(() => apply(base(), [{ op: 'add', item: { id: 'a', at: [0, 0] } }])).toThrow(
      /already on this board/,
    );
  });

  it('reports what changed and what went', () => {
    const out = apply(base(), [
      { op: 'add', item: { id: 'c', at: [1, 1] } },
      { op: 'move', id: 'a', at: [2, 2] },
      { op: 'remove', id: 'b' },
    ]);
    expect(out.changed).toEqual(['c', 'a']);
    expect(out.removed).toEqual(['b']);
    expect(out.spec.items.map((i) => i.id)).toEqual(['a', 'c']);
  });

  it('says which items only moved, so their markup need not be sent again', () => {
    // A drag is a move and a raise, and nothing about the item's content changes. Re-rendering
    // it on every pointer event and posting it back is what made a drag cost forty round trips
    // of a whole mounted screenshot.
    const out = apply(base(), [
      { op: 'move', id: 'a', at: [2, 2] },
      { op: 'order', id: 'b', z: 9 },
      { op: 'update', id: 'b', patch: { locked: true } },
      { op: 'add', item: { id: 'c', at: [1, 1] } },
    ]);
    expect(out.changed).toEqual(['a', 'b', 'c']);
    expect(out.placed).toEqual(['a']);
  });

  it('undoes an edit that ADDED a field, even after the undo has crossed the wire as JSON', () => {
    // JSON drops undefined, so an inverse that said "rotation: undefined" arrived at the
    // server as nothing, and the server kept the rotation the page had just taken away.
    const board = base();
    const ops: Op[] = [{ op: 'update', id: 'a', patch: { rotation: 12, group: 'g' } }];
    const back = JSON.parse(JSON.stringify(invert(board, ops))) as Op[];
    const turned = apply(board, ops).spec;
    const restored = apply(turned, back).spec;
    const a = restored.items.find((i) => i.id === 'a');
    expect(a).toEqual(board.items.find((i) => i.id === 'a'));
    expect(a && 'rotation' in a).toBe(false);
  });

  it('does not report an item that was changed and then removed', () => {
    const out = apply(base(), [
      { op: 'move', id: 'a', at: [2, 2] },
      { op: 'remove', id: 'a' },
    ]);
    expect(out.changed).toEqual([]);
    expect(out.removed).toEqual(['a']);
  });

  it('flags a board-level change, which is not an item change', () => {
    const out = apply(base(), [{ op: 'board', patch: { palette: 'carbon' } }]);
    expect(out.reset).toBe(true);
    expect(out.spec.palette).toBe('carbon');
  });

  it('knows what is on top, so a new thing lands above the pile', () => {
    expect(topZ(base())).toBe(4);
    expect(topZ({ id: 'e', items: [] })).toBe(0);
  });
});
