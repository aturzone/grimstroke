/**
 * Paper grain: one tileable speckle, generated once and shared by every sheet on the page.
 *
 * Brought over from chevaletNote, where it is painted onto a canvas at run time. The recipe is
 * the same one, pixel for pixel, so a note in a browser and a note in an exported PNG have the
 * same surface -- and because it is translucent it is colour-agnostic, composites with no blend
 * mode, and never needs regenerating when something is re-themed.
 *
 * Two scales, deliberately. A single uniform noise reads as television static; the fine
 * threshold picks out sparse specks and the cubed coarse term gives them a soft field to sit
 * in, and together they read as fibre.
 *
 * It is baked to a PNG data URI rather than drawn with an SVG filter. `feTurbulence` was the
 * first attempt and it is the wrong tool twice over: it re-rasterises whenever the element's
 * effective scale changes -- which during a drag is every frame -- and its output is smooth
 * cloud noise, which is not what paper looks like.
 */

import { encodePng } from '~/draw/look/png.ts';
import { Rng } from '~/draw/look/rng.ts';

export interface GrainOptions {
  /** Tile edge in px. It repeats, so this is a memory against repetition trade. */
  size?: number;
  seed?: string;
}

const cache = new Map<string, string>();

/** The tile as raw RGBA. Exported so a browser can paint the identical thing on a canvas. */
export function grainPixels(size = 128, seed = 'chevalet-grain'): Buffer {
  const rng = new Rng(seed);
  const px = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i += 1) {
    const fine = rng.range(0, 1);
    const coarse = rng.range(0, 1) ** 3;
    // Mostly transparent: a sparse speck field, not a grey wash.
    const a = fine > 0.86 ? 26 + coarse * 46 : coarse * 14;
    // Dark specks with the occasional light fleck, which is what stops it reading as dirt.
    const v = rng.bool(0.72) ? 0 : 255;
    px[i * 4] = v;
    px[i * 4 + 1] = v;
    px[i * 4 + 2] = v;
    px[i * 4 + 3] = Math.round(a);
  }
  return px;
}

/**
 * The tile as a CSS `url()`.
 *
 * Cached: it is the same bytes for every sheet in the document, and encoding a 128px PNG is
 * not free. Base64 rather than percent-encoded SVG because this one really is binary.
 */
export function grain(options: GrainOptions = {}): string {
  const size = options.size ?? 128;
  const seed = options.seed ?? 'chevalet-grain';
  const key = `${size}:${seed}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const png = encodePng({ width: size, height: size, pixels: grainPixels(size, seed) }, {});
  const url = `url("data:image/png;base64,${png.toString('base64')}")`;
  cache.set(key, url);
  return url;
}
