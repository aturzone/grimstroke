/**
 * The / board, as data: every card the box made, wherever it lives, and the few things done to
 * one -- change it, put a new one down, let one go. The page is a face's; when there is one, the
 * answers carry its column drawn again.
 *
 * What the box makes from this page goes onto a board of its own, SLASH_BOARD, so the box can
 * be used from anywhere without asking where; a card made on a board or a notebook page stays
 * where it was made, and is shown here all the same.
 */

import type { ShapeBlock } from '@core/box/card.ts';
import { summarize } from '@core/box/card.ts';
import { isDone, type SlashEntry } from '@core/box/slash.ts';
import { nextSpot } from '@core/docs/board-extent.ts';
import { topZ } from '@core/docs/board-patch.ts';
import { NOTE_HEIGHT, NOTE_WIDTH } from '@core/docs/note.ts';
import { applyBoard } from '@core/serve/api.ts';
import { face } from '@core/serve/face.ts';
import { type Ask, readBody, send } from '@core/serve/http.ts';
import type { Live } from '@core/serve/live.ts';
import { todaySources } from '@core/serve/today.ts';

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

/** The / board's column drawn again by the face, for the page that changed it; nothing without one. */
async function drawn(live: Live, home: string): Promise<{ html?: string }> {
  const drawing = face()?.slash;
  return drawing ? { html: drawing(await slashEntries(live, home), new Date()) } : {};
}

/** The board the box writes to, named the first time it is used. */
async function slashBoard(live: Live): Promise<void> {
  const spec = await live.board(SLASH_BOARD);
  if (!spec.title)
    await applyBoard(live, SLASH_BOARD, [{ op: 'board', patch: { title: 'made with /' } }]);
}

export async function slash(ask: Ask, live: Live): Promise<boolean> {
  const { path, req, res } = ask;

  // The core alone draws nothing: its front door says what it is and where to ask.
  if ((path === '/' || path === '/index.html') && !face()) {
    send(res, 200, {
      name: 'grimstroke',
      what: 'the core: documents as data, the / box, the day, reminders, repositories',
      capabilities: '/api/capabilities',
    });
    return true;
  }

  // For an agent: every card, where it is, what it says, and whether it is done.
  if (path === '/api/slash' && req.method === 'GET') {
    const now = new Date();
    const entries = await slashEntries(live, ask.board);
    send(res, 200, {
      board: SLASH_BOARD,
      // The page itself asks for its own markup with ?html, to draw again what changed elsewhere.
      ...(ask.url.searchParams.has('html') && face()?.slash
        ? { html: face()?.slash?.(entries, now) }
        : {}),
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
    const id = `card-${Date.now().toString(36)}`;
    const width = Math.min(560, Math.max(280, Number(body.width) || 360));
    await applyBoard(live, SLASH_BOARD, [
      {
        op: 'add',
        item: {
          id,
          at: nextSpot(spec),
          z: topZ(spec) + 1,
          size: block.kind === 'note' ? [NOTE_WIDTH, NOTE_HEIGHT] : [width],
          block: block as never,
        },
      },
    ]);
    send(res, 200, { id, address: SLASH_BOARD, ...(await drawn(live, ask.board)) });
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
    send(res, 200, { ...(await drawn(live, ask.board)) });
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
    send(res, 200, { item, ...(await drawn(live, ask.board)) });
    return true;
  }

  if (path === '/api/slash/restore' && req.method === 'POST') {
    const body = (await readBody(req)) as { address?: string; item?: { id?: string } };
    if (!body.address || !body.item?.id) {
      send(res, 400, { error: 'an address and the item are needed' });
      return true;
    }
    await applyBoard(live, body.address, [{ op: 'add', item: body.item as never }]);
    send(res, 200, { ...(await drawn(live, ask.board)) });
    return true;
  }

  return false;
}
