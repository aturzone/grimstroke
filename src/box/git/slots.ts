/**
 * What a git sentence names, whatever order it is said in: a number, a repository, people,
 * labels, branches, a version, a commit, a file, a message.
 *
 * Two passes. `spansOf` finds everything with a shape of its own -- "#12", "owner/name",
 * "v1.2.0", a sha, a URL, an @mention, a quoted message, a file -- before anything knows which
 * action the sentence is, and what follows a colon, which is said rather than asked. The model
 * (model.ts) reads the sentence with those masked, so "close #12" and "close #4012" are the same
 * sentence to it and a comment's words never decide what the comment is.
 *
 * `readSlots` then gives everything its role once the action is known. First by its cues -- "from
 * A into B", "label X", "to sina", "به سینا", "на Сашу", "by rend", "called X" -- and then by what
 * is left: a name the sentence does not explain is the branch of a push, the repository of a
 * list, the label being made. The same "fix/login" is a branch in "open a PR from fix/login" and
 * a repository in "issues in aturzone/grimstroke"; the same "to main" is a base in a pull request
 * and the branch of a switch.
 *
 * Values are cut from the sentence as it was typed: a Persian title keeps its half-spaces, a
 * comment its own commas. Everything is matched on a copy folded one character for one
 * (text.ts foldInPlace), so a position there is a position in what was typed.
 *
 * Pure. English, Persian and Russian are read fully; the other languages of words.ts as far as
 * their little words go.
 */

import type { GitAction, SlotName } from '@core/box/git/actions.ts';
import { GIT_SPEECH, type GitSpeech, speechPattern } from '@core/box/git/words.ts';
import { parseIssue } from '@core/box/issue.ts';
import { fold, foldInPlace } from '@core/box/text.ts';

export interface GitSlots {
  repo?: string;
  number?: string;
  people?: string[];
  labels?: string[];
  title?: string;
  body?: string;
  branch?: string;
  base?: string;
  ref?: string;
  tag?: string;
  path?: string;
  state?: 'open' | 'closed' | 'merged' | 'all';
  mine?: boolean;
  author?: string;
  query?: string;
  milestone?: string;
  provider?: 'github' | 'gitlab' | 'gitea';
  host?: string;
  count?: string;
  colour?: string;
  url?: string;
  draft?: boolean;
  force?: boolean;
  method?: 'merge' | 'squash' | 'rebase';
  type?: string;
  private?: boolean;
}

export type SpanKind =
  | 'url'
  | 'quoted'
  | 'mention'
  | 'hash'
  | 'file'
  | 'path'
  | 'version'
  | 'sha'
  | 'number';

export interface Span {
  kind: SpanKind;
  value: string;
  start: number;
  end: number;
}

export interface Spans {
  /** The sentence as typed. */
  raw: string;
  /** Folded one character for one and lowercased, every span's characters replaced by SPAN. */
  work: string;
  /** The sentence folded, with the spans masked as words, for the model. */
  masked: string;
  /** The masked sentence before its first colon (or all of it). */
  head: string;
  /** What follows the first colon, as typed. */
  tail: string;
  /** Where the tail starts in `raw`, or its length. */
  tailAt: number;
  items: Span[];
  quoted: string[];
  urls: string[];
  hashes: string[];
  numbers: string[];
  paths: string[];
  versions: string[];
  shas: string[];
  mentions: string[];
}

// ---------------------------------------------------------------- shapes

/** A character standing in for a span's, in `work`: nothing else matches it. */
const SPAN = '';

