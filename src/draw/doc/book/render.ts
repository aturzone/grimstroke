/**
 * A notebook, as HTML. Pure: nothing here opens a browser or touches the
 * network.
 *
 * Three views, and they are three genuinely different objects rather than one
 * drawn at three sizes:
 *
 *   the SPREAD   the book open, two leaves and the binding between them
 *   the COVER    the book closed, seen straight on
 *   the SHELF    the books stood up, in three dimensions, as you would find one
 *
 * The 3D is CSS transforms on real elements, not an image and not a canvas.
 * A book on the shelf is therefore still text -- its title is selectable, its
 * stickers are the stickers, and it stays sharp at any size and in a printed
 * PDF. An image of a book would be none of those things.
 */

import { renderItem } from '~/draw/doc/board/render.ts';
import type { BookSpec, Cover, Leaf, Sticker } from '~/draw/doc/book/model.ts';
import {
  bookTitle,
  boundLeaves,
  LEAF_HEIGHT,
  LEAF_WIDTH,
  spineWidth,
} from '~/draw/doc/book/model.ts';
import { renderHead } from '~/draw/doc/head.ts';
import { upgradeCover, upgradeLeaf } from '~/draw/doc/legacy.ts';
import type { RenderedPage } from '~/draw/doc/model.ts';
import { pagesOf } from '~/draw/doc/shelf/render.ts';
import { type Surface, servedPath, surface } from '~/draw/doc/surface.ts';
import { textOn } from '~/draw/look/colour.ts';
import { ruling } from '~/draw/look/grid.ts';
import { Rng } from '~/draw/look/rng.ts';
import { halftoneDefs } from '~/draw/material/note/render.ts';
import { renderPortrait, renderProfile } from '~/draw/material/profile/render.ts';
import { ARABIC, leafText } from '~/draw/material/read.ts';
import { escapeHtml, inline, label } from '~/draw/type/text.ts';

export interface BookRenderOptions {
  /** Which leaf to open at. The spread shows this one and the next. */
  leaf?: number;
  /**
   * Start shut, showing the cover. A notebook is picked up by its cover and opened, and a
   * notebook that opens straight onto two blank pages has skipped the part that says whose it
   * is and what is in it.
   */
  closed?: boolean;
  live?: { chrome?: string; scripts?: string[] } | undefined;
}

// ---------------------------------------------------------------- cover

/**
 * The cover, as an element.
 *
 * Sized in percentages of itself throughout, so the same markup is a shelf
 * thumbnail and a full-screen cover with nothing recomputed -- which is also
 * why a sticker's position is a percentage and not a pixel.
 */
export function renderCover(spec: BookSpec, ctx: Surface): string {
  // Upgraded here too: a cover written this minute with the old one-card field is drawn with
  // its card as a sticker, the same as one read from disk.
  const cover: Cover = upgradeCover(spec.cover) ?? {};
  const title = cover.title ?? spec.title ?? spec.id;
  const material = cover.material ?? 'card';
  /*
   * The title is written in a colour that can be read on this cover.
   *
   * It was always near-white, which is right on a dark blue cloth and unreadable on the
   * yellow plastic one somebody picks next. Chosen by contrast, the way a chip's lettering
   * is, unless the cover names its own.
   */
  const colour = cover.colour ?? ctx.pal.accent;
  const ink = cover.ink ?? textOn(colour, ['#fbf9f4', '#14110e']);
  const vars = [
    cover.colour ? `--cover:${escapeHtml(cover.colour)}` : '',
    `--cover-ink:${escapeHtml(ink)}`,
  ]
    .filter(Boolean)
    .join(';');
  const stickers = (cover.stickers ?? []).map((s) => renderSticker(s, ctx)).join('');
  const card = cover.stickers?.some((s) => s.kind === 'card') === true;
  return (
    `<div class="cover cover-${material}${card ? ' has-profile' : ''}" style="${vars}">` +
    '<div class="cover-face">' +
    `<div class="cover-title" dir="auto">${inline(title, { digits: ctx.digits })}</div>` +
    stickers +
    '</div>' +
    '</div>'
  );
}

