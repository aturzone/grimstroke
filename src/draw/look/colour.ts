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

// ---------------------------------------------------------------- mixing

function linear(value: number): number {
  return channel(value);
}

function encoded(value: number): number {
  const c = value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, c)) * 255);
}

function toOklab([r, g, b]: [number, number, number]): [number, number, number] {
  const [lr, lg, lb] = [linear(r), linear(g), linear(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function fromOklab([L, a, b]: [number, number, number]): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    encoded(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    encoded(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    encoded(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/**
 * CSS's color-mix(in oklab, a share, b), as a hex colour: what the chrome's derived inks
 * actually come to, so their contrast can be measured rather than hoped for.
 */
export function mixOklab(a: string, share: number, b: string): string {
  const x = toOklab(rgb(a));
  const y = toOklab(rgb(b));
  const out = fromOklab(
    [0, 1, 2].map((i) => (x[i] as number) * share + (y[i] as number) * (1 - share)) as [
      number,
      number,
      number,
    ],
  );
  return `#${out.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * CSS's oklch(from colour min(l, cap) c h): the same hue and chroma, no lighter than cap. The
 * tools' blue is the palette's accent held down this way, so it reads on the paper whatever the
 * accent is -- and the contrast test measures exactly this.
 */
export function capLightness(colour: string, cap: number): string {
  const [L, a, b] = toOklab(rgb(colour));
  const out = fromOklab([Math.min(L, cap), a, b]);
  return `#${out.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}
