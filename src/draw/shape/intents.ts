/**
 * The kinds of card a typed line can become, and what each needs to be drawn and found.
 *
 * Adding one is an entry here, a parser in parse.ts, rules in rules.ts and a face in render.ts.
 * The examples are what the "/" list shows, and what an empty bar fills in when a kind is picked.
 *
 * The idea, the list of kinds and the interaction come from Shapeshift (MIT, anishfn/shapeshift):
 * "one text box that morphs into the right UI as you type". Nothing of it is a dependency.
 */

export const SHAPE_INTENTS = [
  'event',
  'reminder',
  'todo',
  'timer',
  'habit',
  'color',
  'split',
  'expense',
  'convert',
  'calc',
  'travel',
  'poll',
  'contact',
  'link',
  'countdown',
  'timezone',
  'random',
  'goal',
  'issue',
  'note',
] as const;

export type ShapeIntent = (typeof SHAPE_INTENTS)[number];

export interface IntentDef {
  label: string;
  fa: string;
  /** Its name in Russian. */
  ru: string;
  example: string;
  exampleFa: string;
  /** Other words the "/" list is searched by. */
  words: string;
}

export const INTENTS: Record<ShapeIntent, IntentDef> = {
  event: {
    label: 'Event',
    fa: 'رویداد',
    ru: 'Событие',
    example: 'dinner with priya friday 8pm',
    exampleFa: 'شام با مریم جمعه ساعت ۸ شب',
    words: 'meeting calendar plan جلسه قرار',
  },
  reminder: {
    label: 'Reminder',
    fa: 'یادآور',
    ru: 'Напоминание',
    example: 'remind me to call mom tomorrow',
    exampleFa: 'یادم بنداز فردا به مامان زنگ بزنم',
    words: 'bell alarm یادآوری',
  },
  todo: {
    label: 'Checklist',
    fa: 'چک‌لیست',
    ru: 'Список',
    example: 'buy milk, eggs, bread and coffee',
    exampleFa: 'شیر، تخم‌مرغ، نان و قهوه بخر',
    words: 'todo list shopping tasks کارها خرید لیست',
  },
  timer: {
    label: 'Timer',
    fa: 'تایمر',
    ru: 'Таймер',
    example: '25 min focus',
    exampleFa: '۲۵ دقیقه تمرکز',
    words: 'stopwatch pomodoro focus countdown تمرکز زمان',
  },
  habit: {
    label: 'Habit',
    fa: 'عادت',
    ru: 'Привычка',
    example: 'meditate every morning',
    exampleFa: 'هر صبح مدیتیشن',
    words: 'routine daily repeat روزانه تکرار',
  },
  color: {
    label: 'Color',
    fa: 'رنگ',
    ru: 'Цвет',
    example: '#ff6b35',
    exampleFa: 'آبی آسمانی',
    words: 'colour hex palette swatch پالت',
  },
  split: {
    label: 'Split',
    fa: 'دنگ',
    ru: 'Разделить',
    example: 'split 2400 between 3',
    exampleFa: '۲ میلیون بین ۴ نفر',
    words: 'bill share divide دنگ تقسیم سهم',
  },
  expense: {
    label: 'Expense',
    fa: 'هزینه',
    ru: 'Расход',
    example: 'spent 450 on uber',
    exampleFa: '۴۵۰ هزار تومن برای اسنپ',
    words: 'money spend spent paid خرج پول',
  },
  convert: {
    label: 'Convert',
    fa: 'تبدیل',
    ru: 'Перевод единиц',
    example: '5 miles in km',
    exampleFa: '۵ مایل به کیلومتر',
    words: 'units unit km miles kg واحد',
  },
  calc: {
    label: 'Calculate',
    fa: 'حساب',
    ru: 'Расчёт',
    example: '18% of 3450',
    exampleFa: '۱۸٪ از ۳۴۵۰',
    words: 'math sum percent calculator ماشین حساب درصد',
  },
  travel: {
    label: 'Trip',
    fa: 'سفر',
    ru: 'Поездка',
    example: 'flight to goa next weekend',
    exampleFa: 'پرواز به کیش آخر هفته',
    words: 'flight train travel trip پرواز قطار',
  },
  poll: {
    label: 'Poll',
    fa: 'نظرسنجی',
    ru: 'Опрос',
    example: 'pizza or burgers for friday?',
    exampleFa: 'پیتزا یا برگر برای جمعه؟',
    words: 'vote choose options رای انتخاب',
  },
  contact: {
    label: 'Contact',
    fa: 'مخاطب',
    ru: 'Контакт',
    example: 'rahul 98200 12345 rahul@mail.com',
    exampleFa: 'علی ۰۹۱۲ ۳۴۵ ۶۷۸۹ ali@mail.com',
    words: 'phone email person شماره تلفن',
  },
  link: {
    label: 'Bookmark',
    fa: 'نشانک',
    ru: 'Закладка',
    example: 'https://vercel.com/blog check later',
    exampleFa: 'https://github.com/aturzone/grimstroke بعدا بخونم',
    words: 'url link website bookmark لینک سایت',
  },
  countdown: {
    label: 'Countdown',
    fa: 'شمارش معکوس',
    ru: 'Отсчёт',
    example: 'days until christmas',
    exampleFa: 'چند روز مونده تا نوروز',
    words: 'days until left مونده روز',
  },
  timezone: {
    label: 'Time zone',
    fa: 'منطقه زمانی',
    ru: 'Часовой пояс',
    example: '3pm pst in ist',
    exampleFa: 'ساعت ۳ عصر تهران به وقت لندن',
    words: 'zone city clock world ساعت شهر',
  },
  random: {
    label: 'Random',
    fa: 'شانسی',
    ru: 'Случайно',
    example: 'roll 2d6',
    exampleFa: 'تاس بنداز',
    words: 'dice coin chance pick تاس سکه قرعه',
  },
  goal: {
    label: 'Goal',
    fa: 'هدف',
    ru: 'Цель',
    example: 'read 12 books this year, 4 done',
    exampleFa: '۱۲ کتاب امسال، ۴ تا خوندم',
    words: 'target progress پیشرفت',
  },
  issue: {
    label: 'Issue',
    fa: 'ایشو',
    ru: 'Задача',
    example: 'bug: the save button does nothing on safari, label ui',
    exampleFa: 'باگ: دکمه ذخیره در سافاری کار نمی‌کند، لیبل فرانت',
    words: 'issue bug ticket work item repo git github gitlab ایشو باگ تیکت گیت задача баг',
  },
  note: {
    label: 'Note',
    fa: 'یادداشت',
    ru: 'Заметка',
    example: 'the city felt so quiet this morning',
    exampleFa: 'امروز شهر عجیب آروم بود',
    words: 'thought idea text فکر ایده',
  },
};

export function isIntent(value: unknown): value is ShapeIntent {
  return typeof value === 'string' && (SHAPE_INTENTS as readonly string[]).includes(value);
}
