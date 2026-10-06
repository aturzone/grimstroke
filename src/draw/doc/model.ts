/**
 * What every document shares: a reading direction, and what rendering one produces.
 *
 * A page, a board, a notebook spread, a shelf and the studio are different documents with the
 * same output -- HTML, the files it needs served, and the warnings raised while drawing it --
 * which is what lets one exporter capture any of them.
 */

export type { Direction } from '~/draw/look/vocab.ts';

/** What a renderer produces, before anything has touched a browser. */
export interface RenderedPage {
  id: string;
  html: string;
  /**
   * Served path -> absolute source path. The exporter serves exactly these and
   * nothing else.
   */
  assets: Record<string, string>;
  width: number;
  /** The element to capture. */
  selector: string;
  warnings: string[];
  /**
   * Ask the exporter to measure before it captures.
   *
   * A page is a column and knows its own height. A board is a plane with
   * things scattered on it, and the height of a note is whatever its text
   * turned out to need -- which nothing outside a browser can know. Rather
   * than guess and clip the bottom off a note, the exporter measures the real
   * union of the items and sizes the surface to it.
   */
  autofit?: boolean;
}
