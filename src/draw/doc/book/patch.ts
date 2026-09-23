/**
 * Changing a notebook.
 *
 * A separate vocabulary from the board's, because the operations are genuinely
 * different: a board is a plane where things have positions, a notebook is a
 * sequence where things have an order. "Move these four leaves to after leaf
 * nine" has no meaning on a board, and "move this note to (320, 180)" has none
 * in a book. Forcing one set of operations to cover both would produce a set
 * that describes neither well.
 *
 * Applying is pure: a board and a notebook both take a document and return a
 * new one, which is what lets the server hold the authoritative copy, undo hold
 * the old one, and a test check a sequence of edits with nothing running.
 */

import type { BookSpec, Cover, Leaf, Sticker } from '~/draw/doc/book/model.ts';
import type { Block } from '~/draw/material/model.ts';

/**
 * A patch that may also CLEAR a field, by naming it as null -- which survives JSON, where
 * undefined is dropped on the way to the server. See the board's Loose for the scar.
 *
 * Choosing "automatic" for the title's colour, or nobody as the cover's person, is taking a
 * value away; a patch type that only allowed values could never say so.
 */
export type Loose<T> = { [K in keyof T]?: T[K] | null | undefined };

export type BookOp =
  /** `at` is the index to insert before. Absent means the end. */
  | { op: 'leaf.add'; leaf: Leaf; at?: number }
  | { op: 'leaf.remove'; id: string }
  /**
   * Move leaves, as a GROUP.
   *
   * Taking a list rather than one id is the whole point. Reordering a chapter
   * one leaf at a time is both tedious and wrong -- each single move shifts
   * the indices under the next one, so a person doing it by hand has to think
   * about the arithmetic instead of about the notebook.
   */
  | { op: 'leaf.move'; ids: string[]; to: number }
  | { op: 'leaf.blocks'; id: string; blocks: Block[] }
  | { op: 'cover'; patch: Loose<Cover> }
  | { op: 'sticker.add'; sticker: Sticker }
  | { op: 'sticker.update'; id: string; patch: Loose<Omit<Sticker, 'id'>> }
  | { op: 'sticker.remove'; id: string }
  | {
      op: 'book';
      patch: Partial<
        Pick<BookSpec, 'title' | 'palette' | 'paper' | 'grain' | 'minLeaves' | 'tags'>
      >;
    }
  /** Put away, or take back out. Never a delete. */
  | { op: 'archive'; archived: boolean; at?: string };

/** The parts of a notebook that are settings rather than contents. */
export type BookSettings = Partial<
  Pick<BookSpec, 'title' | 'palette' | 'paper' | 'grain' | 'minLeaves' | 'tags'>
>;

export class BookPatchError extends Error {}

export interface BookPatchResult {
  spec: BookSpec;
  /** Ids of leaves whose contents changed. */
  changed: string[];
  removed: string[];
  /** True when the book itself changed: its order, its cover, its palette. */
  reset: boolean;
}

