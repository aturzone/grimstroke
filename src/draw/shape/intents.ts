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
  'note',
] as const;

export type ShapeIntent = (typeof SHAPE_INTENTS)[number];

export interface IntentDef {
  label: string;
  fa: string;
  example: string;
  exampleFa: string;
  /** Path data on the chrome's 24-unit grid, stroked. */
  icon: string;
  /** Other words the "/" list is searched by. */
  words: string;
}

export const INTENTS: Record<ShapeIntent, IntentDef> = {
  event: {
    label: 'Event',
    fa: 'رویداد',
    example: 'dinner with priya friday 8pm',
    exampleFa: 'شام با مریم جمعه ساعت ۸ شب',
    icon: 'M4 6 H20 V20 H4 Z M4 10.5 H20 M8 3.5 V7.5 M16 3.5 V7.5 M8 14.5 H8.1 M12 14.5 H12.1 M16 14.5 H16.1',
    words: 'meeting calendar plan جلسه قرار',
  },
  reminder: {
    label: 'Reminder',
    fa: 'یادآور',
    example: 'remind me to call mom tomorrow',
    exampleFa: 'یادم بنداز فردا به مامان زنگ بزنم',
    icon: 'M6 16.5 V11 A6 6 0 0 1 18 11 V16.5 L19.5 18 H4.5 Z M10 20.5 H14',
    words: 'bell alarm یادآوری',
  },
  todo: {
    label: 'Checklist',
    fa: 'چک‌لیست',
    example: 'buy milk, eggs, bread and coffee',
    exampleFa: 'شیر، تخم‌مرغ، نان و قهوه بخر',
    icon: 'M4 6.5 L5.5 8 L8 5.5 M4 12.5 L5.5 14 L8 11.5 M4 18.5 L5.5 20 L8 17.5 M11 7 H20 M11 13 H20 M11 19 H20',
    words: 'todo list shopping tasks کارها خرید لیست',
  },
  timer: {
    label: 'Timer',
    fa: 'تایمر',
    example: '25 min focus',
    exampleFa: '۲۵ دقیقه تمرکز',
    icon: 'M12 20.5 A7.5 7.5 0 1 0 12 5.5 A7.5 7.5 0 1 0 12 20.5 M12 9.5 V13 L14.5 14.5 M10 3.5 H14',
    words: 'stopwatch pomodoro focus countdown تمرکز زمان',
  },
  habit: {
    label: 'Habit',
    fa: 'عادت',
    example: 'meditate every morning',
    exampleFa: 'هر صبح مدیتیشن',
    icon: 'M4.5 11 A7.5 7.5 0 0 1 17.5 7 M17.5 3.5 V7.5 H13.5 M19.5 13 A7.5 7.5 0 0 1 6.5 17 M6.5 20.5 V16.5 H10.5',
    words: 'routine daily repeat روزانه تکرار',
  },
  color: {
    label: 'Color',
    fa: 'رنگ',
    example: '#ff6b35',
    exampleFa: 'آبی آسمانی',
    icon: 'M12 3.5 A8.5 8.5 0 1 0 12 20.5 C13.6 20.5 13.6 18.6 12.7 17.6 C11.8 16.6 12.3 14.5 14.2 14.5 H16 A4.5 4.5 0 0 0 20.5 10 C20.5 6.4 16.7 3.5 12 3.5 Z M7.5 12.5 H7.6 M9 8.5 H9.1 M13.5 7 H13.6 M17 10 H17.1',
    words: 'colour hex palette swatch پالت',
  },
  split: {
    label: 'Split',
    fa: 'دنگ',
    example: 'split 2400 between 3',
    exampleFa: '۲ میلیون بین ۴ نفر',
    icon: 'M9 11 A3 3 0 1 0 9 5 A3 3 0 1 0 9 11 M3.5 19.5 C3.5 16.2 6 14 9 14 C12 14 14.5 16.2 14.5 19.5 M16 5.2 A3 3 0 0 1 16 10.8 M17.5 14.3 C19.3 15 20.5 16.8 20.5 19.5',
    words: 'bill share divide دنگ تقسیم سهم',
  },
  expense: {
    label: 'Expense',
    fa: 'هزینه',
    example: 'spent 450 on uber',
    exampleFa: '۴۵۰ هزار تومن برای اسنپ',
    icon: 'M4 7.5 H18 A2 2 0 0 1 20 9.5 V18 A2 2 0 0 1 18 20 H6 A2 2 0 0 1 4 18 Z M4 7.5 L15 4 V7.5 M15.5 13.5 H16',
    words: 'money spend spent paid خرج پول',
  },
  convert: {
    label: 'Convert',
    fa: 'تبدیل',
    example: '5 miles in km',
    exampleFa: '۵ مایل به کیلومتر',
    icon: 'M4 8 H18.5 L15.5 5 M20 16 H5.5 L8.5 19',
    words: 'units unit km miles kg واحد',
  },
  calc: {
    label: 'Calculate',
    fa: 'حساب',
    example: '18% of 3450',
    exampleFa: '۱۸٪ از ۳۴۵۰',
    icon: 'M6 3.5 H18 V20.5 H6 Z M8.5 6.5 H15.5 V9.5 H8.5 Z M9 13 H9.1 M12 13 H12.1 M15 13 H15.1 M9 17 H9.1 M12 17 H12.1 M15 17 H15.1',
    words: 'math sum percent calculator ماشین حساب درصد',
  },
  travel: {
    label: 'Trip',
    fa: 'سفر',
    example: 'flight to goa next weekend',
    exampleFa: 'پرواز به کیش آخر هفته',
    icon: 'M3.5 12.5 L20.5 5.5 L16.5 20 L12 14.5 Z M12 14.5 L20.5 5.5 M12 14.5 V19',
    words: 'flight train travel trip پرواز قطار',
  },
  poll: {
    label: 'Poll',
    fa: 'نظرسنجی',
    example: 'pizza or burgers for friday?',
    exampleFa: 'پیتزا یا برگر برای جمعه؟',
    icon: 'M5 20 V13.5 M10 20 V5.5 M15 20 V10 M20 20 V15.5',
    words: 'vote choose options رای انتخاب',
  },
  contact: {
    label: 'Contact',
    fa: 'مخاطب',
    example: 'rahul 98200 12345 rahul@mail.com',
    exampleFa: 'علی ۰۹۱۲ ۳۴۵ ۶۷۸۹ ali@mail.com',
    icon: 'M4 5 H20 V19 H4 Z M9.5 12 A2 2 0 1 0 9.5 8 A2 2 0 1 0 9.5 12 M6.5 16 C7 14.4 8 13.6 9.5 13.6 C11 13.6 12 14.4 12.5 16 M14.5 9.5 H17.5 M14.5 13 H17.5',
    words: 'phone email person شماره تلفن',
  },
  link: {
    label: 'Bookmark',
    fa: 'نشانک',
    example: 'https://vercel.com/blog check later',
    exampleFa: 'https://github.com/aturzone/grimstroke بعدا بخونم',
    icon: 'M10 14 L14 10 M8.5 11.5 L6.5 13.5 A3.5 3.5 0 0 0 11.5 18.5 L13.5 16.5 M15.5 12.5 L17.5 10.5 A3.5 3.5 0 0 0 12.5 5.5 L10.5 7.5',
    words: 'url link website bookmark لینک سایت',
  },
  countdown: {
    label: 'Countdown',
    fa: 'شمارش معکوس',
    example: 'days until christmas',
    exampleFa: 'چند روز مونده تا نوروز',
    icon: 'M4 6 H20 V11 M4 6 V20 H11 M8 3.5 V7.5 M16 3.5 V7.5 M17 20.5 A4 4 0 1 0 17 12.5 A4 4 0 1 0 17 20.5 M17 15 V16.8 L18.2 17.8',
    words: 'days until left مونده روز',
  },
  timezone: {
    label: 'Time zone',
    fa: 'منطقه زمانی',
    example: '3pm pst in ist',
    exampleFa: 'ساعت ۳ عصر تهران به وقت لندن',
    icon: 'M12 20.5 A8.5 8.5 0 1 0 12 3.5 A8.5 8.5 0 1 0 12 20.5 M3.5 12 H20.5 M12 3.5 C9.4 6 9.4 18 12 20.5 C14.6 18 14.6 6 12 3.5',
    words: 'zone city clock world ساعت شهر',
  },
  random: {
    label: 'Random',
    fa: 'شانسی',
    example: 'roll 2d6',
    exampleFa: 'تاس بنداز',
    icon: 'M5 5 H19 V19 H5 Z M9 9 H9.1 M15 15 H15.1 M12 12 H12.1 M15 9 H15.1 M9 15 H9.1',
    words: 'dice coin chance pick تاس سکه قرعه',
  },
  goal: {
    label: 'Goal',
    fa: 'هدف',
    example: 'read 12 books this year, 4 done',
    exampleFa: '۱۲ کتاب امسال، ۴ تا خوندم',
    icon: 'M12 20.5 A8.5 8.5 0 1 0 12 3.5 A8.5 8.5 0 1 0 12 20.5 M12 16.5 A4.5 4.5 0 1 0 12 7.5 A4.5 4.5 0 1 0 12 16.5 M12 12 H12.1',
    words: 'target progress پیشرفت',
  },
  note: {
    label: 'Note',
    fa: 'یادداشت',
    example: 'the city felt so quiet this morning',
    exampleFa: 'امروز شهر عجیب آروم بود',
    icon: 'M4 4 H20 V14.5 L14.5 20 H4 Z M20 14.5 H14.5 V20',
    words: 'thought idea text فکر ایده',
  },
};

export function iconSvg(intent: ShapeIntent, className = 'sc-icon'): string {
  return (
    `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">` +
    `<path d="${INTENTS[intent].icon}"/></svg>`
  );
}

export function isIntent(value: unknown): value is ShapeIntent {
  return typeof value === 'string' && (SHAPE_INTENTS as readonly string[]).includes(value);
}
