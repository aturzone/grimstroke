/**
 * Sentences to teach the git model with (src/box/git/model.ts), and the git share of the shape
 * model's sentences (tools/shape-data.ts), in the languages of src/box/git/words.ts.
 *
 * Templates in a small notation, expanded with a seeded random choice so the set is the same on
 * every run:
 *
 *   [a|b|]      one of a, b or nothing
 *   {n}         an issue's or pull request's number, as 12, #12, or in Persian digits
 *   {in}        "in web", "توی ریپوی api", "в репозитории web" -- or nothing
 *   {iss} {pr}  the words for an issue and a pull request, in the template's language
 *   {who} {lab} {br} {base} {tag} {sha} {path} {msg} {title} {q} {ms} {k} {prov} {fault}
 *
 * The trainer holds whole templates out, never single sentences, so the accuracy it reports is on
 * phrasings it never saw. The honest number is a different one: tests/box/git/corpus.json, written
 * by someone who never saw these templates, which nothing here is drawn from.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GitObject } from '@core/box/git/actions.ts';
import type { VerbClass } from '@core/box/git/model.ts';

export interface GitExample {
  text: string;
  verb: VerbClass;
  object: GitObject;
  /** action id (or other:object) / language / index: what is held out together. */
  template: string;
  lang: string;
  /** Git said in a word or two (tools/git-gate.json): taught to the git model, and to the gate apart. */
  terse: boolean;
}

type Lang = 'en' | 'fa' | 'ru' | 'de' | 'fr' | 'es' | 'pt' | 'it' | 'tr' | 'ar' | 'zh';
type Says = Partial<Record<Lang, string[]>>;

// ---------------------------------------------------------------- fillers

const FILL: Record<string, Partial<Record<Lang | '*', string[]>>> = {
  repo: {
    '*': [
      'web',
      'api',
      'grimstroke',
      'aturzone/grimstroke',
      'acme/web',
      'infra',
      'mobile-app',
      'team/backend',
      'docs-site',
      'core',
    ],
  },
  in: {
    en: [
      '',
      '',
      ' in {repo}',
      ' on {repo}',
      ' in the {repo} repo',
      ' for {repo}',
      ' in {repo}',
      ' at {repo}',
      ' over in {repo}',
    ],
    fa: [
      '',
      '',
      ' توی {repo}',
      ' تو ریپوی {repo}',
      ' در {repo}',
      ' روی {repo}',
      ' توی پروژه {repo}',
      ' واسه {repo}',
      ' ریپوی {repo}',
    ],
    ru: [
      '',
      '',
      ' в {repo}',
      ' в репозитории {repo}',
      ' в репо {repo}',
      ' на {repo}',
      ' в проекте {repo}',
    ],
    de: ['', ' im repo {repo}', ' in {repo}'],
    fr: ['', ' dans {repo}', ' sur {repo}'],
    es: ['', ' en {repo}', ' del repo {repo}'],
    pt: ['', ' no {repo}', ' em {repo}'],
    it: ['', ' in {repo}', ' nel repo {repo}'],
    tr: ['', ' {repo} reposunda', ' {repo} içinde'],
    ar: ['', ' في {repo}', ' في مستودع {repo}'],
    zh: ['', '在{repo}', '{repo}仓库里'],
  },
  iss: {
    en: ['issue', 'issue', 'bug', 'ticket', 'task'],
    fa: ['ایشو', 'ایشو', 'ایشوی', 'باگ', 'تیکت', 'تسک'],
    ru: ['задачу', 'issue', 'ишью', 'баг', 'тикет', 'задачу номер'],
    de: ['issue', 'ticket'],
    fr: ['issue', 'ticket'],
    es: ['issue', 'incidencia'],
    pt: ['issue', 'chamado'],
    it: ['issue', 'ticket'],
    tr: ['issue', 'kayıt'],
    ar: ['المشكلة', 'التذكرة'],
    zh: ['问题', '工单'],
  },
  pr: {
    en: ['pr', 'PR', 'pull request', 'MR', 'merge request', 'PR'],
    fa: ['پی ار', 'PR', 'پول ریکوئست', 'مرج ریکوئست', 'MR', 'پی‌ار'],
    ru: ['пр', 'PR', 'пул-реквест', 'пулл реквест', 'MR', 'мерж-реквест'],
    de: ['PR', 'pull request', 'merge request'],
    fr: ['PR', 'pull request', 'merge request'],
    es: ['PR', 'pull request'],
    pt: ['PR', 'pull request'],
    it: ['PR', 'pull request'],
    tr: ['PR', 'pull request'],
    ar: ['طلب الدمج', 'PR'],
    zh: ['合并请求', 'PR'],
  },
  who: {
    en: ['sina', 'rend', 'moein', 'alex', 'maria', '@sina', '@rend', 'john', 'priya'],
    fa: ['سینا', 'رند', 'معین', 'علی', 'sina', '@moein', 'مریم', 'رضا'],
    ru: ['sina', '@rend', 'Саше', 'Пете', 'moein', 'Ивану', 'Оле'],
    '*': ['sina', '@rend', 'moein'],
  },
  lab: {
    en: [
      'bug',
      'ui',
      'backend',
      'docs',
      'priority-high',
      'good first issue',
      'mobile',
      'performance',
      'needs-triage',
    ],
    fa: ['باگ', 'bug', 'ui', 'فوری', 'فرانت', 'backend', 'مستندات', 'موبایل'],
    ru: ['баг', 'bug', 'ui', 'срочно', 'backend', 'docs', 'mobile'],
    '*': ['bug', 'ui', 'docs'],
  },
  br: {
    '*': [
      'fix/login',
      'feature/export',
      'develop',
      'hotfix-12',
      'release/1.2',
      'my-branch',
      'feat/dark-mode',
      'bugfix/upload',
      'experiment',
      'wip-search',
    ],
  },
  base: { '*': ['main', 'master', 'develop', 'staging', 'main', 'main'] },
  tag: { '*': ['v1.2.0', 'v0.8.0', '2.0.0', 'v3.1', 'v0.7.1', '1.0.0-beta.1'] },
  sha: { '*': ['a1b2c3d', '9f8e7d6', '4e5f6a7b', 'c0ffee1', '3b7d2e9', 'e83c5163'] },
  path: {
    '*': [
      'src/app.ts',
      'README.md',
      'package.json',
      'docs/api.md',
      'src/box/issue.ts',
      'Dockerfile',
      'index.html',
    ],
  },
  msg: {
    en: [
      'fixed in the last build',
      'thanks, looking into it',
      'can you add a screenshot?',
      'this is a duplicate of #4',
      'works for me now',
      'fix login redirect',
      'update readme',
      'add export button',
      'wip',
    ],
    fa: [
      'تو بیلد آخر درست شد',
      'ممنون، دارم بررسی میکنم',
      'میشه اسکرین شات بذاری؟',
      'این تکراریه',
      'الان درسته',
      'رفع باگ ورود',
      'آپدیت ریدمی',
      'اضافه کردن دکمه خروجی',
    ],
    ru: [
      'исправлено в последней сборке',
      'спасибо, смотрю',
      'можешь приложить скриншот?',
      'это дубликат',
      'теперь работает',
      'фикс логина',
      'обновил readme',
    ],
    '*': ['fixed', 'thanks', 'wip'],
  },
  title: {
    en: [
      'login fails on safari',
      'export as pdf',
      'dark mode for settings',
      'faster search',
      'fix upload size limit',
    ],
    fa: ['ورود در سافاری کار نمیکنه', 'خروجی پی دی اف', 'حالت تاریک تنظیمات', 'جستجوی سریعتر'],
    ru: ['вход не работает в safari', 'экспорт в pdf', 'тёмная тема', 'быстрый поиск'],
    '*': ['login fails', 'export pdf'],
  },
  q: {
    en: ['parseIssue', 'TODO', 'login redirect', 'useEffect', 'api key', 'deprecated'],
    fa: ['parseIssue', 'TODO', 'login', 'api key'],
    ru: ['parseIssue', 'TODO', 'login', 'api key'],
    '*': ['TODO'],
  },
  ms: { '*': ['v1.0', 'sprint 12', 'Q4', 'beta', 'v2', 'october'] },
  k: { '*': ['5', '10', '3', '20'] },
  prov: {
    en: ['github', 'gitlab', 'gitea', 'GitHub', 'my gitlab'],
    fa: ['گیت هاب', 'گیتهاب', 'گیت لب', 'github', 'gitlab', 'گیتی'],
    ru: ['гитхаб', 'github', 'гитлаб', 'gitlab', 'gitea'],
    '*': ['github', 'gitlab'],
  },
  fault: {
    en: [
      'the export button crashes on large boards',
      'login does nothing on safari',
      'the sidebar overlaps content on phones',
      'search ignores persian words',
      'notifications arrive twice',
      'saving returns a 500',
      'the date picker shows the wrong month',
      'memory leak after an hour',
    ],
    fa: [
      'دکمه خروجی رو بردهای بزرگ کرش میکنه',
      'ورود تو سافاری کار نمیکنه',
      'سایدبار رو گوشی میره رو متن',
      'جستجو کلمات فارسی رو پیدا نمیکنه',
      'نوتیفیکیشن ها دوبار میان',
      'ذخیره ارور ۵۰۰ میده',
      'تقویم ماه اشتباه نشون میده',
    ],
    ru: [
      'кнопка экспорта падает на больших досках',
      'вход не работает в safari',
      'сайдбар налезает на текст на телефоне',
      'поиск не находит русские слова',
      'уведомления приходят дважды',
      'сохранение выдаёт 500',
    ],
    de: ['der login funktioniert nicht', 'die app stürzt beim öffnen ab', 'speichern geht nicht'],
    fr: ['la connexion ne marche pas', "l'application plante au démarrage"],
    es: ['el login no funciona', 'la app se cuelga al abrir'],
    pt: ['o login não funciona', 'o app trava ao abrir'],
    it: ['il login non funziona', "l'app si blocca all'avvio"],
    tr: ['giriş çalışmıyor', 'uygulama açılırken çöküyor'],
    ar: ['تسجيل الدخول لا يعمل', 'التطبيق يتعطل عند الفتح'],
    zh: ['登录无法使用', '应用打开时崩溃'],
  },
};

// ---------------------------------------------------------------- what is said

/**
 * Per action: how it is said, language by language. Keys are action ids, or `other:<object>`
 * for things said about git that are none of them.
 */
