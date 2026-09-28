/**
 * Changing a board.
 *
 * One vocabulary, written by two parties. An agent posts these over HTTP and a
 * person produces them by dragging things about, and they go through exactly
 * the same code -- so there is no second implementation of "move an item" that
 * can disagree with the first, and no state a person can reach that an agent
 * cannot.
 *
 * Applying is pure: it takes a board and returns a new one. That is what lets
 * the server keep the authoritative copy, undo keep the old one, and a test
 * check a sequence of edits without a server or a browser anywhere near it.
 */

import type { BoardItem, BoardSpec } from '~/draw/doc/board/model.ts';
import { ITEM_WIDTH } from '~/draw/doc/board/model.ts';

/**
 * A patch that may also CLEAR a field, by naming it as null: ungrouping, unlocking, undoing a
 * rotation on something that had none.
 *
 * Null and not undefined, because a patch crosses the wire as JSON and JSON drops undefined
 * without a word. Clearing a field with undefined worked in the browser and did nothing on
 * the server -- and every undo of an edit that ADDED a field was that same message, so the
 * page and the server quietly came to disagree about the board.
 */
export type Loose<T> = { [K in keyof T]?: T[K] | null | undefined };

export type Op =
  | { op: 'add'; item: BoardItem }
  /** The common case, and the one worth keeping cheap. */
  | { op: 'move'; id: string; at: [number, number] }
  | { op: 'update'; id: string; patch: Loose<Omit<BoardItem, 'id'>> }
  | { op: 'remove'; id: string }
  /** Raise or lower within the stack. */
  | { op: 'order'; id: string; z: number }
  | { op: 'board'; patch: Loose<Omit<BoardSpec, 'id' | 'items'>> };

export interface PatchResult {
  spec: BoardSpec;
  /** Ids of items that were added or changed, in the order they were touched. */
  changed: string[];
  /**
   * The subset of `changed` whose only change was WHERE they are: moved or reordered, with
   * nothing about their content touched. A viewer already holding the item's markup needs
   * only the new position for these, not a re-rendered item -- and a drag is almost nothing
   * else.
   */
  placed: string[];
  removed: string[];
  /** True when anything about the board itself changed, not just its items. */
  reset: boolean;
}

export class PatchError extends Error {}

/**
 * Apply a list of operations.
 *
 * All or nothing. A patch that refers to an item that is not there fails
 * without changing anything, because half-applied edits from an agent that got
 * one id wrong are far worse to recover from than a rejection.
 */
export function apply(spec: BoardSpec, ops: readonly Op[]): PatchResult {
  const items = [...spec.items];
  const index = new Map(items.map((item, at) => [item.id, at]));
  const changed: string[] = [];
  const removed: string[] = [];
  let board = { ...spec };
  let reset = false;

  const find = (id: string): number => {
    const at = index.get(id);
    if (at === undefined) throw new PatchError(`no item ${JSON.stringify(id)} on this board`);
    return at;
  };
  /** Items whose content was touched, as opposed to only their position. */
  const redrawn = new Set<string>();
  const touch = (id: string, content = true): void => {
    if (!changed.includes(id)) changed.push(id);
    if (content) redrawn.add(id);
  };

  for (const op of ops) {
    switch (op.op) {
      case 'add': {
        if (!op.item?.id) throw new PatchError('every item needs an id');
        if (index.has(op.item.id)) {
          throw new PatchError(`item ${JSON.stringify(op.item.id)} is already on this board`);
        }
        index.set(op.item.id, items.length);
        items.push(op.item);
        touch(op.item.id);
        break;
      }
      case 'move': {
        const at = find(op.id);
        items[at] = { ...(items[at] as BoardItem), at: op.at };
        touch(op.id, false);
        break;
      }
      case 'update': {
        const at = find(op.id);
        // The id is not patchable. Renaming an item in place would break every
        // reference to it -- including the one the app is holding while it
        // drags the thing.
        const { id: _ignored, ...patch } = op.patch as Loose<BoardItem>;
        const next: Record<string, unknown> = { ...(items[at] as BoardItem), ...patch };
        // Named as null means taken away: an ungrouped item has no group, not group: null.
        for (const key of Object.keys(next)) if (next[key] == null) delete next[key];
        items[at] = next as unknown as BoardItem;
        touch(op.id);
        break;
      }
      case 'order': {
        const at = find(op.id);
        items[at] = { ...(items[at] as BoardItem), z: op.z };
        touch(op.id, false);
        break;
      }
      case 'remove': {
        const at = find(op.id);
        items.splice(at, 1);
        index.clear();
        for (const [i, item] of items.entries()) index.set(item.id, i);
        if (!removed.includes(op.id)) removed.push(op.id);
        break;
      }
      case 'board': {
        const next: Record<string, unknown> = { ...board, ...op.patch };
        for (const key of Object.keys(next)) if (next[key] == null) delete next[key];
        board = next as unknown as BoardSpec;
        reset = true;
        break;
      }
      default:
        throw new PatchError(`unknown operation ${JSON.stringify((op as { op: string }).op)}`);
    }
  }

  const kept = changed.filter((id) => !removed.includes(id));
  // A page of a notebook has an edge, and nothing goes past it: whatever put an item there -- a
  // drag, an agent, a move from another page or the board -- it lands inside the sheet.
  if (board.sheet && board.extent) {
    const [, , width, height] = board.extent;
    const moved = new Set(kept);
    items.splice(0, items.length, ...onSheet(items, width, height, (it) => moved.has(it.id)));
  }
  return {
    spec: { ...board, items, version: (spec.version ?? 0) + 1 },
    changed: kept,
    placed: kept.filter((id) => !redrawn.has(id)),
    removed,
    reset,
  };
}

