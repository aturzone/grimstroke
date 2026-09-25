/**
 * Sentences to teach the shape classifier with, in English and Persian.
 *
 * Templates with slots, expanded with a seeded random choice so the set is the same on every
 * run. Each template belongs to one card kind. The trainer holds some TEMPLATES out -- not some
 * sentences -- so the accuracy it reports is on phrasings the model never saw, which is the
 * honest number for text a person has not typed yet.
 */

import type { IntentKey } from '~/draw/shape/classify.ts';

export interface Example {
  text: string;
  label: IntentKey;
  template: string;
  /** Cut short, as while typing. */
  cut?: boolean;
}

const NAMES = [
  'priya',
  'rahul',
  'anna',
  'sam',
  'maria',
  'john',
  'lee',
  'omar',
  'zoe',
  'alex',
  'the team',
  'mom',
  'dad',
  'sarah and tom',
];
const FA_NAMES = [
  'مریم',
  'علی',
  'سارا',
  'رضا',
  'نگار',
  'امیر',
  'مامان',
  'بابا',
  'تیم',
  'بچه ها',
  'حسین و زهرا',
  'استاد',
  'مدیر',
];
const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
  'tomorrow',
  'today',
  'tonight',
  'next week',
  'fri',
  'mon',
  'oct 12',
  '3rd march',
  'next friday',
];
const FA_DAYS = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
  'فردا',
  'امروز',
  'امشب',
  'پس فردا',
  'هفته بعد',
  '۱۵ مهر',
  'جمعه بعد',
];
const TIMES = [
  '8pm',
  '7:30pm',
  '9am',
  'at 5',
  'at noon',
  '10:00',
  '6 pm',
  '',
  '',
  'in the morning',
  '3pm',
];
const FA_TIMES = ['ساعت ۸ شب', 'ساعت ۱۰', 'ساعت ۹ صبح', 'ظهر', 'ساعت ۵ عصر', '', '', 'ساعت ۷:۳۰'];
const MEALS = [
  'dinner',
  'lunch',
  'breakfast',
  'brunch',
  'coffee',
  'drinks',
  'meeting',
  'call',
  'sync',
  'standup',
  'interview',
  'dentist appointment',
  'catch up',
  'party',
  'movie night',
  'date',
  '1:1',
  'review',
];
const FA_MEALS = [
  'شام',
  'ناهار',
  'صبحانه',
  'قهوه',
  'جلسه',
  'قرار',
  'مصاحبه',
  'وقت دکتر',
  'دورهمی',
  'مهمونی',
  'تماس',
  'سینما',
  'جلسه بررسی',
];
const TASKS = [
  'call mom',
  'pay rent',
  'water the plants',
  'send the invoice',
  'book tickets',
  'renew passport',
  'email the landlord',
  'take medicine',
  'submit the report',
  'buy a gift',
  'back up the laptop',
  'feed the cat',
];
const FA_TASKS = [
  'به مامان زنگ بزنم',
  'اجاره رو بدم',
  'به گلدونا آب بدم',
  'فاکتور رو بفرستم',
  'بلیط بگیرم',
  'قبض برق رو بدم',
  'دارومو بخورم',
  'گزارش رو تحویل بدم',
  'کادو بخرم',
  'از لپ تاپ بکاپ بگیرم',
  'به غذای گربه برسم',
  'ایمیل رو جواب بدم',
];
const ITEMS = [
  'milk',
  'eggs',
  'bread',
  'coffee',
  'rice',
  'apples',
  'cheese',
  'butter',
  'tomatoes',
  'soap',
  'batteries',
  'pasta',
  'onions',
  'tea',
  'yogurt',
];
const FA_ITEMS = [
  'شیر',
  'تخم مرغ',
  'نان',
  'قهوه',
  'برنج',
  'سیب',
  'پنیر',
  'کره',
  'گوجه',
  'صابون',
  'باتری',
  'ماکارونی',
  'پیاز',
  'چای',
  'ماست',
];
const CHORES = [
  'fix the bug',
  'write tests',
  'review the pr',
  'update docs',
  'deploy',
  'clean the kitchen',
  'call the bank',
  'reply to emails',
];
const FA_CHORES = [
  'باگ رو درست کنم',
  'تست بنویسم',
  'پی آر رو ببینم',
  'مستندات رو آپدیت کنم',
  'دیپلوی',
  'آشپزخونه رو تمیز کنم',
  'به بانک زنگ بزنم',
];
const HABITS = [
  'meditate',
  'run',
  'read',
  'journal',
  'stretch',
  'drink water',
  'practice guitar',
  'gym',
  'walk',
  'study spanish',
  'floss',
];
const FA_HABITS = [
  'مدیتیشن',
  'دویدن',
  'کتاب خوندن',
  'نوشتن',
  'ورزش',
  'آب خوردن',
  'تمرین گیتار',
  'باشگاه',
  'پیاده روی',
  'زبان خوندن',
];
const CITIES = [
  'goa',
  'paris',
  'london',
  'tokyo',
  'berlin',
  'new york',
  'dubai',
  'lisbon',
  'rome',
  'istanbul',
  'bali',
  'barcelona',
];
const FA_CITIES = [
  'کیش',
  'مشهد',
  'شیراز',
  'اصفهان',
  'تبریز',
  'رشت',
  'یزد',
  'استانبول',
  'دبی',
  'کاشان',
  'قشم',
  'تهران',
];
const COLOURS = [
  'teal',
  'coral',
  'navy',
  'sage',
  'mustard',
  'lavender',
  'burgundy',
  'mint',
  'crimson',
  'olive',
  'peach',
  'cobalt',
];
const FA_COLOURS = [
  'آبی',
  'قرمز',
  'سبز',
  'زرد',
  'نارنجی',
  'بنفش',
  'صورتی',
  'فیروزه ای',
  'سرمه ای',
  'طوسی',
  'زرشکی',
  'کرم',
  'آبی آسمانی',
  'یشمی',
];
const WHERE = [
  'uber',
  'lunch',
  'groceries',
  'coffee',
  'rent',
  'netflix',
  'petrol',
  'movie tickets',
  'shoes',
  'the pharmacy',
  'pizza',
  'books',
];
const FA_WHERE = [
  'اسنپ',
  'ناهار',
  'خرید خونه',
  'قهوه',
  'اجاره',
  'بنزین',
  'بلیط سینما',
  'کفش',
  'دارو',
  'پیتزا',
  'کتاب',
  'قبض اینترنت',
];
const THOUGHTS = [
  'the city felt so quiet this morning',
  'i think we should rethink the onboarding flow',
  'maybe the problem is the cache after all',
  'realized i never finished that book',
  'idea: a game where the map is your notebook',
  'feeling good about the release',
  'wonder why the build is slow on mondays',
  'the meeting went better than expected',
  'need to think about what matters this year',
  'rain on the window and a warm cup of tea',
];
const FA_THOUGHTS = [
  'امروز شهر عجیب آروم بود',
  'فکر کنم باید فرایند ورود رو دوباره طراحی کنیم',
  'شاید مشکل از کش باشه',
  'یه ایده دارم برای بازی با نقشه دفترچه',
  'حس خوبی به انتشار این نسخه دارم',
  'جلسه بهتر از چیزی که فکر می کردم پیش رفت',
  'باید به این فکر کنم که امسال چی مهمه',
  'بارون پشت پنجره و یه چای داغ',
  'این روزها خیلی خسته ام',
  'به نظرم طراحی جدید قشنگ تره',
];

