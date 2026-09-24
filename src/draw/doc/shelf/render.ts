/**
 * The bookcase: the notebooks, spine out, on wooden shelves.
 *
 * A real piece of furniture -- side walls, a back, planks with depth, a top and a plinth -- and
 * the books standing on it, touching, leaning, or lying flat where they were put down with
 * nothing to hold them up. The positions come from model.ts; this only draws them.
 */

import { type BookSpec, bookTitle, type Cover } from '~/draw/doc/book/model.ts';
import { renderHead } from '~/draw/doc/head.ts';
import type { RenderedPage } from '~/draw/doc/model.ts';
import {
  layOut,
  type PlacedBook,
  type PlacedRow,
  SHELF_CLEAR,
  SHELF_WIDTH,
  type ShelfLayout,
  settle,
} from '~/draw/doc/shelf/model.ts';
import { type Surface, surface } from '~/draw/doc/surface.ts';
import { textOn } from '~/draw/look/colour.ts';
import { halftoneDefs } from '~/draw/material/note/render.ts';
import { escapeHtml, inline, label } from '~/draw/type/text.ts';

export interface ShelfOptions {
  /** How wide a shelf is, in the bookcase's pixels. Narrower on a phone. */
  width?: number;
  id?: string;
  /** The saved order of the shelves. Left out, the notebooks go on in their own order. */
  layout?: ShelfLayout;
  /** When each notebook was last written, as the host knows it (ISO dates). */
  edited?: Readonly<Record<string, string>>;
  /** How many notebooks are in the trash, for the way to it. */
  trash?: number;
  live?: { chrome?: string; scripts?: string[] } | undefined;
}

/** How much is written in it: the pages with something on them, out of how many. */
export function pagesOf(spec: BookSpec): { written: number; total: number; text: string } {
  const written = spec.leaves.filter(
    (leaf) => (leaf.items?.length ?? 0) + (leaf.blocks?.length ?? 0) > 0,
  ).length;
  const total = Math.max(spec.leaves.length, spec.minLeaves ?? 0);
  return {
    written,
    total,
    text: written === 0 ? `${total} blank pages` : `${written} of ${total} pages written`,
  };
}

/** Whose it is: the name on the card on its cover, if it carries one. */
function whoseOf(spec: BookSpec): string | undefined {
  const card = spec.cover?.stickers?.find((s) => s.kind === 'card');
  return card?.profile?.name || spec.cover?.profile?.name || undefined;
}

