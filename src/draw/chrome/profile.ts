/**
 * The profile page: one character's card, large, and what can be done with it.
 *
 * Pure. The card is drawn by the same renderProfile that draws it on a board and on a cover,
 * so the card on this page is the card you get anywhere else.
 */

import { icon } from '~/draw/chrome/icons.ts';
import { button, heading, item } from '~/draw/chrome/parts.ts';
import { helpDialog, searchDialog, topBar } from '~/draw/chrome/top.ts';
import { renderHead } from '~/draw/doc/head.ts';
import type { RenderedPage } from '~/draw/doc/model.ts';
import { surface } from '~/draw/doc/surface.ts';
import type { Character } from '~/draw/material/face/model.ts';
import { renderProfile } from '~/draw/material/face/profile.ts';
import { halftoneDefs } from '~/draw/material/note/render.ts';
import { escapeHtml } from '~/draw/type/text.ts';

export interface ProfilePageOptions {
  /** Notebooks the card could go on the cover of: id and title. */
  books?: ReadonlyArray<{ id: string; title: string }>;
  live?: { scripts?: string[] } | undefined;
}

export function renderProfilePage(
  character: Character,
  options: ProfilePageOptions = {},
): RenderedPage {
  const ctx = surface('profile', { palette: 'studio' });
  const head = renderHead(ctx, 'ltr', { paper: 'blank', grain: 0.7 });
  const name = character.name || character.id;
  const studio = `/face?id=${encodeURIComponent(character.id)}`;
  const books = (options.books ?? [])
    .map((b) => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.title)}</option>`)
    .join('');

  const actions =
    `<a class="gs-btn" href="${studio}" data-gs="profile-edit">${icon('face')}<span class="gs-btn-text">edit</span></a>` +
    button({ gs: 'profile-print', label: 'print the card', icon: 'export', text: 'print' });
  const html = [
    '<!doctype html>',
    '<html lang="en" dir="ltr" data-script="latin" data-uppercase="on">',
    head,
    '<body class="on-studio">',
    halftoneDefs(),
    topBar({
      place: 'studio',
      title: name,
      back: { href: studio, label: 'the studio' },
      actions,
      compact:
        item({ gs: 'profile-edit', text: 'edit in the studio', icon: 'face', href: studio }) +
        item({ gs: 'profile-print', text: 'print the card', icon: 'export' }),
    }),
    '<main class="pf-page">',
    `<div class="pf-stage" data-gs="profile-stage">${renderProfile(character)}</div>`,
    '<aside class="pf-panel gs-card">',
    heading('on the board'),
    button({
      gs: 'profile-place',
      label: 'put the card on the board',
      icon: 'board',
      text: 'put the card on the board',
    }),
    heading('on a notebook'),
    books
      ? `<select class="gs-field" data-gs="profile-book" aria-label="which notebook">${books}</select>` +
        button({
          gs: 'profile-cover',
          label: 'use as its cover',
          icon: 'cover',
          text: 'use as its cover',
        })
      : '<p class="pf-note">There are no notebooks yet. Make one on the shelf and come back.</p>',
    '<p class="pf-note">The card goes on by value: it stays as it is now, whatever happens to ' +
      'the character later. A notebook is a record, and its cover is part of it.</p>',
    '</aside>',
    '</main>',
    `<script type="application/json" data-gs="face-data">${JSON.stringify(character).replace(/</g, '\\u003c')}</script>`,
    searchDialog(),
    helpDialog(),
    ...(options.live?.scripts ?? []).map(
      (src) => `<script type="module" src="${escapeHtml(src)}"></script>`,
    ),
    '</body>',
    '</html>',
  ].join('\n');
  return {
    id: `profile-${character.id}`,
    html: `${html}\n`,
    assets: ctx.assets,
    width: 480,
    selector: '.profile',
    warnings: ctx.warnings,
    autofit: true,
  };
}
