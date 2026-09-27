/**
 * What can be changed on a card by hand, and how a change is kept.
 *
 * A card is its text, read by a parser. Retyping the text is one way to change it; this is the
 * other: every kind has a short list of fields -- a timer's label and duration, an event's date
 * and place, a poll's options -- and a value set by hand is kept in `state.fields`, over what the
 * text says. The text stays the text (it is what search finds and what the card was made from);
 * a field left alone still follows it.
 *
 * One schema serves the person and the agent: the editor on a card is drawn from it, and an agent
 * sends the same keys in `state.fields`.
 */

import type { ShapeIntent } from './intents.ts';
import {
  evaluate,
  normalizeExpression,
  parseShape,
  type RandomData,
  type ShapeDataMap,
} from './parse.ts';
import { type Currency, initials, isPersian } from './text.ts';
import { convertValue, UNITS } from './units.ts';
import { instantIn, localZone, ZONES } from './zones.ts';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'time'
  | 'duration'
  | 'color'
  | 'list'
  | 'select'
  | 'days'
  | 'url'
  | 'tel'
  | 'email';

export interface FieldDef {
  key: string;
  label: string;
  fa: string;
  type: FieldType;
  /** For a select: value and label. */
  options?: ReadonlyArray<readonly [string, string]>;
  min?: number;
  max?: number;
  step?: number;
}

/** A field's value: text, a number, a list of words, or a list of day numbers. */
export type FieldValue = string | number | string[] | number[];

export type Fields = Record<string, FieldValue>;

const F = (
  key: string,
  label: string,
  fa: string,
  type: FieldType,
  extra: Partial<FieldDef> = {},
): FieldDef => ({ key, label, fa, type, ...extra });

const CURRENCIES: ReadonlyArray<readonly [string, string]> = [
  ['', '—'],
  ['$', '$'],
  ['€', '€'],
  ['£', '£'],
  ['₹', '₹'],
  ['تومان', 'تومان'],
  ['ریال', 'ریال'],
];

const UNIT_OPTIONS: ReadonlyArray<readonly [string, string]> = Object.entries(UNITS).map(
  ([k, u]) => [k, `${u.label} · ${u.measure}`] as const,
);

/** One entry per zone, by its English name. */
export const ZONE_OPTIONS: ReadonlyArray<readonly [string, string]> = (() => {
  const seen = new Set<string>();
  const out: Array<readonly [string, string]> = [['local', 'Here (this computer)']];
  for (const [k, z] of Object.entries(ZONES)) {
    if (isPersian(k) || seen.has(`${z.tz}|${z.label}`)) continue;
    seen.add(`${z.tz}|${z.label}`);
    out.push([k, `${z.label} (${z.tz})`]);
  }
  return out;
})();

