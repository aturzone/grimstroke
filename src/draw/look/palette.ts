/**
 * Palettes, as roles rather than colours.
 *
 * Nothing is ever drawn against a hue. Everything is drawn against `paper`,
 * `ink` and `accent`, so a palette can invert -- one of them does -- and every
 * mark on the page still works.
 *
 * The look is a photocopied zine: Risograph flat spot inks, photocopier
 * degradation, xeroxed flyers. Not gradients, not glassmorphism, not Material
 * elevation, and no shadow that blurs by even one pixel. Paper is matte.
 */

import { contrast, luminance, textOn } from '~/draw/look/colour.ts';

export interface Palette {
  id: string;
  label: string;
  /** The ink is the light colour and the halftone inverts. */
  dark: boolean;
  paper: string;
  ink: string;
  accent: string;
}

/**
 * The ink is near-black and never `#000`: a photocopier never produces pure
 * black, and pure black next to a fluorescent paper vibrates unpleasantly.
 */
export const PALETTES: readonly Palette[] = [
  // The two defaults, light and dark; the riso inks after them are the templates.
  {
    id: 'studio',
    label: 'Light',
    dark: false,
    // The one palette that is not a riso ink. It is the wall of a room with
    // things pinned to it: a warm off-white ground, near-black, and the blue
    // of the marker most people reach for first.
    paper: '#f4f1e8',
    ink: '#1b1a17',
    accent: '#1f3fd0',
  },
  {
    id: 'night',
    label: 'Dark',
    dark: true,
    // Light's twin: the same room with the lights down, and the same blue, lifted to read on it.
    paper: '#16181d',
    ink: '#e9ebf0',
    accent: '#6d8bff',
  },
  {
    id: 'postit',
    label: 'Post-it',
    dark: false,
    paper: '#ffe94a',
    ink: '#14110e',
    accent: '#ff2e63',
  },
  {
    id: 'riso-pink',
    label: 'Riso pink',
    dark: false,
    paper: '#ff8fb8',
    ink: '#1b0d16',
    accent: '#00d5c8',
  },
  {
    id: 'acid',
    label: 'Acid lime',
    dark: false,
    paper: '#c6ff3d',
    ink: '#10160a',
    accent: '#7a2ff7',
  },
  {
    id: 'cyan',
    label: 'Photocopy cyan',
    dark: false,
    paper: '#7ef0ff',
    ink: '#06181d',
    accent: '#ff5b17',
  },
  {
    id: 'traffic',
    label: 'Traffic orange',
    dark: false,
    paper: '#ff8a3d',
    ink: '#1d0f05',
    accent: '#0f2fd6',
  },
  {
    id: 'violet',
    label: 'Ultraviolet',
    dark: false,
    paper: '#b79bff',
    ink: '#150c2b',
    accent: '#c6ff3d',
  },
  {
    id: 'newsprint',
    label: 'Newsprint',
    dark: false,
    paper: '#f0e7d2',
    ink: '#181613',
    accent: '#c01b3a',
  },
  {
    id: 'carbon',
    label: 'Carbon',
    dark: true,
    paper: '#1e1b17',
    ink: '#f2ede0',
    accent: '#ffe94a',
  },
] as const;

export const DEFAULT_PALETTE = 'studio';

/**
 * The palette with this id, or the default.
 *
 * Distinct from `palette()`, which throws. A note carries a palette id chosen by a person and
 * possibly saved by an older version, and a workspace that refuses to open because one note
 * names a palette that has been renamed is worse than one that opens in yellow.
 */
/**
 * A person's own colours for the palettes, handed in by the host (like the clock): the same ids,
 * other paper, ink and accent. Every lookup below sees them; nothing here reads where they live.
 */
let own: Readonly<Record<string, Pick<Palette, 'paper' | 'ink' | 'accent'>>> = {};

/** The palette for anything that names none: the workspace's light or dark, handed in. */
let fallback: string = DEFAULT_PALETTE;

export function useDefaultPalette(id: string | undefined): void {
  fallback = id && PALETTES.some((p) => p.id === id) ? id : DEFAULT_PALETTE;
}

export function defaultPalette(): string {
  return fallback;
}

export function usePalettes(
  colours: Readonly<Record<string, Pick<Palette, 'paper' | 'ink' | 'accent'>>> | undefined,
): void {
  own = colours ?? {};
}

function withOwn(p: Palette): Palette {
  const mine = own[p.id];
  if (!mine) return p;
  try {
    return customPalette({ ...p, ...mine, id: p.id, label: p.label });
  } catch {
    // Unreadable colours (ink too close to the paper) never reach a page: the palette as made.
    return p;
  }
}

export function paletteById(id: string): Palette {
  return withOwn(PALETTES.find((p) => p.id === id) ?? (PALETTES[0] as Palette));
}

/**
 * Is this paper dark enough that ink-coloured overlays need inverting?
 *
 * Rec. 709 relative luminance on the sRGB values -- good enough to pick a blend mode, and it
 * avoids pulling in a colour library for one decision.
 */
export function isDarkPaper(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = Number.parseInt(m[1] as string, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.45;
}

export function palette(id: string): Palette {
  const found = PALETTES.find((p) => p.id === id);
  if (!found) {
    throw new Error(
      `unknown palette ${JSON.stringify(id)}; try one of: ${PALETTES.map((p) => p.id).join(', ')}`,
    );
  }
  return withOwn(found);
}

/** A palette the caller supplied, checked for the two things that must hold. */
export function customPalette(
  input: Pick<Palette, 'paper' | 'ink' | 'accent'> & Partial<Palette>,
): Palette {
  const made: Palette = {
    id: input.id ?? 'custom',
    label: input.label ?? 'Custom',
    dark: input.dark ?? luminance(input.paper) < luminance(input.ink),
    paper: input.paper,
    ink: input.ink,
    accent: input.accent,
  };
  const body = contrast(made.ink, made.paper);
  if (body < BODY_FLOOR) {
    throw new Error(
      `ink on paper is ${body.toFixed(2)}:1, below the ${BODY_FLOOR}:1 floor for body text`,
    );
  }
  return made;
}

/** Body text is real text, so the WCAG AA floor applies. */
export const BODY_FLOOR = 4.5;
/**
 * Chip lettering is large and bold, so 3:1. The chip's FILL is deliberately not
 * held to a floor against the paper: every chip is enclosed by a keyline, and
 * the keyline carries the non-text contrast. That is how riso and screen
 * printing actually work -- a hot flat ink inside a hard outline.
 */
export const CHIP_FLOOR = 3;

export function check(p: Palette): string[] {
  const problems: string[] = [];
  const body = contrast(p.ink, p.paper);
  if (body < BODY_FLOOR) problems.push(`${p.id}: ink on paper is ${body.toFixed(2)}:1`);
  const chip = contrast(p.accent, textOn(p.accent, [p.paper, p.ink]));
  if (chip < CHIP_FLOOR) problems.push(`${p.id}: chip text is ${chip.toFixed(2)}:1`);
  return problems;
}
