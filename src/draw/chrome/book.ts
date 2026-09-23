/**
 * The notebook's chrome.
 *
 * A different set of controls from the board's, because a notebook is a different object: you
 * do not draw a marquee on a page, and you cannot turn a board to page forty. What they share
 * is the top -- the same masthead, the same places, the same "saved" in the same place.
 */

import { button, item } from '~/draw/chrome/parts.ts';
import { helpDialog, searchDialog, topBar } from '~/draw/chrome/top.ts';
import type { BookSpec } from '~/draw/doc/book/model.ts';

export function bookChrome(spec: BookSpec): string {
  const leaves = Math.max(spec.leaves.length, spec.minLeaves ?? 0);
  const actions =
    button({ gs: 'pages', label: 'every page', icon: 'pages', text: 'pages' }) +
    button({ gs: 'add-leaf', label: 'add a leaf', icon: 'leaf', text: 'leaf' }) +
    button({ gs: 'cover-open', label: 'the cover', icon: 'cover', text: 'cover' }) +
    button({
      gs: 'archive',
      label: spec.archived ? 'take it out of the archive' : 'put it in the archive',
      icon: 'archive',
      text: spec.archived ? 'take out' : 'archive',
    });
  const compact =
    item({ gs: 'pages', text: 'every page', icon: 'pages' }) +
    item({ gs: 'add-leaf', text: 'add a leaf', icon: 'leaf' }) +
    item({ gs: 'cover-open', text: 'the cover', icon: 'cover' }) +
    item({
      gs: 'archive',
      text: spec.archived ? 'take out of the archive' : 'archive it',
      icon: 'archive',
    });
  return [
    topBar({
      place: 'shelf',
      title: spec.title ?? spec.id,
      back: { href: '/shelf', label: 'the shelf' },
      saved: true,
      actions,
      compact,
    }),
    // The turner. Low, central, and out of the way of the page.
    '<div class="gs-turner gs-card" data-gs="turner" role="toolbar" aria-label="pages">',
    button({ gs: 'prev', label: 'previous page', icon: 'prev', key: '←' }),
    '<label class="gs-jump">',
    `<span class="gs-jump-label">page</span>`,
    `<input type="number" min="1" max="${leaves}" value="1" data-gs="jump" aria-label="go to page">`,
    `<span data-gs="place">1–2 of ${leaves}</span>`,
    '</label>',
    button({ gs: 'next', label: 'next page', icon: 'next', key: '→' }),
    '</div>',
    searchDialog(),
    helpDialog(),
  ].join('\n');
}
