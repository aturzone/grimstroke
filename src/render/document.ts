/**
 * A page, as HTML. Pure: nothing here opens a browser or touches the network.
 *
 * That purity is the design. A snapshot of this output is readable text, so a
 * regression shows up as `padding-inline-start: 18px -> 20px` rather than as a
 * red blob, and an agent that already has a browser of its own can take the HTML
 * and screenshot it without this library ever launching anything.
 */

import { tapeStrip, tornClipPath } from '~/art/paper.ts';
import { resolve, toStyle } from '~/render/coords.ts';
import { describeGaps, missingGlyphs } from '~/render/coverage.ts';
import { STYLESHEET } from '~/render/css.ts';
import { DEFAULT_BODY, DEFAULT_MONO, FACES, facePath } from '~/render/fonts.ts';
import { imageSize } from '~/render/probe.ts';
import { escapeHtml, inline, label } from '~/text/inline.ts';
import { contrast, DEFAULT_PALETTE, type Palette, palette, textOn } from '~/theme/palette.ts';
import type { Block, ImageSource, Mark, PageSpec, RenderedPage, ZoomSpec } from '~/types.ts';

const ARABIC = /[\u0600-\u06ff\u0750-\u077f\ufb50-\ufdff\ufe70-\ufeff]/;

interface Ctx {
  page: PageSpec;
  pal: Palette;
  digits: string | undefined;
  uppercase: boolean;
  assets: Record<string, string>;
  warnings: string[];
  seq: number;
}

export function renderPage(spec: PageSpec): RenderedPage {
  const pal = palette(spec.palette ?? DEFAULT_PALETTE);
  const direction = spec.direction ?? 'ltr';
  const uppercase = spec.uppercaseLabels ?? direction === 'ltr';
  const ctx: Ctx = {
    page: spec,
    pal,
    digits: spec.digits,
    uppercase,
    assets: {},
    warnings: [],
    seq: 0,
  };

  const body = spec.blocks.map((block) => renderBlock(block, ctx)).join('\n');
  const head = renderHead(spec, ctx, direction);
  const band = renderBand(spec, ctx);
  const tape = tapeStrip(spec.id);

  checkGlyphs(spec, ctx);

  const script = ARABIC.test(collectText(spec)) ? 'arabic' : 'latin';
  const html = [
    '<!doctype html>',
    `<html lang="${escapeHtml(direction === 'rtl' ? 'fa' : 'en')}" dir="${direction}" ` +
      `data-script="${script}" data-uppercase="${uppercase ? 'on' : 'off'}">`,
    head,
    '<body>',
    '<div class="mount">',
    '<div class="shadow"></div>',
    '<div class="sheet">',
    `<div class="tape" style="width:${tape.width}px;height:${tape.height}px;` +
      `inset-block-start:-8px;inset-inline-start:26px;` +
      `transform:rotate(${tape.rotation.toFixed(1)}deg);clip-path:${tape.clipPath}"></div>`,
    band,
    body,
    '</div>',
    '</div>',
    '</body>',
    '</html>',
  ].join('\n');

  return {
    id: spec.id,
    html: `${html}\n`,
    assets: ctx.assets,
    width: spec.width ?? 1080,
    selector: '.mount',
    warnings: ctx.warnings,
  };
}

// ---------------------------------------------------------------- head