export const FIELDS: Record<ShapeIntent, readonly FieldDef[]> = {
  event: [
    F('title', 'What', 'چی', 'text'),
    F('date', 'Date', 'تاریخ', 'date'),
    F('time', 'Time', 'ساعت', 'time'),
    F('place', 'Where', 'کجا', 'text'),
    F('people', 'With', 'با', 'list'),
  ],
  reminder: [
    F('task', 'Remember to', 'یادت باشه', 'text'),
    F('date', 'Date', 'تاریخ', 'date'),
    F('time', 'Time', 'ساعت', 'time'),
  ],
  todo: [F('items', 'Items', 'موارد', 'list')],
  timer: [F('label', 'Label', 'عنوان', 'text'), F('duration', 'Duration', 'مدت', 'duration')],
  habit: [
    F('title', 'Habit', 'عادت', 'text'),
    F('label', 'How often', 'هر چند وقت', 'text'),
    F('days', 'Days', 'روزها', 'days'),
  ],
  color: [F('hex', 'Colour', 'رنگ', 'color'), F('name', 'Name', 'نام', 'text')],
  split: [
    F('total', 'Total', 'مبلغ کل', 'number', { min: 0, step: 0.01 }),
    F('people', 'People', 'نفرات', 'number', { min: 1, max: 99, step: 1 }),
    F('currency', 'Currency', 'واحد پول', 'select', { options: CURRENCIES }),
  ],
  expense: [
    F('amount', 'Amount', 'مبلغ', 'number', { min: 0, step: 0.01 }),
    F('item', 'On', 'برای', 'text'),
    F('currency', 'Currency', 'واحد پول', 'select', { options: CURRENCIES }),
  ],
  convert: [
    F('value', 'Value', 'مقدار', 'number', { step: 0.01 }),
    F('from', 'From', 'از', 'select', { options: UNIT_OPTIONS }),
    F('to', 'To', 'به', 'select', { options: UNIT_OPTIONS }),
  ],
  calc: [F('expression', 'Sum', 'عبارت', 'text')],
  travel: [
    F('destination', 'To', 'مقصد', 'text'),
    F('origin', 'From', 'مبدأ', 'text'),
    F('start', 'Leave', 'رفت', 'date'),
    F('end', 'Back', 'برگشت', 'date'),
    F('mode', 'By', 'با', 'select', {
      options: [
        ['', '—'],
        ['flight', 'Flight'],
        ['train', 'Train'],
        ['bus', 'Bus'],
        ['car', 'Car'],
      ],
    }),
  ],
  poll: [F('title', 'Question', 'سؤال', 'text'), F('options', 'Options', 'گزینه‌ها', 'list')],
  contact: [
    F('name', 'Name', 'نام', 'text'),
    F('phone', 'Phone', 'تلفن', 'tel'),
    F('email', 'Email', 'ایمیل', 'email'),
  ],
  link: [F('url', 'Link', 'لینک', 'url'), F('note', 'Note', 'یادداشت', 'text')],
  countdown: [F('title', 'Until', 'تا', 'text'), F('date', 'Date', 'تاریخ', 'date')],
  timezone: [
    F('from', 'From', 'از', 'select', { options: ZONE_OPTIONS }),
    F('to', 'To', 'به', 'select', { options: [['', '—'], ...ZONE_OPTIONS] }),
    F('time', 'At (empty for now)', 'ساعت (خالی یعنی الان)', 'time'),
  ],
  random: [
    F('kind', 'Kind', 'نوع', 'select', {
      options: [
        ['dice', 'Dice'],
        ['coin', 'Coin'],
        ['number', 'A number'],
        ['pick', 'Pick one'],
      ],
    }),
    F('count', 'Dice', 'تعداد تاس', 'number', { min: 1, max: 20, step: 1 }),
    F('sides', 'Sides', 'وجه', 'number', { min: 2, max: 100, step: 1 }),
    F('min', 'From', 'از', 'number', { step: 1 }),
    F('max', 'To', 'تا', 'number', { step: 1 }),
    F('options', 'Choices', 'گزینه‌ها', 'list'),
  ],
  goal: [
    F('title', 'Goal', 'هدف', 'text'),
    F('current', 'Done so far', 'تا حالا', 'number', { min: 0, step: 1 }),
    F('target', 'Target', 'هدف نهایی', 'number', { min: 1, step: 1 }),
    F('unit', 'Unit', 'واحد', 'text'),
  ],
  note: [F('text', 'Note', 'یادداشت', 'textarea')],
};

// ---------------------------------------------------------------- dates

function ymd(d: Date | null): string {
  return d
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    : '';
}

function hm(d: Date | null, hasTime: boolean): string {
  return d && hasTime
    ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    : '';
}

