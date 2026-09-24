/**
 * The JSON API: the same vocabulary a person produces by dragging things about.
 *
 * An agent posts operations to /api/patch and they go through exactly the code a drag goes
 * through, so there is no second implementation of "move an item" that can disagree with the
 * first, and no state a person can reach that an agent cannot.
 */

import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import type { BoardSpec } from '~/draw/doc/board/model.ts';
import { apply, type Op, PatchError, topZ } from '~/draw/doc/board/patch.ts';
import { extentOf, renderBoard, renderOneItem } from '~/draw/doc/board/render.ts';
import { boundLeaves } from '~/draw/doc/book/model.ts';
import { apply as applyBook, type BookOp, BookPatchError } from '~/draw/doc/book/patch.ts';
import { renderCover, renderOneLeaf } from '~/draw/doc/book/render.ts';
import { search } from '~/draw/doc/search.ts';
import { settle } from '~/draw/doc/shelf/model.ts';
import { renderCases } from '~/draw/doc/shelf/render.ts';
import { surface } from '~/draw/doc/surface.ts';
import { hashString } from '~/draw/look/rng.ts';
import type { Block } from '~/draw/material/model.ts';
import { type Profile, readProfile } from '~/draw/material/profile/model.ts';
import { renderProfile } from '~/draw/material/profile/render.ts';
import { exportPages } from '~/host/export.ts';
import { type Ask, header, readBody, readRaw, send } from '~/host/serve/http.ts';
import type { Live } from '~/host/serve/live.ts';
import { ArchiveError, pack, readArchive, unpack } from '~/host/store/archive.ts';
import { column, firstEmptyPage, layoutOf, planFlow, tidyMoves } from '~/host/write.ts';

