/**
 * Destructive redaction.
 *
 * Drawing a censor bar over an image is not redaction. The original still holds
 * the numbers, and so does every copy of it -- including the one that ends up in
 * a bug report attachment, a chat message, or a git history nobody rewrites.
 * The pixels are overwritten in the raster itself; host/redact.ts writes the result to a NEW
 * file, so the original is never touched.
 *
 * Pixelation is refused outright. It is a digital artefact in a paper world, it
 * LOOKS reversible and invites the question, and for a short low-entropy string
 * like a sixteen-digit card number mosaic redaction is genuinely attackable.
 * Covering is irreversible by construction.
 *
 * No image library: the PNG codec is a hundred lines of zlib in `look/png.ts`, because a
 * dependency for "fill some rectangles with black" is a dependency that will one day not
 * install on the machine that needs it.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Raster } from '~/draw/look/png.ts';
import type { RectRef } from '~/draw/material/model.ts';
import { resolve as resolveRect } from '~/draw/material/plate/coords.ts';

export interface RedactOptions {
  /**
   * Grow every region by this many pixels on each side.
   *
   * A rectangle read off a picture by eye is routinely a pixel or two short, and
   * the two failure directions are not symmetric: covering slightly too much
   * costs nothing, covering slightly too little leaves part of the number on
   * screen. The default errs the safe way on purpose.
   */
  bleed?: number;
  /** The fill. Defaults to the near-black used as ink everywhere else. */
  colour?: [number, number, number];
}

export interface RedactResult {
  regions: string[];
  width: number;
  height: number;
  /** Written into the file, so a page can tell this image has been through here. */
  marker: string;
}

/** The PNG text key that says a file has been through here. */
export const MARKER_KEY = 'grimstroke:redacted';

// ---------------------------------------------------------------- api

/** Has this file been through redactImage? */
export function isRedacted(path: string): boolean {
  try {
    const bytes = readFileSync(path);
    return bytes.includes(Buffer.from(MARKER_KEY, 'latin1'));
  } catch {
    return false;
  }
}

/**
 * Fill each region with flat ink, in place.
 *
 * Regions use the same space-prefixed references as marks, so a rectangle can be
 * authored once and used for both the redaction and the bar drawn over it.
 */
export function redactRaster(
  raster: Raster,
  regions: readonly RectRef[],
  options: RedactOptions = {},
): RedactResult {
  if (regions.length === 0) throw new Error('redactImage needs at least one region');
  const bleed = options.bleed ?? 2;
  const [r, g, b] = options.colour ?? [20, 18, 16];
  const applied: string[] = [];

  for (const ref of regions) {
    const rect = resolveRect(ref, { width: raster.width, height: raster.height });
    const x0 = Math.max(0, Math.floor((rect.x / 100) * raster.width) - bleed);
    const y0 = Math.max(0, Math.floor((rect.y / 100) * raster.height) - bleed);
    const x1 = Math.min(raster.width, Math.ceil(((rect.x + rect.w) / 100) * raster.width) + bleed);
    const y1 = Math.min(
      raster.height,
      Math.ceil(((rect.y + rect.h) / 100) * raster.height) + bleed,
    );
    if (x1 <= x0 || y1 <= y0) continue;
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        const at = (y * raster.width + x) * 4;
        raster.pixels[at] = r;
        raster.pixels[at + 1] = g;
        raster.pixels[at + 2] = b;
        raster.pixels[at + 3] = 255;
      }
    }
    applied.push(String(ref));
  }

  const marker = createHash('sha256').update(applied.join('|')).digest('hex').slice(0, 16);
  return { regions: applied, width: raster.width, height: raster.height, marker };
}
