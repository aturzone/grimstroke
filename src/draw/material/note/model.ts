/**
 * What a sticky note is, as style.
 *
 * Brought over from chevaletNote, the sticky-note extension this look comes from, so a note in
 * a grimstroke workspace is the same object with the same knobs -- a note exported from one
 * and opened in the other should be recognisably the same piece of paper.
 *
 * Colour never appears in a filter or a canvas: the grain tile is translucent and the
 * halftone is a pattern fill, which means re-theming a note is four custom-property writes
 * with no filter regeneration and no repaint of the art layers.
 *
 * Shades are derived with `color-mix(in oklab, ...)` rather than by darkening RGB, because
 * these are saturated acid colours and naive RGB darkening turns every one of them to mud.
 */

export interface NoteStyle {
  palette: string;
  /** Custom colours win over the palette when set. */
  paper?: string;
  ink?: string;
  accent?: string;
  fontFamily?: string;
  fontSize: number;
  lineHeight: number;
  dir: 'auto' | 'ltr' | 'rtl';
  align: 'start' | 'center' | 'end';
  opacity: number;
  /** 0 disables the torn edge and gives a clean rectangle. */
  tornEdges: number;
  grain: number;
  tape: 'none' | 'one' | 'two';
  shadow: 'none' | 'soft' | 'hard';
  physics: 'full' | 'reduced' | 'off';
}

export const DEFAULT_NOTE_STYLE: Readonly<NoteStyle> = Object.freeze({
  palette: 'postit',
  fontSize: 15,
  lineHeight: 1.45,
  dir: 'auto',
  align: 'start',
  opacity: 1,
  tornEdges: 2.4,
  grain: 0.16,
  tape: 'one',
  shadow: 'hard',
  physics: 'full',
});

/** The note's own default size, in px. */
export const NOTE_WIDTH = 240;
export const NOTE_HEIGHT = 170;
/** A collapsed note is a tab: just the handle. */
export const NOTE_COLLAPSED = 34;

/*
 * How small a note is allowed to get.
 *
 * The floor is the toolbar, not a taste judgement: the header is a 30px row of 24px buttons,
 * and a note dragged below that has its own controls hanging outside the torn edge with no
 * way to grab them back. The width floor is where the last button is dropped by the container
 * queries, plus the grip.
 */
export const NOTE_MIN_WIDTH = 132;
export const NOTE_MIN_HEIGHT = 74;
/** Past this a sheet is a wall, and the board is meant to hold several. */
export const NOTE_MAX_WIDTH = 900;
export const NOTE_MAX_HEIGHT = 900;

/** Resolve a sparse per-note override against the defaults. */
export function resolveNoteStyle(
  override: Partial<NoteStyle> | undefined,
  defaults: NoteStyle = DEFAULT_NOTE_STYLE as NoteStyle,
): NoteStyle {
  return { ...defaults, ...override };
}
