/**
 * Reading the values out of what was typed: deterministic code, one parser per kind of card.
 *
 * The classifier only says WHICH card; everything on the card -- a date, an amount, a unit, a
 * sum -- is computed here, so nothing a model guesses can put a wrong number on a page. Each
 * parser also says how complete its card is (0 to 1), which the bar uses to know when a card is
 * ready to add.
 *
 * Both languages are read, on folded text (see text.ts): digits are ASCII by the time a parser
 * sees them, and ZWNJ has become a space.
 */

import {
  COLOR_WORD_PATTERN,
  hexToRgb,
  NAMED_COLORS,
  REFERENCE_COLORS,
  rgbToHex,
  shade,
} from '@core/box/colors.ts';
import type { ShapeIntent } from '@core/box/intents.ts';
import { type IssueData, parseIssue } from '@core/box/issue.ts';
import {
  type Currency,
  capitalize,
  collapse,
  detectCurrency,
  digitsFor,
  findAmount,
  fold,
  initials,
  isPersian,
  numberWord,
  RUSSIAN,
  removeRange,
  tidy,
  titleCase,
  words,
} from '@core/box/text.ts';
import { convertValue, DEFAULT_TARGET, UNIT_ALIASES, UNIT_PATTERN } from '@core/box/units.ts';
import { daysBetween, findDate, jalaliToGregorian, jalaliYear } from '@core/box/when.ts';
import { instantIn, localZone, ZONE_RE, ZONES, type Zone } from '@core/box/zones.ts';

export interface EventData {
  title: string;
  date: Date | null;
  hasTime: boolean;
  people: string[];
  link: string | null;
  location: string | null;
}
export interface ReminderData {
  task: string;
  when: Date | null;
  hasTime: boolean;
}
export interface TodoData {
  items: string[];
  shopping: boolean;
}
export interface TimerData {
  seconds: number | null;
  label: string;
}
export interface HabitData {
  title: string;
  days: number[];
  perWeek: number | null;
  label: string | null;
}
export interface ColorData {
  hex: string | null;
  name: string | null;
}
export interface SplitData {
  total: number | null;
  people: number | null;
  currency: Currency;
}
export interface ExpenseData {
  amount: number | null;
  item: string;
  currency: Currency;
}
export interface ConvertData {
  value: number | null;
  from: string | null;
  to: string | null;
  result: number | null;
}
export interface CalcData {
  expression: string;
  result: number | null;
}
export interface TravelData {
  destination: string | null;
  origin: string | null;
  start: Date | null;
  end: Date | null;
  mode: 'flight' | 'train' | 'bus' | 'car' | null;
}
export interface PollData {
  title: string;
  options: string[];
}
export interface ContactData {
  name: string;
  phone: string | null;
  email: string | null;
  initials: string;
}
export interface LinkData {
  url: string | null;
  domain: string | null;
  note: string;
}
export interface CountdownData {
  title: string;
  date: Date | null;
  days: number | null;
}
export interface TimezoneData {
  instant: Date | null;
  isNow: boolean;
  from: Zone;
  to: Zone | null;
}
export interface RandomData {
  kind: 'dice' | 'coin' | 'number' | 'pick';
  count: number;
  sides: number;
  min: number;
  max: number;
  options: string[];
}
export interface GoalData {
  title: string;
  current: number;
  target: number | null;
  unit: string | null;
}
export interface NoteData {
  title: string;
  body: string;
}

export interface ShapeDataMap {
  event: EventData;
  reminder: ReminderData;
  todo: TodoData;
  timer: TimerData;
  habit: HabitData;
  color: ColorData;
  split: SplitData;
  expense: ExpenseData;
  convert: ConvertData;
  calc: CalcData;
  travel: TravelData;
  poll: PollData;
  contact: ContactData;
  link: LinkData;
  countdown: CountdownData;
  timezone: TimezoneData;
  random: RandomData;
  goal: GoalData;
  issue: IssueData;
  note: NoteData;
}

// ---------------------------------------------------------------- event and reminder

const CALLS: Record<string, string> = {
  zoom: 'Zoom',
  'google meet': 'Google Meet',
  gmeet: 'Google Meet',
  meet: 'Google Meet',
  teams: 'Teams',
  facetime: 'FaceTime',
  skype: 'Skype',
  discord: 'Discord',
  whatsapp: 'WhatsApp',
  skyroom: 'Skyroom',
  'اسکای روم': 'Skyroom',
  زوم: 'Zoom',
  'گوگل میت': 'Google Meet',
  واتساپ: 'WhatsApp',
  تلگرام: 'Telegram',
  зум: 'Zoom',
  телеграм: 'Telegram',
  телеграме: 'Telegram',
};

