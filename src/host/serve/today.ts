/**
 * The day, served: the page a person opens first thing, GET /api/today for an agent, and the
 * few taps the page can make on a card.
 *
 * Every board and every page of every notebook in use is read, and the pure gathering in
 * draw/today does the rest. A tap is applied as the card's own patch, through the same path
 * as every other edit, so a board open in another tab moves with it.
 */

import { bookTitle, boundLeaves } from '~/draw/doc/book/model.ts';
import { upgradeLeaf } from '~/draw/doc/legacy.ts';
import type { ShapeBlock } from '~/draw/shape/render.ts';
import { gatherToday, type TodayAct, type TodaySource, todayAct } from '~/draw/today/gather.ts';
import { renderTodayMain, renderTodayPage } from '~/draw/today/render.ts';
import { applyBoard } from '~/host/serve/api.ts';
import { type Ask, html, readBody, send } from '~/host/serve/http.ts';
import type { Live } from '~/host/serve/live.ts';
import { lookOf, withLook } from '~/host/serve/look.ts';

/** Every place a card can be: each board, and each page of each notebook still in use. */
export async function todaySources(live: Live, home: string): Promise<TodaySource[]> {
  const out: TodaySource[] = [];
  for (const id of await live.store.listBoards()) {
    if (id.startsWith('book:')) continue;
    const spec = await live.board(id);
    out.push({
      address: id,
      title: spec.title ?? id,
      href: id === home ? '/' : `/?board=${encodeURIComponent(id)}`,
      items: spec.items,
    });
  }
  for (const id of await live.store.listBooks()) {
    const book = await live.book(id);
    if (book.archived) continue;
    boundLeaves(book).forEach((leaf, i) => {
      const items = upgradeLeaf(leaf).items ?? [];
      if (!items.some((it) => it.block?.kind === 'shape')) return;
      out.push({
        address: `book:${id}:${i + 1}`,
        title: `${bookTitle(book)} · page ${i + 1}`,
        href: `/page?book=${encodeURIComponent(id)}&leaf=${i + 1}`,
        items,
      });
    });
  }
  return out;
}

export async function today(ask: Ask, live: Live, scripts: string[]): Promise<boolean> {
  const { path, req, res } = ask;

  if (path === '/today') {
    const now = new Date();
    const rendered = renderTodayPage(gatherToday(await todaySources(live, ask.board), now), now, {
      live: { scripts },
    });
    live.allow(rendered.assets);
    html(res, withLook(rendered.html, await lookOf(live.store), 'board', false));
    return true;
  }

  // For an agent: the same day, as data -- what to remind someone of, what to plan around.
  if (path === '/api/today' && req.method === 'GET') {
    send(res, 200, gatherToday(await todaySources(live, ask.board), new Date()));
    return true;
  }

  if (path === '/api/today/act' && req.method === 'POST') {
    const body = (await readBody(req)) as {
      address?: string;
      id?: string;
      act?: string;
      index?: number;
    };
    const address = body.address ?? '';
    const spec = await live.board(address);
    const item = spec.items.find((i) => i.id === body.id);
    const block = item?.block?.kind === 'shape' ? (item.block as unknown as ShapeBlock) : undefined;
    const action: TodayAct | undefined =
      body.act === 'tick'
        ? { act: 'tick', index: Number(body.index) || 0 }
        : body.act === 'done'
          ? { act: 'done' }
          : body.act === 'habit'
            ? { act: 'habit' }
            : undefined;
    const now = new Date();
    const state = block && action ? todayAct(block, action, now) : undefined;
    if (!item || !block || !state) {
      send(res, 404, { error: 'no such card, or it cannot do that' });
      return true;
    }
    await applyBoard(live, address, [
      { op: 'update', id: item.id, patch: { block: { ...block, state } as never } },
    ]);
    send(res, 200, {
      html: renderTodayMain(gatherToday(await todaySources(live, ask.board), now), now),
    });
    return true;
  }

  return false;
}
