/**
 * Finding a date or a time in a sentence, in English and in Persian, with nothing to install.
 *
 * It reads what people actually type into a box like this -- "friday 8pm", "tomorrow at 5",
 * "in 3 days", "12 oct", "فردا ساعت ۸ شب", "جمعه", "۱۵ مهر", "سه روز دیگه" -- and answers with
 * the moment and where in the text it was, so the parser can take it out and keep the rest as
 * the title. It is not a general date library, and it does not try to be: an unread date is a
 * card with "add date" on it, which the person fixes with one word.
 *
 * Always relative to `ref`, never to the clock, so a card drawn tomorrow says what it said today.
 */

export interface DateHit {
  start: Date;
  hasTime: boolean;
  /** Where the words were in the (folded, lowercased) text. */
  index: number;
  length: number;
}

import { foldInPlace } from './text.ts';

const EN_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
/** Persian weekdays by JS index (0 = Sunday). */
const FA_DAYS: Array<[RegExp, number]> = [
  [/یک ?شنبه/, 0],
  [/دو ?شنبه/, 1],
  [/سه ?شنبه/, 2],
  [/چهار ?شنبه/, 3],
  [/پنج ?شنبه/, 4],
  [/جمعه/, 5],
  [/شنبه/, 6],
];
const EN_MONTHS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
];
const FA_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

// ---------------------------------------------------------------- the Persian calendar

function div(a: number, b: number): number {
  return Math.trunc(a / b);
}

/** Jalali to Gregorian (the jalaali algorithm, Borkowski's breaks). Months are 1-based. */
export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  const breaks = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394,
    2456, 3178,
  ];
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0] as number;
  let jump = 0;
  for (let i = 1; i < breaks.length; i++) {
    const jm2 = breaks[i] as number;
    jump = jm2 - jp;
    if (jy < jm2) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(jump % 33, 4);
    jp = jm2;
  }
  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div((n % 33) + 3, 4);
  if (jump % 33 === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  n = jd + (jm <= 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186) - 1;
  const start = new Date(gy, 2, march);
  start.setDate(start.getDate() + n);
  return [start.getFullYear(), start.getMonth() + 1, start.getDate()];
}

/** The Jalali year a Gregorian date falls in (good to the day around Nowruz). */
export function jalaliYear(d: Date): number {
  const [gy, gm, gd] = jalaliToGregorian(d.getFullYear() - 621, 1, 1);
  const nowruz = new Date(gy, gm - 1, gd);
  return d >= nowruz ? d.getFullYear() - 621 : d.getFullYear() - 622;
}

// ---------------------------------------------------------------- reading

const startOf = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number): Date => {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
};

interface Part {
  index: number;
  length: number;
}

/** The earliest-and-widest span covering every part found. */
function span(parts: Part[]): Part {
  const index = Math.min(...parts.map((p) => p.index));
  const end = Math.max(...parts.map((p) => p.index + p.length));
  return { index, length: end - index };
}

/** The coming `day`: today counts, unless it was said as "next friday" -- then strictly after. */
function nextWeekday(ref: Date, day: number, strictlyAfter: boolean): Date {
  const today = startOf(ref);
  let delta = (day - today.getDay() + 7) % 7;
  if (delta === 0 && strictlyAfter) delta = 7;
  return addDays(today, delta);
}