function renderHead(spec: PageSpec, ctx: Ctx, direction: string): string {
  const pal = ctx.pal;
  const bodyFont = spec.fonts?.body ?? (direction === 'rtl' ? 'Estedad' : DEFAULT_BODY);
  const monoFont = spec.fonts?.mono ?? DEFAULT_MONO;
  const width = spec.width ?? 1080;

  const faces: string[] = [];
  for (const face of FACES) {
    const served = `f/${face.file}`;
    try {
      ctx.assets[served] = facePath(face);
    } catch (error) {
      ctx.warnings.push(String(error instanceof Error ? error.message : error));
      continue;
    }
    faces.push(
      `@font-face{font-family:'${face.family}';font-weight:${face.weight};` +
        `font-style:normal;src:url('${served}') format('truetype');}`,
    );
  }

  const dots = pal.dark
    ? 'radial-gradient(var(--paper) 0.8px, transparent 0.9px)'
    : 'radial-gradient(var(--ink) 0.8px, transparent 0.9px)';

  const vars: Record<string, string> = {
    '--paper': pal.paper,
    '--ink': pal.ink,
    '--accent': pal.accent,
    '--chip-text': textOn(pal.accent, [pal.paper, pal.ink]),
    // Derived shades are color-mix in oklab and resolved by the browser. Naive
    // RGB darkening turns these saturated inks to mud.
    '--edge': 'color-mix(in oklab, var(--ink) 88%, var(--paper))',
    '--shade': 'color-mix(in oklab, var(--paper) 88%, var(--ink))',
    '--rule': 'color-mix(in oklab, var(--ink) 30%, transparent)',
    '--page-width': `${width}px`,
    '--page-padding': '22px 24px 26px',
    '--body-font': `'${bodyFont}', '${monoFont}', sans-serif`,
    '--mono-font': `'${monoFont}', monospace`,
    '--body-size': '15px',
    '--body-leading': '1.5',
    '--title-size': '22px',
    '--chip-size': '17px',
    '--label-size': '11px',
    '--label-tracking': '0.12em',
    '--keyline': '2.5px',
    '--shadow-x': '7px',
    '--shadow-y': '8px',
    '--shadow-opacity': '0.85',
    '--halftone': dots,
    '--halftone-period': '5px',
    '--halftone-opacity': '0.16',
    '--halftone-blend': pal.dark ? 'screen' : 'multiply',
    '--image-max-height': `${spec.imageMaxHeight ?? 1400}px`,
    // The polygon is in percentage space and stretches with the sheet, so it is
    // generated against a nominal page rather than a square.
    '--torn': tornClipPath(width, Math.round(width * 1.4), spec.id),
  };
  const root = `:root{${Object.entries(vars)
    .map(([k, v]) => `${k}:${v};`)
    .join('')}}`;

  return [
    '<head>',
    '<meta charset="utf-8">',
    '<style>',
    faces.join('\n'),
    root,
    STYLESHEET,
    '</style>',
    '</head>',
  ].join('\n');
}

function renderBand(spec: PageSpec, ctx: Ctx): string {
  if (!spec.title && !spec.chips?.length && !spec.trail?.length) return '';
  const chips = spec.chips ?? [];
  const lead = chips[0];
  const rest = chips.slice(1);
  const parts: string[] = ['<header class="band">'];
  if (lead) parts.push(chip(lead, ctx));
  parts.push(`<h1 class="title">${inline(spec.title ?? '', { digits: ctx.digits })}</h1>`);
  for (const c of rest) parts.push(chip(c, ctx));
  parts.push('</header>');
  if (spec.trail?.length) {
    const sep = '<span class="sep">&rsaquo;</span>';
    parts.push(
      `<p class="trail">${spec.trail
        .map((segment) => inline(segment, { digits: ctx.digits }))
        .join(sep)}</p>`,
    );
  }
  return parts.join('');
}

function chip(c: { text: string; colour?: string }, ctx: Ctx): string {
  const style = c.colour
    ? ` style="--chip-bg:${escapeHtml(c.colour)};--chip-fg:${escapeHtml(
        textOn(c.colour, [ctx.pal.paper, ctx.pal.ink]),
      )}"`
    : '';
  return `<span class="chip"${style}>${label(c.text, ctx.uppercase)}</span>`;
}

// ---------------------------------------------------------------- blocks

/**
 * Per-block base direction.
 *
 * A page has one direction, but the text on it may not. An English sentence in a
 * right-to-left page gets its full stop moved to the far end, because the
 * paragraph's base direction decides where trailing punctuation lands. `auto`
 * takes the direction from the first strong character in the block, and an
 * isolated technical run is skipped when working that out -- so a Persian
 * sentence beginning with a hex colour still reads as Persian.
 */
const AUTO = ' dir="auto"';

