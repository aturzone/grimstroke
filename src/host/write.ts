/**
 * Writing a document well, for an agent that cannot see it.
 *
 * An agent that places things by guessed coordinates gets a pile: it cannot know how tall a
 * paragraph turns out, so the next heading lands on its last lines and a long column runs off
 * the bottom of the page. Three tools close that gap, and all three MEASURE, in a headless
 * browser, rather than estimate:
 *
 *   flow    blocks poured into a notebook, page after page, each page a column set at the page's
 *           margins, split where the page is full -- never a heading left alone at the foot
 *   layout  where everything on a board or page really is: its box, what overlaps what, what
 *           runs over the page's edge, and how much room is left
 *   tidy    a set of items lined up as a column, a row or a grid, with even gaps
 *
 * Without Playwright they fall back to an estimate and say so in the reply.
 */

import type { BoardItem, BoardSpec } from '~/draw/doc/board/model.ts';
import { renderBoard } from '~/draw/doc/board/render.ts';
import { type BookSpec, boundLeaves, LEAF_MARGIN, leafSize } from '~/draw/doc/book/model.ts';
import { renderSpread } from '~/draw/doc/book/render.ts';
import { upgradeLeaf } from '~/draw/doc/legacy.ts';
import type { Block } from '~/draw/material/model.ts';
import { textOf } from '~/draw/material/read.ts';
import { measure } from '~/host/export.ts';

/** Room kept at the foot of a page for its folio. */
const FOOT = 64;