const SHAPES: Array<[SpanKind, RegExp, string, number]> = [
  ['url', /\b(?:(?:https?|ssh|file):\/\/|git@)[^\s<>"']+/giu, 'URL', 0],
  [
    'quoted',
    /"([^"]+)"|“([^”]+)”|«([^»]+)»|(?<![\p{L}])'([^']{2,})'(?![\p{L}])|`([^`]+)`|„([^“]+)“/gu,
    'TEXT',
    1,
  ],
  ['mention', /(?<![\p{L}\p{N}])@([\w.-]+)/gu, '@P', 1],
  ['hash', /(?<![\p{L}\p{N}&])[#!](\d{1,7})(?![\p{L}\p{N}])/gu, '#0', 1],
  [
    'file',
    /(?<![\p{L}\p{N}/@.~])[\w-]+\.(?:md|ts|tsx|js|jsx|mjs|cjs|json|ya?ml|toml|py|go|rs|rb|java|kt|swift|c|h|cpp|cs|php|css|scss|html|sh|txt|lock|env|sql|vue|svelte|ini|xml|gradle)(?![\p{L}\p{N}])|(?<![\p{L}\p{N}/@.])(?:README|LICENSE|CHANGELOG|Dockerfile|Makefile|AGENTS|CONTRIBUTING)(?:\.md)?(?![\p{L}\p{N}])/gu,
    'FILE',
    0,
  ],
  [
    'path',
    /(?<![\p{L}\p{N}/@.:])(?:~|\.{1,2})?\/?[\w.-]+(?:\/[\w.-]+)+\/?(?![\p{L}\p{N}])/gu,
    'PATH',
    0,
  ],
  // A version: v1.2, 1.2.0, 2.0.0-beta.1 -- but not 1.2 alone, which is as often an amount
  // ("۱.۲ میلیون") as a version.
  [
    'version',
    /(?<![\p{L}\p{N}./])(?:v\d+\.\d+(?:\.\d+)?|\d+\.\d+\.\d+)(?:-[\w.]+)?(?![\p{L}\p{N}/])/giu,
    'VER',
    0,
  ],
  [
    'sha',
    /(?<![\p{L}\p{N}])(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{7,40}(?![\p{L}\p{N}])/gu,
    'SHA',
    0,
  ],
  ['sha', /(?<![\p{L}\p{N}])HEAD(?:[~^]\d*)*(?![\p{L}\p{N}])/gu, 'SHA', 0],
  ['number', /(?<![\p{L}\p{N}.#!_/-])\d{1,7}(?![\p{L}\p{N}_-]|\.\d)/gu, '0', 0],
];

const MASK: Record<SpanKind, string> = Object.fromEntries(
  SHAPES.map(([kind, , mask]) => [kind, mask]),
) as Record<SpanKind, string>;

/** Find everything with a shape of its own, and the sentence with it masked. */
export function spansOf(raw: string): Spans {
  let work = foldInPlace(raw);
  const items: Span[] = [];
  for (const [kind, re, , group] of SHAPES) {
    for (const m of work.matchAll(new RegExp(re.source, `${re.flags}d`))) {
      const at = m.index ?? 0;
      const g = group ? (m.indices?.findIndex((x, i) => i > 0 && x !== undefined) ?? 0) : 0;
      const [s, e] = (g > 0 ? m.indices?.[g] : undefined) ?? [at, at + m[0].length];
      // Numbers and versions as digits anyone reads (۱۲ is 12); words as typed.
      const from =
        kind === 'number' || kind === 'hash' || kind === 'version' || kind === 'sha'
          ? foldInPlace(raw)
          : raw;
      items.push({ kind, value: from.slice(s, e).trim(), start: at, end: at + m[0].length });
    }
    // Taken: nothing after this finds a span inside one.
    for (const it of items)
      if (work[it.start] !== SPAN)
        work = work.slice(0, it.start) + SPAN.repeat(it.end - it.start) + work.slice(it.end);
  }
  items.sort((a, b) => a.start - b.start);
  work = work.toLowerCase();

  let masked = '';
  let at = 0;
  for (const it of items) {
    masked += `${work.slice(at, it.start)} ${MASK[it.kind]} `;
    at = it.end;
  }
  masked = fold(masked + work.slice(at));

  const colon = /[:：]\s+|\s[-–—]{1,2}\s/u.exec(work);
  const tailAt = colon && colon.index > 0 ? colon.index + colon[0].length : raw.length;
  const mColon = /[:：]\s+|\s[-–—]{1,2}\s/u.exec(masked);
  const of = (k: SpanKind): string[] => items.filter((i) => i.kind === k).map((i) => i.value);
  return {
    raw,
    work,
    masked: masked.trim(),
    head: mColon && mColon.index > 0 ? masked.slice(0, mColon.index).trim() : masked.trim(),
    tail: raw.slice(tailAt).trim(),
    tailAt,
    items,
    quoted: of('quoted'),
    urls: of('url'),
    hashes: of('hash'),
    numbers: of('number'),
    paths: [...of('file'), ...of('path')],
    versions: of('version'),
    shas: of('sha'),
    mentions: of('mention'),
  };
}

// ---------------------------------------------------------------- little words

const words = (pick: (s: GitSpeech) => readonly string[] | undefined): string[] => [
  ...new Set(GIT_SPEECH.flatMap((s) => pick(s) ?? []).map((w) => fold(w).toLowerCase())),
];
const alt = (list: readonly string[]): string =>
  [...new Set(list)]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

/** A name: letters, digits and the joiners names use -- or a span. */
const NAME = String.raw`(?:${SPAN}+|[\p{L}\p{N}][\p{L}\p{N}._/~-]*)`;
const B = String.raw`(?<![\p{L}\p{N}${SPAN}_./-])`;
const E = String.raw`(?![\p{L}\p{N}${SPAN}])`;

const anyOf = (res: RegExp[], t: string): boolean => res.some((r) => r.test(t));

const MINE = speechPattern((s) => s.mine);
const LOCAL_CUE = speechPattern((s) => s.localCue);
const REMOTE_CUE = speechPattern((s) => s.remoteCue);
const THAT = speechPattern((s) => s.that);

const BRANCH_WORD = alt([...words((s) => s.objects.branch), 'бранч']);
const REPO_WORD = alt([
  ...words((s) => s.objects.repo),
  'реп',
  'репу',
  'репы',
  'репа',
  'ریپازیتوری',
]);
const LABEL_WORD = alt([
  ...words((s) => s.labelWord),
  'метку',
  'метки',
  'меткой',
  'лейбл',
  'لیبل های',
  'لیبلای',
]);
const FROM = alt([...words((s) => s.from), 'off', 'out of']);
const TO_PERSON = alt(words((s) => s.toPerson));
const INTO = 'into|to|onto|against|->|→|به|تو|توی|روی|رو|в|на|nach|vers|a|para|in|su|e|ye|إلى|到';

/**
 * Words that are never a name: every git word in every language, the little words around them,
 * and the common words of a request. What is left over in a sentence, after these, is its names.
 */
const LITTLE = new Set<string>(
  [
    ...GIT_SPEECH.flatMap((s) => [...s.toPerson, ...s.inRepo, ...s.from, ...s.into, ...s.that]),
    ...`the a an it me my us we i you them this that these those please now pls and or with of to
     in on at for from by as is are was be it's its can could would should will just also then so
     all any some one new latest last recent mine our your their what which who where when how why
     again too there here up down out off back into onto over show list get give make let need
     want see tell ask do did does done have has had not no yes ok okay hey thanks thank
     everything something anything called named titled message entirely whole every isn aren don
     doesn didn wasn won t s force forced hard soft`.split(/\s+/),
    ...`رو را به از در تو توی روی واسه برای که این اون یه یک من منو مال خودم لطفا میشه بکن کن بده
     بزن هم دیگه همه همین همون اینو اونو با و یا تا هست بود شد شده کردم کرده چی چه کی کجا کدوم
     ها های ی ای اینجا اونجا الان بعد قبل جدید آخر اخیر کلا میگم بهش روش ازش نیست است هست`.split(
      /\s+/,
    ),
    ...`в во на с со из от к по для и или а но это этот эту тот ту его её ее мне меня мой мои моих
     мою нам нас все всё всех пожалуйста плиз ещё еще тоже уже тут здесь там новый новую новая
     последние последний как что где когда кто какие какой`.split(/\s+/),
  ]
    .map((w) => fold(w).toLowerCase().trim())
    .filter(Boolean),
);

const VOCAB = new Set<string>(
  [
    ...LITTLE,
    ...GIT_SPEECH.flatMap((s) => [
      ...Object.values(s.verbs).flat(),
      ...Object.values(s.objects).flat(),
      ...s.toPerson,
      ...s.inRepo,
      ...s.from,
      ...s.into,
      ...s.mine,
      ...s.open,
      ...s.closed,
      ...s.merged,
      ...s.all,
      ...s.remoteCue,
      ...s.localCue,
      ...s.labelWord,
      ...s.that,
    ]).flatMap((w) => [w, ...w.split(/\s+/)]),
    ...`lgtm branch branches locally local remote origin upstream kill`.split(/\s+/),
  ]
    .map((w) => fold(w).toLowerCase().trim())
    .filter(Boolean),
);
const STEMS = [...VOCAB].filter((w) => w.length >= 3 && /[؀-ۿЀ-ӿ]/u.test(w));

function isVocab(w: string): boolean {
  const x = fold(w).toLowerCase();
  if (VOCAB.has(x)) return true;
  // A Persian or Russian word with its endings: "ایشوهای", "برنچا", "задачу", "ветку".
  for (const stem of STEMS) if (x.startsWith(stem) && x.length - stem.length <= 4) return true;
  return false;
}

/** A little word -- never a label or a name, though git's own words can be ("bug", "wontfix"). */
const isLittle = (w: string): boolean => LITTLE.has(fold(w).toLowerCase());

const LATIN_NAME = /^[A-Za-z0-9][\w./~-]*$/;

/** Branch-shaped: main, develop, fix/login, feature-x, release/1.2, origin/main. */
export function looksLikeBranch(w: string | undefined): boolean {
  if (!w) return false;
  return (
    /^(main|master|develop|dev|trunk|staging|production|prod|release|next|gh-pages|stable|canary|hotfix)$/i.test(
      w,
    ) ||
    /^(origin|upstream)\/[\w./-]+$/i.test(w) ||
    /^(feat|feature|fix|bugfix|hotfix|chore|docs|refactor|release|test|ci|build|wip|exp|topic|user|dev)\/[\w./-]+$/i.test(
      w,
    ) ||
    /^(feat|feature|fix|bugfix|hotfix|release)-[\w./-]+$/i.test(w)
  );
}

// ---------------------------------------------------------------- finding by cue

interface Found {
  value: string;
  start: number;
  end: number;
}

/** The first match of `re`'s group in the sentence, as typed -- a span gives its own value. */
function grab(s: Spans, re: RegExp, group = 1, from = 0, to = s.raw.length): Found | undefined {
  const flags = new Set([...re.flags, 'd', 'g']);
  const g = new RegExp(re.source, [...flags].join(''));
  for (const m of s.work.slice(0, to).matchAll(g)) {
    const at = m.indices?.[group];
    if (!at || at[0] < from) continue;
    const span = s.items.find((i) => i.start === at[0]);
    if (span && at[1] <= span.end) return { value: span.value, start: span.start, end: span.end };
    const value = s.raw
      .slice(at[0], at[1])
      .replace(/[.,;:!?؟،]+$/u, '')
      .trim();
    if (value) return { value, start: at[0], end: at[1] };
  }
  return undefined;
}

/** A list said as "a, b and c", "a و b", "a и b". */
function listOf(v: string): string[] {
  return v
    .split(/\s*(?:,|،|\+|(?<![\p{L}])(?:and|و|и|und|et)(?![\p{L}]))\s*/u)
    .map((x) => x.trim().replace(/^["'«“]|["'»”]$/g, ''))
    .filter(Boolean);
}

/** Names left over: not git's words, not taken by another slot. */
function leftovers(s: Spans, taken: Found[], latinOnly = true): Found[] {
  const out: Found[] = [];
  const head = s.work.slice(0, s.tailAt);
  for (const m of head.matchAll(new RegExp(NAME, 'gu'))) {
    const at = m.index ?? 0;
    const end = at + m[0].length;
    if (taken.some((f) => at < f.end && end > f.start)) continue;
    const span = s.items.find((i) => i.start === at);
    if (span) {
      if (span.kind === 'path' || span.kind === 'file' || span.kind === 'version')
        out.push({ value: span.value, start: at, end });
      continue;
    }
    const value = s.raw.slice(at, end).replace(/[.,;:!?؟،]+$/u, '');
    if (value.length < 2 || isVocab(value)) continue;
    if (latinOnly && !LATIN_NAME.test(value)) continue;
    out.push({ value, start: at, end });
  }
  return out;
}

// ---------------------------------------------------------------- the readers

const STATE_WORDS: Array<[NonNullable<GitSlots['state']>, RegExp]> = [
  [
    'merged',
    /merged|landed|مرج\s*شده|ادغام\s*شده|смерж|слит|влит|fusionn|mergead|zusammengeführt/u,
  ],
  [
    'all',
    /\b(?:open and closed|all states|including closed)\b|باز\s*و\s*بسته|включая закрытые|открытые и закрытые/u,
  ],
  [
    'closed',
    /\bclosed\b|\bresolved\b|بسته|حل\s*شده|закрыт|fermé|cerrad|fechad|chius|geschlossen|kapalı|关闭的|已关闭/u,
  ],
  [
    'open',
    /\bopen\b|\bactive\b|\bpending\b|\bunresolved\b|(?<![\p{L}])باز(?:ه|ند|ن)?(?![\p{L}])|открыт|ouvert|abiert|abert|apert|offen|açık|打开的|未关闭|开着/u,
  ],
];

function stateOf(s: Spans, action: GitAction): GitSlots['state'] {
  const head = s.work.slice(0, s.tailAt);
  for (const [state, re] of STATE_WORDS) {
    // "open" in "open a PR" is the verb; a list's "open issues" is the state.
    if (state === 'open' && action.verb !== 'list') continue;
    if (re.test(head)) return state;
  }
  return undefined;
}

const NUMBERED = alt([
  ...words((x) => [...x.objects.issue, ...x.objects.pr]),
  'number',
  'no',
  'nr',
  'شماره',
  'номер',
  'пр',
  'мр',
]);

/** The number an action is about, from before the colon first: "#12", "issue 12", "PR ۱۴". */
function numberOf(s: Spans): string | undefined {
  const inHead = (i: Span): boolean => i.start < s.tailAt;
  const hash = s.items.find((i) => i.kind === 'hash' && inHead(i));
  if (hash) return hash.value;
  const near =
    grab(
      s,
      new RegExp(`${B}(?:${NUMBERED})[\\p{L}]*\\s*(?:#|no\\.?|nr\\.?|№)?\\s*(${SPAN}+)`, 'iu'),
      1,
      0,
      s.tailAt,
    ) ??
    grab(s, new RegExp(`(${SPAN}+)(?:-?[\\p{L}]{1,2})?\\s+(?:${NUMBERED})`, 'iu'), 1, 0, s.tailAt);
  if (near && /^\d+$/.test(near.value)) return near.value;
  const lone = s.items.filter((i) => i.kind === 'number' && inHead(i));
  if (lone.length === 1 && !countOf(s)) return lone[0]?.value;
  return s.items.find((i) => i.kind === 'hash')?.value;
}

/** How many: "last 5 commits", "۵ تا کامیت آخر", "последние 5". */
function countOf(s: Spans): string | undefined {
  const t = foldInPlace(s.raw).toLowerCase();
  return (
    /(?:last|latest|recent|top|first)\s+(\d{1,3})\b/iu.exec(t)?.[1] ??
    /(\d{1,3})\s*(?:تا|عدد)\s/u.exec(t)?.[1] ??
    /(?:последни[ехй]|последние)\s+(\d{1,3})/iu.exec(t)?.[1] ??
    /\b(\d{1,3})\s+(?:latest|last|recent)\b/iu.exec(t)?.[1] ??
    undefined
  );
}

const COLOURS: RegExp[] = [
  /red|قرمز|красн|rouge|rojo|vermelh|rosso|kırmızı|أحمر|红/u,
  /orange|نارنجی|оранжев|naranja|laranja|arancion|turuncu|برتقالي|橙/u,
  /yellow|زرد|желт|jaune|amarill|amarel|giall|gelb|sarı|أصفر|黄/u,
  /green|سبز|зелен|verde|grün|yeşil|أخضر|绿/u,
  /blue|آبی|голуб|bleu|azul|blau|mavi|أزرق|蓝/u,
  /purple|violet|بنفش|фиолет|morado|roxo|viola|lila|بنفسجي|紫/u,
  /pink|صورتی|розов|pembe|وردي|粉/u,
  /gr[ae]y|طوسی|خاکستری|gris|cinza|grigio|رمادي|灰/u,
  /black|مشکی|سیاه|черн|noir|negro|preto|nero|schwarz|siyah|أسود|黑/u,
  /white|سفید|blanc|blanco|branco|bianco|weiß|beyaz|أبيض|白/u,
];

/** A colour as the sentence says it ("red", "قرمز", "оранжевый"), or a hex. */
function colourOf(s: Spans): Found | undefined {
  const hex = /#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/i.exec(s.raw);
  if (hex) return { value: hex[0], start: hex.index, end: hex.index + hex[0].length };
  for (const re of COLOURS) {
    const m = new RegExp(`${B}(?:${re.source})[\\p{L}]*`, 'iud').exec(s.work);
    const at = m?.indices?.[0];
    if (at) return { value: s.raw.slice(at[0], at[1]), start: at[0], end: at[1] };
  }
  return undefined;
}

const SAID = String.raw`-m|--message|with (?:the |a )?message|message|saying|that says|titled|with (?:the )?title|با\s+(?:پیام|مسیج|عنوان|اسم|این\s+توضیح|کامنت)|پیامش|که\s+بگه|с\s+(?:сообщением|месседжем|заголовком|названием|комментарием)|сообщение|mit (?:der )?nachricht|avec (?:le )?message|con (?:el )?mensaje|com a mensagem|con il messaggio|mesajıyla`;

/** The words of a message: quoted, after "message"/"با پیام"/"с сообщением", after a colon. */
function messageOf(s: Spans, extra?: string): string | undefined {
  if (s.quoted.length) return s.quoted.join(' ');
  const said = grab(s, new RegExp(`(?:${SAID}${extra ? `|${extra}` : ''})\\s+(.+)$`, 'iu'));
  if (said) return said.value;
  return s.tail || undefined;
}

/** Everything the sentence says that the action reads. */
export function readSlots(raw: string, action: GitAction, spans = spansOf(raw)): GitSlots {
  const s = spans;
  const out: GitSlots = {};
  const wants = new Set<SlotName>([...action.needs, ...action.takes]);
  const taken: Found[] = [];
  function take(f: Found): string;
  function take(f: Found | undefined): string | undefined;
  function take(f: Found | undefined): string | undefined {
    if (!f) return undefined;
    taken.push(f);
    return f.value;
  }
  const isTaken = (f: { start: number }): boolean => taken.some((t) => t.start === f.start);
  const head = s.tailAt;
  const v = action.verb;
  const o = action.object;

  const url = s.urls[0];
  if (url) out.url = url;

  // -------------------------------------------------- issue.create: the issue reader knows best
  if (action.id === 'issue.create') {
    const d = parseIssue(raw);
    if (d.title) out.title = d.title;
    if (d.body) out.body = d.body;
    if (d.type) out.type = d.type;
    if (d.labels.length) out.labels = d.labels;
    const repo =
      d.repo ??
      grab(
        s,
        new RegExp(`(?:file|put|log|open|add)\\s+it\\s+(?:in|on|to|under)\\s+(${NAME})`, 'iu'),
      )?.value ??
      grab(s, new RegExp(`${B}(?:in|on|for|для|в)\\s+(${NAME})\\s*[:：]`, 'iu'))?.value ??
      grab(s, new RegExp(`${B}(?:فی|في)\\s+(${NAME})`, 'iu'))?.value ??
      grab(s, new RegExp(`在\\s*(${NAME})`, 'iu'))?.value ??
      grab(s, new RegExp(`(${NAME})\\s+için`, 'iu'))?.value;
    if (repo) out.repo = repo;
    // "افتح issue في web: ..." -- the words before the colon were the asking, not the title.
    if (out.repo && s.tail && out.title?.includes(out.repo))
      out.title = s.tail.charAt(0).toLocaleUpperCase() + s.tail.slice(1);
    return clean(out);
  }

  // -------------------------------------------------- refs and branches, by their cues
  if (wants.has('branch') || wants.has('base') || wants.has('ref')) {
    const between = grab(
      s,
      new RegExp(
        `${B}(?:${FROM})\\s+(?:(?:${BRANCH_WORD})[\\p{L}]*\\s+)?(${NAME})(?:\\s+(?:${BRANCH_WORD})[\\p{L}]*)?\\s+(?:${INTO})\\s+(?:(?:${BRANCH_WORD})[\\p{L}]*\\s+)?${NAME}`,
        'iu',
      ),
      1,
      0,
      head,
    );
    if (between && !isLittle(between.value)) {
      const second = grab(
        s,
        new RegExp(`(?:${INTO})\\s+(?:(?:${BRANCH_WORD})[\\p{L}]*\\s+)?(${NAME})`, 'iu'),
        1,
        between.end,
        head,
      );
      if (o === 'branch' && v === 'create') {
        out.ref = take(between);
        if (second) out.branch = take(second);
      } else {
        out.branch = take(between);
        if (second) out.base = take(second);
      }
    }
    // "develop into main", "X رو با main مرج کن", "X رو PR کن به main", "develop в main".
    if (!out.branch && (v === 'merge' || v === 'create' || v === 'rebase')) {
      const pair =
        grab(s, new RegExp(`(${NAME})\\s+(?:into|onto|->|→)\\s+${NAME}`, 'iu'), 1, 0, head) ??
        grab(
          s,
          new RegExp(
            `(${NAME})\\s+(?:رو|را)\\s+(?:[^\\s]+\\s+){0,3}?(?:با|به|تو|توی|روی)\\s+${NAME}`,
            'iu',
          ),
          1,
          0,
          head,
        ) ??
        grab(
          s,
          new RegExp(`(?:смержи|влей|слей|merge)\\s+(${NAME})\\s+(?:в|во|into)\\s+${NAME}`, 'iu'),
          1,
          0,
          head,
        );
      if (pair && !isVocab(pair.value)) {
        const into = grab(
          s,
          new RegExp(`(?:into|onto|->|→|با|به|تو|توی|روی|в|во)\\s+(${NAME})`, 'iu'),
          1,
          pair.end,
          head,
        );
        if (into && !isLittle(into.value)) {
          out.branch = take(pair);
          out.base = take(into);
        }
      }
    }
    // Two refs compared: "compare A with B", "difference between A and B", "A that isn't in B".
    if (o === 'commit' && v === 'compare') {
      const WITH = String.raw`with|to|and|vs\.?|versus|against|با|و|с|и|mit|avec|con|ile|和|与`;
      const two = grab(s, new RegExp(`(${NAME})\\s+(?:${WITH})\\s+${NAME}`, 'iu'), 1, 0, head);
      if (two && !isVocab(two.value)) {
        const b = grab(s, new RegExp(`(?:${WITH})\\s+(${NAME})`, 'iu'), 1, two.end, head);
        if (b && !isVocab(b.value)) {
          out.ref = take(two);
          out.base = take(b);
        }
      }
      if (!out.ref) {
        const [a, b] = leftovers(s, taken);
        if (a && b) {
          out.ref = take(a);
          out.base = take(b);
        }
      }
    }
    // "branch X", "X branch", "برنچ X", "ветку X", "a branch called X".
    if (!out.branch && wants.has('branch')) {
      const CALLED = String.raw`called|named|به\s+اسم|به\s+نام|под\s+названием|с\s+именем`;
      const named =
        grab(
          s,
          new RegExp(
            `${B}(?:${BRANCH_WORD})[\\p{L}]*\\s+(?:(?:${CALLED})\\s+)?(?:جدید\\s+)?(?:(?:${CALLED})\\s+)?(${NAME})`,
            'iu',
          ),
          1,
          0,
          head,
        ) ??
        grab(s, new RegExp(`(?:${CALLED})\\s+(${NAME})`, 'iu'), 1, 0, head) ??
        grab(s, new RegExp(`(${NAME})\\s+(?:${BRANCH_WORD})${E}`, 'iu'), 1, 0, head);
      if (named && !isLittle(named.value) && !isTaken(named)) out.branch = take(named);
    }
    // A pull request "from dark-mode", "for my-fix", "از dark-mode", "из dark-mode", "для my-fix".
    if (o === 'pr' && v === 'create' && !out.branch) {
      const src = grab(
        s,
        new RegExp(
          `${B}(?:from|for|off|از|برای|واسه|из|для|von|de|da|desde)\\s+(?:(?:${BRANCH_WORD})[\\p{L}]*\\s+)?(${NAME})`,
          'iu',
        ),
        1,
        0,
        head,
      );
      if (src && !isLittle(src.value) && !isTaken(src)) out.branch = take(src);
    }
    // A new base: "change the base of PR 22 to develop", "بیس ... به develop", "базу на develop".
    if (o === 'pr' && v === 'edit' && !out.base) {
      const base = grab(
        s,
        new RegExp(
          `(?:base|target|بیس|مقصد|базу|базовую ветку|целевую ветку)[^\\n]*?\\s(?:to|به|на|в)\\s+(${NAME})`,
          'iu',
        ),
        1,
        0,
        head,
      );
      if (base && !isLittle(base.value)) out.base = take(base);
    }
    // A branch-shaped name is the branch of a push, a pull, a switch, whatever words are around it.
    if (
      !out.branch &&
      wants.has('branch') &&
      (o === 'local' || (o === 'branch' && v !== 'rename' && v !== 'create'))
    ) {
      const shaped = leftovers(s, taken).find((f) => looksLikeBranch(f.value));
      if (shaped) out.branch = take(shaped);
    }
    // A new branch "off develop as experiment", "از main", "от main".
    if (o === 'branch' && v === 'create') {
      if (!out.ref) {
        const src = grab(
          s,
          new RegExp(`${B}(?:from|off|based on|از|от|из|von|de|da|desde)\\s+(${NAME})`, 'iu'),
          1,
          0,
          head,
        );
        if (src && !isLittle(src.value) && !isTaken(src)) out.ref = take(src);
      }
      if (!out.branch) {
        const as = grab(s, new RegExp(`${B}(?:as|в|به\\s+اسم)\\s+(${NAME})`, 'iu'), 1, 0, head);
        if (as && !isLittle(as.value) && !isTaken(as)) out.branch = take(as);
      }
    }
    // "switch to main", "push to develop", "on main", "رو main", "на develop", "a develop".
    if (!out.branch && wants.has('branch') && !(o === 'branch' && v === 'rename')) {
      const onto = grab(
        s,
        new RegExp(
          `${B}(?:to|on|onto|into|in|رو|روی|به|تو|на|в|auf|zu|sur|a|su|para|em|üzerinde|على|到)\\s+(?:(?:${BRANCH_WORD})[\\p{L}]*\\s+)?(${NAME})`,
          'iu',
        ),
        1,
        0,
        head,
      );
      if (
        onto &&
        !isVocab(onto.value) &&
        !isTaken(onto) &&
        (looksLikeBranch(onto.value) || o === 'branch' || o === 'local')
      )
        out.branch = take(onto);
    }
  }

  // -------------------------------------------------- versions, commits, files
  if (wants.has('tag')) {
    const ver = s.items.find((i) => i.kind === 'version' && !isTaken(i));
    if (ver) out.tag = take(ver);
    else {
      const named = grab(
        s,
        new RegExp(`${B}(?:tag|release|تگ|ریلیز|тег|релиз)[\\p{L}]*\\s+(${NAME})`, 'iu'),
        1,
        0,
        head,
      );
      if (named && !isVocab(named.value)) out.tag = take(named);
    }
  }
  if (wants.has('ref') && !out.ref) {
    const sha = s.items.find((i) => i.kind === 'sha');
    const ver = s.items.find((i) => i.kind === 'version' && !isTaken(i));
    const remote = s.items.find((i) => i.kind === 'path' && /^(origin|upstream)\//.test(i.value));
    const ref = take(sha ?? remote ?? (o === 'file' || o === 'local' ? ver : undefined));
    if (ref) out.ref = ref;
  }
  if (wants.has('path')) {
    const file =
      s.items.find((i) => i.kind === 'file') ??
      s.items.find(
        (i) =>
          i.kind === 'path' &&
          !isTaken(i) &&
          (/^[~.]/.test(i.value) || /\.\w{1,6}$/.test(i.value) || i.value.split('/').length > 2),
      );
    if (file) out.path = take(file);
  }

  // -------------------------------------------------- people
  if (wants.has('people')) readPeople(s, action, out, taken, head);

  // -------------------------------------------------- labels and colours
  if (wants.has('colour')) {
    const c = colourOf(s);
    if (c) out.colour = take(c);
  }
  if (wants.has('labels')) {
    const L = String.raw`((?:${SPAN}+|"[^"]+"|[\p{L}\p{N}][\p{L}\p{N}:._/-]*)(?:\s*(?:,|،|\+|and|و|и)\s*(?:${SPAN}+|"[^"]+"|[\p{L}\p{N}][\p{L}\p{N}:._/-]*))*)`;
    const cues = [
      new RegExp(
        `${B}(?:${LABEL_WORD})[\\p{L}]*\\s*[:：]?\\s+(?:(?:called|named|به\\s+اسم|под\\s+названием)\\s+)?${L}`,
        'iu',
      ),
      new RegExp(`${B}(?:the\\s+)?${L}\\s+(?:${LABEL_WORD})${E}`, 'iu'),
      new RegExp(
        `(?:\\bas\\s+(?:an?\\s+)?|\\bwith\\s+|как\\s+|label\\s+it\\s+|tag\\s+it\\s+|mark\\s+it\\s+)${L}`,
        'iu',
      ),
      new RegExp(`(?:called|named|به\\s+اسم)\\s+${L}`, 'iu'),
      new RegExp(`${B}${L}\\s+نیست`, 'iu'),
    ];
    for (const re of cues) {
      const f = grab(s, re, 1, 0, head);
      if (!f) continue;
      const names = listOf(f.value).filter(
        (n) =>
          !isLittle(n) &&
          !/^(label|labels|tag|لیبل|برچسب|метк\p{L}*|pr|prs|mr|issue|ticket|ایشو|задач\p{L}*|пр)$/iu.test(
            n,
          ) &&
          n !== out.colour &&
          !/^(to|on|in|from|it|به|روی|رو|از|в|на|с)$/i.test(n),
      );
      if (!names.length) continue;
      out.labels = names;
      taken.push(f);
      break;
    }
    // A quoted label: «good first issue».
    if (!out.labels && (o === 'label' || v === 'label' || v === 'unlabel') && s.quoted[0])
      out.labels = [s.quoted[0]];
  }

  // -------------------------------------------------- numbers, states, filters
  if (wants.has('number')) {
    const n = numberOf(s);
    if (n) out.number = n;
  }
  if (wants.has('count')) {
    const c = countOf(s);
    if (c) out.count = c;
  }
  if (wants.has('state')) {
    const st = stateOf(s, action);
    if (st) out.state = st;
  }
  if (wants.has('mine') && anyOf(MINE, s.work)) out.mine = true;
  if (wants.has('author')) {
    const a =
      grab(s, /\b(?:by|from|author|di|von|par)\s+@?([\w.-]+)/iu, 1, 0, head) ??
      grab(s, /(?:توسط)\s+([\p{L}\w.-]+)/iu, 1, 0, head) ??
      grab(
        s,
        /([\w.-]+)\s+(?:زده|ساخته|باز\s+کرده|کامیت\s+کرده|این\s+اواخر|نوشته)/iu,
        1,
        0,
        head,
      ) ??
      grab(s, /(?:коммитил|закоммитил|сделал|открыл)\s+@?([\w.-]+)/iu, 1, 0, head) ??
      grab(s, /\b(?:what did|what has)\s+@?([\w.-]+)\s+(?:commit|push|do)/iu, 1, 0, head);
    if (a && !isVocab(a.value) && !looksLikeBranch(a.value)) out.author = take(a);
  }
  if (wants.has('milestone')) readMilestone(s, action, out, taken, head);
  if (wants.has('provider')) {
    const p = /github|گیت\s*هاب|гитхаб/iu.test(s.work)
      ? 'github'
      : /gitlab|گیت\s*لب|гитлаб/iu.test(s.work)
        ? 'gitlab'
        : /gitea|forgejo|گیتی|гити/iu.test(s.work)
          ? 'gitea'
          : undefined;
    if (p) out.provider = p;
  }
  if (wants.has('host')) {
    const h = /(?<![\w.@])((?:[a-z0-9-]+\.)+[a-z]{2,})(?![\w.])/i.exec(s.raw)?.[1];
    if (h && !/\.(md|ts|js|json|ya?ml|py|go|rs)$/i.test(h)) out.host = h;
    else if (out.provider === 'github') out.host = 'github.com';
    else if (out.provider === 'gitlab') out.host = 'gitlab.com';
  }
  if (wants.has('query')) {
    const q =
      s.quoted[0] ??
      grab(
        s,
        /\b(?:search(?:\s+the\s+code(?:base)?)?\s+for|look\s+for|grep|find)\s+(.+?)(?:\s+(?:in|across)\s+(?:the\s+)?\S+)?$/iu,
      )?.value ??
      grab(s, /\bwhere\s+is\s+(.+?)\s+(?:used|defined|called|set)/iu)?.value ??
      grab(s, /(?:دنبال)\s+(.+?)\s+(?:بگرد|بگردی)/u)?.value ??
      grab(s, /^(.+?)\s+(?:کجا|کجای|کجاها|کجاهای)/u)?.value ??
      grab(s, /(?:найди|ищи|поиск(?:\s+по\s+коду)?|грепни)\s+(.+?)(?:\s+в\s+\S+)?$/iu)?.value ??
      grab(s, /(?:где\s+в\s+коде)\s+(.+)$/iu)?.value ??
      grab(s, /\b(?:about|mentioning|containing)\s+(.+)$/iu)?.value ??
      grab(
        s,
        /\bwhere\s+(?:do|does|did)\s+(?:we|i|you|it)\s+(?:use|call|define|set)\s+(.+?)(?:\s+in\s+\S+)?$/iu,
      )?.value ??
      grab(s, /^(.+?)\s+(?:رو|را)\s+(?:تو|توی|در)\s+(?:کد|سورس)/u)?.value ??
      grab(s, /(?:тексте?|коде?)\s+(.+)$/iu)?.value ??
      (v === 'search' ? s.tail || undefined : undefined);
    const fallback =
      !q && v === 'search'
        ? leftovers(s, taken, false).find(
            (f) => !isLittle(f.value) && !/^(code|کد|код)$/i.test(f.value),
          )?.value
        : undefined;
    if (fallback) out.query = fallback;
    if (q && (v === 'search' || /about|mentioning|containing|درباره|про/iu.test(s.work))) {
      out.query = q.replace(/^(?:the\s+)?(?:code\s+)?for\s+/i, '').trim();
      const at = s.raw.indexOf(out.query);
      if (at >= 0) taken.push({ value: out.query, start: at, end: at + out.query.length });
    }
  }
  if (wants.has('draft') && /\bdraft\b|پیش\s*نویس|درفت|черновик|черновой/iu.test(s.work))
    out.draft = true;
  if (
    wants.has('force') &&
    /--force|\s-f\b|\bforce|\bhard\b|به\s*زور|فورس|هارد|принудительно|форс|хард/iu.test(s.work)
  )
    out.force = true;
  if (wants.has('private') && /\bprivate\b|خصوصی|پرایوت|приватн/iu.test(s.work)) out.private = true;
  if (wants.has('method')) {
    if (/squash|اسکوآش|اسکواش|сквош/iu.test(s.work)) out.method = 'squash';
    else if (/rebase|ریبیس|ребейз/iu.test(s.work) && v === 'merge') out.method = 'rebase';
  }

  // -------------------------------------------------- words: titles, bodies, messages
  // "update the description of #5: …" changes the body, not the title.
  const describes = /description|body|توضیحات|توضیح|شرح|описание|beschreibung/iu.test(
    s.work.slice(0, s.tailAt),
  );
  if (o === 'branch' && v === 'rename') readRename(s, out, taken);
  else if (v === 'edit' && describes && o !== 'label') {
    const body = s.quoted.length ? s.quoted.join(' ') : s.tail;
    if (body) out.body = body;
  } else if (wants.has('title') && !out.title) {
    const title =
      v === 'rename' || v === 'edit'
        ? (s.quoted[0] ??
          grab(s, /\b(?:to|as)\s+(.+)$/iu, 1, 0, head)?.value ??
          grab(s, /(?:بکن|بذار|بزار|کن\s+به)\s+(.+?)(?:\s+(?:کن|بذار))?$/u, 1, 0, head)?.value ??
          grab(s, /\s(?:в|на)\s+(.+)$/iu, 1, 0, head)?.value ??
          (s.tail || undefined))
        : (s.quoted[0] ??
          grab(
            s,
            /(?:titled|called|with the title|با\s+عنوان|с\s+заголовком|под\s+названием)\s+(.+)$/iu,
            1,
            0,
            head,
          )?.value ??
          (s.tail || undefined));
    if (title) out.title = title.replace(/^["«“']|["»”']$/g, '').trim();
  }
  if (wants.has('body') && !out.body) {
    const local = o === 'local' || o === 'tag';
    const msg = local
      ? messageOf(s, String.raw`as|как|بگو|بنویس|با\s+اسم|с\s+названием`)
      : v === 'comment'
        ? (messageOf(s) ??
          grab(s, /\b(?:that|saying)\s+(.+)$/iu)?.value ??
          grab(s, /(?:که|بگو)\s+(.+)$/u)?.value)
        : action.needs.includes('body') || v === 'close' || v === 'merge' || v === 'approve'
          ? messageOf(s)
          : s.quoted.length
            ? s.quoted.join(' ')
            : s.tail || undefined;
    if (msg && msg !== out.title) out.body = msg.replace(/^["«“']|["»”']$/g, '').trim();
  }
  if (action.id === 'local.remote-add') {
    const name =
      grab(s, /(?:remote|ریموت|ремоут)\s+([a-z][\w-]*)/iu) ?? grab(s, /\b(origin|upstream)\b/iu);
    if (name && !/^(add|اضافه)$/i.test(name.value)) out.title = name.value;
  }

  // -------------------------------------------------- what is left: the repository, the branch
  if (wants.has('repo') && !out.repo) readRepo(s, action, out, taken, head);
  const primaryBranch =
    (o === 'branch' && v !== 'list') ||
    (o === 'local' && ['push', 'pull', 'merge', 'rebase'].includes(v)) ||
    ((o === 'ci' || o === 'commit') && v !== 'show' && v !== 'compare');
  if (wants.has('branch') && !out.branch && primaryBranch) {
    const rest = leftovers(s, taken);
    const b =
      rest.find((f) => looksLikeBranch(f.value)) ??
      (o === 'branch' || o === 'local' ? rest[0] : undefined);
    if (b) out.branch = take(b);
  }
  if (wants.has('repo') && !out.repo) {
    // A leftover name is a repository only where nothing else could be.
    const r = leftovers(s, taken).find((f) => !looksLikeBranch(f.value));
    const anywhere = [
      'list',
      'clone',
      'fork',
      'star',
      'unstar',
      'delete',
      'show',
      'create',
      'read',
      'search',
    ];
    if (
      r &&
      (o === 'repo' ||
        o === 'member' ||
        o === 'notification' ||
        o === 'code' ||
        o === 'label' ||
        o === 'release' ||
        o === 'milestone' ||
        v === 'list') &&
      anywhere.concat(o === 'repo' ? [] : ['create', 'edit', 'delete', 'close']).includes(v)
    )
      out.repo = take(r);
  }
  if (wants.has('labels') && !out.labels && (o === 'label' || v === 'label' || v === 'unlabel')) {
    const l = leftovers(s, taken, false).find(
      (f) => f.value !== out.colour && f.value !== out.repo,
    );
    if (l) out.labels = [take(l) as string];
  }
  if (wants.has('milestone') && !out.milestone && o === 'milestone') {
    const m = leftovers(s, taken)[0];
    if (m) out.milestone = take(m);
  }
  if (action.id === 'local.merge' && !out.branch && out.base) {
    out.branch = out.base;
    delete out.base;
  }
  if (action.id === 'repo.clone' && out.path && out.path === out.repo) delete out.path;
  return clean(out);
}

function readPeople(
  s: Spans,
  action: GitAction,
  out: GitSlots,
  taken: Found[],
  head: number,
): void {
  const people: string[] = s.items.filter((i) => i.kind === 'mention').map((i) => i.value);
  if (
    /\b(?:assign\s+(?:it\s+)?to\s+me|to\s+myself|take\s+it|i'?ll\s+take|take\s+me\s+off)\b|به\s+خودم|به\s+من\s+(?:بده|اساین)|منو\s+(?:اساین|مسئول|از)|на\s+меня|на\s+себя|возьму|меня\s+с/iu.test(
      s.work,
    )
  )
    people.push('@me');
  if (!people.length) {
    const P = String.raw`([\p{L}\p{N}][\p{L}\p{N}._-]*(?:\s*(?:,|،|and|و|и)\s*[\p{L}\p{N}][\p{L}\p{N}._-]*)*)`;
    const v = action.verb;
    const cues: RegExp[] =
      v === 'request-review' || (action.object === 'pr' && v === 'create')
        ? [
            new RegExp(`${B}(?:ask|get|have|from|by|попроси|از)\\s+${P}`, 'iu'),
            new RegExp(
              `${P}\\s+(?:to\\s+review|to\\s+look|review\\s+(?:it|this)|ریویو\\s+کنه|هم\\s+یه\\s+نگاه|یه\\s+نگاه|посмотрел)`,
              'iu',
            ),
            new RegExp(`(?:ریویو(?:\\s+رو)?\\s+بده|ревьюером|reviewer)\\s+${P}`, 'iu'),
            new RegExp(`${P}\\s+(?:رو|را)\\s+ریویوئر`, 'iu'),
            new RegExp(`(?:назначь)\\s+${P}\\s+ревьюером`, 'iu'),
          ]
        : v === 'unassign'
          ? [
              new RegExp(`(?:unassign|remove|take|drop)\\s+${P}\\s+(?:from|off)`, 'iu'),
              new RegExp(`${B}${P}\\s+(?:رو|را)\\s+از`, 'iu'),
              new RegExp(`${B}${P}\\s+دیگه\\s+مسئول`, 'iu'),
              new RegExp(`(?:сними|убери)\\s+${P}\\s+с`, 'iu'),
              new RegExp(`(?:unassign)\\s+${P}`, 'iu'),
            ]
          : [
              new RegExp(`(?:make|set)\\s+${P}\\s+(?:the\\s+)?(?:assignee|owner)`, 'iu'),
              new RegExp(`(?:assign|اساین\\s+کن|назначь)\\s+${P}\\s+(?:to|به|на)\\s`, 'iu'),
              new RegExp(
                `${B}(?:${TO_PERSON}|بده\\s+به|بسپار\\s+به|отдай|поручи|назначь\\s+на|передай)\\s+${P}`,
                'iu',
              ),
              new RegExp(`${P}\\s+(?:should|can|will)\\s+(?:take|handle)`, 'iu'),
              new RegExp(`${B}${P}\\s+(?:رو|را)\\s+(?:اساین|مسئول)`, 'iu'),
              new RegExp(`مال\\s+${P}`, 'iu'),
              new RegExp(`${B}${P}(?:ست|است)(?![\\p{L}])`, 'iu'),
            ];
    for (const re of cues) {
      const f = grab(s, re, 1, 0, head);
      if (!f) continue;
      const names = listOf(f.value)
        .map((n) => n.replace(/(?<=[اوی])ست$/u, ''))
        .filter(
          (n) =>
            !isLittle(n) &&
            !/^\d+$/.test(n) &&
            !looksLikeBranch(n) &&
            !/^(pr|mr|issue|it|review)$/i.test(n),
        );
      if (!names.length) continue;
      people.push(...names);
      taken.push(f);
      break;
    }
  }
  if (people.length) out.people = [...new Set(people.map((p) => p.replace(/^@(?!me$)/, '')))];
}

function readMilestone(
  s: Spans,
  action: GitAction,
  out: GitSlots,
  taken: Found[],
  head: number,
): void {
  readMilestoneNamed(s, out, taken, head);
  if (out.milestone || action.id !== 'issue.milestone') return;
  // "move #3 to v1.0", "#3 رو ببر تو beta", "перенеси #3 в beta".
  const to = grab(
    s,
    new RegExp(`${B}(?:to|into|for|تو|توی|به|در|в|во|на)\\s+(${NAME}(?:\\s+\\d+)?)`, 'iu'),
    1,
    0,
    head,
  );
  if (to && !isLittle(to.value)) {
    out.milestone = to.value;
    taken.push(to);
  }
}

function readMilestoneNamed(s: Spans, out: GitSlots, taken: Found[], head: number): void {
  const ms = grab(
    s,
    new RegExp(
      `${B}(?:milestone|sprint|مایلستون|مایل\\s+استون|اسپرینت|вех[\\p{L}]*|майлстоун[\\p{L}]*|милстоун[\\p{L}]*|спринт[\\p{L}]*)\\s*[:：]?\\s+(?:(?:called|named|به\\s+اسم|под\\s+названием|جدید)\\s+)?((?:${NAME})(?:\\s+(?:${SPAN}+|launch|release|beta|alpha|q\\d))?)`,
      'iu',
    ),
    1,
    0,
    head,
  );
  if (ms && !isVocab(ms.value)) {
    const before = s.work.slice(Math.max(0, ms.start - 8), ms.start);
    // "sprint 5": the word is part of the name.
    out.milestone =
      /sprint\s*$/i.test(before) && /^\d+$/.test(ms.value) ? `sprint ${ms.value}` : ms.value;
    taken.push(ms);
    return;
  }
  const called = grab(
    s,
    /(?:called|named|به\s+اسم|под\s+названием)\s+(.+?)(?:\s+(?:in|در|تو|توی|в)\s+\S+)?$/iu,
    1,
    0,
    head,
  );
  if (called) {
    out.milestone = called.value;
    taken.push(called);
  }
}

function readRename(s: Spans, out: GitSlots, taken: Found[]): void {
  const named = grab(s, new RegExp(`(?:${BRANCH_WORD})[\\p{L}]*\\s+(${NAME})`, 'iu'));
  const before =
    grab(
      s,
      new RegExp(`(${NAME})\\s+(?:(?:${BRANCH_WORD})[\\p{L}]*\\s+)?(?:to|в|на)\\s+${NAME}`, 'iu'),
    ) ?? grab(s, new RegExp(`(${NAME})\\s+(?:رو|را)\\s+`, 'iu'));
  const from =
    named && !isLittle(named.value)
      ? named
      : before && !isLittle(before.value)
        ? before
        : undefined;
  if (from) {
    out.branch = from.value;
    taken.push(from);
  }
  const to =
    grab(s, new RegExp(`(?:to|в|на|به|بکن|بذار)\\s+(${NAME})\\s*$`, 'iu')) ??
    grab(s, new RegExp(`(?:to|в|на|به|بکن|بذار)\\s+(${NAME})`, 'iu'), 1, from?.end ?? 0);
  if (to && !isLittle(to.value) && to.value !== out.branch) out.title = to.value;
}

function readRepo(s: Spans, action: GitAction, out: GitSlots, taken: Found[], head: number): void {
  const isTaken = (f: { start: number }): boolean => taken.some((t) => t.start === f.start);
  const ok = (f: Found | undefined): f is Found =>
    Boolean(f) &&
    !isVocab((f as Found).value) &&
    !isTaken(f as Found) &&
    !looksLikeBranch((f as Found).value);
  const said =
    grab(
      s,
      new RegExp(
        `${B}(?:${REPO_WORD})[\\p{L}]*\\s*[:：]?\\s+(?:(?:called|named|به\\s+اسم)\\s+)?(${NAME})`,
        'iu',
      ),
      1,
      0,
      head,
    ) ?? grab(s, new RegExp(`(${NAME})\\s+(?:${REPO_WORD})${E}`, 'iu'), 1, 0, head);
  const path = s.items.find(
    (i) =>
      i.kind === 'path' &&
      /^[\w.-]+\/[\w.-]+$/.test(i.value) &&
      !looksLikeBranch(i.value) &&
      !isTaken(i),
  );
  const end = grab(
    s,
    new RegExp(
      `${B}(?:in|on|for|at|of|from|under|в|во|из|у|im|dans|en|no|na|nel|del|do|da|في|在)\\s+(?:the\\s+)?([A-Za-z][\\w.-]*)(?:\\s+(?:repo|repository|project))?\\s*(?:$|[,،?!.]|\\s(?:and|و|и|but|with|using|via|then|please|pls|as|by|from|into|to|onto|без|с|и|با|و)(?:\\s|$))`,
      'iu',
    ),
    1,
    0,
    head,
  );
  const owned = grab(s, /(?<![\p{L}])([A-Za-z][\w.-]*)'s\s/iu, 1, 0, head);
  const fa = grab(
    s,
    /(?:تو|توی|در|روی|واسه|برای)\s+(?:پروژه(?:ی)?\s+)?([A-Za-z][\w.-]*)/iu,
    1,
    0,
    head,
  );
  const strong = (f: Found | undefined): f is Found =>
    Boolean(f) &&
    !isLittle((f as Found).value) &&
    !isTaken(f as Found) &&
    !looksLikeBranch((f as Found).value);
  const repo = [said].find(strong) ?? [path, end, fa, owned].find(ok);
  if (repo) {
    out.repo = repo.value;
    taken.push(repo);
    return;
  }
  // In a Persian or Russian sentence, a Latin name nothing else claims is its repository:
  // "ایشوهای باز web", "اعضای grimstroke", "участники grimstroke".
  if (/[؀-ۿЀ-ӿ]/u.test(s.raw) && action.object !== 'branch' && action.object !== 'local') {
    const r = leftovers(s, taken).find(
      (f) => !looksLikeBranch(f.value) && !/^(pr|mr|ci|prs|mrs)$/i.test(f.value),
    );
    if (r) {
      out.repo = r.value;
      taken.push(r);
    }
  }
}

function clean(out: GitSlots): GitSlots {
  for (const k of Object.keys(out) as Array<keyof GitSlots>)
    if (out[k] === undefined || out[k] === '') delete out[k];
  return out;
}

/** Whether the sentence says "it", "that one", "همون": the thing talked about last. */
export function saysThat(raw: string): boolean {
  return anyOf(THAT, fold(raw).toLowerCase());
}

/** Whether the sentence says here or there: "locally", "on github". */
export function placeSaid(raw: string): 'local' | 'remote' | undefined {
  const t = fold(raw).toLowerCase();
  if (anyOf(REMOTE_CUE, t)) return 'remote';
  if (anyOf(LOCAL_CUE, t)) return 'local';
  return undefined;
}
