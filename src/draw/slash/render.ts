/**
 * The / board: every card the / box ever made, wherever it was put, on one page.
 *
 * The box is the way in to grimstroke, and this is the place where what it made is looked
 * after: open things first and done things folded away below, a chip for each kind there is,
 * and on every card the way to change it (its own pencil), send it somewhere else, see where it
 * lives, or let it go. The cards are the same faces the board draws, so a tick here is a tick there.
 */

import { icon } from '~/draw/chrome/icons.ts';
import { helpDialog, searchDialog, topBar } from '~/draw/chrome/top.ts';
import { renderHead } from '~/draw/doc/head.ts';
import type { RenderedPage } from '~/draw/doc/model.ts';
import { surface } from '~/draw/doc/surface.ts';
import { INTENTS, type ShapeIntent } from '~/draw/shape/intents.ts';
import { renderShape, type ShapeBlock, summarize } from '~/draw/shape/render.ts';
import { escapeHtml } from '~/draw/type/text.ts';

const esc = escapeHtml;

/** One card, and where it lives. */
export interface SlashEntry {
  /** The board, or the page of a notebook (book:<id>:<page>), the card is on. */
  address: string;
  id: string;
  block: ShapeBlock;
  where: { title: string; href: string };
}

/** The key a card is found by on this page: its address and its id. */
export const slashKey = (e: Pick<SlashEntry, 'address' | 'id'>): string => `${e.address}|${e.id}`;

/** Done is a thing marked done, or a list with every line ticked. */
export function isDone(block: ShapeBlock): boolean {
  if (block.state?.closed) return true;
  if (block.intent !== 'todo') return false;
  const lines = block.text.split('\n').filter((l) => l.trim()).length;
  return lines > 0 && (block.state?.done?.length ?? 0) >= lines;
}

function card(e: SlashEntry, now: Date): string {
  const key = slashKey(e);
  const kind = INTENTS[e.block.intent];
  const words = `${e.block.text} ${summarize(e.block, now)} ${kind.label} ${kind.fa} ${e.where.title}`;
  return (
    `<li class="sl-item" data-gs="item" data-gs-id="${esc(key)}" data-sl-kind="${e.block.intent}" ` +
    `data-sl-words="${esc(words.toLowerCase())}">` +
    renderShape(e.block, { interactive: true, id: key, now }) +
    '<div class="sl-foot">' +
    `<a class="sl-where" href="${esc(e.where.href)}" title="where it lives">${icon('board')}<span>${esc(e.where.title)}</span></a>` +
    `<button type="button" class="gs-btn gs-btn-icon" data-sl="move" aria-label="send it somewhere else">${icon('send')}</button>` +
    `<button type="button" class="gs-btn gs-btn-icon" data-sl="delete" aria-label="let it go">${icon('trash')}</button>` +
    '</div></li>'
  );
}

/** Newest first: what was just typed is what is being looked for. */
const newest = (a: SlashEntry, b: SlashEntry): number =>
  (b.block.made ?? '').localeCompare(a.block.made ?? '');

export function renderSlashMain(entries: SlashEntry[], now: Date): string {
  const open = entries.filter((e) => !isDone(e.block)).sort(newest);
  const done = entries.filter((e) => isDone(e.block)).sort(newest);
  const kinds = [...new Set(entries.map((e) => e.block.intent))] as ShapeIntent[];
  const counts = (k: ShapeIntent): number => entries.filter((e) => e.block.intent === k).length;
  const chips =
    `<button type="button" class="gs-btn gs-chip-btn" data-sl-filter="" aria-pressed="true">all <b>${entries.length}</b></button>` +
    kinds
      .map(
        (k) =>
          `<button type="button" class="gs-btn gs-chip-btn" data-sl-filter="${k}" aria-pressed="false">` +
          `${esc(INTENTS[k].label.toLowerCase())} <b>${counts(k)}</b></button>`,
      )
      .join('');
  // The blocks, for the box to edit them with: our own data, escaped for a script element.
  const data = JSON.stringify(
    Object.fromEntries(entries.map((e) => [slashKey(e), e.block])),
  ).replace(/</g, '\\u003c');
  return (
    '<section class="sl-type">' +
    `<button type="button" class="sl-box" data-gs="shape-open">${icon('shape')}` +
    '<span>type anything: a plan, a list, a timer, a sum…</span><kbd class="gs-kbd">/</kbd></button>' +
    '</section>' +
    (entries.length
      ? '<section class="sl-tools">' +
        '<input class="gs-field sl-find" type="search" dir="auto" data-sl="find" placeholder="find a card" aria-label="find a card">' +
        `<div class="sl-chips" role="group" aria-label="kinds">${chips}</div></section>` +
        `<ul class="sl-list" data-sl="open" aria-label="open">${open.map((e) => card(e, now)).join('')}</ul>` +
        (done.length
          ? `<details class="sl-done"><summary class="td-head">done · ${done.length}</summary>` +
            `<ul class="sl-list" aria-label="done">${done.map((e) => card(e, now)).join('')}</ul></details>`
          : '') +
        '<p class="sl-none" hidden>nothing matches</p>'
      : '<section class="gs-card sl-empty"><h2 class="td-head">nothing yet</h2>' +
        '<p>Everything typed into the / box gathers here, wherever it was put: ' +
        '“dinner friday 8pm”, “milk, eggs, bread”, “25 min focus”, “gym mon wed fri”.</p></section>') +
    `<script type="application/json" data-sl="blocks">${data}</script>`
  );
}

export interface SlashPageOptions {
  live?: { scripts?: string[] } | undefined;
  palette?: string | undefined;
}

export function renderSlashPage(main: string, options: SlashPageOptions = {}): RenderedPage {
  const ctx = surface('slash', { palette: options.palette ?? 'studio' });
  const head = renderHead(ctx, 'ltr', { paper: 'blank', grain: 0.7 });
  const html = [
    '<!doctype html>',
    '<html lang="en" dir="ltr" data-script="latin">',
    head,
    '<body class="is-live on-today on-slash">',
    topBar({ place: 'slash', title: 'everything made with /', short: 'made with /', saved: false }),
    `<main class="td-page sl-page" data-gs="slash">${main}</main>`,
    searchDialog(),
    helpDialog(),
    ...(options.live?.scripts ?? []).map(
      (src) => `<script type="module" src="${escapeHtml(src)}"></script>`,
    ),
    '</body>',
    '</html>',
  ].join('\n');
  return {
    id: 'slash',
    html: `${html}\n`,
    assets: ctx.assets,
    width: 560,
    selector: '.sl-page',
    warnings: ctx.warnings,
  };
}