/**
 * Items kept inside a sheet of width x height: each one's box (its width when known, and at least
 * its top 40px) lies on the page. A thing dragged off the side used to be kept out there,
 * invisible and unreachable; `which` says which items to bring in (all, by default).
 */
export function onSheet(
  items: readonly BoardItem[],
  width: number,
  height: number,
  which: (item: BoardItem) => boolean = () => true,
): BoardItem[] {
  return items.map((item) => {
    if (!which(item) || !Array.isArray(item.at)) return item;
    const w = Math.min(item.size?.[0] ?? Math.min(ITEM_WIDTH, width), width);
    const h = Math.min(item.size?.[1] ?? 40, height);
    const x = Math.min(Math.max(item.at[0], 0), Math.max(0, width - w));
    const y = Math.min(Math.max(item.at[1], 0), Math.max(0, height - h));
    return x === item.at[0] && y === item.at[1]
      ? item
      : { ...item, at: [x, y] as [number, number] };
  });
}

/** The highest z on the board, so a new thing lands on top of the pile. */
export function topZ(spec: BoardSpec): number {
  return spec.items.reduce((high, item) => Math.max(high, item.z ?? 0), 0);
}

/**
 * The operations that put a board back the way it was.
 *
 * Computed against the board BEFORE the change, and returned in reverse order,
 * so applying them undoes the patch exactly. It lives here rather than in the
 * app because undo is not a feature of a user interface: an agent that made a
 * mess should be able to take it back the same way a person can, and if the
 * two had separate implementations one of them would be the wrong one.
 */
export function invert(spec: BoardSpec, ops: readonly Op[]): Op[] {
  const at = new Map(spec.items.map((item) => [item.id, item]));
  const back: Op[] = [];
  // Walked forwards so each inverse is computed against the state that
  // operation actually saw, then reversed at the end.
  let current = spec;
  for (const op of ops) {
    switch (op.op) {
      case 'add':
        back.push({ op: 'remove', id: op.item.id });
        break;
      case 'remove': {
        const item = at.get(op.id);
        if (item) back.push({ op: 'add', item });
        break;
      }
      case 'move': {
        const item = at.get(op.id);
        if (item) back.push({ op: 'move', id: op.id, at: item.at });
        break;
      }
      case 'order': {
        const item = at.get(op.id);
        if (item) back.push({ op: 'order', id: op.id, z: item.z ?? 0 });
        break;
      }
      case 'update': {
        const item = at.get(op.id);
        if (!item) break;
        const previous: Loose<BoardItem> = {};
        for (const key of Object.keys(op.patch) as Array<keyof BoardItem>) {
          // Explicitly including keys whose old value was undefined: leaving
          // them out would keep the new value on the way back, so setting a
          // rotation on an item that had none could never be undone.
          (previous as Record<string, unknown>)[key] = item[key] ?? null;
        }
        back.push({ op: 'update', id: op.id, patch: previous });
        break;
      }
      case 'board': {
        const previous: Record<string, unknown> = {};
        for (const key of Object.keys(op.patch)) {
          previous[key] = (current as unknown as Record<string, unknown>)[key] ?? null;
        }
        back.push({ op: 'board', patch: previous as Loose<Omit<BoardSpec, 'id' | 'items'>> });
        break;
      }
      default:
        break;
    }
    try {
      const next = apply(current, [op]);
      current = next.spec;
      at.clear();
      for (const item of current.items) at.set(item.id, item);
    } catch {
      // A patch that cannot be applied has no inverse worth recording; the
      // caller will get the same failure when it tries to apply it.
    }
  }
  return back.reverse();
}
