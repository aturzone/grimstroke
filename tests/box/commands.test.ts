import { languageOf, matchCommands } from '@core/box/commands.ts';
import { describe, expect, it } from 'vitest';

const top = (text: string) => matchCommands(text)[0];

describe('what the / box is asked to do', () => {
  it('does a command said outright, in any of the three languages', () => {
    expect(top('settings')).toMatchObject({ sure: true, command: { id: 'go-settings' } });
    expect(top('تنظیمات')).toMatchObject({ sure: true, command: { id: 'go-settings' } });
    expect(top('тёмная тема')).toMatchObject({ sure: true, command: { id: 'theme-dark' } });
    expect(top('حالت تاریک')).toMatchObject({ sure: true, command: { id: 'theme-dark' } });
    expect(top('تقویم')).toMatchObject({ sure: true, command: { id: 'go-calendar' } });
  });

  it('takes what follows a command that takes something', () => {
    expect(top('new notebook Travel 2026')).toMatchObject({
      sure: true,
      arg: 'Travel 2026',
      command: { id: 'new-notebook' },
    });
    expect(top('دفتر جدید سفر')).toMatchObject({ sure: true, arg: 'سفر' });
  });

  it('only offers a command that is still being typed', () => {
    const m = top('setti');
    expect(m?.command.id).toBe('go-settings');
    expect(m?.sure).toBe(false);
  });

  it('leaves a card alone that only mentions a command', () => {
    expect(matchCommands('dinner on the calendar friday 8pm').some((m) => m.sure)).toBe(false);
    expect(matchCommands('bug: the dark mode text is unreadable').some((m) => m.sure)).toBe(false);
  });

  it('tells the three languages apart', () => {
    expect(languageOf('hello')).toBe('en');
    expect(languageOf('سلام')).toBe('fa');
    expect(languageOf('привет')).toBe('ru');
  });

  it('leaves git to the git layer, however it is said', () => {
    for (const said of ['close #12 in web', 'закрой #7', 'my issues', 'ایشوهای من', 'push'])
      expect(matchCommands(said).some((m) => m.sure)).toBe(false);
  });
});
