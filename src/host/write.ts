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
): Promise<{ spans: Array<[number, number]>; measured: boolean }> {
  const col = column(book);
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
  options: { measure?: boolean } = {},
): Promise<FlowPlan> {
  const col = column(book);
  const { spans, measured } = await heights(book, blocks, options.measure ?? true);
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