export interface Box {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FlowPlan {
  /** The blocks for each page, in order. */
  pages: Block[][];
  measured: boolean;
  warnings: string[];
}

/** Where the column goes on a page of this notebook, and how much of the page it may fill. */
export function column(book: Pick<BookSpec, 'pageSize'>): {
  at: [number, number];
  width: number;
  height: number;
} {
  const [w, h] = leafSize(book);
  return {
    at: [LEAF_MARGIN[0], LEAF_MARGIN[1]],
    width: w - LEAF_MARGIN[0] * 2,
    height: h - LEAF_MARGIN[1] - FOOT,
  };
}

/** A rough height, for when there is no browser to ask: generous, so pages break early rather than late. */
function estimate(block: Block, width: number): number {
  const perLine = Math.max(10, Math.floor(width / 8.2));
  const lines = (text: string): number =>
    text.split('\n').reduce((n, line) => n + Math.max(1, Math.ceil(line.length / perLine)), 0);
  switch (block.kind) {
    case 'heading':
      return (
        (block.level === 2 ? 34 : 46) *
          Math.max(1, Math.ceil(block.text.length / (perLine * 0.55))) +
        18
      );
    case 'text':
    case 'quote':
      return lines(block.text) * 23 + 18;
    case 'bullets':
      return block.items.reduce((n, item) => n + lines(item) * 23, 0) + 18;
    case 'code':
      return block.text.split('\n').length * 19 + 40;
    case 'table':
      return block.rows.length * 30 + 20;
    case 'image':
    case 'compare':
      return Math.round(width * 0.7) + 30;
    case 'note':
      return 190;
    case 'divider':
      return 24;
    case 'spacer':
      return (block.size ?? 12) + 4;
    default:
      return (textOf(block).join(' ').length / perLine) * 23 + 40;
  }
}

/**
 * The blocks' heights, stacked in one column at the page's width -- the same markup and the same
 * stylesheet a page will draw them with, so what is measured is what will be seen.
 */
async function heights(
  book: BookSpec,
  blocks: readonly Block[],
  useBrowser = true,
  width?: number,
): Promise<{ spans: Array<[number, number]>; measured: boolean }> {
  const col = { ...column(book), ...(width ? { width } : {}) };
  const probe: BookSpec = {
    ...book,
    leaves: [
      {
        id: 'probe',
        items: [
          {
            id: 'probe',
            at: col.at,
            size: [col.width],
            block: { kind: 'stack', blocks: [...blocks] },
          },
        ],
      },
    ],
    minLeaves: 1,
  };
  try {
    if (!useBrowser) throw new Error('estimate asked for');
    const page = renderSpread(probe, { leaf: 0 });
    const spans = await measure<Array<[number, number]>>(
      page,
      `const stack = document.querySelector('.leaf .stack');
       const top = stack.getBoundingClientRect().top;
       return [...stack.children].map((el) => {
         const r = el.getBoundingClientRect();
         const s = getComputedStyle(el);
         return [r.top - top - parseFloat(s.marginTop), r.bottom - top + parseFloat(s.marginBottom)];
       });`,
    );
    if (spans.length === blocks.length) return { spans, measured: true };
  } catch {
    // No browser: estimate below.
  }
  let y = 0;
  const spans: Array<[number, number]> = blocks.map((block) => {
    const h = estimate(block, col.width);
    const span: [number, number] = [y, y + h];
    y += h;
    return span;
  });
  return { spans, measured: false };
}

/**
 * Pour blocks onto pages: as many as fit on each, a page break where the next would not, and a
 * heading never left as the last thing on a page -- it goes over with what it introduces.
 */
export async function planFlow(
  book: BookSpec,
  blocks: readonly Block[],
  options: { measure?: boolean; width?: number } = {},
): Promise<FlowPlan> {
  const col = column(book);
  const { spans, measured } = await heights(book, blocks, options.measure ?? true, options.width);
  const pages: Block[][] = [];
  const warnings: string[] = [];
  let current: Block[] = [];
  let start = 0;
  blocks.forEach((block, i) => {
    const [top, bottom] = spans[i] ?? [0, 0];
    if (current.length && bottom - start > col.height) {
      // Keep a heading with what follows it.
      const carried: Block[] = [];
      while (current.length > 1 && current[current.length - 1]?.kind === 'heading') {
        carried.unshift(current.pop() as Block);
      }
      pages.push(current);
      current = carried;
      const first = carried.length ? blocks.indexOf(carried[0] as Block, i - carried.length) : i;
      start = spans[first]?.[0] ?? top;
    }
    if (!current.length) start = top;
    if (bottom - top > col.height) {
      warnings.push(`block ${i + 1} (${block.kind}) is taller than a page and runs over its foot`);
    }
    current.push(block);
  });
  if (current.length) pages.push(current);
  if (!measured)
    warnings.push(
      'measured by estimate: Playwright is not installed, so page breaks are approximate',
    );
  return { pages, measured, warnings };
}

/** The gap between two columns on a page. */
export const GUTTER = 28;

/** Where each column goes on a page of this notebook, for one column or two. */
export function columns(
  book: Pick<BookSpec, 'pageSize'>,
  count: 1 | 2,
): { xs: number[]; y: number; width: number; height: number } {
  const col = column(book);
  if (count === 1) return { xs: [col.at[0]], y: col.at[1], width: col.width, height: col.height };
  const width = Math.floor((col.width - GUTTER) / 2);
  return { xs: [col.at[0], col.at[0] + width + GUTTER], y: col.at[1], width, height: col.height };
}

// ---------------------------------------------------------------- a document

/**
 * What an agent sends to be written: blocks, where any figure -- a picture, a table, a listing,
 * a comparison -- may carry a `caption`, and any text may point elsewhere with `{ref: words}`:
 * the words of a heading or of a figure's caption, in this document or already in the notebook.
 */
export type WriteBlock = Block | (Exclude<Block, { kind: 'text' }> & { caption?: string });

export interface Figure {
  n: number;
  caption: string;
  page: number;
}

export interface WritePlan {
  /** Each page, as its columns, each column its blocks. */
  pages: Block[][][];
  columns: 1 | 2;
  measured: boolean;
  warnings: string[];
  figures: Figure[];
  refs: Array<{ to: string; page?: number }>;
}

const REF = /\{ref:\s*([^}]+?)\s*\}/g;
const FIGURES = new Set(['image', 'compare', 'table', 'code']);
const key = (words: string): string => words.trim().toLowerCase().replace(/\s+/g, ' ');

