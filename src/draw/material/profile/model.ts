/**
 * The profile: the one person this workspace belongs to, as data.
 *
 * There is one. A workspace is somebody's -- several people only arrive with a hosted server,
 * and that is a different shape of problem (accounts, not a list of names). A gallery of
 * made-up characters answered a question nobody had asked, and it made "who is this?" a
 * question with more than one answer.
 *
 * The picture is a PORTRAIT THE PERSON DRAWS, in a 3:4 frame, with the same pens as the
 * board. A face assembled from a catalogue of parts looks like the catalogue; a drawing, even
 * a bad one, looks like somebody. The strokes are stored as SVG paths, the same shape as
 * board ink, so a portrait is exactly as sharp in a PDF as anything else on the page.
 */

export interface Detail {
  label: string;
  value: string;
}

export type PortraitTool = 'pen' | 'pencil' | 'marker' | 'highlighter';

/** One mark in the portrait: an SVG path in the frame's own 300 x 400 units. */
export interface PortraitStroke {
  d: string;
  colour?: string;
  weight?: number;
  tool?: PortraitTool;
  /** A filled shape rather than a line -- the highlighter's band, a marker's blot. */
  fill?: boolean;
}

export interface Portrait {
  strokes: PortraitStroke[];
  /** The colour of the photo paper behind the drawing. */
  paper?: string;
}

export interface Profile {
  name: string;
  /** What they are here for, in a few words. */
  role?: string;
  /** A sentence, in their own words. */
  bio?: string;
  details?: Detail[];
  /** The band across the top of the card, and the stamp. */
  accent?: string;
  portrait?: Portrait;
}

/** The frame, in its own units. 3:4, the shape of an ID photo. */
export const PORTRAIT_WIDTH = 300;
export const PORTRAIT_HEIGHT = 400;

export const DEFAULT_ACCENT = '#ff2e63';
export const DEFAULT_PAPER = '#f7f1e3';

export const DEFAULT_PROFILE: Readonly<Profile> = Object.freeze({
  name: 'me',
  accent: DEFAULT_ACCENT,
  portrait: { strokes: [] },
});

/** The card's accents: the same few loud inks as everything else. */
export const ACCENTS: readonly string[] = [
  '#ff2e63',
  '#1f3fd0',
  '#15654f',
  '#e07b00',
  '#8e44ad',
  '#14110e',
];

/** The photo papers a portrait can be drawn on. */
export const PAPERS: readonly string[] = [
  '#f7f1e3',
  '#ffffff',
  '#dfe9f3',
  '#f3d9d2',
  '#e6efd8',
  '#fdf0b8',
];

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value : undefined;

/**
 * A profile from whatever was stored, including the characters this replaced.
 *
 * A character from the old studio carried a name, a role, a sentence and a list of details,
 * and those are the person's own words -- they come across. The face does not: it was a
 * choice from a catalogue, and there is no honest way to turn it into a drawing.
 */
export function readProfile(raw: unknown): Profile {
  const from = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const palette = (from.palette && typeof from.palette === 'object' ? from.palette : {}) as {
    accent?: unknown;
  };
  const details = Array.isArray(from.details)
    ? (from.details as unknown[])
        .filter((d): d is Detail => {
          const row = d as Partial<Detail> | null;
          return typeof row?.label === 'string' && typeof row.value === 'string';
        })
        .map((d) => ({ label: d.label, value: d.value }))
    : [];
  const portrait = (
    from.portrait && typeof from.portrait === 'object' ? from.portrait : {}
  ) as Partial<Portrait>;
  const strokes = Array.isArray(portrait.strokes)
    ? portrait.strokes.filter((s): s is PortraitStroke => typeof s?.d === 'string')
    : [];
  const role = text(from.role);
  const bio = text(from.bio);
  const paper = text(portrait.paper);
  return {
    name: text(from.name)?.trim() ?? 'me',
    ...(role ? { role } : {}),
    ...(bio ? { bio } : {}),
    ...(details.length ? { details } : {}),
    accent: text(from.accent) ?? text(palette.accent) ?? DEFAULT_ACCENT,
    portrait: { strokes, ...(paper ? { paper } : {}) },
  };
}
