/**
 * The day page: one column of what today holds, made to be opened first thing on a phone.
 *
 * It greets, says the date, and then only what matters now, in the order a morning asks it --
 * what is running, what is on and when, what to do today, what slipped, which lists are open,
 * what is coming. Every row says where it lives and goes there; the few things that can be done
 * in a tap (tick a list, mark done, keep a habit) are done here, on the card itself.
 */

import { icon } from '~/draw/chrome/icons.ts';
import { helpDialog, searchDialog, topBar } from '~/draw/chrome/top.ts';
import { renderHead } from '~/draw/doc/head.ts';
import type { RenderedPage } from '~/draw/doc/model.ts';
import { surface } from '~/draw/doc/surface.ts';
import { type CalendarDay, dayKey, type TodayData, type TodayEntry } from '~/draw/today/gather.ts';
import { escapeHtml } from '~/draw/type/text.ts';

const esc = escapeHtml;

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' });
}

function weekday(iso: string): string {
  return new Date(iso).toLocaleDateString('en', { weekday: 'short', day: 'numeric' });
}

function where(e: TodayEntry): string {
  return `<a class="td-where" href="${esc(e.where.href)}">${esc(e.where.title)}</a>`;
}

function act(
  e: TodayEntry,
  name: 'tick' | 'done' | 'habit',
  pressed: boolean,
  label: string,
  index?: number,
): string {
  return (
    `<button type="button" class="td-check" data-td-act="${name}" data-address="${esc(e.address)}" ` +
    `data-id="${esc(e.id)}"${index === undefined ? '' : ` data-index="${index}"`} aria-pressed="${pressed}" ` +
    `aria-label="${esc(label)}">${icon('check')}</button>`
  );
}

function row(lead: string, body: string, end = '', done = false): string {
  return `<li class="td-row${done ? ' is-done' : ''}"><span class="td-lead">${lead}</span><span class="td-body">${body}</span>${end}</li>`;
}

function section(title: string, rows: string[], cls = ''): string {
  if (!rows.length) return '';
  return `<section class="td-card gs-card ${cls}" aria-label="${esc(title)}"><h2 class="td-head">${esc(title)}</h2><ul class="td-list">${rows.join('')}</ul></section>`;
}

export interface CalendarView {
  /** The real today, to mark and to tell the chosen day from. */
  today: Date;
  days: CalendarDay[];
  year: number;
  month: number;
}

const WEEK = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function jalali(d: Date, opts: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat('en-u-ca-persian', opts).format(d).replace(/\s*AP$/, '');
  } catch {
    return '';
  }
}

/** The month, a week to a row from Saturday; each day says how full it was and goes to it. */
function renderCalendar(view: CalendarView, chosen: string): string {
  const first = new Date(view.year, view.month, 1);
  const prev = dayKey(new Date(view.year, view.month - 1, 1));
  const next = dayKey(new Date(view.year, view.month + 1, 1));
  const today = dayKey(view.today);
  const title = first.toLocaleDateString('en', { month: 'long', year: 'numeric' });
  const persian = jalali(new Date(view.year, view.month, 15), { month: 'long', year: 'numeric' });
  const cells = view.days
    .map((d) => {
      const [y, m, n] = d.date.split('-').map(Number) as [number, number, number];
      const date = new Date(y, m - 1, n, 12);
      const all = d.things + d.habits;
      const done = d.done + d.kept;
      const state = all === 0 ? '' : done >= all ? ' is-full' : done > 0 ? ' is-some' : ' is-open';
      const label = `${date.toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })}${all ? `, ${done} of ${all} done` : ''}`;
      return (
        `<a class="td-day${m - 1 !== view.month ? ' is-out' : ''}${d.date === today ? ' is-today' : ''}${d.date === chosen ? ' is-chosen' : ''}${state}" ` +
        `href="/today?date=${d.date}" aria-label="${esc(label)}"${d.date === chosen ? ' aria-current="date"' : ''}>` +
        `<b>${n}</b><small>${esc(jalali(date, { day: 'numeric' }))}</small>` +
        (all
          ? `<i class="td-dots" aria-hidden="true">${all > 3 ? '•••' : '•'.repeat(all)}</i>`
          : '') +
        '</a>'
      );
    })
    .join('');
  return (
    '<section class="td-card gs-card td-cal" aria-label="calendar">' +
    `<header class="td-cal-head"><a class="gs-btn gs-btn-icon" href="/today?date=${prev}" aria-label="the month before">${icon('prev')}</a>` +
    `<span class="td-cal-title"><b>${esc(title)}</b><small>${esc(persian)}</small></span>` +
    `<a class="gs-btn gs-btn-icon" href="/today?date=${next}" aria-label="the month after">${icon('next')}</a></header>` +
    `<div class="td-week" aria-hidden="true">${WEEK.map((w) => `<span>${w}</span>`).join('')}</div>` +
    `<div class="td-grid">${cells}</div>` +
    (chosen !== today
      ? '<p class="td-back"><a class="gs-btn gs-chip-btn" href="/today">back to today</a></p>'
      : '') +
    '</section>'
  );
}

