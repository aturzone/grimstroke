/**
 * An issue, read from one sentence: what it is called, what kind it is, which repository it is
 * for, which labels were asked for, and what it says beyond its title.
 *
 *   "bug: login button does nothing on safari, label ui, in aturzone/grimstroke"
 *   "یه ایشو بساز تایپ باگ لیبل فرانت: دکمه ورود در سافاری کار نمیکنه توضیحات: ..."
 *   "задача: обновить документацию, метки docs"
 *
 * The labels a repository really has are not known here -- they are chosen against the
 * repository's own list in labels.ts. What is read here is what the sentence itself says.
 */

import { allWords, wordsPattern } from '@core/box/lexicon.ts';
import { norm } from '@core/box/text.ts';

export const ISSUE_TYPES = ['bug', 'feature', 'task', 'docs', 'question'] as const;
export type IssueType = (typeof ISSUE_TYPES)[number];

export interface IssueData {
  title: string;
  body: string;
  type: IssueType | null;
  /** Labels the sentence names, as written. */
  labels: string[];
  /** owner/name, or a bare name to be matched against the repositories there are. */
  repo: string | null;
}

/** Words that say which kind an issue is: English, Persian and Russian here, the rest from the lexicon. */
const OWN_TYPE_WORDS: Record<IssueType, RegExp> = {
  bug: /\b(bug|bugs|defect|broken|crash(es|ed)?|error|fails?|failing|regression|doesn'?t work|does not work|not working)\b|باگ|خطا|ارور|کار\s*نمی\s*‌?کن[هد]|خراب|مشکل|ошибк|баг|не работает|сломал|падает/u,
  feature:
    /\b(feature|enhancement|request|add support|would be nice|support for|new option)\b|قابلیت|فیچر|ویژگی|اضافه\s*(کن|شود|بشه)|امکان|фич|функци|добав|улучшени/u,
  task: /\b(task|chore|todo|work item|refactor|cleanup|clean up)\b|تسک|کار\s|وظیفه|ورک\s*آیتم|задач|рефактор/u,
  docs: /\b(docs?|documentation|readme|typo|guide)\b|مستند|داکیومنت|راهنما|документ|ридми|опечат/u,
  question:
    /\b(question|how do i|how to|why does|is it possible)\b|سوال|سؤال|چطور|چرا|вопрос|как\s/u,
};

const TYPE_WORDS = Object.fromEntries(
  ISSUE_TYPES.map((k) => [
    k,
    new RegExp(
      `${OWN_TYPE_WORDS[k].source}|${wordsPattern(
        // A fault described is a bug, in any language, as it is in the three above.
        allWords((w) => (k === 'bug' ? [...w.types[k], ...w.fault] : w.types[k])),
      )}${k === 'bug' ? `|${allWords((w) => w.faultStems).join('|')}` : ''}`,
      'iu',
    ),
  ]),
) as Record<IssueType, RegExp>;

/** "type bug", "تایپ باگ", "тип баг": a kind named outright. */
const TYPE_NAMED: Array<[RegExp, IssueType]> = [
  [/^(bug|باگ|баг|ошибка)$/u, 'bug'],
  [/^(feature|enhancement|قابلیت|فیچر|ویژگی|фича|функция|улучшение)$/u, 'feature'],
  [/^(task|chore|تسک|وظیفه|کار|задача)$/u, 'task'],
  [/^(docs?|documentation|مستندات|مستند|документация)$/u, 'docs'],
  [/^(question|سوال|سؤال|вопрос)$/u, 'question'],
  ...ISSUE_TYPES.map(
    (k) =>
      [new RegExp(`^(?:${allWords((w) => w.types[k]).join('|')})$`, 'u'), k] as [RegExp, IssueType],
  ),
];

/** The words an issue is asked for with, taken off the front of the title. */
const LEAD = new RegExp(
  [
    String.raw`^(please\s+)?(make|create|open|file|add|new|write|raise|log)\s+(me\s+)?(an?\s+)?(new\s+)?(issue|bug( report)?|ticket|work\s*item|task)\s*(for|about|that|:|-)?\s*`,
    String.raw`^(new\s+)?(issue|bug|ticket|work\s*item|feature( request)?|task|docs|question)\s*[:\-–—]\s*`,
    String.raw`^(یه|یک)?\s*(ایشو|باگ|تیکت|ورک\s*آیتم|تسک)\s*(جدید)?\s*(بساز|درست\s*کن|ثبت\s*کن|باز\s*کن|بزن)?\s*(که|برای|درباره)?\s*[:\-–—]?\s*`,
    String.raw`^(создай|создать|открой|заведи|новая|новый)?\s*(issue|задач[уа]|баг|ошибк[уа]|тикет)\s*[:\-–—]?\s*`,
    `^(?:${allWords((w) => w.make).join('|')})\\s*[:\\-–—]?\\s*`,
    `^(?:${allWords((w) => [...w.issue, ...Object.values(w.types).flat()]).join('|')})\\s*[:：\\-–—]\\s*`,
  ].join('|'),
  'iu',
);

const DESCRIPTION = new RegExp(
  `\\s*(?:description|details|desc|body|توضیحات|توضیح|شرح|описание|подробности|${allWords((w) => w.description).join('|')})\\s*[:：]\\s*`,
  'iu',
);
const LABEL_WORDS = allWords((w) => w.label).join('|');
const AFTER_LABELS = allWords((w) => [...w.type, ...w.repo, ...w.description, ...w.in]).join('|');
const LABELS = new RegExp(
  `(?:^|[\\s,،;])(?:labels?|tags?|لیبل(?:\\s*ها|‌ها)?|برچسب(?:\\s*ها|‌ها)?|метк[аи]|ярлык[иа]?|${LABEL_WORDS})\\s*[:：]?\\s*([^\\n.;:]+?)(?=$|\\s+(?:type|تایپ|نوع|тип|in|on|repo|ریپو|در|روی|توی|в|description|توضیحات|описание|${AFTER_LABELS})(?![\\p{L}])|[.;\\n]|:)`,
  'iu',
);
const TYPE_SAID = new RegExp(
  `(?:^|[\\s,،;])(?:type|kind|تایپ|نوع|тип|${allWords((w) => w.type).join('|')})\\s*[:：]?\\s*([^\\s,،;:.]+)`,
  'iu',
);
/** owner/name, or "repo name", "in the name repo", "ریپو name", "в репозитории name". */
// An owner has no dots (a domain does: docs.rs/serde is an address, not a repository).
const REPO_PATH = /(?:^|[\s(])((?:[\w-]+\/)+[\w.-]+)(?=$|[\s),.;:،])/u;
const REPO_SAID = new RegExp(
  [
    String.raw`(?:^|[\s,،])(?:(?:in|on|for|to)\s+(?:the\s+)?)?(?:repo(?:sitory)?|ریپو(?:ی)?|مخزن|репо(?:зитори[йия])?)\s*[:：]?\s*([\w.-]+)`,
    String.raw`(?:^|\s)(?:in|on)\s+(?:the\s+)?([\w.-]+)\s+repo(?:sitory)?\b`,
    String.raw`(?:در|روی|توی|تو)\s+(?:ریپو|مخزن)(?:ی)?\s+([\w.-]+)`,
    `(?:(?:${allWords((w) => w.in).join('|')})\\s+)?(?:${allWords((w) => w.repo).join('|')})(?![\\p{L}])\\s*[:：]?\\s*([\\w.-]+)`,
  ].join('|'),
  'iu',
);

function splitList(raw: string): string[] {
  return raw
    .split(/\s*(?:,|،|\+|(?<![\p{L}])(?:and|و|и)(?![\p{L}]))\s*/u)
    .map((s) => s.trim().replace(/^["'«“]|["'»”]$/g, ''))
    .filter((s) => s && s.length <= 50);
}

function cut(text: string, m: RegExpExecArray | null): string {
  if (!m) return text;
  return `${text.slice(0, m.index)} ${text.slice(m.index + m[0].length)}`;
}

export function parseIssue(text: string): IssueData {
  let rest = text.trim();
  let body = '';
  const desc = DESCRIPTION.exec(rest);
  if (desc) {
    body = rest.slice(desc.index + desc[0].length).trim();
    rest = rest.slice(0, desc.index);
  }

  let type: IssueType | null = null;
  const typeSaid = TYPE_SAID.exec(rest);
  if (typeSaid) {
    const word = norm(typeSaid[1] as string);
    const named = TYPE_NAMED.find(([re]) => re.test(word));
    if (named) {
      type = named[1];
      rest = cut(rest, typeSaid);
    }
  }

  const labelsSaid = LABELS.exec(rest);
  const labels = labelsSaid ? splitList(labelsSaid[1] as string) : [];
  rest = cut(rest, labelsSaid);

  let repo: string | null = null;
  const path = REPO_PATH.exec(rest);
  // A path that is a URL's tail or a fraction is not a repository.
  if (path && !/^\d+\/\d+$/.test(path[1] as string) && !/https?:/.test(rest)) {
    repo = path[1] as string;
    rest = cut(rest, path);
    rest = rest.replace(/\s(?:in|on|for|to|در|روی|توی|تو|в)\s*$/iu, ' ');
  } else {
    const said = REPO_SAID.exec(rest);
    if (said) {
      repo = (said[1] ?? said[2] ?? said[3] ?? said[4] ?? null) as string | null;
      rest = cut(rest, said);
    }
  }

  // What is left is the title: the lead words off, the last stray joiners off.
  let title = rest.replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 2; i++) title = title.replace(LEAD, '').trim();
  title = title
    .replace(/^[,،:;\-–—\s]+|[,،:;\-–—\s]+$/gu, '')
    .replace(/\s+(?:with|and|و|با|и)$/iu, '')
    .trim();
  // A long title keeps its first sentence; the rest goes to the body.
  const sentence = /^(.{12,}?[.!?؟])\s+(.+)$/u.exec(title);
  if (sentence && !body) {
    title = sentence[1] as string;
    body = sentence[2] as string;
  }
  if (title) title = title.charAt(0).toLocaleUpperCase() + title.slice(1);

  if (!type) {
    const t = norm(text);
    type = (ISSUE_TYPES.find((k) => TYPE_WORDS[k].test(t)) as IssueType | undefined) ?? null;
  }
  return { title, body, type, labels, repo };
}

/** A repository a workspace can reach: by its service, its host and its name. */
export interface KnownRepo {
  provider: string;
  host: string;
  repo: string;
}

/**
 * Which of the repositories there are a sentence meant: its whole name, the name without the
 * owner, or the nearest by letters. With nothing said, the one used last, if it is still there.
 */
export function resolveRepo<R extends KnownRepo>(
  asked: string | null,
  known: readonly R[],
  last?: string,
): R | undefined {
  const fold = (s: string): string => s.toLowerCase().replace(/[\s_-]+/g, '');
  if (!asked)
    return (
      known.find((k) => `${k.host}/${k.repo}` === last) ??
      (known.length === 1 ? known[0] : undefined)
    );
  const want = fold(asked.replace(/^https?:\/\/[^/]+\//, '').replace(/\.git$/, ''));
  return (
    known.find((k) => fold(k.repo) === want) ??
    known.find((k) => fold(k.repo.split('/').pop() ?? '') === want) ??
    known.find((k) => fold(k.repo).endsWith(want) || fold(k.repo).includes(want))
  );
}