function renderBlock(block: Block, ctx: Ctx): string {
  const d = { digits: ctx.digits };
  switch (block.kind) {
    case 'heading':
      return block.level === 2
        ? `<h3 class="block"${AUTO}>${inline(block.text, d)}</h3>`
        : `<h2 class="block"${AUTO}>${inline(block.text, d)}</h2>`;
    case 'text':
      return `<p class="block"${AUTO}>${inline(block.text, d)}</p>`;
    case 'bullets':
      return `<ul class="block">${block.items
        .map((item) => `<li${AUTO}>${inline(item, d)}</li>`)
        .join('')}</ul>`;
    case 'table':
      return renderTable(block.rows, block.head ?? true, ctx);
    case 'code':
      return (
        `<pre class="block">` +
        (block.label ? `<span class="pre-label">${label(block.label, ctx.uppercase)}</span>` : '') +
        escapeHtml(block.text) +
        '</pre>'
      );
    case 'quote':
      return (
        `<blockquote class="block"${AUTO}>${inline(block.text, d)}` +
        (block.cite ? `<span class="cite">${inline(block.cite, d)}</span>` : '') +
        '</blockquote>'
      );
    case 'image':
      return `<figure class="block"><div class="plates">${plate(block.image, ctx, block.zoom)}</div></figure>`;
    case 'compare':
      return renderCompare(block.images, block.syncMarks ?? true, ctx);
    case 'note':
      return renderSticky(block, ctx);
    case 'divider':
      return '<hr class="block">';
    case 'spacer':
      return `<div class="block" style="height:${block.size ?? 12}px"></div>`;
  }
}

function renderTable(rows: string[][], head: boolean, ctx: Ctx): string {
  const d = { digits: ctx.digits };
  const body = head ? rows.slice(1) : rows;
  const parts = ['<table class="block">'];
  if (head && rows[0]) {
    parts.push(
      `<thead><tr>${rows[0].map((c) => `<th${AUTO}>${inline(c, d)}</th>`).join('')}</tr></thead>`,
    );
  }
  parts.push('<tbody>');
  for (const row of body) {
    parts.push(`<tr>${row.map((c) => `<td${AUTO}>${inline(c, d)}</td>`).join('')}</tr>`);
  }
  parts.push('</tbody></table>');
  return parts.join('');
}

function renderCompare(images: ImageSource[], sync: boolean, ctx: Ctx): string {
  const shared = sync ? (images[0]?.marks ?? []) : [];
  const cells = images
    .map((image, index) =>
      plate(
        sync && index > 0 && !image.marks?.length ? { ...image, marks: shared } : image,
        ctx,
        undefined,
      ),
    )
    .join('');
  // Plates are listed in logical order -- the reference first -- and laid in
  // document order, so in a right-to-left page the first lands on the right,
  // which is where that reader expects it.
  return `<figure class="block"><div class="plates">${cells}</div></figure>`;
}

