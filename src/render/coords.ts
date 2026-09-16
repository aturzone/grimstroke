/**
 * The coordinate contract.
 *
 * The trap this exists to close: marks whose numbers silently meant a different
 * space. A box read off a 720x1280 screenshot and applied to a scaled image
 * lands a third of the way off, on nothing -- and looks exactly as confident as
 * a box on the right element. So the space is a mandatory prefix, a bare tuple
 * is refused, and the error names the source size, which turns a guess into a
 * decision.
 *
 * Everything downstream is percent, so page width, device pixel ratio and source
 * resolution can all change without touching a single authored coordinate.
 */

import type { Rect, RectRef } from '~/types.ts';

const PATTERN = /^(src|pct|css):\s*(-?[\d.]+)[,\s]+(-?[\d.]+)[,\s]+(-?[\d.]+)[,\s]+(-?[\d.]+)\s*$/;

export interface Source {
  width: number;
  height: number;
  dpr?: number;
}

export class CoordinateError extends Error {}

function help(source: Source | undefined): string {
  if (!source) {
    return 'use src:x,y,w,h | pct:x,y,w,h | css:x,y,w,h -- the prefix says which space the numbers are in';
  }
  return (
    `that image is ${source.width}x${source.height} source px. ` +
    'src:x,y,w,h = pixels of the source file; ' +
    'pct:x,y,w,h = percent of the image; ' +
    `css:x,y,w,h = CSS px from a browser boundingBox (dpr ${source.dpr ?? 1})`
  );
}

/** Resolve a reference to percentages of the image. */
export function resolve(ref: RectRef, source?: Source): Rect {
  const match = PATTERN.exec(String(ref).trim());
  if (!match) {
    throw new CoordinateError(`${JSON.stringify(ref)} is not a rectangle. ${help(source)}`);
  }
  const [, space, rawX, rawY, rawW, rawH] = match;
  let x = Number(rawX);
  let y = Number(rawY);
  let w = Number(rawW);
  let h = Number(rawH);
  if (w <= 0 || h <= 0) {
    throw new CoordinateError(`${JSON.stringify(ref)} has a zero or negative size`);
  }
  if (space === 'pct') return { x, y, w, h };

  if (!source) {
    throw new CoordinateError(
      `${JSON.stringify(ref)} uses ${space}: but the image size is not known. ` +
        'Use pct: coordinates, which need no source.',
    );
  }
  if (space === 'css') {
    const dpr = source.dpr ?? 1;
    x *= dpr;
    y *= dpr;
    w *= dpr;
    h *= dpr;
  }
  return {
    x: (x / source.width) * 100,
    y: (y / source.height) * 100,
    w: (w / source.width) * 100,
    h: (h / source.height) * 100,
  };
}

export function toStyle(rect: Rect): string {
  return (
    `left:${rect.x.toFixed(3)}%;top:${rect.y.toFixed(3)}%;` +
    `width:${rect.w.toFixed(3)}%;height:${rect.h.toFixed(3)}%`
  );
}

export function format(rect: Rect, space: 'pct' = 'pct'): RectRef {
  return `${space}:${rect.x.toFixed(1)},${rect.y.toFixed(1)},${rect.w.toFixed(1)},${rect.h.toFixed(1)}`;
}