/** Every string of prose in a block, changed by `fn`: what a reference can be written in. */
function mapText(block: Block, fn: (text: string) => string): Block {
  switch (block.kind) {
    case 'text':
    case 'quote':
    case 'note':
    case 'label':
      return { ...block, text: fn(block.text) };
    case 'bullets':
      return { ...block, items: block.items.map(fn) };
    case 'table':
      return { ...block, rows: block.rows.map((row) => row.map(fn)) };
    case 'stack':
      return { ...block, blocks: block.blocks.map((b) => mapText(b, fn)) };
    default:
      return block;
  }
}

/** The headings in a block, a written stack's included. */
function headingsIn(block: Block): string[] {
  if (block.kind === 'heading') return [block.text];
  if (block.kind === 'stack') return block.blocks.flatMap(headingsIn);
  return [];
}

/**
 * Figures numbered, captions put with what they name, references written in. A picture's caption
 * is part of the picture; any other figure and its caption become one stack, so a page break can
 * never come between them.
 */
function prepare(
  input: readonly WriteBlock[],
  resolve: (to: string) => string,
): { blocks: Block[]; figures: Array<{ n: number; caption: string; at: number }> } {
  const figures: Array<{ n: number; caption: string; at: number }> = [];
  const blocks = input.map((raw, at): Block => {
    // A text block's own `caption` is a flag, not a figure's words: it stays where it is.
    const said = raw.kind !== 'text' && 'caption' in raw ? raw.caption : undefined;
    let block: Block = raw;
    if (said !== undefined) {
      const { caption: _, ...rest } = raw as { caption?: string };
      block = rest as Block;
    }
    const caption =
      said ?? (block.kind === 'image' && block.image.caption ? block.image.caption : undefined);
    if (caption && FIGURES.has(block.kind)) {
      const n = figures.length + 1;
      figures.push({ n, caption, at });
      const numbered = `Figure ${n}. ${caption}`;
      if (block.kind === 'image')
        block = { ...block, image: { ...block.image, caption: numbered } };
      else
        block = { kind: 'stack', blocks: [block, { kind: 'text', text: numbered, caption: true }] };
    }
    return mapText(block, (text) => text.replace(REF, (_, to: string) => resolve(to)));
  });
  return { blocks, figures };
}

/**
 * A document written into a notebook: numbered figures kept with their captions, one column or
 * two, and every `{ref: ...}` turned into the page it points at once the pages are known.
 */