function renderSticker(sticker: Sticker, ctx: Surface): string {
  const style = [
    `left:${sticker.at[0]}%`,
    `top:${sticker.at[1]}%`,
    `--sticker-width:${sticker.width ?? 40}%`,
    sticker.rotation ? `--tilt:${sticker.rotation}deg` : '',
    sticker.colour ? `--sticker:${escapeHtml(sticker.colour)}` : '',
  ]
    .filter(Boolean)
    .join(';');
  const body =
    sticker.kind === 'picture'
      ? `<img src="${escapeHtml(servedPath(sticker.src ?? '', ctx))}" alt="" draggable="false">`
      : sticker.kind === 'portrait'
        ? `<span class="sticker-photo">${renderPortrait(sticker.portrait, '')}</span>`
        : sticker.kind === 'card'
          ? sticker.profile
            ? renderProfile(sticker.profile)
            : ''
          : sticker.kind === 'shape'
            ? `<span class="shape shape-${sticker.shape ?? 'circle'}"></span>`
            : `<span class="sticker-text">${inline(sticker.text ?? '', {
                digits: ctx.digits,
              })}</span>`;
  return (
    `<div class="sticker sticker-${sticker.kind}" data-gs="sticker" ` +
    `data-gs-id="${escapeHtml(sticker.id)}" style="${style}">${body}</div>`
  );
}

// ---------------------------------------------------------------- shelf

/**
 * A book stood up, in three dimensions.
 *
 * Three faces and a real rotation, which is what makes it read as an object you
 * could pick up rather than a rectangle with a gradient on it. The thickness
 * comes from how many leaves the book has, so a full notebook is visibly fatter
 * than a new one -- which is the whole reason to show a shelf rather than a
 * list of names.
 */
export function renderBook3d(spec: BookSpec, ctx: Surface, order = 0): string {
  const depth = spineWidth(spec);
  const cover: Cover = spec.cover ?? {};
  const spine = cover.spine ?? cover.title ?? spec.title ?? spec.id;
  const style = [
    `--spine-depth:${depth}px`,
    `--lean:${shelfLean(spec)}deg`,
    `--i:${order}`,
    cover.colour ? `--cover:${escapeHtml(cover.colour)}` : '',
  ]
    .filter(Boolean)
    .join(';');
  const put = spec.archived
    ? `<span class="shelf-tag">${label('archived', ctx.uppercase)}</span>`
    : '';
  return (
    `<div class="book3d${spec.archived ? ' is-archived' : ''}" data-gs="book" ` +
    `data-gs-id="${escapeHtml(spec.id)}" style="${style}">` +
    '<div class="book3d-stage">' +
    // A box: the back board, the block of paper seen from above, the spine hinged to the
    // front, and the front. Each is a face placed in 3D, so the spine meets the cover at its
    // edge instead of floating beside it.
    '<div class="book3d-back"></div>' +
    '<div class="book3d-top"></div>' +
    `<div class="book3d-spine"><span>${inline(spine, { digits: ctx.digits })}</span></div>` +
    `<div class="book3d-cover">${renderCover(spec, ctx)}</div>` +
    '</div>' +
    '<div class="book3d-shadow" aria-hidden="true"></div>' +
    `<p class="book3d-caption"><b dir="auto">${inline(bookTitle(spec), { digits: ctx.digits })}</b>` +
    `<span>${pagesOf(spec).text}</span>${put}</p>` +
    '</div>'
  );
}

// ---------------------------------------------------------------- spread

/**
 * The book open.
 *
 * Two leaves and the binding between them, which is not decoration: the gutter
 * is why a notebook is not two pages side by side, and losing it is how a
 * spread stops reading as one object.
 *
 * The leaf index is the LEFT leaf. In a right-to-left book the leaves are laid
 * in document order and the page mirrors them, so leaf one lands on the right,
 * which is where that reader expects it.
 */
