/**
 * The surfaces the golden check renders: every document and every chrome page, in both
 * directions, on a spread of palettes.
 *
 * Shared by the test, which holds each one to a fingerprint, and by tools/golden.ts, which
 * writes them out as HTML so a changed fingerprint can be read as a diff.
 */

import { chrome } from '~/draw/chrome/board.ts';
import { bookChrome } from '~/draw/chrome/book.ts';
import { renderProfilePage } from '~/draw/chrome/profile.ts';
import { shelfChrome } from '~/draw/chrome/shelf.ts';
import { board } from '~/draw/doc/board/build.ts';
import { renderBoard } from '~/draw/doc/board/render.ts';
import type { BookSpec } from '~/draw/doc/book/model.ts';
import { renderShelf, renderSpread } from '~/draw/doc/book/render.ts';
import type { RenderedPage } from '~/draw/doc/model.ts';
import { notebook } from '~/draw/doc/page/build.ts';
import type { Profile } from '~/draw/material/profile/model.ts';
import { UI } from '../fixtures/index.ts';

const profile: Profile = {
  name: 'Rio',
  role: 'design lead',
  details: [{ label: 'team', value: 'platform' }],
  accent: '#15654f',
  portrait: { strokes: [{ d: 'M10 10 C 60 80, 120 80, 200 20', colour: '#14110e', weight: 3 }] },
};

function book(direction: 'ltr' | 'rtl'): BookSpec {
  return {
    id: `golden-${direction}`,
    title: direction === 'rtl' ? 'دفترچه' : 'Golden',
    direction,
    palette: 'newsprint',
    minLeaves: 6,
    cover: {
      colour: '#1f3fd0',
      profile,
      stickers: [{ id: 's', kind: 'label', text: 'hi', at: [50, 50] }],
    },
    leaves: [
      {
        id: 'l1',
        blocks: [
          { kind: 'heading', text: 'Tuesday' },
          { kind: 'text', text: 'Measured `1.02:1`.' },
        ],
      },
      {
        id: 'l2',
        items: [
          { id: 'n', at: [60, 80], size: [220], block: { kind: 'note', text: '- [x] done' } },
          { id: 'i', at: [40, 400], ink: { d: 'M0 0 L 100 20', colour: '#c0392b', weight: 3 } },
        ],
      },
    ],
  };
}

export function surfaces(): Array<{ name: string; page: RenderedPage }> {
  const out: Array<{ name: string; page: RenderedPage }> = [];
  for (const palette of ['studio', 'newsprint', 'carbon']) {
    for (const direction of ['ltr', 'rtl'] as const) {
      const nb = notebook({ palette, direction });
      nb.page(`p-${palette}-${direction}`)
        .title(direction === 'rtl' ? 'دکمه ورود' : 'The login button')
        .chip('critical')
        .bullets('Measured `#4070F0` on `#4070F0`')
        .image(UI, {
          caption: 'Build 102',
          marks: [{ rect: 'pct:10,10,30,20', badge: '1', note: 'here' }],
        })
        .note('Contrast cannot be judged by eye.', { title: 'measured' });
      for (const page of nb.render()) out.push({ name: `page-${palette}-${direction}`, page });
    }
  }
  const b = board('golden', { palette: 'studio' })
    .note('# heading\n- [ ] task', { at: [0, 0], size: [240, 180] })
    .image(UI, { at: [300, 0], size: [320], rotation: -3 })
    .place({ kind: 'profile', profile }, { at: [700, 0], size: [220] }).spec;
  out.push({ name: 'board', page: renderBoard(b) });
  out.push({
    name: 'board-live',
    page: renderBoard(b, { live: { chrome: chrome(b), scripts: ['/app.js'] } }),
  });
  for (const direction of ['ltr', 'rtl'] as const) {
    const spec = book(direction);
    out.push({ name: `spread-${direction}`, page: renderSpread(spec, { leaf: 0 }) });
    out.push({
      name: `spread-live-${direction}`,
      page: renderSpread(spec, { closed: true, live: { chrome: bookChrome(spec), scripts: [] } }),
    });
  }
  out.push({
    name: 'shelf',
    page: renderShelf([book('ltr'), { ...book('rtl'), archived: true }], {
      live: { chrome: shelfChrome(2) },
    }),
  });
  out.push({
    name: 'profile',
    page: renderProfilePage(profile, { books: [{ id: 'a', title: 'A' }] }),
  });
  return out;
}
