/**
 * The routes that are drawing and nothing else: a leaf or a cover drawn for the app, writing
 * poured into a notebook and measured, the layout of a board as drawn, and the exports. They
 * need the renderer, so they are the face's; the core answers the same documents as data.
 */

import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { BoardSpec } from '~/draw/doc/board/model.ts';
import { renderBoard } from '~/draw/doc/board/render.ts';
import { boundLeaves, leafSize } from '~/draw/doc/book/model.ts';
import { apply as applyBook, type BookOp } from '~/draw/doc/book/patch.ts';
import { contentsOf, printedLeaves, renderPrint } from '~/draw/doc/book/print.ts';
import { renderCover, renderOneLeaf } from '~/draw/doc/book/render.ts';
import { surface } from '~/draw/doc/surface.ts';
import { exportPages, exportPdf } from '~/host/export.ts';
import { applyBoard } from '~/host/serve/api.ts';
import { type Ask, header, readBody, send } from '~/host/serve/http.ts';
import type { Live } from '~/host/serve/live.ts';
import { lookOf, withLook } from '~/host/serve/look.ts';
import {
  columns,
  firstEmptyPage,
  layoutOf,
  planWrite,
  settleMoves,
  tidyMoves,
  type WriteBlock,
} from '~/host/write.ts';