export const SAYS: Record<string, Says> = {
  // ------------------------------------------------------------ issues
  'issue.create': {
    en: [
      '[create|make|open|file|raise|add|log] [an|a new|a] {iss}{in}[: | for | about | that says ]{fault}',
      '[new issue|bug|issue|ticket|feature request][:| -] {fault}{in}',
      '{fault}[, | - ][file it|log it|make an issue|open a ticket|put it]{in}',
      '{fault}{in}',
      '[can you|could you|please] [open|make|file] [an issue|a bug|a ticket]{in} [for|about] {fault}',
      'bug: {fault}, label {lab}{in}',
      '[we should|it would be nice to|feature:] [support exporting boards as pdf|add dark mode to settings|let people pin boards]{in}',
      'report a bug{in}: {fault}',
      '[issue|bug]{in}: {fault} [type bug|labels {lab}, {lab}|]',
      '[remember to|todo:] [file|open] an issue about {fault}',
    ],
    fa: [
      '[یه|یک|] [ایشو|باگ|تیکت|تسک] [بساز|بزن|ثبت کن|باز کن|درست کن]{in}[ که| برای| :|:] {fault}',
      '{fault}[،|] [یه ایشو براش بزن|ایشوش کن|ثبتش کن|یه تیکت بزن|ایشو بساز]{in}',
      '[باگ|ایشو|تیکت|مشکل][:| -] {fault}{in}',
      '{in} [یه باگ|یه ایشو] [ثبت کن|بزن] که {fault}',
      '{fault}{in}',
      '[میشه|لطفا] یه ایشو [بزنی|بسازی] [واسه|برای|درباره] {fault}؟',
      'یه فیچر ریکوئست [ثبت کن|بزن]{in}: [خروجی csv|حالت تاریک|پین کردن برد]',
      '[ایشو جدید|تیکت جدید]: {fault} لیبل {lab}',
      'برای پروژه {repo} یه [ایشو|باگ] [ثبت کن|بزن]: {fault}',
    ],
    ru: [
      '[создай|заведи|открой|сделай] [задачу|issue|баг|тикет]{in}[: | про | о том что ]{fault}',
      '[баг|задача|issue|тикет][:| -] {fault}{in}',
      '{fault}[, | - ][заведи задачу|создай issue|оформи баг]{in}',
      '{fault}{in}',
      '[можешь|пожалуйста] [заведи|создай] баг{in}: {fault}',
      'новая задача{in}: {fault}, метки {lab}',
    ],
    de: ['[erstelle ein issue|neues ticket|fehler]{in}: {fault}', '{fault}{in}'],
    fr: ['[crée une issue|nouveau ticket|bogue]{in} : {fault}', '{fault}{in}'],
    es: ['[crea un issue|nueva incidencia|error]{in}: {fault}', '{fault}{in}'],
    pt: ['[crie uma issue|novo chamado|erro]{in}: {fault}', '{fault}{in}'],
    it: ['[crea una issue|nuovo ticket|errore]{in}: {fault}', '{fault}{in}'],
    tr: ['[issue aç|yeni kayıt|hata]{in}: {fault}', '{fault}{in}'],
    ar: ['[أنشئ تذكرة|تذكرة جديدة|خطأ]{in}: {fault}', '{fault}{in}'],
    zh: ['[创建工单|新建问题|错误]{in}:{fault}', '{fault}{in}'],
  },
  'issue.list': {
    en: [
      '[my issues|my open issues|issues assigned to me|what issues do i have|what am i assigned]{in}',
      '[open|closed|all] issues{in}',
      '[show|list|show me] [all |the |][open |closed |][issues|bugs|tickets]{in}',
      '[what|which] [issues|bugs] are [open|still open|left]{in}[?|]',
      'any open [bugs|issues]{in}[?|]',
      'issues labelled {lab}{in}',
      '[list|show] [issues|bugs] by {who}{in}',
      '[how many|what] [issues|bugs] [are open|do we have]{in}[?|]',
      "what's on my plate{in}",
      'issues{in} [about|mentioning] [login|export|search]',
    ],
    fa: [
      '[ایشوهای من|ایشو های من|ایشوهام|تسکای من|باگای من]{in}',
      '[ایشوهای|ایشو های|باگای] [باز|بسته|] {in} [رو نشون بده|رو بیار|رو لیست کن|]',
      '{in} [چه|چند تا|کدوم] [ایشو|باگ]هایی [بازه|داریم|مونده][؟|]',
      '[لیست|فهرست] [ایشوها|باگا|تیکتا]{in}',
      'چه ایشوهایی به من [اساین شده|داده شده|سپرده شده][؟|]',
      '[ایشوهای|باگای] با لیبل {lab}{in}',
      '[همه|تمام] ایشوهای {repo} [رو نشون بده|رو بیار|]',
      'ایشوهایی که {who} [ساخته|باز کرده]',
    ],
    ru: [
      '[мои задачи|мои issues|мои баги|что на мне]{in}',
      '[открытые|закрытые|все] [задачи|баги|issues]{in}',
      '[покажи|выведи|список] [открытых |всех |][задач|багов|issues]{in}',
      '[какие|сколько] [задач|багов] [открыто|висит]{in}[?|]',
      'задачи с меткой {lab}{in}',
    ],
    de: ['[meine issues|offene issues|zeig alle tickets]{in}'],
    fr: ['[mes issues|tickets ouverts|liste des issues]{in}'],
    es: ['[mis issues|incidencias abiertas|lista los issues]{in}'],
    pt: ['[minhas issues|issues abertas|liste os chamados]{in}'],
    it: ['[le mie issue|issue aperte|elenca i ticket]{in}'],
    tr: ['[benim issue larım|açık kayıtlar|issue ları listele]{in}'],
    ar: ['[مشاكلي|التذاكر المفتوحة|اعرض كل المشاكل]{in}'],
    zh: ['[我的问题|列出所有问题|有哪些未关闭的问题]{in}'],
  },
  'issue.show': {
    en: [
      '[show|open|view|show me|pull up] {iss} {n}{in}',
      "what's [in|on] {iss} {n}[?|]",
      '{iss} {n}{in}',
      '[details of|tell me about|look at] {iss} {n}',
      'what does #{n} say',
      '#{n}[?|]',
    ],
    fa: [
      '{iss} {n} رو [نشون بده|بیار|باز کن ببینم]{in}',
      '{iss} {n} [چیه|چی نوشته][؟|]',
      'جزئیات {iss} {n}',
      '#{n} رو [ببینم|نشون بده]',
      '{iss} {n}{in}',
    ],
    ru: [
      '[покажи|открой|глянь] {iss} {n}{in}',
      'что в {iss} {n}[?|]',
      'детали задачи {n}',
      '#{n}[?|]',
    ],
  },
  'issue.close': {
    en: [
      '[close|shut|resolve] [{iss} |#|]{n}{in}',
      '#{n}[ is| was|] [fixed|done|resolved][, close it|. close|]',
      '[mark|set] [{iss} |#]{n} [as done|as fixed|resolved|done]',
      '[please|can you|go ahead and] close {iss} #{n}{in}',
      "close #{n} as [won't fix|not planned|duplicate]",
      '#{n}{in} - close',
      'close #{n}: {msg}',
      'close #{n} and #{n}',
    ],
    fa: [
      '{iss} {n} رو [ببند|ببندش|ببندید|بستش کن]{in}',
      '[ببند|ببندش] {iss} {n}',
      '{iss} {n} [حل شد|درست شد|تموم شد][، ببندش|. ببند|]',
      '#{n} [رو ببند|ببند|بسته شه]',
      'لطفا {iss} #{n}{in} رو ببند',
      '{iss} {n}{in} رو [بسته کن|کلوز کن|ریزالو کن]',
      '[میشه|لطفا] #{n} رو ببندی؟',
    ],
    ru: [
      '[закрой|закрывай|закройте] [{iss} |#|]{n}{in}',
      '{iss} {n}{in} [закрой|закрыть|можно закрывать]',
      '#{n} [исправлено|готово|сделано][, закрой|]',
      'отметь #{n} как [готовую|решённую]',
    ],
    de: ['schließe [issue |#]{n}{in}', 'issue {n} erledigt, schließen'],
    fr: ['ferme [le ticket |#]{n}{in}', "ferme l'issue {n}"],
    es: ['cierra [el issue |#]{n}{in}', 'cierra la incidencia {n}'],
    pt: ['feche [a issue |#]{n}{in}'],
    it: ['chiudi [la issue |#]{n}{in}'],
    tr: ['#{n} kapat', 'issue {n} kapat{in}'],
    ar: ['أغلق [المشكلة |#]{n}', 'اغلق التذكرة {n}'],
    zh: ['关闭问题{n}', '关掉#{n}'],
  },
  'issue.reopen': {
    en: [
      '[reopen|re-open] [{iss} |#|]{n}{in}',
      'open #{n} again',
      '#{n} is [back|broken again], reopen [it|]',
      'bring back {iss} {n}',
      '[undo|revert] closing #{n}',
    ],
    fa: [
      '{iss} {n} رو [دوباره باز کن|باز کن دوباره|ری اوپن کن]{in}',
      '#{n} [دوباره خراب شد|برگشت]، بازش کن',
      '{iss} {n} رو از نو باز کن',
      'دوباره باز کن {n}',
    ],
    ru: [
      '[переоткрой|открой снова|открой заново] [{iss} |#|]{n}{in}',
      '#{n} снова [сломалось|воспроизводится], переоткрой',
    ],
    de: ['öffne #{n} wieder'],
    fr: ['rouvre #{n}'],
    es: ['reabre #{n}'],
  },
  'issue.comment': {
    en: [
      '[comment on|reply to|respond to|answer] [{iss} |#|]{n}{in}: {msg}',
      '[comment|reply] #{n} "{msg}"',
      'tell #{n} [that |]{msg}',
      '[leave a comment|post] on {iss} {n}: {msg}',
      '#{n}: {msg}',
      'write on #{n} that {msg}',
      'add a comment to {iss} {n} saying {msg}',
    ],
    fa: [
      '[زیر|روی|رو] {iss} {n} [کامنت بذار|بنویس|کامنت بزن|نظر بذار][:| که] {msg}',
      '[کامنت|نظر] [بذار|بزن] [رو|زیر] #{n}: {msg}',
      'به {iss} {n} [جواب بده|پاسخ بده]: {msg}',
      '{iss} {n}{in} کامنت: {msg}',
      '#{n} [بنویس|کامنت کن] "{msg}"',
    ],
    ru: [
      '[прокомментируй|ответь на|напиши в|отпиши в] [{iss} |#|]{n}{in}: {msg}',
      '[комментарий|коммент] к #{n}: {msg}',
      'оставь коммент под #{n}: {msg}',
    ],
    de: ['kommentiere #{n}: {msg}'],
    fr: ['commente #{n} : {msg}'],
    es: ['comenta en #{n}: {msg}'],
    pt: ['comente na #{n}: {msg}'],
    it: ['commenta #{n}: {msg}'],
    tr: ['#{n} yorum yaz: {msg}'],
    ar: ['علق على #{n}: {msg}'],
    zh: ['在#{n}评论:{msg}'],
  },
  'issue.assign': {
    en: [
      'assign [{iss} |#|]{n} to {who}{in}',
      '[give|hand] #{n} to {who}',
      '{who} [should take|can take|will handle] #{n}',
      'assign {who} to #{n}',
      '[assign|give] #{n} to me',
      "i'll take #{n}",
      'put {who} on {iss} {n}',
    ],
    fa: [
      '{iss} {n} رو [اساین کن به|بده به|بسپار به] {who}',
      '{iss} {n} رو [به|واسه] {who} اساین کن',
      '#{n} [با|مال] {who}',
      '{who} رو [مسئول|اساین] {iss} {n} کن',
      '#{n} رو بده به خودم',
      '#{n} رو به من اساین کن',
    ],
    ru: [
      '[назначь|повесь|отдай] [{iss} |#|]{n} на {who}',
      'назначь {who} на #{n}',
      'возьму #{n} на себя',
      'поручи #{n} {who}',
    ],
    de: ['weise #{n} {who} zu'],
    fr: ['assigne #{n} à {who}'],
    es: ['asigna #{n} a {who}'],
  },
  'issue.unassign': {
    en: [
      'unassign {who} from #{n}',
      '[remove|take] {who} [off|from] {iss} {n}',
      'unassign me from #{n}',
      '#{n} - drop {who} as assignee',
    ],
    fa: [
      '{who} رو از {iss} {n} بردار',
      'اساین {who} رو از #{n} بردار',
      'منو از #{n} بردار',
      '#{n} رو از گردن {who} بردار',
    ],
    ru: ['сними {who} с #{n}', 'убери меня с задачи {n}', 'сними назначение с #{n}'],
  },
  'issue.label': {
    en: [
      '[label|tag] #{n} [as |with |]{lab}',
      'add [the |]label {lab} to [{iss} |#]{n}',
      'mark #{n} as {lab}',
      '#{n} needs the {lab} label',
      'put label {lab} on #{n}',
      'add labels {lab} and {lab} to #{n}',
    ],
    fa: [
      'لیبل {lab} رو [به|روی] {iss} {n} [اضافه کن|بزن]',
      '[به|روی] #{n} لیبل {lab} بزن',
      '#{n} رو [با لیبل|برچسب] {lab} [علامت بزن|بزن]',
      'برچسب {lab} بده به #{n}',
    ],
    ru: ['добавь метку {lab} к #{n}', 'пометь #{n} как {lab}', 'повесь метку {lab} на задачу {n}'],
  },
  'issue.unlabel': {
    en: [
      'remove [the |]label {lab} from #{n}',
      'untag #{n} {lab}',
      '#{n} is not {lab} anymore, drop the label',
      'take the {lab} label off #{n}',
    ],
    fa: [
      'لیبل {lab} رو از {iss} {n} بردار',
      'برچسب {lab} رو از #{n} حذف کن',
      'لیبل {lab} #{n} رو بردار',
    ],
    ru: ['убери метку {lab} с #{n}', 'сними метку {lab} с задачи {n}'],
  },
  'issue.edit': {
    en: [
      '[rename|retitle] [{iss} |#]{n} to "{title}"',
      'change the title of #{n} to {title}',
      'update the description of #{n}: {msg}',
      'edit #{n}: {title}',
      'fix the title of {iss} {n}, it should say {title}',
    ],
    fa: [
      'عنوان {iss} {n} رو [عوض کن به|بذار] "{title}"',
      'اسم #{n} رو بذار {title}',
      'توضیحات #{n} رو [آپدیت کن|عوض کن]: {msg}',
      '{iss} {n} رو ویرایش کن: {title}',
    ],
    ru: [
      'переименуй #{n} в "{title}"',
      'поменяй заголовок задачи {n} на {title}',
      'обнови описание #{n}: {msg}',
    ],
  },
  'issue.milestone': {
    en: [
      '[put|move] #{n} [in|into|to] milestone {ms}',
      'set the milestone of #{n} to {ms}',
      'target #{n} for {ms}',
      '#{n} goes in {ms}',
    ],
    fa: [
      '#{n} رو بذار تو مایلستون {ms}',
      'مایلستون {iss} {n} رو {ms} کن',
      '#{n} رو ببر تو اسپرینت {ms}',
    ],
    ru: ['перенеси #{n} в веху {ms}', 'поставь #{n} в спринт {ms}'],
  },
  'issue.lock': {
    en: ['lock [{iss} |#]{n}', 'lock the conversation on #{n}', 'lock #{n}, it got heated'],
    fa: ['{iss} {n} رو قفل کن', 'کامنتای #{n} رو قفل کن'],
    ru: ['заблокируй обсуждение #{n}', 'заблокируй задачу {n}'],
  },
  'issue.unlock': {
    en: ['unlock [{iss} |#]{n}', 'unlock the conversation on #{n}'],
    fa: ['قفل {iss} {n} رو باز کن', '#{n} رو از قفل در بیار'],
    ru: ['разблокируй #{n}', 'разблокируй обсуждение задачи {n}'],
  },
  // ------------------------------------------------------------ pull requests
  'pr.create': {
    en: [
      '[open|create|make|raise] a {pr} from {br} [to|into] {base}{in}',
      '[open|create] a [draft |]{pr} for {br}',
      '{pr} {br} -> {base}',
      '[put up|send] a {pr} [from|for] {br}',
      'new {pr}{in}: {br} into {base}, title "{title}"',
      'make a {pr} from my branch {br}',
      'i want to merge {br} into {base}, open a {pr}',
    ],
    fa: [
      'یه {pr} از {br} به {base} [بساز|بزن|باز کن]{in}',
      'از برنچ {br} یه {pr} [بزن|بساز]',
      '{pr} [بزن|بساز|باز کن] از {br}',
      'یه {pr} درفت [بزن|بساز] برای {br}',
      'برنچ {br} رو {pr} کن به {base}',
    ],
    ru: [
      '[создай|открой|сделай] {pr} из {br} в {base}{in}',
      '[создай|открой] {pr} [для ветки|из ветки] {br}',
      'запили {pr} {br} в {base}',
    ],
    de: ['erstelle einen pull request von {br} nach {base}'],
    fr: ['crée une pull request de {br} vers {base}'],
    es: ['crea un pull request de {br} a {base}'],
  },
  'pr.list': {
    en: [
      '[my|open|closed|merged|all] [{pr}s|PRs|pull requests|merge requests]{in}',
      '[show|list] [open |my |][PRs|pull requests|MRs]{in}',
      '[what|which] PRs [are open|need review|are waiting]{in}[?|]',
      'PRs waiting for my review',
      'pull requests by {who}{in}',
      'any open PRs{in}[?|]',
    ],
    fa: [
      '[پی ارهای|پی ار های|پول ریکوئستای|PR های] [باز|من|بسته|مرج شده|] {in} [رو نشون بده|رو بیار|]',
      'چه [پی ار|PR]هایی [بازه|منتظر ریویوئه][؟|]',
      '[لیست|فهرست] [پی ارها|پول ریکوئستا|MR ها]{in}',
      'پی ارهایی که {who} زده',
    ],
    ru: [
      '[мои|открытые|все] [пр|пул-реквесты|MR]{in}',
      '[покажи|список] [пул-реквестов|PR]{in}',
      'какие PR ждут ревью[?|]',
    ],
    de: ['offene pull requests{in}'],
    fr: ['mes pull requests{in}'],
    es: ['mis pull requests{in}'],
  },
  'pr.show': {
    en: [
      '[show|open|view] {pr} {n}{in}',
      "what's in {pr} #{n}",
      '{pr} {n}[?|]',
      'details of {pr} !{n}',
    ],
    fa: ['{pr} {n} رو [نشون بده|بیار|باز کن]', '{pr} {n} چیه[؟|]', 'جزئیات {pr} {n}'],
    ru: ['покажи {pr} {n}', 'что в {pr} #{n}[?|]'],
  },
  'pr.diff': {
    en: [
      '[what changed|what files changed] in {pr} {n}',
      '[diff|changes] of {pr} #{n}',
      'files changed in {pr} {n}{in}',
      'show the diff for {pr} {n}',
    ],
    fa: ['تغییرات {pr} {n} رو نشون بده', 'دیف {pr} {n}', 'تو {pr} {n} چه فایلایی عوض شده[؟|]'],
    ru: ['покажи дифф {pr} {n}', 'какие файлы изменены в {pr} {n}[?|]'],
  },
  'pr.close': {
    en: [
      'close {pr} [#|]{n}{in}',
      'close {pr} {n} without merging',
      '[abandon|drop] {pr} {n}',
      'close the {pr} {n}: {msg}',
    ],
    fa: ['{pr} {n} رو [ببند|ببندش|بستش کن]', '{pr} {n} رو بدون مرج ببند', '[ببند|ببندش] {pr} {n}'],
    ru: ['закрой {pr} {n}', 'закрой {pr} {n} без мержа'],
    de: ['schließe den pull request {n}'],
  },
  'pr.reopen': {
    en: ['reopen {pr} [#|]{n}', 'open {pr} {n} again'],
    fa: ['{pr} {n} رو دوباره باز کن', '{pr} {n} رو ری اوپن کن'],
    ru: ['переоткрой {pr} {n}', 'открой снова {pr} {n}'],
  },
  'pr.comment': {
    en: [
      'comment on {pr} {n}: {msg}',
      'reply on {pr} #{n} "{msg}"',
      'tell the author of {pr} {n} {msg}',
    ],
    fa: ['زیر {pr} {n} [کامنت بذار|بنویس]: {msg}', 'رو {pr} {n} کامنت بزن: {msg}'],
    ru: ['прокомментируй {pr} {n}: {msg}', 'напиши в {pr} {n}: {msg}'],
  },
  'pr.merge': {
    en: [
      '[merge|land|ship] {pr} [#|!|]{n}{in}',
      '[squash and merge|squash-merge|rebase and merge] {pr} {n}',
      '{pr} {n} [looks good|is approved], merge it',
      'merge #{n}[ with squash| using rebase|]',
      '[please|can you|go ahead and] merge {pr} {n}',
      'merge it',
    ],
    fa: [
      '{pr} {n} رو [مرج کن|مرجش کن|ادغام کن]{in}',
      '[مرج کن|مرجش کن] {pr} {n}',
      '{pr} {n} اوکیه، مرجش کن',
      '{pr} {n} رو اسکواش مرج کن',
      '#{n} رو مرج کن',
    ],
    ru: [
      '[смержи|смёржи|влей|слей|мержи] {pr} [#|]{n}{in}',
      '{pr} {n} [смержи|вливай]',
      'сквош-мерж {pr} {n}',
    ],
    de: ['merge den pull request {n}', 'führe #{n} zusammen'],
    fr: ['merge la pull request {n}', 'fusionne #{n}'],
    es: ['fusiona el pull request {n}', 'mergea #{n}'],
    pt: ['faça merge do pull request {n}'],
    it: ['fai merge della pull request {n}'],
    tr: ['pull request {n} birleştir'],
    ar: ['ادمج طلب الدمج {n}'],
    zh: ['合并PR {n}', '合并请求{n}合并一下'],
  },
  'pr.approve': {
    en: [
      'approve {pr} [#|]{n}{in}',
      'lgtm on {pr} {n}',
      '{pr} {n} looks good, approve',
      'approve #{n}: {msg}',
      'sign off on {pr} {n}',
    ],
    fa: [
      '{pr} {n} رو [اپروو کن|تایید کن|اپرو کن]',
      '{pr} {n} اوکیه، تاییدش کن',
      '[تایید|اپروو] {pr} {n}',
    ],
    ru: ['[апрувни|одобри|заапрувь] {pr} {n}', '{pr} {n} норм, апрув'],
    de: ['genehmige den pull request {n}'],
    fr: ['approuve la pull request {n}'],
    es: ['aprueba el pull request {n}'],
  },
  'pr.request-changes': {
    en: [
      'request changes on {pr} {n}: {msg}',
      '{pr} {n} needs work: {msg}',
      'reject {pr} {n}: {msg}',
    ],
    fa: ['رو {pr} {n} درخواست تغییر بده: {msg}', '{pr} {n} نیاز به تغییر داره: {msg}'],
    ru: ['запроси изменения в {pr} {n}: {msg}', 'верни {pr} {n} на доработку: {msg}'],
  },
  'pr.request-review': {
    en: [
      'ask {who} to review {pr} {n}',
      'request a review from {who} on {pr} #{n}',
      'add {who} as reviewer to {pr} {n}',
      'get {who} to look at {pr} {n}',
    ],
    fa: [
      'از {who} بخواه {pr} {n} رو ریویو کنه',
      '{who} رو ریویوئر {pr} {n} کن',
      'ریویو {pr} {n} رو بده به {who}',
    ],
    ru: [
      'попроси {who} посмотреть {pr} {n}',
      'назначь {who} ревьюером {pr} {n}',
      'отправь {pr} {n} на ревью {who}',
    ],
  },
  'pr.assign': {
    en: ['assign {pr} {n} to {who}', 'give {pr} {n} to {who}'],
    fa: ['{pr} {n} رو به {who} اساین کن', '{pr} {n} رو بده به {who}'],
    ru: ['назначь {pr} {n} на {who}'],
  },
  'pr.label': {
    en: ['label {pr} {n} [as |]{lab}', 'add the {lab} label to {pr} {n}'],
    fa: ['لیبل {lab} رو به {pr} {n} بزن', 'به {pr} {n} برچسب {lab} بده'],
    ru: ['добавь метку {lab} к {pr} {n}'],
  },
  'pr.edit': {
    en: [
      'rename {pr} {n} to "{title}"',
      'change the base of {pr} {n} to {base}',
      'update the description of {pr} {n}: {msg}',
    ],
    fa: ['عنوان {pr} {n} رو بذار "{title}"', 'برنچ مقصد {pr} {n} رو {base} کن'],
    ru: ['переименуй {pr} {n} в "{title}"', 'поменяй базовую ветку {pr} {n} на {base}'],
  },
  'pr.ready': {
    en: [
      'mark {pr} {n} [as |]ready for review',
      '{pr} {n} is ready, take it out of draft',
      'undraft {pr} {n}',
    ],
    fa: ['{pr} {n} رو آماده ریویو کن', '{pr} {n} رو از درفت در بیار'],
    ru: ['отметь {pr} {n} готовым к ревью', 'сними черновик с {pr} {n}'],
  },
  'pr.checkout': {
    en: [
      'check out {pr} {n} locally',
      'checkout {pr} #{n}',
      'i want to test {pr} {n} on my machine',
    ],
    fa: ['{pr} {n} رو لوکال چک اوت کن', '{pr} {n} رو بیار رو سیستمم'],
    ru: ['сделай чекаут {pr} {n}', 'стяни {pr} {n} локально'],
  },
  // ------------------------------------------------------------ branches
  'branch.list': {
    en: [
      '[list|show] [all |the |remote |][branches]{in}',
      'what branches [are there|do we have]{in}[?|]',
      'branches{in}',
      'which branch am i on',
    ],
    fa: [
      'برنچ ها رو [نشون بده|لیست کن]{in}',
      'چه برنچ هایی داریم{in}[؟|]',
      '[لیست|فهرست] برنچا',
      'رو کدوم برنچم[؟|]',
    ],
    ru: ['[покажи|список] веток{in}', 'какие ветки есть{in}[?|]', 'на какой я ветке'],
  },
  'branch.create': {
    en: [
      '[create|make|start|new] [a |][new |]branch [called |named |]{br}[ from {base}|]',
      'branch {br} off {base}',
      'new branch: {br}',
      'cut a branch {br} from {base}{in}',
    ],
    fa: [
      'یه برنچ [جدید |][به اسم |][بساز|بزن] {br}',
      'برنچ {br} رو [بساز|بزن][ از {base}|]',
      'از {base} یه برنچ {br} [بزن|بساز]',
      'برنچ جدید: {br}',
    ],
    ru: [
      '[создай|сделай|заведи] ветку {br}[ от {base}|]',
      'новая ветка {br}',
      'отбранчуй {br} от {base}',
    ],
    de: ['erstelle einen branch {br}'],
    fr: ['crée une branche {br}'],
    es: ['crea una rama {br}'],
  },
  'branch.delete': {
    en: [
      '[delete|remove|drop] [the |]branch {br}{in}',
      'get rid of {br}',
      'delete {br}, it was merged',
      'force delete branch {br}',
    ],
    fa: ['برنچ {br} رو [پاک کن|حذف کن]', '[حذف|پاک کن] برنچ {br}', '{br} مرج شده، پاکش کن'],
    ru: ['[удали|снеси|грохни] ветку {br}', 'ветку {br} удали'],
  },
  'branch.switch': {
    en: [
      '[switch|checkout|go] to {br}',
      'switch to [the |]branch {br}',
      'check out {base}',
      "let's work on {br}",
      'git checkout {br}',
      'back to {base}',
    ],
    fa: [
      'برو رو [برنچ |]{br}',
      '[سوییچ کن|سویچ کن] [به|رو] {br}',
      'برنچ رو عوض کن به {base}',
      'چک اوت کن {br}',
      'برگرد رو {base}',
    ],
    ru: [
      'переключись на [ветку |]{br}',
      'перейди на {base}',
      'чекаут {br}',
      'встань на ветку {br}',
    ],
    de: ['wechsle zu {br}'],
    fr: ['bascule sur {br}'],
    es: ['cambia a la rama {br}'],
  },
  'branch.rename': {
    en: ['rename [the |]branch {br} to {br}', 'rename {base} to {br}'],
    fa: ['اسم برنچ {br} رو بذار {br}', 'برنچ {br} رو تغییر نام بده به {br}'],
    ru: ['переименуй ветку {br} в {br}'],
  },
  // ------------------------------------------------------------ commits
  'commit.list': {
    en: [
      '[last|latest|recent] [{k} |]commits[ on {base}|]{in}',
      'show the [git |commit |]log',
      'what was committed [today|this week]{in}',
      'commits by {who}',
      'history of {path}',
      'git log',
    ],
    fa: [
      '[کامیت های|کامیتای] [آخر|اخیر] [روی {base}|]{in}',
      '{k} تا کامیت آخر',
      'لاگ [گیت|کامیتا] رو نشون بده',
      'امروز چی کامیت شده{in}',
      'تاریخچه {path}',
    ],
    ru: [
      'последние [{k} |]коммиты{in}',
      'покажи лог',
      'история коммитов[ ветки {base}|]',
      'что закоммитили сегодня',
    ],
    de: ['letzte commits{in}'],
    fr: ['derniers commits{in}'],
    es: ['últimos commits{in}'],
  },
  'commit.show': {
    en: ['show commit {sha}', 'what changed in {sha}', 'commit {sha}[?|]', 'details of {sha}'],
    fa: ['کامیت {sha} رو نشون بده', 'تو {sha} چی عوض شده[؟|]'],
    ru: ['покажи коммит {sha}', 'что в коммите {sha}[?|]'],
  },
  'commit.compare': {
    en: [
      'compare {br} [with|to|and] {base}',
      'how far is {br} [ahead of|behind] {base}',
      'diff between {base} and {br}',
      'what is in {br} that is not in {base}',
    ],
    fa: ['{br} رو با {base} مقایسه کن', 'فرق {br} و {base} چیه', '{br} چقدر از {base} جلوئه'],
    ru: ['сравни {br} и {base}', 'насколько {br} отстаёт от {base}', 'разница между {base} и {br}'],
  },
  // ------------------------------------------------------------ CI
  'ci.status': {
    en: [
      '[did|has] [ci|the build|the pipeline|the tests|checks] pass[ on {base}| on {pr} {n}|][?|]',
      'is [ci|the build|main] green[?|]',
      '[ci|build|pipeline] status{in}',
      'why is [the build|ci] [red|failing|broken][ on {base}|]',
      'are the checks passing on {pr} {n}[?|]',
      'how is ci doing{in}',
    ],
    fa: [
      '[سی آی|بیلد|پایپ لاین|تستا] [پاس شد|پاس شده|سبزه|رد شد][ روی {base}|][؟|]',
      'وضعیت [CI|بیلد|پایپ لاین]{in}',
      'چرا [بیلد|CI] [قرمزه|فیل شده|خرابه]',
      'تستای {pr} {n} پاس شدن[؟|]',
      '[بیلد|پایپ لاین] {base} چی شد[؟|]',
    ],
    ru: [
      '[сборка|CI|пайплайн] [прошла|прошёл|зелёный][ на {base}|][?|]',
      'статус [CI|сборки]{in}',
      'почему [упала сборка|красный CI]',
      'тесты на {pr} {n} прошли[?|]',
    ],
    de: ['ist der build grün{in}?'],
    fr: ['le build est passé{in} ?'],
    es: ['pasó el build{in}?'],
    pt: ['o build passou{in}?'],
    it: ['la build è passata{in}?'],
    tr: ['build geçti mi{in}?'],
    ar: ['هل نجح البناء{in}؟'],
    zh: ['构建通过了吗{in}'],
  },
  'ci.list': {
    en: [
      '[recent|last|failed] [ci runs|pipelines|workflow runs]{in}',
      'list the pipelines{in}',
      'show [failed |]builds{in}',
    ],
    fa: [
      '[اجراهای|ران های] [اخیر|آخر] [CI|پایپ لاین]{in}',
      'لیست پایپ لاین ها{in}',
      'بیلدای فیل شده',
    ],
    ru: ['последние запуски [CI|пайплайнов]{in}', 'список сборок{in}'],
  },
  'ci.rerun': {
    en: [
      '[rerun|re-run|retry|restart] [the |][ci|build|pipeline|failed jobs|checks][ on {base}| on {pr} {n}|]',
      'run the [tests|pipeline] again{in}',
      'trigger a new build{in}',
      'kick off ci on {br}',
    ],
    fa: [
      '[CI|بیلد|پایپ لاین] رو [دوباره اجرا کن|دوباره ران کن|ری ران کن|ریستارت کن]',
      'تستا رو دوباره [بزن|اجرا کن]{in}',
      'یه بیلد جدید [بزن|تریگر کن]',
    ],
    ru: [
      'перезапусти [CI|сборку|пайплайн][ на {base}|]',
      'прогони тесты ещё раз',
      'запусти сборку снова',
    ],
  },
  'ci.cancel': {
    en: [
      'cancel the [build|pipeline|ci run][ on {base}|]',
      'stop [ci|the pipeline]{in}',
      'abort the running build',
    ],
    fa: ['[بیلد|پایپ لاین] رو [کنسل کن|لغو کن|متوقف کن]', 'CI رو وایسون'],
    ru: ['отмени [сборку|пайплайн]', 'останови CI'],
  },
  // ------------------------------------------------------------ releases and tags
  'release.list': {
    en: [
      '[list|show] [the |]releases{in}',
      'what releases [are there|do we have]{in}',
      'releases{in}',
    ],
    fa: ['ریلیزها رو نشون بده{in}', 'لیست ریلیزا{in}', 'چه ریلیزهایی داریم'],
    ru: ['покажи релизы{in}', 'список релизов{in}'],
  },
  'release.show': {
    en: [
      '[what is|show] the latest release{in}',
      'show release {tag}',
      "what's in {tag}[?|]",
      'release notes for {tag}',
    ],
    fa: ['آخرین ریلیز{in} چیه[؟|]', 'ریلیز {tag} رو نشون بده', 'تو {tag} چی هست'],
    ru: ['последний релиз{in}', 'покажи релиз {tag}'],
  },
  'release.create': {
    en: [
      '[make|create|cut|publish|ship] [a |]release {tag}{in}',
      'release {tag}[ from {base}|]',
      'new release {tag}: {title}',
      'publish {tag} as a [draft |]release',
    ],
    fa: [
      'ریلیز {tag} رو [بده|بزن|بساز|منتشر کن]{in}',
      'یه ریلیز جدید [بزن|بساز] {tag}',
      'نسخه {tag} رو منتشر کن',
    ],
    ru: ['[создай|выпусти|сделай] релиз {tag}{in}', 'зарелизь {tag}'],
    de: ['erstelle ein release {tag}'],
    fr: ['crée une release {tag}'],
    es: ['crea un release {tag}'],
  },
  'release.delete': {
    en: ['delete [the |]release {tag}{in}', 'remove release {tag}'],
    fa: ['ریلیز {tag} رو [پاک کن|حذف کن]'],
    ru: ['удали релиз {tag}'],
  },
  'tag.list': {
    en: ['[list|show] [the |]tags{in}', 'what tags [are there|do we have]', 'git tags'],
    fa: ['تگ ها رو [نشون بده|لیست کن]', 'چه تگ هایی داریم'],
    ru: ['покажи теги', 'список тегов{in}'],
  },
  'tag.create': {
    en: [
      'tag [this|HEAD|{sha}|it] as {tag}',
      '[create|make|add] [a |]tag {tag}[ on {sha}|]{in}',
      'new tag {tag}',
    ],
    fa: ['یه تگ {tag} [بزن|بساز]', 'تگ {tag} رو [روی {sha}|] بزن', 'اینو تگ کن {tag}'],
    ru: ['[создай|поставь] тег {tag}[ на {sha}|]', 'тегни как {tag}'],
  },
  'tag.delete': {
    en: ['delete [the |]tag {tag}{in}', 'remove tag {tag}'],
    fa: ['تگ {tag} رو [پاک کن|حذف کن]'],
    ru: ['удали тег {tag}'],
  },
  // ------------------------------------------------------------ labels and milestones
  'label.list': {
    en: [
      '[what|which] labels [are there|does it have]{in}[?|]',
      '[list|show] [the |]labels{in}',
      'labels{in}',
    ],
    fa: ['لیبل های{in} رو نشون بده', 'چه لیبل هایی داریم{in}[؟|]', 'لیست لیبلا{in}'],
    ru: ['какие метки есть{in}[?|]', 'покажи метки{in}'],
  },
  'label.create': {
    en: [
      '[create|make|add] [a |][new |]label {lab}[ colour #ff0000| in red|]{in}',
      'new label: {lab}',
    ],
    fa: ['یه لیبل جدید [بساز|بزن] {lab}', 'لیبل {lab} رو [بساز|اضافه کن]{in}'],
    ru: ['создай метку {lab}{in}', 'новая метка {lab}'],
  },
  'label.delete': {
    en: ['delete [the |]label {lab}{in}', 'remove the {lab} label from the repo'],
    fa: ['لیبل {lab} رو [از ریپو |][پاک کن|حذف کن]'],
    ru: ['удали метку {lab}{in}'],
  },
  'label.edit': {
    en: ['rename [the |]label {lab} to {lab}', 'change the colour of label {lab} to #00ff00'],
    fa: ['اسم لیبل {lab} رو بذار {lab}', 'رنگ لیبل {lab} رو عوض کن'],
    ru: ['переименуй метку {lab} в {lab}'],
  },
  'milestone.list': {
    en: [
      '[list|show] [the |]milestones{in}',
      'what milestones [are open|do we have]',
      'milestones{in}',
    ],
    fa: ['مایلستون ها رو نشون بده{in}', 'چه مایلستون هایی داریم'],
    ru: ['покажи вехи{in}', 'какие спринты открыты'],
  },
  'milestone.create': {
    en: ['[create|make|add] [a |]milestone {ms}{in}', 'new milestone {ms}'],
    fa: ['یه مایلستون [بساز|بزن] {ms}', 'مایلستون جدید {ms}'],
    ru: ['создай веху {ms}', 'новый спринт {ms}'],
  },
  'milestone.close': {
    en: ['close [the |]milestone {ms}', 'milestone {ms} is done, close it'],
    fa: ['مایلستون {ms} رو ببند', 'اسپرینت {ms} تموم شد ببندش'],
    ru: ['закрой веху {ms}', 'закрой спринт {ms}'],
  },
  // ------------------------------------------------------------ repositories
  'repo.list': {
    en: [
      '[my|list|show my|all my] [repos|repositories|projects][ on {prov}|]',
      'what repos [do i have|can i see|are connected]',
      'repositories',
    ],
    fa: [
      'ریپوهام',
      '[ریپوهای|ریپو های|پروژه های] من[ رو گیت هاب|]',
      'چه ریپوهایی دارم',
      'لیست ریپوها',
    ],
    ru: ['мои репозитории', 'список репо', 'какие у меня проекты[ на {prov}|]'],
    de: ['meine repositories'],
    fr: ['mes dépôts'],
    es: ['mis repositorios'],
  },
  'repo.show': {
    en: [
      '[tell me about|show|info on|details of] [the |]{repo} [repo|repository|]',
      "what's {repo}[?|]",
      'how many stars does {repo} have',
    ],
    fa: ['درباره ریپوی {repo} بگو', 'مشخصات ریپو {repo}', '{repo} چند تا ستاره داره'],
    ru: ['расскажи о репозитории {repo}', 'инфо по репо {repo}'],
  },
  'repo.create': {
    en: [
      '[create|make|start] a [new |][private |]repo[sitory|] [called |named |]{repo}[ on {prov}|]',
      'new repo {repo}',
      'set up a repository {repo}',
    ],
    fa: [
      'یه ریپوی [جدید |][خصوصی |][بساز|بزن] به اسم {repo}',
      'ریپو {repo} رو [بساز|درست کن][ رو گیت هاب|]',
      'ریپو جدید: {repo}',
    ],
    ru: ['создай [приватный |]репозиторий {repo}', 'новый репо {repo}'],
  },
  'repo.fork': {
    en: ['fork {repo}', 'make a fork of {repo}', 'fork the {repo} repo'],
    fa: ['{repo} رو فورک کن', 'یه فورک از {repo} بگیر'],
    ru: ['форкни {repo}', 'сделай форк {repo}'],
  },
  'repo.star': {
    en: ['star {repo}', 'give {repo} a star', 'star the {repo} repo'],
    fa: ['به {repo} ستاره بده', '{repo} رو استار کن'],
    ru: ['поставь звезду {repo}', 'застарь {repo}'],
  },
  'repo.unstar': {
    en: ['unstar {repo}', 'remove my star from {repo}'],
    fa: ['ستاره {repo} رو بردار', '{repo} رو آن استار کن'],
    ru: ['убери звезду с {repo}'],
  },
  'repo.delete': {
    en: ['delete the [repo|repository] {repo}', 'remove {repo} from {prov}', 'delete repo {repo}'],
    fa: ['ریپوی {repo} رو [پاک کن|حذف کن]', 'ریپو {repo} رو از گیت هاب پاک کن'],
    ru: ['удали репозиторий {repo}'],
  },
  'repo.clone': {
    en: [
      'clone {repo}[ here| locally|]',
      'git clone {repo}',
      'get a copy of {repo} on my machine',
      'download the {repo} repo',
    ],
    fa: ['{repo} رو کلون کن', 'ریپوی {repo} رو رو سیستمم کلون کن', 'یه کلون از {repo} بگیر'],
    ru: ['склонируй {repo}', 'клонируй репо {repo}'],
  },
  // ------------------------------------------------------------ code and people
  'file.show': {
    en: [
      'show [me |]{path}[ on {base}|]{in}',
      "what's in {path}",
      'open {path}{in}',
      'read the readme of {repo}',
    ],
    fa: ['فایل {path} رو نشون بده{in}', 'تو {path} چی نوشته', 'ریدمی {repo} رو نشون بده'],
    ru: ['покажи файл {path}{in}', 'что в {path}'],
  },
  'file.blame': {
    en: ['who wrote {path}', 'blame {path}', 'who changed {path} last'],
    fa: ['کی {path} رو نوشته', 'بلیم {path}', 'آخرین بار کی {path} رو عوض کرده'],
    ru: ['кто написал {path}', 'блейм {path}'],
  },
  'code.search': {
    en: [
      'search [the code|the codebase|code] for {q}{in}',
      'where is {q} [used|defined]{in}',
      'find {q} in the code',
      'grep {q}',
    ],
    fa: [
      'تو کد دنبال {q} بگرد{in}',
      '{q} کجای کد [استفاده شده|تعریف شده]',
      'تو سورس {q} رو پیدا کن',
    ],
    ru: ['найди {q} в коде{in}', 'где в коде {q}', 'поиск по коду {q}'],
  },
  'member.list': {
    en: [
      'who [works on|has access to|can push to] {repo}',
      '[list|show] [the |][collaborators|members|contributors]{in}',
      'who is on the team{in}',
    ],
    fa: ['کیا رو {repo} کار میکنن', 'اعضای ریپو {repo}', 'لیست همکارای{in}'],
    ru: ['кто работает над {repo}', 'участники репозитория{in}'],
  },
  'notification.list': {
    en: [
      '[my |any |unread |][notifications|mentions][ on {prov}|]',
      'what did i get pinged about',
      'anything new on {prov}[?|]',
      'my github inbox',
    ],
    fa: [
      '[نوتیف|اعلان|نوتیفیکیشن] های [من|جدید][ تو گیت هاب|]',
      'کسی منشنم کرده[؟|]',
      'گیت هاب چه خبر',
    ],
    ru: ['мои уведомления[ на {prov}|]', 'кто меня упоминал', 'что нового на гитхабе'],
  },
  'notification.read': {
    en: [
      'mark [all |my |][notifications|everything] [as |]read',
      'clear my notifications',
      'dismiss all notifications',
    ],
    fa: ['همه اعلان ها رو خونده شده کن', 'نوتیفا رو پاک کن'],
    ru: ['отметь уведомления прочитанными', 'очисти уведомления'],
  },
  // ------------------------------------------------------------ accounts
  'account.connect': {
    en: [
      'connect [my |a |]{prov}[ account|]',
      'link my {prov}',
      'add a {prov} token',
      'sign in to {prov}',
      'connect gitlab at git.example.com',
    ],
    fa: [
      '[گیت هاب|گیت لب|گیتی|اکانت گیت هاب]م رو وصل کن',
      'به {prov} وصل شو',
      'یه توکن {prov} اضافه کن',
      'اکانت {prov} رو کانکت کن',
    ],
    ru: ['подключи [мой |]{prov}', 'привяжи аккаунт {prov}', 'залогинься в {prov}'],
  },
  'account.list': {
    en: [
      '[which|what] accounts are connected',
      'my [connected |git |]accounts',
      'connected accounts',
    ],
    fa: ['چه حساب هایی وصله', 'اکانت های وصل', 'حساب های گیتم'],
    ru: ['какие аккаунты подключены', 'мои аккаунты'],
  },
  'account.disconnect': {
    en: [
      'disconnect [my |]{prov}',
      'unlink {prov}',
      'remove my {prov} account',
      'forget my {prov} token',
    ],
    fa: ['{prov} رو قطع کن', 'اکانت {prov} رو جدا کن', 'توکن {prov} رو پاک کن'],
    ru: ['отключи {prov}', 'отвяжи аккаунт {prov}'],
  },
  'account.whoami': {
    en: [
      'who am i [on {prov}|logged in as]',
      'which account am i using',
      'what {prov} user is connected',
    ],
    fa: ['با چه حسابی [وصلم|وارد شدم]', 'تو {prov} کیم', 'کدوم اکانت وصله'],
    ru: ['под каким аккаунтом я', 'кто я на {prov}'],
  },
  // ------------------------------------------------------------ the working copy
  'local.status': {
    en: [
      'git status',
      '[what|anything] changed[ here| locally|][?|]',
      'what have i [changed|not committed]',
      '[any |]uncommitted changes[?|]',
      'status',
    ],
    fa: [
      'گیت استتوس',
      'وضعیت [تغییرات|گیت|ریپو]',
      'چی تغییر دادم[؟|]',
      'تغییرات کامیت نشده دارم[؟|]',
      'چیا عوض شده[ اینجا|]',
    ],
    ru: [
      'git status',
      'что изменилось[ тут|][?|]',
      'есть незакоммиченные изменения[?|]',
      'статус репозитория',
    ],
    de: ['was hat sich geändert?'],
    fr: ["qu'est-ce qui a changé ?"],
    es: ['¿qué cambió?'],
  },
  'local.diff': {
    en: [
      'git diff',
      'show [me |]my changes',
      '[show|what are] the changes in {path}',
      'diff[ against {base}|]',
      'what did i change in {path}',
    ],
    fa: ['دیف [تغییراتم|رو نشون بده]', 'تغییراتم رو [خط به خط |]نشون بده', 'تو {path} چی عوض کردم'],
    ru: ['git diff', 'покажи мои изменения', 'что я поменял в {path}'],
  },
  'local.stage': {
    en: [
      'git add [.|{path}|-A]',
      'stage [everything|all changes|{path}]',
      'add {path} to the commit',
      'add all [the |]changes',
    ],
    fa: ['[همه|همه تغییرات|{path}] رو استیج کن', 'گیت اد [.|{path}]', '{path} رو [اد کن|add کن]'],
    ru: ['добавь [всё|{path}] в индекс', 'застейдж [всё|{path}]', 'git add {path}'],
  },
  'local.unstage': {
    en: ['unstage {path}', 'unstage everything', 'remove {path} from staging'],
    fa: ['{path} رو از استیج [در بیار|بردار]', 'همه رو آن استیج کن'],
    ru: ['убери {path} из индекса', 'анстейдж всё'],
  },
  'local.commit': {
    en: [
      'commit [with message |-m |]"{msg}"',
      'commit [everything|all|this|my changes]: {msg}',
      'git commit -m "{msg}"',
      'commit {msg}',
      'save [my |the |]changes as "{msg}"',
      'commit and push: {msg}',
    ],
    fa: [
      '[کامیت کن|کامیتش کن] [با پیام |]"{msg}"',
      'تغییرات رو کامیت کن: {msg}',
      'با پیام "{msg}" کامیت کن',
      'یه کامیت بزن: {msg}',
      'کامیت: {msg}',
    ],
    ru: [
      '[закоммить|коммитни] [с сообщением |]"{msg}"',
      'сделай коммит: {msg}',
      'закоммить всё: {msg}',
    ],
    de: ['committe: {msg}'],
    fr: ['commite : {msg}'],
    es: ['haz commit: {msg}'],
    pt: ['faça commit: {msg}'],
    it: ['committa: {msg}'],
    tr: ['commit: {msg}'],
    ar: ['commit: {msg}'],
    zh: ['提交:{msg}'],
  },
  'local.amend': {
    en: [
      'amend the last commit[: {msg}|]',
      'fix the last commit message to "{msg}"',
      'git commit --amend',
      'add {path} to the last commit',
    ],
    fa: ['کامیت آخر رو امند کن', 'پیام کامیت آخر رو [عوض کن|درست کن]: {msg}'],
    ru: ['поправь последний коммит', 'аменд: {msg}'],
  },
  'local.push': {
    en: [
      'push[ it| my changes| to origin| to {br}| {br}|]',
      'git push[ origin {br}|]',
      'push [the |]branch {br}',
      'force push[ {br}|]',
      'publish my branch',
      'push to {base}[ please|]',
    ],
    fa: [
      '[پوش کن|پوشش کن|پوش بده][ رو {br}| به {base}|]',
      'تغییرات رو پوش کن',
      'برنچ {br} رو پوش کن',
      'بفرستش بالا',
      'فورس پوش کن',
    ],
    ru: [
      '[запушь|пушни|запушить][ в {br}| ветку {br}|]',
      'git push',
      'залей изменения на сервер',
      'форс пуш {br}',
    ],
    de: ['push die änderungen', 'pushe {br}'],
    fr: ['pousse les changements', 'push {br}'],
    es: ['sube los cambios', 'pushea {br}'],
    pt: ['envie as mudanças', 'push {br}'],
    it: ['pusha le modifiche'],
    tr: ['değişiklikleri push et'],
    ar: ['ادفع التغييرات'],
    zh: ['推送代码', '推送到{br}'],
  },
  'local.pull': {
    en: [
      'pull[ the latest| from origin| {base}|]',
      'git pull',
      'get the latest [changes|code][ from {base}|]',
      'sync with [origin|{base}]',
      'update my branch from {base}',
    ],
    fa: [
      '[پول کن|پولش کن|پول بگیر][ از {base}|]',
      'آخرین تغییرات رو بگیر',
      'سینک کن با {base}',
      'گیت پول',
    ],
    ru: ['[спулль|подтяни|стяни][ изменения| из {base}|]', 'git pull', 'синхронизируйся с {base}'],
    de: ['pulle die neuesten änderungen'],
    fr: ['tire les derniers changements'],
    es: ['trae los últimos cambios'],
  },
  'local.fetch': {
    en: ['fetch[ origin| everything|]', 'git fetch', 'fetch the latest without merging'],
    fa: ['فچ کن', 'گیت فچ'],
    ru: ['сделай фетч', 'git fetch'],
  },
  'local.merge': {
    en: [
      'merge {br} into {base}[ here| locally|]',
      'merge {base} into my branch',
      'git merge {br}',
      'bring {base} into {br}',
    ],
    fa: [
      '{br} رو با {base} مرج کن',
      '{br} رو [مرج کن تو|بریز تو] {base}',
      'برنچ {base} رو تو برنچم مرج کن',
    ],
    ru: ['смержи {br} в {base}', 'влей {base} в мою ветку', 'git merge {br}'],
  },
  'local.rebase': {
    en: ['rebase [on|onto] {base}', 'rebase {br} on {base}', 'git rebase {base}'],
    fa: ['رو {base} ریبیس کن', '{br} رو ریبیس کن رو {base}'],
    ru: ['сделай ребейз на {base}', 'перебазируй {br} на {base}'],
  },
  'local.stash': {
    en: ['stash [my changes|everything|this]', 'git stash', 'put my changes aside', 'stash: {msg}'],
    fa: ['تغییرات رو استش کن', 'استش کن', 'تغییراتم رو کنار بذار'],
    ru: ['спрячь изменения в стеш', 'git stash', 'застешь всё'],
  },
  'local.unstash': {
    en: ['pop the stash', 'git stash pop', 'bring back my stashed changes', 'apply the stash'],
    fa: ['استش رو برگردون', 'استش پاپ کن', 'تغییرات استش شده رو بیار'],
    ru: ['верни стеш', 'git stash pop', 'достань изменения из стеша'],
  },
  'local.reset': {
    en: [
      'reset [to |]{sha}',
      'git reset --hard [HEAD~1|{sha}]',
      'undo my last commit',
      'go back to {sha}',
      'roll back to {sha}',
    ],
    fa: ['ریست کن به {sha}', 'کامیت آخر رو [بیخیال شو|برگردون]', 'برگرد به {sha}'],
    ru: ['сбрось на {sha}', 'откати последний коммит', 'git reset --hard {sha}'],
  },
  'local.discard': {
    en: [
      'discard [my |all |the |]changes[ to {path}|]',
      'throw away my changes',
      'restore {path}',
      'undo my changes to {path}',
    ],
    fa: ['تغییرات رو دور بریز', 'تغییرات {path} رو [پاک کن|برگردون]', 'بیخیال تغییرات شو'],
    ru: ['выкинь мои изменения', 'отмени изменения в {path}', 'восстанови {path}'],
  },
  'local.cherry-pick': {
    en: [
      'cherry-pick {sha}[ onto {base}|]',
      'cherry pick {sha}',
      'bring commit {sha} into this branch',
    ],
    fa: ['{sha} رو چری پیک کن', 'کامیت {sha} رو بیار تو این برنچ'],
    ru: ['черри-пикни {sha}', 'перенеси коммит {sha} в эту ветку'],
  },
  'local.revert': {
    en: ['revert {sha}', 'revert commit {sha}', 'back out {sha}', 'undo commit {sha}'],
    fa: ['کامیت {sha} رو ریورت کن', '{sha} رو برگردون'],
    ru: ['ревертни {sha}', 'откати коммит {sha}'],
  },
  'local.init': {
    en: [
      'git init',
      'make this folder a repo',
      'initialize a repository here',
      'start a git repo here',
    ],
    fa: ['گیت اینیت', 'اینجا رو ریپو کن', 'تو این فولدر گیت راه بنداز'],
    ru: ['git init', 'инициализируй репозиторий тут'],
  },
  'local.remote-add': {
    en: [
      'add remote origin https://github.com/{repo}.git',
      'set origin to git@github.com:{repo}.git',
      'add a remote upstream https://gitlab.com/{repo}',
    ],
    fa: [
      'ریموت origin رو بذار https://github.com/{repo}.git',
      'یه ریموت اضافه کن https://gitlab.com/{repo}',
    ],
    ru: ['добавь remote origin https://github.com/{repo}.git'],
  },
  // ------------------------------------------------------------ git, but none of these
  'other:commit': {
    en: [
      'squash my last {k} commits',
      'bisect to find what broke {path}',
      'sign my commits with gpg',
      'rewrite the history to remove a secret',
    ],
    fa: ['{k} تا کامیت آخر رو اسکواش کن', 'با بایسکت پیدا کن کدوم کامیت خرابش کرد'],
    ru: ['сквошни последние {k} коммита', 'найди бисектом что сломало сборку'],
  },
  'other:branch': {
    en: [
      'protect the {base} branch',
      'set {base} as the default branch',
      'require reviews on {base}',
    ],
    fa: ['برنچ {base} رو پروتکت کن', 'برنچ پیش فرض رو {base} کن'],
    ru: ['защити ветку {base}', 'сделай {base} веткой по умолчанию'],
  },
  'other:repo': {
    en: [
      'enable github pages{in}',
      'transfer {repo} to the org',
      'archive {repo}',
      'add a webhook to {repo}',
      'turn on discussions{in}',
      'edit the wiki{in}',
      'add a secret to {repo}',
    ],
    fa: [
      'گیت هاب پیجز رو فعال کن',
      'ریپوی {repo} رو آرشیو کن',
      'یه وب هوک به {repo} اضافه کن',
      'ویکی رو ویرایش کن',
    ],
    ru: ['включи github pages', 'архивируй {repo}', 'передай {repo} в организацию'],
  },
  'other:local': {
    en: [
      'add a submodule for {repo}',
      'set up git lfs',
      'add a pre-commit hook',
      'configure my git email',
    ],
    fa: ['ساب ماژول {repo} رو اضافه کن', 'گیت ال اف اس راه بنداز'],
    ru: ['добавь сабмодуль {repo}', 'настрой git lfs'],
  },
};

