/**
 * The shape reader: which card a line is, what is on the card, and a bar that does not flicker.
 * Everything is read against a fixed moment, Friday 25 September 2026, 10:00.
 */

import { describe, expect, it } from 'vitest';
import { classify } from '~/draw/shape/classify.ts';
import { decide, force, START } from '~/draw/shape/decide.ts';
import { SHAPE_INTENTS } from '~/draw/shape/intents.ts';
import {
  parseCalc,
  parseConvert,
  parseCountdown,
  parseEvent,
  parseHabit,
  parsePoll,
  parseSplit,
  parseTimer,
  parseTodo,
} from '~/draw/shape/parse.ts';
import { fold } from '~/draw/shape/text.ts';
import { findDate, jalaliToGregorian } from '~/draw/shape/when.ts';

const REF = new Date(2026, 8, 25, 10, 0);

describe('which card', () => {
  const cases: Array<[string, string]> = [
    ['dinner with priya friday 8pm', 'event'],
    ['remind me to call mom tomorrow', 'reminder'],
    ['buy milk, eggs, bread and coffee', 'todo'],
    ['25 min focus', 'timer'],
    ['meditate every morning', 'habit'],
    ['#ff6b35', 'color'],
    ['split 2400 between 3', 'split'],
    ['spent 450 on uber', 'expense'],
    ['5 miles in km', 'convert'],
    ['18% of 3450', 'calc'],
    ['flight to goa next weekend', 'travel'],
    ['pizza or burgers for friday?', 'poll'],
    ['rahul 98200 12345 rahul@mail.com', 'contact'],
    ['https://vercel.com/blog check later', 'link'],
    ['days until christmas', 'countdown'],
    ['3pm pst in ist', 'timezone'],
    ['roll 2d6', 'random'],
    ['read 12 books this year, 4 done', 'goal'],
    ['the city felt so quiet this morning', 'note'],
    ['شام با مریم جمعه ساعت ۸ شب', 'event'],
    ['یادم بنداز فردا به مامان زنگ بزنم', 'reminder'],
    ['شیر، تخم‌مرغ، نان و قهوه بخر', 'todo'],
    ['۲۵ دقیقه تمرکز', 'timer'],
    ['هر صبح مدیتیشن', 'habit'],
    ['آبی آسمانی', 'color'],
    ['۲ میلیون بین ۴ نفر', 'split'],
    ['۴۵۰ هزار تومن برای اسنپ', 'expense'],
    ['۵ مایل به کیلومتر', 'convert'],
    ['۱۸٪ از ۳۴۵۰', 'calc'],
    ['پرواز به کیش آخر هفته', 'travel'],
    ['پیتزا یا برگر برای جمعه؟', 'poll'],
    ['علی ۰۹۱۲ ۳۴۵ ۶۷۸۹ ali@mail.com', 'contact'],
    ['چند روز مونده تا نوروز', 'countdown'],
    ['ساعت ۳ عصر تهران به وقت لندن', 'timezone'],
    ['تاس بنداز', 'random'],
    ['۱۲ کتاب امسال، ۴ تا خوندم', 'goal'],
    ['امروز شهر عجیب آروم بود', 'note'],
  ];
  it.each(cases)('%s → %s', (text, want) => {
    expect(classify(text, REF).intent.value).toBe(want);
  });

  it('says nothing yet for a fragment', () => {
    expect(classify('d', REF).intent.value).toBe('none');
    expect(classify('dinn', REF).intent.value).toBe('none');
  });

  it('gives a probability for every kind, summing to one', () => {
    const p = classify('dinner friday', REF).intent.probabilities;
    expect(Object.keys(p).length).toBe(SHAPE_INTENTS.length + 1);
    expect(Object.values(p).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
  });
});

describe('what is on the card', () => {
  it('folds Persian digits and letters', () => {
    expect(fold('۱۲ كيلو‌متر')).toBe('12 کیلو متر');
  });

  it('reads dates against the moment, in both languages', () => {
    expect(findDate('tomorrow 9am', REF)?.start).toEqual(new Date(2026, 8, 26, 9, 0));
    expect(findDate('next friday', REF)?.start).toEqual(new Date(2026, 9, 2));
    expect(findDate('in 3 days', REF)?.start).toEqual(new Date(2026, 8, 28));
    expect(findDate('dec 25', REF)?.start).toEqual(new Date(2026, 11, 25));
    expect(findDate('فردا ساعت ۸ شب', REF)?.start).toEqual(new Date(2026, 8, 26, 20, 0));
    expect(findDate('سه شنبه', REF)?.start).toEqual(new Date(2026, 8, 29));
  });

  it('knows the Persian calendar', () => {
    // 1 Farvardin 1406 is Nowruz, 21 March 2027; 15 Mehr 1405 is 7 October 2026.
    expect(jalaliToGregorian(1406, 1, 1)).toEqual([2027, 3, 21]);
    expect(jalaliToGregorian(1405, 7, 15)).toEqual([2026, 10, 7]);
    expect(parseCountdown('چند روز مونده تا نوروز', REF).date).toEqual(new Date(2027, 2, 21));
  });

  it('takes an event apart', () => {
    const e = parseEvent('lunch with rahul and anna tomorrow 1pm on zoom', REF);
    expect(e.title).toBe('Lunch');
    expect(e.people).toEqual(['Rahul', 'Anna']);
    expect(e.link).toBe('Zoom');
    expect(e.date).toEqual(new Date(2026, 8, 26, 13, 0));
  });

  it('computes, never guesses', () => {
    expect(parseSplit('split 2400 between 3')).toMatchObject({ total: 2400, people: 3 });
    expect(parseSplit('۲ میلیون بین ۴ نفر')).toMatchObject({
      total: 2_000_000,
      people: 4,
      currency: 'تومان',
    });
    expect(parseConvert('72f to c').result).toBeCloseTo(22.222, 2);
    expect(parseConvert('۵ مایل به کیلومتر').result).toBeCloseTo(8.047, 2);
    expect(parseCalc('18% of 3450').result).toBe(621);
    expect(parseCalc('(2 + 3) * 4').result).toBe(20);
    expect(parseCalc('2 +').result).toBeNull();
    expect(parseTimer('1h 30m deep work')).toEqual({ seconds: 5400, label: 'Deep work' });
    expect(parseTodo('buy milk, eggs and bread').items).toEqual(['Milk', 'Eggs', 'Bread']);
    expect(parseHabit('gym 3x a week').days).toEqual([1, 3, 5]);
    expect(parsePoll('pizza or burgers for friday?')).toEqual({
      title: 'Pizza or burgers for friday?',
      options: ['Pizza', 'Burgers'],
    });
  });
});

describe('the bar stays calm', () => {
  const at = (text: string) => classify(text, REF);
  it('commits, and a single stray guess does not replace the card', () => {
    let m = decide(START, at('split 2400 between 3'), 'split 2400 between 3');
    expect(m.ui).toEqual({ kind: 'committed', intent: 'split' });
    m = decide(m, at('split 2400 between 3 and'), 'split 2400 between 3 and');
    expect(m.ui.kind).toBe('committed');
  });
  it('keeps a kind picked by hand until the text really changes', () => {
    let m = force('note', 'split 2400 between 3');
    m = decide(m, at('split 2400 between 3!'), 'split 2400 between 3!');
    expect(m.ui).toEqual({ kind: 'committed', intent: 'note', forced: true });
  });
});