function plate(image: ImageSource, ctx: Ctx, zoom: ZoomSpec | undefined): string {
  ctx.seq += 1;
  const served = servedPath(image.src, ctx);
  let size: { width: number; height: number } | undefined;
  try {
    size = imageSize(image.src);
  } catch (error) {
    ctx.warnings.push(
      `could not read ${image.src}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const marks: string[] = [];
  const notes: string[] = [];
  let noteIndex = 0;
  for (const mark of image.marks ?? []) {
    try {
      marks.push(renderMark(mark, size, image.dpr, ctx));
      if (mark.note) {
        noteIndex += 1;
        const tag = mark.badge ?? String(noteIndex);
        notes.push(
          `<div class="callout-note"${AUTO}><b>${escapeHtml(tag)}</b> ` +
            `${inline(mark.note, { digits: ctx.digits })}</div>`,
        );
      }
    } catch (error) {
      ctx.warnings.push(error instanceof Error ? error.message : String(error));
    }
  }

  const caption = image.caption
    ? `<figcaption${AUTO}>${inline(image.caption, { digits: ctx.digits })}</figcaption>`
    : '';
  const zoomHtml = zoom && size ? renderZoom(zoom, served, size, image.dpr, ctx) : '';

  return (
    `<div class="cell">${caption}` +
    `<div class="plate"><img src="${escapeHtml(served)}" alt="">${marks.join('')}</div>` +
    zoomHtml +
    notes.join('') +
    '</div>'
  );
}

function renderMark(
  mark: Mark,
  size: { width: number; height: number } | undefined,
  dpr: number | undefined,
  ctx: Ctx,
): string {
  const source = size ? { ...size, ...(dpr === undefined ? {} : { dpr }) } : undefined;
  const rect = resolve(mark.rect, source);
  const kind = mark.kind ?? 'box';
  const classes = ['mark', kind === 'callout' ? 'box' : kind];
  if (kind === 'redact' && mark.style) classes.push(mark.style);
  const inner =
    kind === 'redact'
      ? `<span>${label('redacted', ctx.uppercase)}</span>`
      : mark.badge
        ? `<span class="badge">${escapeHtml(mark.badge)}</span>`
        : '';
  return `<div class="${classes.join(' ')}" style="${toStyle(rect)}">${inner}</div>`;
}

function renderZoom(
  zoom: ZoomSpec,
  served: string,
  size: { width: number; height: number },
  dpr: number | undefined,
  ctx: Ctx,
): string {
  let rect: ReturnType<typeof resolve>;
  try {
    rect = resolve(zoom.rect, { ...size, ...(dpr === undefined ? {} : { dpr }) });
  } catch (error) {
    ctx.warnings.push(error instanceof Error ? error.message : String(error));
    return '';
  }
  const regionW = (rect.w / 100) * size.width;
  const regionH = (rect.h / 100) * size.height;
  // The factor is honoured directly: the window is the region's own size times
  // the factor, capped so it cannot dominate the page.
  let factor = Math.max(1, zoom.factor ?? 3);
  const maxWidth = 320;
  if (regionW * factor > maxWidth) factor = maxWidth / regionW;
  const shownW = size.width * factor;
  const left = -((rect.x / 100) * size.width * factor);
  const top = -((rect.y / 100) * size.height * factor);
  return (
    `<div class="zoom" style="width:${(regionW * factor).toFixed(0)}px;` +
    `height:${(regionH * factor).toFixed(0)}px">` +
    `<img src="${escapeHtml(served)}" alt="" style="width:${shownW.toFixed(0)}px;` +
    `left:${left.toFixed(0)}px;top:${top.toFixed(0)}px"></div>`
  );
}

function renderSticky(block: { text: string; title?: string; palette?: string }, ctx: Ctx): string {
  const notePal = block.palette ? palette(block.palette) : ctx.pal;
  ctx.seq += 1;
  const seed = `${ctx.page.id}:note:${ctx.seq}`;
  const torn = tornClipPath(420, 200, seed, { amplitude: 5, step: 18, nicks: 2, pin: 16 });
  const style =
    `--note-paper:${notePal.paper};--note-ink:${notePal.ink};` +
    `--note-accent:${notePal.accent};--note-torn:${torn}`;
  const title = block.title ? `<h4>${label(block.title, ctx.uppercase)}</h4>` : '';
  return `<aside class="sticky block"${AUTO} style="${style}">${title}${inline(block.text, {
    digits: ctx.digits,
  })}</aside>`;
}

// ---------------------------------------------------------------- support

function servedPath(src: string, ctx: Ctx): string {
  if (src.startsWith('data:')) return src;
  const existing = Object.entries(ctx.assets).find(([, value]) => value === src);
  if (existing) return existing[0];
  const extension = src.slice(src.lastIndexOf('.')).toLowerCase() || '.png';
  const served = `a/${Object.keys(ctx.assets).length}${extension}`;
  ctx.assets[served] = src;
  return served;
}

function collectText(spec: PageSpec): string {
  const parts: string[] = [
    spec.title ?? '',
    ...(spec.trail ?? []),
    ...(spec.chips ?? []).map((c) => c.text),
  ];
  for (const block of spec.blocks) {
    switch (block.kind) {
      case 'heading':
      case 'text':
      case 'quote':
        parts.push(block.text);
        break;
      case 'note':
        parts.push(block.text, block.title ?? '');
        break;
      case 'bullets':
        parts.push(...block.items);
        break;
      case 'table':
        for (const row of block.rows) parts.push(...row);
        break;
      case 'code':
        parts.push(block.label ?? '');
        break;
      case 'image':
        parts.push(
          block.image.caption ?? '',
          ...(block.image.marks ?? []).map((m) => m.note ?? ''),
        );
        break;
      case 'compare':
        for (const image of block.images) parts.push(image.caption ?? '');
        break;
      default:
        break;
    }
  }
  return parts.join(' ');
}

function checkGlyphs(spec: PageSpec, ctx: Ctx): void {
  const direction = spec.direction ?? 'ltr';
  const families = [
    spec.fonts?.body ?? (direction === 'rtl' ? 'Estedad' : DEFAULT_BODY),
    spec.fonts?.mono ?? DEFAULT_MONO,
  ];
  try {
    const gaps = missingGlyphs(collectText(spec), families);
    if (gaps.length > 0) ctx.warnings.push(describeGaps(gaps, families));
  } catch (error) {
    ctx.warnings.push(`glyph check skipped: ${error instanceof Error ? error.message : error}`);
  }
  const body = contrast(ctx.pal.ink, ctx.pal.paper);
  if (body < 4.5) {
    ctx.warnings.push(`palette ${ctx.pal.id}: ink on paper is ${body.toFixed(2)}:1`);
  }
}
