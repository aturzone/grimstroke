/**
 * What can be put down on a surface, as data.
 *
 * A block is a material: a paragraph, a table, a sticky note, a mounted picture with marks on
 * it, a character. The same block goes into a page's column, onto a board at a position, and
 * into a notebook's leaf, and it is drawn by the same code in all three -- so a sticky note
 * is the same sticky note wherever it is stuck.
 *
 * Any agent can hand one over as JSON and never touch the library, which matters: "any agent,
 * anywhere" includes ones that only know how to write a file and run a command.
 */

import type { FrameKind } from '~/draw/look/frame.ts';
import type { NoteStyle } from '~/draw/material/note/model.ts';
import type { Profile } from '~/draw/material/profile/model.ts';

/**
 * Where a rectangle's numbers live.
 *
 *   src  pixels of the source image itself -- what you read off a screenshot
 *   pct  percent of the image, 0-100 -- scale-free, and what the CSS consumes
 *   css  CSS pixels from a browser boundingBox, divided by the image's dpr
 *
 * The prefix is mandatory. A bare tuple is refused, because coordinates that
 * silently mean a different space land the box on nothing while looking exactly
 * as confident as a box on the right element.
 */
export type Space = 'src' | 'pct' | 'css';
export type RectRef = string;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * What can be drawn on a picture.
 *
 *   box        a hard rectangle: the machine-precise one, for measurements
 *   circle     a hand drawn round it: the human one, for "look at this"
 *   arrow      points at it from outside
 *   underline  a stroke along its bottom edge
 *   highlight  a marker swipe across it
 *   redact     a censor bar. The pixels underneath must already be gone.
 *   callout    a box whose note is numbered and listed under the picture
 *
 * The hand kinds are not decoration. A box says "this rectangle, exactly"; a
 * circle says "this thing, roughly" -- and a report that circles a region it
 * only approximately measured is telling the truth about its own precision.
 */
export type MarkKind =
  | 'box'
  | 'redact'
  | 'callout'
  | 'circle'
  | 'arrow'
  | 'underline'
  | 'highlight';
export type RedactStyle = 'bar' | 'halftone' | 'hatch';

/** Which side an arrow flies in from. `start`/`end` mirror; `left` does not. */
export type Side = 'top' | 'bottom' | 'start' | 'end';

export interface Mark {
  rect: RectRef;
  kind?: MarkKind;
  /** A small numbered badge on the corner, for steps. */
  badge?: string;
  /** Callout text, placed beside the image. */
  note?: string;
  /** Only for kind 'redact'. */
  style?: RedactStyle;
  /** Only for kind 'arrow'. Defaults to the side with the most room. */
  from?: Side;
  /** Overrides the page accent for this mark alone. */
  colour?: string;
}

export interface ImageSource {
  /** A path on disk, or a data: URI. */
  src: string;
  caption?: string;
  marks?: Mark[];
  /** Device pixel ratio of the source, needed only for css: rectangles. */
  dpr?: number;
  /**
   * Source size, when it cannot be read from the file.
   *
   * A data: URI has no header to probe, and without a size `src:` and `css:`
   * rectangles cannot be resolved and hand marks have no space to be drawn in.
   */
  width?: number;
  height?: number;
  /** How the picture is mounted. Defaults to a keyline. */
  frame?: FrameKind;
  /** Cap on the frame's random tilt, in degrees. 0 pins it straight. */
  tilt?: number;
}

export interface ZoomSpec {
  rect: RectRef;
  factor?: number;
}

/**
 * The tone of a marker label.
 *
 *   highlight  the accent, as a highlighter run over the words
 *   ink        a block of ink with the paper colour written on it
 *   paper      a block of paper with the ink written on it
 */
export type LabelTone = 'highlight' | 'ink' | 'paper';

export type Block =
  | { kind: 'heading'; text: string; level?: 1 | 2; hand?: boolean; colour?: string }
  | { kind: 'text'; text: string; hand?: boolean; colour?: string }
  /**
   * A marker label: a band of flat colour with words written across it.
   *
   * It is not a heading and not a chip. A heading organises a document; a
   * label is somebody reaching for a marker because one thing on the page
   * matters more than the rest of it.
   */
  | { kind: 'label'; text: string; tone?: LabelTone; hand?: boolean; colour?: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'table'; rows: string[][]; head?: boolean }
  | { kind: 'code'; text: string; label?: string }
  | { kind: 'quote'; text: string; cite?: string }
  | { kind: 'image'; image: ImageSource; zoom?: ZoomSpec }
  | { kind: 'compare'; images: ImageSource[]; syncMarks?: boolean }
  | {
      kind: 'note';
      text: string;
      title?: string;
      palette?: string;
      /** The note's own knobs: tear, grain, tape, shadow. */
      style?: Partial<NoteStyle>;
      /** Rolled up to a tab. The text is kept; only the sheet is put away. */
      collapsed?: boolean;
      /** Strokes drawn on the note itself, in the note's own coordinates. */
      ink?: NoteInk[];
    }
  /**
   * The profile card: the drawn portrait, the name, the role and the details, as one object
   * -- the thing you pin to a board to say whose it is, or paste on a notebook's cover.
   *
   * Carried BY VALUE rather than by a reference, so a board with a card on it is still a
   * board with that card after it has been archived, copied to another machine, or the
   * profile has been redrawn. A card is a record of who it was, when it was put there.
   */
  | { kind: 'profile'; profile: Profile }
  /**
   * A column of blocks as one object: what a page written as a column becomes when it is
   * laid on a sheet where everything else is placed. It moves and resizes as one.
   */
  | { kind: 'stack'; blocks: Block[] }
  | { kind: 'divider' }
  | { kind: 'spacer'; size?: number };

/**
 * A stroke drawn on a note.
 *
 * In the note's own coordinates, so it moves with the sheet and survives the note being
 * moved, raised or re-themed. Separate from board ink, which is drawn on the plane: a line
 * you draw across a note is part of that note, and deleting the note deletes it.
 */
export interface NoteInk {
  d: string;
  colour?: string;
  weight?: number;
  /** A highlighter is a translucent band; a pen is an opaque line. */
  tool?: 'pen' | 'marker' | 'highlighter';
}