// ---------------------------------------------------------------- not git at all

/**
 * Everyday sentences with git's words in them, by the card kind they are: what the shape model
 * must not hand to the git layer. "Push the meeting to friday" is a reminder.
 */
export const NOT_GIT: Record<string, string[]> = {
  event: [
    'release party friday 8pm',
    'branch office meeting monday 10am',
    'star wars marathon saturday at 7',
    'pull up at the cafe tomorrow 5pm',
    'جشن ریلیز آلبوم جمعه ساعت ۸',
    'جلسه شعبه دوشنبه ساعت ۱۰',
    'встреча в филиале в понедельник в 10',
  ],
  reminder: [
    'push the meeting to friday',
    'remind me to close the windows before i leave',
    'remind me to pull the laundry out at 6',
    'remind me to review the contract tomorrow',
    'remind me to fork over the rent on the 1st',
    'یادم بنداز پنجره ها رو ببندم',
    'یادم بنداز فردا قرارداد رو بررسی کنم',
    'напомни закрыть окна перед уходом',
    'напомни завтра проверить договор',
  ],
  todo: [
    'merge the two shopping lists',
    'label the moving boxes',
    'tag mom in the vacation photos',
    'close the bank account',
    'approve the vacation request for anna',
    'stage the living room for the photos',
    'clone the plant cuttings',
    'جعبه ها رو برچسب بزن',
    'حساب بانکی رو ببند',
    'درخواست مرخصی سارا رو تایید کن',
    'закрыть счёт в банке',
    'подписать коробки для переезда',
  ],
  habit: [
    'commit to running every morning',
    'push ups every day',
    'هر روز شنا برو',
    'отжимания каждый день',
  ],
  expense: ['fork and knife set 20$', 'new branch cutter 35 dollars', 'چنگال و قاشق ۲۰۰ هزار تومن'],
  note: [
    'the tree outside has a broken branch',
    'i need to commit more to the team this quarter',
    'a good release from stress today',
    'شاخه درخت تو حیاط شکسته',
    'امروز خیلی خسته بودم',
    'ветка дерева сломалась во дворе',
  ],
};