export function apply(spec: BookSpec, ops: readonly BookOp[]): BookPatchResult {
  let book: BookSpec = { ...spec, leaves: [...spec.leaves] };
  const changed: string[] = [];
  const removed: string[] = [];
  let reset = false;

  const stickers = (): Sticker[] => [...(book.cover?.stickers ?? [])];
  const touch = (id: string): void => {
    if (!changed.includes(id)) changed.push(id);
  };
  const find = (id: string): number => {
    const at = book.leaves.findIndex((leaf) => leaf.id === id);
    if (at < 0) throw new BookPatchError(`no leaf ${JSON.stringify(id)} in this notebook`);
    return at;
  };

  for (const op of ops) {
    switch (op.op) {
      case 'leaf.add': {
        if (!op.leaf?.id) throw new BookPatchError('every leaf needs an id');
        if (book.leaves.some((leaf) => leaf.id === op.leaf.id)) {
          throw new BookPatchError(`leaf ${JSON.stringify(op.leaf.id)} is already bound in`);
        }
        const at = op.at ?? book.leaves.length;
        book.leaves.splice(Math.max(0, Math.min(at, book.leaves.length)), 0, op.leaf);
        touch(op.leaf.id);
        reset = true;
        break;
      }
      case 'leaf.remove': {
        const at = find(op.id);
        book.leaves.splice(at, 1);
        if (!removed.includes(op.id)) removed.push(op.id);
        reset = true;
        break;
      }
      case 'leaf.move': {
        // Lifted out first, then put back in one go. Splicing them one at a
        // time moves the target index under your feet, which is exactly the
        // arithmetic this operation exists to spare the caller.
        const moving = op.ids.map((id) => book.leaves[find(id)] as Leaf);
        const before = book.leaves.filter((leaf) => !op.ids.includes(leaf.id));
        const at = Math.max(0, Math.min(op.to, before.length));
        before.splice(at, 0, ...moving);
        book.leaves = before;
        reset = true;
        break;
      }
      case 'leaf.blocks': {
        const at = find(op.id);
        book.leaves[at] = { ...(book.leaves[at] as Leaf), blocks: op.blocks };
        touch(op.id);
        break;
      }
      case 'cover': {
        const cover: Record<string, unknown> = { ...(book.cover ?? {}), ...op.patch };
        for (const key of Object.keys(cover)) if (cover[key] == null) delete cover[key];
        book.cover = cover as Cover;
        reset = true;
        break;
      }
      case 'sticker.add': {
        if (!op.sticker?.id) throw new BookPatchError('every sticker needs an id');
        book.cover = { ...(book.cover ?? {}), stickers: [...stickers(), op.sticker] };
        reset = true;
        break;
      }
      case 'sticker.update': {
        const all = stickers();
        const at = all.findIndex((sticker) => sticker.id === op.id);
        if (at < 0) throw new BookPatchError(`no sticker ${JSON.stringify(op.id)} on this cover`);
        const merged: Record<string, unknown> = { ...(all[at] as Sticker), ...op.patch };
        for (const key of Object.keys(merged)) if (merged[key] == null) delete merged[key];
        all[at] = merged as unknown as Sticker;
        book.cover = { ...(book.cover ?? {}), stickers: all };
        reset = true;
        break;
      }
      case 'sticker.remove': {
        const all = stickers().filter((sticker) => sticker.id !== op.id);
        book.cover = { ...(book.cover ?? {}), stickers: all };
        reset = true;
        break;
      }
      case 'book': {
        book = { ...book, ...op.patch };
        reset = true;
        break;
      }
      case 'archive': {
        book = {
          ...book,
          archived: op.archived,
          ...(op.archived ? { archivedAt: op.at ?? new Date().toISOString() } : {}),
        };
        reset = true;
        break;
      }
      default:
        throw new BookPatchError(`unknown operation ${JSON.stringify((op as { op: string }).op)}`);
    }
  }

  return {
    spec: { ...book, version: (spec.version ?? 0) + 1 },
    changed: changed.filter((id) => !removed.includes(id)),
    removed,
    reset,
  };
}

/** The operations that put the notebook back the way it was. */
export function invert(spec: BookSpec, ops: readonly BookOp[]): BookOp[] {
  const back: BookOp[] = [];
  let current = spec;
  for (const op of ops) {
    switch (op.op) {
      case 'leaf.add':
        back.push({ op: 'leaf.remove', id: op.leaf.id });
        break;
      case 'leaf.remove': {
        const at = current.leaves.findIndex((leaf) => leaf.id === op.id);
        const leaf = current.leaves[at];
        if (leaf) back.push({ op: 'leaf.add', leaf, at });
        break;
      }
      case 'leaf.move': {
        // Where they were, as one move back to the first one's old index.
        const first = current.leaves.findIndex((leaf) => leaf.id === (op.ids[0] ?? ''));
        if (first >= 0) back.push({ op: 'leaf.move', ids: [...op.ids], to: first });
        break;
      }
      case 'leaf.blocks': {
        const leaf = current.leaves.find((candidate) => candidate.id === op.id);
        if (leaf) back.push({ op: 'leaf.blocks', id: op.id, blocks: leaf.blocks });
        break;
      }
      case 'cover': {
        const previous: Record<string, unknown> = {};
        for (const key of Object.keys(op.patch)) {
          previous[key] = current.cover?.[key as keyof Cover] ?? null;
        }
        back.push({ op: 'cover', patch: previous as Loose<Cover> });
        break;
      }
      case 'sticker.add':
        back.push({ op: 'sticker.remove', id: op.sticker.id });
        break;
      case 'sticker.remove': {
        const sticker = (current.cover?.stickers ?? []).find((s) => s.id === op.id);
        if (sticker) back.push({ op: 'sticker.add', sticker });
        break;
      }
      case 'sticker.update': {
        const sticker = (current.cover?.stickers ?? []).find((s) => s.id === op.id);
        if (!sticker) break;
        const previous: Record<string, unknown> = {};
        for (const key of Object.keys(op.patch))
          previous[key] = sticker[key as keyof Sticker] ?? null;
        back.push({ op: 'sticker.update', id: op.id, patch: previous });
        break;
      }
      case 'book': {
        const previous: Record<string, unknown> = {};
        for (const key of Object.keys(op.patch)) {
          previous[key] = (current as unknown as Record<string, unknown>)[key];
        }
        back.push({ op: 'book', patch: previous as BookSettings });
        break;
      }
      case 'archive':
        back.push({
          op: 'archive',
          archived: current.archived ?? false,
          ...(current.archivedAt ? { at: current.archivedAt } : {}),
        });
        break;
      default:
        break;
    }
    try {
      current = apply(current, [op]).spec;
    } catch {
      // A patch that cannot be applied has no inverse worth recording; the
      // caller gets the same failure when it tries to apply it.
    }
  }
  return back.reverse();
}
