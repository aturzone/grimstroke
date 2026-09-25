/**
 * A shape card's face: the same markup in the bar while it is being typed, on a board once it is
 * placed, and in an export.
 *
 * What a card shows is computed from its text (parse.ts) and what has been done to it since
 * (`state`: items ticked, votes cast, a timer started, people added to a split). Dates are read
 * against the moment it was made, so "friday" stays the friday it meant; "today" and "in 3 days"
 * are worded against now, so a countdown counts down.
 *
 * Controls are plain buttons carrying `data-sc-act`; the board turns a press into a change of
 * `state`, which is a patch like any other -- an agent can make the same change.
 */

import { hslString, inkOn, rgbString } from './colors.ts';
import { INTENTS, iconSvg, type ShapeIntent } from './intents.ts';
import { describeRandom, formatClock, parseShape, type ShapeDataMap } from './parse.ts';
import { digitsFor, formatAmount, isPersian } from './text.ts';
import { convertValue, UNITS, unitOptions } from './units.ts';
import { daysBetween, formatWhen } from './when.ts';
import { formatIn, localZone, offsetBetween } from './zones.ts';

/** What has been done to a card since it was made. Every field is optional. */
export interface ShapeState {
  /** Checklist: ticked item indices. */
  done?: number[];
  /** Poll: votes per option. */
  votes?: number[];
  /** Split: people and total, as changed on the card. */
  people?: number;
  total?: number;
  /** Habit: the days of the week (0 = Sunday) it happens on, as changed on the card. */
  days?: number[];
  /** Habit: dates (YYYY-MM-DD) it was done. */
  log?: string[];
  /** Goal: progress so far. */
  current?: number;
  /** Timer: seconds run so far, and when it was last started (epoch ms) if it is running. */
  elapsed?: number;
  startedAt?: number | null;
  /** Convert: the unit chosen to convert to. */
  to?: string;
  /** Random: the last result. */
  result?: string;
  /** Reminder, todo, event: marked as done. */
  closed?: boolean;
}

export interface ShapeBlock {
  kind: 'shape';
  intent: ShapeIntent;
  text: string;
  /** When it was made (ISO): what relative dates in its text are read against. */
  made?: string;
  state?: ShapeState;
}