// ---------------------------------------------------------------- expansion

/** A small seeded generator (mulberry32), so the data is the same on every run. */
export function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(r: () => number, list: readonly T[]): T {
  return list[Math.floor(r() * list.length)] as T;
}

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** One sentence from a template, in a language. */
export function expand(template: string, lang: Lang, r: () => number): string {
  let s = template;
  // Alternatives first, innermost out.
  for (let i = 0; i < 6 && /\[[^[\]]*\]/.test(s); i++)
    s = s.replace(/\[([^[\]]*)\]/g, (_, body: string) => pick(r, body.split('|')));
  for (let i = 0; i < 4 && /\{(\w+)\}/.test(s); i++)
    s = s.replace(/\{(\w+)\}/g, (_, name: string) => {
      if (name === 'n') {
        const n = String(1 + Math.floor(r() * (r() < 0.7 ? 200 : 4000)));
        return lang === 'fa' && r() < 0.4
          ? n.replace(/\d/g, (d) => FA_DIGITS[Number(d)] as string)
          : n;
      }
      const fill = FILL[name];
      if (!fill) return name;
      return pick(r, fill[lang] ?? fill['*'] ?? fill.en ?? ['']);
    });
  return s
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.:?!؟])/g, '$1')
    .trim();
}

/** Every git example, with its template's name. */
export function gitExamples(perTemplate = 24, seed = 11): GitExample[] {
  const r = rng(seed);
  const out: GitExample[] = [];
  for (const [key, says, terse] of [
    ...Object.entries(SAYS).map(([k, v]) => [k, v, false] as const),
    ...Object.entries(TERSE).map(([k, v]) => [`${k}`, v, true] as const),
  ]) {
    const [object, verb] = key.startsWith('other:')
      ? [key.slice(6) as GitObject, 'other' as VerbClass]
      : (key.split('.') as [GitObject, VerbClass]);
    for (const [lang, templates] of Object.entries(says) as Array<[Lang, string[]]>) {
      templates.forEach((tpl, i) => {
        const seen = new Set<string>();
        for (let k = 0; k < perTemplate * 3 && seen.size < perTemplate; k++) {
          const text = expand(tpl, lang, r);
          if (seen.has(text)) continue;
          seen.add(text);
          // Sloppy typing: no capitals, sometimes no final punctuation.
          const sloppy = r() < 0.3 ? text.toLowerCase().replace(/[?.!؟]$/, '') : text;
          out.push({
            text: sloppy,
            verb,
            object,
            template: `${key}/${lang}/${terse ? 't' : ''}${i}`,
            lang,
            terse,
          });
        }
      });
    }
  }
  return out;
}

