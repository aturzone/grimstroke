/**
 * What a notebook is, as data.
 *
 * Not the same thing as a board, and deliberately so. A board is a plane where
 * everything is visible at once and position carries the meaning; a notebook is
 * a SEQUENCE, where the meaning is that this came after that, and where most of
 * it is not on screen. Trying to serve both with one document gets you a board
 * with a page number on it.
 *
 * What a leaf holds is the same as what a page holds -- a list of blocks -- so
 * every material works here the day it works there, and an existing page can be
 * bound into a notebook without being converted.
 */

import type { BoardItem } from '~/draw/doc/board/model.ts';
import type { Direction } from '~/draw/doc/model.ts';
import type { PaperKind } from '~/draw/look/grid.ts';
import type { PageTemplate } from '~/draw/look/template.ts';
import type { Block } from '~/draw/material/model.ts';
import type { Portrait, Profile } from '~/draw/material/profile/model.ts';

/**
 * What the cover is made of.
 *
 * It changes the texture and the way light sits on it, not just the colour.
 * A cloth cover and a plastic one are different objects, and a notebook you
 * chose the cover of is a notebook you recognise on a shelf.
 */
export type CoverMaterial = 'card' | 'cloth' | 'kraft' | 'leather' | 'plastic';

export const MATERIALS: readonly CoverMaterial[] = ['card', 'cloth', 'kraft', 'leather', 'plastic'];

/**
 * Something stuck on the cover.
 *
 * Positioned in PERCENT of the cover rather than pixels, so a sticker stays
 * where it was put whether the book is drawn two hundred pixels wide on a shelf
 * or filling the screen. Pixels would mean every sticker moved when the book
 * was shown at a different size, which is the one thing a sticker must not do.
 */
export interface Sticker {
  id: string;
  kind: 'label' | 'picture' | 'shape' | 'portrait' | 'card';
  /** Percent of the cover, from its top-left. */
  at: [number, number];
  /** Width as a percent of the cover. Height follows the content. */
  width?: number;
  rotation?: number;
  text?: string;
  /** For a picture: a path or a data URI. */
  src?: string;
  colour?: string;
  /** For a shape: which one. */
  shape?: 'circle' | 'star' | 'band' | 'tape';
  /** For a portrait: the drawing, by value, as it was when it was stuck on. */
  portrait?: Portrait;
  /**
   * For a card: the profile card, by value, as it was when it was put on -- so the cover still
   * says whose it was after the profile has been redrawn. A notebook is a record.
   */
  profile?: Profile;
}

/** Where a card sat when it had one fixed place on the cover: below the title, off true. */
export const CARD_PLACE = { at: [50, 76] as [number, number], width: 54, rotation: -2.5 };

export const SHAPES: ReadonlyArray<NonNullable<Sticker['shape']>> = [
  'circle',
  'star',
  'band',
  'tape',
];

export interface Cover {
  colour?: string;
  /** The colour the title is written in. Left out, it is chosen to be read against the cover. */
  ink?: string;
  material?: CoverMaterial;
  /** Written large on the front. Falls back to the book's title. */
  title?: string;
  /** Written down the spine. Falls back to the title. */
  spine?: string;
  stickers?: Sticker[];
  /**
   * Whose notebook it is, the old way: one card in one fixed place. Read as a `card` sticker
   * where it used to sit (see legacy.ts); a card is placed as a sticker now.
   */
  profile?: Profile;
}

export interface Leaf {
  id: string;
  /** The ruling printed on this leaf. Falls back to the book's. */
  paper?: PaperKind;
  /** A layout printed on this page, under what is on it. Falls back to the book's. */
  template?: PageTemplate;
  /**
   * What is on the page, placed: exactly a board's items, in the page's own pixels from its
   * top-left corner. A page IS a small board with an edge -- notes, pictures, ink, labels,
   * everything a board can hold, moved, turned and grouped the same way.
   */
  items?: BoardItem[];
  /**
   * A column of blocks, for writing a page the way a page document is written.
   *
   * Accepted, and folded on arrival into one 'stack' item at the page's margins -- so what an
   * agent writes as a column is still an object a person can pick up, move and resize.
   */
  blocks?: Block[];
}

