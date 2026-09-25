/**
 * What a renderer is drawing on.
 *
 * A page and a board are different documents with the same materials: the same
 * sticky notes, the same mounted photographs, the same marks made by a hand.
 * This is the context those materials are drawn into -- the palette in force,
 * the digit shaping, the asset table being filled in, and the seed counter that
 * keeps every generative mark stable across exports.
 *
 * It exists so the block renderers can be shared. Before it, they took a
 * `PageSpec`, which meant a board could only reuse them by pretending to be a
 * page.
 */

import type { Direction } from '~/draw/doc/model.ts';
import type { Palette } from '~/draw/look/palette.ts';
import { DEFAULT_PALETTE, palette } from '~/draw/look/palette.ts';
import { hashString } from '~/draw/look/rng.ts';

export interface Surface {
  /**
   * Seeds every generative mark on this surface. It is the document's id, so a
   * board always looks like itself for the same reason a page does.
   */
  id: string;
  pal: Palette;
  direction: Direction;
  digits: string | undefined;
  uppercase: boolean;
  /** Served path -> absolute source path. The exporter serves exactly these. */
  assets: Record<string, string>;
  warnings: string[];
  /** Bumped per generative element, so two identical notes do not match. */
  seq: number;
  /**
   * The moment the surface is drawn at, if the host gave a clock (see `useClock`). Only cards
   * that count days or say "today" read it; without it they speak as of when they were made,
   * which keeps every drawing a pure function of its document.
   */
  now?: number;
}

let clock: (() => number) | undefined;

/**
 * The host hands draw/ its clock, once, at start. draw/ never reads the time itself: a test or
 * an export that gives no clock gets the same drawing every time.
 */
export function useClock(fn: (() => number) | undefined): void {
  clock = fn;
}

export interface SurfaceOptions {
  palette?: string | undefined;
  direction?: Direction | undefined;
  digits?: string | undefined;
  uppercaseLabels?: boolean | undefined;
}

export function surface(id: string, options: SurfaceOptions = {}): Surface {
  const direction = options.direction ?? 'ltr';
  return {
    id,
    pal: palette(options.palette ?? DEFAULT_PALETTE),
    direction,
    digits: options.digits,
    // Uppercasing is meaningless in a script without case, and the tracking
    // that reads as authoritative in Latin caps looks like broken kerning.
    uppercase: options.uppercaseLabels ?? direction === 'ltr',
    assets: {},
    warnings: [],
    seq: 0,
    ...(clock ? { now: clock() } : {}),
  };
}

/**
 * Register a file and get the path it will be served at.
 *
 * The exporter serves exactly this table and nothing else, so a document cannot
 * reference a path its author did not name. Repeats collapse: the same image
 * used twice is one asset, not two copies inside the screenshot.
 */
export function servedPath(src: string, ctx: Surface): string {
  if (src.startsWith('data:')) return src;
  const existing = Object.entries(ctx.assets).find(([, value]) => value === src);
  if (existing) return existing[0];
  const extension = src.slice(src.lastIndexOf('.')).toLowerCase() || '.png';
  /*
   * The name is derived from the SOURCE, never from a counter.
   *
   * A counter numbers assets in the order the document happens to mention them, so adding
   * one picture renumbers every picture after it -- and since these are served immutable for
   * a year, the browser goes on showing whatever it cached at that URL first. Pasting a
   * screenshot onto a board displayed the previous screenshot, and reloading did not help.
   * Hashing the source makes the URL a property of the file instead of a property of the
   * render, which is the only thing that makes the cache header honest.
   */
  const served = `a/${hashString(src).toString(36)}${extension}`;
  ctx.assets[served] = src;
  return served;
}