/** Git sentences for the shape model's repository kind: one generator per action and language. */
export function gitGates(): Array<{ name: string; gen: (r: () => number) => string }> {
  const out: Array<{ name: string; gen: (r: () => number) => string }> = [];
  for (const [key, says] of Object.entries(SAYS))
    for (const [lang, templates] of Object.entries(says) as Array<[Lang, string[]]>)
      out.push({ name: `${key}/${lang}`, gen: (r) => expand(pick(r, templates), lang, r) });
  return out;
}

/** More sayings, added to an action's own, language by language. */
function addSays(more: Record<string, Says>): void {
  for (const [id, says] of Object.entries(more)) {
    const into = SAYS[id] ?? {};
    SAYS[id] = into;
    for (const [lang, list] of Object.entries(says) as Array<[Lang, string[]]>)
      into[lang] = [...(into[lang] ?? []), ...list];
  }
}

// ---------------------------------------------------------------- said of the thing just talked about

/**
 * "merge it", "ببندش", "закрой его": the verb is all the sentence has; which object it is, the
 * conversation says (model.ts `near`). Taught to the verb head with the object it usually has.
 */
const ABOUT_IT: Record<string, Says> = {
  'issue.close': {
    en: ['close it', 'close that one', "it's fixed, close it", 'done, close it'],
    fa: ['ببندش', 'اینو ببند', 'حل شد ببندش', 'همونو ببند'],
    ru: ['закрой его', 'закрывай её', 'закрой эту'],
  },
  'issue.reopen': {
    en: ['reopen it', 'open it again'],
    fa: ['دوباره بازش کن', 'بازش کن دوباره'],
    ru: ['переоткрой её', 'открой его снова'],
  },
  'issue.comment': {
    en: ['comment on it: {msg}', 'reply to it: {msg}', "write '{msg}' on it", 'tell them {msg}'],
    fa: ['زیرش بنویس: {msg}', 'روش کامنت بذار: {msg}', 'بهش جواب بده: {msg}'],
    ru: ['ответь там: {msg}', 'напиши в неё: {msg}'],
  },
  'issue.show': {
    en: ['show it', 'what does it say', 'show me that one again', 'open it'],
    fa: ['نشونش بده', 'اونو بیار ببینم', 'چی نوشته توش'],
    ru: ['покажи его', 'что там написано'],
  },
  'issue.assign': {
    en: ['assign it to {who}', 'give it to {who}', 'give that one to me'],
    fa: ['بدش به {who}', 'اساینش کن به {who}', 'بسپرش به {who}'],
    ru: ['назначь её на {who}', 'отдай его {who}'],
  },
  'issue.unassign': {
    en: ['unassign {who} from it', 'take me off it'],
    fa: ['{who} رو ازش بردار', 'منو ازش بردار'],
    ru: ['сними {who} с неё'],
  },
  'issue.label': {
    en: ['label it {lab}', 'tag it as {lab}', 'mark it {lab}'],
    fa: ['لیبل {lab} بهش بزن', 'بهش برچسب {lab} بده'],
    ru: ['пометь её {lab}', 'добавь ей метку {lab}'],
  },
  'issue.unlabel': {
    en: ['remove the {lab} label from it', 'untag it'],
    fa: ['لیبل {lab} رو ازش بردار', 'اون لیبل رو پاک کن'],
    ru: ['убери с неё метку {lab}'],
  },
  'issue.edit': {
    en: ['rename it to "{title}"', 'change its title to {title}'],
    fa: ['عنوانشو بکن {title}', 'اسمشو بذار {title}'],
    ru: ['переименуй её в {title}'],
  },
  'issue.milestone': {
    en: ['put it in {ms}', 'move it to milestone {ms}'],
    fa: ['بذارش تو مایلستون {ms}', 'ببرش تو {ms}'],
    ru: ['перенеси её в веху {ms}'],
  },
  'issue.lock': {
    en: ['lock it', 'lock it, people keep arguing'],
    fa: ['قفلش کن', 'بحثشو قفل کن'],
    ru: ['заблокируй её', 'залочь его'],
  },
  'issue.unlock': {
    en: ['unlock it', 'let people comment again'],
    fa: ['قفلشو باز کن'],
    ru: ['разблокируй её', 'разлочь его'],
  },
  'pr.merge': {
    en: ['merge it', 'merge that one', 'ship it', 'land it', 'squash it in'],
    fa: ['مرجش کن', 'اینو مرج کن', 'همونو مرج کن', 'مرج کن'],
    ru: ['смержи его', 'влей его', 'мержи'],
  },
  'pr.approve': {
    en: ['approve it', 'lgtm, approve', 'looks good, approve that'],
    fa: ['تاییدش کن', 'اپرووش کن'],
    ru: ['апрувни его', 'одобри его'],
  },
  'pr.close': {
    en: ['close it without merging', 'kill it, abandoned', 'decline it'],
    fa: ['بدون مرج ببندش', 'ولش کن ببندش'],
    ru: ['закрой его без мержа'],
  },
  'pr.diff': {
    en: ['what files does it change', 'what does it touch', 'show the diff'],
    fa: ['چه فایلایی رو عوض کرده', 'دیفشو نشون بده'],
    ru: ['какие файлы он меняет', 'покажи дифф'],
  },
  'pr.show': {
    en: ['show me that pr', 'open that one'],
    fa: ['اون پی ار رو بیار ببینم', 'اون PR رو نشون بده'],
    ru: ['покажи этот пр'],
  },
  'pr.request-review': {
    en: ['ask {who} to review it', 'get {who} to look at it'],
    fa: ['بده {who} ریویوش کنه', '{who} هم یه نگاه بهش بندازه'],
    ru: ['попроси {who} посмотреть его'],
  },
  'pr.assign': {
    en: ['assign it to {who}'],
    fa: ['اساینش کن به {who}'],
    ru: ['назначь его на {who}'],
  },
  'pr.label': {
    en: ['label it {lab}', 'add {lab} to it'],
    fa: ['لیبل {lab} بهش بزن'],
    ru: ['пометь его {lab}'],
  },
  'pr.checkout': {
    en: ['check it out locally', 'pull it down to test'],
    fa: ['بیارش رو لوکال', 'رو سیستمم چک اوتش کن'],
    ru: ['стяни его локально'],
  },
  'pr.ready': {
    en: ['mark it ready', "it's ready for review"],
    fa: ['آماده ریویوش کن'],
    ru: ['отметь его готовым'],
  },
  'commit.show': {
    en: ['show me that commit', 'what changed in it'],
    fa: ['اون کامیت رو نشون بده', 'توش چی عوض شده'],
    ru: ['покажи этот коммит'],
  },
  'local.revert': {
    en: ['revert it', 'revert that commit'],
    fa: ['ریورتش کن', 'اون کامیت رو برگردون'],
    ru: ['ревертни его'],
  },
  'branch.delete': {
    en: ['delete it', 'delete that branch'],
    fa: ['پاکش کن', 'اون برنچ رو حذف کن'],
    ru: ['удали её', 'удали эту ветку'],
  },
  'branch.switch': {
    en: ['switch to it', 'check it out'],
    fa: ['برو روش', 'سوییچ کن روش'],
    ru: ['переключись на неё'],
  },
};
addSays(ABOUT_IT);