/** A clock time: "8pm", "8:30 pm", "20:00", "at 5", "noon", "ساعت ۸ شب", "ظهر". */
function findTime(t: string): { h: number; m: number; part: Part } | null {
  let m = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)/.exec(t);
  if (m) {
    let h = Number(m[1]) % 12;
    if ((m[3] ?? '').startsWith('p')) h += 12;
    return { h, m: Number(m[2] ?? 0), part: { index: m.index, length: m[0].length } };
  }
  m = /(?:ساعت\s*)(\d{1,2})(?::(\d{2}))?(?:\s*(صبح|ظهر|بعد ?از ?ظهر|عصر|شب|بامداد))?/.exec(t);
  if (m) {
    let h = Number(m[1]);
    const when = m[3] ?? '';
    // ساعت ۸ شب is 20:00 and ساعت ۱۲ شب is midnight; ساعت ۲ بعد از ظهر is 14:00.
    if (/ظهر|عصر|شب/.test(when) && h < 12) h += 12;
    else if (/شب|بامداد/.test(when) && h === 12) h = 0;
    // A bare "ساعت ۵" for a plan means the afternoon, the way "at 5" does.
    else if (!when && h >= 1 && h < 7) h += 12;
    return { h: h % 24, m: Number(m[2] ?? 0), part: { index: m.index, length: m[0].length } };
  }
  m = /\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/.exec(t);
  if (m) return { h: Number(m[1]), m: Number(m[2]), part: { index: m.index, length: m[0].length } };
  m = /\bat\s+(\d{1,2})\b(?!\s*(?:%|km|kg|min|people|nafar))/.exec(t);
  if (m && Number(m[1]) <= 12) {
    let h = Number(m[1]);
    // "dinner at 8" means the evening.
    if (h < 8) h += 12;
    return { h, m: 0, part: { index: m.index, length: m[0].length } };
  }
  m = /\b(noon|midday)\b|ظهر/.exec(t);
  if (m) return { h: 12, m: 0, part: { index: m.index, length: m[0].length } };
  m = /\bmidnight\b|نیمه ?شب/.exec(t);
  if (m) return { h: 0, m: 0, part: { index: m.index, length: m[0].length } };
  return null;
}

/**
 * The first date-and-time in `text` (folded; case does not matter). Relative words are read
 * against `ref`; a weekday means the next one; a date without a year means the next such date.
 */
