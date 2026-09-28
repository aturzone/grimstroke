/**
 * The top of every surface: where you are, what this is, and where else you can go.
 *
 * Three cards lying along the top edge rather than one application bar across it. A strip of
 * grey chrome the width of the window is the moment a thing like this stops pretending to be
 * paper on a desk; three cards are three more objects on the desk. On a phone they fold into
 * two, and the places move into the menu.
 *
 * Every surface uses this one, so "saved" means the same thing and sits in the same place
 * wherever you are, and the way to the notebooks is always the same tab.
 */

import { icon } from '~/draw/chrome/icons.ts';
import { item, kbd, menu, RULE } from '~/draw/chrome/parts.ts';
import { escapeHtml } from '~/draw/type/text.ts';

export type Place = 'board' | 'shelf' | 'profile';

const PLACES: ReadonlyArray<{
  place: Place;
  href: string;
  text: string;
  icon: 'board' | 'book' | 'settings';
}> = [
  { place: 'board', href: '/', text: 'board', icon: 'board' },
  { place: 'shelf', href: '/shelf', text: 'notebooks', icon: 'book' },
  { place: 'profile', href: '/settings', text: 'settings', icon: 'settings' },
];

export interface TopOptions {
  place: Place;
  /** The document's own name, set in the hand. */
  title: string;
  /** A shorter title for a phone, where the whole one would be cut off in the middle of a word. */
  short?: string;
  /** A way back, for a surface that is inside another one. */
  back?: { href: string; label: string };
  /** Show the save state. Off for a surface that saves nothing on its own. */
  saved?: boolean;
  /** Buttons on the right, before search. */
  actions?: string;
  /** Rows for the overflow menu, after the places it always carries on a phone. */
  more?: string;
  /**
   * The same actions as menu rows, for a screen too narrow to show them on the bar. On a
   * phone the bar keeps only search and the menu, and these take the actions' place.
   */
  compact?: string;
}

export function topBar(o: TopOptions): string {
  const places = PLACES.map(
    (p) =>
      `<a class="gs-place" href="${p.href}" data-gs="place-${p.place}" title="${p.text}"` +
      `${p.place === o.place ? ' aria-current="page"' : ''}>` +
      `${icon(p.icon)}<span>${p.text}</span></a>`,
  ).join('');

  const back = o.back
    ? `<a class="gs-btn gs-btn-icon gs-back" href="${escapeHtml(o.back.href)}" data-gs="back" ` +
      `aria-label="back to ${escapeHtml(o.back.label)}">${icon('back')}` +
      `<span class="gs-tip" role="presentation">back to ${escapeHtml(o.back.label)}</span></a>`
    : '';

  // The places, repeated in the menu: on a phone the tabs are hidden and this is the only way
  // to them, and on a desktop they are simply there twice.
  const placesInMenu = PLACES.map((p) =>
    item({ gs: `menu-place-${p.place}`, text: p.text, icon: p.icon, href: p.href }),
  ).join('');

  return [
    '<header class="gs-top" data-gs="statusbar">',
    '<div class="gs-mast gs-card">',
    '<a class="gs-brand" href="/" aria-label="grimstroke: the board" data-gs="brand">',
    '<span class="gs-brand-mark" aria-hidden="true">g</span>',
    '<span class="gs-brand-word">grimstroke</span></a>',
    back,
    `<span class="gs-name" data-gs="title" dir="auto" title="${escapeHtml(o.title)}">${
      o.short && o.short !== o.title
        ? `<span class="gs-name-full">${escapeHtml(o.title)}</span>` +
          `<span class="gs-name-short" aria-hidden="true">${escapeHtml(o.short)}</span>`
        : escapeHtml(o.title)
    }</span>`,
    o.saved
      ? '<span class="gs-saved" data-gs="saved" data-state="saved" role="status" aria-live="polite">saved</span>'
      : '',
    '</div>',
    `<nav class="gs-places gs-card" aria-label="places">${places}</nav>`,
    '<div class="gs-acts gs-card">',
    o.actions
      ? `<div class="gs-acts-own${o.compact ? ' gs-wide-only' : ''}">${o.actions}</div>`
      : '',
    '<button type="button" class="gs-btn gs-search-open" data-gs="search-open" ' +
      'aria-label="search everything" aria-keyshortcuts="Control+K /">' +
      `${icon('search')}<span class="gs-btn-text">search</span>${kbd('mod+K')}</button>`,
    menu({
      gs: 'more',
      label: 'more',
      icon: 'more',
      body:
        `<div class="gs-menu-places">${placesInMenu}${RULE}</div>` +
        (o.compact ? `<div class="gs-narrow-only">${o.compact}${RULE}</div>` : '') +
        (o.more ? `${o.more}${RULE}` : '') +
        // Its words are set by app/feel.ts from the sound setting, once the page is up.
        item({ gs: 'sound-toggle', text: 'sounds', icon: 'sound' }) +
        item({ gs: 'help-open', text: 'keyboard shortcuts', icon: 'keys', key: '?' }) +
        item({ gs: 'tour-open', text: 'show the tour again', icon: 'help' }),
    }),
    '</div>',
    '</header>',
  ].join('');
}