// More ways of saying the same things.
const MORE: Record<string, Says> = {
  'pr.close': {
    en: ['[kill|decline|abandon] {pr} {n}[, it is abandoned|]', 'reject {pr} {n}'],
    fa: ['{pr} {n} رو ول کن ببندش'],
    ru: ['отклони {pr} {n}'],
  },
  'pr.reopen': {
    en: ['bring {pr} #{n} back[, we need it after all|]'],
    fa: ['{pr} {n} رو برگردون، لازمش داریم'],
    ru: ['верни {pr} {n}'],
  },
  'pr.diff': {
    en: ['which files does {pr} #{n} touch', 'what does {pr} {n} change'],
    fa: ['{pr} {n} به چه فایلایی دست زده'],
    ru: ['что меняет {pr} {n}'],
  },
  'pr.create': {
    en: [
      '{pr} {br} into {base} and ask {who} to review',
      'open a {pr} for {br} and request review from {who}',
    ],
    fa: ['از {br} یه {pr} بزن به {base} و ریویو بده به {who}'],
    ru: ['открой {pr} из {br} в {base} и позови {who} на ревью'],
  },
  'pr.list': {
    en: ['PRs with the {lab} label', '{pr}s labelled {lab}{in}'],
    fa: ['پی ارهای با لیبل {lab}'],
    ru: ['пул-реквесты с меткой {lab}'],
  },
  'pr.request-changes': {
    fa: ['برای {pr} {n} تغییرات بخواه: {msg}', '{pr} {n} رو برگشت بزن: {msg}'],
  },
  'pr.label': { fa: ['لیبل {lab} رو بزن رو {pr} {n}', 'به {pr} {n} لیبل {lab} بده'] },
  'release.list': {
    en: ['[show |]the last {k} releases[ of {repo}|]', 'latest releases{in}'],
    fa: ['{k} تا ریلیز آخر {repo}', 'ریلیزهای اخیر{in}'],
    ru: ['последние {k} релиза{in}'],
  },
  'release.show': {
    en: ['release notes for {tag}{in}', 'changelog of {tag}'],
    fa: ['ریلیز نوت {tag}', 'تغییرات نسخه {tag} چیه'],
    ru: ['что нового в {tag}'],
  },
  'commit.compare': {
    en: ["what's in {tag} that isn't in {tag}", 'commits between {tag} and {tag}'],
    fa: ['چی تو {tag} هست که تو {tag} نیست', 'کامیتای بین {tag} و {tag}'],
    ru: ['что есть в {tag} чего нет в {tag}', 'коммиты между {tag} и {tag}'],
  },
  'commit.list': {
    en: ['what did {who} commit [lately|this week|recently]'],
    fa: ['{who} این اواخر چی کامیت کرده', 'کامیتای {who}'],
    ru: ['что {who} коммитил на этой неделе'],
  },
  'account.connect': {
    en: ['log in to {prov} at git.example.com', 'connect my gitlab on git.company.dev'],
    fa: ['به گیت لب git.example.com وصل شو'],
    ru: ['подключи gitlab на git.example.com'],
  },
  'account.disconnect': {
    en: ['log out of {prov}', 'sign out from gitlab.com'],
    fa: ['از {prov} لاگ اوت کن', 'از gitlab.com خارج شو'],
    ru: ['выйди из {prov}'],
  },
  'account.whoami': { fa: ['رو {prov} کی ام من', 'من کی هستم تو گیت هاب'] },
  'repo.show': {
    fa: ['اطلاعات {repo}', 'مشخصات ریپوی {repo}'],
    en: ['info about {repo}', 'about {repo}'],
  },
  'repo.unstar': { fa: ['ستاره ام رو از {repo} پس بگیر'], en: ['take back my star from {repo}'] },
  'code.search': {
    fa: ['{q} کجاهای {repo} استفاده شده', '{q} رو تو کد {repo} پیدا کن'],
    en: ['where is {q} used in {repo}'],
  },
  'notification.read': { fa: ['اعلان های {repo} رو بزن خونده شد', 'همه نوتیفا رو سین کن'] },
  'local.status': {
    en: ['which files did i [touch|change|modify]', 'what files have i changed'],
    fa: ['به چه فایلایی دست زدم', 'کدوم فایلا رو عوض کردم'],
    ru: ['какие файлы я поменял'],
  },
  'local.commit': {
    en: ['commit with [the |]message {msg}', 'commit it as {msg}'],
    fa: ['یه کامیت بزن بگو {msg}', 'کامیت کن بنویس {msg}'],
    ru: ['закоммить с сообщением {msg}'],
  },
  'local.push': { fa: ['بفرست رو {base}', 'بفرستش به {br}'], en: ['send it up to {base}'] },
  'local.fetch': {
    en: ["fetch everything from the remote but don't merge"],
    fa: ['همه چیو از ریموت فچ کن ولی مرج نکن'],
    ru: ['сделай фетч но не мержи'],
  },
  'local.merge': {
    fa: ['{base} رو بیار تو برنچ خودم', '{base} رو بریز تو {br}'],
    en: ['pull {base} into my branch'],
  },
  'local.unstash': {
    en: ['apply my stash', 'stash apply'],
    fa: ['تغییرات استش شده رو برگردون', 'استش رو اپلای کن'],
    ru: ['примени стеш'],
  },
  'local.reset': {
    en: ['undo the last commit but keep the changes', 'soft reset to HEAD~1'],
    fa: ['کامیت آخر رو برگردون ولی تغییرات بمونه', 'ریست سافت به HEAD~1'],
    ru: ['откати последний коммит но оставь изменения'],
  },
  'local.discard': {
    en: ['get rid of all my uncommitted edits', 'wipe my local changes'],
    fa: ['هرچی کامیت نکردم رو پاک کن', 'تغییرات کامیت نشده رو بریز دور'],
    ru: ['удали все незакоммиченные изменения'],
  },
  'local.stage': { fa: ['{path} رو بذار تو کامیت بعدی'], en: ['put {path} in the next commit'] },
  'local.unstage': { fa: ['{path} رو آن استیج کن'] },
  'local.diff': { fa: ['دیف با HEAD~2', 'فرق با {base} رو نشون بده'], en: ['diff against HEAD~2'] },
  'branch.switch': { fa: ['منو ببر رو برنچ {br}', 'سویچ کن {br}'], en: ['take me to {br}'] },
  'branch.rename': { fa: ['برنچ {br} رو رینیم کن به {br}'] },
  'issue.unassign': { fa: ['{who} دیگه مسئول ایشو {n} نیست، برش دار'] },
  'issue.unlabel': { fa: ['{iss} {n} دیگه {lab} نیست، اون لیبل رو پاک کن'] },
  'issue.assign': { fa: ['بدش به {who}'] },
  'other:repo': {
    en: ['transfer this repo to the {repo} org', 'create a webhook that pings slack on push'],
    fa: ['این ریپو رو منتقل کن به ارگ {repo}', 'یه وب هوک بساز که موقع پوش به تلگرام خبر بده'],
    ru: ['передай этот репо в организацию {repo}'],
  },
  'other:commit': {
    en: ['squash my last three commits into one', 'use bisect to find the bad commit'],
    fa: ['با بایسکت پیدا کن کدوم کامیت لاگین رو خراب کرد'],
    ru: ['сквошни три последних коммита в один'],
  },
};
addSays(MORE);