type Gen = (r: () => number) => string;

function pick<T>(r: () => number, list: readonly T[]): T {
  return list[Math.floor(r() * list.length)] as T;
}

function n(r: () => number, lo: number, hi: number): number {
  return Math.floor(lo + r() * (hi - lo + 1));
}

/** Persian digits for some Persian sentences, as a phone keyboard types them. */
function faDigits(s: string, r: () => number): string {
  return r() < 0.5 ? s.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)] as string) : s;
}

const T: Record<IntentKey, Gen[]> = {
  event: [
    (r) => `${pick(r, MEALS)} with ${pick(r, NAMES)} ${pick(r, DAYS)} ${pick(r, TIMES)}`,
    (r) => `${pick(r, MEALS)} ${pick(r, DAYS)} ${pick(r, TIMES)}`,
    (r) => `${pick(r, DAYS)} ${pick(r, TIMES)} ${pick(r, MEALS)} with ${pick(r, NAMES)}`,
    (r) => `${pick(r, MEALS)} with ${pick(r, NAMES)} on zoom ${pick(r, DAYS)}`,
    (r) =>
      `${pick(r, MEALS)} at ${pick(r, ['cafe nero', 'the office', 'home', 'blue bottle', 'central park'])} ${pick(r, DAYS)}`,
    (r) => `meet ${pick(r, NAMES)} ${pick(r, DAYS)} ${pick(r, TIMES)}`,
    (r) =>
      `${pick(r, ['team', 'project', 'design', 'weekly'])} ${pick(r, ['meeting', 'sync', 'review', 'standup'])} ${pick(r, DAYS)} ${pick(r, TIMES)}`,
    (r) =>
      faDigits(
        `${pick(r, FA_MEALS)} با ${pick(r, FA_NAMES)} ${pick(r, FA_DAYS)} ${pick(r, FA_TIMES)}`,
        r,
      ),
    (r) =>
      faDigits(
        `${pick(r, FA_DAYS)} ${pick(r, FA_TIMES)} ${pick(r, FA_MEALS)} با ${pick(r, FA_NAMES)}`,
        r,
      ),
    (r) => faDigits(`${pick(r, FA_MEALS)} ${pick(r, FA_DAYS)} ${pick(r, FA_TIMES)}`, r),
    (r) => faDigits(`${pick(r, FA_MEALS)} با ${pick(r, FA_NAMES)} توی زوم ${pick(r, FA_DAYS)}`, r),
    (r) =>
      faDigits(
        `قرار با ${pick(r, FA_NAMES)} ${pick(r, FA_DAYS)} توی ${pick(r, ['کافه', 'دفتر', 'پارک', 'خونه'])}`,
        r,
      ),
  ],
  reminder: [
    (r) => `don't let me forget ${pick(r, TASKS)} ${pick(r, DAYS)}`,
    (r) => `یادت نره ${pick(r, FA_DAYS)} ${pick(r, FA_TASKS)}`,
    (r) =>
      `need to ${pick(r, TASKS)} before ${pick(r, ['friday', 'monday', 'the weekend', 'june', 'tomorrow'])}`,
    (r) => `have to ${pick(r, TASKS)} by ${pick(r, ['friday', 'tonight', '5pm', 'next week'])}`,
    (r) => `باید تا ${pick(r, FA_DAYS)} ${pick(r, FA_TASKS)}`,
    (r) => `remind me to ${pick(r, TASKS)} ${pick(r, DAYS)}`,
    (r) => `remind me to ${pick(r, TASKS)}`,
    (r) => `don't forget to ${pick(r, TASKS)} ${pick(r, TIMES)}`,
    (r) => `reminder: ${pick(r, TASKS)} ${pick(r, DAYS)}`,
    (r) => `remember to ${pick(r, TASKS)} ${pick(r, ['', 'urgent', 'asap'])}`,
    (r) => faDigits(`یادم بنداز ${pick(r, FA_DAYS)} ${pick(r, FA_TASKS)}`, r),
    (r) => faDigits(`یادم بنداز ${pick(r, FA_TASKS)}`, r),
    (r) => faDigits(`یادت باشه ${pick(r, FA_DAYS)} ${pick(r, FA_TIMES)} ${pick(r, FA_TASKS)}`, r),
    (r) => `یادآوری ${pick(r, FA_TASKS)} ${pick(r, FA_DAYS)}`,
    (r) => `فراموش نکنم ${pick(r, FA_TASKS)}`,
  ],
  todo: [
    (r) => `${pick(r, ITEMS)} ${pick(r, ITEMS)} ${pick(r, ITEMS)} ${pick(r, ITEMS)}`,
    (r) => `${pick(r, FA_ITEMS)} ${pick(r, FA_ITEMS)} ${pick(r, FA_ITEMS)}`,
    (r) => `buy ${pick(r, ITEMS)}, ${pick(r, ITEMS)}, ${pick(r, ITEMS)} and ${pick(r, ITEMS)}`,
    (r) => `${pick(r, ITEMS)}, ${pick(r, ITEMS)}, ${pick(r, ITEMS)}`,
    (r) => `groceries: ${pick(r, ITEMS)}, ${pick(r, ITEMS)} and ${pick(r, ITEMS)}`,
    (r) => `todo: ${pick(r, CHORES)}, ${pick(r, CHORES)}, ${pick(r, CHORES)}`,
    (r) => `${pick(r, CHORES)}, ${pick(r, CHORES)} and ${pick(r, CHORES)}`,
    (r) => `get ${pick(r, ITEMS)} and ${pick(r, ITEMS)}`,
    (r) =>
      `${pick(r, FA_ITEMS)}، ${pick(r, FA_ITEMS)}، ${pick(r, FA_ITEMS)} و ${pick(r, FA_ITEMS)} بخر`,
    (r) => `${pick(r, FA_ITEMS)}، ${pick(r, FA_ITEMS)} و ${pick(r, FA_ITEMS)}`,
    (r) => `لیست خرید: ${pick(r, FA_ITEMS)}، ${pick(r, FA_ITEMS)}، ${pick(r, FA_ITEMS)}`,
    (r) => `کارها: ${pick(r, FA_CHORES)}، ${pick(r, FA_CHORES)} و ${pick(r, FA_CHORES)}`,
    (r) => `خرید ${pick(r, FA_ITEMS)} و ${pick(r, FA_ITEMS)}`,
  ],
  timer: [
    (r) =>
      `${pick(r, ['ده', 'بیست', 'پنج', 'سی', 'پانزده'])} دقیقه ${pick(r, ['استراحت', 'تمرکز', 'مطالعه', ''])}`,
    (r) => `${n(r, 5, 60)}m ${pick(r, ['deep work', 'focus', 'break'])}`,
    (r) =>
      `${n(r, 5, 90)} min ${pick(r, ['focus', 'break', 'timer', 'rest', 'deep work', 'study', ''])}`,
    (r) => `timer ${n(r, 1, 60)} minutes`,
    (r) => `set a timer for ${n(r, 1, 3)} hours`,
    (r) => `${n(r, 10, 59)} seconds`,
    () => `pomodoro`,
    (r) => `${pick(r, ['focus', 'study', 'deep work'])} for ${n(r, 15, 60)} mins`,
    () => `stopwatch`,
    (r) =>
      faDigits(`${n(r, 5, 90)} دقیقه ${pick(r, ['تمرکز', 'استراحت', 'مطالعه', 'تایمر', ''])}`, r),
    (r) => faDigits(`تایمر ${n(r, 1, 60)} دقیقه`, r),
    (r) => faDigits(`یه تایمر ${n(r, 1, 3)} ساعته بذار`, r),
    () => `پومودورو`,
    (r) => faDigits(`${n(r, 10, 59)} ثانیه`, r),
  ],
  habit: [
    (r) => `روزی ${pick(r, ['دو لیتر آب', 'ده صفحه کتاب', 'یک ساعت ورزش', 'بیست دقیقه مدیتیشن'])}`,
    (r) => `${pick(r, HABITS)} every ${pick(r, ['morning', 'day', 'night', 'evening'])}`,
    (r) => `${pick(r, HABITS)} daily`,
    (r) => `${pick(r, HABITS)} ${n(r, 2, 5)}x a week`,
    (r) => `${pick(r, HABITS)} ${pick(r, ['twice', 'three times', 'once'])} a week`,
    (r) => `${pick(r, HABITS)} every ${pick(r, ['monday', 'weekday', 'saturday'])}`,
    (r) => `habit: ${pick(r, HABITS)}`,
    (r) => `هر ${pick(r, ['روز', 'صبح', 'شب'])} ${pick(r, FA_HABITS)}`,
    (r) => `${pick(r, FA_HABITS)} روزانه`,
    (r) => faDigits(`${pick(r, FA_HABITS)} هفته ای ${n(r, 2, 5)} بار`, r),
    (r) => `عادت ${pick(r, FA_HABITS)}`,
    (r) => `میخوام هر روز ${pick(r, FA_HABITS)}`,
  ],
  color: [
    (r) =>
      `#${Math.floor(r() * 0xffffff)
        .toString(16)
        .padStart(6, '0')}`,
    (r) => `${pick(r, ['light', 'dark', 'pastel', 'deep', ''])} ${pick(r, COLOURS)}`,
    (r) =>
      `${pick(r, ['tiffany blue', 'minecraft diamond', 'barbie pink', 'klein blue', 'spotify green', 'millennial pink', 'hot pink', 'sky blue', 'forest green'])}`,
    (r) => `rgb(${n(r, 0, 255)}, ${n(r, 0, 255)}, ${n(r, 0, 255)})`,
    (r) => `the colour of ${pick(r, ['the sea', 'a sunset', 'fresh mint', 'old paper'])}`,
    (r) => `${pick(r, COLOURS)} color`,
    (r) => `${pick(r, FA_COLOURS)} ${pick(r, ['روشن', 'تیره', 'پاستلی', ''])}`,
    (r) => `رنگ ${pick(r, FA_COLOURS)}`,
    (r) => `رنگ ${pick(r, ['دریا', 'غروب', 'نعنا'])}`,
  ],
  split: [
    (r) =>
      `${pick(r, ['dinner', 'lunch', 'cab', 'groceries'])} bill ${n(r, 40, 900)} for ${n(r, 2, 6)} of us`,
    (r) => faDigits(`${pick(r, FA_MEALS)} ${n(r, 1, 9)} میلیون شد، ${n(r, 2, 6)} نفر بودیم`, r),
    (r) => `split ${n(r, 100, 9000)} between ${n(r, 2, 8)}`,
    (r) => `split ${n(r, 100, 9000)} among ${pick(r, ['three', 'four', 'five', 'two'])} friends`,
    (r) => `${n(r, 100, 9000)} split ${n(r, 2, 6)} ways`,
    (r) => `divide ${n(r, 100, 5000)} by ${n(r, 2, 6)} people`,
    (r) => `split the bill of ${n(r, 40, 900)} with ${pick(r, NAMES)} and ${pick(r, NAMES)}`,
    (r) => faDigits(`${n(r, 1, 20)} میلیون بین ${n(r, 2, 8)} نفر`, r),
    (r) => faDigits(`${n(r, 100, 900)} هزار تومن تقسیم بر ${n(r, 2, 6)}`, r),
    (r) => faDigits(`دنگ ${n(r, 200, 900)} هزار تومن برای ${n(r, 2, 6)} نفر`, r),
    (r) =>
      faDigits(`${n(r, 100, 900)} هزار رو بین ${pick(r, ['سه', 'چهار', 'پنج'])} نفر تقسیم کن`, r),
    (r) => faDigits(`نفری چقدر میشه ${n(r, 1, 9)} میلیون ${n(r, 2, 6)} نفری`, r),
  ],
  expense: [
    (r) => `spent ${n(r, 5, 900)} on ${pick(r, WHERE)}`,
    (r) => `paid ${n(r, 5, 900)} for ${pick(r, WHERE)}`,
    (r) => `$${n(r, 5, 300)} ${pick(r, WHERE)}`,
    (r) => `${pick(r, WHERE)} ${n(r, 5, 900)}`,
    (r) => `bought ${pick(r, WHERE)} for ${n(r, 5, 900)}`,
    (r) => faDigits(`${n(r, 50, 900)} هزار تومن برای ${pick(r, FA_WHERE)}`, r),
    (r) => faDigits(`${n(r, 50, 900)} تومن ${pick(r, FA_WHERE)} دادم`, r),
    (r) => faDigits(`خرج ${pick(r, FA_WHERE)} ${n(r, 50, 900)} هزار`, r),
    (r) => faDigits(`برای ${pick(r, FA_WHERE)} ${n(r, 1, 9)} میلیون پرداختم`, r),
    (r) => faDigits(`${pick(r, FA_WHERE)} ${n(r, 50, 900)} هزار`, r),
  ],
  convert: [
    (r) =>
      `${n(r, 1, 500)} ${pick(r, ['miles', 'km', 'kg', 'lbs', 'feet', 'inches', 'cm', 'liters', 'gallons', 'oz'])} ${pick(r, ['in', 'to'])} ${pick(r, ['km', 'miles', 'lbs', 'kg', 'meters', 'cm', 'inches', 'gallons', 'liters', 'grams'])}`,
    (r) =>
      `${n(r, -20, 110)}${pick(r, ['f', 'c', ' fahrenheit', ' celsius', '°f', '°c'])} ${pick(r, ['to', 'in'])} ${pick(r, ['c', 'f', 'celsius', 'fahrenheit'])}`,
    (r) => `convert ${n(r, 1, 500)} ${pick(r, ['miles', 'kg', 'feet', 'cups'])}`,
    (r) => `${n(r, 1, 300)} ${pick(r, ['km/h', 'mph'])} in ${pick(r, ['mph', 'km/h'])}`,
    (r) =>
      `how many ${pick(r, ['km', 'grams', 'cm'])} is ${n(r, 1, 50)} ${pick(r, ['miles', 'pounds', 'inches'])}`,
    (r) =>
      faDigits(
        `${n(r, 1, 500)} ${pick(r, ['مایل', 'کیلومتر', 'کیلو', 'پوند', 'فوت', 'اینچ', 'لیتر', 'گالن'])} به ${pick(r, ['کیلومتر', 'مایل', 'پوند', 'کیلو', 'متر', 'سانت', 'گالن', 'لیتر'])}`,
        r,
      ),
    (r) => faDigits(`${n(r, -20, 110)} درجه فارنهایت به سلسیوس`, r),
    (r) => faDigits(`${n(r, 1, 100)} اینچ چند سانته`, r),
    (r) => faDigits(`تبدیل ${n(r, 1, 500)} ${pick(r, ['پوند', 'مایل', 'فوت'])}`, r),
  ],
  calc: [
    (r) => `${n(r, 5, 25)}% ${pick(r, ['tip', 'tax'])} on ${n(r, 20, 900)}`,
    (r) => faDigits(`${n(r, 100, 9999)} تقسیم بر ${n(r, 2, 30)}`, r),
    (r) => `${n(r, 100, 9999)} * 0.${n(r, 1, 99)}`,
    (r) => `${n(r, 1, 50)}% of ${n(r, 100, 9000)}`,
    (r) => `${n(r, 2, 999)} * ${n(r, 2, 99)}`,
    (r) => `${n(r, 2, 9999)} + ${n(r, 2, 9999)} - ${n(r, 2, 999)}`,
    (r) => `(${n(r, 2, 99)} + ${n(r, 2, 99)}) / ${n(r, 2, 9)}`,
    (r) => `what's ${n(r, 2, 99)} times ${n(r, 2, 99)}`,
    (r) => `${n(r, 5, 70)}% off ${n(r, 100, 5000)}`,
    (r) => `calculate ${n(r, 2, 999)} divided by ${n(r, 2, 30)}`,
    (r) => faDigits(`${n(r, 1, 50)}٪ از ${n(r, 100, 9000)}`, r),
    (r) => faDigits(`${n(r, 1, 50)} درصد از ${n(r, 100, 9000)}`, r),
    (r) => faDigits(`${n(r, 2, 999)} ضرب در ${n(r, 2, 99)}`, r),
    (r) => faDigits(`${n(r, 2, 999)} به علاوه ${n(r, 2, 999)} چند میشه`, r),
    (r) => faDigits(`${n(r, 5, 70)} درصد تخفیف روی ${n(r, 100, 5000)}`, r),
  ],
  travel: [
    (r) =>
      `flight to ${pick(r, CITIES)} ${pick(r, ['next weekend', 'this weekend', 'on friday', 'in march', 'tomorrow', ''])}`,
    (r) => `trip to ${pick(r, CITIES)} ${pick(r, ['next month', 'this weekend', 'dec 12', ''])}`,
    (r) => `train from ${pick(r, CITIES)} to ${pick(r, CITIES)} ${pick(r, DAYS)}`,
    (r) => `${pick(r, ['work', 'business', 'vacation', 'holiday'])} trip to ${pick(r, CITIES)}`,
    (r) => `fly to ${pick(r, CITIES)} for a conference`,
    (r) => `road trip to ${pick(r, CITIES)}`,
    (r) =>
      `پرواز به ${pick(r, FA_CITIES)} ${pick(r, ['آخر هفته', 'آخر هفته بعد', 'فردا', 'جمعه', ''])}`,
    (r) => `سفر به ${pick(r, FA_CITIES)} ${pick(r, ['هفته بعد', 'تعطیلات', 'عید', ''])}`,
    (r) => `قطار ${pick(r, FA_CITIES)} به ${pick(r, FA_CITIES)} ${pick(r, FA_DAYS)}`,
    (r) => `بلیط اتوبوس ${pick(r, FA_CITIES)} ${pick(r, FA_DAYS)}`,
    (r) => `سفر کاری ${pick(r, FA_CITIES)}`,
  ],
  poll: [
    (r) =>
      `${pick(r, ['pizza', 'sushi', 'tacos', 'burgers', 'thai'])} or ${pick(r, ['burgers', 'pasta', 'curry', 'salad', 'ramen'])} for ${pick(r, DAYS)}?`,
    (r) =>
      `should we ${pick(r, ['go hiking', 'stay in', 'watch a movie'])} or ${pick(r, ['go out', 'play games', 'cook'])}?`,
    (r) =>
      `${pick(r, ['react', 'vue', 'tabs', 'dark mode', 'mac'])} vs ${pick(r, ['svelte', 'angular', 'spaces', 'light mode', 'linux'])}?`,
    (r) => `vote: ${pick(r, ITEMS)}, ${pick(r, ITEMS)} or ${pick(r, ITEMS)}`,
    (r) => `which day works, ${pick(r, DAYS)} or ${pick(r, DAYS)}?`,
    (r) =>
      `${pick(r, ['پیتزا', 'کباب', 'سوشی', 'برگر'])} یا ${pick(r, ['برگر', 'پاستا', 'قورمه سبزی', 'سالاد'])} برای ${pick(r, FA_DAYS)}؟`,
    (r) =>
      `بریم ${pick(r, ['کوه', 'سینما', 'کافه'])} یا ${pick(r, ['خونه بمونیم', 'پارک', 'رستوران'])}؟`,
    (r) => `نظرسنجی: ${pick(r, FA_ITEMS)} یا ${pick(r, FA_ITEMS)}`,
    (r) => `${pick(r, FA_DAYS)} یا ${pick(r, FA_DAYS)}؟`,
  ],
  contact: [
    (r) =>
      `${pick(r, NAMES)} ${n(r, 70000, 99999)} ${n(r, 10000, 99999)} ${pick(r, NAMES).split(' ')[0]}@mail.com`,
    (r) => `${pick(r, NAMES)} +1 ${n(r, 200, 999)} ${n(r, 200, 999)} ${n(r, 1000, 9999)}`,
    (r) => `save ${pick(r, NAMES)} ${pick(r, ['alex', 'sam', 'lee'])}@company.io`,
    (r) => `${pick(r, NAMES)}'s number is ${n(r, 1000000, 9999999)}`,
    (r) =>
      faDigits(`${pick(r, FA_NAMES)} 09${n(r, 10, 39)} ${n(r, 100, 999)} ${n(r, 1000, 9999)}`, r),
    (r) => faDigits(`شماره ${pick(r, FA_NAMES)} 09${n(r, 100000000, 399999999)}`, r),
    (r) => `${pick(r, FA_NAMES)} ali${n(r, 1, 99)}@gmail.com`,
    (r) => faDigits(`ذخیره مخاطب ${pick(r, FA_NAMES)} 021${n(r, 10000000, 99999999)}`, r),
  ],
  link: [
    (r) =>
      `https://${pick(r, ['vercel.com/blog', 'github.com/org/repo', 'news.ycombinator.com', 'example.org/docs', 'youtu.be/abc'])} ${pick(r, ['check later', 'read this', '', 'for the talk'])}`,
    (r) =>
      `${pick(r, ['figma.com/file/x', 'notion.so/page', 'linear.app/team', 'docs.rs/serde'])} ${pick(r, ['', 'design', 'todo'])}`,
    (r) => `www.${pick(r, ['nytimes', 'bbc', 'wikipedia', 'example'])}.com`,
    (r) =>
      `https://${pick(r, ['digikala.com', 'virgool.io/post', 'github.com/aturzone/grimstroke', 'aparat.com/v/x'])} ${pick(r, ['بعدا بخونم', 'برای جلسه', '', 'اینو ببین'])}`,
  ],
  countdown: [
    (r) =>
      `days until ${pick(r, ['christmas', 'new year', 'halloween', 'my birthday on dec 12', 'the launch on oct 20', 'valentines day'])}`,
    (r) => `how many days till ${pick(r, ['christmas', 'summer', 'the wedding on june 3'])}`,
    (r) =>
      `countdown to ${pick(r, ['launch', 'the exam', 'vacation'])} ${pick(r, ['nov 5', 'march 1', 'dec 24'])}`,
    (r) =>
      `weeks left before ${pick(r, ['the deadline', 'the move'])} on ${pick(r, ['jan 10', 'feb 2'])}`,
    (r) =>
      `چند روز مونده تا ${pick(r, ['نوروز', 'عید', 'یلدا', 'تولدم ۲۰ آبان', 'کریسمس', 'امتحان ۱۵ دی'])}`,
    (r) => `روزهای مونده تا ${pick(r, ['نوروز', 'شب یلدا', 'سال نو'])}`,
    (r) => `شمارش معکوس ${pick(r, ['عید', 'عروسی ۳ خرداد', 'سفر ۱ تیر'])}`,
    (r) => `تا ${pick(r, ['نوروز', 'یلدا'])} چند روز مونده`,
  ],
  timezone: [
    (r) =>
      `${n(r, 1, 12)}${pick(r, ['pm', 'am'])} ${pick(r, ['pst', 'est', 'ist', 'utc', 'london', 'tokyo'])} in ${pick(r, ['ist', 'pst', 'berlin', 'tehran', 'sydney', 'est'])}`,
    (r) =>
      `what time is it in ${pick(r, ['tokyo', 'london', 'new york', 'dubai', 'tehran', 'sydney'])}`,
    (r) =>
      `${n(r, 1, 11)}:30 ${pick(r, ['am', 'pm'])} ${pick(r, ['cet', 'est', 'jst'])} to ${pick(r, ['pst', 'ist', 'utc'])}`,
    (r) => `time in ${pick(r, ['paris', 'singapore', 'toronto'])}`,
    (r) =>
      faDigits(
        `ساعت ${n(r, 1, 12)} ${pick(r, ['صبح', 'عصر', 'شب', ''])} تهران به وقت ${pick(r, ['لندن', 'توکیو', 'نیویورک', 'دبی', 'پاریس'])}`,
        r,
      ),
    (r) => `الان ساعت چنده توی ${pick(r, ['توکیو', 'لندن', 'نیویورک', 'تورنتو'])}`,
    (r) => faDigits(`ساعت ${n(r, 1, 12)} ${pick(r, ['لندن', 'برلین', 'دبی'])} به وقت تهران`, r),
  ],
  random: [
    (r) => faDigits(`یه عدد بین ${n(r, 1, 10)} تا ${n(r, 20, 1000)}`, r),
    (r) => `a number between ${n(r, 1, 10)} and ${n(r, 20, 1000)}`,
    (r) => `roll ${pick(r, ['2d6', 'd20', '3d8', 'a die', 'dice', 'two dice'])}`,
    () => `flip a coin`,
    (r) => `random number between ${n(r, 1, 10)} and ${n(r, 20, 1000)}`,
    (r) =>
      `pick one: ${pick(r, ['tacos', 'sushi'])}, ${pick(r, ['pizza', 'ramen'])} or ${pick(r, ['curry', 'salad'])}`,
    (r) => `choose for me ${pick(r, ['red or blue', 'left or right'])}`,
    () => `toss a coin`,
    () => `تاس بنداز`,
    (r) => `${pick(r, ['دو', 'سه', '۲'])} تا تاس بنداز`,
    () => `شیر یا خط`,
    () => `سکه بنداز`,
    (r) => faDigits(`یه عدد تصادفی بین ${n(r, 1, 10)} و ${n(r, 20, 1000)}`, r),
    (r) =>
      `یکی رو انتخاب کن: ${pick(r, ['پیتزا', 'کباب'])}، ${pick(r, ['سوشی', 'برگر'])} یا ${pick(r, ['سالاد', 'پاستا'])}`,
    (r) => `قرعه بکش بین ${pick(r, FA_NAMES)}، ${pick(r, FA_NAMES)} و ${pick(r, FA_NAMES)}`,
  ],
  goal: [
    (r) => `read ${n(r, 6, 50)} books this year, ${n(r, 1, 5)} done`,
    (r) => `save ${n(r, 1, 50)}000, saved ${n(r, 1, 9)}000 so far`,
    (r) => `${n(r, 1, 9)} of ${n(r, 10, 30)} ${pick(r, ['chapters', 'lessons', 'runs', 'tasks'])}`,
    (r) => `goal: run ${n(r, 100, 1000)} km, ${n(r, 10, 99)} done`,
    (r) => `${n(r, 1, 9)}/${n(r, 10, 20)} ${pick(r, ['workouts', 'posts', 'modules'])} completed`,
    (r) => faDigits(`${n(r, 6, 50)} کتاب امسال، ${n(r, 1, 5)} تا خوندم`, r),
    (r) => faDigits(`هدف ${n(r, 10, 100)} میلیون پس انداز، تا حالا ${n(r, 1, 9)} میلیون`, r),
    (r) =>
      faDigits(`${n(r, 1, 9)} از ${n(r, 10, 30)} ${pick(r, ['فصل', 'جلسه', 'درس', 'تمرین'])}`, r),
    (r) => faDigits(`هدف: ${n(r, 100, 900)} کیلومتر دویدن، ${n(r, 10, 99)} تا انجام دادم`, r),
  ],
  note: [
    (r) => pick(r, THOUGHTS),
    (r) => `${pick(r, THOUGHTS)}. ${pick(r, THOUGHTS)}`,
    (r) => `note: ${pick(r, THOUGHTS)}`,
    (r) => pick(r, FA_THOUGHTS),
    (r) => `${pick(r, FA_THOUGHTS)}. ${pick(r, FA_THOUGHTS)}`,
    (r) => `یادداشت: ${pick(r, FA_THOUGHTS)}`,
  ],
  none: [
    (r) =>
      pick(r, [
        'hi',
        'ok',
        'hmm',
        'the',
        'a',
        'test',
        'hello',
        'yes',
        'no',
        'wait',
        'um',
        'so',
        'x',
        'lol',
      ]),
    (r) => pick(r, ['سلام', 'باشه', 'خب', 'آره', 'نه', 'تست', 'هوم', 'اوکی', 'ممنون', 'چی']),
    (r) => pick(r, ['di', 'fl', 'rem', 'spl', 'ro', 'رو', 'یا', 'با']),
  ],
};

/** A small seeded generator (mulberry32), so the data is the same on every run. */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Every example, with its template's name. `perTemplate` sentences each; a share of them are
 * cut short to 60-90% of their length, the way the bar sees them while they are being typed.
 */
export function examples(perTemplate = 40, seed = 7): Example[] {
  const r = rng(seed);
  const out: Example[] = [];
  for (const [label, gens] of Object.entries(T) as Array<[IntentKey, Gen[]]>) {
    gens.forEach((gen, i) => {
      const count = label === 'none' ? perTemplate * 2 : perTemplate;
      for (let k = 0; k < count; k++) {
        const text = gen(r).replace(/\s+/g, ' ').trim();
        if (!text) continue;
        out.push({ text, label, template: `${label}/${i}` });
        if (label !== 'none' && r() < 0.25 && text.length > 12) {
          const cut = text.slice(0, Math.floor(text.length * (0.6 + r() * 0.3)));
          out.push({ text: cut.trim(), label, template: `${label}/${i}`, cut: true });
        }
      }
    });
  }
  return out;
}
