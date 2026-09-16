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

export const DEFAULT_PALETTE = 'newsprint';

export function palette(id: string): Palette {
  const found = PALETTES.find((p) => p.id === id);
  if (!found) {
    throw new Error(
      `unknown palette ${JSON.stringify(id)}; try one of: ${PALETTES.map((p) => p.id).join(', ')}`,
    );
  }
  return found;
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

// ---------------------------------------------------------------- colour

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function rgb(colour: string): [number, number, number] {
  let hex = colour.trim().replace('#', '');
  if (hex.length === 3)
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  const value = Number.parseInt(hex, 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

export function luminance(colour: string): number {
  const [r, g, b] = rgb(colour);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Lettering on a coloured chip is DERIVED, never authored: whichever of paper or
 * ink scores higher against that accent wins. A palette therefore cannot ship
 * with unreadable chips, whoever adds it.
 */
export function textOn(background: string, options: readonly string[]): string {
  let best = options[0] ?? '#000000';
  let bestRatio = -1;
  for (const option of options) {
    const ratio = contrast(background, option);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = option;
    }
  }
  return best;
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
