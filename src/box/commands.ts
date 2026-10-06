/**
 * What the / box can do besides make a card: go somewhere, or change something.
 *
 * The box is the one way in. "settings", "تقویم", "тёмная тема", "new notebook travel" are not
 * cards; they are asked for by name, in any of the three languages, and done. A command takes
 * over the box only when the line says it outright -- the line starts with what the command is
 * called -- so "dinner on the calendar friday" is still an event; a weaker likeness is only
 * offered as a chip beside the card.
 */

import { norm } from '@core/box/text.ts';

export type CommandId =
  | 'go-board'
  | 'go-slash'
  | 'go-calendar'
  | 'go-shelf'
  | 'go-settings'
  | 'theme-light'
  | 'theme-dark'
  | 'new-notebook'
  | 'search'
  | 'connect'
  | 'remind-device'
  | 'backup'
  | 'sign-out'
  | 'issue-list'
  | 'issue-close'
  | 'issue-reopen'
  | 'issue-comment';

export interface Command {
  id: CommandId;
  label: string;
  fa: string;
  ru: string;
  /** An icon of the chrome's set (draw/chrome/icons.ts). */
  icon: string;
  /** The phrases it is called by, in all three languages, lowercase. The first is shown. */
  names: string[];
  /** Whether what follows the name is its argument: the new notebook's title. */
  takes?: boolean;
  /** Where it goes, for the ones that go somewhere. */
  href?: string;
  /** What its argument must have for the line to be this command: an issue's number. */
  needs?: RegExp;
  /** Shown in the box, which stays open, rather than done and gone. */
  panel?: boolean;
}

