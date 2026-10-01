/**
 * The / board, served: the page, the cards as data for an agent, and the few things the page
 * does to a card -- change it, put a new one down, let one go.
 *
 * What the box makes from this page goes onto a board of its own, SLASH_BOARD, so the box can
 * be used from anywhere without asking where; a card made on a board or a notebook page stays
 * where it was made, and is shown here all the same.
 */

import { topZ } from '~/draw/doc/board/patch.ts';
import { NOTE_HEIGHT, NOTE_WIDTH } from '~/draw/material/note/model.ts';
import type { ShapeBlock } from '~/draw/shape/render.ts';
import { summarize } from '~/draw/shape/render.ts';
import { slashDocument } from '~/draw/slash/page.ts';
import { isDone, renderSlashMain, type SlashEntry } from '~/draw/slash/render.ts';
import { applyBoard } from '~/host/serve/api.ts';
import { type Drawn, face } from '~/host/serve/face.ts';
import { type Ask, boxUrl, html, readBody, send } from '~/host/serve/http.ts';
import type { Live } from '~/host/serve/live.ts';
import { lookOf, THEME_PALETTE, withLook } from '~/host/serve/look.ts';
import { todaySources } from '~/host/serve/today.ts';

/** Where the box puts what it makes when nobody said where. */
export const SLASH_BOARD = 'slash';

/** Every card the box made, on every board and every page in use. */
export async function slashEntries(live: Live, home: string): Promise<SlashEntry[]> {
  const out: SlashEntry[] = [];
  for (const source of await todaySources(live, home)) {
    for (const item of source.items) {
      if (item.block?.kind !== 'shape') continue;
      out.push({
        address: source.address,
        id: item.id,
        block: item.block as unknown as ShapeBlock,
        where: {
          title:
            source.address === SLASH_BOARD
              ? 'made with /'
              : source.address === home && source.title === home
                ? 'the board'
                : source.title,
          href: source.href,
        },
      });
    }
  }
  return out;
}

async function drawn(live: Live, home: string): Promise<string> {
  return renderSlashMain(await slashEntries(live, home), new Date());
}

/** The board the box writes to, named the first time it is used. */
async function slashBoard(live: Live): Promise<void> {
  const spec = await live.board(SLASH_BOARD);
  if (!spec.title)
    await applyBoard(live, SLASH_BOARD, [{ op: 'board', patch: { title: 'made with /' } }]);
}

export async function slash(ask: Ask, live: Live): Promise<boolean> {
  const { path, req, res } = ask;

  // The core alone has one page, and it is the way in.
  if ((path === '/' || path === '/index.html') && !face()) {
    res.writeHead(302, { location: '/slash' });
    res.end();
    return true;
  }

  if (path === '/slash') {
    const look = await lookOf(live.store);
    const main = await drawn(live, ask.board);
    // In the face's frame when there is a face; in the core's own page when there is not.
    const frame = face()?.frame;
    const page: Drawn = frame
      ? frame({
          id: 'slash',
          title: 'everything made with /',
          short: 'made with /',
          main,
          palette: THEME_PALETTE[look.theme],
        })
      : { html: slashDocument(main, { scripts: [boxUrl()], theme: look.theme }) };
    if (page.assets) live.allow(page.assets);
    html(res, withLook(page.html, look, 'board', false));
    return true;
  }

  // For an agent: every card, where it is, what it says, and whether it is done.
  if (path === '/api/slash' && req.method === 'GET') {
    const now = new Date();
    const entries = await slashEntries(live, ask.board);
    send(res, 200, {
      board: SLASH_BOARD,
      // The page itself asks for its own markup with ?html, to draw again what changed elsewhere.
      ...(ask.url.searchParams.has('html') ? { html: renderSlashMain(entries, now) } : {}),
      cards: entries.map((e) => ({
        ...e,
        summary: summarize(e.block, now),
        done: isDone(e.block),
      })),
    });
    return true;
  }

  // A new card from the box: onto the / board, under what is there.
  if (path === '/api/slash/add' && req.method === 'POST') {
    const body = (await readBody(req)) as {
      block?: ShapeBlock | { kind: 'note'; text: string };
      width?: number;
    };
    const block = body.block;
    if (
      !block ||
      (block.kind !== 'shape' && block.kind !== 'note') ||
      typeof block.text !== 'string'
    ) {
      send(res, 400, { error: 'a shape block or a note is needed' });
      return true;
    }
    await slashBoard(live);
    const spec = await live.board(SLASH_BOARD);
    const bottom = spec.items.length
      ? Math.max(...spec.items.map((i) => i.at[1] + (i.size?.[1] ?? 240)))
      : 0;
    const id = `card-${Date.now().toString(36)}`;
    const width = Math.min(560, Math.max(280, Number(body.width) || 360));
    await applyBoard(live, SLASH_BOARD, [
      {
        op: 'add',
        item: {
          id,
          at: [80, Math.round(bottom + 40)],
          z: topZ(spec) + 1,
          size: block.kind === 'note' ? [NOTE_WIDTH, NOTE_HEIGHT] : [width],
          block: block as never,
        },
      },
    ]);
    send(res, 200, { id, address: SLASH_BOARD, html: await drawn(live, ask.board) });
    return true;
  }

  // A card changed on this page: ticked, voted, its timer started, its words or fields edited.
  if (path === '/api/slash/save' && req.method === 'POST') {
    const body = (await readBody(req)) as { address?: string; id?: string; block?: ShapeBlock };
    const spec = body.address ? await live.board(body.address) : undefined;
    const item = spec?.items.find((i) => i.id === body.id);
    if (!body.address || !item || item.block?.kind !== 'shape' || body.block?.kind !== 'shape') {
      send(res, 404, { error: 'no such card' });
      return true;
    }
    await applyBoard(live, body.address, [
      { op: 'update', id: item.id, patch: { block: body.block as never } },
    ]);
    send(res, 200, { html: await drawn(live, ask.board) });
    return true;
  }

  if (path === '/api/slash/delete' && req.method === 'POST') {
    const body = (await readBody(req)) as { address?: string; id?: string };
    const spec = body.address ? await live.board(body.address) : undefined;
    const item = spec?.items.find((i) => i.id === body.id);
    if (!body.address || !item) {
      send(res, 404, { error: 'no such card' });
      return true;
    }
    await applyBoard(live, body.address, [{ op: 'remove', id: item.id }]);
    // What was let go, so the page can offer it back.
    send(res, 200, { item, html: await drawn(live, ask.board) });
    return true;
  }

  if (path === '/api/slash/restore' && req.method === 'POST') {
    const body = (await readBody(req)) as { address?: string; item?: { id?: string } };
    if (!body.address || !body.item?.id) {
      send(res, 400, { error: 'an address and the item are needed' });
      return true;
    }
    await applyBoard(live, body.address, [{ op: 'add', item: body.item as never }]);
    send(res, 200, { html: await drawn(live, ask.board) });
    return true;
  }

  return false;
}
