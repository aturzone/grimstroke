/**
 * Where a board's sheet is: geometry only, from the items and the sizes they declare.
 *
 * Kept apart from the renderer because the core needs it without drawing anything -- a served
 * board's origin is pinned the first time it is seen (see workspaceExtent) -- and a face that
 * draws the board needs the same number.
 */

import type { BoardSpec } from '@core/docs/board.ts';
import { ITEM_HEIGHT, ITEM_WIDTH } from '@core/docs/board.ts';
import { NOTE_COLLAPSED, NOTE_HEIGHT, NOTE_WIDTH } from '@core/docs/note.ts';

/** Breathing room around the content, in board units. */
const MARGIN = 72;

/**
 * How much sheet a workspace gets beyond what is already on it.
 *
 * The board is a sheet lying on a desk rather than an infinite plane of paper,
 * so there has to be sheet left to put things on. Panning past the edge shows
 * the desk, which is honest -- the plane is unbounded, the paper is not.
 */
export const WORKSPACE_PAD = 900;

/**
 * The extent a served board should keep, written onto the spec once.
 *
 * It has to be WRITTEN DOWN rather than recomputed. The origin is subtracted
 * from every item's position, and a computed extent moves the moment anything
 * is added outside it -- so an item rendered after an edit was placed against a
 * different origin from the page it was being inserted into, and arrived nine
 * hundred pixels off the screen. One number, stored, used by both.
 */
export function workspaceExtent(spec: BoardSpec): [number, number, number, number] {
  const [x, y, w, h] = extentOf(spec);
  return [x - WORKSPACE_PAD, y - WORKSPACE_PAD, w + WORKSPACE_PAD * 2, h + WORKSPACE_PAD * 2];
}

/**
 * The rectangle to draw.
 *
 * Declared extents win. Otherwise it is computed from the items, using the
 * height each one declares and a generous default for the ones that have never
 * been measured -- too small clips the bottom off a note, too large only leaves
 * empty paper, and those two failures are not equally bad.
 */
export function extentOf(spec: BoardSpec): [number, number, number, number] {
  if (spec.extent) return spec.extent;
  if (spec.items.length === 0) return [0, 0, 960, 640];
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  for (const item of spec.items) {
    const [x, y] = item.at;
    // A note is cut to a size rather than flowed to fit, so its box is known
    // exactly here and does not need the generous estimate the others get.
    const note = item.block?.kind === 'note' ? item.block : undefined;
    const w = note?.collapsed
      ? NOTE_COLLAPSED
      : (item.size?.[0] ?? (note ? NOTE_WIDTH : item.ink ? 0 : ITEM_WIDTH));
    const h = note?.collapsed
      ? NOTE_COLLAPSED
      : (item.size?.[1] ?? (note ? NOTE_HEIGHT : item.ink ? 0 : ITEM_HEIGHT));
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x + w);
    bottom = Math.max(bottom, y + h);
  }
  return [
    Math.round(left - MARGIN),
    Math.round(top - MARGIN),
    Math.round(right - left + MARGIN * 2),
    Math.round(bottom - top + MARGIN * 2),
  ];
}