export function findDate(text: string, ref: Date): DateHit | null {
  const t = foldInPlace(text).toLowerCase();
  const parts: Part[] = [];
  let day: Date | null = null;
  let hasTime = false;
  let hour = 0;
  let minute = 0;

  const hit = (re: RegExp): RegExpExecArray | null => {
    const m = re.exec(t);
    if (m) parts.push({ index: m.index, length: m[0].length });
    return m;
  };

  // In N units / N units later: "in 3 days", "in 2 hours", "۳ روز دیگه", "تا ۲ ساعت دیگه".
  const m = hit(
    /\bin\s+(\d+|an?|one|two|three)\s+(minutes?|mins?|hours?|hrs?|days?|weeks?|months?)\b|(\d+)\s+(دقیقه|ساعت|روز|هفته|ماه)\s+(?:دیگه|دیگر|بعد)/,
  );
  if (m) {
    const n = Number(m[1] ?? m[3]) || (/^(an?|one)$/.test(m[1] ?? '') ? 1 : m[1] === 'two' ? 2 : 3);
    const unit = (m[2] ?? m[4] ?? '').toString();
    const at = new Date(ref);
    if (/^(min|دقیقه)/.test(unit)) {
      at.setMinutes(at.getMinutes() + n);
      hasTime = true;
    } else if (/^(h|ساعت)/.test(unit)) {
      at.setHours(at.getHours() + n);
      hasTime = true;
    } else if (/^(d|روز)/.test(unit)) at.setDate(at.getDate() + n);
    else if (/^(w|هفته)/.test(unit)) at.setDate(at.getDate() + 7 * n);
    else at.setMonth(at.getMonth() + n);
    if (hasTime) return { start: at, hasTime, ...span(parts) };
    day = startOf(at);
  }

  // Named days.
  if (!day) {
    if (hit(/\bday after tomorrow\b|پس ?فردا/)) day = addDays(startOf(ref), 2);
    else if (hit(/\b(tomorrow|tmrw|tmr)\b|فردا/)) day = addDays(startOf(ref), 1);
    else if (hit(/\btonight\b|امشب/)) {
      day = startOf(ref);
      hour = 20;
      hasTime = true;
    } else if (hit(/\btoday\b|امروز/)) day = startOf(ref);
    else if (hit(/\bnext week\b|هفته ?(?:ی )?(?:بعد|دیگه|آینده)/)) day = addDays(startOf(ref), 7);
  }

  // Weekdays: "friday", "next fri", "on mon", "جمعه", "جمعه بعد".
  if (!day) {
    const en =
      /\b(next\s+|this\s+|on\s+)?(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(?:day|nesday|sday|urday|rsday)?\b/.exec(
        t,
      );
    if (en) {
      parts.push({ index: en.index, length: en[0].length });
      day = nextWeekday(ref, EN_DAYS.indexOf((en[2] ?? '').slice(0, 3)), /next/.test(en[1] ?? ''));
    } else {
      for (const [re, idx] of FA_DAYS) {
        const fa = new RegExp(`${re.source}(\\s*(?:بعد|آینده|دیگه))?`).exec(t);
        if (fa) {
          parts.push({ index: fa.index, length: fa[0].length });
          day = nextWeekday(ref, idx, Boolean(fa[1]));
          break;
        }
      }
    }
  }

  // Month and day: "12 oct", "oct 12th", "december 25", "۱۵ مهر", "مهر ۱۵".
  if (!day) {
    const monthRe = EN_MONTHS.map((mo) => `${mo}[a-z]*`).join('|');
    const en =
      new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${monthRe})\\b`).exec(t) ??
      new RegExp(`\\b(${monthRe})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`).exec(t);
    if (en) {
      parts.push({ index: en.index, length: en[0].length });
      const first = en[1] ?? '';
      const [dd, mon] = /^\d/.test(first) ? [Number(first), en[2] ?? ''] : [Number(en[2]), first];
      const month = EN_MONTHS.indexOf(mon.slice(0, 3));
      let d = new Date(ref.getFullYear(), month, dd);
      if (d < startOf(ref)) d = new Date(ref.getFullYear() + 1, month, dd);
      day = d;
    } else {
      const faRe = FA_MONTHS.join('|');
      const fa =
        new RegExp(`(\\d{1,2})\\s*(?:ام\\s*)?(${faRe})`).exec(t) ??
        new RegExp(`(${faRe})\\s*(\\d{1,2})`).exec(t);
      if (fa) {
        parts.push({ index: fa.index, length: fa[0].length });
        const first = fa[1] ?? '';
        const [dd, mon] = /^\d/.test(first) ? [Number(first), fa[2] ?? ''] : [Number(fa[2]), first];
        const jm = FA_MONTHS.indexOf(mon) + 1;
        let jy = jalaliYear(ref);
        let [gy, gm, gd] = jalaliToGregorian(jy, jm, dd);
        if (new Date(gy, gm - 1, gd) < startOf(ref)) {
          jy += 1;
          [gy, gm, gd] = jalaliToGregorian(jy, jm, dd);
        }
        day = new Date(gy, gm - 1, gd);
      }
    }
  }

  // The time of day, on its own or with a day.
  const time = findTime(t);
  if (time) {
    parts.push(time.part);
    hour = time.h;
    minute = time.m;
    hasTime = true;
  } else if (!hasTime) {
    const part = /\b(this\s+)?(morning|evening|afternoon)\b|صبح|عصر|بعد ?از ?ظهر/.exec(t);
    if (part && day) {
      parts.push({ index: part.index, length: part[0].length });
      const w = part[0];
      hour = /morning|صبح/.test(w) ? 9 : /afternoon|بعد/.test(w) ? 15 : 18;
      hasTime = true;
    }
    // "شب" after a day: فردا شب
    const night = /(فردا|امروز|جمعه|شنبه)\s+شب/.exec(t);
    if (night && day && !hasTime) {
      parts.push({ index: night.index, length: night[0].length });
      hour = 20;
      hasTime = true;
    }
  }

  if (!day && !hasTime) return null;
  if (!day) {
    // A time alone is today, or tomorrow once it has passed.
    day = startOf(ref);
    const probe = new Date(day);
    probe.setHours(hour, minute);
    if (probe < ref) day = addDays(day, 1);
  }
  const start = new Date(day);
  if (hasTime) start.setHours(hour, minute, 0, 0);
  return { start, hasTime, ...span(parts) };
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOf(to).getTime() - startOf(from).getTime()) / 86_400_000);
}

/** "Today", "Tomorrow", "Fri, 26 Sep" and "8 PM", or the Persian equivalents. */
export function formatWhen(
  d: Date,
  hasTime: boolean,
  ref: Date,
  fa: boolean,
): { day: string; time: string | null } {
  const diff = daysBetween(ref, d);
  const day =
    diff === 0
      ? fa
        ? 'امروز'
        : 'Today'
      : diff === 1
        ? fa
          ? 'فردا'
          : 'Tomorrow'
        : fa
          ? new Intl.DateTimeFormat('fa-IR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            }).format(d)
          : new Intl.DateTimeFormat('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            }).format(d);
  const time = hasTime
    ? fa
      ? new Intl.DateTimeFormat('fa-IR', { hour: 'numeric', minute: '2-digit' }).format(d)
      : new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          ...(d.getMinutes() ? { minute: '2-digit' } : {}),
        }).format(d)
    : null;
  return { day, time };
}
