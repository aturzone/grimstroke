/**
 * Which of a repository's labels an issue should carry.
 *
 * Repositories name the same idea a hundred ways -- "bug", "type: bug", "kind/bug", "🐛 Bug",
 * "defect" -- and a person says it another hundred, in three languages. So the choice goes
 * through CONCEPTS: an archive of the ideas labels stand for, each with the words a label is
 * named with and the words a sentence says it with. A repository's label is read into the
 * concepts it means; the sentence is read into the concepts it says; a label is as likely as the
 * best concept the two share. A label named outright ("label ui") is matched to the nearest one
 * the repository has, by its letters, so a near miss ("frontend" for "front-end") still lands.
 *
 * Pure and small: no model file, nothing fetched. The repository's list comes from the host.
 */

import type { IssueType } from './issue.ts';
import { norm } from './text.ts';

export interface Concept {
  id: string;
  /** How a label for it is named: whole words, after the label is folded (see labelWords). */
  names: string[];
  /** How a sentence says it: lowercase stems, matched inside words for Persian and Russian. */
  says: string[];
  /** The issue kind it stands for, if it is one. */
  type?: IssueType;
}

export const CONCEPTS: readonly Concept[] = [
  // ------------------------------------------------------------ kinds
  {
    id: 'bug',
    type: 'bug',
    names: [
      'bug',
      'bugs',
      'defect',
      'fix',
      'bugfix',
      'broken',
      'error',
      'issue type bug',
      'regression',
    ],
    says: [
      'bug',
      'broken',
      'crash',
      'error',
      'fail',
      'wrong',
      "doesn't work",
      'not working',
      'باگ',
      'خطا',
      'ارور',
      'خراب',
      'کار نمی',
      'مشکل',
      'ошибк',
      'баг',
      'не работает',
      'слома',
    ],
  },
  {
    id: 'feature',
    type: 'feature',
    names: [
      'feature',
      'features',
      'enhancement',
      'feature request',
      'improvement',
      'new feature',
      'request',
      'idea',
      'proposal',
    ],
    says: [
      'feature',
      'add ',
      'support',
      'would be nice',
      'allow',
      'option',
      'improve',
      'قابلیت',
      'فیچر',
      'ویژگی',
      'اضافه',
      'امکان',
      'بهبود',
      'фич',
      'функци',
      'добав',
      'улучш',
    ],
  },
  {
    id: 'task',
    type: 'task',
    names: ['task', 'chore', 'todo', 'maintenance', 'work item', 'housekeeping'],
    says: ['task', 'chore', 'todo', 'work item', 'تسک', 'وظیفه', 'ورک آیتم', 'задач'],
  },
  {
    id: 'docs',
    type: 'docs',
    names: ['documentation', 'docs', 'doc', 'readme', 'wiki', 'typo'],
    says: [
      'doc',
      'readme',
      'typo',
      'guide',
      'wiki',
      'مستند',
      'داکیومنت',
      'راهنما',
      'документ',
      'опечат',
      'ридми',
    ],
  },
  {
    id: 'question',
    type: 'question',
    names: ['question', 'questions', 'support', 'help', 'discussion', 'faq'],
    says: [
      'question',
      'how do',
      'how to',
      'why ',
      '?',
      'سوال',
      'سؤال',
      'چطور',
      'چرا',
      '؟',
      'вопрос',
      'как ',
    ],
  },
  {
    id: 'refactor',
    names: ['refactor', 'refactoring', 'cleanup', 'tech debt', 'technical debt', 'code quality'],
    says: [
      'refactor',
      'clean up',
      'cleanup',
      'tech debt',
      'ریفکتور',
      'بازنویسی',
      'تمیز',
      'рефактор',
    ],
  },
  // ------------------------------------------------------------ areas
  {
    id: 'ui',
    names: [
      'ui',
      'ux',
      'ui ux',
      'design',
      'frontend',
      'front end',
      'interface',
      'css',
      'style',
      'styling',
      'layout',
      'visual',
    ],
    says: [
      'button',
      'screen',
      'page',
      'layout',
      'css',
      'style',
      'colour',
      'color',
      'font',
      'icon',
      'design',
      'ui',
      'ux',
      'frontend',
      'دکمه',
      'صفحه',
      'ظاهر',
      'طراحی',
      'رنگ',
      'فونت',
      'آیکون',
      'فرانت',
      'кнопк',
      'экран',
      'страниц',
      'дизайн',
      'интерфейс',
      'вёрстк',
      'верстк',
    ],
  },
  {
    id: 'backend',
    names: ['backend', 'back end', 'server', 'api', 'service', 'core'],
    says: [
      'server',
      'backend',
      'api',
      'endpoint',
      'database',
      'سرور',
      'بک اند',
      'بکند',
      'ای پی آی',
      'сервер',
      'бэкенд',
      'бекенд',
    ],
  },
  {
    id: 'api',
    names: ['api', 'rest', 'graphql', 'endpoint', 'sdk'],
    says: [
      'api',
      'endpoint',
      'request',
      'response',
      'graphql',
      'rest ',
      'درخواست',
      'پاسخ',
      'запрос',
      'эндпоинт',
    ],
  },
  {
    id: 'database',
    names: ['database', 'db', 'sql', 'postgres', 'mysql', 'migration', 'data', 'storage'],
    says: [
      'database',
      'db ',
      'sql',
      'migration',
      'query',
      'table',
      'دیتابیس',
      'پایگاه داده',
      'جدول',
      'база данных',
      'миграц',
      'таблиц',
    ],
  },
  {
    id: 'auth',
    names: ['auth', 'authentication', 'login', 'security', 'permissions', 'oauth', 'session'],
    says: [
      'login',
      'log in',
      'sign in',
      'password',
      'auth',
      'token',
      'session',
      'permission',
      'ورود',
      'لاگین',
      'رمز',
      'پسورد',
      'توکن',
      'دسترسی',
      'вход',
      'логин',
      'парол',
      'авториз',
      'токен',
    ],
  },
  {
    id: 'security',
    names: ['security', 'vulnerability', 'cve', 'secure'],
    says: [
      'security',
      'vulnerab',
      'xss',
      'csrf',
      'injection',
      'leak',
      'exploit',
      'امنیت',
      'آسیب پذیر',
      'نشت',
      'безопасн',
      'уязвим',
      'утечк',
    ],
  },
  {
    id: 'performance',
    names: ['performance', 'perf', 'speed', 'optimization', 'optimisation', 'slow'],
    says: [
      'slow',
      'lag',
      'laggy',
      'fast',
      'performance',
      'memory',
      'cpu',
      'freez',
      'کند',
      'لگ',
      'سرعت',
      'حافظه',
      'هنگ',
      'медлен',
      'тормоз',
      'лаг',
      'производительн',
      'памят',
    ],
  },
  {
    id: 'mobile',
    names: ['mobile', 'phone', 'responsive', 'android', 'ios', 'tablet'],
    says: [
      'phone',
      'mobile',
      'android',
      'iphone',
      'ios',
      'safari',
      'responsive',
      'touch',
      'گوشی',
      'موبایل',
      'اندروید',
      'آیفون',
      'ریسپانسیو',
      'لمس',
      'телефон',
      'мобильн',
      'андроид',
      'айфон',
    ],
  },
  {
    id: 'android',
    names: ['android'],
    says: ['android', 'اندروید', 'андроид'],
  },
  {
    id: 'ios',
    names: ['ios', 'iphone', 'ipad', 'safari'],
    says: ['iphone', 'ios', 'ipad', 'safari', 'آیفون', 'سافاری', 'айфон', 'сафари'],
  },
  {
    id: 'accessibility',
    names: ['accessibility', 'a11y', 'aria'],
    says: [
      'accessib',
      'screen reader',
      'keyboard',
      'contrast',
      'a11y',
      'دسترس پذیری',
      'کنتراست',
      'доступност',
      'контраст',
    ],
  },
  {
    id: 'i18n',
    names: ['i18n', 'l10n', 'translation', 'localization', 'localisation', 'rtl', 'language'],
    says: [
      'translat',
      'language',
      'persian',
      'farsi',
      'russian',
      'rtl',
      'locale',
      'ترجمه',
      'زبان',
      'فارسی',
      'راست به چپ',
      'перевод',
      'язык',
      'русск',
      'локализ',
    ],
  },
  {
    id: 'testing',
    names: ['test', 'tests', 'testing', 'qa', 'e2e', 'unit tests', 'flaky'],
    says: ['test', 'flaky', 'coverage', 'qa', 'تست', 'آزمون', 'тест'],
  },
  {
    id: 'ci',
    names: [
      'ci',
      'cd',
      'ci cd',
      'build',
      'pipeline',
      'github actions',
      'workflow',
      'infra',
      'infrastructure',
      'devops',
      'deploy',
      'deployment',
    ],
    says: [
      'ci',
      'pipeline',
      'build',
      'deploy',
      'docker',
      'workflow',
      'release',
      'بیلد',
      'دیپلوی',
      'استقرار',
      'پایپلاین',
      'داکر',
      'сборк',
      'деплой',
      'пайплайн',
      'докер',
      'релиз',
    ],
  },
  {
    id: 'dependencies',
    names: ['dependencies', 'dependency', 'deps', 'npm', 'upgrade', 'renovate', 'dependabot'],
    says: [
      'dependenc',
      'upgrade',
      'npm',
      'package',
      'version',
      'وابستگی',
      'پکیج',
      'نسخه',
      'зависимост',
      'пакет',
      'верси',
    ],
  },
  {
    id: 'crash',
    names: ['crash', 'crashes', 'panic', 'freeze', 'hang'],
    says: [
      'crash',
      'panic',
      'freez',
      'hang',
      'کرش',
      'هنگ',
      'بسته میشه',
      'падает',
      'вылет',
      'завис',
    ],
  },
  {
    id: 'notifications',
    names: ['notifications', 'notification', 'push', 'email', 'reminders'],
    says: [
      'notification',
      'notify',
      'push',
      'remind',
      'email',
      'نوتیفیکیشن',
      'اعلان',
      'یادآور',
      'ایمیل',
      'уведомлен',
      'напомин',
      'пуш',
    ],
  },
  // ------------------------------------------------------------ priority and state
  {
    id: 'priority-high',
    names: [
      'priority high',
      'high priority',
      'p0',
      'p1',
      'critical',
      'urgent',
      'blocker',
      'severity high',
      'important',
      'priority critical',
    ],
    says: [
      'urgent',
      'asap',
      'critical',
      'blocker',
      'blocking',
      'important',
      'immediately',
      'فوری',
      'ضروری',
      'مهم',
      'بحرانی',
      'سریع',
      'срочно',
      'критич',
      'важн',
      'блокер',
    ],
  },
  {
    id: 'priority-low',
    names: [
      'priority low',
      'low priority',
      'p3',
      'p4',
      'minor',
      'trivial',
      'nice to have',
      'someday',
    ],
    says: [
      'minor',
      'trivial',
      'low priority',
      'someday',
      'nice to have',
      'not urgent',
      'جزئی',
      'کم اهمیت',
      'غیر فوری',
      'мелоч',
      'незначительн',
      'не срочно',
    ],
  },
  {
    id: 'good-first-issue',
    names: ['good first issue', 'beginner', 'easy', 'starter', 'first timers only'],
    says: ['easy', 'simple', 'beginner', 'first issue', 'ساده', 'آسان', 'простой', 'лёгк', 'легк'],
  },
  {
    id: 'help-wanted',
    names: ['help wanted', 'contributions welcome', 'up for grabs'],
    says: ['help wanted', 'anyone', 'contributions', 'کمک', 'помощь'],
  },
  {
    id: 'breaking',
    names: ['breaking', 'breaking change', 'major'],
    says: ['breaking', 'incompatible', 'شکستن', 'ناسازگار', 'несовместим', 'ломающ'],
  },
  {
    id: 'duplicate',
    names: ['duplicate', 'dup', 'dupe'],
    says: ['duplicate', 'same as', 'already reported', 'تکراری', 'дубликат', 'дубль'],
  },
];