/**
 * The search, as a dialog every surface carries.
 *
 * A native <dialog> opened modally: it traps focus, Escape closes it and the page behind
 * cannot be clicked, all without a line of script. The app fills in the results.
 */
export function searchDialog(): string {
  return (
    '<dialog class="gs-dialog gs-search" data-gs="search" aria-label="search">' +
    '<form class="gs-search-bar" method="dialog" role="search">' +
    icon('search') +
    '<input type="search" class="gs-search-input" data-gs="search-input" autocomplete="off" ' +
    'spellcheck="false" dir="auto" placeholder="search boards, notebooks and the archive" ' +
    'aria-label="search" aria-controls="gs-search-results">' +
    `<button type="submit" class="gs-btn gs-btn-icon" aria-label="close">${icon('close')}</button>` +
    '</form>' +
    '<div class="gs-search-results" id="gs-search-results" data-gs="search-results" role="listbox" ' +
    'aria-label="results"></div>' +
    `<p class="gs-dialog-foot">${kbd('↑')}${kbd('↓')} to move · ${kbd('Enter')} to open · ` +
    `${kbd('Esc')} to close</p>` +
    '</dialog>'
  );
}

/** One group of shortcuts in the help sheet. */
function keys(title: string, rows: ReadonlyArray<readonly [string, string]>): string {
  return (
    `<section class="gs-keys"><h3>${escapeHtml(title)}</h3><dl>` +
    rows.map(([k, what]) => `<dt>${kbd(k)}</dt><dd>${escapeHtml(what)}</dd>`).join('') +
    '</dl></section>'
  );
}

/**
 * Every keyboard shortcut, on one sheet.
 *
 * The letters are matched by position as well as by character, so they work on a Persian
 * keyboard layout too -- see app/keys.ts.
 */
export function helpDialog(): string {
  return (
    '<dialog class="gs-dialog gs-help" data-gs="help" aria-label="keyboard shortcuts">' +
    '<header class="gs-dialog-head"><h2>keyboard shortcuts</h2>' +
    `<form method="dialog"><button class="gs-btn gs-btn-icon" aria-label="close">${icon('close')}</button></form></header>` +
    '<div class="gs-keys-grid">' +
    keys('everywhere', [
      ['mod+K', 'search'],
      ['/', 'search, off a board'],
      ['?', 'this sheet'],
      ['mod+Z', 'undo'],
      ['mod+Shift+Z', 'redo'],
    ]) +
    keys('the board', [
      ['/', 'type anything: it becomes a card'],
      ['/ /', 'every kind of card'],
      ['V', 'select'],
      ['H', 'pan'],
      ['N', 'sticky note'],
      ['T', 'text'],
      ['L', 'marker label'],
      ['I', 'picture'],
      ['P', 'pen'],
      ['M', 'marker'],
      ['G', 'highlighter'],
      ['E', 'eraser'],
      ['Delete', 'remove the selection'],
      ['mod+D', 'duplicate'],
      ['mod+G', 'group'],
      ['mod+Shift+G', 'ungroup'],
      ['mod+A', 'select everything'],
      ['0', 'fit everything'],
      ['1', 'actual size'],
      ['←↑→↓', 'nudge; Shift for 10'],
    ]) +
    keys('a selected note', [
      ['Enter', 'write in it'],
      ['D', 'draw on it'],
      ['C', 'next colour'],
      ['S', 'settings'],
      ['L', 'lock'],
      ['M', 'fold away'],
      ['Alt+←↑→↓', 'resize'],
    ]) +
    keys('writing in a note', [
      ['mod+B', 'bold'],
      ['mod+I', 'italic'],
      ['mod+E', 'code'],
      ['mod+K', 'link'],
      ['mod+Shift+X', 'strike through'],
      ['mod+Shift+7', 'numbered list'],
      ['mod+Shift+8', 'bullets'],
      ['mod+Shift+9', 'checklist'],
      ['mod+Shift+1', 'heading'],
      ['mod+Shift+.', 'quote'],
      ['mod+Shift+D', "today's date"],
      ['mod+Enter or Esc', 'done'],
    ]) +
    keys('a notebook', [
      ['→ / ←', 'turn the page'],
      ['Home / End', 'first and last page'],
      ['R', 'the repository drawer, on a page'],
    ]) +
    '</div></dialog>'
  );
}
