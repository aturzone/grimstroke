/**
 * A board, as HTML. Pure: nothing here opens a browser or touches the network.
 *
 * The board is a plane and the page is a column, but they are made of the same
 * materials -- every item is a `Block`, rendered by the same code that renders
 * it on a page. So a sticky note is the same sticky note, a mounted photograph
 * is mounted the same way, and improving one improves both.
 *
 * Two things are the board's own. Items are POSITIONED, at coordinates that may
 * be negative, because a plane has no corner to measure from. And ink is drawn
 * straight onto the surface as SVG, so a stroke is a path and stays a hairline
 * at any zoom and in a printed PDF -- which is the whole reason the board is
 * DOM and SVG rather than a canvas.
 */

import type { BoardItem, BoardSpec, Ink } from '~/draw/doc/board/model.ts';
import { ITEM_HEIGHT, ITEM_MAX_WIDTH, ITEM_WIDTH } from '~/draw/doc/board/model.ts';
import { renderHead } from '~/draw/doc/head.ts';
import type { RenderedPage } from '~/draw/doc/model.ts';
import { surface } from '~/draw/doc/surface.ts';
import { renderBlock } from '~/draw/material/block.ts';
import { NOTE_COLLAPSED, NOTE_HEIGHT, NOTE_WIDTH } from '~/draw/material/note/model.ts';
import { halftoneDefs } from '~/draw/material/note/render.ts';
import { ARABIC, textOfAll } from '~/draw/material/read.ts';
import { describeGaps, missingGlyphs } from '~/draw/type/coverage.ts';
import { stack } from '~/draw/type/faces.ts';
import { escapeHtml } from '~/draw/type/text.ts';

/** Breathing room around the content, in board units. */
const MARGIN = 72;

/**
 * How much sheet a workspace gets beyond what is already on it.
 *
 * The board is a sheet lying on a desk rather than an infinite plane of paper,
 * so there has to be sheet left to put things on. Panning past the edge shows
 * the desk, which is honest -- the plane is unbounded, the paper is not.
 */
export const WORKSPACE_PAD = 900;

/**
 * The extent a served board should keep, written onto the spec once.
 *
 * It has to be WRITTEN DOWN rather than recomputed. The origin is subtracted
 * from every item's position, and a computed extent moves the moment anything
 * is added outside it -- so an item rendered after an edit was placed against a
 * different origin from the page it was being inserted into, and arrived nine
 * hundred pixels off the screen. One number, stored, used by both.
 */
export function workspaceExtent(spec: BoardSpec): [number, number, number, number] {
  const [x, y, w, h] = extentOf(spec);
  return [x - WORKSPACE_PAD, y - WORKSPACE_PAD, w + WORKSPACE_PAD * 2, h + WORKSPACE_PAD * 2];
}

/**
 * The rectangle to draw.
 *
 * Declared extents win. Otherwise it is computed from the items, using the
 * height each one declares and a generous default for the ones that have never
 * been measured -- too small clips the bottom off a note, too large only leaves
 * empty paper, and those two failures are not equally bad.
 */
export function extentOf(spec: BoardSpec): [number, number, number, number] {
  if (spec.extent) return spec.extent;
  if (spec.items.length === 0) return [0, 0, 960, 640];
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  for (const item of spec.items) {
    const [x, y] = item.at;
    // A note is cut to a size rather than flowed to fit, so its box is known
    // exactly here and does not need the generous estimate the others get.
    const note = item.block?.kind === 'note' ? item.block : undefined;
    const w = note?.collapsed
      ? NOTE_COLLAPSED
      : (item.size?.[0] ?? (note ? NOTE_WIDTH : item.ink ? 0 : ITEM_WIDTH));
    const h = note?.collapsed
      ? NOTE_COLLAPSED
      : (item.size?.[1] ?? (note ? NOTE_HEIGHT : item.ink ? 0 : ITEM_HEIGHT));
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x + w);
    bottom = Math.max(bottom, y + h);
  }
  return [
    Math.round(left - MARGIN),
    Math.round(top - MARGIN),
    Math.round(right - left + MARGIN * 2),
    Math.round(bottom - top + MARGIN * 2),
  ];
}