// Russian as it is typed at work: slang verbs, cases, and the word order of speech.
const RU_SPOKEN: Record<string, string[]> = {
  'issue.close': ['[задачу|ишью|баг] {n} закрывай', '{n}-ю закрой', 'закрой-ка #{n}'],
  'issue.create': [
    'заведи ишью{in}: {fault}',
    'надо завести баг: {fault}',
    '{fault} — заведи тикет',
  ],
  'issue.list': ['что висит на мне{in}', 'какие ишью открыты{in}', 'покажи задачи{in}'],
  'pr.reopen': ['{pr} {n} открой обратно', 'верни {pr} {n} обратно'],
  'pr.label': ['к {pr} {n} добавь метку {lab}', '{pr} {n} пометь {lab}'],
  'pr.merge': ['мерджи {pr} {n}', 'вмерджи #{n}', 'сливай {pr} {n}'],
  'pr.create': ['запили пр из {br} в {base}', 'открой мр из {br}'],
  'branch.delete': ['ветку {br} удаляй', 'теперь удаляй {br}', 'снеси ветку {br}'],
  'branch.switch': ['свитчнись на {br}', 'переключись-ка на {base}', 'перейди в ветку {br}'],
  'branch.create': ['создай бранч {br}', 'отпочкуй ветку {br} от {base}'],
  'ci.list': ['пайплайны на {base}', 'последние сборки на {base}', 'все запуски CI{in}'],
  'ci.rerun': ['рестартани пайплайн на {base}', 'перезапусти упавшие джобы', 'прогони CI заново'],
  'ci.status': ['как там сборка на {base}', 'CI зелёный?', 'упал ли пайплайн на {base}'],
  'tag.delete': ['удали тег {tag}', 'тег {tag} снеси'],
  'tag.create': ['повесь тег {tag}', 'тегни {tag}'],
  'label.delete': ['метку {lab}{in} снести', 'удали метку {lab}'],
  'label.edit': ['перекрась метку {lab} в оранжевый', 'переименуй метку {lab} в {lab}'],
  'label.list': ['какие метки есть{in}', 'метки{in}'],
  'repo.list': ['какие у меня репы на {prov}', 'покажи мои репы', 'список моих реп'],
  'repo.create': ['новый приватный реп {repo} на {prov}', 'заведи реп {repo}'],
  'repo.delete': ['снеси репу {repo}', 'удали реп {repo}'],
  'notification.list': ['покажи уведомления', 'есть новые уведомления?', 'что в уведомлениях'],
  'notification.read': ['прочитай уведомления на {prov}', 'отметь все уведомления прочитанными'],
  'account.list': ['список подключённых аккаунтов', 'какие аккаунты подключены'],
  'local.diff': ['покажи дифф', 'что я наменял', 'дифф по {path}'],
  'local.pull': ['спуль {base}', 'пульни изменения', 'подтяни свежак с {base}'],
  'local.stash': ['застэшь изменения', 'убери изменения в стэш', 'застешь всё'],
  'local.discard': ['откати все локальные изменения', 'выкинь все локальные правки'],
  'local.push': ['пушни в {br}', 'запушь всё', 'залей на сервер'],
  'local.commit': ['коммитни: {msg}', 'закоммить с месседжем "{msg}"'],
  'local.status': ['что у меня не закоммичено', 'гит статус'],
};
addSays(Object.fromEntries(Object.entries(RU_SPOKEN).map(([id, ru]) => [id, { ru }])));