/** A label's name as words: case, emoji, prefixes and separators folded away. */
export function labelWords(name: string): string {
  return norm(name)
    .replace(/\p{Extended_Pictographic}|\u{FE0F}/gu, ' ')
    .replace(/^(type|kind|area|scope|component|topic|t|k|a|c|status|s)\s*[:/]\s*/u, '')
    .replace(/^(priority|prio|severity|sev|p)\s*[:/]\s*/u, 'priority ')
    .replace(/[_\-/:.()[\]]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function trigrams(s: string): Set<string> {
  const t = ` ${s} `;
  const out = new Set<string>();
  for (let i = 0; i < t.length - 2; i++) out.add(t.slice(i, i + 3));
  return out;
}

/** 0..1, how alike two names are by their letters (Dice over trigrams). */
export function alike(a: string, b: string): number {
  const x = trigrams(a);
  const y = trigrams(b);
  if (!x.size || !y.size) return 0;
  let both = 0;
  for (const g of x) if (y.has(g)) both++;
  return (2 * both) / (x.size + y.size);
}

const LATIN = /^[a-z0-9 '?]+$/;

/** Whether a sentence says a stem: as a whole word for Latin, inside a word otherwise. */
function says(text: string, stem: string): boolean {
  if (!LATIN.test(stem) || stem.endsWith(' ') || stem === '?') return text.includes(stem);
  return new RegExp(`(^|[^a-z0-9])${stem.replace(/[?]/g, '\\?')}`).test(text);
}

/** The concepts a repository's label stands for, each with how surely. */
export function conceptsOfLabel(name: string): Array<{ id: string; sure: number }> {
  const words = labelWords(name);
  const out: Array<{ id: string; sure: number }> = [];
  for (const c of CONCEPTS) {
    let sure = 0;
    for (const n of c.names) {
      if (words === n) sure = Math.max(sure, 1);
      else if (` ${words} `.includes(` ${n} `)) sure = Math.max(sure, 0.85);
      else sure = Math.max(sure, alike(words, n) >= 0.7 ? 0.7 : 0);
    }
    if (sure > 0) out.push({ id: c.id, sure });
  }
  return out;
}

/** The concepts a sentence says, each 0..1: one word is a hint, two are a statement. */
export function conceptsOfText(text: string): Map<string, number> {
  const t = ` ${norm(text)} `;
  const out = new Map<string, number>();
  for (const c of CONCEPTS) {
    const hits = c.says.filter((s) => says(t, s)).length;
    if (hits) out.set(c.id, Math.min(1, 0.55 + 0.25 * (hits - 1)));
  }
  return out;
}

export interface LabelChoice {
  name: string;
  /** 0..1. */
  p: number;
  /** Why: "asked" (named in the sentence), "kind", or the concept that matched. */
  why: string;
}

/**
 * The repository's labels ranked for this issue, most likely first, with the ones worth putting
 * on (`p` at least `floor`) and no more than `most` of them.
 */
export function chooseLabels(
  issue: { title: string; body?: string; type: IssueType | null; labels: string[] },
  available: readonly string[],
  options: { floor?: number; most?: number } = {},
): LabelChoice[] {
  const floor = options.floor ?? 0.5;
  const most = options.most ?? 5;
  const said = conceptsOfText(`${issue.title} ${issue.body ?? ''}`);
  const scores = new Map<string, LabelChoice>();
  const keep = (name: string, p: number, why: string): void => {
    const was = scores.get(name);
    if (!was || was.p < p) scores.set(name, { name, p: Math.min(1, p), why });
  };

  // Named outright: the nearest label the repository has, by letters or by idea.
  for (const asked of issue.labels) {
    const words = labelWords(asked);
    // What the asked-for name means, whichever language it was said in.
    const askedConcepts = new Set([
      ...conceptsOfLabel(asked).map((c) => c.id),
      ...conceptsOfText(asked).keys(),
    ]);
    let best: { name: string; p: number } | undefined;
    for (const name of available) {
      const byLetters = alike(words, labelWords(name));
      const byIdea = conceptsOfLabel(name).some((c) => askedConcepts.has(c.id)) ? 0.8 : 0;
      const p = labelWords(name) === words ? 1 : Math.max(byLetters, byIdea);
      if (!best || p > best.p) best = { name, p };
    }
    if (best && best.p >= 0.45) keep(best.name, 0.98, 'asked');
  }

  for (const name of available) {
    for (const { id, sure } of conceptsOfLabel(name)) {
      const concept = CONCEPTS.find((c) => c.id === id);
      // The kind decides its own label: a bug is a bug, whatever else it mentions.
      if (concept?.type) {
        if (issue.type === concept.type) keep(name, 0.9 * sure + 0.05, 'kind');
        continue;
      }
      const heard = said.get(id) ?? 0;
      if (heard) keep(name, heard * sure, id);
    }
    // The label's own words in the sentence, which catches the labels no concept knows.
    const words = labelWords(name);
    if (
      words.length >= 3 &&
      ` ${norm(issue.title)} ${norm(issue.body ?? '')} `.includes(` ${words} `)
    )
      keep(name, 0.7, 'named');
  }

  // One label per idea: of "bug" and "type: bug", the surer.
  const out = [...scores.values()].sort((a, b) => b.p - a.p);
  const seen = new Set<string>();
  const result: LabelChoice[] = [];
  for (const choice of out) {
    const ideas = conceptsOfLabel(choice.name).map((c) => c.id);
    const idea = ideas[0] ?? choice.name;
    if (choice.why !== 'asked' && seen.has(idea)) continue;
    for (const i of ideas) seen.add(i);
    result.push(choice);
  }
  return result.filter((c) => c.p >= floor).slice(0, most);
}
