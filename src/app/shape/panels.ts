/**
 * What the / box shows when asked for a place: the calendar, the notebooks, the settings -- in
 * the box itself, so everything is one keystroke away and nothing needs another page. Each is
 * read from the core's own data API, built with textContent (a title is somebody's words), and
 * offers the face's whole page where there is a face to have one.
 */

import { play } from '~/app/feel.ts';
import { remindHere } from '~/app/remind.ts';
import { toast } from '~/app/toast.ts';
import type { Lang } from '~/draw/shape/text.ts';

type Words = Record<Lang, string>;
const say = (w: Words, lang: Lang): string => w[lang];

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** A link to the face's own page for this, when the page is one of the face's (it has places). */
function whole(href: string, words: Words, lang: Lang): HTMLElement | undefined {
  if (!document.querySelector('.gs-places, [data-gs="place-board"]')) return undefined;
  const a = el('a', 'ss-panel-more', say(words, lang));
  a.href = href;
  return a;
}

async function json<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as T;
}

// ---------------------------------------------------------------- the calendar

interface Day {
  date: string;
  things: number;
  done: number;
  habits: number;
  kept: number;
}

interface Entry {
  title: string;
  when?: string;
  hasTime?: boolean;
  done: boolean;
  kind: string;
  where: { title: string; href: string };
}

const WEEK: Record<Lang, string[]> = {
  en: ['Sa', 'Su', 'Mo', 'Tu', 'We', 'Th', 'Fr'],
  fa: ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'],
  ru: ['Сб', 'Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт'],
};
const LOCALE: Record<Lang, string> = { en: 'en-GB', fa: 'fa-IR', ru: 'ru-RU' };

export async function calendarPanel(lang: Lang, at = new Date()): Promise<HTMLElement> {
  const year = at.getFullYear();
  const month = at.getMonth() + 1;
  const data = await json<{ today: string; days: Day[] }>(
    `/api/calendar?year=${year}&month=${month}`,
  );
  const box = el('div', 'ss-panel ss-cal');
  const head = el('div', 'ss-cal-head');
  const prev = el('button', 'ss-cal-step', '‹');
  const next = el('button', 'ss-cal-step', '›');
  prev.type = next.type = 'button';
  prev.setAttribute(
    'aria-label',
    say({ en: 'the month before', fa: 'ماه قبل', ru: 'предыдущий месяц' }, lang),
  );
  next.setAttribute(
    'aria-label',
    say({ en: 'the month after', fa: 'ماه بعد', ru: 'следующий месяц' }, lang),
  );
  // In Persian the days are the Jalali calendar's, and the month named is the ones the grid holds.
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const jalali = (d: Date, o: Intl.DateTimeFormatOptions): string =>
    new Intl.DateTimeFormat('fa-IR', o).format(d);
  const name = el(
    'b',
    '',
    lang === 'fa'
      ? `${jalali(first, { month: 'long' })} – ${jalali(last, { month: 'long' })} ${jalali(last, { year: 'numeric' })}`
      : new Intl.DateTimeFormat(LOCALE[lang], { month: 'long', year: 'numeric' }).format(at),
  );
  head.append(prev, name, next);
  const grid = el('div', 'ss-cal-grid');
  for (const d of WEEK[lang]) grid.append(el('span', 'ss-cal-wd', d));
  const detail = el('div', 'ss-cal-day');
  const swap = async (to: Date): Promise<void> => {
    box.replaceWith(await calendarPanel(lang, to));
    play('tap', 0.6);
  };
  prev.addEventListener('click', () => void swap(new Date(year, month - 2, 1)));
  next.addEventListener('click', () => void swap(new Date(year, month, 1)));
  for (const day of data.days) {
    const [y, m, dd] = day.date.split('-').map(Number) as [number, number, number];
    const cell = el('button', 'ss-cal-cell');
    cell.type = 'button';
    cell.textContent =
      lang === 'fa'
        ? jalali(new Date(y, m - 1, dd), { day: 'numeric' })
        : new Intl.NumberFormat(LOCALE[lang]).format(dd);
    if (m !== month) cell.classList.add('is-out');
    if (day.date === data.today) cell.classList.add('is-today');
    const busy = day.things + day.habits;
    if (busy) {
      const dots = el('i', 'ss-cal-dots');
      dots.dataset.n = String(Math.min(3, busy));
      if (day.things && day.done >= day.things && day.kept >= day.habits)
        dots.classList.add('is-done');
      cell.append(dots);
    }
    cell.addEventListener('click', () => {
      for (const c of grid.querySelectorAll('.is-on')) c.classList.remove('is-on');
      cell.classList.add('is-on');
      void showDay(detail, day.date, lang);
    });
    grid.append(cell);
  }
  box.append(head, grid, detail);
  void showDay(detail, data.today, lang);
  return box;
}

