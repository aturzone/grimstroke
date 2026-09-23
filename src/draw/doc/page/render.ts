/**
 * A page, as HTML. Pure: nothing here opens a browser or touches the network.
 *
 * That purity is the design. A snapshot of this output is readable text, so a
 * regression shows up as `padding-inline-start: 18px -> 20px` rather than as a
 * red blob, and an agent that already has a browser of its own can take the HTML
 * and screenshot it without this library ever launching anything.
 */

import { renderHead as head } from '~/draw/doc/head.ts';
import type { Direction, RenderedPage } from '~/draw/doc/model.ts';
import type { PageSpec } from '~/draw/doc/page/model.ts';
import { type Surface, surface } from '~/draw/doc/surface.ts';
import { contrast, textOn } from '~/draw/look/colour.ts';
import { tapeStrip, tornClipPath } from '~/draw/look/paper.ts';
import { renderBlock } from '~/draw/material/block.ts';
import { halftoneDefs } from '~/draw/material/note/render.ts';
import { ARABIC, textOfAll } from '~/draw/material/read.ts';
import { describeGaps, missingGlyphs } from '~/draw/type/coverage.ts';
import { stack } from '~/draw/type/faces.ts';
import { escapeHtml, inline, label } from '~/draw/type/text.ts';

export function renderPage(spec: PageSpec): RenderedPage {
  const ctx = surface(spec.id, spec);
  const { direction, uppercase } = ctx;

  const body = spec.blocks.map((block) => renderBlock(block, ctx)).join('\n');
  const head = renderHead(spec, ctx, direction);
  const band = renderBand(spec, ctx);
  const tape = tapeStrip(100, 100, 0, spec.id);

  checkGlyphs(spec, ctx);

  const script = ARABIC.test(collectText(spec)) ? 'arabic' : 'latin';
  const html = [
    '<!doctype html>',
    `<html lang="${escapeHtml(direction === 'rtl' ? 'fa' : 'en')}" dir="${direction}" ` +
      `data-script="${script}" data-uppercase="${uppercase ? 'on' : 'off'}">`,
    head,
    '<body>',
    halftoneDefs(),
    '<div class="mount">',
    '<div class="shadow"></div>',
    '<div class="sheet">',
    `<svg class="tape sheet-tape" viewBox="-48 -48 96 96" width="96" height="96" ` +
      `aria-hidden="true"><path class="tape-strip" d="${tape.d}" ` +
      `transform="rotate(${tape.angle})"/></svg>`,
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

function renderHead(spec: PageSpec, ctx: Surface, direction: Direction): string {
  const width = spec.width ?? 1080;
  return head(ctx, direction, {
    paper: spec.paper,
    grain: spec.grain,
    fonts: spec.fonts,
    imageMaxHeight: spec.imageMaxHeight,
    extra: {
      '--page-width': `${width}px`,
      // The top is deeper than the others. The tape sits at -8px and a deep
      // nick in the torn edge reaches about 2% of the height inward, and with
      // 22px of padding both landed across the title -- a strip of tape
      // through the middle of the first line of every page.
      '--page-padding': '40px 24px 26px',
      // The polygon is in percentage space and stretches with the sheet, so it
      // is generated against a nominal page rather than a square.
      '--torn': tornClipPath(width, Math.round(width * 1.4), spec.id),
    },
  });
}

function renderBand(spec: PageSpec, ctx: Surface): string {
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

function chip(c: { text: string; colour?: string }, ctx: Surface): string {
  const style = c.colour
    ? ` style="--chip-bg:${escapeHtml(c.colour)};--chip-fg:${escapeHtml(
        textOn(c.colour, [ctx.pal.paper, ctx.pal.ink]),
      )}"`
    : '';
  return `<span class="chip"${style}>${label(c.text, ctx.uppercase)}</span>`;
}
// ---------------------------------------------------------------- support

function collectText(spec: PageSpec): string {
  return [
    spec.title ?? '',
    ...(spec.trail ?? []),
    ...(spec.chips ?? []).map((c) => c.text),
    textOfAll(spec.blocks),
  ].join(' ');
}

function checkGlyphs(spec: PageSpec, ctx: Surface): void {
  const direction = spec.direction ?? 'ltr';
  const fonts = spec.fonts ?? {};
  const families = [
    ...new Set([
      ...stack('body', fonts, direction),
      ...stack('mono', fonts, direction),
      ...stack('hand', fonts, direction),
      ...stack('marker', fonts, direction),
    ]),
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
