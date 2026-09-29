import { describe, expect, it } from 'vitest';
import { renderProfilePage } from '~/draw/chrome/profile.ts';
import { renderBoard } from '~/draw/doc/board/render.ts';
import { renderTodayPage } from '~/draw/today/render.ts';

// A page without it is laid out 980px wide on a phone and shrunk: the desktop, tiny. It was
// missing from every surface but the login, and no test at a phone size could see it -- a test
// sets the window's width, and a phone does not.
describe('every surface is laid out for the screen it is on', () => {
  const viewport = '<meta name="viewport" content="width=device-width';
  it('says so in its head', () => {
    expect(
      renderBoard({ id: 'b', items: [] }, { live: { chrome: '', scripts: [] } }).html,
    ).toContain(viewport);
    expect(renderProfilePage({} as never).html).toContain(viewport);
    expect(renderTodayPage('', '2026-09-29').html).toContain(viewport);
  });
});
