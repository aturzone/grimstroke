/**
 * The notebook's chrome.
 *
 * A different set of controls from the board's, because a notebook is a different object: you
 * do not draw a marquee on a page, and you cannot turn a board to page forty. What they share
 * is the top -- the same masthead, the same places, the same "saved" in the same place.
 */

import { button, item } from '~/draw/chrome/parts.ts';
import { helpDialog, searchDialog, topBar } from '~/draw/chrome/top.ts';
import { type BookSpec, bookTitle } from '~/draw/doc/book/model.ts';
import { renderStickerFace } from '~/draw/material/sticker/render.ts';
import { escapeHtml } from '~/draw/type/text.ts';

export function bookChrome(spec: BookSpec): string {
  const leaves = Math.max(spec.leaves.length, spec.minLeaves ?? 0);
  const actions =
    button({ gs: 'pages', label: 'every page', icon: 'pages', text: 'pages' }) +
    button({ gs: 'add-leaf', label: 'add a leaf', icon: 'leaf', text: 'leaf' }) +
    button({ gs: 'cover-open', label: 'the cover', icon: 'cover', text: 'cover' }) +
    button({ gs: 'page-setup', label: 'page size and template', icon: 'leaf', text: 'page' }) +
    button({
      gs: 'book-pdf',
      label: 'the whole notebook as a PDF',
      icon: 'export',
      text: 'PDF',
    }) +
    button({
      gs: 'repo-open',
      label: spec.remote ? `connected to ${spec.remote.repo}` : 'connect a repository',
      icon: 'branch',
      text: spec.remote ? 'repository' : 'connect',
    }) +
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
    item({ gs: 'page-setup', text: 'page size and template', icon: 'leaf' }) +
    item({ gs: 'book-pdf', text: 'the whole notebook as a PDF', icon: 'export' }) +
    item({
      gs: 'repo-open',
      text: spec.remote ? 'the repository' : 'connect a repository',
      icon: 'branch',
    }) +
    item({
      gs: 'archive',
      text: spec.archived ? 'take out of the archive' : 'archive it',
      icon: 'archive',
    });
  return [
    topBar({
      place: 'shelf',
      title: bookTitle(spec),
      back: { href: '/shelf', label: 'the shelf' },
      saved: true,
      actions,
      compact,
    }),
    // A connected notebook says so, and which repository, on a tab by the page.
    spec.remote
      ? `<button type="button" class="gs-repo-tab gs-card" data-gs="repo-open" aria-label="the repository">` +
        `<span class="gs-repo-mark">${renderStickerFace({ mark: spec.remote.provider })}</span>` +
        `<span class="gs-repo-name">${escapeHtml(spec.remote.repo)}</span>` +
        `<span class="gs-repo-host">${escapeHtml(spec.remote.host)}</span></button>`
      : '',
    // The turner. Low, central, and out of the way of the page.
    '<div class="gs-turner gs-card" data-gs="turner" role="toolbar" aria-label="pages">',
    button({ gs: 'prev', label: 'previous page', icon: 'prev', key: '←' }),
    '<label class="gs-jump">',
    `<span class="gs-jump-label">page</span>`,
    `<input type="number" min="1" max="${leaves}" value="1" data-gs="jump" aria-label="go to page">`,
    `<span data-gs="place" dir="ltr">1–2 of ${leaves}</span>`,
    '</label>',
    button({ gs: 'next', label: 'next page', icon: 'next', key: '→' }),
    '</div>',
    searchDialog(),
    helpDialog(),
  ].join('\n');
}
