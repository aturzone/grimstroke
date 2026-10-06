import { classify } from '@core/box/classify.ts';
import { describe, expect, it } from 'vitest';

const ref = new Date(2026, 9, 6, 9);
const kind = (s: string): string => classify(s, ref).intent.value;

describe('several weekdays in one line', () => {
  it('are a habit, in each of the three languages', () => {
    expect(kind('gym mon wed fri 7am')).toBe('habit');
    expect(kind('yoga tue and thu')).toBe('habit');
    expect(kind('ورزش شنبه و دوشنبه')).toBe('habit');
    expect(kind('бег пн ср пт')).toBe('habit');
  });

  it('are still a choice when joined by "or", and one weekday is still an event', () => {
    expect(kind('friday or saturday for the party?')).toBe('poll');
    expect(kind('dinner friday 8pm')).toBe('event');
  });
});
