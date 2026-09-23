/**
 * Colour, as arithmetic.
 *
 * Split from the palettes on purpose. These four functions know nothing about
 * this tool's eight inks: they are the WCAG relative-luminance maths, and they
 * are what decides lettering on a chip, whether a custom palette is allowed in,
 * and eventually what a cover sticker or a character's skin tone may sit on.
 * A palette is policy; this is the measurement the policy is written against.
 *
 * Nothing here perceives. `contrast` is a ratio of relative luminances, which is
 * the number accessibility rules are written in -- not a perceptual distance,
 * and not interchangeable with one.
 */

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
 * Lettering on a coloured chip is DERIVED, never authored: whichever of the
 * candidates scores higher against that background wins. A palette therefore
 * cannot ship with unreadable chips, whoever adds it.
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
