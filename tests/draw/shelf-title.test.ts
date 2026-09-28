import { describe, expect, it } from 'vitest';
import { shelfShort, shelfTitle } from '~/draw/chrome/shelf-title.ts';

describe('the shelf title', () => {
  it('counts what is in use and what is put away', () => {
    expect(shelfTitle(0, 0)).toBe('no notebooks');
    expect(shelfTitle(1, 0)).toBe('one notebook');
    expect(shelfTitle(6, 0)).toBe('6 notebooks');
    expect(shelfTitle(6, 5)).toBe('1 in use · 5 archived');
    expect(shelfTitle(1, 1)).toBe('one notebook, archived');
    expect(shelfTitle(3, 3)).toBe('all 3 archived');
  });

  it('keeps to what is in use on a phone', () => {
    expect(shelfShort(6, 5)).toBe('1 in use');
    expect(shelfShort(6, 0)).toBe('6 notebooks');
    expect(shelfShort(3, 3)).toBe('all 3 archived');
  });
});
