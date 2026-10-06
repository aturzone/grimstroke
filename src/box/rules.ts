/**
 * What the text looks like, as named facts: "has a URL", "has a clock time", "says remind me".
 *
 * Each rule is a feature the classifier weighs (classify.ts), in both languages. On its own,
 * with the hand weights below, this is also a complete scorer -- the model is trained to do
 * better than it, and is measured against it (tools/train-shape.ts).
 *
 * Rules say what is THERE, never what it means; the weighing is the model's.
 */

import { COLOR_WORD_PATTERN } from '@core/box/colors.ts';
import type { ShapeIntent } from '@core/box/intents.ts';
import { UNIT_PATTERN } from '@core/box/units.ts';
import { ZONE_RE } from '@core/box/zones.ts';

const FA_WEEKDAY = /(?:یک|دو|سه|چهار|پنج)? ?شنبه|جمعه/;
const DATE_WORDS =
  /\b(today|tonight|tomorrow|tmrw|mon(day)?|tue(s(day)?)?|wed(nesday)?|thu(rs(day)?)?|fri(day)?|sat(urday)?|sun(day)?|next week|this week|noon|midnight|morning|evening|\d{1,2}\s?(am|pm)|\d{1,2}:\d{2}|jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|june?|july?|aug(ust)?|sep(t(ember)?)?|oct(ober)?|nov(ember)?|dec(ember)?)\b|امروز|امشب|فردا|پس ?فردا|هفته بعد|ساعت \d|صبح|ظهر|عصر|شب|فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر|آبان|آذر|دی|بهمن|اسفند|сегодня|завтра|послезавтра|понедельник|вторник|сред[ауы]|четверг|пятниц|суббот|воскресень|на следующей неделе|утром|вечером|(^|\s)в \d{1,2}(:\d\d)?(\s|$)|январ|феврал|апрел|июн|июл|август|сентябр|октябр|ноябр|декабр/;
const GATHER =
  /\b(dinner|lunch|breakfast|brunch|coffee|meeting|meet|call|sync|standup|party|drinks|date|catch ?up|interview|appointment|hangout|1:1|session with|with [a-z]+)\b|شام|ناهار|نهار|صبحانه|قهوه با|جلسه|قرار|مهمونی|مهمانی|دورهمی|مصاحبه|وقت دکتر|تماس با|ملاقات|با [؀-ۿ]+|ужин|обед|завтрак|кофе с|встреча|встретиться|созвон|звонок|вечеринк|собеседован|прием у|приём у|свидание|с [а-я]+(ой|ей|ом|ем)(\s|$)/;
const COLOR_WORD = new RegExp(
  `(?:^|[^a-z\\u0600-\\u06ff])(${COLOR_WORD_PATTERN})(?=$|[^a-z\\u0600-\\u06ff])`,
);
const CONVERT_FULL = new RegExp(
  `\\d\\s*(?:${UNIT_PATTERN})\\s+(?:to|in|into|as|به|چند|в|во)\\s+(?:چند\\s+)?(?:${UNIT_PATTERN})(?![a-z\\u0600-\\u06ff\\u0400-\\u04ff])`,
);
const CONVERT_PART = new RegExp(
  `\\d\\s*(?:${UNIT_PATTERN})(?![a-z\\u0600-\\u06ff\\u0400-\\u04ff])`,
);
const CLOCK =
  /\b\d{1,2}(:\d{2})?\s*(am|pm)\b|\b\d{1,2}:\d{2}\b|\b(noon|midnight)\b|ساعت\s*\d|(^|\s)в \d{1,2}(\s|$|:)|полдень|полночь/;
const FA_NUM = '(?:\\d+|یک|یه|دو|سه|چهار|پنج|شش|هفت|هشت|نه|ده|پانزده|بیست|سی|چهل|پنجاه|شصت|نود)';
const DURATION = new RegExp(
  `\\b\\d+\\s*(h|hr|hrs|hours?|m|min|mins|minutes?|s|sec|secs|seconds?)\\b|${FA_NUM}\\s*(دقیقه|ثانیه)|\\d+\\s*ساعت(?!\\s*(دیگه|بعد))|نیم ?ساعت|\\bhalf an? hour\\b|\\d+\\s*(мин|минут|сек|секунд|ч|час)(?![\\p{L}])|полчаса`,
  'u',
);

