/**
 * What a board is, as data.
 *
 * A board is an infinite plane with things placed on it. A workspace is one
 * board; there can be as many as you like. Everything else lives on one:
 * notes stuck to it, screenshots pinned to it, strokes drawn on it.
 *
 * The one idea worth stating: **anything that can go on a page can go on a
 * board**. An item is a `Block` plus a position, so every material this tool
 * knows how to draw -- sticky notes, marker labels, mounted photographs with
 * marks on them, tables, code -- works on a board the day it works on a page,
 * and a change to how a sticky note looks changes it in both places.
 *
 * Board coordinates are plain numbers. One unit is one CSS pixel at zoom 1, the
 * origin is wherever you like, and both axes may go negative -- the plane has
 * no corner to measure from.
 */

import type { RemoteLink } from '~/draw/doc/remote/model.ts';
import type { Direction, PageTemplate, PaperKind, TrackerColumn } from '~/draw/look/vocab.ts';
import type { Block } from '~/draw/material/model.ts';

export type InkTool = 'pen' | 'marker' | 'highlighter' | 'pencil';

/**
 * A stroke drawn on the board.
 *
 * SVG path data, in board units, relative to the item's own position -- so
 * moving a stroke is a change to `at` and never a rewrite of the geometry.
 * A highlighter is a fill and a pen is a stroke; they are different shapes,
 * not the same shape at different opacities.
 */
export interface Ink {
  d: string;
  colour?: string;
  /** Stroke width in board units. Ignored when the ink is a fill. */
  weight?: number;
  tool?: InkTool;
  fill?: boolean;
}

export interface BoardItem {
  id: string;
  /** Position on the plane: [x, y]. May be negative. */
  at: [number, number];
  /**
   * Width, and optionally height, in board units.
   *
   * Height is usually left out and taken from the content. The app writes back
   * what it measured, so a board that has been opened once knows its own
   * extent exactly rather than by estimate.
   */
  size?: [number, number?];
  /** Degrees. A board where nothing is straight is as tiring as one where everything is. */
  rotation?: number;
  /** Paint order. Ties break on document order. */
  z?: number;
  /** Items in the same group move together. */
  group?: string;
  locked?: boolean;
  /** Anything that can go on a page. */
  block?: Block;
  /** Or a stroke drawn directly on the board. */
  ink?: Ink;
}

export interface BoardSpec {
  /** Stable. Seeds every generative mark, so a board always looks like itself. */
  id: string;
  title?: string;
  palette?: string;
  direction?: Direction;
  /** The ruling printed on the surface. */
  paper?: PaperKind;
  /** How round its corners are, over the workspace's: 0 square, 1 as designed, up to 3. */
  corners?: number;
  /** On a page of a notebook: the layout printed on it (see look/template.ts). */
  template?: PageTemplate;
  /** On a tracker page: its columns. */
  tracker?: TrackerColumn[];
  grain?: boolean | number;
  fonts?: { body?: string; mono?: string; hand?: string; marker?: string };
  digits?: 'latn' | 'arab' | 'arabext';
  uppercaseLabels?: boolean;
  items: BoardItem[];
  /**
   * Where a viewer should look first. The renderer ignores it -- a rendered
   * board is the whole board -- and the app restores it on open.
   */
  view?: { x: number; y: number; zoom: number };
  /**
   * The rectangle to draw, as [x, y, width, height] in board units.
   *
   * Left out, it is computed from the items. It is written back by the app,
   * which knows the real height of every note because it measured it, and an
   * estimate is only ever used for a board no one has opened yet.
   */
  extent?: [number, number, number, number];
  /** Bumped on every write, so a reader can tell whether it has the latest. */
  version?: number;
  /**
   * Set when this board is a PAGE OF A NOTEBOOK, seen as a board.
   *
   * Never stored. The server builds the board from the page, and writes the items back into
   * the page; this says which one, so the page is drawn as a sheet with an edge and the
   * chrome can turn to the next one.
   */
  sheet?: {
    book: string;
    bookTitle: string;
    leaf: string;
    index: number;
    count: number;
    /** The repository the notebook is connected to, if it is. */
    remote?: RemoteLink;
  };
}

/**
 * Width assumed for an undeclared item when estimating a board's extent.
 *
 * Only an estimate. An item that declares no width is rendered as wide as its
 * content needs, and the exporter measures the truth before it captures.
 */
export const ITEM_WIDTH = 320;

/**
 * How far an undeclared item may run before it wraps.
 *
 * Wide enough for a display heading on one line. At 640 a title of six or seven
 * words wrapped, and the second line then sat under whatever was placed below
 * it -- so the heading was silently half hidden by a photograph.
 */
export const ITEM_MAX_WIDTH = 1000;

/**
 * Height assumed for an item that has never been measured.
 *
 * Deliberately generous. Too small clips the bottom off a note in an export,
 * and too large only leaves empty paper -- the two failures are not symmetric.
 */
export const ITEM_HEIGHT = 220;
