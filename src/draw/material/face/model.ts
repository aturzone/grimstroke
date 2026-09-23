/**
 * What a character is, as data.
 *
 * A face is a SET OF CHOICES, not a picture: which shape, which hair, which eyes, and what
 * colour each of them is. That is what makes it editable afterwards, what makes it small
 * enough to live inside a board, and what lets the same character be drawn at 40px on a
 * sticky note and at 400px on a cover without anything being resampled.
 *
 * Every part is drawn on one grid -- 200 wide, 220 tall, the head centred at (100, 104) --
 * so a mouth from one face fits under a nose from another. Nothing is positioned by the
 * person choosing it; the drawings already agree with each other.
 */

/** The grid every part is drawn on. */
export const FACE_WIDTH = 200;
export const FACE_HEIGHT = 220;

export type Slot =
  | 'outfit'
  | 'shape'
  | 'ears'
  | 'hair'
  | 'brows'
  | 'eyes'
  | 'nose'
  | 'mouth'
  | 'beard'
  | 'glasses'
  | 'headwear'
  | 'earring'
  | 'cheeks'
  | 'mark';

/**
 * Which slots a face must have something in.
 *
 * A face with no eyes is not a style, it is a face that failed to load -- so these four are
 * not optional and the studio cannot clear them. Everything else can genuinely be absent,
 * and absent is the default: a character wearing every accessory at once is a costume.
 */
export const REQUIRED: readonly Slot[] = ['shape', 'eyes', 'nose', 'mouth'];

/**
 * Painted back to front.
 *
 * Hair goes ON the head, not under it. Drawn underneath -- which is where it was first --
 * the head covered all of it and the only hair anybody could see was the few pixels of rim
 * sticking out past the skull: every style, from a buzz cut to long hair, came out as the
 * same thin dark band and looked like a receding hairline.
 *
 * Ears are the exception and go under the head, so the face covers where an ear meets it --
 * and so is the outfit, whose neck the chin has to overlap.
 */
export const ORDER: readonly Slot[] = [
  'outfit',
  'ears',
  'shape',
  'hair',
  'earring',
  'cheeks',
  'mark',
  'brows',
  'eyes',
  'nose',
  'mouth',
  'beard',
  'glasses',
  'headwear',
];

/**
 * Parts that are painted ON the face and must not leave it.
 *
 * Stubble drawn to the jawline of one head shape hangs off the chin of a narrower one, and
 * blush placed for a round face sits half on the background of a long one. They are clipped
 * to whichever head shape this character actually has.
 */
export const CLIPPED: readonly Slot[] = ['cheeks', 'beard'];

export interface Palette {
  skin: string;
  hair: string;
  /** The keyline. Everything is drawn in it, which is what holds a comic face together. */
  ink: string;
  eyes: string;
  mouth: string;
  /** Glasses, earrings, the band on a cap: the one loud colour. */
  accent: string;
  /** What they are wearing. */
  cloth?: string;
  /** Behind the head, when there is one. */
  backdrop?: string;
}

export const DEFAULT_PALETTE: Readonly<Palette> = Object.freeze({
  skin: '#f6c89a',
  hair: '#2b2118',
  ink: '#14110e',
  eyes: '#14110e',
  mouth: '#c0392f',
  accent: '#ff2e63',
  cloth: '#35508f',
});

/**
 * How big a feature is, as a multiplier.
 *
 * Applied about the feature's own centre, so making the eyes bigger does not move them apart
 * and making the head wider does not push the ears off it.
 */
export interface Sizes {
  head?: number;
  eyes?: number;
  nose?: number;
  mouth?: number;
  brows?: number;
  hair?: number;
}

/**
 * How the character is DRAWN, which is a different question from who it is.
 *
 *   ink    thick keyline and flat colour, the comic-book construction
 *   pixel  a 32x36 grid, stamped cell by cell
 *
 * The same choices -- this hair, those eyes, that colour -- go through either one.
 */
export type ArtStyle = 'ink' | 'pixel';

export const ART_STYLES: readonly ArtStyle[] = ['ink', 'pixel'];

/** One line on a profile card: a label and what it says. */
export interface Detail {
  label: string;
  value: string;
}

export interface Character {
  /** Stable. Seeds the wobble, so a character always looks like itself. */
  id: string;
  name?: string;
  /**
   * What they do, in a few words: the line under the name on a profile card.
   *
   * A character is who signs the notes, and on a board shared by an agent and two people the
   * question after "who is this" is always "what are they here for".
   */
  role?: string;
  /** A sentence or two, in their own words. */
  bio?: string;
  /** Anything else worth a line on the card: team, pronouns, timezone, a handle. */
  details?: Detail[];
  parts: Partial<Record<Slot, string>>;
  /** Defaults to the drawn style. */
  style?: ArtStyle;
  /** The lit side. On by default; off gives the flat sticker look. */
  shading?: boolean;
  palette?: Partial<Palette>;
  sizes?: Sizes;
  /** Degrees. A head that is very slightly off vertical reads as drawn rather than plotted. */
  tilt?: number;
}

/**
 * The face everybody starts from.
 *
 * There IS a default face, and it is a real one rather than an empty outline: someone who
 * never opens the studio still has a character, and someone who does opens it on something
 * they can change one piece at a time.
 */
export const DEFAULT_FACE: Readonly<Character> = Object.freeze({
  id: 'default',
  name: 'You',
  parts: {
    shape: 'round',
    ears: 'plain',
    hair: 'crop',
    brows: 'straight',
    eyes: 'open',
    nose: 'button',
    mouth: 'smile',
    outfit: 'tee',
  } as Partial<Record<Slot, string>>,
});