/** Every named fact about the text, 0 or 1 (or a small count). */
export function ruleFeatures(t: string): Record<string, number> {
  const f: Record<string, number> = {};
  const set = (k: string, on: boolean | number): void => {
    const v = typeof on === 'number' ? on : on ? 1 : 0;
    if (v) f[k] = v;
  };
  const words = t.split(/\s+/).filter(Boolean);
  const num = /\d/.test(t);
  const nums = t.match(/\d[\d,.]*/g)?.length ?? 0;

  set('len.short', t.length < 3);
  set('len.oneword', words.length === 1);
  set('len.few', words.length >= 3 && words.length < 5);
  set('len.some', words.length >= 5 && words.length < 8);
  set('len.long', words.length >= 8);
  set('num.any', num);
  set('num.two', nums >= 2);
  set('q.mark', /\?\s*$/.test(t));
  set(
    'q.word',
    /^(what|why|how|when|where|who|should|could|would|is|are|do|does|can)\b|^(چرا|چطور|کی|کجا|آیا|چی)\b|^(что|почему|как|когда|где|кто|стоит ли|можно ли)(?![а-я])/.test(
      t,
    ),
  );

  set(
    'link.url',
    /https?:\/\/|www\.|\b[a-z0-9-]+\.(com|dev|io|app|org|net|co|ai|ir|in|so)\b/.test(t),
  );
  set('color.hex', /#[0-9a-f]{6}\b|#[0-9a-f]{3}\b|rgba?\(/.test(t));
  set('color.hexpart', /#[0-9a-f]{1,5}$/.test(t));
  set('color.word', COLOR_WORD.test(t));
  set('color.wordend', new RegExp(`(?:${COLOR_WORD_PATTERN})\\s*$`).test(t));
  set('color.say', /\b(colou?r|shade|hue|palette|tone of)\b|رنگ/.test(t));
  set('contact.email', /[\w.+-]+@[\w-]+\.\w+/.test(t));
  set(
    'contact.phone',
    /(\+?\d{1,3}[\s-]?)?\d{3,5}[\s-]?\d{3,4}[\s-]?\d{3,5}/.test(t) ||
      /\b09\d{9}\b|\b09\d{2}\s?\d{3}\s?\d{4}\b/.test(t),
  );
  set(
    'contact.say',
    /\b(contact|number|phone|save)\b|شماره|مخاطب|تلفن|موبایل|контакт|номер|телефон|сохрани/.test(t),
  );
  // An obligation with a deadline: "need to renew my visa before friday", "باید تا شنبه ... بدم".
  set(
    'reminder.must',
    /\b(need to|have to|must|gotta|should)\b.*\b(before|by|until)\b|باید.*(تا|قبل از)|(нужно|надо|должен|должна).*(до|к) /.test(
      t,
    ),
  );
  set(
    'reminder.say',
    /\b(remind|reminder|don'?t forget|remember to|let me forget)\b|یادم بنداز|یادآوری|یادت باشه|یادم باشه|فراموش نکن|یادت نره|یادم نره|فراموشم نشه|напомни|напоминание|не забыть|не забудь/.test(
      t,
    ),
  );
  set(
    'split.say',
    /\b(split|divide|share)\b|تقسیم|دنگ|سهم|نفری|раздели|разделить|поделить|пополам|скинуться/.test(
      t,
    ),
  );
  set(
    'split.among',
    /\b(between|among)\s+(\d+|two|three|four|five|six)\b|بین\s*(\d+|دو|سه|چهار|پنج|شش)\s*(نفر|تا)?|(на|между) (\d+|двоих|троих|четверых|пятерых|два|три|четыре|пять)( человек| чел)?/.test(
      t,
    ),
  );
  // A bill shared: "bill 180 for 4 of us", "۱.۲ میلیون شد، ۳ نفر بودیم".
  set(
    'split.us',
    /\b(for|between|among) (\d+|two|three|four|five|six) of us\b|\d+ نفر (بودیم|هستیم)|\bbill\b.*\d.*\bfor \d+|нас (было )?\d+|на \d+ человек/.test(
      t,
    ),
  );
  // "۱۲۰۰ تقسیم بر ۷" is division, not a split: nobody is named or counted as people.
  set('calc.divide', /\d\s*(تقسیم بر|divided by)\s*\d+(?!\s*(نفر|people))/.test(t));
  set('money.people', /\d+\s*(نفر|people|persons|friends|ways)|\d+\s*(человек|чел)/.test(t));
  set(
    'expense.say',
    /\b(spent|paid|bought|cost|expense)\b|خرج|دادم|پرداخت|خریدم|هزینه|потратил|заплатил|купил|стоил|расход|трата/.test(
      t,
    ),
  );
  set('money.sign', /^(₹|rs\.?|\$|€|£)\s?\d|تومن|تومان|ریال|دلار|یورو|\$|€|£|руб|₽/.test(t));
  set('money.big', /\d\s*(k|هزار|میلیون)\b|\d{4,}|\d\s*(тыс|млн)/.test(t));
  set('convert.full', CONVERT_FULL.test(t));
  set('convert.part', CONVERT_PART.test(t) && !DURATION.test(t));
  set(
    'convert.say',
    /\bconvert\b|تبدیل|چند (کیلو|متر|مایل|پوند|فوت)|перевести|сколько (км|миль|кг|фунтов|литров)/.test(
      t,
    ),
  );
  set('calc.expr', /^[\d\s+\-*/x×÷^().,%]+$/.test(t) && /\d\s*[+\-*/x×÷^%]\s*[\d(]/.test(t));
  set('calc.percent', /\d\s*(%|درصد)\s*(of|off|tip|tax|از|تخفیف|انعام|مالیات)/.test(t));
  set(
    'calc.say',
    /\b(what'?s|calculate|compute)\b.*\d|حساب کن|چند میشه|چقدر میشه|ضرب|تقسیم بر|به علاوه|منهای|посчитай|сколько будет|умножить|разделить на|плюс|минус/.test(
      t,
    ),
  );
  set(
    'timer.say',
    /\b(timer|countdown|stopwatch|pomodoro)\b|تایمر|پومودورو|کرنومتر|таймер|помодоро|секундомер|засеки/.test(
      t,
    ),
  );
  set('timer.duration', DURATION.test(t));
  set(
    'timer.focus',
    /\b(focus|break|rest|nap|deep work)\b|تمرکز|استراحت|چرت|фокус|перерыв|отдых|работ/.test(t) &&
      num,
  );
  set(
    'habit.every',
    /\b(every\s*day|daily|every (morning|night|evening)|each (day|morning)|\d\s*x\s*a\s*week|times a week|habit|weekly|every (mon|tue|wed|thu|fri|sat|sun))|каждый день|ежедневно|каждое утро|каждый вечер|раза? в неделю|привычка|еженедельно|по будням|по (пн|вт|ср|чт|пт|сб|вс|понедельникам|вторникам|средам|четвергам|пятницам|субботам|воскресеньям)/.test(
      t,
    ) || /هر روز|روزانه|هر صبح|هر شب|هفته ?ای \S+ بار|عادت|هفتگی|(^|\s)روزی \S+/.test(t),
  );
  set(
    'travel.say',
    /\b(flight|fly|flying|trip|travel|vacation|holiday|train to|bus to|road ?trip|visit|getaway)\b|سفر|پرواز|بلیط|قطار|اتوبوس|تعطیلات|مسافرت|поездка|путешеств|отпуск|лечу|полет|рейс|поезд в|билет|командировк/.test(
      t,
    ),
  );
  set('travel.to', /\bto [a-z]+/.test(t) && /\b(next weekend|this weekend|flight|trip)\b/.test(t));
  // A route: "from lisbon to rome", "train to paris", "از تهران به مشهد".
  set(
    'travel.route',
    /\bfrom [a-z][a-z ]+ to [a-z]+|\b(train|bus|ferry|drive|driving) (to|from)\b|از [\u0600-\u06ff]+ (به|تا) [\u0600-\u06ff]+|из [а-я]+ в [а-я]+|(поезд|автобус|самолет) (в|до|из) /.test(
      t,
    ),
  );
  set('travel.weekend', /\b(this|next) weekend\b|آخر ?هفته|на выходных|выходные/.test(t));
  set('poll.orq', /\b(or|vs)\b|\sیا\s|\sили\s/.test(t) && /\?\s*$/.test(t));
  set('poll.or', /\b\w+ or \w+|\S+ یا \S+|\S+ или \S+/.test(t));
  set('poll.say', /\b(poll|vote)\b|نظرسنجی|رای|опрос|голосовани|проголосуем/.test(t));
  set(
    'countdown.say',
    /\b(days?|weeks?|sleeps?)\s+(until|till|til|to go|left|before)\b|\bcount ?down\b|\bhow (many days|long) (until|till|til)\b|روز (مونده|مانده)|مونده تا|مانده تا|شمارش معکوس|چند روز|сколько дней до|дней до|осталось до|обратный отсчет/.test(
      t,
    ),
  );
  set(
    'countdown.holiday',
    /\b(christmas|xmas|new year|halloween|valentine)|نوروز|یلدا|عید|کریسمس|سال نو|новый год|нового года|рождеств/.test(
      t,
    ),
  );
  const zoneHits = [...` ${t} `.matchAll(ZONE_RE)].length;
  set('tz.two', zoneHits >= 2);
  set('tz.one', zoneHits === 1);
  set('tz.clock', CLOCK.test(t));
  set(
    'tz.time',
    /\btime\b|به وقت|ساعت چنده|ساعت چند|который час|сколько времени|по времени/.test(t),
  );
  set(
    'random.between',
    /\b(a |random )?number (between|from) \d+/.test(t) ||
      /عدد (تصادفی |رندوم )?(بین|از) \d+/.test(t) ||
      /(случайное )?число от \d+/.test(t),
  );
  set(
    'random.say',
    /\b(roll|flip|toss)\b|\b\d*d\d+\b|\bcoin\b|\bdice\b|\bdie\b|\brandom\b|\b(pick|choose) (one|a random|for me)\b|تاس|سکه|شیر یا خط|تصادفی|قرعه|یکی رو انتخاب|брось|кубик|монетк|орел или решка|случайн|выбери/.test(
      t,
    ),
  );
  set(
    'goal.of',
    /\b\d[\d,]*\s*(of|\/|out of|از|из)\s*\d[\d,]*/.test(t) && /[a-z؀-ۿа-я]{3,}/.test(t),
  );
  set('goal.say', /\b(goal|target)\b|هدف|цель|задача на год/.test(t));
  set(
    'goal.done',
    /\b(done|so far|saved|completed|finished)\b|تا حالا|خوندم|انجام دادم|تموم کردم|прочитал|сделал|уже|готово/.test(
      t,
    ) && num,
  );
  const listSeps = (t.match(/,|\band\b|&|\n|\sو\s|\sи\s/g) ?? []).length;
  set('todo.many', listSeps >= 2);
  set('todo.one', listSeps === 1);
  set(
    'todo.buy',
    /^(buy|get|pick up|grab)\b|بخر|خرید|بگیرم|بگیر$|^(купить|купи)|список покупок/.test(t),
  );
  // A bare list of things to buy, with no commas: "eggs flour sugar butter".
  set(
    'todo.goods',
    (
      t.match(
        /\b(milk|eggs?|bread|coffee|flour|sugar|butter|rice|apples?|cheese|tea|pasta|onions?|tomatoes?|yogurt|soap|salt|oil)\b|شیر|تخم ?مرغ|نان|نون|قهوه|آرد|شکر|کره|برنج|سیب|پنیر|چای|ماکارونی|پیاز|گوجه|ماست|صابون|نمک|روغن|молоко|яйца|хлеб|кофе|мука|сахар|масло|рис|яблоки|сыр|чай|макароны|лук|помидоры|йогурт|мыло|соль/g,
      ) ?? []
    ).length >= 3,
  );
  set('todo.head', /^(todo|to do|groceries|list)\b|^(کارها|لیست)|^(список|дела|покупки)/.test(t));
  set('event.date', DATE_WORDS.test(t) || FA_WEEKDAY.test(t));
  set('event.gather', GATHER.test(t));
  set(
    'event.call',
    /\b(on|over|via) (zoom|meet|teams|facetime)\b|زوم|گوگل میت|اسکای روم|в зуме|по зуму|в телеграме|созвон/.test(
      t,
    ),
  );
  set(
    'note.feel',
    /\b(i think|i feel|felt|feeling|thinking|wonder|realized|idea|thought|maybe we)\b|فکر کنم|حس|احساس|به نظرم|ایده|شاید|я думаю|мне кажется|чувствую|идея|может быть/.test(
      t,
    ),
  );
  // An issue: asked for by name, or a fault described, or a repository and its labels named.
  set(
    'issue.say',
    /\b(issue|bug report|ticket|work ?item|feature request|pull request)\b|\b(make|create|open|file|raise|log|report)\s+(me\s+)?(an?\s+)?(new\s+)?(bug|issue|ticket)\b|^(bug|issue|feature|task|ticket)\s*:|ایشو|تیکت|ورک ?آیتم|^باگ|باگ\s*:|задач[ауи]?\s*:|^баг|тикет|создай задачу|заведи баг/.test(
      t,
    ),
  );
  set(
    'issue.fault',
    /\b(crash(es|ed)?|broken|throws|exception|stack ?trace|regression|doesn'?t work|does not work|not working|fails? to|error when)\b|کار نمی ?کن|کرش|ارور میده|خطا میده|не работает|падает|ошибка при/.test(
      t,
    ),
  );
  set(
    'issue.repo',
    (/(^|\s)[\w-]+\/[\w.-]+($|\s)/.test(t) && !/\d+\/\d+/.test(t)) ||
      /\b(repo|repository|github|gitlab|gitea)\b|ریپو|مخزن|گیت ?هاب|گیت ?لب|репозитор/.test(t),
  );
  set('issue.label', /\b(labels?|tags?)\b|لیبل|برچسب|(^|[^а-я])метк|ярлык/.test(t));
  set('fa', /[؀-ۿ]/.test(t));
  set('ru', /[а-я]/.test(t));
  return f;
}

/** The hand weights: a scorer that works with no model at all, and the bar the model must clear. */
export function ruleScores(t: string): Partial<Record<ShapeIntent | 'none', number>> {
  const f = ruleFeatures(t);
  const s: Partial<Record<ShapeIntent | 'none', number>> = {};
  const add = (k: ShapeIntent | 'none', v: number): void => {
    s[k] = (s[k] ?? 0) + v;
  };
  const on = (k: string): boolean => Boolean(f[k]);
  if (on('link.url')) add('link', 6);
  if (on('color.hex')) add('color', 7);
  if (on('color.hexpart')) add('color', 3);
  if (on('color.word')) add('color', 3);
  if (on('color.wordend')) add('color', 1.5);
  if (on('color.say')) add('color', 2);
  if (on('contact.email')) add('contact', 5);
  if (on('contact.phone')) add('contact', 4);
  if (on('contact.say')) add('contact', 1);
  if (on('reminder.say')) add('reminder', 6);
  if (on('reminder.must')) add('reminder', 4.5);
  if (on('split.say')) add('split', on('num.any') ? 5 : 3);
  if (on('split.among') && on('num.any')) add('split', 2.5);
  if (on('money.people')) add('split', 2);
  if (on('split.us') && on('num.any')) add('split', 5);
  if (on('calc.divide')) add('calc', 6);
  if (on('expense.say')) add('expense', on('num.any') ? 5 : 3);
  if (on('money.sign')) add('expense', 1.5);
  if (on('convert.full')) add('convert', 7);
  else if (on('convert.part') && !on('len.long')) add('convert', 2);
  if (on('convert.say')) add('convert', 3);
  if (on('calc.expr')) add('calc', 7);
  if (on('calc.percent')) add('calc', 6);
  if (on('calc.say')) add('calc', 3);
  if (on('timer.say')) add('timer', 6);
  if (on('timer.duration')) add('timer', 3);
  if (on('timer.focus')) add('timer', 2.5);
  if (on('habit.every')) add('habit', 5);
  if (on('travel.say')) add('travel', 5);
  if (on('travel.to')) add('travel', 1);
  if (on('travel.route')) add('travel', on('travel.say') ? 2 : 4.5);
  if (on('poll.orq')) add('poll', 5.5);
  else if (on('poll.or')) add('poll', 2);
  if (on('poll.say')) add('poll', 3);
  if (on('countdown.say')) add('countdown', 6.5);
  if (on('countdown.holiday')) add('countdown', 2);
  if (on('tz.two') && (on('tz.clock') || on('tz.time'))) add('timezone', 7);
  else if (on('tz.two')) add('timezone', 5);
  else if (on('tz.one') && (on('tz.clock') || on('tz.time'))) add('timezone', 5.5);
  if (on('random.say')) add('random', 6.5);
  if (on('random.between')) add('random', 7);
  if (on('goal.of')) add('goal', 4.5);
  if (on('goal.say')) add('goal', 3);
  if (on('goal.done')) add('goal', on('num.two') ? 5 : 2.5);
  if (on('todo.many')) add('todo', 4);
  else if (on('todo.one') && (on('todo.buy') || on('todo.head'))) add('todo', 3);
  if (on('todo.buy')) add('todo', 2);
  if (on('todo.goods')) add('todo', 4.5);
  if (on('event.date')) add('event', on('event.gather') || !on('len.long') ? 2.5 : 1);
  if (on('event.gather')) add('event', 3);
  if (on('event.call')) add('event', 2);
  if (on('issue.say')) add('issue', 6);
  if (on('issue.fault')) add('issue', 2.5);
  if (on('issue.repo')) add('issue', 3);
  if (on('issue.label')) add('issue', 3);
  if (on('note.feel')) add('note', 2);
  if (on('len.long')) add('note', 3);
  else if (on('len.some')) add('note', 2.2);
  else if (on('len.few')) add('note', 1);
  if (on('len.short')) add('none', 8);
  else if (on('len.oneword') && !on('num.any')) add('none', 3);
  else add('none', 0.5);
  // The exclusions: when one kind is certain, the kinds it is often mistaken for step back.
  const cap = (k: ShapeIntent | 'none', v: number): void => {
    s[k] = Math.min(s[k] ?? 0, v);
  };
  if ((s.split ?? 0) >= 5) cap('calc', 1);
  if ((s.convert ?? 0) >= 7) cap('calc', 1);
  if ((s.reminder ?? 0) >= 6) {
    cap('event', 2.5);
    cap('habit', 2);
  }
  if ((s.habit ?? 0) >= 5) cap('event', 2);
  if ((s.travel ?? 0) >= 5) cap('event', 2);
  if ((s.poll ?? 0) >= 5) cap('event', 2);
  if ((s.contact ?? 0) >= 4) cap('timer', 0);
  if ((s.timer ?? 0) >= 3) cap('convert', 1);
  if ((s.link ?? 0) >= 6) cap('note', 0);
  if ((s.countdown ?? 0) >= 6) cap('event', 2);
  // "countdown to the launch oct 20" names a day, not a duration: that is days, not a timer.
  if (on('countdown.say') && on('event.date') && !on('timer.duration')) cap('timer', 2);
  // "train from paris to tokyo" names cities that are time zones too; with no clock, it is a trip.
  if (on('travel.route') && !on('tz.clock')) cap('timezone', 2);
  if ((s.timezone ?? 0) >= 5.5) {
    cap('event', 2);
    cap('convert', 1);
    cap('timer', 1);
  }
  if ((s.random ?? 0) >= 6) {
    cap('poll', 2);
    cap('calc', 1);
  }
  if ((s.goal ?? 0) >= 4.5) cap('calc', 1);
  if (on('random.between')) cap('split', 1);
  if (on('calc.divide')) cap('split', 2);
  if ((s.reminder ?? 0) >= 4.5) cap('event', 3);
  // "bug: the date picker shows tomorrow" is about a date, not on one.
  if ((s.issue ?? 0) >= 6) {
    cap('event', 2);
    cap('reminder', 2);
    cap('todo', 2);
    cap('note', 1);
    cap('link', 2);
  }
  return s;
}
