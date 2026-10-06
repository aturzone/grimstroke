import { describe, expect, it } from 'vitest';
import { classify } from '~/draw/shape/classify.ts';
import { parseShape } from '~/draw/shape/parse.ts';
import { findDate } from '~/draw/shape/when.ts';

// Thursday 1 October 2026, nine in the morning.
const ref = new Date(2026, 9, 1, 9, 0);
const kind = (text: string): string => classify(text, ref).intent.value;

describe('the / box in Russian', () => {
  it('reads days, times and spans of time', () => {
    const at = (s: string) => findDate(s.toLowerCase(), ref);
    expect(at('в пятницу в 8 вечера')?.start).toEqual(new Date(2026, 9, 2, 20, 0));
    expect(at('завтра в 10:30')?.start).toEqual(new Date(2026, 9, 2, 10, 30));
    expect(at('через 2 часа')?.start).toEqual(new Date(2026, 9, 1, 11, 0));
    expect(at('12 октября')?.start).toEqual(new Date(2026, 9, 12));
    expect(at('в следующий понедельник')?.start).toEqual(new Date(2026, 9, 5));
    expect(at('послезавтра утром')?.start).toEqual(new Date(2026, 9, 3, 9, 0));
  });

  it('knows which card a sentence is', () => {
    expect(kind('ужин с Анной в пятницу в 8 вечера')).toBe('event');
    expect(kind('напомни позвонить в банк завтра в 10')).toBe('reminder');
    expect(kind('молоко, яйца, хлеб и сыр')).toBe('todo');
    expect(kind('таймер 25 минут')).toBe('timer');
    expect(kind('спорт каждый день')).toBe('habit');
    expect(kind('потратил 500 руб на кофе')).toBe('expense');
    expect(kind('5 км в мили')).toBe('convert');
    expect(kind('сколько дней до нового года')).toBe('countdown');
    expect(kind('баг: кнопка входа не работает')).toBe('issue');
  });

  it('takes the words apart the way it does in the other two', () => {
    const e = parseShape('event', 'ужин с Анной в пятницу в 8 вечера', ref);
    expect(e.title).toBe('Ужин');
    expect(e.people).toEqual(['Анна']);
    expect(parseShape('reminder', 'напомни мне оплатить счета завтра', ref).task).toBe(
      'Оплатить счета',
    );
    expect(parseShape('todo', 'купить молоко, хлеб и сыр', ref).items).toEqual([
      'Молоко',
      'Хлеб',
      'Сыр',
    ]);
    expect(parseShape('timer', 'таймер 25 минут', ref).seconds).toBe(1500);
    expect(parseShape('habit', 'бег по пн, ср и пт', ref).days).toEqual([1, 3, 5]);
    expect(parseShape('split', 'раздели 900 на троих', ref).people).toBe(3);
    expect(parseShape('convert', '5 км в мили', ref).to).toBe('mi');
  });
});
