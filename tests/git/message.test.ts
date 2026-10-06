import { messageOf } from '@core/git/http.ts';
import { describe, expect, it } from 'vitest';

describe("a service's error, in words", () => {
  it('says the status once, with a hint', () => {
    expect(messageOf(404, { message: '404 Not found' }, 'x')).toBe(
      '404 Not found -- not there, or the token cannot see it',
    );
    expect(messageOf(404, { message: 'Not Found' }, 'x')).toBe(
      '404 Not Found -- not there, or the token cannot see it',
    );
    expect(messageOf(500, undefined, 'the server failed')).toBe('500 the server failed');
  });
});