export interface BoardRenderOptions {
  /**
   * Render for the app rather than for a capture.
   *
   * The board goes inside a viewport it can be panned and zoomed within, and
   * the given markup is appended after it. The board's own HTML is identical
   * either way -- what the app shows and what an export captures are the same
   * element, rendered by the same code, which is the only way "what you see is
   * what you get" can actually be true rather than merely intended.
   */
  live?:
    | {
        chrome?: string;
        scripts?: string[];
      }
    | undefined;
}

export function renderBoard(spec: BoardSpec, options: BoardRenderOptions = {}): RenderedPage {
  const ctx = surface(spec.id, spec);
  const { direction, uppercase } = ctx;
  const [ox, oy, width, height] = extentOf(spec);

  const head = renderHead(ctx, direction, {
    paper: spec.paper ?? 'squared',
    grain: spec.grain,
    fonts: spec.fonts,
    extra: { '--board-width': `${width}px`, '--board-height': `${height}px` },
  });

  // Document order is the tie-break for equal z, so a stable sort keeps a
  // board that was authored top to bottom looking the way it was authored.
  const ordered = [...spec.items]
    .map((item, index) => ({ item, index }))
    .sort((a, b) => (a.item.z ?? 0) - (b.item.z ?? 0) || a.index - b.index);

  const drawn = ordered.map(({ item }) => renderItem(item, ox, oy, ctx)).join('\n');
  checkGlyphs(spec, ctx);

  const script = ARABIC.test(collectText(spec)) ? 'arabic' : 'latin';
  const live = options.live;
  const boardHtml = [
    halftoneDefs(),
    `<div class="board" data-gs="board" data-gs-id="${escapeHtml(spec.id)}" ` +
      `data-gs-origin="${ox},${oy}" data-gs-version="${spec.version ?? 0}">`,
    drawn,
    '</div>',
  ].join('\n');

  const body = live
    ? [
        '<body class="on-board live">',
        '<div class="viewport" data-gs="viewport">',
        // The ruling, drawn in SCREEN space. See the stylesheet: a grid inside the scaled
        // board is resampled by the transform and comes out as plaid.
        '<div class="gs-shadow" data-gs="shadow" aria-hidden="true"></div>',
        '<div class="gs-rule" data-gs="rule" aria-hidden="true"></div>',
        boardHtml,
        '</div>',
        live.chrome ?? '',
        ...(live.scripts ?? []).map(
          (src) => `<script type="module" src="${escapeHtml(src)}"></script>`,
        ),
        '</body>',
      ]
    : ['<body class="on-board">', boardHtml, '</body>'];

  const html = [
    '<!doctype html>',
    `<html lang="${escapeHtml(direction === 'rtl' ? 'fa' : 'en')}" dir="${direction}" ` +
      `data-script="${script}" data-uppercase="${uppercase ? 'on' : 'off'}">`,
    head,
    ...body,
    '</html>',
  ].join('\n');

  return {
    id: spec.id,
    html: `${html}\n`,
    assets: ctx.assets,
    width,
    selector: '.board',
    warnings: ctx.warnings,
    // A note's height is whatever its text turned out to need, and nothing
    // outside a browser knows that.
    autofit: true,
  };
}

/**
 * One item, as the app receives it after an edit.
 *
 * The same function that drew it in the first place. An app that re-rendered
 * changed items with its own code would be a second renderer, and a second
 * renderer is a second thing that can disagree with the first about what a
 * sticky note looks like.
 */
export function renderOneItem(
  spec: BoardSpec,
  id: string,
): { html: string; assets: Record<string, string> } | undefined {
  const item = spec.items.find((candidate) => candidate.id === id);
  if (!item) return undefined;
  const ctx = surface(spec.id, spec);
  const [ox, oy] = extentOf(spec);
  return { html: renderItem(item, ox, oy, ctx), assets: ctx.assets };
}