export async function planWrite(
  book: BookSpec,
  input: readonly WriteBlock[],
  options: { columns?: 1 | 2; from?: number; measure?: boolean } = {},
): Promise<WritePlan> {
  const count = options.columns === 2 ? 2 : 1;
  const from = options.from ?? firstEmptyPage(book);
  const cols = columns(book, count);
  // Laid out once with a stand-in as wide as most page numbers, to learn where things fall.
  const draft = prepare(input, () => 'page 00');
  const flow = await planFlow(book, draft.blocks, {
    ...(options.measure === false ? { measure: false } : {}),
    width: cols.width,
  });
  const pageOf: number[] = [];
  flow.pages.forEach((chunk, c) => {
    for (const _ of chunk) pageOf.push(from + Math.floor(c / count));
  });

  // What a reference can point at: headings and figures here, and headings already written.
  const targets = new Map<string, { page: number; figure?: number }>();
  boundLeaves(book).forEach((leaf, i) => {
    if (i + 1 >= from) return;
    for (const item of upgradeLeaf(leaf).items ?? []) {
      for (const h of item.block ? headingsIn(item.block) : []) {
        if (!targets.has(key(h))) targets.set(key(h), { page: i + 1 });
      }
    }
  });
  draft.blocks.forEach((block, i) => {
    for (const h of headingsIn(block)) targets.set(key(h), { page: pageOf[i] ?? from });
  });
  for (const f of draft.figures) {
    targets.set(key(f.caption), { page: pageOf[f.at] ?? from, figure: f.n });
    targets.set(key(`figure ${f.n}`), { page: pageOf[f.at] ?? from, figure: f.n });
  }

  const refs: WritePlan['refs'] = [];
  const warnings = [...flow.warnings];
  // Exact words first; failing that, the start of exactly one heading or caption -- "Timings"
  // for "Timings, cold and warm" -- and never a guess between two.
  const find = (to: string): { page: number; figure?: number } | undefined => {
    const exact = targets.get(key(to));
    if (exact) return exact;
    const starts = [...targets.entries()].filter(([k]) => k.startsWith(key(to)));
    const distinct = new Set(starts.map(([, v]) => `${v.page}:${v.figure ?? ''}`));
    return distinct.size === 1 ? starts[0]?.[1] : undefined;
  };
  const final = prepare(input, (to) => {
    const hit = find(to);
    refs.push({ to, ...(hit ? { page: hit.page } : {}) });
    if (!hit) {
      warnings.push(
        `nothing called “${to}” to refer to: no heading or figure caption has those words`,
      );
      return 'page ?';
    }
    return hit.figure ? `figure ${hit.figure}, page ${hit.page}` : `page ${hit.page}`;
  });

  // The same blocks in the same chunks, now with their references written in.
  const pages: Block[][][] = [];
  let i = 0;
  flow.pages.forEach((chunk, c) => {
    const column = chunk.map(() => final.blocks[i++] as Block);
    const p = Math.floor(c / count);
    pages[p] ??= [];
    pages[p].push(column);
  });
  return {
    pages,
    columns: count,
    measured: flow.measured,
    warnings,
    figures: draft.figures.map((f) => ({ n: f.n, caption: f.caption, page: pageOf[f.at] ?? from })),
    refs,
  };
}

/** The first page number (1-based) with nothing on it, from which a flow can start. */
export function firstEmptyPage(book: BookSpec): number {
  const leaves = boundLeaves(book);
  let last = 0;
  leaves.forEach((leaf, i) => {
    const up = upgradeLeaf(leaf);
    if ((up.items?.length ?? 0) > 0) last = i + 1;
  });
  return last + 1;
}

// ---------------------------------------------------------------- layout

export interface LayoutReport {
  items: Box[];
  overlaps: Array<[string, string]>;
  /** On a page: items that run over its edge. */
  outside: string[];
  bounds: { x: number; y: number; w: number; h: number } | undefined;
  /** On a page: its size, and the clear band left below everything on it. */
  page?: { w: number; h: number; freeFrom: number; freeHeight: number };
  measured: boolean;
}

