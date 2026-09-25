/**
 * Colours by name: plain words, specific references ("tiffany blue", "minecraft diamond"), and
 * the Persian names, with light/dark/pastel modifiers mixed in rather than looked up.
 */

export const NAMED_COLORS: Record<string, string> = {
  red: '#e03131',
  crimson: '#c2255c',
  scarlet: '#f03e3e',
  maroon: '#862e2e',
  burgundy: '#7a1f3d',
  pink: '#f06595',
  rose: '#e64980',
  coral: '#ff7f6b',
  salmon: '#fa8072',
  peach: '#ffb38a',
  orange: '#ff7a1a',
  tangerine: '#ff8c2b',
  amber: '#f59f00',
  gold: '#e8b000',
  yellow: '#fcc419',
  mustard: '#d4a017',
  lemon: '#fff06a',
  cream: '#f7f0dc',
  beige: '#e8dcc4',
  sand: '#d8c49c',
  tan: '#c9a77c',
  brown: '#8b5a2b',
  chocolate: '#5d3a1a',
  olive: '#808a2f',
  lime: '#82c91e',
  green: '#2f9e44',
  sage: '#9caf88',
  mint: '#96f2d7',
  emerald: '#0ca678',
  teal: '#0c8599',
  turquoise: '#22b8cf',
  cyan: '#15aabf',
  sky: '#74c0fc',
  blue: '#1c7ed6',
  navy: '#1b2a5c',
  cobalt: '#2451b7',
  indigo: '#4c6ef5',
  violet: '#7950f2',
  purple: '#7048e8',
  lavender: '#b197fc',
  lilac: '#c8a2c8',
  magenta: '#d6336c',
  plum: '#8e4585',
  grey: '#868e96',
  gray: '#868e96',
  silver: '#c0c0c0',
  slate: '#5c6b7a',
  charcoal: '#343a40',
  black: '#141414',
  white: '#fafaf9',
  ivory: '#fffff0',
  قرمز: '#e03131',
  سرخ: '#c92a2a',
  زرشکی: '#8b1c2c',
  صورتی: '#f06595',
  گلبهی: '#ff9a8b',
  نارنجی: '#ff7a1a',
  زرد: '#fcc419',
  طلایی: '#e8b000',
  کرم: '#f7f0dc',
  بژ: '#e8dcc4',
  قهوه: '#8b5a2b',
  'قهوه ای': '#8b5a2b',
  شکلاتی: '#5d3a1a',
  زیتونی: '#808a2f',
  سبز: '#2f9e44',
  'سبز یشمی': '#00a86b',
  یشمی: '#00a86b',
  نعنایی: '#96f2d7',
  فیروزه: '#30d5c8',
  'فیروزه ای': '#30d5c8',
  آبی: '#1c7ed6',
  'آبی آسمانی': '#87ceeb',
  آسمانی: '#87ceeb',
  لاجوردی: '#1f4bb8',
  سرمه: '#1b2a5c',
  'سرمه ای': '#1b2a5c',
  بنفش: '#7048e8',
  یاسی: '#c8a2c8',
  ارغوانی: '#8e4585',
  خاکستری: '#868e96',
  طوسی: '#868e96',
  نقره: '#c0c0c0',
  'نقره ای': '#c0c0c0',
  مشکی: '#141414',
  سیاه: '#141414',
  سفید: '#fafaf9',
  'قرمز آتشی': '#ff2800',
};

export const REFERENCE_COLORS: Record<string, string> = {
  'minecraft diamond': '#4aedd9',
  'minecraft grass': '#7cbd6b',
  'minecraft emerald': '#17dd62',
  'tiffany blue': '#0abab5',
  tiffany: '#0abab5',
  'barbie pink': '#e0218a',
  'spotify green': '#1db954',
  'coca cola red': '#f40009',
  'netflix red': '#e50914',
  'facebook blue': '#1877f2',
  'twitter blue': '#1da1f2',
  'discord blurple': '#5865f2',
  blurple: '#5865f2',
  'ferrari red': '#ff2800',
  'ikea blue': '#0058a3',
  'klein blue': '#002fa7',
  'millennial pink': '#f3cfc6',
  'matrix green': '#00ff41',
  'shrek green': '#b5c91f',
  'pikachu yellow': '#f6d02f',
  pikachu: '#f6d02f',
  'persian blue': '#1c39bb',
  'persian green': '#00a693',
  'persian red': '#cc3333',
  diamond: '#b9f2ff',
  ruby: '#e0115f',
  sapphire: '#0f52ba',
  amethyst: '#9966cc',
  jade: '#00a86b',
  pearl: '#eae0c8',
  onyx: '#353839',
  'sky blue': '#87ceeb',
  'baby blue': '#89cff0',
  'baby pink': '#f4c2c2',
  'hot pink': '#ff69b4',
  'neon green': '#39ff14',
  'electric blue': '#7df9ff',
  'midnight blue': '#191970',
  'forest green': '#228b22',
  'blood red': '#8a0303',
  'brick red': '#b22222',
  'آبی نفتی': '#1d4e5f',
  'سبز لجنی': '#556b2f',
  'رنگ پوست پیازی': '#e6b8a2',
  'آبی کاربنی': '#1b3f8b',
};

export const COLOR_WORD_PATTERN = Object.keys({ ...NAMED_COLORS, ...REFERENCE_COLORS })
  .sort((a, b) => b.length - a.length)
  .join('|');

export function hexToRgb(hex: string): [number, number, number] | null {
  let h = hex.replace('#', '').trim();
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((v) =>
      Math.round(Math.min(255, Math.max(0, v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/** Mix toward white (amount > 0) or black (amount < 0). */
export function shade(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const target = amount > 0 ? 255 : 0;
  const a = Math.abs(amount);
  return rgbToHex(...(rgb.map((c) => c + (target - c) * a) as [number, number, number]));
}

/** Readable text on a swatch. */
export function inkOn(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#111';
  const [r, g, b] = rgb.map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? '#141414' : '#ffffff';
}

export function rgbString(hex: string): string {
  const rgb = hexToRgb(hex);
  return rgb ? `rgb(${rgb.join(', ')})` : '';
}

export function hslString(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '';
  const [r, g, b] = rgb.map((c) => c / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}