export async function api(ask: Ask, live: Live): Promise<boolean> {
  const { req, res, url, path } = ask;
  const store = live.store;

  /*
   * The profile: the one person this workspace belongs to.
   *
   * GET reads it. POST with { profile } replaces it, and with { patch } changes only the fields
   * named -- so an agent can set a role without having to send back a portrait it never
   * looked at. A portrait is strokes in a 300 x 400 frame, the same SVG path shape as ink.
   */
  if (path === '/api/profile' && req.method !== 'POST') {
    send(res, 200, { profile: await store.readProfile() });
    return true;
  }

  if (path === '/api/profile' && req.method === 'POST') {
    const body = (await readBody(req)) as { profile?: Profile; patch?: Partial<Profile> };
    if (!body.profile && !body.patch) {
      send(res, 400, { error: 'send { profile } to replace it, or { patch } to change fields' });
      return true;
    }
    const next = readProfile(body.profile ?? { ...(await store.readProfile()), ...body.patch });
    await store.writeProfile(next);
    // The card, drawn here, so the page shows the card every other place will show.
    send(res, 200, { profile: next, card: renderProfile(next, { flat: true }) });
    return true;
  }

  /** Put the profile card onto a board, as an item like any other, by value. */
  if (path === '/api/profile/place' && req.method === 'POST') {
    const body = (await readBody(req)) as { board?: string; at?: [number, number] };
    const spec = await live.board(body.board ?? ask.board);
    // Somewhere visible rather than at the origin: the middle of whatever is already there,
    // so it lands on the part of the board somebody is actually looking at.
    const { extent: _origin, ...loose } = spec;
    const [x, y, w, h] = extentOf(loose);
    const item = {
      id: `card-${Date.now().toString(36)}`,
      at:
        body.at ?? ([Math.round(x + w / 2 - 110), Math.round(y + h / 2 - 170)] as [number, number]),
      size: [220] as [number],
      z: topZ(spec) + 1,
      block: { kind: 'profile' as const, profile: await store.readProfile() },
    };
    // Through the patch path, so everyone looking at the board sees it arrive.
    await patchBoard(ask, live, spec.id, [{ op: 'add', item }]);
    return true;
  }

  /*
   * The whole workspace, in and out, as one file.
   *
   * GET hands back the archive with a filename the browser will use, so "backup" in the
   * status bar is a download and nothing more. POST reads one in. Both sit behind the same
   * token as everything else -- this is the one endpoint that can hand over every board at
   * once, and the one that can overwrite them.
   */
  if (path === '/api/archive' && req.method !== 'POST') {
    const archive = await pack(store);
    const stamp = new Date().toISOString().slice(0, 10);
    res.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="workspace-${stamp}.grimstroke"`,
      'cache-control': 'no-store',
    });
    res.end(`${JSON.stringify(archive, null, 2)}\n`);
    return true;
  }

  if (path === '/api/archive' && req.method === 'POST') {
    let restored: Awaited<ReturnType<typeof unpack>>;
    try {
      restored = await unpack(store, readArchive(await readBody(req)));
    } catch (error) {
      send(res, error instanceof ArchiveError ? 400 : 500, {
        error: error instanceof Error ? error.message : String(error),
      });
      return true;
    }
    live.forget();
    send(res, 200, restored);
    return true;
  }

  /*
   * Search, across every board, every notebook -- the archived ones too -- and the profile.
   *
   * Read from the store rather than from what happens to be cached, so a notebook nobody has
   * opened since the server started is as findable as the one on screen.
   */
  if (path === '/api/search') {
    const query = (url.searchParams.get('q') ?? '').slice(0, 200);
    const boards = await Promise.all((await store.listBoards()).map((id) => live.board(id)));
    const books = await Promise.all((await store.listBooks()).map((id) => live.book(id)));
    const profile = await store.readProfile();
    send(res, 200, { query, hits: search({ boards, books, profile }, query) });
    return true;
  }

  /** A new notebook, named. The id is made from the name and never collides with another. */
  if (path === '/api/books' && req.method === 'POST') {
    const body = (await readBody(req)) as { title?: string; palette?: string };
    const title = (body.title ?? '').trim().slice(0, 80) || 'Untitled';
    const taken = new Set(await store.listBooks());
    const base = slug(title);
    let id = base;
    for (let n = 2; taken.has(id); n += 1) id = `${base}-${n}`;
    const spec = await live.book(id);
    await live.commitBook({
      ...spec,
      title,
      ...(body.palette ? { palette: body.palette } : {}),
      cover: { ...spec.cover, title },
    });
    send(res, 200, { id });
    return true;
  }

  // Thrown away, into the trash for thirty days -- not archived, which is only put away.
  if (path === '/api/books' && req.method === 'DELETE') {
    const id = url.searchParams.get('id') ?? '';
    const name = await live.trashBook(id);
    if (!name) send(res, 404, { error: `no notebook called ${id}` });
    else send(res, 200, { trashed: id, trash: name });
    return true;
  }

  /*
   * Several notebooks at once: archive, unarchive or throw away. Each is done on its own, so
   * one that is missing does not stop the rest, and the reply says what happened to each.
   */
  if (path === '/api/books/batch' && req.method === 'POST') {
    const body = (await readBody(req)) as { ids?: unknown; action?: unknown };
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((x): x is string => typeof x === 'string')
      : [];
    const action = body.action;
    if (action !== 'archive' && action !== 'unarchive' && action !== 'delete') {
      send(res, 400, { error: 'action is archive, unarchive or delete' });
      return true;
    }
    const done: string[] = [];
    const missing: string[] = [];
    const trash: Record<string, string> = {};
    const known = new Set(await store.listBooks());
    for (const id of ids) {
      if (!known.has(id)) {
        missing.push(id);
        continue;
      }
      if (action === 'delete') {
        const name = await live.trashBook(id);
        if (name) trash[id] = name;
      } else {
        const spec = await live.book(id);
        const { archived: _, ...rest } = spec;
        await live.commitBook(action === 'archive' ? { ...rest, archived: true } : rest);
      }
      done.push(id);
    }
    send(res, 200, { action, done, missing, ...(action === 'delete' ? { trash } : {}) });
    return true;
  }

  /*
   * The bookcase. GET answers with the shelves as they are -- every notebook in use, in order,
   * top shelf first -- and the room drawn; POST { rows } puts them in a new order and answers
   * with the room redrawn. A slot is { id } for a book standing, { id, flat: x } for one lying
   * flat x pixels along its shelf.
   */
  if (path === '/api/shelf/drop' && req.method === 'POST') {
    const body = (await readBody(req)) as {
      ids?: unknown;
      to?: unknown;
      row?: unknown;
      x?: unknown;
      width?: unknown;
    };
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((x): x is string => typeof x === 'string')
      : [];
    await live.dropBooks(
      ids,
      body.to === 'archive' ? 'archive' : 'use',
      Number(body.row) || 0,
      Number(body.x) || 0,
      Number(body.width) || undefined,
    );
    url.searchParams.set('width', String(Number(body.width) || ''));
  }

  if (path === '/api/shelf' || path === '/api/shelf/drop') {
    if (path === '/api/shelf' && req.method === 'POST') {
      const body = (await readBody(req)) as { rows?: unknown };
      await live.saveShelf(body.rows);
    }
    const { books, layout, edited, trash } = await live.shelf();
    const rows = settle(
      layout,
      books.filter((b) => !b.archived),
    );
    send(res, 200, {
      rows,
      archive: books.filter((b) => b.archived).map((b) => b.id),
      trash,
      html: renderCases(books, {
        layout: { rows },
        edited,
        trash,
        // A phone asks for a narrower bookcase with more shelves; the order is the same.
        ...(Number(url.searchParams.get('width'))
          ? { width: Number(url.searchParams.get('width')) }
          : {}),
      }),
    });
    return true;
  }

  if (path === '/api/trash' && req.method === 'GET') {
    send(res, 200, { trash: await store.listTrash() });
    return true;
  }

  if (path === '/api/trash/restore' && req.method === 'POST') {
    const body = (await readBody(req)) as { name?: string; id?: string };
    const id = await store.untrash(body.name ?? body.id ?? '');
    if (!id) send(res, 404, { error: 'nothing like that in the trash' });
    else send(res, 200, { restored: id });
    return true;
  }

  if (path === '/api/books') {
    send(res, 200, { books: await store.listBooks() });
    return true;
  }

  if (path === '/api/boards') {
    send(res, 200, { boards: await store.listBoards() });
    return true;
  }

  if (path === '/api/state') {
    const kind = url.searchParams.get('kind') ?? 'board';
    const id = url.searchParams.get('id') ?? url.searchParams.get('board') ?? ask.board;
    send(res, 200, { spec: kind === 'book' ? await live.book(id) : await live.board(id) });
    return true;
  }

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

  if (path === '/api/events') {
    const id = `${url.searchParams.get('kind') ?? 'board'}:${
      url.searchParams.get('id') ?? url.searchParams.get('board') ?? ask.board
    }`;
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    });
    res.write(': open\n\n');
    const leave = live.subscribe(id, res, url.searchParams.get('client') ?? undefined);
    req.on('close', leave);
    return true;
  }

  if (path === '/api/patch' && req.method === 'POST') {
    const body = (await readBody(req)) as {
      kind?: string;
      id?: string;
      board?: string;
      ops?: Op[] | BookOp[];
    };
    if (body.kind === 'book') {
      await patchBook(ask, live, body.id ?? 'notebook', (body.ops ?? []) as BookOp[]);
      return true;
    }
    await patchBoard(ask, live, body.id ?? body.board ?? ask.board, (body.ops ?? []) as Op[]);
    return true;
  }

  /*
   * Things moved from one surface to another: from a page to the board, from the board to a
   * page, or between two pages. Taken off the one and put on the other as one request, keeping
   * where they lie relative to each other; on a page they go in at its margins, on a board beside
   * what is already there. Ids that are taken where they arrive get new ones.
   */
  if (path === '/api/items/move' && req.method === 'POST') {
    const body = (await readBody(req)) as { from?: string; to?: string; ids?: unknown };
    const from = body.from ?? '';
    const to = body.to ?? '';
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((x): x is string => typeof x === 'string')
      : [];
    if (!from || !to || from === to || ids.length === 0) {
      send(res, 400, { error: 'from, to and ids are needed, and from is not to' });
      return true;
    }
    const source = await live.board(from);
    const target = await live.board(to);
    const chosen = new Set(ids);
    const moving = source.items.filter((item) => chosen.has(item.id));
    if (moving.length === 0) {
      send(res, 404, { error: 'none of those are there' });
      return true;
    }
    const minX = Math.min(...moving.map((i) => i.at[0]));
    const minY = Math.min(...moving.map((i) => i.at[1]));
    let base: [number, number];
    if (target.sheet) base = [40, 44];
    else if (target.items.length) {
      const right = Math.max(...target.items.map((i) => i.at[0] + (i.size?.[0] ?? 240)));
      const top = Math.min(...target.items.map((i) => i.at[1]));
      base = [Math.round(right + 80), Math.round(top)];
    } else base = [80, 80];
    const taken = new Set(target.items.map((i) => i.id));
    const renamed = new Map<string, string>();
    for (const item of moving) {
      let id = item.id;
      for (let n = 2; taken.has(id); n += 1) id = `${item.id}-${n}`;
      taken.add(id);
      renamed.set(item.id, id);
    }
    const z = topZ(target);
    const adds: Op[] = moving.map((item, i) => ({
      op: 'add',
      item: {
        ...item,
        id: renamed.get(item.id) ?? item.id,
        at: [base[0] + item.at[0] - minX, base[1] + item.at[1] - minY] as [number, number],
        z: z + 1 + i,
      },
    }));
    try {
      const put = await applyBoard(live, to, adds);
      const taken2 = await applyBoard(
        live,
        from,
        moving.map((item) => ({ op: 'remove', id: item.id })),
      );
      send(res, 200, { from: taken2, to: put, ids: [...renamed.values()] });
    } catch (error) {
      send(res, error instanceof PatchError ? 409 : 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  /*
   * Writing, for an agent: pour blocks into a notebook page after page (split where each page is
   * full, measured), see where everything on a page really is, and tidy a set of items. See
   * host/write.ts and docs/writing.md.
   */
  if (path === '/api/write' && req.method === 'POST') {
    const body = (await readBody(req)) as { book?: string; blocks?: Block[]; from?: number };
    const book = await live.book(body.book ?? 'notebook');
    const blocks = Array.isArray(body.blocks) ? body.blocks : [];
    if (!blocks.length) {
      send(res, 400, {
        error: 'blocks are needed: headings, text, bullets, tables, pictures, notes...',
      });
      return true;
    }
    const plan = await planFlow(book, blocks);
    const from = Math.max(1, Math.floor(body.from ?? firstEmptyPage(book)));
    const col = column(book);
    const stamp = Date.now().toString(36);
    const leaves = boundLeaves(book);
    const ops: BookOp[] = plan.pages.map((chunk, k) => ({
      op: 'leaf.items',
      id: leaves[from - 1 + k]?.id ?? `blank-${from + k}`,
      ops: [
        {
          op: 'add',
          item: {
            id: `flow-${stamp}-${k + 1}`,
            at: col.at,
            size: [col.width],
            block: { kind: 'stack', blocks: chunk },
          },
        },
      ],
    }));
    const result = applyBook(book, ops);
    await live.commitBook(result.spec);
    live.broadcast(`book:${book.id}`, 'reload', {});
    const pages = plan.pages.map((_, k) => from + k);
    send(res, 200, {
      pages,
      measured: plan.measured,
      warnings: plan.warnings,
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
    };
    const address = body.board ?? ask.board;
    const spec = await live.board(address);
    const report = await layoutOf(spec);
    const moves = tidyMoves(spec.items, report.items, body.ids ?? [], {
      as: body.as ?? 'column',
      ...(body.gap !== undefined ? { gap: body.gap } : {}),
      ...(body.at ? { at: body.at } : {}),
      ...(body.columns ? { columns: body.columns } : {}),
    });
    const reply = moves.length ? await applyBoard(live, address, moves) : undefined;
    send(res, 200, { moved: moves.length, measured: report.measured, reply });
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
      await exportPages([{ page: rendered, out }]);
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

  if (path === '/api/assets' && req.method === 'POST') {
    const bytes = await readRaw(req);
    const name = await store.putAsset(bytes, extname(url.searchParams.get('name') ?? '.png'));
    send(res, 200, { name, path: store.assetPath(name) });
    return true;
  }

  return false;
}

async function patchBoard(ask: Ask, live: Live, id: string, ops: Op[]): Promise<void> {
  let payload: BoardReply;
  try {
    payload = await applyBoard(live, id, ops, header(ask.req, 'x-grimstroke-client'));
  } catch (error) {
    send(ask.res, error instanceof PatchError ? 409 : 500, {
      error: error instanceof Error ? error.message : String(error),
    });
    return;
  }
  send(ask.res, 200, payload);
}

export type BoardReply = {
  version: number;
  removed: string[];
  reset: boolean;
  placed: Array<{ id: string; at: [number, number]; z: number }>;
  changed: Array<{ id: string; html: string }>;
};

/** Apply board operations to a board or a page, write them through, and tell its watchers. */
export async function applyBoard(
  live: Live,
  id: string,
  ops: Op[],
  exceptTab?: string,
): Promise<BoardReply> {
  const spec = await live.board(id);
  const result = apply(spec, ops);
  await live.commitBoard(result.spec);

  /*
   * Positions travel as positions.
   *
   * Every changed item used to come back as freshly rendered markup, so dragging a
   * screenshot across the board re-rendered it -- mount, marks and all -- once per pointer
   * event, and posted the whole thing back to a browser that already had it. An item whose
   * only change is where it is, or how high in the pile, is sent as that and nothing more.
   */
  // A stroke that changed places in the pile may be sharing a surface with its neighbours,
  // where only document order stacks it: it comes back drawn, on its own, at its new height.
  const restacked = new Set(
    ops.flatMap((op) =>
      op.op === 'order' && result.spec.items.find((i) => i.id === op.id)?.ink ? [op.id] : [],
    ),
  );
  const placed = new Set(result.placed.filter((itemId) => !restacked.has(itemId)));
  const items = new Map(result.spec.items.map((item) => [item.id, item]));
  const payload: BoardReply = {
    version: result.spec.version ?? 0,
    removed: result.removed,
    reset: result.reset,
    placed: [...placed].map((itemId) => {
      const item = items.get(itemId);
      return { id: itemId, at: (item?.at ?? [0, 0]) as [number, number], z: item?.z ?? 0 };
    }),
    changed: result.changed
      .filter((itemId) => !placed.has(itemId))
      .map((itemId) => {
        const drawn = renderOneItem(result.spec, itemId);
        if (drawn) live.allow(drawn.assets);
        return { id: itemId, html: drawn?.html ?? '' };
      }),
  };
  live.broadcast(`board:${id}`, 'patch', payload, exceptTab);
  return payload;
}

async function patchBook(ask: Ask, live: Live, id: string, ops: BookOp[]): Promise<void> {
  const spec = await live.book(id);
  let result: ReturnType<typeof applyBook>;
  try {
    result = applyBook(spec, ops);
  } catch (error) {
    send(ask.res, error instanceof BookPatchError ? 409 : 500, {
      error: error instanceof Error ? error.message : String(error),
    });
    return;
  }
  await live.commitBook(result.spec);
  const payload = {
    version: result.spec.version ?? 0,
    removed: result.removed,
    reset: result.reset,
    changed: result.changed.map((leafId) => {
      const index = result.spec.leaves.findIndex((leaf) => leaf.id === leafId);
      const drawn = index < 0 ? undefined : renderOneLeaf(result.spec, index);
      if (drawn) live.allow(drawn.assets);
      return { id: leafId, html: drawn?.html ?? '' };
    }),
  };
  send(ask.res, 200, payload);
  live.broadcast(`book:${id}`, 'patch', payload, header(ask.req, 'x-grimstroke-client'));
}

/**
 * An id made from a name: lower case, words joined by dashes, anything else dropped.
 *
 * ASCII only, because the id is a filename and the store refuses anything else -- and it
 * refuses by REPLACING, so two Persian names that both became dashes would have been the same
 * file. A name with no Latin letters in it is given an id from its hash instead, which is
 * stable for the name and different for every other.
 */
function slug(name: string): string {
  const cleaned = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return /[a-z0-9]/.test(cleaned) ? cleaned : `notebook-${hashString(name).toString(36)}`;
}