// Git, but not something the box does, in more of its languages.
const OTHER_MORE: Record<string, Says> = {
  'other:commit': {
    en: [
      'rewrite history to remove the leaked .env file',
      'sign every commit',
      'rebase -i the last {k} commits',
    ],
    ru: ['засквошь последние три коммита в один', 'перепиши историю чтобы убрать секрет'],
    fr: ['squashe mes trois derniers commits en un seul'],
    de: ['squashe die letzten drei commits'],
  },
  'other:repo': {
    en: [
      'edit the project wiki',
      'add a CODEOWNERS rule for src/box',
      'archive the {repo} repo',
      'set up branch protection rules',
    ],
    fa: [
      'یه قانون CODEOWNERS برای src/box بذار',
      'ویکی پروژه رو ویرایش کن',
      'روی main برنچ پروتکشن بذار',
    ],
    ru: [
      'отредактируй вики проекта',
      'заархивируй репозиторий {repo}',
      'настрой защиту ветки {base}',
    ],
    zh: ['把这个仓库转移到 aturzone 组织', '编辑项目wiki'],
    es: ['archiva el repositorio {repo}'],
  },
};
addSays(OTHER_MORE);

// Phrasings written apart from the templates above, by a writer who saw neither them nor the
// blind corpus: tools/git-phrases.json. Its "_not_git" sentences teach the shape model too.
const PHRASES = JSON.parse(
  readFileSync(join(import.meta.dirname, 'git-phrases.json'), 'utf8'),
) as Record<string, Says>;
const { _not_git: notGitPhrases, ...phrases } = PHRASES;
addSays(phrases);
/** Everyday sentences that only sound like git, by language. */
export const NOT_GIT_PHRASES: Says = notGitPhrases ?? {};

// The gate's own: everyday sentences that only sound like git, and git said in two words
// (tools/git-gate.json, written apart from everything else here).
const GATE = JSON.parse(readFileSync(join(import.meta.dirname, 'git-gate.json'), 'utf8')) as {
  not_git: Says;
  terse: Record<string, Says>;
};
/** More everyday sentences, by language: never git. */
export const NOT_GIT_MORE: Says = GATE.not_git;
/** Git said in a word or two -- "push", "مرجش کن", "апрувни" -- by action. */
export const TERSE: Record<string, Says> = GATE.terse;
