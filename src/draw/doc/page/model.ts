/**
 * What a page is, as data.
 *
 * A page is a column of blocks. An agent can build one with the fluent API, or
 * hand over this object as JSON and never touch the library -- which matters,
 * because "any agent, anywhere" includes ones that only know how to write a file
 * and run a command.
 */

import type { Direction } from '~/draw/doc/model.ts';
import type { PaperKind } from '~/draw/look/grid.ts';
import type { Block } from '~/draw/material/model.ts';

export interface Chip {
  /** Short, loud, and the thing a reader triages by. */
  text: string;
  /** Overrides the page accent for this chip only. */
  colour?: string;
}

export interface PageSpec {
  /**
   * Stable across exports. It seeds every generative mark, so a page always
   * looks like itself.
   */
  id: string;
  title?: string;
  /** Small chips in the header band, around the title. */
  chips?: Chip[];
  /**
   * A breadcrumb under the title, as segments. Joined by the renderer so the
   * separator can mirror.
   */
  trail?: string[];
  blocks: Block[];
  palette?: string;
  direction?: Direction;
  /**
   * Font by role. Faces must be vendored or registered.
   *
   *   body    running text
   *   mono    code, logs, and every technical token
   *   hand    notes and captions -- what a person would have written
   *   marker  headlines and labels -- the thick strokes on a sticky note
   *
   * Each role resolves to a stack, not a single family, and the Persian face is
   * always in it: the hands are Latin-only, and a Persian note set in a hand
   * alone renders as a row of empty boxes.
   */
  fonts?: { body?: string; mono?: string; hand?: string; marker?: string };
  width?: number;
  /** The ruling printed on the sheet. */
  paper?: PaperKind;
  /**
   * Paper grain and photocopier dirt, 0 to 1. `true` is the default strength.
   *
   * Off by default: it is the right look for a page meant to feel like paper
   * and the wrong one for a page whose job is to be read on a screen at 100%.
   */
  grain?: boolean | number;
  /**
   * Caps a tall image so a phone screenshot does not produce an unreadable
   * page. Scales uniformly, so percentage marks still land on the same feature.
   */
  imageMaxHeight?: number;
  /** Digits in prose, never in code. arabext is Persian. */
  digits?: 'latn' | 'arab' | 'arabext';
  /** Uppercasing is meaningless in scripts without case. */
  uppercaseLabels?: boolean;
}

export interface NotebookSpec {
  title?: string;
  pages: PageSpec[];
  palette?: string;
  direction?: Direction;
}
