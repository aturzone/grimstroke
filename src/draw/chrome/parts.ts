/**
 * The pieces every control on every surface is made of.
 *
 * One way to make a button, one way to make a menu, one way to show a key. Before these
 * existed each surface wrote its own, and the studio's buttons, the notebook's and the
 * board's were three slightly different objects -- different padding, different hover,
 * different focus -- which is exactly the kind of inconsistency that makes a tool feel
 * assembled rather than made.
 *
 * Every control carries a `data-gs` name: the handle the app binds to AND the handle an agent
 * driving a browser finds it by, so there is one name per thing rather than two that drift.
 */

import { type IconName, icon } from '~/draw/chrome/icons.ts';
import { escapeHtml } from '~/draw/type/text.ts';

export interface ButtonOptions {
  /** The data-gs name. */
  gs: string;
  /** What a screen reader says, and the tooltip. */
  label: string;
  icon?: IconName;
  /** Visible words. Without them the button is an icon button. */
  text?: string;
  /** A keyboard shortcut, shown in the tooltip. */
  key?: string;
  pressed?: boolean;
  /** Extra classes. */
  tone?: string;
  /** Extra attributes, already escaped. */
  attrs?: string;
}

/** A key cap. `mod` is shown as Ctrl, which is what most people will press. */
export function kbd(keys: string): string {
  return keys
    .split('+')
    .map((k) => `<kbd class="gs-kbd">${escapeHtml(k === 'mod' ? 'Ctrl' : k)}</kbd>`)
    .join('');
}

export function button(o: ButtonOptions): string {
  const classes = ['gs-btn', o.text ? '' : 'gs-btn-icon', o.tone ?? ''].filter(Boolean).join(' ');
  const pressed = o.pressed === undefined ? '' : ` aria-pressed="${o.pressed}"`;
  // Every button says what it is for when the pointer rests on it: an icon alone never explains
  // itself, and a word on the bar ("decorate") says less than the label ("make the bookcase your
  // own") -- and the word is the first thing a narrow screen takes away.
  const tip = `<span class="gs-tip" role="presentation">${escapeHtml(o.label)}${o.key ? ` ${kbd(o.key)}` : ''}</span>`;
  return (
    `<button type="button" class="${classes}" data-gs="${o.gs}" aria-label="${escapeHtml(o.label)}"` +
    `${pressed}${o.attrs ? ` ${o.attrs}` : ''}>` +
    (o.icon ? icon(o.icon) : '') +
    (o.text ? `<span class="gs-btn-text">${escapeHtml(o.text)}</span>` : '') +
    tip +
    '</button>'
  );
}

export interface ItemOptions {
  gs: string;
  text: string;
  icon?: IconName;
  key?: string;
  /** A link rather than a command. */
  href?: string;
  /** Destructive: said in the accent, and last. */
  danger?: boolean;
}

/** One row of a menu. */
export function item(o: ItemOptions): string {
  const inner =
    (o.icon ? icon(o.icon) : '<span class="gs-icon"></span>') +
    `<span class="gs-item-text">${escapeHtml(o.text)}</span>` +
    (o.key ? `<span class="gs-item-key">${kbd(o.key)}</span>` : '');
  const cls = `gs-item${o.danger ? ' gs-item-danger' : ''}`;
  return o.href
    ? `<a class="${cls}" role="menuitem" data-gs="${o.gs}" href="${escapeHtml(o.href)}">${inner}</a>`
    : `<button type="button" class="${cls}" role="menuitem" data-gs="${o.gs}">${inner}</button>`;
}

/** A thin rule between groups of menu rows. */
export const RULE = '<hr class="gs-rule-line">';

/** A small heading inside a menu. */
export function heading(text: string): string {
  return `<p class="gs-menu-head">${escapeHtml(text)}</p>`;
}

export interface MenuOptions {
  gs: string;
  label: string;
  icon?: IconName;
  text?: string;
  /** Which edge of the button the card hangs from. */
  align?: 'start' | 'end';
  /** Opens upwards, for a menu at the bottom of the screen. */
  up?: boolean;
  body: string;
}

/**
 * A menu: a button and the card it opens.
 *
 * A native <details>, so it opens and closes with no script at all and is keyboard and
 * screen-reader operable for free. The app only adds the conveniences: closing it on a click
 * elsewhere, on Escape, and after a row is chosen.
 */
export function menu(o: MenuOptions): string {
  const classes = ['gs-menu', o.align === 'start' ? 'gs-menu-start' : '', o.up ? 'gs-menu-up' : '']
    .filter(Boolean)
    .join(' ');
  return (
    `<details class="${classes}" data-gs="${o.gs}">` +
    `<summary class="gs-btn${o.text ? '' : ' gs-btn-icon'}" aria-label="${escapeHtml(o.label)}">` +
    (o.icon ? icon(o.icon) : '') +
    (o.text ? `<span class="gs-btn-text">${escapeHtml(o.text)}</span>` : '') +
    `<span class="gs-tip" role="presentation">${escapeHtml(o.label)}</span>` +
    '</summary>' +
    `<div class="gs-menu-card" role="menu">${o.body}</div>` +
    '</details>'
  );
}
