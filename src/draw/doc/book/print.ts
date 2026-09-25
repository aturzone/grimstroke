/**
 * A whole notebook, printed: the cover, the contents, then every written page, one sheet each at
 * the notebook's own page size.
 *
 * The browser's print is the PDF writer -- the same one the board's pdf button uses -- so the
 * text stays text and the strokes stay paths. The pages are the same leaves the spread draws,
 * from the same function, so the PDF cannot disagree with the book.
 *
 * Blank pages after the last written one are left out: a forty page notebook with three pages
 * in it prints as three pages, not forty. Blank pages between written ones stay, because the
 * page numbers in the contents have to be the numbers on the pages.
 */

import type { BookSpec, Leaf } from '~/draw/doc/book/model.ts';
import { bookTitle, boundLeaves, leafSize, spineWidth } from '~/draw/doc/book/model.ts';
import { renderCover, renderLeaf } from '~/draw/doc/book/render.ts';
import { renderHead } from '~/draw/doc/head.ts';
import { upgradeLeaf } from '~/draw/doc/legacy.ts';
import type { RenderedPage } from '~/draw/doc/model.ts';
import { surface } from '~/draw/doc/surface.ts';
import type { Block } from '~/draw/material/model.ts';
import { halftoneDefs } from '~/draw/material/note/render.ts';
import { ARABIC, leafText } from '~/draw/material/read.ts';
import { escapeHtml, label } from '~/draw/type/text.ts';

export interface ContentsLine {
  /** The page number printed on the page, from one. */
  page: number;
  title: string;
  /** Where the words came from: a heading on the page, or its first words. */
  from: 'heading' | 'text';
}

function written(leaf: Leaf | undefined): boolean {
  return Boolean(leaf && ((leaf.items?.length ?? 0) > 0 || (leaf.blocks?.length ?? 0) > 0));
}

/** The pages to print: up to the last one with anything on it. */
export function printedLeaves(spec: BookSpec): Leaf[] {
  const leaves = boundLeaves(spec);
  let last = -1;
  leaves.forEach((leaf, i) => {
    if (written(leaf)) last = i;
  });
  return leaves.slice(0, last + 1);
}

/**
 * One line per written page: its topmost heading, or failing that its first words. A page
 * whose heading is where the reader looks first is found by that heading.
 */
function headingIn(block: Block): string | undefined {
  if (block.kind === 'heading') return block.text.trim() || undefined;
  if (block.kind === 'stack') {
    for (const inner of block.blocks) {
      const found = headingIn(inner);
      if (found) return found;
    }
  }
  return undefined;
}

export function contentsOf(spec: BookSpec): ContentsLine[] {
  const lines: ContentsLine[] = [];
  printedLeaves(spec).forEach((raw, i) => {
    if (!written(raw)) return;
    const leaf = upgradeLeaf(raw);
    // Top to bottom; a written column is one stack, and its heading is inside it.
    const top = [...(leaf.items ?? [])]
      .sort((a, b) => (a.at?.[1] ?? 0) - (b.at?.[1] ?? 0))
      .map((item) => (item.block ? headingIn(item.block) : undefined))
      .find(Boolean);
    if (top) {
      lines.push({ page: i + 1, title: top, from: 'heading' });
      return;
    }
    const words = leafText(leaf).join(' ').replace(/\s+/g, ' ').trim();
    lines.push({
      page: i + 1,
      title: words ? (words.length > 64 ? `${words.slice(0, 63)}…` : words) : `page ${i + 1}`,
      from: 'text',
    });
  });
  return lines;
}

export function renderPrint(spec: BookSpec, options: { scripts?: string[] } = {}): RenderedPage {
  const ctx = surface(spec.id, spec);
  const { direction, uppercase } = ctx;
  const [w, h] = leafSize(spec);
  const head = renderHead(ctx, direction, {
    paper: 'blank',
    grain: spec.grain,
    fonts: spec.fonts,
    round: spec.corners,
    extra: {
      '--leaf-width': `${w}px`,
      '--leaf-height': `${h}px`,
      '--spine-depth': `${spineWidth(spec)}px`,
    },
  });
  const leaves = printedLeaves(spec);
  const contents = contentsOf(spec);
  const title = bookTitle(spec);
  const script = ARABIC.test([title, ...leaves.flatMap((l) => leafText(l))].join(' '))
    ? 'arabic'
    : 'latin';

  const sheet = (inner: string, className = ''): string =>
    `<section class="print-sheet${className ? ` ${className}` : ''}">${inner}</section>`;
  const toc =
    `<div class="print-toc-page"><h1 class="print-toc-title" dir="auto">${escapeHtml(title)}</h1>` +
    '<p class="print-toc-kicker">contents</p><ol class="print-toc">' +
    (contents.length
      ? contents
          .map(
            (line) =>
              `<li><span class="print-toc-words" dir="auto">${escapeHtml(line.title)}</span>` +
              `<span class="print-toc-dots" aria-hidden="true"></span>` +
              `<span class="print-toc-page-no">${label(String(line.page), false)}</span></li>`,
          )
          .join('')
      : '<li><span class="print-toc-words">nothing written yet</span></li>') +
    '</ol></div>';
  const pages = leaves
    .map((leaf, i) => sheet(renderLeaf(leaf, i, spec, ctx, i % 2 === 0 ? 'verso' : 'recto')))
    .join('\n');

  const html = [
    '<!doctype html>',
    `<html lang="${direction === 'rtl' ? 'fa' : 'en'}" dir="${direction}" ` +
      `data-script="${script}" data-uppercase="${uppercase ? 'on' : 'off'}">`,
    head,
    // The paper size is the notebook's, and a printer's margin would shrink every page into it.
    `<style>@page { size: ${w}px ${h}px; margin: 0; }</style>`,
    '<body class="on-book on-print">',
    '<nav class="print-bar" data-gs="print-bar">' +
      `<a class="print-back" href="/book?id=${encodeURIComponent(spec.id)}">back to the notebook</a>` +
      `<span class="print-count" dir="ltr">${leaves.length} ${leaves.length === 1 ? 'page' : 'pages'}, with the cover and the contents</span>` +
      `<a class="print-back" href="/api/export/book.pdf?id=${encodeURIComponent(spec.id)}" data-gs="print-download" download>download PDF</a>` +
      '<button type="button" class="print-save" data-gs="print-save">save as PDF</button></nav>',
    halftoneDefs(),
    `<main class="print-book" data-gs="print" data-gs-id="${escapeHtml(spec.id)}">`,
    sheet(renderCover(spec, ctx), 'print-cover'),
    sheet(toc, 'print-contents'),
    pages,
    '</main>',
    ...(options.scripts ?? []).map(
      (src) => `<script type="module" src="${escapeHtml(src)}"></script>`,
    ),
    '</body>',
    '</html>',
  ].join('\n');

  return {
    id: `${spec.id}-print`,
    html: `${html}\n`,
    assets: ctx.assets,
    width: w,
    selector: '.print-book',
    warnings: ctx.warnings,
  };
}
