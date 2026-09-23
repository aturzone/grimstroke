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

import type { Direction } from '~/draw/doc/model.ts';
import type { PaperKind } from '~/draw/look/grid.ts';
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
  kind: 'label' | 'picture' | 'shape' | 'portrait';
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
}

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
   * Whose notebook it is: the profile card, pasted onto the front.
   *
   * By value, so the cover still says whose it was after the profile has been redrawn -- a
   * notebook is a record, and its cover is part of the record.
   */
  profile?: Profile;
}

export interface Leaf {
  id: string;
  /** The ruling printed on this leaf. Falls back to the book's. */
  paper?: PaperKind;
  blocks: Block[];
}

export interface BookSpec {
  /** Stable. Seeds every generative mark, so a book always looks like itself. */
  id: string;
  title?: string;
  palette?: string;
  direction?: Direction;
  /** The default ruling for leaves that do not say. */
  paper?: PaperKind;
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

/** How thick the block of paper looks, per leaf, in px -- for the 3D views. */
export const LEAF_THICKNESS = 0.22;
export const MIN_SPINE = 12;
export const MAX_SPINE = 46;

/** How thick this book is, from how many leaves it has. */
export function spineWidth(spec: BookSpec): number {
  const leaves = Math.max(spec.leaves.length, spec.minLeaves ?? 0);
  return Math.round(Math.min(MAX_SPINE, Math.max(MIN_SPINE, MIN_SPINE + leaves * LEAF_THICKNESS)));
}

/** A blank leaf, for padding a book out to its minimum. */
export function blankLeaf(id: string): Leaf {
  return { id, blocks: [] };
}

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
  return spec.leaves.length > 0 && spec.leaves.every((leaf) => leaf.blocks.length > 0);
}