async function showDay(into: HTMLElement, date: string, lang: Lang): Promise<void> {
  const day = await json<{ today: Entry[]; habits: Entry[]; now: Entry[] }>(
    `/api/today?date=${date}`,
  ).catch(() => undefined);
  into.replaceChildren();
  const when = new Date(`${date}T12:00:00`);
  into.append(
    el(
      'p',
      'ss-panel-head',
      new Intl.DateTimeFormat(LOCALE[lang], {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(when),
    ),
  );
  const rows = [...(day?.now ?? []), ...(day?.today ?? []), ...(day?.habits ?? [])];
  const list = el('ul', 'ss-panel-list');
  for (const e of rows) {
    const a = el('a', `ss-panel-row${e.done ? ' is-done' : ''}`);
    a.href = e.where.href;
    a.dir = 'auto';
    const time =
      e.when && e.hasTime
        ? new Intl.DateTimeFormat(LOCALE[lang], { hour: '2-digit', minute: '2-digit' }).format(
            new Date(e.when),
          )
        : e.kind === 'habit'
          ? '↻'
          : '·';
    a.append(el('b', '', time), el('span', '', e.title));
    const li = el('li');
    li.append(a);
    list.append(li);
  }
  if (!rows.length)
    list.append(
      el(
        'li',
        'ss-panel-none',
        say({ en: 'a clear day', fa: 'روزی خالی', ru: 'свободный день' }, lang),
      ),
    );
  into.append(list);
  const more = whole(
    `/today?date=${date}`,
    { en: 'open the day', fa: 'باز کردن روز', ru: 'открыть день' },
    lang,
  );
  if (more) into.append(more);
}

// ---------------------------------------------------------------- the notebooks

export async function notebooksPanel(lang: Lang): Promise<HTMLElement> {
  const { books } = await json<{
    books: Array<{ id: string; title: string; pages: number; archived?: boolean }>;
  }>('/api/books');
  const box = el('div', 'ss-panel');
  const using = books.filter((b) => !b.archived);
  box.append(
    el(
      'p',
      'ss-panel-head',
      `${say({ en: 'notebooks', fa: 'دفترها', ru: 'блокноты' }, lang)} · ${using.length}`,
    ),
  );
  const list = el('ul', 'ss-panel-list');
  for (const b of using) {
    const a = el('a', 'ss-panel-row');
    a.href = `/book?id=${encodeURIComponent(b.id)}`;
    a.dir = 'auto';
    a.append(el('b', '', String(b.pages)), el('span', '', b.title));
    const li = el('li');
    li.append(a);
    list.append(li);
  }
  if (!using.length)
    list.append(
      el(
        'li',
        'ss-panel-none',
        say(
          {
            en: 'none yet -- type “new notebook” and a name',
            fa: 'هنوز نیست -- بنویسید «دفتر جدید» و یک نام',
            ru: 'пока нет -- напишите «новый блокнот» и название',
          },
          lang,
        ),
      ),
    );
  box.append(list);
  const more = whole(
    '/shelf',
    { en: 'open the bookcase', fa: 'باز کردن قفسه', ru: 'открыть полку' },
    lang,
  );
  if (more) box.append(more);
  return box;
}

// ---------------------------------------------------------------- the settings

export async function settingsPanel(lang: Lang): Promise<HTMLElement> {
  const look = await json<{ look?: { theme?: string; feel?: { sound?: boolean } } }>('/api/look')
    .then((r) => r.look ?? {})
    .catch(() => ({}) as { theme?: string; feel?: { sound?: boolean } });
  const box = el('div', 'ss-panel');
  box.append(
    el('p', 'ss-panel-head', say({ en: 'settings', fa: 'تنظیمات', ru: 'настройки' }, lang)),
  );
  const row = (label: string, controls: HTMLElement[]): HTMLElement => {
    const r = el('div', 'ss-set');
    r.append(el('span', '', label), ...controls);
    return r;
  };
  const chip = (text: string, on: boolean, run: () => Promise<void>): HTMLButtonElement => {
    const b = el('button', `ss-chip${on ? ' is-on' : ''}`, text);
    b.type = 'button';
    b.setAttribute('aria-pressed', String(on));
    b.addEventListener('click', () => void run());
    return b;
  };
  const save = async (patch: Record<string, unknown>, reload: boolean): Promise<void> => {
    const res = await fetch('/api/look', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast('that did not save', 'error');
      return;
    }
    if (reload) location.reload();
    else box.replaceWith(await settingsPanel(lang));
  };
  const dark = look.theme === 'dark';
  box.append(
    row(say({ en: 'Look', fa: 'ظاهر', ru: 'Тема' }, lang), [
      chip(say({ en: 'Light', fa: 'روشن', ru: 'Светлая' }, lang), !dark, () =>
        save({ theme: 'light' }, true),
      ),
      chip(say({ en: 'Dark', fa: 'تیره', ru: 'Тёмная' }, lang), dark, () =>
        save({ theme: 'dark' }, true),
      ),
    ]),
  );
  const sound = look.feel?.sound !== false;
  box.append(
    row(say({ en: 'Sounds', fa: 'صداها', ru: 'Звуки' }, lang), [
      chip(say({ en: 'On', fa: 'روشن', ru: 'Вкл' }, lang), sound, () =>
        save({ feel: { sound: true } }, false),
      ),
      chip(say({ en: 'Off', fa: 'خاموش', ru: 'Выкл' }, lang), !sound, () =>
        save({ feel: { sound: false } }, false),
      ),
    ]),
  );
  box.append(
    row(say({ en: 'Reminders', fa: 'یادآوری‌ها', ru: 'Напоминания' }, lang), [
      chip(
        say({ en: 'On this device', fa: 'روی این دستگاه', ru: 'На этом устройстве' }, lang),
        false,
        async () => {
          toast(
            (await remindHere())
              ? say(
                  {
                    en: 'this device will be reminded',
                    fa: 'این دستگاه یادآوری می‌گیرد',
                    ru: 'это устройство будет получать напоминания',
                  },
                  lang,
                )
              : say(
                  {
                    en: 'the browser did not allow it',
                    fa: 'مرورگر اجازه نداد',
                    ru: 'браузер не разрешил',
                  },
                  lang,
                ),
            'info',
          );
        },
      ),
    ]),
  );
  const more = whole(
    '/settings',
    { en: 'all the settings', fa: 'همه‌ی تنظیمات', ru: 'все настройки' },
    lang,
  );
  if (more) box.append(more);
  return box;
}