export const COMMANDS: readonly Command[] = [
  {
    id: 'go-board',
    label: 'Open the board',
    fa: 'باز کردن برد',
    ru: 'Открыть доску',
    icon: 'board',
    href: '/',
    names: [
      'board',
      'the board',
      'open the board',
      'go to the board',
      'home',
      'برد',
      'تخته',
      'صفحه اصلی',
      'доска',
      'открыть доску',
      'главная',
    ],
  },
  {
    id: 'go-slash',
    label: 'Everything made with /',
    fa: 'همه‌ی ساخته‌های /',
    ru: 'Всё, что сделано через /',
    icon: 'shape',
    href: '/slash',
    names: [
      'made with /',
      'everything made',
      'my cards',
      'all cards',
      'cards',
      'کارت ها',
      'همه کارت ها',
      'ساخته ها',
      'карточки',
      'все карточки',
    ],
  },
  {
    id: 'go-calendar',
    label: 'Open the calendar',
    fa: 'باز کردن تقویم',
    ru: 'Открыть календарь',
    icon: 'today',
    href: '/today',
    panel: true,
    names: [
      'calendar',
      'open the calendar',
      'the day',
      'my day',
      'today page',
      'what is today',
      'تقویم',
      'امروز چی دارم',
      'برنامه امروز',
      'календарь',
      'открыть календарь',
      'мой день',
    ],
  },
  {
    id: 'go-shelf',
    label: 'Open the notebooks',
    fa: 'باز کردن دفترها',
    ru: 'Открыть блокноты',
    icon: 'book',
    href: '/shelf',
    panel: true,
    names: [
      'notebooks',
      'library',
      'bookcase',
      'shelf',
      'open the notebooks',
      'دفترها',
      'دفتر ها',
      'کتابخانه',
      'کتابخونه',
      'قفسه',
      'блокноты',
      'библиотека',
      'полка',
    ],
  },
  {
    id: 'go-settings',
    label: 'Open the settings',
    fa: 'باز کردن تنظیمات',
    ru: 'Открыть настройки',
    icon: 'settings',
    href: '/settings',
    panel: true,
    names: [
      'settings',
      'preferences',
      'open the settings',
      'profile',
      'تنظیمات',
      'پروفایل',
      'настройки',
      'профиль',
    ],
  },
  {
    id: 'theme-dark',
    label: 'Dark',
    fa: 'تیره',
    ru: 'Тёмная тема',
    icon: 'face',
    names: [
      'dark',
      'dark mode',
      'dark theme',
      'night mode',
      'حالت تاریک',
      'تم تاریک',
      'تاریک',
      'تیره',
      'тёмная тема',
      'темная тема',
      'тёмный режим',
      'темный режим',
    ],
  },
  {
    id: 'theme-light',
    label: 'Light',
    fa: 'روشن',
    ru: 'Светлая тема',
    icon: 'face',
    names: [
      'light',
      'light mode',
      'light theme',
      'day mode',
      'حالت روشن',
      'تم روشن',
      'روشن',
      'светлая тема',
      'светлый режим',
    ],
  },
  {
    id: 'new-notebook',
    label: 'New notebook',
    fa: 'دفتر تازه',
    ru: 'Новый блокнот',
    icon: 'book',
    takes: true,
    names: [
      'new notebook',
      'make a notebook',
      'create a notebook',
      'add a notebook',
      'دفتر جدید',
      'دفتر تازه',
      'یه دفتر بساز',
      'دفتر بساز',
      'новый блокнот',
      'создай блокнот',
      'создать блокнот',
    ],
  },
  {
    id: 'search',
    label: 'Search everything',
    fa: 'جست‌وجو در همه چیز',
    ru: 'Искать везде',
    icon: 'search',
    takes: true,
    names: [
      'search',
      'find',
      'search for',
      'جستجو',
      'جست و جو',
      'پیدا کن',
      'بگرد',
      'поиск',
      'найди',
      'искать',
    ],
  },
  {
    id: 'connect',
    label: 'Connect GitHub, GitLab or Gitea',
    fa: 'وصل کردن گیت‌هاب، گیت‌لب یا گیتی',
    ru: 'Подключить GitHub, GitLab или Gitea',
    icon: 'branch',
    names: [
      'connect',
      'connect github',
      'connect gitlab',
      'connect gitea',
      'connect an account',
      'connect a repo',
      'add an account',
      'git account',
      'اتصال گیت',
      'وصل کردن گیت',
      'گیت هاب',
      'گیت لب',
      'اتصال به گیت',
      'подключить github',
      'подключить gitlab',
      'подключить аккаунт',
      'подключить гит',
    ],
  },
  {
    id: 'remind-device',
    label: 'Remind me on this device',
    fa: 'یادآوری روی این دستگاه',
    ru: 'Напоминать на этом устройстве',
    icon: 'today',
    names: [
      'notifications',
      'remind me on this device',
      'turn on reminders',
      'reminders on',
      'نوتیفیکیشن',
      'اعلان ها',
      'یادآوری روی گوشی',
      'уведомления',
      'включить напоминания',
    ],
  },
  {
    id: 'backup',
    label: 'Download a backup',
    fa: 'گرفتن پشتیبان',
    ru: 'Скачать резервную копию',
    icon: 'archive',
    href: '/api/archive',
    names: [
      'backup',
      'download a backup',
      'export everything',
      'پشتیبان',
      'بکاپ',
      'резервная копия',
      'бэкап',
    ],
  },
  {
    id: 'issue-list',
    label: 'My open issues',
    fa: 'ایشوهای باز من',
    ru: 'Мои открытые задачи',
    icon: 'branch',
    takes: true,
    panel: true,
    names: [
      'my issues',
      'open issues',
      'issues in',
      'list issues',
      'issues',
      'ایشوهای من',
      'ایشو های من',
      'ایشوها',
      'ایشو های',
      'мои задачи',
      'открытые задачи',
      'задачи в',
      'мои issues',
    ],
  },
  {
    id: 'issue-close',
    label: 'Close an issue',
    fa: 'بستن ایشو',
    ru: 'Закрыть задачу',
    icon: 'check',
    takes: true,
    needs: /#?\d+/,
    names: [
      'close',
      'close issue',
      'ببند',
      'ایشو رو ببند',
      'بستن ایشو',
      'закрой',
      'закрыть',
      'закрой задачу',
    ],
  },
  {
    id: 'issue-reopen',
    label: 'Reopen an issue',
    fa: 'باز کردن دوباره‌ی ایشو',
    ru: 'Открыть задачу снова',
    icon: 'restore',
    takes: true,
    needs: /#?\d+/,
    names: ['reopen', 'reopen issue', 'دوباره باز کن', 'переоткрой', 'открой снова'],
  },
  {
    id: 'issue-comment',
    label: 'Comment on an issue',
    fa: 'نظر روی ایشو',
    ru: 'Комментарий к задаче',
    icon: 'pencil',
    takes: true,
    needs: /#?\d+/,
    names: [
      'comment',
      'comment on',
      'reply to',
      'کامنت',
      'نظر بذار',
      'نظر بده روی',
      'комментарий',
      'ответь на',
      'прокомментируй',
    ],
  },
  {
    id: 'sign-out',
    label: 'Sign out',
    fa: 'خروج از حساب',
    ru: 'Выйти',
    icon: 'back',
    href: '/logout',
    names: ['sign out', 'log out', 'logout', 'خروج', 'خروج از حساب', 'выйти', 'выход'],
  },
];

