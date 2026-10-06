/**
 * Ruled paper.
 *
 * The squared ground in the reference material is doing real work: it is what
 * makes a surface read as a *page* rather than as a background, and it is the
 * thing a board needs in order to look like somewhere you could put a note.
 *
 * Drawn with gradients rather than an image. A gradient is resolution
 * independent, so it is still a hairline at four times zoom and still a
 * hairline in a printed PDF -- which an image of a grid is not, and the whole
 * argument for the board being DOM and SVG is that nothing goes soft when you
 * zoom in.
 *
 * The caller passes the ink, and the stops come out as literal `rgba()`.
 *
 * That is not a style preference. `color-mix()` inside a gradient stop does
 * not render in Firefox -- the whole layer silently draws nothing, so the
 * ruling simply was not there, on a page that reported no warning and looked
 * like a page with blank paper. `color-mix()` in an ordinary property is fine
 * and is used all over this stylesheet; only gradient stops are affected.
 */

import { rgb } from '~/draw/look/colour.ts';

import type { PaperKind } from '~/draw/look/vocab.ts';

export { PAPERS, type PaperKind } from '~/draw/look/vocab.ts';

export interface RulingOptions {
  /** Line spacing in px. The default of each kind is the one that looks right. */
  period?: number;
  /** Line alpha against the paper, 0 to 1. */
  strength?: number;
  /**
   * Ruling colour, as a hex string -- the page's ink. It has to be a resolved
   * colour and not a `var()`: the stops are built into an `rgba()`, which is
   * the only form that survives inside a gradient.
   */
  colour?: string;
}

export interface Ruling {
  /** A CSS `background-image` value. Empty for blank paper. */
  image: string;
  /** The matching `background-size`. Empty for blank paper. */
  size: string;
  /**
   * The paper's own line spacing, in px.
   *
   * Written onto the document as `--rule-p` so the ruling is a real declaration rather than
   * a fallback buried inside a var(). A live board reads it back and steps it with the
   * camera; a printed page never touches it.
   */
  period: number;
  /** The coarse spacing, where the paper has one. */
  coarse: number;
}

const EMPTY: Ruling = { image: '', size: '', period: 0, coarse: 0 };

/**
 * One ruled line per tile, with the period and the thickness left as variables.
 *
 * A repeating gradient bakes its period into the image, so nothing outside it can change
 * how dense the ruling is. That is correct for a printed page, whose ruling is a property of
 * the paper -- and wrong for a board you can zoom, where a 27px period at 30% zoom is eight
 * screen pixels carrying a third-of-a-pixel line. The rasteriser then keeps some lines and
 * drops others, and the result is the moire mess that made a zoomed-out board look broken.
 *
 * Drawn as a single line in a tile instead, the period is `background-size` and the
 * thickness is a stop position -- both of them ordinary values the app can rewrite per
 * frame. `var()` is safe in a stop POSITION; it is `color-mix()` in a stop COLOUR that
 * silently renders nothing in Firefox, which is why the colour is still a literal rgba.
 */
function rule(colour: string, alpha: number, axis: 'x' | 'y', thickness = '--rule-w'): string {
  const [r, g, b] = rgb(colour);
  const to = axis === 'x' ? 'to right' : 'to bottom';
  return (
    `linear-gradient(${to}, ` +
    `rgba(${r},${g},${b},${alpha.toFixed(3)}) 0 var(${thickness}, 1px), ` +
    `transparent var(${thickness}, 1px))`
  );
}

/** The tile size for a period held in a variable. */
function step(name: string, fallback: number): string {
  return `var(${name}, ${fallback}px) var(${name}, ${fallback}px)`;
}

/**
 * The background layers for a kind of paper.
 *
 * Graph paper is two grids and not one: a fine grid plus a heavier line every
 * fifth. Drawing only the fine grid gives something that is technically correct
 * and reads as graph *cloth* -- the eye needs the coarse rhythm to find a
 * position on the sheet.
 */
export function ruling(kind: PaperKind, options: RulingOptions = {}): Ruling {
  const colour = options.colour ?? '#181613';
  const strength = options.strength ?? 0.1;

  switch (kind) {
    case 'blank':
      return EMPTY;

    case 'ruled': {
      const period = options.period ?? 28;
      return {
        image: rule(colour, strength, 'y'),
        size: step('--rule-p', period),
        period,
        coarse: 0,
      };
    }

    case 'squared': {
      const period = options.period ?? 27;
      return {
        image: [rule(colour, strength, 'y'), rule(colour, strength, 'x')].join(', '),
        size: step('--rule-p', period),
        period,
        coarse: 0,
      };
    }

    case 'graph': {
      const fine = options.period ?? 11;
      const coarse = fine * 5;
      // The coarse rhythm is only a little stronger than the fine one. At the
      // 2.4x it started at, the fifth lines read as a second, competing grid
      // instead of as a way to count your place on the first.
      return {
        image: [
          rule(colour, strength * 1.3, 'y', '--rule-w2'),
          rule(colour, strength * 1.3, 'x', '--rule-w2'),
          rule(colour, strength * 0.55, 'y'),
          rule(colour, strength * 0.55, 'x'),
        ].join(', '),
        size: [
          step('--rule-p2', coarse),
          step('--rule-p2', coarse),
          step('--rule-p', fine),
          step('--rule-p', fine),
        ].join(', '),
        period: fine,
        coarse,
      };
    }

    case 'dotted': {
      const period = options.period ?? 24;
      const [r, g, b] = rgb(colour);
      const alpha = Math.min(1, strength * 2.2).toFixed(3);
      return {
        image: `radial-gradient(rgba(${r},${g},${b},${alpha}) 1.1px, transparent 1.2px)`,
        size: step('--rule-p', period),
        period,
        coarse: 0,
      };
    }
  }
}
