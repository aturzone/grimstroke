/**
 * Arranging a selection: align, space, group, order, duplicate, lock.
 *
 * Every one of these is a list of the ordinary operations -- `move`, `update`, `order`, `add`
 * -- and nothing else. There is no "align" in the patch vocabulary and there must never be
 * one: an agent that wants three screenshots lined up posts three moves, a person who wants
 * the same presses a button that posts the same three moves, and undo treats both alike.
 */

import type { BoardContext } from '~/app/board/context.ts';
import type { BoardItem } from '~/draw/doc/board/model.ts';
import { type Op, topZ } from '~/draw/doc/board/patch.ts';

export interface Box {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Where each item actually is, in board units, measured on screen.
 *
 * Measured, not taken from the model: a note's height is what its text needed and a picture's
 * is what its shape made it, and neither is written down anywhere. A stroke is measured by its
 * path, because its own box is zero-sized with the ink overflowing it.
 */
export function boxes(ctx: BoardContext, ids: readonly string[]): Box[] {
  const out: Box[] = [];
  for (const id of ids) {
    const element = ctx.element(id);
    if (!element) continue;
    const measured =
      element.tagName.toLowerCase() === 'svg' ? element.querySelector('path') : element;
    const r = (measured ?? element).getBoundingClientRect();
    const a = ctx.view.toBoard({ x: r.left, y: r.top });
    const b = ctx.view.toBoard({ x: r.right, y: r.bottom });
    out.push({ id, x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y });
  }
  return out;
}

/** The union of some boxes. */
export function union(list: readonly Box[]): Box | undefined {
  if (list.length === 0) return undefined;
  const x = Math.min(...list.map((b) => b.x));
  const y = Math.min(...list.map((b) => b.y));
  const r = Math.max(...list.map((b) => b.x + b.w));
  const d = Math.max(...list.map((b) => b.y + b.h));
  return { id: '', x, y, w: r - x, h: d - y };
}

/** Moves that shift each item by its own offset, skipping the ones that would not move. */
function shifted(ctx: BoardContext, offsets: Map<string, [number, number]>): Op[] {
  const items = ctx.items();
  const ops: Op[] = [];
  for (const [id, [dx, dy]] of offsets) {
    const item = items.get(id);
    if (!item || item.locked || (Math.round(dx) === 0 && Math.round(dy) === 0)) continue;
    ops.push({ op: 'move', id, at: [Math.round(item.at[0] + dx), Math.round(item.at[1] + dy)] });
  }
  return ops;
}

export type Edge = 'left' | 'centre' | 'right' | 'top' | 'middle' | 'bottom';

/** Line the selection up on one edge of the whole of it. */
export function align(ctx: BoardContext, ids: readonly string[], edge: Edge): Op[] {
  const list = boxes(ctx, ids);
  const all = union(list);
  if (!all || list.length < 2) return [];
  const offsets = new Map<string, [number, number]>();
  for (const b of list) {
    const dx =
      edge === 'left'
        ? all.x - b.x
        : edge === 'right'
          ? all.x + all.w - (b.x + b.w)
          : edge === 'centre'
            ? all.x + all.w / 2 - (b.x + b.w / 2)
            : 0;
    const dy =
      edge === 'top'
        ? all.y - b.y
        : edge === 'bottom'
          ? all.y + all.h - (b.y + b.h)
          : edge === 'middle'
            ? all.y + all.h / 2 - (b.y + b.h / 2)
            : 0;
    offsets.set(b.id, [dx, dy]);
  }
  return shifted(ctx, offsets);
}

/**
 * Space the selection evenly between its two outermost items.
 *
 * The GAPS are made equal, not the centres: three things of different widths spaced by their
 * centres look unevenly spaced to everybody, because the eye measures the paper between them.
 */
export function spread(ctx: BoardContext, ids: readonly string[], axis: 'x' | 'y'): Op[] {
  const list = boxes(ctx, ids);
  if (list.length < 3) return [];
  const size = (b: Box): number => (axis === 'x' ? b.w : b.h);
  const start = (b: Box): number => (axis === 'x' ? b.x : b.y);
  list.sort((a, b) => start(a) - start(b));
  const first = list[0] as Box;
  const last = list[list.length - 1] as Box;
  const span = start(last) + size(last) - start(first);
  const gap = (span - list.reduce((sum, b) => sum + size(b), 0)) / (list.length - 1);
  const offsets = new Map<string, [number, number]>();
  let cursor = start(first);
  for (const b of list) {
    const d = cursor - start(b);
    offsets.set(b.id, axis === 'x' ? [d, 0] : [0, d]);
    cursor += size(b) + gap;
  }
  return shifted(ctx, offsets);
}

/** One group: they are selected together and move together from now on. */
export function group(ctx: BoardContext, ids: readonly string[]): Op[] {
  if (ids.length < 2) return [];
  const name = ctx.nextId('group');
  return ids.map((id) => ({ op: 'update' as const, id, patch: { group: name } }));
}

export function ungroup(ctx: BoardContext, ids: readonly string[]): Op[] {
  const items = ctx.items();
  return ids
    .filter((id) => items.get(id)?.group)
    .map((id) => ({ op: 'update' as const, id, patch: { group: null } }));
}

/** To the top of the pile, or the bottom, keeping their order among themselves. */
export function reorder(ctx: BoardContext, ids: readonly string[], where: 'front' | 'back'): Op[] {
  const items = ctx.items();
  const chosen = ids
    .map((id) => items.get(id))
    .filter((item): item is BoardItem => item !== undefined)
    .sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  if (where === 'front') {
    const top = topZ(ctx.session.spec);
    return chosen.map((item, i) => ({ op: 'order' as const, id: item.id, z: top + 1 + i }));
  }
  const bottom = Math.min(0, ...ctx.session.spec.items.map((i) => i.z ?? 0));
  return chosen.map((item, i) => ({
    op: 'order' as const,
    id: item.id,
    z: bottom - chosen.length + i,
  }));
}

/**
 * A copy of each, a little down and to the right, on top of the pile.
 *
 * A duplicated group is a new group of its own: copies that joined the original's group would
 * be dragged along whenever the original was.
 */
export function duplicate(
  ctx: BoardContext,
  ids: readonly string[],
): { ops: Op[]; made: string[] } {
  const items = ctx.items();
  const groups = new Map<string, string>();
  let z = topZ(ctx.session.spec);
  const ops: Op[] = [];
  const made: string[] = [];
  for (const id of ids) {
    const item = items.get(id);
    if (!item) continue;
    const copy: BoardItem = structuredClone(item);
    copy.id = ctx.nextId(item.block?.kind ?? 'ink');
    copy.at = [item.at[0] + 24, item.at[1] + 24];
    z += 1;
    copy.z = z;
    delete copy.locked;
    if (item.group) {
      if (!groups.has(item.group)) groups.set(item.group, ctx.nextId('group'));
      copy.group = groups.get(item.group) as string;
    }
    ops.push({ op: 'add', item: copy });
    made.push(copy.id);
  }
  return { ops, made };
}

/** Lock them all, or if every one is already locked, unlock them all. */
export function toggleLock(ctx: BoardContext, ids: readonly string[]): Op[] {
  const items = ctx.items();
  const all = ids.every((id) => items.get(id)?.locked);
  return ids.map((id) => ({
    op: 'update' as const,
    id,
    patch: { locked: all ? null : true },
  }));
}

/** Arrow keys: one unit, or ten with Shift. */
export function nudge(ctx: BoardContext, ids: readonly string[], dx: number, dy: number): Op[] {
  return shifted(ctx, new Map(ids.map((id) => [id, [dx, dy] as [number, number]])));
}

/** Everything in the same group as any of these, so a group is picked up as one. */
export function withGroups(ctx: BoardContext, ids: readonly string[]): string[] {
  const items = ctx.items();
  const groups = new Set(ids.map((id) => items.get(id)?.group).filter(Boolean));
  if (groups.size === 0) return [...ids];
  const out = new Set(ids);
  for (const item of ctx.session.spec.items)
    if (item.group && groups.has(item.group)) out.add(item.id);
  return [...out];
}