export interface FaceOptions {
  /** The moment "now" is, for today/tomorrow wording and countdowns. */
  now?: Date;
  /** Controls live (a placed card, a committed preview) or shown only (a ghost, an export). */
  interactive?: boolean;
  /** Draws a check mark on a live timer tick without redrawing: the app sets the clock text. */
  id?: string;
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function t(fa: boolean, en: string, faText: string): string {
  return fa ? faText : en;
}

function act(name: string, label: string, body: string, on: boolean, extra = ''): string {
  return (
    `<button type="button" class="sc-act${extra ? ` ${extra}` : ''}" data-sc-act="${esc(name)}" ` +
    `aria-label="${esc(label)}"${on ? '' : ' disabled'}>${body}</button>`
  );
}

function chip(icon: string, text: string): string {
  return `<span class="sc-chip">${icon}<span>${esc(text)}</span></span>`;
}

function missing(text: string): string {
  return `<span class="sc-missing">${esc(text)}</span>`;
}

const I = {
  calendar:
    '<svg class="sc-mini" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6 H20 V20 H4 Z M4 10.5 H20 M8 3.5 V7.5 M16 3.5 V7.5"/></svg>',
  clock:
    '<svg class="sc-mini" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5 A8.5 8.5 0 1 0 12 3.5 A8.5 8.5 0 1 0 12 20.5 M12 7.5 V12 L15 14"/></svg>',
  pin: '<svg class="sc-mini" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21 C12 21 5 14.5 5 9.5 A7 7 0 0 1 19 9.5 C19 14.5 12 21 12 21 Z M12 12 A2.5 2.5 0 1 0 12 7 A2.5 2.5 0 1 0 12 12"/></svg>',
  video:
    '<svg class="sc-mini" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 7 H15 V17 H3.5 Z M15 11 L20.5 7.5 V16.5 L15 13"/></svg>',
  phone:
    '<svg class="sc-mini" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4 H9 L10.5 8.5 L8 10 C9 12.5 11.5 15 14 16 L15.5 13.5 L20 15 V19 C20 19.5 19.5 20 19 20 C10.7 20 4 13.3 4 5 C4 4.5 4.5 4 5 4 Z"/></svg>',
  repeat:
    '<svg class="sc-mini" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 11 A7.5 7.5 0 0 1 17.5 7 M17.5 3.5 V7.5 H13.5 M19.5 13 A7.5 7.5 0 0 1 6.5 17 M6.5 20.5 V16.5 H10.5"/></svg>',
  alert:
    '<svg class="sc-mini" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 L21 19.5 H3 Z M12 9.5 V14 M12 17 H12.1"/></svg>',
  plus: '<svg class="sc-mini" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5 V19 M5 12 H19"/></svg>',
  minus: '<svg class="sc-mini" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12 H19"/></svg>',
  play: '<svg class="sc-mini" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5 L19 12 L7 19.5 Z"/></svg>',
  pause:
    '<svg class="sc-mini" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5 V19 M17 5 V19"/></svg>',
  reset:
    '<svg class="sc-mini" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12 A7.5 7.5 0 1 0 7 6.5 M4.5 4 V8.5 H9"/></svg>',
  dice: '<svg class="sc-mini" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5 H19 V19 H5 Z M9 9 H9.1 M15 15 H15.1 M12 12 H12.1"/></svg>',
  mail: '<svg class="sc-mini" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6 H20.5 V18 H3.5 Z M3.5 6 L12 13 L20.5 6"/></svg>',
  plane:
    '<svg class="sc-mini" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 12.5 L20.5 5.5 L16.5 20 L12 14.5 Z"/></svg>',
};

function when(d: Date | null, hasTime: boolean, now: Date, fa: boolean): string {
  if (!d) return missing(t(fa, 'add a date', 'تاریخ؟'));
  const w = formatWhen(d, hasTime, now, fa);
  return chip(I.calendar, w.day) + (w.time ? chip(I.clock, w.time) : '');
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------- each face

type Body<K extends ShapeIntent> = (
  d: ShapeDataMap[K],
  s: ShapeState,
  ctx: { fa: boolean; now: Date; live: boolean; text: string },
) => string;

const BODIES: { [K in ShapeIntent]: Body<K> } = {
  event: (d, _s, c) =>
    `<h3 class="sc-title">${d.title ? esc(d.title) : missing(t(c.fa, 'Untitled event', 'رویداد بی‌نام'))}</h3>` +
    `<div class="sc-row">${when(d.date, d.hasTime, c.now, c.fa)}</div>` +
    (d.link || d.location
      ? `<div class="sc-line">${d.link ? I.video : I.pin}<span>${esc(d.link ?? d.location ?? '')}</span></div>`
      : '') +
    (d.people.length
      ? `<div class="sc-line sc-people">${d.people
          .slice(0, 5)
          .map((p) => `<span class="sc-avatar">${esc(p.slice(0, 1).toUpperCase())}</span>`)
          .join('')}<span>${esc(d.people.join(c.fa ? '، ' : ', '))}</span></div>`
      : ''),

  reminder: (d, s, c) =>
    `<div class="sc-reminder${s.closed ? ' is-done' : ''}">` +
    act('close', t(c.fa, 'done', 'انجام شد'), '', c.live, `sc-check${s.closed ? ' is-on' : ''}`) +
    `<div><h3 class="sc-title">${d.task ? esc(d.task) : missing(t(c.fa, 'What to remember', 'چه چیزی یادت باشه'))}</h3>` +
    `<div class="sc-row">${when(d.when, d.hasTime, c.now, c.fa)}</div></div></div>`,

  todo: (d, s, c) => {
    const done = new Set(s.done ?? []);
    const items = d.items.length ? d.items : [];
    return (
      `<ul class="sc-list">${items
        .map(
          (item, i) =>
            `<li class="${done.has(i) ? 'is-done' : ''}">` +
            act(`todo:${i}`, `${item}`, '', c.live, `sc-check${done.has(i) ? ' is-on' : ''}`) +
            `<span>${esc(item)}</span></li>`,
        )
        .join('')}</ul>` +
      (items.length
        ? `<p class="sc-meta">${done.size}/${items.length} ${t(c.fa, 'done', 'انجام شد')}</p>`
        : missing(t(c.fa, 'Add items, separated by commas', 'موارد رو با ویرگول جدا کن')))
    );
  },

  timer: (d, s, c) => {
    const total = d.seconds ?? 0;
    const running = typeof s.startedAt === 'number';
    const ran =
      (s.elapsed ?? 0) + (running ? (c.now.getTime() - (s.startedAt as number)) / 1000 : 0);
    const stopwatch = !total;
    const left = stopwatch ? ran : Math.max(0, total - ran);
    const progress = stopwatch ? (ran % 60) / 60 : total ? Math.min(1, ran / total) : 0;
    const R = 52;
    const len = 2 * Math.PI * R;
    return (
      `<div class="sc-timer" data-sc-total="${total}" data-sc-elapsed="${s.elapsed ?? 0}"` +
      `${running ? ` data-sc-started="${s.startedAt}"` : ''}>` +
      `<svg class="sc-ring" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="${R}" class="sc-ring-track"/>` +
      `<circle cx="60" cy="60" r="${R}" class="sc-ring-bar" stroke-dasharray="${len.toFixed(1)}" ` +
      `stroke-dashoffset="${(len * progress).toFixed(1)}"/></svg>` +
      `<span class="sc-clock" role="timer">${formatClock(left)}</span></div>` +
      `<div class="sc-side"><h3 class="sc-title">${esc(d.label || (stopwatch ? t(c.fa, 'Stopwatch', 'کرنومتر') : t(c.fa, 'Timer', 'تایمر')))}</h3>` +
      `<div class="sc-row">` +
      act(
        'timer:toggle',
        running ? 'pause' : 'start',
        `${running ? I.pause : I.play}<span>${running ? t(c.fa, 'Pause', 'مکث') : ran > 0 ? t(c.fa, 'Resume', 'ادامه') : t(c.fa, 'Start', 'شروع')}</span>`,
        c.live,
        'sc-btn',
      ) +
      act('timer:reset', 'reset', I.reset, c.live && ran > 0, 'sc-btn sc-icon-btn') +
      `</div></div>`
    );
  },

  habit: (d, s, c) => {
    const days = new Set(s.days ?? d.days);
    const order = c.fa ? [6, 0, 1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 6, 0];
    const letters = c.fa
      ? ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش']
      : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const today = ymd(c.now);
    const doneToday = (s.log ?? []).includes(today);
    return (
      `<div class="sc-head-row"><h3 class="sc-title">${d.title ? esc(d.title) : missing(t(c.fa, 'Untitled habit', 'عادت بی‌نام'))}</h3>` +
      (d.label ? chip(I.repeat, d.label) : missing(t(c.fa, 'how often?', 'هر چند وقت؟'))) +
      `</div><div class="sc-week">${order
        .map((i) =>
          act(`day:${i}`, `${i}`, letters[i] ?? '', c.live, `sc-day${days.has(i) ? ' is-on' : ''}`),
        )
        .join('')}</div>` +
      `<div class="sc-row">${act('habit:log', 'done today', `<span>${doneToday ? t(c.fa, 'Done today', 'امروز انجام شد') : t(c.fa, 'Mark today', 'علامت امروز')}</span>`, c.live, `sc-btn${doneToday ? ' is-on' : ''}`)}` +
      `<span class="sc-meta">${(s.log ?? []).length} ${t(c.fa, 'times', 'بار')}</span></div>`
    );
  },

  color: (d, _s, c) =>
    d.hex
      ? `<div class="sc-swatch" style="background:${d.hex};color:${inkOn(d.hex)}"><span>${esc(d.name ?? d.hex.toUpperCase())}</span></div>` +
        `<dl class="sc-codes"><dt>HEX</dt><dd>${d.hex.toUpperCase()}</dd><dt>RGB</dt><dd>${rgbString(d.hex)}</dd><dt>HSL</dt><dd>${hslString(d.hex)}</dd></dl>`
      : missing(t(c.fa, 'A hex code, rgb(), or a colour name', 'کد رنگ یا نام رنگ')),

  split: (d, s, c) => {
    const people = s.people ?? d.people ?? 2;
    const total = s.total ?? d.total ?? 0;
    return (
      `<div class="sc-split"><div><p class="sc-meta">${t(c.fa, 'Total', 'مبلغ کل')}</p><p class="sc-num">${total ? formatAmount(total, d.currency) : '—'}</p>` +
      `<p class="sc-meta">${t(c.fa, 'People', 'نفرات')}</p><div class="sc-row">` +
      act('people:-', 'fewer', I.minus, c.live && people > 1, 'sc-btn sc-icon-btn') +
      `<span class="sc-count">${digitsFor(people, c.fa)}</span>` +
      act('people:+', 'more', I.plus, c.live && people < 99, 'sc-btn sc-icon-btn') +
      `</div></div><div class="sc-end"><p class="sc-meta">${t(c.fa, 'Each pays', 'سهم هر نفر')}</p>` +
      `<p class="sc-hero">${total ? formatAmount(total / people, d.currency) : '—'}</p></div></div>`
    );
  },

  expense: (d, _s, c) =>
    `<div class="sc-split"><h3 class="sc-title">${d.item ? esc(d.item) : missing(t(c.fa, 'on what?', 'برای چی؟'))}</h3>` +
    `<p class="sc-hero">${d.amount !== null ? formatAmount(d.amount, d.currency) : '—'}</p></div>`,

  convert: (d, s, c) => {
    if (d.value === null || !d.from)
      return missing(t(c.fa, 'Like “5 miles in km”', 'مثل «۵ مایل به کیلومتر»'));
    const to = s.to ?? d.to;
    const value = to ? convertValue(d.value, d.from, to) : null;
    const opts = unitOptions(d.from).filter((u) => u !== d.from);
    return (
      `<div class="sc-convert"><p class="sc-num">${d.value} <span>${UNITS[d.from]?.label ?? d.from}</span></p>` +
      `<span class="sc-eq">=</span><p class="sc-hero">${value !== null ? Number(value.toFixed(3)) : '…'} <span>${to ? (UNITS[to]?.label ?? to) : ''}</span></p></div>` +
      `<div class="sc-row sc-wrap">${opts
        .slice(0, 6)
        .map((u) =>
          act(
            `to:${u}`,
            UNITS[u]?.label ?? u,
            UNITS[u]?.label ?? u,
            c.live,
            `sc-pill${u === to ? ' is-on' : ''}`,
          ),
        )
        .join('')}</div>`
    );
  },

  calc: (d, _s, c) =>
    `<p class="sc-expr" dir="ltr">${esc(d.expression)}</p>` +
    `<p class="sc-hero" dir="ltr">${d.result !== null ? `= ${d.result.toLocaleString('en-US', { maximumFractionDigits: 6 })}` : missing(t(c.fa, 'not a sum yet', 'هنوز محاسبه‌پذیر نیست'))}</p>`,

  travel: (d, _s, c) =>
    `<h3 class="sc-title">${d.destination ? `${d.origin ? `${esc(d.origin)} → ` : ''}${esc(d.destination)}` : missing(t(c.fa, 'Where to?', 'مقصد؟'))}</h3>` +
    `<div class="sc-row">${d.start ? chip(I.calendar, formatWhen(d.start, false, c.now, c.fa).day + (d.end ? ` – ${formatWhen(d.end, false, c.now, c.fa).day}` : '')) : missing(t(c.fa, 'when?', 'کی؟'))}` +
    (d.mode
      ? chip(
          I.plane,
          {
            flight: t(c.fa, 'Flight', 'پرواز'),
            train: t(c.fa, 'Train', 'قطار'),
            bus: t(c.fa, 'Bus', 'اتوبوس'),
            car: t(c.fa, 'Road trip', 'جاده'),
          }[d.mode],
        )
      : '') +
    `</div>`,

  poll: (d, s, c) => {
    const options = d.options.length ? d.options : [];
    const votes = options.map((_, i) => s.votes?.[i] ?? 0);
    const all = votes.reduce((a, b) => a + b, 0);
    return (
      `<h3 class="sc-title">${d.title ? esc(d.title) : missing(t(c.fa, 'Ask the group', 'از جمع بپرس'))}</h3>` +
      `<ul class="sc-poll">${options
        .map((o, i) => {
          const pct = all ? Math.round(((votes[i] ?? 0) / all) * 100) : 0;
          return `<li>${act(
            `vote:${i}`,
            `vote ${o}`,
            `<span class="sc-poll-label"><span>${esc(o)}</span><span>${pct}%</span></span>` +
              `<span class="sc-bar"><span style="width:${pct}%"></span></span>`,
            c.live,
            'sc-vote',
          )}</li>`;
        })
        .join('')}</ul>` +
      (options.length
        ? `<p class="sc-meta">${all} ${t(c.fa, all === 1 ? 'vote' : 'votes', 'رای')}</p>`
        : missing(t(c.fa, 'Add options with “or”', 'گزینه‌ها رو با «یا» جدا کن')))
    );
  },

  contact: (d, _s, c) =>
    `<div class="sc-contact"><span class="sc-avatar sc-avatar-big">${esc(d.initials || '?')}</span><div>` +
    `<h3 class="sc-title">${d.name ? esc(d.name) : missing(t(c.fa, 'Name', 'نام'))}</h3>` +
    (d.phone
      ? `<p class="sc-line">${I.phone}<a href="tel:${esc(d.phone.replace(/\s/g, ''))}" dir="ltr">${esc(d.phone)}</a></p>`
      : '') +
    (d.email
      ? `<p class="sc-line">${I.mail}<a href="mailto:${esc(d.email)}" dir="ltr">${esc(d.email)}</a></p>`
      : '') +
    `</div></div>`,

  link: (d, _s, c) =>
    d.url
      ? `<a class="sc-link" href="${esc(d.url)}" target="_blank" rel="noopener"><span class="sc-avatar">${esc((d.domain ?? '?').slice(0, 1).toUpperCase())}</span>` +
        `<span><b>${esc(d.domain ?? d.url)}</b><small dir="ltr">${esc(d.url.replace(/^https?:\/\//, '').slice(0, 60))}</small></span></a>` +
        (d.note ? `<p class="sc-note">${esc(d.note)}</p>` : '')
      : missing(t(c.fa, 'Paste a link', 'یه لینک بذار')),

  countdown: (d, _s, c) => {
    if (!d.date)
      return `<h3 class="sc-title">${esc(d.title || '')}</h3>${missing(t(c.fa, 'until when?', 'تا کی؟'))}`;
    const days = daysBetween(c.now, d.date);
    return (
      `<div class="sc-split"><div><h3 class="sc-title">${esc(d.title || t(c.fa, 'Countdown', 'شمارش معکوس'))}</h3>` +
      `<p class="sc-meta">${formatWhen(d.date, false, c.now, c.fa).day}</p></div>` +
      `<div class="sc-end"><p class="sc-hero">${Math.abs(days)}</p><p class="sc-meta">${days === 0 ? t(c.fa, 'today', 'امروز') : days < 0 ? t(c.fa, 'days since', 'روز گذشته') : t(c.fa, days === 1 ? 'day to go' : 'days to go', 'روز مونده')}</p></div></div>`
    );
  },

  timezone: (d, _s, c) => {
    const at = d.isNow ? c.now : (d.instant ?? c.now);
    const from = d.from.label === 'Local' ? { ...d.from, tz: localZone().tz } : d.from;
    const rows = [from, ...(d.to ? [d.to] : [])];
    return (
      `<ul class="sc-zones">${rows
        .map(
          (z) =>
            `<li><span>${esc(z.label === 'Local' ? t(c.fa, 'Here', 'اینجا') : z.label)}</span><b dir="ltr">${formatIn(z.tz, at, c.fa)}</b></li>`,
        )
        .join('')}</ul>` +
      (d.to
        ? `<p class="sc-meta" dir="ltr">${offsetBetween(from.tz, d.to.tz, at)}</p>`
        : missing(t(c.fa, 'in which city?', 'کدوم شهر؟')))
    );
  },

  random: (d, s, c) =>
    `<div class="sc-split"><div><h3 class="sc-title">${esc(describeRandom(d, c.fa))}</h3>` +
    (d.kind === 'pick' ? `<p class="sc-meta">${esc(d.options.join(c.fa ? '، ' : ', '))}</p>` : '') +
    `<div class="sc-row">${act('roll', 'roll', `${I.dice}<span>${s.result ? t(c.fa, 'Again', 'دوباره') : t(c.fa, 'Roll', 'بنداز')}</span>`, c.live, 'sc-btn')}</div></div>` +
    `<p class="sc-hero sc-result">${s.result ? esc(s.result) : '?'}</p></div>`,

  goal: (d, s, c) => {
    if (!d.target)
      return `<h3 class="sc-title">${esc(d.title)}</h3>${missing(t(c.fa, 'Add a target, like “12 books, 4 done”', 'یه هدف بنویس، مثل «۱۲ کتاب، ۴ تا خوندم»'))}`;
    const cur = Math.min(d.target, s.current ?? d.current);
    const pct = Math.round((cur / d.target) * 100);
    return (
      `<div class="sc-split"><div><h3 class="sc-title">${esc(d.title)}</h3><p class="sc-meta">${cur} ${t(c.fa, 'of', 'از')} ${d.target}${d.unit ? ` ${esc(d.unit)}` : ''}</p></div>` +
      `<p class="sc-hero">${pct}%</p></div><div class="sc-bar sc-bar-big"><span style="width:${pct}%"></span></div>` +
      `<div class="sc-row">${act('goal:-', 'less', I.minus, c.live && cur > 0, 'sc-btn sc-icon-btn')}${act('goal:+', 'more', I.plus, c.live && cur < d.target, 'sc-btn sc-icon-btn')}` +
      (cur >= d.target ? `<span class="sc-meta sc-good">${t(c.fa, 'Done', 'تمام')}</span>` : '') +
      `</div>`
    );
  },

  note: (d) => `<p class="sc-note">${esc(d.body)}</p>`,
};

function headerLabel(intent: ShapeIntent, d: unknown, fa: boolean): string {
  const def = INTENTS[intent];
  if (intent === 'todo' && (d as ShapeDataMap['todo']).shopping) return fa ? 'خرید' : 'Shopping';
  return fa ? def.fa : def.label;
}

/** The whole card. */
export function renderShape(block: ShapeBlock, options: FaceOptions = {}): string {
  const written = block.made ? new Date(block.made) : undefined;
  // Without a clock, a card speaks as of when it was made: the same drawing every time.
  const now = options.now ?? written ?? new Date(0);
  const made = written ?? now;
  const fa = isPersian(block.text);
  const data = parseShape(block.intent, block.text, Number.isNaN(made.getTime()) ? now : made);
  const s = block.state ?? {};
  const body = (BODIES[block.intent] as Body<ShapeIntent>)(data, s, {
    fa,
    now,
    live: options.interactive ?? true,
    text: block.text,
  });
  const urgent = /\b(urgent|asap|important)\b|فوری|مهم/i.test(block.text);
  return (
    `<article class="sc sc-is-${block.intent}${s.closed ? ' is-closed' : ''}" dir="${fa ? 'rtl' : 'ltr'}" data-sc="${block.intent}">` +
    `<header class="sc-head"><span class="sc-tile">${iconSvg(block.intent)}</span>` +
    `<span class="sc-label">${esc(headerLabel(block.intent, data, fa))}</span>` +
    (urgent ? `<span class="sc-badge sc-caution">${I.alert}${fa ? 'فوری' : 'Urgent'}</span>` : '') +
    `</header><div class="sc-body">${body}</div></article>`
  );
}

/** One line for search, the saved list and an agent: "Dinner · Fri 26 Sep, 8 PM". */
export function summarize(block: ShapeBlock, at?: Date): string {
  const now = at ?? (block.made ? new Date(block.made) : new Date(0));
  const made = block.made ? new Date(block.made) : now;
  const fa = isPersian(block.text);
  const st = block.state ?? {};
  const whenOf = (d: Date | null, hasTime: boolean): string => {
    if (!d) return '';
    const w = formatWhen(d, hasTime, now, fa);
    return [w.day, w.time].filter(Boolean).join(fa ? '، ' : ', ');
  };
  const join = (...parts: Array<string | null | undefined | false>): string =>
    parts.filter(Boolean).join(' · ');
  const label = fa ? INTENTS[block.intent].fa : INTENTS[block.intent].label;
  switch (block.intent) {
    case 'event': {
      const d = parseShape('event', block.text, made);
      return join(
        d.title || label,
        whenOf(d.date, d.hasTime),
        d.link ?? d.location,
        d.people.join(', '),
      );
    }
    case 'reminder': {
      const d = parseShape('reminder', block.text, made);
      return join(
        d.task || label,
        whenOf(d.when, d.hasTime),
        st.closed && (fa ? 'انجام شد' : 'done'),
      );
    }
    case 'todo': {
      const d = parseShape('todo', block.text, made);
      return join(`${(st.done ?? []).length}/${d.items.length}`, d.items.slice(0, 5).join(', '));
    }
    case 'timer': {
      const d = parseShape('timer', block.text, made);
      return join(
        d.label || label,
        d.seconds ? formatClock(d.seconds) : fa ? 'کرنومتر' : 'stopwatch',
      );
    }
    case 'habit': {
      const d = parseShape('habit', block.text, made);
      return join(d.title || label, d.label, `${(st.log ?? []).length}×`);
    }
    case 'color': {
      const d = parseShape('color', block.text, made);
      return d.hex ? join(d.name, d.hex.toUpperCase()) : block.text;
    }
    case 'split': {
      const d = parseShape('split', block.text, made);
      const total = st.total ?? d.total;
      const people = st.people ?? d.people ?? 2;
      return total
        ? `${formatAmount(total, d.currency)} ÷ ${people} = ${formatAmount(total / people, d.currency)}`
        : label;
    }
    case 'expense': {
      const d = parseShape('expense', block.text, made);
      return join(d.amount !== null && formatAmount(d.amount, d.currency), d.item) || label;
    }
    case 'convert': {
      const d = parseShape('convert', block.text, made);
      const to = st.to ?? d.to;
      const r = d.value !== null && d.from && to ? convertValue(d.value, d.from, to) : null;
      return r !== null && d.from && to
        ? `${d.value} ${UNITS[d.from]?.label ?? d.from} = ${Number(r.toFixed(3))} ${UNITS[to]?.label ?? to}`
        : block.text;
    }
    case 'calc': {
      const d = parseShape('calc', block.text, made);
      return d.result !== null ? `${d.expression} = ${d.result}` : block.text;
    }
    case 'travel': {
      const d = parseShape('travel', block.text, made);
      return join(
        d.destination ? `${d.origin ? `${d.origin} → ` : ''}${d.destination}` : label,
        whenOf(d.start, false),
        d.mode &&
          (fa ? { flight: 'پرواز', train: 'قطار', bus: 'اتوبوس', car: 'جاده' }[d.mode] : d.mode),
      );
    }
    case 'poll': {
      const d = parseShape('poll', block.text, made);
      const votes = d.options.map((o, i) => `${o} ${st.votes?.[i] ?? 0}`);
      return join(d.title, votes.join(' / '));
    }
    case 'contact': {
      const d = parseShape('contact', block.text, made);
      return join(d.name || label, d.phone, d.email);
    }
    case 'link': {
      const d = parseShape('link', block.text, made);
      return join(d.domain ?? d.url, d.note);
    }
    case 'countdown': {
      const d = parseShape('countdown', block.text, made);
      if (!d.date) return block.text;
      const days = daysBetween(now, d.date);
      return fa ? `${d.title}: ${days} روز` : `${d.title}: ${days} ${days === 1 ? 'day' : 'days'}`;
    }
    case 'timezone': {
      const d = parseShape('timezone', block.text, made);
      const at = d.isNow ? now : (d.instant ?? now);
      const from = d.from.label === 'Local' ? localZone() : d.from;
      return join(
        `${formatIn(from.tz, at, fa)} ${from.label}`,
        d.to && `${formatIn(d.to.tz, at, fa)} ${d.to.label}`,
      );
    }
    case 'random': {
      const d = parseShape('random', block.text, made);
      return join(describeRandom(d, fa), st.result);
    }
    case 'goal': {
      const d = parseShape('goal', block.text, made);
      return d.target
        ? join(d.title, `${st.current ?? d.current}/${d.target}${d.unit ? ` ${d.unit}` : ''}`)
        : d.title;
    }
    case 'note':
      return parseShape('note', block.text, made).title;
  }
}