/** What goes inside the page: re-drawn by the server after each tap, and nothing else. */
export function renderTodayMain(data: TodayData, now: Date, view?: CalendarView): string {
  const isToday = !view || dayKey(view.today) === data.date;
  let greet: string | undefined;
  if (view && !isToday) {
    const noon = (d: Date): number =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTime();
    const days = Math.round((noon(now) - noon(view.today)) / 86_400_000);
    greet =
      days === 1
        ? 'Tomorrow'
        : days === -1
          ? 'Yesterday'
          : days > 0
            ? `In ${days} days`
            : `${-days} days ago`;
  }
  return (view ? renderCalendar(view, data.date) : '') + renderDay(data, now, isToday, greet);
}

function renderDay(data: TodayData, now: Date, isToday: boolean, greet?: string): string {
  const hour = now.getHours();
  const hello =
    hour < 5
      ? 'Up late'
      : hour < 12
        ? 'Good morning'
        : hour < 18
          ? 'Good afternoon'
          : 'Good evening';
  const date = now.toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' });

  const running = data.now.map((e) =>
    row(
      icon('shape'),
      `<b class="td-title" dir="auto">${esc(e.title)}</b>${e.endsAt ? `<span class="td-meta">until ${esc(time(new Date(e.endsAt).toISOString()))}</span>` : '<span class="td-meta">running</span>'}${where(e)}`,
    ),
  );
  const today = data.today.map((e) =>
    row(
      `<span class="td-time">${e.kind === 'countdown' ? 'today' : e.hasTime && e.when ? esc(time(e.when)) : 'all day'}</span>`,
      `<b class="td-title" dir="auto">${esc(e.title)}</b>${where(e)}`,
      e.kind === 'countdown'
        ? ''
        : act(e, 'done', e.done, `${e.done ? 'not done' : 'done'}: ${e.title}`),
      e.done,
    ),
  );
  const habits = data.habits.map((e) =>
    row(
      act(e, 'habit', e.done, `${e.done ? 'not done today' : 'done today'}: ${e.title}`),
      `<b class="td-title" dir="auto">${esc(e.title)}</b>${where(e)}`,
      '',
      e.done,
    ),
  );
  const overdue = data.overdue.map((e) =>
    row(
      `<span class="td-time">${e.when ? esc(weekday(e.when)) : ''}</span>`,
      `<b class="td-title" dir="auto">${esc(e.title)}</b>${where(e)}`,
      act(e, 'done', false, `done: ${e.title}`),
    ),
  );
  const lists = data.lists.map((e) => {
    const open = (e.items ?? []).map((it, i) => ({ ...it, i })).filter((it) => !it.done);
    const shown = open.slice(0, 3);
    const left = (e.items ?? []).length - open.length;
    return (
      `<li class="td-row td-listrow"><span class="td-body"><b class="td-title" dir="auto">${esc(e.title)}</b>` +
      `<span class="td-meta">${left} of ${(e.items ?? []).length} done</span>${where(e)}` +
      `<ul class="td-items">${shown
        .map(
          (it) =>
            `<li class="td-item">${act(e, 'tick', false, `tick: ${it.text}`, it.i)}<span dir="auto">${esc(it.text)}</span></li>`,
        )
        .join(
          '',
        )}${open.length > shown.length ? `<li class="td-more">and ${open.length - shown.length} more</li>` : ''}</ul></span></li>`
    );
  });
  const soon = data.soon.map((e) =>
    row(
      `<span class="td-time">${e.when ? esc(weekday(e.when)) : ''}${e.hasTime && e.when ? `<small>${esc(time(e.when))}</small>` : ''}</span>`,
      `<b class="td-title" dir="auto">${esc(e.title)}</b>${where(e)}`,
    ),
  );

  // Yesterday, as a record: kept or not, nothing to do about it here but know.
  const record = data.yesterday.map((e) =>
    row(
      `<span class="td-mark${e.done ? ' is-kept' : ''}" aria-label="${e.done ? 'kept' : 'not kept'}">${e.done ? icon('check') : '–'}</span>`,
      `<b class="td-title" dir="auto">${esc(e.title)}</b>${e.kind !== 'habit' && e.hasTime && e.when ? `<span class="td-meta">${esc(time(e.when))}</span>` : ''}${where(e)}`,
      '',
      false,
    ),
  );
  const kept = data.yesterday.filter((e) => e.done).length;
  const nothing =
    !running.length &&
    !today.length &&
    !habits.length &&
    !overdue.length &&
    !lists.length &&
    !soon.length;
  return (
    `<header class="td-hello"><p class="td-greet">${esc(greet ?? hello)}</p><h1 class="td-date">${esc(date)}</h1>` +
    // Shown by app/remind.ts only while the browser has not been asked yet.
    '<button type="button" class="gs-btn gs-chip-btn td-remind" data-gs="remind-on" hidden>remind me on this computer</button></header>' +
    // Another day shows what belongs to that day; what is running, what slipped and the open
    // lists are today's business.
    (isToday ? section('now', running, 'td-now') : '') +
    section(isToday ? 'today' : 'that day', today) +
    section('every day', habits) +
    (isToday ? section('slipped past', overdue, 'td-overdue') : '') +
    (isToday ? section('open lists', lists) : '') +
    section(isToday ? 'this week' : 'the week after', soon) +
    (isToday && record.length
      ? `<details class="td-card gs-card td-yesterday"><summary class="td-head">yesterday · ${kept} of ${record.length} kept</summary><ul class="td-list">${record.join('')}</ul></details>`
      : '') +
    (nothing
      ? '<section class="td-card gs-card td-empty"><h2 class="td-head">a clear day</h2>' +
        '<p>Nothing is planned yet. On the board, press / and write what is coming -- ' +
        '“dinner friday 8pm”, “gym mon wed fri”, “call the bank tomorrow 10am”, a list -- ' +
        'and it gathers here, every morning.</p></section>'
      : '') +
    '<p class="td-add"><a class="gs-btn gs-btn-primary" href="/?type" data-gs="today-type">' +
    `${icon('shape')}<span class="gs-btn-text">type something for the day</span></a></p>`
  );
}

export interface TodayPageOptions {
  live?: { scripts?: string[] } | undefined;
  /** The workspace's theme palette. */
  palette?: string | undefined;
}

export function renderTodayPage(
  main: string,
  date: string,
  options: TodayPageOptions = {},
): RenderedPage {
  const ctx = surface('today', { palette: options.palette ?? 'studio' });
  const head = renderHead(ctx, 'ltr', { paper: 'blank', grain: 0.7 });
  const html = [
    '<!doctype html>',
    '<html lang="en" dir="ltr" data-script="latin">',
    head,
    '<body class="is-live on-today">',
    topBar({ place: 'today', title: 'calendar', saved: false }),
    `<main class="td-page" data-gs="today" data-date="${esc(date)}">${main}</main>`,
    searchDialog(),
    helpDialog(),
    ...(options.live?.scripts ?? []).map(
      (src) => `<script type="module" src="${escapeHtml(src)}"></script>`,
    ),
    '</body>',
    '</html>',
  ].join('\n');
  return {
    id: 'today',
    html: `${html}\n`,
    assets: ctx.assets,
    width: 560,
    selector: '.td-page',
    warnings: ctx.warnings,
  };
}
