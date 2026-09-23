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
import { apply as applyBook, type BookOp, BookPatchError } from '~/draw/doc/book/patch.ts';
import { renderCover, renderOneLeaf } from '~/draw/doc/book/render.ts';
import { search } from '~/draw/doc/search.ts';
import { surface } from '~/draw/doc/surface.ts';
import { hashString } from '~/draw/look/rng.ts';
import type { Character } from '~/draw/material/face/model.ts';
import { exportPages } from '~/host/export.ts';
import { type Ask, header, readBody, readRaw, send } from '~/host/serve/http.ts';
import type { Live } from '~/host/serve/live.ts';
import { ArchiveError, pack, readArchive, unpack } from '~/host/store/archive.ts';

export async function api(ask: Ask, live: Live): Promise<boolean> {
  const { req, res, url, path } = ask;
  const store = live.store;

  if (path === '/api/face' && req.method === 'POST') {
    const body = (await readBody(req)) as { character?: Character };
    if (!body.character?.id) {
      send(res, 400, { error: 'a character needs an id' });
      return true;
    }
    await store.writeFace(body.character);
    send(res, 200, { id: body.character.id });
    return true;
  }

  if (path === '/api/face' && req.method === 'DELETE') {
    const id = url.searchParams.get('id');
    if (!id) {
      send(res, 400, { error: 'which character?' });
      return true;
    }
    await store.removeFace(id);
    send(res, 200, { id });
    return true;
  }

  if (path === '/api/faces') {
    const list: Character[] = [];
    for (const id of await store.listFaces()) {
      const one = await store.readFace(id);
      if (one) list.push(one);
    }
    send(res, 200, { faces: list });
    return true;
  }

  /** Put a character onto the board, as an item like any other. */
  if (path === '/api/face/place' && req.method === 'POST') {
    const body = (await readBody(req)) as { character?: Character; board?: string; card?: boolean };
    if (!body.character) {
      send(res, 400, { error: 'no character' });
      return true;
    }
    const spec = await live.board(body.board ?? ask.board);
    // Somewhere visible rather than at the origin: the middle of whatever is already
    // there, so it lands on the part of the board somebody is actually looking at.
    const [x, y, w, h] = extentOf(spec);
    // A face, or with `card`, the whole profile card.
    const item = body.card
      ? {
          id: `card-${Date.now().toString(36)}`,
          at: [Math.round(x + w / 2 - 140), Math.round(y + h / 2 - 200)] as [number, number],
          size: [280] as [number],
          z: topZ(spec) + 1,
          block: { kind: 'profile' as const, character: body.character },
        }
      : {
          id: `face-${Date.now().toString(36)}`,
          at: [Math.round(x + w / 2 - 90), Math.round(y + h / 2 - 100)] as [number, number],
          size: [180] as [number],
          z: topZ(spec) + 1,
          block: { kind: 'face' as const, character: body.character, badge: true },
        };
    const result = apply(spec, [{ op: 'add', item }]);
    await live.commitBoard(result.spec);
    send(res, 200, { id: item.id });
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
   * Search, across every board, every notebook -- the archived ones too -- and every person.
   *
   * Read from the store rather than from what happens to be cached, so a notebook nobody has
   * opened since the server started is as findable as the one on screen.
   */
  if (path === '/api/search') {
    const query = (url.searchParams.get('q') ?? '').slice(0, 200);
    const boards = await Promise.all((await store.listBoards()).map((id) => live.board(id)));
    const books = await Promise.all((await store.listBooks()).map((id) => live.book(id)));
    const faces: Character[] = [];
    for (const id of await store.listFaces()) {
      const face = await store.readFace(id);
      if (face) faces.push(face);
    }
    send(res, 200, { query, hits: search({ boards, books, faces }, query) });
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

  if (path === '/api/export' && req.method === 'POST') {
    const body = (await readBody(req)) as { board?: string; only?: string[] };
    const id = body.board ?? ask.board;
    const spec = await live.board(id);
    // A selection travels as a list of ids rather than as a rectangle, so the export
    // captures the items that were chosen and not whatever happens to overlap them.
    let subject: BoardSpec = spec;
    if (body.only?.length) {
      const chosen = new Set(body.only);
      // The pinned extent goes with it: that one is the whole sheet, and an export of three
      // notes should be three notes and a margin, not three notes adrift on it.
      const { extent: _sheet, ...rest } = spec;
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
  const spec = await live.board(id);
  let result: ReturnType<typeof apply>;
  try {
    result = apply(spec, ops);
  } catch (error) {
    send(ask.res, error instanceof PatchError ? 409 : 500, {
      error: error instanceof Error ? error.message : String(error),
    });
    return;
  }
  await live.commitBoard(result.spec);

  /*
   * Positions travel as positions.
   *
   * Every changed item used to come back as freshly rendered markup, so dragging a
   * screenshot across the board re-rendered it -- mount, marks and all -- once per pointer
   * event, and posted the whole thing back to a browser that already had it. An item whose
   * only change is where it is, or how high in the pile, is sent as that and nothing more.
   */
  const placed = new Set(result.placed);
  const items = new Map(result.spec.items.map((item) => [item.id, item]));
  const payload = {
    version: result.spec.version ?? 0,
    removed: result.removed,
    reset: result.reset,
    placed: result.placed.map((itemId) => {
      const item = items.get(itemId);
      return { id: itemId, at: item?.at ?? [0, 0], z: item?.z ?? 0 };
    }),
    changed: result.changed
      .filter((itemId) => !placed.has(itemId))
      .map((itemId) => {
        const drawn = renderOneItem(result.spec, itemId);
        if (drawn) live.allow(drawn.assets);
        return { id: itemId, html: drawn?.html ?? '' };
      }),
  };
  send(ask.res, 200, payload);
  live.broadcast(`board:${id}`, 'patch', payload, header(ask.req, 'x-grimstroke-client'));
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