export interface BookSpec {
  /** Stable. Seeds every generative mark, so a book always looks like itself. */
  id: string;
  title?: string;
  palette?: string;
  direction?: Direction;
  /** The default ruling for leaves that do not say. */
  paper?: PaperKind;
  /** The template new pages are printed with, where a page names none. */
  template?: PageTemplate;
  /** How big the pages are. A5 when it is not said. */
  pageSize?: PageSize;
  grain?: boolean | number;
  fonts?: { body?: string; mono?: string; hand?: string; marker?: string };
  digits?: 'latn' | 'arab' | 'arabext';
  uppercaseLabels?: boolean;
  cover?: Cover;
  leaves: Leaf[];
  /**
   * The book never has fewer leaves than this.
   *
   * Blank leaves are added to meet it, because an empty notebook with one page
   * is not a notebook -- and because someone who wants a forty page book wants
   * to be able to flip to page forty before they have written on page two.
   */
  minLeaves?: number;
  /**
   * Put away, not thrown away.
   *
   * The archive is a library of finished notebooks: searchable, reopenable, and
   * the place a full book is meant to end up. It is emphatically not a bin, and
   * nothing in this codebase should ever treat it as one.
   */
  archived?: boolean;
  /** ISO date. When it was put away. */
  archivedAt?: string;
  tags?: string[];
  version?: number;
}

/** Leaf size, in the same units a page uses. A5-ish at 96dpi. */
export const LEAF_WIDTH = 560;
export const LEAF_HEIGHT = 790;

/** The sizes a notebook's pages can be, in the page's own pixels. A5 is the one it always was. */
export const PAGE_SIZES = {
  a5: [560, 790],
  a4: [640, 905],
  square: [640, 640],
  index: [720, 432],
} as const satisfies Record<string, readonly [number, number]>;
export type PageSize = keyof typeof PAGE_SIZES;

/** A notebook's page, width and height. */
export function leafSize(spec: Pick<BookSpec, 'pageSize'>): readonly [number, number] {
  return PAGE_SIZES[spec.pageSize ?? 'a5'] ?? PAGE_SIZES.a5;
}

/** How thick the block of paper looks, per leaf, in px -- for the 3D views. */
export const LEAF_THICKNESS = 0.22;
export const MIN_SPINE = 12;
export const MAX_SPINE = 46;

/** How thick this book is, from how many leaves it has. */
/** What a notebook is called: its title, or the title on its cover, or its id. */
export function bookTitle(spec: Pick<BookSpec, 'id' | 'title' | 'cover'>): string {
  return spec.title?.trim() || spec.cover?.title?.trim() || spec.id;
}

export function spineWidth(spec: BookSpec): number {
  const leaves = Math.max(spec.leaves.length, spec.minLeaves ?? 0);
  return Math.round(Math.min(MAX_SPINE, Math.max(MIN_SPINE, MIN_SPINE + leaves * LEAF_THICKNESS)));
}

/** A blank leaf, for padding a book out to its minimum. */
export function blankLeaf(id: string): Leaf {
  return { id, items: [] };
}

/** The margins a column of blocks is set inside, on a page. */
export const LEAF_MARGIN: readonly [number, number] = [40, 44];

/**
 * The leaves as they are actually bound: what is written, padded to the
 * minimum with blanks.
 *
 * Computed rather than stored. Storing the blanks means every new notebook
 * ships forty empty objects that have to be kept in step with the minimum
 * whenever it changes.
 */
export function boundLeaves(spec: BookSpec): Leaf[] {
  const leaves = [...spec.leaves];
  const minimum = spec.minLeaves ?? 0;
  for (let i = leaves.length; i < minimum; i += 1) leaves.push(blankLeaf(`blank-${i + 1}`));
  return leaves;
}

/** Is there room left, or is it time to add leaves or put the book away? */
export function isFull(spec: BookSpec): boolean {
  return (
    spec.leaves.length > 0 &&
    spec.leaves.every((leaf) => (leaf.items?.length ?? 0) + (leaf.blocks?.length ?? 0) > 0)
  );
}