export function renderSpread(spec: BookSpec, options: BookRenderOptions = {}): RenderedPage {
  const ctx = surface(spec.id, spec);
  const { direction, uppercase } = ctx;
  const leaves = boundLeaves(spec);
  const at = Math.max(0, Math.min(options.leaf ?? 0, Math.max(0, leaves.length - 1)));
  const shown: Array<Leaf | undefined> = [leaves[at], leaves[at + 1]];

  const head = renderHead(ctx, direction, {
    paper: 'blank',
    grain: spec.grain,
    fonts: spec.fonts,
    extra: {
      '--leaf-width': `${LEAF_WIDTH}px`,
      '--leaf-height': `${LEAF_HEIGHT}px`,
      '--spine-depth': `${spineWidth(spec)}px`,
    },
  });

  const body = shown
    .map((leaf, side) => renderLeaf(leaf, at + side, spec, ctx, side === 0 ? 'verso' : 'recto'))
    .join('');

  const script = ARABIC.test(collectText(spec)) ? 'arabic' : 'latin';
  const live = options.live;
  const book =
    halftoneDefs() +
    `<div class="book" data-gs="book" data-gs-id="${escapeHtml(spec.id)}" ` +
    `data-gs-leaf="${at}" data-gs-leaves="${leaves.length}"${options.closed ? ' data-closed' : ''}>` +
    `<div class="book-spread">${body}</div>` +
    '<div class="book-gutter" aria-hidden="true"></div>' +
    (options.closed
      ? '<div class="book-closed" data-gs="closed" role="button" tabindex="0" ' +
        (spec.cover?.colour ? `style="--cover:${escapeHtml(spec.cover.colour)}" ` : '') +
        'aria-label="open the notebook">' +
        `<div class="book-face">${renderCover(spec, ctx)}` +
        '<span class="book-closed-hint">open</span></div>' +
        '<div class="book-inside" aria-hidden="true"></div></div>'
      : '') +
    '</div>';

  const html = [
    '<!doctype html>',
    `<html lang="${escapeHtml(direction === 'rtl' ? 'fa' : 'en')}" dir="${direction}" ` +
      `data-script="${script}" data-uppercase="${uppercase ? 'on' : 'off'}">`,
    head,
    live ? '<body class="on-book live">' : '<body class="on-book">',
    book,
    live?.chrome ?? '',
    ...(live?.scripts ?? []).map(
      (src) => `<script type="module" src="${escapeHtml(src)}"></script>`,
    ),
    '</body>',
    '</html>',
  ].join('\n');

  return {
    id: `${spec.id}-${at}`,
    html: `${html}\n`,
    assets: ctx.assets,
    width: LEAF_WIDTH * 2 + 80,
    selector: '.book',
    warnings: ctx.warnings,
  };
}

/**
 * One leaf, as the app receives it when a page turns.
 *
 * The same function that draws it in a spread. The app fetches leaves rather
 * than building them, because a leaf drawn in the browser would be a second
 * renderer, and a second renderer is a second thing that can disagree with the
 * first about what a sticky note looks like.
 */
export function renderOneLeaf(
  spec: BookSpec,
  index: number,
): { html: string; assets: Record<string, string> } | undefined {
  const leaves = boundLeaves(spec);
  if (index < 0 || index >= leaves.length) return undefined;
  const ctx = surface(spec.id, spec);
  const side = index % 2 === 0 ? 'verso' : 'recto';
  return { html: renderLeaf(leaves[index], index, spec, ctx, side), assets: ctx.assets };
}

function renderLeaf(
  leaf: Leaf | undefined,
  number: number,
  spec: BookSpec,
  ctx: Surface,
  side: 'verso' | 'recto',
): string {
  if (!leaf) return `<div class="leaf leaf-${side} leaf-absent" aria-hidden="true"></div>`;
  const rule = ruling(leaf.paper ?? spec.paper ?? 'ruled', { colour: ctx.pal.ink });
  const style = [
    rule.image ? `--paper-rule:${rule.image}` : '--paper-rule:none',
    `--paper-rule-size:${rule.size || 'auto'}`,
  ].join(';');
  // Placed, as on a board: each item at its own position from the page's corner, drawn by
  // the board's own renderItem, in paint order.
  const items = [...(upgradeLeaf(leaf).items ?? [])]
    .map((item, index) => ({ item, index }))
    .sort((a, b) => (a.item.z ?? 0) - (b.item.z ?? 0) || a.index - b.index)
    .map(({ item }) => renderItem(item, 0, 0, ctx))
    .join('\n');
  // Blank leaves still carry a number. Finding your place in a notebook is the
  // whole reason the numbers are there, and an unwritten page is still a place.
  const folio = `<span class="leaf-folio">${label(String(number + 1), false)}</span>`;
  return (
    `<div class="leaf leaf-${side}" data-gs="leaf" data-gs-id="${escapeHtml(leaf.id)}" ` +
    `data-gs-index="${number}" style="${style}">` +
    `<div class="leaf-items">${items}</div>${folio}</div>`
  );
}

function collectText(spec: BookSpec): string {
  return [
    spec.title ?? '',
    spec.cover?.title ?? '',
    spec.cover?.spine ?? '',
    ...(spec.cover?.stickers ?? []).map((sticker) => sticker.text ?? ''),
    ...spec.leaves.map((leaf) => leafText(leaf).join(' ')),
  ].join(' ');
}

/** A seeded lean, so a book on a shelf is not perfectly upright. */
export function shelfLean(spec: BookSpec): number {
  const rng = new Rng(`${spec.id}:shelf`);
  return Number(((rng.next() < 0.5 ? -1 : 1) * rng.between(0.4, 1.6)).toFixed(2));
}
