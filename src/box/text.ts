/**
 * Text as the shape reader sees it: one alphabet of digits, one spelling of each Persian letter.
 *
 * Someone typing on a Persian keyboard writes ۱۲ and a phone may send ١٢; Arabic kaf and yeh
 * arrive from half the keyboards in use. Every rule and every parser downstream would have to
 * know all of that, so it is folded here, once, before anything reads the text.
 */

const DIGITS: Record<string, string> = {};
'۰۱۲۳۴۵۶۷۸۹'.split('').forEach((d, i) => {
  DIGITS[d] = String(i);
});
'٠١٢٣٤٥٦٧٨٩'.split('').forEach((d, i) => {
  DIGITS[d] = String(i);
});

/** Persian and Arabic digits to ASCII, Arabic letters to their Persian forms, spaces collapsed. */
export function fold(text: string): string {
  return (
    text
      .replace(/[۰-۹٠-٩]/g, (d) => DIGITS[d] ?? d)
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      // Russian is typed with and without the dots on ё; it is read one way.
      .replace(/ё/g, 'е')
      .replace(/Ё/g, 'Е')
      .replace(/[٫]/g, '.')
      .replace(/[٬،]/g, ',')
      .replace(/؟/g, '?')
      .replace(/٪/g, '%')
      .replace(/‌/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/** Digits and letters folded, one character for one, so positions in the text still hold. */
export function foldInPlace(text: string): string {
  return text
    .replace(/[۰-۹٠-٩]/g, (d) => DIGITS[d] ?? d)
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ё/g, 'е')
    .replace(/Ё/g, 'Е')
    .replace(/\u200c/g, ' ');
}

/** Folded and lowercased: what the classifier and the rules read. */
export function norm(text: string): string {
  return fold(text).toLowerCase();
}

export const PERSIAN = /[؀-ۿ]/;

export const RUSSIAN = /[Ѐ-ӿ]/;

export function isRussian(text: string): boolean {
  return RUSSIAN.test(text) && !PERSIAN.test(text);
}

/** Which of the three a line is in, by its letters: what its card speaks. */
export type Lang = 'en' | 'fa' | 'ru';
export function langOf(text: string): Lang {
  return PERSIAN.test(text) ? 'fa' : RUSSIAN.test(text) ? 'ru' : 'en';
}

export function isPersian(text: string): boolean {
  return PERSIAN.test(text);
}

export function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => capitalize(w))
    .join(' ');
}

export function collapse(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Strip the connecting words a removed phrase leaves hanging, in both languages. */
export function tidy(s: string): string {
  let out = collapse(s.replace(/[,;،]+\s*$/g, '').replace(/^\s*[,;:،-]+/g, ''));
  const dangling =
    /\s+(on|at|by|for|with|to|in|and|the|this|next|from|every|a|of|در|به|با|برای|از|و|تا|ساعت|را|رو)$/i;
  const leading = /^(on|at|by|for|and|the|to|a|در|برای|و|که)\s+/i;
  for (let i = 0; i < 5; i++) {
    const next = out.replace(dangling, '').replace(leading, '');
    if (next === out) break;
    out = next;
  }
  return out.trim();
}

export function removeRange(text: string, index: number, length: number): string {
  return `${text.slice(0, index)} ${text.slice(index + length)}`;
}

/** Word numbers people type instead of digits. */
export const WORD_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  یک: 1,
  یه: 1,
  دو: 2,
  سه: 3,
  چهار: 4,
  پنج: 5,
  شش: 6,
  شیش: 6,
  هفت: 7,
  هشت: 8,
  نه: 9,
  ده: 10,
  یازده: 11,
  دوازده: 12,
  один: 1,
  одна: 1,
  одну: 1,
  два: 2,
  две: 2,
  три: 3,
  четыре: 4,
  пять: 5,
  шесть: 6,
  семь: 7,
  восемь: 8,
  девять: 9,
  десять: 10,
  двоих: 2,
  троих: 3,
  четверых: 4,
  пятерых: 5,
};

export function numberWord(word: string): number | undefined {
  const w = word.toLowerCase();
  if (/^\d+(\.\d+)?$/.test(w)) return Number(w);
  return WORD_NUMBERS[w];
}

export type Currency = '$' | '€' | '£' | '₹' | '₽' | 'تومان' | 'ریال' | '';

export function detectCurrency(text: string): Currency {
  const t = text.toLowerCase();
  if (/\$|\busd\b|dollars?\b|دلار/.test(t)) return '$';
  if (/€|\beur(os?)?\b|یورو/.test(t)) return '€';
  if (/£|\bgbp\b|pounds? sterling/.test(t)) return '£';
  if (/₹|\binr\b|\brs\.?\s?\d|rupees?/.test(t)) return '₹';
  if (/₽|руб|\brub\b/.test(t)) return '₽';
  if (/ریال/.test(t)) return 'ریال';
  if (/تومن|تومان|هزار تومن|میلیون/.test(t) || isPersian(t)) return 'تومان';
  return '';
}

/** "2,400", "2.5k", "۲ میلیون", "۴۵۰ هزار": the first amount of money in the text. */
export function findAmount(text: string): { value: number; index: number; length: number } | null {
  const re =
    /(?:₹|rs\.?|inr|\$|€|£|₽)?\s?(\d[\d,]*(?:\.\d+)?)\s?(k\b|m\b|هزار|میلیون|میلیارد|тыс(?:яч[аи]?)?\.?|млн)?/giu;
  for (let m = re.exec(text); m !== null; m = re.exec(text)) {
    const n = Number((m[1] ?? '').replace(/,/g, ''));
    if (!Number.isFinite(n)) continue;
    const scale = (m[2] ?? '').toLowerCase();
    const value =
      scale === 'k' || scale === 'هزار' || scale.startsWith('тыс')
        ? n * 1000
        : scale === 'm' || scale === 'میلیون' || scale === 'млн'
          ? n * 1_000_000
          : scale === 'میلیارد'
            ? n * 1_000_000_000
            : n;
    return { value, index: m.index, length: m[0].length };
  }
  return null;
}

/**
 * Words as a regular expression with edges that work for Persian too: `\b` knows only Latin
 * letters, so without this, taking «تا» out of a sentence took it out of «کتاب» as well.
 */
export function words(alternatives: string, flags = 'gi'): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives})(?![\\p{L}\\p{N}])`, `${flags}u`);
}

/** Digits as the text's own script writes them. */
export function digitsFor(n: number | string, fa: boolean): string {
  const s = String(n);
  return fa ? s.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)] as string) : s;
}

export function formatAmount(n: number, currency: Currency): string {
  const rounded = Math.round(n * 100) / 100;
  if (currency === 'تومان' || currency === 'ریال')
    return `${rounded.toLocaleString('fa-IR')} ${currency}`;
  if (currency === '₽') return `${rounded.toLocaleString('ru-RU')} ₽`;
  const digits = rounded.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${currency}${digits}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}