/** One notebook, as its spine: standing, leaning, or lying flat. */
function renderSpine(
  spec: BookSpec,
  place: PlacedBook,
  ctx: Surface,
  meta: { edited?: string | undefined; live: boolean },
): string {
  const cover: Cover = spec.cover ?? {};
  const colour = cover.colour ?? ctx.pal.accent;
  const ink = cover.ink ?? textOn(colour, ['#fbf9f4', '#14110e']);
  const words = cover.spine ?? cover.title ?? spec.title ?? spec.id;
  const pages = pagesOf(spec);
  const whose = whoseOf(spec);
  const style = [
    `--x:${place.x}px`,
    `--y:${place.y}px`,
    `--w:${place.w}px`,
    `--h:${place.h}px`,
    place.lean ? `--lean:${place.lean}deg` : '',
    `--cover:${escapeHtml(colour)}`,
    `--cover-ink:${escapeHtml(ink)}`,
  ]
    .filter(Boolean)
    .join(';');
  const tag = meta.live ? 'button' : 'div';
  const data = [
    `data-gs="book" data-gs-id="${escapeHtml(spec.id)}"`,
    `data-title="${escapeHtml(bookTitle(spec))}"`,
    `data-pages="${escapeHtml(pages.text)}"`,
    meta.edited ? `data-edited="${escapeHtml(meta.edited)}"` : '',
    whose ? `data-whose="${escapeHtml(whose)}"` : '',
    spec.archived ? 'data-archived' : '',
    place.flat ? 'data-flat' : '',
    place.lean ? 'data-leaning' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const cardMark = whose ? '<span class="spine-owner" aria-hidden="true"></span>' : '';
  return (
    `<${tag}${meta.live ? ' type="button"' : ''} class="spine spine-${cover.material ?? 'card'}" ${data} ` +
    `style="${style}" aria-label="${escapeHtml(bookTitle(spec))}, ${escapeHtml(pages.text)}">` +
    '<span class="spine-face">' +
    '<span class="spine-band" aria-hidden="true"></span>' +
    `<span class="spine-title" dir="auto">${inline(words, { digits: ctx.digits })}</span>` +
    cardMark +
    '<span class="spine-band" aria-hidden="true"></span>' +
    '</span>' +
    `</${tag}>`
  );
}

function renderRow(
  row: PlacedRow,
  index: number,
  books: ReadonlyMap<string, BookSpec>,
  ctx: Surface,
  options: ShelfOptions,
  kind: 'use' | 'archive',
): string {
  const spines = row.books
    .map((place) => {
      const spec = books.get(place.id);
      return spec
        ? renderSpine(spec, place, ctx, {
            edited: options.edited?.[spec.id],
            live: Boolean(options.live),
          })
        : '';
    })
    .join('');
  return (
    `<section class="case-shelf" data-gs="shelf" data-shelf="${kind}" data-row="${index}">` +
    `<div class="case-space">${spines}</div>` +
    '<div class="case-plank" aria-hidden="true"><span class="case-plank-top"></span></div>' +
    '</section>'
  );
}

/** The room: the bookcase of notebooks in use, and the archive's below it. */
function renderRoom(books: readonly BookSpec[], ctx: Surface, options: ShelfOptions): string {
  const open = books.filter((b) => !b.archived);
  const put = books.filter((b) => b.archived);
  const byId = new Map(books.map((b) => [b.id, b]));
  const width = Math.max(280, Math.min(SHELF_WIDTH, Math.round(options.width ?? SHELF_WIDTH)));
  const rows = layOut(settle(options.layout ?? { rows: [] }, open), open, 3, width);
  const archive = layOut([put.map((b) => ({ id: b.id }))], put, 1, width).filter(
    (row, i) => i === 0 || row.books.length > 0,
  );
  const vars = `--shelf-width:${width}px;--shelf-clear:${SHELF_CLEAR}px`;
  const bookcase = (kind: 'use' | 'archive', list: PlacedRow[], name: string): string =>
    `<div class="bookcase bookcase-${kind}" data-gs="bookcase" data-case="${kind}" style="${vars}">` +
    `<h2 class="case-name"><span>${label(name, ctx.uppercase)}</span></h2>` +
    '<div class="case-top" aria-hidden="true"></div>' +
    `<div class="case-body">${list.map((row, i) => renderRow(row, i, byId, ctx, options, kind)).join('')}</div>` +
    '<div class="case-plinth" aria-hidden="true"></div>' +
    '</div>';
  return (
    '<div class="case-room" data-gs="room">' +
    bookcase('use', rows, 'in use') +
    (put.length || options.live ? bookcase('archive', archive, 'archive') : '') +
    '</div>'
  );
}

function shelfSurface(books: readonly BookSpec[], options: ShelfOptions): Surface {
  return surface(options.id ?? 'shelf', { palette: books[0]?.palette ?? 'studio' });
}

/** The whole bookcase: the notebooks in use, then the archive, then the way to the trash. */
export function renderShelf(books: readonly BookSpec[], options: ShelfOptions = {}): RenderedPage {
  const ctx = shelfSurface(books, options);
  const head = renderHead(ctx, 'ltr', { paper: 'blank', grain: 0.7 });
  const live = options.live;
  const empty =
    books.length === 0
      ? '<div class="shelf-empty"><p class="shelf-empty-title">an empty bookcase</p>' +
        '<p>A notebook is a sequence you turn through: findings in order, a log, a diary of a ' +
        'bug. Make one, or let an agent make one over the API.</p></div>'
      : '';
  const trash = live
    ? `<button type="button" class="case-trash" data-gs="trash-open"${options.trash ? '' : ' hidden'}>` +
      `${label('trash', ctx.uppercase)} · <span data-gs="trash-count">${options.trash ?? 0}</span></button>`
    : '';

  const html = [
    '<!doctype html>',
    '<html lang="en" dir="ltr" data-script="latin" data-uppercase="on">',
    head,
    live ? '<body class="on-shelf is-live">' : '<body class="on-shelf">',
    halftoneDefs(),
    '<div class="shelves" data-gs="shelves">',
    empty,
    renderRoom(books, ctx, options),
    trash,
    '</div>',
    live?.chrome ?? '',
    ...(live?.scripts ?? []).map(
      (src) => `<script type="module" src="${escapeHtml(src)}"></script>`,
    ),
    '</body>',
    '</html>',
  ].join('\n');

  return {
    id: ctx.id,
    html: `${html}\n`,
    assets: ctx.assets,
    width: 1200,
    selector: '.shelves',
    warnings: ctx.warnings,
    autofit: true,
  };
}

/** Only the room, for the app to lay in after a book has been moved -- drawn here, as all is. */
export function renderCases(books: readonly BookSpec[], options: ShelfOptions = {}): string {
  return renderRoom(books, shelfSurface(books, options), { ...options, live: options.live ?? {} });
}
