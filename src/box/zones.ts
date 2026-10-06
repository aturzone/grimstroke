/**
 * Time zones people name -- abbreviations and cities, in English and Persian -- and the arithmetic
 * of reading a clock time in one of them. The zone rules come from Intl, which every browser and
 * Node already carries.
 */

export interface Zone {
  label: string;
  tz: string;
}

const Z = (label: string, tz: string): Zone => ({ label, tz });

export const ZONES: Record<string, Zone> = {
  pst: Z('PT', 'America/Los_Angeles'),
  pdt: Z('PT', 'America/Los_Angeles'),
  pt: Z('PT', 'America/Los_Angeles'),
  'san francisco': Z('San Francisco', 'America/Los_Angeles'),
  sf: Z('San Francisco', 'America/Los_Angeles'),
  'los angeles': Z('Los Angeles', 'America/Los_Angeles'),
  la: Z('Los Angeles', 'America/Los_Angeles'),
  seattle: Z('Seattle', 'America/Los_Angeles'),
  mst: Z('MT', 'America/Denver'),
  denver: Z('Denver', 'America/Denver'),
  cst: Z('CT', 'America/Chicago'),
  chicago: Z('Chicago', 'America/Chicago'),
  est: Z('ET', 'America/New_York'),
  edt: Z('ET', 'America/New_York'),
  et: Z('ET', 'America/New_York'),
  'new york': Z('New York', 'America/New_York'),
  nyc: Z('New York', 'America/New_York'),
  toronto: Z('Toronto', 'America/Toronto'),
  vancouver: Z('Vancouver', 'America/Vancouver'),
  utc: Z('UTC', 'UTC'),
  gmt: Z('GMT', 'Europe/London'),
  london: Z('London', 'Europe/London'),
  bst: Z('London', 'Europe/London'),
  cet: Z('CET', 'Europe/Paris'),
  paris: Z('Paris', 'Europe/Paris'),
  berlin: Z('Berlin', 'Europe/Berlin'),
  amsterdam: Z('Amsterdam', 'Europe/Amsterdam'),
  istanbul: Z('Istanbul', 'Europe/Istanbul'),
  moscow: Z('Moscow', 'Europe/Moscow'),
  tehran: Z('Tehran', 'Asia/Tehran'),
  irst: Z('Tehran', 'Asia/Tehran'),
  iran: Z('Tehran', 'Asia/Tehran'),
  dubai: Z('Dubai', 'Asia/Dubai'),
  ist: Z('IST', 'Asia/Kolkata'),
  india: Z('India', 'Asia/Kolkata'),
  mumbai: Z('Mumbai', 'Asia/Kolkata'),
  delhi: Z('Delhi', 'Asia/Kolkata'),
  bangalore: Z('Bangalore', 'Asia/Kolkata'),
  singapore: Z('Singapore', 'Asia/Singapore'),
  'hong kong': Z('Hong Kong', 'Asia/Hong_Kong'),
  beijing: Z('Beijing', 'Asia/Shanghai'),
  shanghai: Z('Shanghai', 'Asia/Shanghai'),
  tokyo: Z('Tokyo', 'Asia/Tokyo'),
  jst: Z('Tokyo', 'Asia/Tokyo'),
  seoul: Z('Seoul', 'Asia/Seoul'),
  sydney: Z('Sydney', 'Australia/Sydney'),
  aest: Z('Sydney', 'Australia/Sydney'),
  auckland: Z('Auckland', 'Pacific/Auckland'),
  تهران: Z('تهران', 'Asia/Tehran'),
  ایران: Z('تهران', 'Asia/Tehran'),
  لندن: Z('لندن', 'Europe/London'),
  پاریس: Z('پاریس', 'Europe/Paris'),
  برلین: Z('برلین', 'Europe/Berlin'),
  استانبول: Z('استانبول', 'Europe/Istanbul'),
  مسکو: Z('مسکو', 'Europe/Moscow'),
  دبی: Z('دبی', 'Asia/Dubai'),
  توکیو: Z('توکیو', 'Asia/Tokyo'),
  پکن: Z('پکن', 'Asia/Shanghai'),
  نیویورک: Z('نیویورک', 'America/New_York'),
  'نیو یورک': Z('نیویورک', 'America/New_York'),
  تورنتو: Z('تورنتو', 'America/Toronto'),
  ونکوور: Z('ونکوور', 'America/Vancouver'),
  'لس آنجلس': Z('لس‌آنجلس', 'America/Los_Angeles'),
  سیدنی: Z('سیدنی', 'Australia/Sydney'),
  هند: Z('هند', 'Asia/Kolkata'),
};

export const ZONE_PATTERN = Object.keys(ZONES)
  .sort((a, b) => b.length - a.length)
  .map((z) => z.replace(/[/.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');

/** Latin names need word edges; Persian ones cannot use \b, so they need spaces or the ends. */
export const ZONE_RE = new RegExp(
  `(?:^|[^a-z\\u0600-\\u06ff])(${ZONE_PATTERN})(?=$|[^a-z\\u0600-\\u06ff])`,
  'gi',
);

export function localZone(): Zone {
  return { label: 'Local', tz: Intl.DateTimeFormat().resolvedOptions().timeZone };
}

/** Minutes the zone is ahead of UTC at that instant. */
export function tzOffset(tz: string, at: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
  );
  return Math.round((asUtc - at.getTime()) / 60_000);
}

/** The instant when the clock in `tz` reads h:m on the day it is in `tz` at `ref`. */
export function instantIn(tz: string, h: number, m: number, ref: Date): Date {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    })
      .formatToParts(ref)
      .map((p) => [p.type, p.value]),
  );
  const guess = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), h, m);
  const first = guess - tzOffset(tz, new Date(guess)) * 60_000;
  return new Date(guess - tzOffset(tz, new Date(first)) * 60_000);
}

export function formatIn(tz: string, at: Date, fa = false): string {
  return new Intl.DateTimeFormat(fa ? 'fa-IR' : 'en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
  }).format(at);
}

/** "+3:30", "-7" -- the difference between two zones at an instant, for the card's line. */
export function offsetBetween(from: string, to: string, at: Date): string {
  const d = tzOffset(to, at) - tzOffset(from, at);
  const sign = d < 0 ? '−' : '+';
  const a = Math.abs(d);
  return `${sign}${Math.floor(a / 60)}${a % 60 ? `:${String(a % 60).padStart(2, '0')}` : ''}h`;
}