/** A date field and a time field back into a moment; an empty date keeps the one there was. */
function joinDate(
  date: FieldValue | undefined,
  time: FieldValue | undefined,
  was: Date | null,
  hadTime: boolean,
  ref: Date,
): { at: Date | null; hasTime: boolean } {
  let at = was ? new Date(was) : null;
  let hasTime = hadTime;
  if (typeof date === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    if (m) {
      const next = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      if (at && hasTime) next.setHours(at.getHours(), at.getMinutes());
      at = next;
    } else if (date === '') at = null;
  }
  if (typeof time === 'string') {
    const m = /^(\d{1,2}):(\d{2})/.exec(time);
    if (m) {
      at = at ?? new Date(ref);
      at.setHours(Number(m[1]), Number(m[2]), 0, 0);
      hasTime = true;
    } else if (time === '') {
      if (at) at.setHours(0, 0, 0, 0);
      hasTime = false;
    }
  }
  return { at, hasTime };
}

const has = (f: Fields, k: string): boolean => Object.hasOwn(f, k);
const str = (v: FieldValue | undefined): string => (typeof v === 'string' ? v : String(v ?? ''));
const num = (v: FieldValue | undefined): number | null => {
  if (v === '' || v === undefined || Array.isArray(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const list = (v: FieldValue | undefined): string[] =>
  Array.isArray(v)
    ? v
        .map(String)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

// ---------------------------------------------------------------- the card, as it is

export interface ShapeStateLike {
  fields?: Fields;
  people?: number;
  total?: number;
  days?: number[];
  current?: number;
  to?: string;
}

/**
 * What a card shows: its text read, with what has been set by hand laid over it. The older
 * per-kind state (`people`, `total`, `days`, `current`, `to`) is honoured beneath `fields`.
 */
export function readShape<K extends ShapeIntent>(
  intent: K,
  text: string,
  ref: Date,
  state: ShapeStateLike = {},
): ShapeDataMap[K] {
  return applyFields(intent, parseShape(intent, text, ref), state, ref);
}

export function applyFields<K extends ShapeIntent>(
  intent: K,
  parsed: ShapeDataMap[K],
  state: ShapeStateLike,
  ref: Date,
): ShapeDataMap[K] {
  const f: Fields = state.fields ?? {};
  const d = structuredClone(parsed) as ShapeDataMap[ShapeIntent];
  switch (intent) {
    case 'event': {
      const e = d as ShapeDataMap['event'];
      if (has(f, 'title')) e.title = str(f.title);
      if (has(f, 'date') || has(f, 'time')) {
        const j = joinDate(f.date, f.time, e.date, e.hasTime, ref);
        e.date = j.at;
        e.hasTime = j.hasTime;
      }
      if (has(f, 'place')) {
        e.location = str(f.place) || null;
        e.link = null;
      }
      if (has(f, 'people')) e.people = list(f.people);
      break;
    }
    case 'reminder': {
      const r = d as ShapeDataMap['reminder'];
      if (has(f, 'task')) r.task = str(f.task);
      if (has(f, 'date') || has(f, 'time')) {
        const j = joinDate(f.date, f.time, r.when, r.hasTime, ref);
        r.when = j.at;
        r.hasTime = j.hasTime;
      }
      break;
    }
    case 'todo':
      if (has(f, 'items')) (d as ShapeDataMap['todo']).items = list(f.items);
      break;
    case 'timer': {
      const t = d as ShapeDataMap['timer'];
      if (has(f, 'label')) t.label = str(f.label);
      if (has(f, 'duration')) {
        const n = num(f.duration);
        t.seconds = n && n > 0 ? Math.round(n) : null;
      }
      break;
    }
    case 'habit': {
      const h = d as ShapeDataMap['habit'];
      if (has(f, 'title')) h.title = str(f.title);
      if (has(f, 'label')) h.label = str(f.label) || null;
      if (has(f, 'days') && Array.isArray(f.days)) h.days = (f.days as number[]).map(Number);
      else if (state.days) h.days = [...state.days];
      break;
    }
    case 'color': {
      const c = d as ShapeDataMap['color'];
      if (has(f, 'hex') && /^#[0-9a-f]{6}$/i.test(str(f.hex))) c.hex = str(f.hex).toLowerCase();
      if (has(f, 'name')) c.name = str(f.name) || null;
      break;
    }
    case 'split': {
      const s = d as ShapeDataMap['split'];
      const total = has(f, 'total') ? num(f.total) : (state.total ?? null);
      if (total !== null || has(f, 'total')) s.total = total;
      const people = has(f, 'people') ? num(f.people) : (state.people ?? null);
      if (people !== null) s.people = Math.max(1, Math.min(99, Math.round(people)));
      if (has(f, 'currency')) s.currency = str(f.currency) as Currency;
      break;
    }
    case 'expense': {
      const x = d as ShapeDataMap['expense'];
      if (has(f, 'amount')) x.amount = num(f.amount);
      if (has(f, 'item')) x.item = str(f.item);
      if (has(f, 'currency')) x.currency = str(f.currency) as Currency;
      break;
    }
    case 'convert': {
      const c = d as ShapeDataMap['convert'];
      if (has(f, 'value')) c.value = num(f.value);
      if (has(f, 'from') && UNITS[str(f.from)]) c.from = str(f.from);
      const to = has(f, 'to') ? str(f.to) : state.to;
      if (to && UNITS[to]) c.to = to;
      c.result = c.value !== null && c.from && c.to ? convertValue(c.value, c.from, c.to) : null;
      break;
    }
    case 'calc': {
      const c = d as ShapeDataMap['calc'];
      if (has(f, 'expression')) {
        c.expression = str(f.expression);
        const r = evaluate(normalizeExpression(c.expression));
        c.result = r === null ? null : Math.round(r * 1e10) / 1e10;
      }
      break;
    }
    case 'travel': {
      const t = d as ShapeDataMap['travel'];
      if (has(f, 'destination')) t.destination = str(f.destination) || null;
      if (has(f, 'origin')) t.origin = str(f.origin) || null;
      if (has(f, 'start')) t.start = joinDate(f.start, undefined, t.start, false, ref).at;
      if (has(f, 'end')) t.end = joinDate(f.end, undefined, t.end, false, ref).at;
      if (has(f, 'mode'))
        t.mode = (['flight', 'train', 'bus', 'car'].includes(str(f.mode)) ? str(f.mode) : null) as
          | 'flight'
          | 'train'
          | 'bus'
          | 'car'
          | null;
      break;
    }
    case 'poll': {
      const p = d as ShapeDataMap['poll'];
      if (has(f, 'title')) p.title = str(f.title);
      if (has(f, 'options')) p.options = list(f.options);
      break;
    }
    case 'contact': {
      const c = d as ShapeDataMap['contact'];
      if (has(f, 'name')) c.name = str(f.name);
      if (has(f, 'phone')) c.phone = str(f.phone) || null;
      if (has(f, 'email')) c.email = str(f.email) || null;
      c.initials = initials(c.name);
      break;
    }
    case 'link': {
      const l = d as ShapeDataMap['link'];
      if (has(f, 'url')) {
        const raw = str(f.url).trim();
        l.url = raw ? (/^https?:\/\//i.test(raw) ? raw : `https://${raw}`) : null;
        try {
          l.domain = l.url ? new URL(l.url).hostname.replace(/^www\./, '') : null;
        } catch {
          l.domain = raw || null;
        }
      }
      if (has(f, 'note')) l.note = str(f.note);
      break;
    }
    case 'countdown': {
      const c = d as ShapeDataMap['countdown'];
      if (has(f, 'title')) c.title = str(f.title);
      if (has(f, 'date')) c.date = joinDate(f.date, undefined, c.date, false, ref).at;
      break;
    }
    case 'timezone': {
      const z = d as ShapeDataMap['timezone'];
      const zone = (k: string) =>
        k === 'local'
          ? localZone()
          : ZONES[k]
            ? { ...(ZONES[k] as { label: string; tz: string }) }
            : null;
      if (has(f, 'from')) z.from = zone(str(f.from)) ?? z.from;
      if (has(f, 'to')) z.to = str(f.to) ? zone(str(f.to)) : null;
      if (has(f, 'time')) {
        const m = /^(\d{1,2}):(\d{2})/.exec(str(f.time));
        if (m) {
          z.instant = instantIn(z.from.tz, Number(m[1]), Number(m[2]), ref);
          z.isNow = false;
        } else {
          z.instant = ref;
          z.isNow = true;
        }
      }
      break;
    }
    case 'random': {
      const r = d as RandomData;
      if (has(f, 'kind') && ['dice', 'coin', 'number', 'pick'].includes(str(f.kind)))
        r.kind = str(f.kind) as RandomData['kind'];
      const n = (k: string, lo: number, hi: number): number | null => {
        const v = num(f[k]);
        return v === null ? null : Math.max(lo, Math.min(hi, Math.round(v)));
      };
      r.count = n('count', 1, 20) ?? r.count;
      r.sides = n('sides', 2, 100) ?? r.sides;
      r.min = n('min', -1e9, 1e9) ?? r.min;
      r.max = n('max', -1e9, 1e9) ?? r.max;
      if (r.min > r.max) [r.min, r.max] = [r.max, r.min];
      if (has(f, 'options')) r.options = list(f.options);
      break;
    }
    case 'goal': {
      const g = d as ShapeDataMap['goal'];
      if (has(f, 'title')) g.title = str(f.title);
      if (has(f, 'target')) g.target = num(f.target);
      const cur = has(f, 'current') ? num(f.current) : (state.current ?? null);
      if (cur !== null) g.current = Math.max(0, cur);
      if (has(f, 'unit')) g.unit = str(f.unit) || null;
      break;
    }
    case 'note': {
      const n = d as ShapeDataMap['note'];
      if (has(f, 'text')) {
        n.body = str(f.text);
        const first = n.body.trim().split(/(?<=[.!?؟])\s+/)[0] ?? '';
        n.title = first.length > 80 ? `${first.slice(0, 79)}…` : first;
      }
      break;
    }
  }
  return d as ShapeDataMap[K];
}

/** The fields' values as a card shows them now: what the editor opens with. */
export function fieldValues<K extends ShapeIntent>(intent: K, data: ShapeDataMap[K]): Fields {
  const d = data as ShapeDataMap[ShapeIntent];
  switch (intent) {
    case 'event': {
      const e = d as ShapeDataMap['event'];
      return {
        title: e.title,
        date: ymd(e.date),
        time: hm(e.date, e.hasTime),
        place: e.link ?? e.location ?? '',
        people: e.people,
      };
    }
    case 'reminder': {
      const r = d as ShapeDataMap['reminder'];
      return { task: r.task, date: ymd(r.when), time: hm(r.when, r.hasTime) };
    }
    case 'todo':
      return { items: (d as ShapeDataMap['todo']).items };
    case 'timer': {
      const t = d as ShapeDataMap['timer'];
      return { label: t.label, duration: t.seconds ?? 0 };
    }
    case 'habit': {
      const h = d as ShapeDataMap['habit'];
      return { title: h.title, label: h.label ?? '', days: h.days };
    }
    case 'color': {
      const c = d as ShapeDataMap['color'];
      return { hex: c.hex ?? '#3b5bdb', name: c.name ?? '' };
    }
    case 'split': {
      const s = d as ShapeDataMap['split'];
      return { total: s.total ?? '', people: s.people ?? 2, currency: s.currency };
    }
    case 'expense': {
      const x = d as ShapeDataMap['expense'];
      return { amount: x.amount ?? '', item: x.item, currency: x.currency };
    }
    case 'convert': {
      const c = d as ShapeDataMap['convert'];
      return { value: c.value ?? '', from: c.from ?? 'km', to: c.to ?? 'mi' };
    }
    case 'calc':
      return { expression: (d as ShapeDataMap['calc']).expression };
    case 'travel': {
      const t = d as ShapeDataMap['travel'];
      return {
        destination: t.destination ?? '',
        origin: t.origin ?? '',
        start: ymd(t.start),
        end: ymd(t.end),
        mode: t.mode ?? '',
      };
    }
    case 'poll': {
      const p = d as ShapeDataMap['poll'];
      return { title: p.title, options: p.options };
    }
    case 'contact': {
      const c = d as ShapeDataMap['contact'];
      return { name: c.name, phone: c.phone ?? '', email: c.email ?? '' };
    }
    case 'link': {
      const l = d as ShapeDataMap['link'];
      return { url: l.url ?? '', note: l.note };
    }
    case 'countdown': {
      const c = d as ShapeDataMap['countdown'];
      return { title: c.title, date: ymd(c.date) };
    }
    case 'timezone': {
      const z = d as ShapeDataMap['timezone'];
      const key = (zone: { label: string; tz: string } | null): string => {
        if (!zone) return '';
        if (zone.label === 'Local') return 'local';
        const hit = ZONE_OPTIONS.find(([k]) => ZONES[k]?.tz === zone.tz);
        return hit?.[0] ?? '';
      };
      return {
        from: key(z.from),
        to: key(z.to),
        // The clock as it reads in the zone it is set in, not on this computer.
        time:
          z.isNow || !z.instant
            ? ''
            : new Intl.DateTimeFormat('en-GB', {
                timeZone: z.from.tz,
                hour: '2-digit',
                minute: '2-digit',
                hourCycle: 'h23',
              }).format(z.instant),
      };
    }
    case 'random': {
      const r = d as RandomData;
      return {
        kind: r.kind,
        count: r.count,
        sides: r.sides,
        min: r.min,
        max: r.max,
        options: r.options,
      };
    }
    case 'goal': {
      const g = d as ShapeDataMap['goal'];
      return { title: g.title, current: g.current, target: g.target ?? '', unit: g.unit ?? '' };
    }
    case 'note':
      return { text: (d as ShapeDataMap['note']).body };
  }
  return {};
}

const same = (a: FieldValue | undefined, b: FieldValue | undefined): boolean =>
  JSON.stringify(a ?? '') === JSON.stringify(b ?? '');

/**
 * The fields worth keeping from what an editor sent: only those that differ from what the text
 * alone says, so a field left alone keeps following the text.
 */
export function keepFields(
  intent: ShapeIntent,
  text: string,
  ref: Date,
  sent: Fields,
): Fields | undefined {
  const fromText = fieldValues(intent, parseShape(intent, text, ref));
  const out: Fields = {};
  for (const def of FIELDS[intent]) {
    if (!Object.hasOwn(sent, def.key)) continue;
    const v = sent[def.key] as FieldValue;
    if (!same(v, fromText[def.key])) out[def.key] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Fields from an untrusted source (an agent, a stored file): known keys and sane values only. */
export function readFields(intent: ShapeIntent, raw: unknown): Fields | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const from = raw as Record<string, unknown>;
  const out: Fields = {};
  for (const def of FIELDS[intent]) {
    const v = from[def.key];
    if (v === undefined || v === null) continue;
    if (def.type === 'list' && Array.isArray(v))
      out[def.key] = v.map((x) => String(x).slice(0, 200)).slice(0, 60);
    else if (def.type === 'days' && Array.isArray(v))
      out[def.key] = v.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
    else if ((def.type === 'number' || def.type === 'duration') && Number.isFinite(Number(v)))
      out[def.key] = Number(v);
    else if (typeof v === 'string') out[def.key] = v.slice(0, 2000);
    else if (typeof v === 'number') out[def.key] = v;
  }
  return Object.keys(out).length ? out : undefined;
}