/** Where every item on a board or page really is. */
export async function layoutOf(spec: BoardSpec): Promise<LayoutReport> {
  let boxes: Box[] | undefined;
  let measured = false;
  try {
    const page = renderBoard(spec);
    boxes = await measure<Box[]>(
      page,
      `const board = document.querySelector('.board');
       const [ox, oy] = (board.dataset.gsOrigin || '0,0').split(',').map(Number);
       const b = board.getBoundingClientRect();
       return [...board.querySelectorAll('[data-gs="item"]')].map((el) => {
         const target = el.tagName.toLowerCase() === 'svg' ? (el.querySelector('path') || el) : el;
         const r = target.getBoundingClientRect();
         return { id: el.dataset.gsId, x: Math.round(r.left - b.left + ox), y: Math.round(r.top - b.top + oy), w: Math.round(r.width), h: Math.round(r.height) };
       });`,
    );
    measured = true;
  } catch {
    boxes = spec.items.map((item) => ({
      id: item.id,
      x: item.at[0],
      y: item.at[1],
      w: item.size?.[0] ?? 240,
      h: item.size?.[1] ?? 80,
    }));
  }
  const overlaps: Array<[string, string]> = [];
  const byId = new Map(spec.items.map((i) => [i.id, i]));
  for (let a = 0; a < boxes.length; a++) {
    for (let b = a + 1; b < boxes.length; b++) {
      const p = boxes[a] as Box;
      const q = boxes[b] as Box;
      const ia = byId.get(p.id);
      const ib = byId.get(q.id);
      // Ink drawn over something is meant to be; a group is one thing.
      if (ia?.ink || ib?.ink || (ia?.group && ia.group === ib?.group)) continue;
      const w = Math.min(p.x + p.w, q.x + q.w) - Math.max(p.x, q.x);
      const h = Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y);
      if (w > 4 && h > 4) overlaps.push([p.id, q.id]);
    }
  }
  const bounds = boxes.length
    ? (() => {
        const x = Math.min(...boxes.map((b) => b.x));
        const y = Math.min(...boxes.map((b) => b.y));
        return {
          x,
          y,
          w: Math.max(...boxes.map((b) => b.x + b.w)) - x,
          h: Math.max(...boxes.map((b) => b.y + b.h)) - y,
        };
      })()
    : undefined;
  const report: LayoutReport = { items: boxes, overlaps, outside: [], bounds, measured };
  if (spec.sheet && spec.extent) {
    const [x0, y0, x1, y1] = spec.extent;
    report.outside = boxes
      .filter((b) => b.x < x0 || b.y < y0 || b.x + b.w > x1 || b.y + b.h > y1)
      .map((b) => b.id);
    const bottom = boxes
      .filter((b) => !byId.get(b.id)?.ink)
      .reduce((m, b) => Math.max(m, b.y + b.h), y0 + LEAF_MARGIN[1]);
    report.page = {
      w: x1 - x0,
      h: y1 - y0,
      freeFrom: bottom,
      freeHeight: Math.max(0, y1 - FOOT - bottom),
    };
  }
  return report;
}

// ---------------------------------------------------------------- tidy

/** Moves that line items up as a column, a row or a grid, in the order given, with even gaps. */
export function tidyMoves(
  items: readonly BoardItem[],
  boxes: readonly Box[],
  ids: readonly string[],
  shape: { as: 'column' | 'row' | 'grid'; gap?: number; at?: [number, number]; columns?: number },
): Array<{ op: 'move'; id: string; at: [number, number] }> {
  const gap = shape.gap ?? 16;
  const chosen = ids
    .map((id) => boxes.find((b) => b.id === id))
    .filter((b): b is Box => b !== undefined);
  if (!chosen.length) return [];
  const start: [number, number] = shape.at ?? [
    Math.min(...chosen.map((b) => b.x)),
    Math.min(...chosen.map((b) => b.y)),
  ];
  const byId = new Map(items.map((i) => [i.id, i]));
  const moves: Array<{ op: 'move'; id: string; at: [number, number] }> = [];
  // A measured box can sit off an item's own corner (a turned item, a stroke); keep that offset.
  const move = (b: Box, x: number, y: number): void => {
    const item = byId.get(b.id);
    if (!item) return;
    moves.push({
      op: 'move',
      id: b.id,
      at: [Math.round(item.at[0] + x - b.x), Math.round(item.at[1] + y - b.y)],
    });
  };
  if (shape.as === 'column') {
    let y = start[1];
    for (const b of chosen) {
      move(b, start[0], y);
      y += b.h + gap;
    }
  } else if (shape.as === 'row') {
    let x = start[0];
    for (const b of chosen) {
      move(b, x, start[1]);
      x += b.w + gap;
    }
  } else {
    const cols = Math.max(1, shape.columns ?? 2);
    const cellW = Math.max(...chosen.map((b) => b.w));
    let y = start[1];
    for (let r = 0; r * cols < chosen.length; r++) {
      const row = chosen.slice(r * cols, r * cols + cols);
      row.forEach((b, c) => {
        move(b, start[0] + c * (cellW + gap), y);
      });
      y += Math.max(...row.map((b) => b.h)) + gap;
    }
  }
  return moves;
}