function renderItem(
  item: BoardItem,
  ox: number,
  oy: number,
  ctx: ReturnType<typeof surface>,
): string {
  const x = item.at[0] - ox;
  const y = item.at[1] - oy;
  const z = item.z ?? 0;
  // Every item carries its own id. The app selects by it, the patch API
  // addresses by it, and an agent driving a browser can find it by it.
  const handle =
    `data-gs="item" data-gs-id="${escapeHtml(item.id)}"` +
    // The rotation goes on a data attribute as well as in the style, because the physics
    // rewrites `transform` wholesale on every frame and would otherwise drop it.
    (item.rotation ? ` data-gs-rotation="${item.rotation}"` : '') +
    (item.locked ? ' data-gs-locked="1"' : '') +
    (item.group ? ` data-gs-group="${escapeHtml(item.group)}"` : '');

  if (item.ink) return renderInk(item, item.ink, x, y, z, handle);

  // A sticky note is the one block whose paper is CUT to a size rather than
  // flowing to fit its text, so the item's box and the note's box have to be
  // the same number or the selection outline stands off the torn edge -- which
  // is exactly what it did: a 260px box around a 240px sheet.
  const note = item.block?.kind === 'note' ? item.block : undefined;
  const collapsed = note?.collapsed === true;
  const size: readonly [number, (number | undefined)?] | undefined = collapsed
    ? [NOTE_COLLAPSED, NOTE_COLLAPSED]
    : note
      ? [item.size?.[0] ?? NOTE_WIDTH, item.size?.[1] ?? NOTE_HEIGHT]
      : item.size;

  const style = [
    `left:${x}px`,
    `top:${y}px`,
    // No declared width means "as wide as it needs to be". A fixed default
    // wrapped every heading onto a second line and then hid that line under
    // whatever was placed next -- a title that silently lost half of itself.
    // A note that wants a column still asks for one.
    size?.[0] === undefined ? 'width:max-content' : `width:${size[0]}px`,
    size?.[0] === undefined ? `max-width:${ITEM_MAX_WIDTH}px` : '',
    size?.[1] === undefined ? '' : `height:${size[1]}px`,
    item.rotation ? `--tilt:${item.rotation}deg` : '',
    `z-index:${z}`,
  ]
    .filter(Boolean)
    .join(';');

  const body = item.block
    ? renderBlock(item.block, ctx, { seed: item.id, ...(size ? { size } : {}) })
    : '';
  return `<div class="item" ${handle} style="${style}">${body}</div>`;
}

/**
 * A stroke.
 *
 * The SVG is a zero-sized box at the item's own origin with `overflow:
 * visible`, so the path data is in board units relative to that origin and
 * moving a stroke never rewrites its geometry. No viewBox: a viewBox would
 * scale the path, and a stroke that changes shape when its bounding box is
 * recomputed is not the stroke that was drawn.
 */
function renderInk(
  item: BoardItem,
  ink: Ink,
  x: number,
  y: number,
  z: number,
  handle: string,
): string {
  const tool = ink.tool ?? 'pen';
  const classes = ['stroke', `tool-${tool}`, ink.fill ? 'fill' : 'line'];
  const style = [
    `left:${x}px`,
    `top:${y}px`,
    `z-index:${z}`,
    item.rotation ? `--tilt:${item.rotation}deg` : '',
    ink.colour ? `--stroke:${escapeHtml(ink.colour)}` : '',
    ink.weight ? `--stroke-weight:${ink.weight}px` : '',
  ]
    .filter(Boolean)
    .join(';');
  return (
    `<svg class="${classes.join(' ')}" ${handle} style="${style}" aria-hidden="true">` +
    `<path d="${escapeHtml(ink.d)}"/></svg>`
  );
}

function collectText(spec: BoardSpec): string {
  const blocks = spec.items.flatMap((item) => (item.block ? [item.block] : []));
  return [spec.title ?? '', textOfAll(blocks)].join(' ');
}

function checkGlyphs(spec: BoardSpec, ctx: ReturnType<typeof surface>): void {
  const fonts = spec.fonts ?? {};
  const families = [
    ...new Set([
      ...stack('body', fonts, ctx.direction),
      ...stack('hand', fonts, ctx.direction),
      ...stack('marker', fonts, ctx.direction),
    ]),
  ];
  try {
    const gaps = missingGlyphs(collectText(spec), families);
    if (gaps.length > 0) ctx.warnings.push(describeGaps(gaps, families));
  } catch (error) {
    ctx.warnings.push(`glyph check skipped: ${error instanceof Error ? error.message : error}`);
  }
}
