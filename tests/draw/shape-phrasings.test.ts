/**
 * Phrasings the templates did not produce, written to find where the classifier was wrong.
 * Each one here was once misread (or sat next to one that was); they stay as regressions.
 */

import { describe, expect, it } from 'vitest';
import { classify } from '~/draw/shape/classify.ts';

const REF = new Date(2026, 8, 25, 10, 0);

const CASES: Array<[string, string]> = [
  ['need to renew my visa before friday', 'reminder'],
  ["don't let me forget the dentist on tuesday", 'reminder'],
  ['یادت نره پنجشنبه قبض گاز', 'reminder'],
  ['فردا صبح یادم بنداز دارو بخرم', 'reminder'],
  ['eggs flour sugar butter', 'todo'],
  ['پیاز گوجه سیب زمینی', 'todo'],
  ['ده دقیقه استراحت', 'timer'],
  ['نیم ساعت پیاده روی', 'timer'],
  ['45m deep work', 'timer'],
  ['روزی دو لیتر آب', 'habit'],
  ['هر شب ده صفحه کتاب', 'habit'],
  ['dinner bill 180 for 4 of us', 'split'],
  ['شام ۱.۲ میلیون شد، ۳ نفر بودیم', 'split'],
  ['split the 64 dollar pizza with 3 friends', 'split'],
  ['۱۲۰۰ تقسیم بر ۷', 'calc'],
  ['15% tip on 86', 'calc'],
  ['۲۵۰ ضربدر ۱۲', 'calc'],
  ['یه عدد بین ۱ تا ۱۰۰', 'random'],
  ['roll 3d8', 'random'],
  ['brunch sunday with mia and leo', 'event'],
  ['گفتگو با مدیر پروژه دوشنبه ساعت ۱۱', 'event'],
  ['6 feet in cm', 'convert'],
  ['۲ لیتر چند گالن', 'convert'],
  ['weekend getaway to lisbon', 'travel'],
  ['بلیط هواپیما مشهد جمعه', 'travel'],
  ['movie or bowling tonight?', 'poll'],
  ['شمال بریم یا جنوب؟', 'poll'],
  ['mom +98 912 555 1234', 'contact'],
  ['github.com/anishfn/shapeshift for later', 'link'],
  ['تا یلدا چند روز مونده', 'countdown'],
  ['noon pst in berlin', 'timezone'],
  ['الان ساعت توکیو چنده', 'timezone'],
  ['saved 4000 of 10000', 'goal'],
  ['۳ از ۱۲ فصل کتاب', 'goal'],
  ['the rain made everything smell like earth', 'note'],
  ['فکر کنم باید بیشتر بخوابم', 'note'],
];

describe('phrasings nobody wrote a template for', () => {
  it.each(CASES)('%s → %s', (text, want) => {
    expect(classify(text, REF).intent.value).toBe(want);
  });
});