export interface CommandMatch {
  command: Command;
  /** What follows the name, for a command that takes something: "travel" in "new notebook travel". */
  arg: string;
  /** True when the line says the command outright, and Enter does it. */
  sure: boolean;
  score: number;
  /** The name it was called by, as written. */
  said?: string;
}

const fold = (s: string): string =>
  norm(s)
    .replace(/[‌\s]+/g, ' ')
    .replace(/[.!?؟،,:]+$/u, '')
    .trim();

/** The commands a line asks for, surest first; at most `most`. */
export function matchCommands(text: string, most = 3): CommandMatch[] {
  const line = fold(text);
  if (!line || line.length > 80) return [];
  const out: CommandMatch[] = [];
  for (const command of COMMANDS) {
    let best: CommandMatch | undefined;
    for (const raw of command.names) {
      const name = fold(raw);
      let m: CommandMatch | undefined;
      if (line === name) m = { command, arg: '', sure: true, score: 1, said: raw };
      else if (command.takes && line.startsWith(`${name} `)) {
        const arg = text.trim().slice(raw.length).trim();
        // A command that needs a number is only sure of itself once it has one.
        const ok = !command.needs || command.needs.test(arg);
        m = { command, arg, sure: ok, score: ok ? 0.95 : 0.5, said: raw };
      }
      // A name being typed: offered, not done.
      else if (name.startsWith(line) && line.length >= 3)
        m = {
          command,
          arg: '',
          sure: false,
          score: 0.4 + 0.5 * (line.length / name.length),
          said: raw,
        };
      if (m && (!best || m.score > best.score)) best = m;
    }
    if (best) out.push(best);
  }
  return out.sort((a, b) => b.score - a.score).slice(0, most);
}

/** The command's name in the language the line was written in. */
export function commandLabel(c: Command, lang: 'en' | 'fa' | 'ru'): string {
  return lang === 'fa' ? c.fa : lang === 'ru' ? c.ru : c.label;
}

/** Which of the three a line is written in, by its letters. */
export function languageOf(text: string): 'en' | 'fa' | 'ru' {
  if (/[؀-ۿ]/.test(text)) return 'fa';
  if (/[Ѐ-ӿ]/.test(text)) return 'ru';
  return 'en';
}

/**
 * An issue named in a command's words: "#12 in web", "12 aturzone/grimstroke: thanks, fixed",
 * "#7 روی ریپو api". The number, the repository if one is named, and what follows a colon.
 */
export function issueRef(arg: string): {
  number: string | null;
  repo: string | null;
  words: string;
} {
  const colon = arg.indexOf(':');
  const head = colon >= 0 ? arg.slice(0, colon) : arg;
  const words = colon >= 0 ? arg.slice(colon + 1).trim() : '';
  const n = /#?(\d+)/.exec(head);
  const rest = n ? `${head.slice(0, n.index)} ${head.slice(n.index + n[0].length)}` : head;
  const repo =
    /(?:^|\s)((?:[\w-]+\/)+[\w.-]+)(?=$|\s)/.exec(rest)?.[1] ??
    /(?:^|\s)(?:in|on|ریپو(?:ی)?|در|روی|в|во)\s+([\w.-]+)/u.exec(rest)?.[1] ??
    (/^\s*([\w.-]+)\s*$/.exec(rest)?.[1] || null);
  return { number: n ? (n[1] as string) : null, repo, words };
}