export async function drawingRoutes(ask: Ask, live: Live): Promise<boolean> {
  const { req, res, url, path } = ask;
  const store = live.store;

  if (path === '/api/leaf') {
    const spec = await live.book(url.searchParams.get('id') ?? 'notebook');
    const drawn = renderOneLeaf(spec, Number(url.searchParams.get('index') ?? 0));
    if (!drawn) {
      send(res, 404, { error: 'no such leaf' });
      return true;
    }
    live.allow(drawn.assets);
    send(res, 200, { html: drawn.html });
    return true;
  }

  /** The cover on its own, for the cover editor: drawn here, as everything is. */
  if (path === '/api/cover') {
    const spec = await live.book(url.searchParams.get('id') ?? 'notebook');
    const ctx = surface(spec.id, spec);
    const html = renderCover(spec, ctx);
    live.allow(ctx.assets);
    send(res, 200, { html });
    return true;
  }

  /*
   * Writing, for an agent: pour blocks into a notebook page after page (split where each page is
   * full, measured), see where everything on a page really is, and tidy a set of items. See
   * host/write.ts and docs/writing.md.
   */
  if (path === '/api/write' && req.method === 'POST') {
    const body = (await readBody(req)) as {
      book?: string;
      blocks?: WriteBlock[];
      from?: number;
      columns?: number;
    };
    const book = await live.book(body.book ?? 'notebook');
    const blocks = Array.isArray(body.blocks) ? body.blocks : [];
    if (!blocks.length) {
      send(res, 400, {
        error: 'blocks are needed: headings, text, bullets, tables, pictures, notes...',
      });
      return true;
    }
    const from = Math.max(1, Math.floor(body.from ?? firstEmptyPage(book)));
    const count = body.columns === 2 ? 2 : 1;
    const plan = await planWrite(book, blocks, { columns: count, from });
    const cols = columns(book, count);
    const stamp = Date.now().toString(36);
    const leaves = boundLeaves(book);
    const ops: BookOp[] = plan.pages.map((page, k) => ({
      op: 'leaf.items',
      id: leaves[from - 1 + k]?.id ?? `blank-${from + k}`,
      ops: page.map((chunk, c) => ({
        op: 'add' as const,
        item: {
          id: `flow-${stamp}-${k + 1}${count === 2 ? `-${c + 1}` : ''}`,
          at: [cols.xs[c] ?? cols.xs[0] ?? 40, cols.y] as [number, number],
          size: [cols.width] as [number],
          block: { kind: 'stack' as const, blocks: chunk },
        },
      })),
    }));
    const result = applyBook(book, ops);
    await live.commitBook(result.spec);
    live.broadcast(`book:${book.id}`, 'reload', {});
    const pages = plan.pages.map((_, k) => from + k);
    send(res, 200, {
      pages,
      columns: count,
      measured: plan.measured,
      warnings: plan.warnings,
      figures: plan.figures,
      refs: plan.refs,
      look: pages.map((n) => `/page?book=${encodeURIComponent(book.id)}&leaf=${n}`),
    });
    return true;
  }

  if (path === '/api/layout') {
    const spec = await live.board(url.searchParams.get('board') ?? ask.board);
    send(res, 200, await layoutOf(spec));
    return true;
  }

  if (path === '/api/tidy' && req.method === 'POST') {
    const body = (await readBody(req)) as {
      board?: string;
      ids?: string[];
      as?: 'column' | 'row' | 'grid';
      gap?: number;
      at?: [number, number];
      columns?: number;
      fix?: 'overlaps';
    };
    const address = body.board ?? ask.board;
    const spec = await live.board(address);
    const report = await layoutOf(spec);
    const moves =
      body.fix === 'overlaps'
        ? settleMoves(spec.items, report.items, body.gap)
        : tidyMoves(spec.items, report.items, body.ids ?? [], {
            as: body.as ?? 'column',
            ...(body.gap !== undefined ? { gap: body.gap } : {}),
            ...(body.at ? { at: body.at } : {}),
            ...(body.columns ? { columns: body.columns } : {}),
          });
    const reply = moves.length
      ? await applyBoard(live, address, moves, header(req, 'x-grimstroke-client'))
      : undefined;
    const after =
      moves.length && body.fix === 'overlaps' ? await layoutOf(await live.board(address)) : report;
    send(res, 200, {
      moved: moves.length,
      measured: report.measured,
      overlaps: after.overlaps,
      outside: after.outside,
      reply,
    });
    return true;
  }

  // The PDF itself, made here, for an agent with no browser: Chromium prints the same page.
  if (path === '/api/export/book.pdf') {
    const spec = await live.book(url.searchParams.get('id') ?? '');
    const page = renderPrint(spec);
    live.allow(page.assets);
    let bytes: Buffer;
    try {
      bytes = await exportPdf({
        ...page,
        html: withLook(page.html, await lookOf(store), 'notebook', Boolean(spec.fonts)),
      });
    } catch (error) {
      send(res, 503, {
        error:
          'a PDF made on the server needs Playwright with Chromium. Open /print?book= in any browser and print it instead. ' +
          `(${error instanceof Error ? error.message : String(error)})`,
      });
      return true;
    }
    res.writeHead(200, {
      'content-type': 'application/pdf',
      'content-length': bytes.length,
      'content-disposition': `attachment; filename="${encodeURIComponent(spec.id)}.pdf"`,
    });
    res.end(bytes);
    return true;
  }

  // A notebook as one PDF: what it will hold, and the page that makes it. The PDF itself is
  // written by a browser's print -- the page sets the paper size -- so the words stay words.
  if (path === '/api/export/book') {
    const id = url.searchParams.get('id') ?? ((await readBody(req)) as { id?: string }).id ?? '';
    const spec = await live.book(id);
    const print = `/print?book=${encodeURIComponent(spec.id)}`;
    send(res, 200, {
      print,
      save: `${print}&print`,
      pdf: `/api/export/book.pdf?id=${encodeURIComponent(spec.id)}`,
      pageSize: leafSize(spec),
      pages: printedLeaves(spec).length,
      contents: contentsOf(spec),
    });
    return true;
  }

  if (path === '/api/export' && req.method === 'POST') {
    const body = (await readBody(req)) as { board?: string; only?: string[] };
    const id = body.board ?? ask.board;
    const spec = await live.board(id);
    // A selection travels as a list of ids rather than as a rectangle, so the export
    // captures the items that were chosen and not whatever happens to overlap them.
    // The pinned extent is a coordinate origin for the live page, not an edge -- the paper
    // goes on for ever there. A picture is cut round what is on it, plus a margin.
    const { extent: _origin, ...rest } = spec;
    let subject: BoardSpec = rest;
    if (body.only?.length) {
      const chosen = new Set(body.only);
      subject = { ...rest, items: spec.items.filter((item) => chosen.has(item.id)) };
    }
    const rendered = renderBoard(subject);
    const out = join(tmpdir(), `grimstroke-${id}-${Date.now()}.png`);
    try {
      await exportPages([
        {
          page: {
            ...rendered,
            html: withLook(
              rendered.html,
              await lookOf(store),
              id.startsWith('book:') ? 'notebook' : 'board',
              Boolean(spec.fonts),
            ),
          },
          out,
        },
      ]);
    } catch (error) {
      // Playwright is an optional peer, and the person who is about to be
      // told this is looking at a board in a browser -- so the message says
      // what to do about it rather than naming a module.
      send(res, 503, {
        error:
          'a PNG needs a browser on the server. Install it with `pnpm add -D playwright`, ' +
          'or use the pdf button, which uses the browser you are already looking at. ' +
          `(${error instanceof Error ? error.message : String(error)})`,
      });
      return true;
    }
    const bytes = await readFile(out);
    await rm(out, { force: true });
    res.writeHead(200, {
      'content-type': 'image/png',
      'content-length': bytes.length,
      'content-disposition': `attachment; filename="${encodeURIComponent(id)}.png"`,
    });
    res.end(bytes);
    return true;
  }

  return false;
}