export function parseEvent(text: string, ref: Date): EventData {
  let rest = ` ${fold(text)} `;
  const date = findDate(rest.toLowerCase(), ref);
  if (date) rest = removeRange(rest, date.index, date.length);

  let link: string | null = null;
  const lm =
    /\s(?:on|over|via)\s+(google meet|gmeet|zoom|meet|teams|facetime|skype|discord|whatsapp|skyroom)\b/i.exec(
      rest,
    ) ??
    /\s(?:تو|توی|در|روی|با)?\s*(زوم|گوگل میت|اسکای روم|واتساپ|تلگرام)(?=\s|$)/.exec(rest) ??
    /\s(?:в|по)\s+(зум|телеграме?|skype|zoom|teams|google meet)(?=\s|$)/iu.exec(rest);
  if (lm) {
    link = CALLS[(lm[1] ?? '').toLowerCase()] ?? null;
    rest = removeRange(rest, lm.index, lm[0].length);
  }

  let location: string | null = null;
  const loc =
    /\s(?:at|in)\s+(?!\d)([a-z][\w' ]{1,40}?)(?=\s+(?:with|on|for)\s|\s*$)/i.exec(rest) ??
    /\s(?:توی|تو|در)\s+([؀-ۿ][؀-ۿ ]{1,30}?)(?=\s+(?:با)\s|\s*$)/.exec(rest) ??
    /\s(?:в|во|на)\s+([а-яё][\p{L} ]{1,30}?)(?=\s+(?:с|со)\s|\s*$)/iu.exec(rest);
  if (loc) {
    location =
      isPersian(loc[1] ?? '') || RUSSIAN.test(loc[1] ?? '')
        ? (loc[1] ?? '').trim()
        : titleCase((loc[1] ?? '').trim());
    rest = removeRange(rest, loc.index, loc[0].length);
  }

  let people: string[] = [];
  const wm =
    /\swith\s+(.+)$/i.exec(rest) ?? /\sبا\s+(.+)$/.exec(rest) ?? /\s(?:с|со)\s+(.+)$/iu.exec(rest);
  if (wm) {
    const segment = (wm[1] ?? '').replace(
      /\s+(?:on|at|in|for|about|to|from|via|over|برای|در|تو|в|на|про|о|об)\s+.*$/iu,
      '',
    );
    people = segment
      .split(/\s*(?:,|&|\band\b|\sو\s|\sи\s)\s*/iu)
      .map((p) => p.trim())
      .filter((p) => p && p.split(' ').length <= 3 && !/^(the|my|a|team)$/i.test(p))
      .map((p) => (isPersian(p) ? p : titleCase(p)));
    // "с Анной" is Anna: the instrumental case off a Russian name, as well as can be done.
    people = people.map((p) =>
      RUSSIAN.test(p)
        ? p.replace(/(?<=\p{L}{2})(ой|ей|ом|ем)$/u, (e) => (e === 'ой' || e === 'ей' ? 'а' : ''))
        : p,
    );
    rest = `${rest.slice(0, wm.index)} ${(wm[1] ?? '').slice(segment.length)}`;
  }

  return {
    title: capitalize(tidy(rest)),
    date: date?.start ?? null,
    hasTime: date?.hasTime ?? false,
    people,
    link,
    location,
  };
}

export function parseReminder(text: string, ref: Date): ReminderData {
  let rest = ` ${fold(text)} `;
  rest = rest.replace(
    /\s(?:please\s+)?(?:remind me(?:\s+to)?|reminder:?|don'?t forget(?:\s+to)?|remember to)\s/i,
    ' ',
  );
  rest = rest.replace(
    /\s(?:یادم بنداز(?:\s+که)?|یادآوری(?:\s+کن)?|یادت باشه(?:\s+که)?|فراموش نکن(?:\s+که)?|یادم باشه(?:\s+که)?)\s/,
    ' ',
  );
  rest = rest.replace(
    /\s(?:напомни(?:\s+мне)?(?:\s+(?:что|чтобы))?(?:\s+нужно)?|напоминание:?|не забыть|не забудь(?:\s+что)?|надо не забыть)\s/iu,
    ' ',
  );
  rest = rest.replace(
    /\s(?:urgent(?:ly)?|asap|important|فوری|مهم|срочно|важно|!+)(?=\s|$)/giu,
    ' ',
  );
  const date = findDate(rest.toLowerCase(), ref);
  if (date) rest = removeRange(rest, date.index, date.length);
  return {
    task: capitalize(tidy(rest)),
    when: date?.start ?? null,
    hasTime: date?.hasTime ?? false,
  };
}

// ---------------------------------------------------------------- lists and time

export function parseTodo(text: string): TodoData {
  let rest = collapse(fold(text).replace(/\n/g, ', '));
  const shopping =
    /\b(buy|get|groceries|shopping|pick up|order)\b|بخر|خرید|بگیر|купить|купи|покупки|список покупок/iu.test(
      rest,
    );
  rest = rest.replace(
    /^(?:to ?do|todo list|list|shopping list|groceries|کارها|لیست خرید|لیست|خرید|список покупок|список дел|список|покупки|дела)\s*:?\s*/iu,
    '',
  );
  rest = rest.replace(/^(?:купить|купи)\s+/iu, '');
  rest = rest.replace(/^(buy|get|pick up|grab|order)\s+/i, '');
  rest = rest.replace(/\s+(بخر|بخرم|بگیر|بگیرم|بخریم)\s*$/, '');
  const items = rest
    .split(/\s*(?:,|;|\s&\s|\band\b|\sو\s|\sи\s|\n)\s*/iu)
    .map((s) =>
      s
        .trim()
        .replace(/^(?:buy|get|also)\s+/i, '')
        .replace(/[.!]+$/, ''),
    )
    .filter(Boolean)
    .map(capitalize);
  return { items, shopping };
}

const FA_WORDS: Record<string, number> = {
  یک: 1,
  یه: 1,
  دو: 2,
  سه: 3,
  چهار: 4,
  پنج: 5,
  شش: 6,
  هفت: 7,
  هشت: 8,
  نه: 9,
  ده: 10,
  پانزده: 15,
  بیست: 20,
  سی: 30,
  چهل: 40,
  پنجاه: 50,
  شصت: 60,
};
/** A Persian number word just before a unit of time: «ده دقیقه» is 10 minutes. */
const FA_DURATION_WORD = new RegExp(
  `(?<![\\p{L}\\d])(${Object.keys(FA_WORDS).join('|')})(?=\\s*(دقیقه|ثانیه|ساعت))`,
  'gu',
);

export function parseTimer(text: string): TimerData {
  let rest = ` ${fold(text).toLowerCase()} `;
  let seconds = 0;
  let found = false;
  const special: Array<[RegExp, number]> = [
    [/\bpomodoro\b|پومودورو|помодоро/, 25 * 60],
    [/\bhalf an? hour\b|نیم ساعت|полчаса/, 30 * 60],
    [/\ban? hour\b|یک ساعت|یه ساعت|(?<!\d\s?)(?<!\p{L})(?:один\s+)?час(?!\p{L})/u, 60 * 60],
    [/\ba minute\b|یک دقیقه|یه دقیقه|(?<!\d\s?)(?<!\p{L})минуту(?!\p{L})/u, 60],
  ];
  for (const [re, s] of special) {
    if (re.test(rest)) {
      seconds += s;
      found = true;
      if (!/pomodoro/.test(re.source)) rest = rest.replace(re, ' ');
    }
  }
  const unit = (u: string): number =>
    /^(h|ساعت|ч)/.test(u) ? 3600 : /^(s|ثانیه|с)/.test(u) ? 1 : 60;
  rest = rest.replace(FA_DURATION_WORD, (w) => String(FA_WORDS[w] ?? w));
  rest = rest.replace(
    /(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s|ساعت|دقیقه|ثانیه|час(?:а|ов)?|ч|минут[аы]?|мин|секунд[аы]?|сек)(?=\s|$|[^a-zа-я])/gu,
    (_, n: string, u: string) => {
      seconds += Number(n) * unit(u);
      found = true;
      return ' ';
    },
  );
  rest = rest.replace(/\b(\d{1,2}):(\d{2})\b/, (_, m: string, s: string) => {
    seconds += Number(m) * 60 + Number(s);
    found = true;
    return ' ';
  });
  const label = tidy(
    rest.replace(
      words(
        'timer|set|start|a|for|countdown|of|تایمر|بذار|بزن|برای|شروع|یه|таймер|поставь|запусти|засеки|на',
      ),
      ' ',
    ),
  );
  return { seconds: found ? Math.round(seconds) : null, label: capitalize(label) };
}

export function formatClock(total: number): string {
  const s = Math.max(0, Math.round(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const EN_DAY =
  /\b(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(?:day|nesday|sday|urday|rsday)?s?\b/gi;
const EN_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
/** Russian weekdays by JS index, as the stems every case of them starts with. */
const RU_DAY_STEMS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const RU_DAY =
  /(?<!\p{L})(?:воскресень\p{L}*|понедельник\p{L}*|вторник\p{L}*|сред\p{L}*|четверг\p{L}*|пятниц\p{L}*|суббот\p{L}*|вс|пн|вт|ср|чт|пт|сб)(?!\p{L})/giu;
const RU_FULL: Record<string, string> = {
  воскр: 'вс',
  понед: 'пн',
  вторн: 'вт',
  сред: 'ср',
  четв: 'чт',
  пятн: 'пт',
  субб: 'сб',
};

function spread(n: number): number[] {
  const presets: Record<number, number[]> = {
    1: [1],
    2: [2, 4],
    3: [1, 3, 5],
    4: [1, 2, 4, 5],
    5: [1, 2, 3, 4, 5],
    6: [1, 2, 3, 4, 5, 6],
  };
  return presets[n] ?? [0, 1, 2, 3, 4, 5, 6];
}

export function parseHabit(text: string): HabitData {
  let rest = ` ${fold(text)} `;
  let days: number[] = [];
  let perWeek: number | null = null;
  let label: string | null = null;
  const fa = isPersian(rest);
  const ru = RUSSIAN.test(rest);

  const nx =
    /\b(\d|once|twice|thrice)\s*(?:x|times?)?\s*(?:a|per|each|every)\s+week\b/i.exec(rest) ??
    /هفته ?(?:ای|‌ای)?\s*(\d|یک|دو|سه|چهار|پنج|شش)\s*(?:بار|روز)/.exec(rest) ??
    /(\d|один|два|три|четыре|пять|шесть)\s*раз(?:а)?\s+в\s+неделю/iu.exec(rest);
  if (nx) {
    const word = (nx[1] ?? '').toLowerCase();
    perWeek =
      word === 'once' ? 1 : word === 'twice' ? 2 : word === 'thrice' ? 3 : (numberWord(word) ?? 1);
    rest = rest.replace(nx[0], ' ');
    label = fa ? `هفته‌ای ${perWeek} بار` : ru ? `${perWeek}× в неделю` : `${perWeek}× a week`;
  }
  const daily =
    /\b(?:every\s*day|daily|every (?:morning|night|evening|afternoon)|each (?:day|morning|night))\b|هر روز|روزانه|هر صبح|هر شب|هر عصر|каждый день|ежедневно|каждое утро|каждый вечер|каждую ночь/iu;
  if (daily.test(rest)) {
    days = [0, 1, 2, 3, 4, 5, 6];
    const part =
      /\b(?:every|each)\s+(morning|night|evening|afternoon)\b|هر (صبح|شب|عصر)|(каждое утро|каждый вечер|каждую ночь)/iu.exec(
        rest,
      );
    label = part
      ? fa
        ? `هر ${part[2] ?? ''}`
        : part[3]
          ? capitalize(part[3].toLowerCase())
          : `Every ${(part[1] ?? '').toLowerCase()}`
      : fa
        ? 'هر روز'
        : ru
          ? 'Каждый день'
          : 'Daily';
    rest = rest.replace(new RegExp(daily.source, 'giu'), ' ');
  } else if (/\b(?:weekdays|every weekday)\b|روزهای کاری|по будням|в будни/iu.test(rest)) {
    // An Iranian working week runs Saturday to Wednesday.
    days = fa ? [6, 0, 1, 2, 3] : [1, 2, 3, 4, 5];
    label = fa ? 'روزهای کاری' : ru ? 'По будням' : 'Weekdays';
    rest = rest.replace(/\b(?:every\s+)?weekdays?\b|روزهای کاری|по будням|в будни/giu, ' ');
  } else {
    const found = new Set<number>();
    rest = rest.replace(EN_DAY, (_m: string, d: string) => {
      const i = EN_DAYS.indexOf(d.slice(0, 3).toLowerCase());
      if (i >= 0) found.add(i);
      return ' ';
    });
    // "по пн, ср и пт", "по вторникам и четвергам".
    rest = rest.replace(RU_DAY, (w: string) => {
      const low = w.toLowerCase();
      const short = Object.entries(RU_FULL).find(([k]) => low.startsWith(k))?.[1] ?? low;
      const i = RU_DAY_STEMS.indexOf(short);
      if (i >= 0) found.add(i);
      return ' ';
    });
    rest = rest.replace(/(?<!\p{L})по(?!\p{L})/giu, ' ');
    if (found.size) {
      days = [...found].sort();
      if (!label)
        label = ru
          ? days.length === 1
            ? 'Раз в неделю'
            : `${days.length}× в неделю`
          : days.length === 1
            ? 'Weekly'
            : `${days.length}× a week`;
    }
  }
  if (!label && /\bweekly\b|هفتگی|еженедельно|раз в неделю/iu.test(rest)) {
    perWeek = 1;
    label = fa ? 'هفتگی' : ru ? 'Раз в неделю' : 'Weekly';
  }
  rest = rest.replace(
    words(
      "every|each|weekly|habit|routine|start|i want to|i will|i'll|عادت|هفتگی|میخوام|می خوام|باید|привычка|хочу|буду|еженедельно|раз в неделю",
    ),
    ' ',
  );
  rest = rest.replace(/\b(?:in the )?(?:morning|night|evening)s?\b/gi, ' ');
  if (!days.length && perWeek) days = spread(perWeek);
  return { title: capitalize(tidy(rest)), days, perWeek, label };
}

// ---------------------------------------------------------------- colour

export function parseColor(text: string): ColorData {
  const t = fold(text).toLowerCase();
  const hex = /#([0-9a-f]{6}|[0-9a-f]{3})\b/.exec(t);
  if (hex) {
    const rgb = hexToRgb(hex[0]);
    return { hex: rgb ? rgbToHex(...rgb) : null, name: null };
  }
  const rgb = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/.exec(t);
  if (rgb) return { hex: rgbToHex(Number(rgb[1]), Number(rgb[2]), Number(rgb[3])), name: null };
  const named = new RegExp(
    `(?:^|[^a-z\\u0600-\\u06ff])(${COLOR_WORD_PATTERN})(?=$|[^a-z\\u0600-\\u06ff])`,
  ).exec(t);
  if (!named) return { hex: null, name: null };
  const name = named[1] ?? '';
  let value = REFERENCE_COLORS[name] ?? NAMED_COLORS[name] ?? null;
  if (value) {
    if (/\b(light|pale|pastel|soft|baby)\b|روشن|ملایم|پاستلی/.test(t)) value = shade(value, 0.45);
    else if (/\b(dark|deep)\b|تیره|پررنگ|سیر/.test(t)) value = shade(value, -0.4);
  }
  const words = collapse(t.replace(/^(?:the\s+)?(?:colou?r|shade|hue)\s+(?:of\s+)?|رنگ\s+/, ''));
  return { hex: value, name: words.length <= 32 ? words : name };
}

// ---------------------------------------------------------------- money

export function parseSplit(text: string): SplitData {
  let rest = fold(text);
  let people: number | null = null;
  const words = 'two|three|four|five|six|seven|eight|nine|ten|دو|سه|چهار|پنج|شش|هفت|هشت|نه|ده';
  const n =
    new RegExp(
      `\\b(?:between|among|amongst|with|by|for|into)\\s+(\\d+|${words})\\b(?:\\s*(?:people|persons|friends|of us|ways))?`,
      'i',
    ).exec(rest) ??
    new RegExp(`(?:بین|برای|تقسیم بر)\\s*(\\d+|${words})\\s*(?:نفر|تا)?`).exec(rest) ??
    /(?:на|между)\s+(\d+|двоих|троих|четверых|пятерых|два|три|четыре|пять)(?:\s*(?:человек\p{L}*|чел))?(?!\p{L})/iu.exec(
      rest,
    ) ??
    new RegExp(`\\b(\\d+|${words})\\s*(?:ways|people|persons|friends|of us|نفر|نفری)\\b`, 'i').exec(
      rest,
    );
  if (n) {
    people = numberWord(n[1] ?? '') ?? null;
    rest = rest.replace(n[0], ' ');
  } else {
    const names = /\b(?:between|among|with)\s+(.+)$/i.exec(rest) ?? /(?:بین|با)\s+(.+)$/.exec(rest);
    if (names) {
      const parts = (names[1] ?? '')
        .split(/\s*(?:,|&|\band\b|\sو\s)\s*/i)
        .filter((p) => /[a-z؀-ۿ]/i.test(p));
      if (parts.length >= 2) people = parts.length;
      rest = rest.replace(names[0], ' ');
    }
  }
  const amount = findAmount(rest);
  return {
    total: amount?.value ?? null,
    people: people && people > 0 ? people : null,
    currency: detectCurrency(text),
  };
}

export function parseExpense(text: string): ExpenseData {
  const t = fold(text);
  const amount = findAmount(t);
  const rest = amount ? removeRange(t, amount.index, amount.length) : t;
  const on =
    /\b(?:on|for|at|in)\s+(.+)$/i.exec(rest) ??
    /(?:برای|بابت|سر)\s+(.+?)(?:\s+(?:دادم|خرج کردم|پرداختم|شد))?$/.exec(rest) ??
    /(?<!\p{L})(?:на|за)\s+(.+)$/iu.exec(rest);
  let item = on ? (on[1] ?? '') : rest;
  item = item.replace(
    words(
      'spent|paid|pay|bought|cost|costs|rupees|rs|bucks|dollars|today|yesterday|خرج کردم|دادم|پرداختم|پرداخت|هزینه|تومن|تومان|ریال|هزار|میلیون|خریدم|امروز|دیروز|потратил[аи]?|заплатил[аи]?|купил[аи]?|стоит|стоило|руб\\p{L}*|р|₽|сегодня|вчера',
    ),
    ' ',
  );
  return {
    amount: amount?.value ?? null,
    item: capitalize(tidy(item)),
    currency: detectCurrency(text),
  };
}

// ---------------------------------------------------------------- numbers

export function parseConvert(text: string): ConvertData {
  const t = fold(text)
    .toLowerCase()
    .replace(/degrees?\s+|درجه\s*|градус\p{L}*\s*/gu, '°')
    .replace(/°\s+/g, '°');
  const full = new RegExp(
    `(-?\\d+(?:\\.\\d+)?)\\s*(${UNIT_PATTERN})\\s+(?:to|in|into|as|=|->|به|چند|برابر|в|во|перевести в)\\s+(?:چند\\s+)?(${UNIT_PATTERN})(?![a-z\\u0600-\\u06ff\\u0400-\\u04ff])`,
    'iu',
  ).exec(t);
  if (full) {
    const value = Number(full[1]);
    const from = UNIT_ALIASES[full[2] ?? ''] ?? null;
    const to = UNIT_ALIASES[full[3] ?? ''] ?? null;
    const result = from && to ? convertValue(value, from, to) : null;
    if (result !== null) return { value, from, to, result };
  }
  const part = new RegExp(
    `(-?\\d+(?:\\.\\d+)?)\\s*(${UNIT_PATTERN})(?![a-z\\u0600-\\u06ff\\u0400-\\u04ff])`,
    'iu',
  ).exec(t);
  if (part) {
    const value = Number(part[1]);
    const from = UNIT_ALIASES[part[2] ?? ''] ?? null;
    const to = from ? (DEFAULT_TARGET[from] ?? null) : null;
    return { value, from, to, result: from && to ? convertValue(value, from, to) : null };
  }
  return { value: null, from: null, to: null, result: null };
}

type Tok = { t: 'num'; v: number } | { t: 'op'; v: string } | { t: 'lp' } | { t: 'rp' };
const PREC: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3, 'u-': 4 };

export function normalizeExpression(text: string): string {
  let s = fold(text).toLowerCase().trim();
  s = s
    .replace(
      /^(?:what(?:'s| is)|calc(?:ulate)?|compute|how much is|حساب کن|چقدر میشه|چند میشه)\s+/,
      '',
    )
    .replace(/[=?]+\s*$/, '')
    .replace(/\s*(?:میشه|می شود|چند|چقدر)\s*$/, '');
  s = s.replace(/(\d),(\d{3})/g, '$1$2');
  s = s.replace(
    /(\d+(?:\.\d+)?)\s*(?:%|درصد)\s*(?:off|تخفیف)\s+(?:روی\s+)?(\d+(?:\.\d+)?)/g,
    '$2*(1-$1/100)',
  );
  s = s.replace(/(\d+(?:\.\d+)?)\s*(?:%|درصد)\s*(?:of|از)\s+/g, '($1/100)*');
  s = s.replace(/(\d+(?:\.\d+)?)\s*(?:%|درصد)/g, '($1/100)');
  s = s.replace(/\bplus\b|به علاوه|بعلاوه|جمع/g, '+').replace(/\bminus\b|منهای/g, '-');
  s = s
    .replace(/\b(?:times|multiplied by)\b|ضرب در|ضربدر/g, '*')
    .replace(/\b(?:divided by|over)\b|تقسیم بر/g, '/');
  s = s.replace(/\bsquared\b|به توان ۲|به توان 2/g, '^2').replace(/\bcubed\b/g, '^3');
  s = s.replace(/[×x]/g, '*').replace(/÷/g, '/').replace(/\*\*/g, '^');
  return s;
}

function tokenize(s: string): Tok[] | null {
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i] as string;
    if (c === ' ') {
      i++;
      continue;
    }
    if (/[\d.]/.test(c)) {
      let j = i;
      while (j < s.length && /[\d.]/.test(s[j] as string)) j++;
      const v = Number(s.slice(i, j));
      if (!Number.isFinite(v)) return null;
      out.push({ t: 'num', v });
      i = j;
      continue;
    }
    if ('+-*/^'.includes(c)) {
      const prev = out[out.length - 1];
      const unary = c === '-' && (!prev || prev.t === 'op' || prev.t === 'lp');
      out.push({ t: 'op', v: unary ? 'u-' : c });
      i++;
      continue;
    }
    if (c === '(') {
      const prev = out[out.length - 1];
      if (prev && (prev.t === 'num' || prev.t === 'rp')) out.push({ t: 'op', v: '*' });
      out.push({ t: 'lp' });
      i++;
      continue;
    }
    if (c === ')') {
      out.push({ t: 'rp' });
      i++;
      continue;
    }
    return null;
  }
  return out;
}

/** Shunting-yard, then the stack. Never eval. */
export function evaluate(expr: string): number | null {
  const tokens = tokenize(expr);
  if (!tokens?.length) return null;
  const output: Tok[] = [];
  const ops: Tok[] = [];
  for (const tok of tokens) {
    if (tok.t === 'num') output.push(tok);
    else if (tok.t === 'op') {
      for (;;) {
        const top = ops[ops.length - 1];
        if (!top || top.t !== 'op') break;
        const p1 = PREC[tok.v] ?? 0;
        const p2 = PREC[top.v] ?? 0;
        if (p2 > p1 || (p2 === p1 && tok.v !== '^' && tok.v !== 'u-'))
          output.push(ops.pop() as Tok);
        else break;
      }
      ops.push(tok);
    } else if (tok.t === 'lp') ops.push(tok);
    else {
      while (ops.length && ops[ops.length - 1]?.t !== 'lp') output.push(ops.pop() as Tok);
      if (!ops.length) return null;
      ops.pop();
    }
  }
  while (ops.length) {
    const op = ops.pop() as Tok;
    if (op.t === 'lp') return null;
    output.push(op);
  }
  const stack: number[] = [];
  for (const tok of output) {
    if (tok.t === 'num') stack.push(tok.v);
    else if (tok.t === 'op') {
      if (tok.v === 'u-') {
        if (!stack.length) return null;
        stack.push(-(stack.pop() as number));
        continue;
      }
      if (stack.length < 2) return null;
      const b = stack.pop() as number;
      const a = stack.pop() as number;
      stack.push(
        tok.v === '+'
          ? a + b
          : tok.v === '-'
            ? a - b
            : tok.v === '*'
              ? a * b
              : tok.v === '/'
                ? a / b
                : a ** b,
      );
    }
  }
  const [only] = stack;
  return stack.length === 1 && only !== undefined && Number.isFinite(only) ? only : null;
}

export function parseCalc(text: string): CalcData {
  const norm = normalizeExpression(text);
  const result = evaluate(norm);
  const pretty = /%|درصد/.test(fold(text))
    ? fold(text).replace(/[=?]+\s*$/, '')
    : norm
        .replace(/\s+/g, '')
        .replace(/\*/g, ' × ')
        .replace(/\//g, ' ÷ ')
        .replace(/\+/g, ' + ')
        .replace(/(?<=[\d)])-/g, ' − ');
  return { expression: pretty, result: result === null ? null : Math.round(result * 1e10) / 1e10 };
}

// ---------------------------------------------------------------- places and people

function weekend(ref: Date, next: boolean): [Date, Date] {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const day = d.getDay();
  const sat = new Date(d);
  sat.setDate(d.getDate() + (day === 0 ? -1 : 6 - day));
  if (next && (day === 5 || day === 6 || day === 0)) sat.setDate(sat.getDate() + 7);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  return [sat, sun];
}

export function parseTravel(text: string, ref: Date): TravelData {
  let rest = ` ${fold(text)} `;
  let start: Date | null = null;
  let end: Date | null = null;
  const low = rest.toLowerCase();
  const mode: TravelData['mode'] =
    /\b(flight|fly|flying|plane|airport)\b|پرواز|هواپیما|فرودگاه|самол[её]т|рейс|лечу|аэропорт/.test(
      low,
    )
      ? 'flight'
      : /\b(train|rail)\b|قطار|поезд/.test(low)
        ? 'train'
        : /\b(bus|coach)\b|اتوبوس|автобус/.test(low)
          ? 'bus'
          : /\b(drive|car|road ?trip)\b|ماشین|جاده|машин|на авто/.test(low)
            ? 'car'
            : null;
  const wk =
    /\b(this|next)\s+weekend\b/i.exec(rest) ??
    /آخر ?هفته ?(?:ی )?(بعد|دیگه|آینده)?/.exec(rest) ??
    /на (?:этих |следующих )?выходных/iu.exec(rest);
  if (wk) {
    [start, end] = weekend(ref, /next|بعد|دیگه|آینده|следующ/.test(wk[0]));
    rest = rest.replace(wk[0], ' ');
  } else {
    const date = findDate(rest.toLowerCase(), ref);
    if (date) {
      start = date.start;
      rest = removeRange(rest, date.index, date.length);
    }
  }
  const stop =
    /\s+(?:to|next|this|on|for|from|in|by|via|tomorrow|today|with|and|trip|flight|train|bus|weekend|week|work|business|vacation|\d).*$/i;
  const grabEn = (re: RegExp): string | null => {
    const m = re.exec(rest);
    if (!m) return null;
    const place = ` ${m[1] ?? ''}`.replace(stop, '').trim();
    return place ? titleCase(place) : null;
  };
  const faTo = /(?:^|\s)(?:به|سمت)\s+([؀-ۿ]+(?:\s[؀-ۿ]+)?)/.exec(rest);
  const faFrom = /(?:^|\s)از\s+([؀-ۿ]+)/.exec(rest);
  const clean = (s: string | undefined): string | null => {
    const v = (s ?? '').replace(/\s*(?:برم|میرم|بریم|میریم|سفر|پرواز|با|قطار|اتوبوس)$/, '').trim();
    return v || null;
  };
  // A Russian city is named with a capital: "в Казань", "из Москвы".
  const ruTo = /(?:^|\s)(?:в|во|до)\s+([А-ЯЁ][\p{L}-]+(?:\s[А-ЯЁ][\p{L}-]+)?)/u.exec(rest);
  const ruFrom = /(?:^|\s)из\s+([А-ЯЁ][\p{L}-]+)/u.exec(rest);
  const destination =
    grabEn(/\b(?:to|for|visit(?:ing)?)\s+([a-z][a-z .'-]{1,40})/i) ??
    clean(faTo?.[1]) ??
    ruTo?.[1] ??
    null;
  const origin =
    grabEn(/\bfrom\s+([a-z][a-z .'-]{1,40})/i) ?? clean(faFrom?.[1]) ?? ruFrom?.[1] ?? null;
  return { destination, origin, start, end, mode };
}

export function parsePoll(text: string): PollData {
  let t = collapse(fold(text)).replace(/\?+$/, '');
  let stem: string | null = null;
  const colon = t.indexOf(':');
  if (colon > 0) {
    stem = t.slice(0, colon).trim();
    t = t.slice(colon + 1).trim();
  }
  let parts = t.split(/\s*(?:,|\bor\b|\bvs\.?\b|\/|\sیا\s|\sили\s)\s*/iu).filter(Boolean);
  if (parts.length < 2) return { title: stem ? `${capitalize(stem)}?` : '', options: [] };
  let context: string | null = null;
  const last = parts[parts.length - 1] as string;
  const cm =
    /\s+((?:for|on|at|this|next|tonight|tomorrow|today)\b.*|(?:برای|امشب|فردا|امروز)(?:\s.*)?)$/i.exec(
      last,
    );
  if (cm && cm.index > 0) {
    context = cm[1] ?? null;
    parts[parts.length - 1] = last.slice(0, cm.index);
  }
  if (
    !stem &&
    /^(?:should|shall|what|which|where|when|who|do|does|would|want|let'?s|vote|poll)\b/i.test(
      parts[0] ?? '',
    )
  ) {
    const words = (parts[0] ?? '').split(' ');
    const take = Math.max(1, (parts[1] ?? '').split(' ').length);
    if (words.length > take) {
      stem = words.slice(0, words.length - take).join(' ');
      parts[0] = words.slice(words.length - take).join(' ');
    }
  }
  parts = parts.map((p) => p.trim()).filter(Boolean);
  const fa = isPersian(t);
  const base = capitalize(stem ?? parts.join(fa ? ' یا ' : RUSSIAN.test(t) ? ' или ' : ' or '));
  return {
    title: `${base}${context ? ` ${context}` : ''}${fa ? '؟' : '?'}`,
    options: parts.map(capitalize),
  };
}

export function parseContact(text: string): ContactData {
  let rest = collapse(fold(text));
  const em = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/.exec(rest);
  const email = em ? em[0].toLowerCase() : null;
  if (em) rest = rest.replace(em[0], ' ');
  let phone: string | null = null;
  const pm = /(?:\+?\d{1,3}[\s-]?)?\(?\d{3,5}\)?[\s-]?\d{3,5}[\s-]?\d{0,5}/.exec(rest);
  if (pm && pm[0].replace(/\D/g, '').length >= 7) {
    const digits = pm[0].replace(/\D/g, '');
    phone =
      digits.length === 11 && digits.startsWith('09')
        ? `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
        : pm[0].trim();
    rest = rest.replace(pm[0], ' ');
  }
  const name = rest
    .replace(
      /\b(?:save|add|contact|number|phone|email|mail|is|his|her|their|new)\b|شماره|ذخیره|مخاطب|ایمیل|تلفن|موبایل|контакт|номер|телефон|почта|сохрани|:/giu,
      ' ',
    )
    .replace(/[^a-z؀-ۿа-я\s'.-]/giu, ' ')
    .trim();
  const shown = isPersian(name) ? collapse(name) : titleCase(collapse(name));
  return { name: shown, phone, email, initials: initials(shown) };
}

const URL_RE =
  /\b((?:https?:\/\/|www\.)[^\s]+|[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|dev|io|app|org|net|co|ai|ir|in|so|xyz|me|design|sh|gg|tv)(?:\/[^\s]*)?)/i;

export function parseLink(text: string): LinkData {
  const t = fold(text);
  const m = URL_RE.exec(t);
  if (!m) return { url: null, domain: null, note: capitalize(tidy(t)) };
  const raw = (m[1] ?? '').replace(/[.,)]+$/, '');
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let domain: string | null;
  try {
    domain = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    domain = raw.replace(/^https?:\/\//, '').split('/')[0] ?? null;
  }
  return { url, domain, note: capitalize(tidy(collapse(t.replace(m[0], ' ')))) };
}

// ---------------------------------------------------------------- dates as counts

const HOLIDAYS: Record<string, [number, number]> = {
  christmas: [11, 25],
  xmas: [11, 25],
  'new year': [0, 1],
  'new years': [0, 1],
  "new year's eve": [11, 31],
  halloween: [9, 31],
  'valentines day': [1, 14],
  "valentine's day": [1, 14],
  کریسمس: [11, 25],
  ولنتاین: [1, 14],
  'нового года': [0, 1],
  'новый год': [0, 1],
  рождества: [0, 7],
  рождество: [0, 7],
};
/** Jalali holidays: [month, day] in the Persian calendar. */
const JALALI_HOLIDAYS: Record<string, [number, number]> = {
  نوروز: [1, 1],
  'عید نوروز': [1, 1],
  'سال نو': [1, 1],
  عید: [1, 1],
  'سیزده بدر': [1, 13],
  یلدا: [9, 30],
  'شب یلدا': [9, 30],
  nowruz: [1, 1],
  yalda: [9, 30],
};

export function parseCountdown(text: string, ref: Date): CountdownData {
  let rest = ` ${fold(text)} `;
  const low = rest.toLowerCase();
  let date: Date | null = null;
  let title = '';
  for (const name of Object.keys(JALALI_HOLIDAYS).sort((a, b) => b.length - a.length)) {
    if (!low.includes(name)) continue;
    const [jm, jd] = JALALI_HOLIDAYS[name] as [number, number];
    let jy = jalaliYear(ref);
    let g = jalaliToGregorian(jy, jm, jd);
    if (daysBetween(ref, new Date(g[0], g[1] - 1, g[2])) < 0) {
      jy += 1;
      g = jalaliToGregorian(jy, jm, jd);
    }
    date = new Date(g[0], g[1] - 1, g[2]);
    title = isPersian(name) ? name : capitalize(name);
    rest = rest.replace(new RegExp(name, 'i'), ' ');
    break;
  }
  if (!date) {
    for (const name of Object.keys(HOLIDAYS).sort((a, b) => b.length - a.length)) {
      if (!low.includes(name)) continue;
      const [mo, d] = HOLIDAYS[name] as [number, number];
      date = new Date(ref.getFullYear(), mo, d);
      if (daysBetween(ref, date) < 0) date = new Date(ref.getFullYear() + 1, mo, d);
      title = isPersian(name) ? name : titleCase(name);
      rest = rest.replace(new RegExp(name.replace(/'/g, "'?"), 'i'), ' ');
      break;
    }
  }
  if (!date) {
    const hit = findDate(rest.toLowerCase(), ref);
    if (hit) {
      date = hit.start;
      rest = removeRange(rest, hit.index, hit.length);
    }
  }
  if (!title) {
    title = capitalize(
      tidy(
        rest
          .replace(
            words(
              'how many|days?|weeks?|until|till|til|to go|left|countdown|count down|before|is it|are there|the|چند روز|روزهای|روز|مونده|مانده|تا|شمارش معکوس|به|چقدر|сколько|дней|дня|день|до|осталось|отсчет',
            ),
            ' ',
          )
          .replace(/\?/g, ' '),
      ),
    );
  }
  return { title, date, days: date ? daysBetween(ref, date) : null };
}

export function parseTimezone(text: string, ref: Date): TimezoneData {
  const t = ` ${fold(text).toLowerCase()} `;
  const zones: Zone[] = [];
  for (const m of t.matchAll(ZONE_RE)) {
    const z = ZONES[(m[1] ?? '').toLowerCase()];
    if (z && !zones.some((x) => x.tz === z.tz && x.label === z.label)) zones.push(z);
  }
  const clock =
    /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/.exec(t) ??
    /\b(\d{1,2}):(\d{2})\b/.exec(t) ??
    /ساعت\s*(\d{1,2})(?::(\d{2}))?\s*(صبح|ظهر|عصر|شب)?/.exec(t);
  const toWord = /\b(?:in|to|into)\s+|به وقت|در\s|به\s/;
  let from = zones[0] ?? localZone();
  let to = zones[1] ?? null;
  // "what time is it in tokyo": one zone, and it is the destination.
  if (zones.length === 1 && !clock) {
    to = zones[0] as Zone;
    from = localZone();
  } else if (
    zones.length === 1 &&
    clock &&
    toWord.test(t.slice(t.indexOf(clock[0]) + clock[0].length))
  ) {
    to = zones[0] as Zone;
    from = localZone();
  }
  if (!clock) return { instant: ref, isNow: true, from, to };
  let h = Number(clock[1]);
  const mer = (clock[3] ?? '').toString();
  if (mer === 'pm' || /ظهر|عصر|شب/.test(mer)) h = (h % 12) + 12;
  else if (mer === 'am') h %= 12;
  return { instant: instantIn(from.tz, h, Number(clock[2] ?? 0), ref), isNow: false, from, to };
}

// ---------------------------------------------------------------- chance and goals

export function parseRandom(text: string): RandomData {
  const t = fold(text).toLowerCase();
  const base: RandomData = { kind: 'dice', count: 1, sides: 6, min: 1, max: 100, options: [] };
  const dice = /\b(\d*)d(\d+)\b/.exec(t);
  if (dice)
    return {
      ...base,
      kind: 'dice',
      count: Math.min(20, Number(dice[1] || 1)),
      sides: Math.max(2, Number(dice[2])),
    };
  if (/\bcoin\b|\bflip\b|\btoss\b|سکه|شیر یا خط|монет|орел или решка/.test(t))
    return { ...base, kind: 'coin' };
  const between =
    /\b(?:between|from)\s+(-?\d+)\s+(?:and|to)\s+(-?\d+)\b|(?:بین|от)\s*(-?\d+)\s*(?:و|تا|до)\s*(-?\d+)/.exec(
      t,
    );
  if (between) {
    const a = Number(between[1] ?? between[3]);
    const b = Number(between[2] ?? between[4]);
    return { ...base, kind: 'number', min: Math.min(a, b), max: Math.max(a, b) };
  }
  const pick =
    /(?:pick|choose)\s+(?:one|for me)?\s*:?\s*(.+)$|(?:یکی رو انتخاب کن|انتخاب کن|قرعه|выбери(?:\s+одно)?)\s*:?\s*(.+)$/.exec(
      t,
    );
  if (pick) {
    const options = (pick[1] ?? pick[2] ?? '')
      .split(/\s*(?:,|\bor\b|\sیا\s|\sو\s|\sили\s)\s*/)
      .map((s) => capitalize(s.trim()))
      .filter(Boolean);
    if (options.length >= 2) return { ...base, kind: 'pick', options };
  }
  const n =
    /(?:roll|throw)\s+(\d+|a|one|two|three)?\s*(?:dice|die)|(\d+)?\s*(?:تا\s*)?تاس|(?:брось|кинь)?\s*(\d+)?\s*кубик/.exec(
      t,
    );
  if (n)
    return {
      ...base,
      kind: 'dice',
      count: Math.min(20, numberWord(n[1] ?? n[2] ?? n[3] ?? '1') ?? 1),
    };
  if (/\brandom number\b|عدد تصادفی|عدد رندوم|случайное число/.test(t))
    return { ...base, kind: 'number' };
  return base;
}

export function describeRandom(d: RandomData, fa = false): string {
  const n = (v: number): string => digitsFor(v, fa);
  if (d.kind === 'coin') return fa ? 'شیر یا خط' : 'Flip a coin';
  if (d.kind === 'number')
    return fa ? `عددی بین ${n(d.min)} و ${n(d.max)}` : `A number from ${d.min} to ${d.max}`;
  if (d.kind === 'pick')
    return fa ? `یکی از ${n(d.options.length)} گزینه` : `Pick one of ${d.options.length}`;
  return fa ? `${n(d.count)} تاس ${n(d.sides)}‌وجهی` : `Roll ${d.count}d${d.sides}`;
}

export function parseGoal(text: string): GoalData {
  const t = fold(text);
  let current = 0;
  let target: number | null = null;
  let rest = ` ${t} `;
  const of = /(\d[\d,]*)\s*(?:of|\/|out of|از|из)\s*(\d[\d,]*)/i.exec(rest);
  if (of) {
    current = Number((of[1] ?? '0').replace(/,/g, ''));
    target = Number((of[2] ?? '0').replace(/,/g, ''));
    rest = rest.replace(of[0], ' ');
  } else {
    const nums = [...rest.matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((m) =>
      Number(m[0].replace(/,/g, '')),
    );
    const doneWord =
      /\b(done|so far|saved|completed|finished|read)\b|تا حالا|خوندم|انجام دادم|تموم|جمع کردم|прочитал\p{L}*|сделал\p{L}*|готово|уже/iu;
    if (nums.length >= 2) {
      const [a, b] = nums as [number, number];
      [target, current] = doneWord.test(rest.slice(rest.search(/\d/) + 1))
        ? [a, b]
        : [Math.max(a, b), Math.min(a, b)];
    } else if (nums.length === 1) target = nums[0] ?? null;
    rest = rest.replace(/\d[\d,]*(?:\.\d+)?/g, ' ');
  }
  const unitM = /^\s*([a-z؀-ۿа-я]+)/iu.exec(
    rest.replace(/^\s*(?:read|save|run|write|lose|بخونم|خوندن)\s+/i, ' '),
  );
  const cleaned = tidy(
    rest
      .replace(
        words(
          'done|so far|saved|completed|finished|this year|goal|target|already|تا حالا|امسال|هدف|تا|خوندم|انجام دادم|цель|в этом году|уже|прочитал\\p{L}*|сделал\\p{L}*|готово|:',
        ),
        ' ',
      )
      .replace(/[,:]/g, ' '),
  );
  return {
    title: capitalize(cleaned) || (isPersian(t) ? 'هدف' : RUSSIAN.test(t) ? 'Цель' : 'Goal'),
    current,
    target,
    unit: unitM && target ? (unitM[1] ?? null) : null,
  };
}

export function parseNote(text: string): NoteData {
  const t = fold(text).trim();
  const first = t.split(/(?<=[.!?؟])\s+/)[0] ?? t;
  return { title: capitalize(first.length > 80 ? `${first.slice(0, 79)}…` : first), body: t };
}

// ---------------------------------------------------------------- one door

export function parseShape<K extends ShapeIntent>(
  intent: K,
  text: string,
  ref: Date,
): ShapeDataMap[K] {
  const p: { [I in ShapeIntent]: () => ShapeDataMap[I] } = {
    event: () => parseEvent(text, ref),
    reminder: () => parseReminder(text, ref),
    todo: () => parseTodo(text),
    timer: () => parseTimer(text),
    habit: () => parseHabit(text),
    color: () => parseColor(text),
    split: () => parseSplit(text),
    expense: () => parseExpense(text),
    convert: () => parseConvert(text),
    calc: () => parseCalc(text),
    travel: () => parseTravel(text, ref),
    poll: () => parsePoll(text),
    contact: () => parseContact(text),
    link: () => parseLink(text),
    countdown: () => parseCountdown(text, ref),
    timezone: () => parseTimezone(text, ref),
    random: () => parseRandom(text),
    goal: () => parseGoal(text),
    issue: () => parseIssue(text),
    note: () => parseNote(text),
  };
  return p[intent]() as ShapeDataMap[K];
}

/** 0..1, how filled-in a card is. */
export function completeness(intent: ShapeIntent, text: string, ref: Date): number {
  const d = parseShape(intent, text, ref) as unknown as Record<string, unknown>;
  const has = (k: string): number => (d[k] !== null && d[k] !== undefined && d[k] !== '' ? 1 : 0);
  switch (intent) {
    case 'event':
      return (
        has('title') * 0.35 +
        has('date') * 0.3 +
        (d.hasTime ? 0.2 : 0) +
        ((d.people as string[]).length || d.link || d.location ? 0.15 : 0)
      );
    case 'reminder':
      return has('task') * 0.55 + has('when') * 0.3 + (d.hasTime ? 0.15 : 0);
    case 'todo':
      return Math.min(1, (d.items as string[]).length / 3);
    case 'timer':
      return has('seconds') * 0.8 + has('label') * 0.2;
    case 'habit':
      return has('title') * 0.5 + has('label') * 0.5;
    case 'color':
      return has('hex');
    case 'split':
      return has('total') * 0.55 + has('people') * 0.45;
    case 'expense':
      return has('amount') * 0.6 + has('item') * 0.4;
    case 'convert':
      return has('value') * 0.4 + has('from') * 0.3 + has('result') * 0.3;
    case 'calc':
      return d.result !== null ? 1 : 0.3;
    case 'travel':
      return has('destination') * 0.5 + has('start') * 0.35 + (has('end') || has('mode')) * 0.15;
    case 'poll':
      return Math.min(1, (d.options as string[]).length / 2) * 0.8 + has('title') * 0.2;
    case 'contact':
      return (
        has('name') * 0.4 + (has('phone') || has('email')) * 0.4 + has('phone') * has('email') * 0.2
      );
    case 'link':
      return has('url') * 0.8 + has('note') * 0.2;
    case 'countdown':
      return has('date') * 0.7 + has('title') * 0.3;
    case 'timezone':
      return d.to ? 1 : 0.5;
    case 'random':
      return 1;
    case 'goal':
      return has('target') * 0.7 + has('title') * 0.3;
    case 'issue':
      return Math.min(1, String(d.title).length / 16) * 0.75 + (d.type ? 0.25 : 0);
    case 'note':
      return Math.min(1, String(d.body).length / 20);
  }
}
