/**
 * The day, as data: GET /api/today for an agent, and the few taps the day page can make on a
 * card. The page itself is the face's (face/today.ts), and so is the markup a tap answers with.
 *
 * Every board and every page of every notebook in use is read, and the pure gathering in
 * draw/today does the rest. A tap is applied as the card's own patch, through the same path
 * as every other edit, so a board open in another tab moves with it.
 */

import { bookTitle, boundLeaves } from '~/draw/doc/book/model.ts';
import { upgradeLeaf } from '~/draw/doc/legacy.ts';
import { NOTE_HEIGHT, NOTE_WIDTH } from '~/draw/material/note/model.ts';
import type { ShapeBlock } from '~/draw/shape/render.ts';
import {
  calendarMonth,
  dayKey,
  gatherToday,
  type TodayAct,
  type TodaySource,
  todayAct,
} from '~/draw/today/gather.ts';
import { applyBoard } from '~/host/serve/api.ts';
import { face } from '~/host/serve/face.ts';
import { type Ask, readBody, send } from '~/host/serve/http.ts';
import type { Live } from '~/host/serve/live.ts';

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

/** The day asked for (YYYY-MM-DD), at the moment it is if it is today and at noon if not. */
export function dayOf(asked: string | null | undefined): Date {
  const now = new Date();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(asked ?? '');
  if (!m) return now;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  if (Number.isNaN(d.getTime())) return now;
  return dayKey(d) === dayKey(now) ? now : d;
}

/** The day drawn again by the face, for the page that tapped; nothing without a face. */
function drawn(sources: TodaySource[], day: Date): { html?: string } {
  const html = face()?.day?.(sources, day);
  return html === undefined ? {} : { html };
}

export async function today(ask: Ask, live: Live): Promise<boolean> {
  const { path, req, res, url } = ask;

  // A month of days, as data: how many things fall on each and how many are done.
  if (path === '/api/calendar' && req.method === 'GET') {
    const now = new Date();
    const year = Number(url.searchParams.get('year')) || now.getFullYear();
    const month = Math.min(
      12,
      Math.max(1, Number(url.searchParams.get('month')) || now.getMonth() + 1),
    );
    const { days } = calendarMonth(await todaySources(live, ask.board), year, month - 1, now);
    send(res, 200, { year, month, today: dayKey(now), days });
    return true;
  }

  // For an agent: the same day, as data -- what to remind someone of, what to plan around.
  if (path === '/api/today' && req.method === 'GET') {
    send(
      res,
      200,
      gatherToday(await todaySources(live, ask.board), dayOf(url.searchParams.get('date'))),
    );
    return true;
  }

  // A card typed on the day page: onto the home board, under what is there, and the day again.
  if (path === '/api/today/add' && req.method === 'POST') {
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
    const spec = await live.board(ask.board);
    const placed = spec.items.filter((i) => Array.isArray(i.at));
    const left = placed.length ? Math.min(...placed.map((i) => i.at[0])) : 0;
    const bottom = placed.length
      ? Math.max(...placed.map((i) => i.at[1] + (i.size?.[1] ?? 240)))
      : 0;
    const id = `day-${Date.now().toString(36)}`;
    const z = placed.reduce((m, i) => Math.max(m, i.z ?? 0), 0) + 1;
    const width = Math.min(560, Math.max(280, Number(body.width) || 360));
    await applyBoard(live, ask.board, [
      {
        op: 'add',
        item: {
          id,
          at: [Math.round(left), Math.round(bottom + 60)],
          z,
          size: block.kind === 'note' ? [NOTE_WIDTH, NOTE_HEIGHT] : [width],
          block: block as never,
        },
      },
    ]);
    send(res, 200, { id, ...drawn(await todaySources(live, ask.board), new Date()) });
    return true;
  }

  if (path === '/api/today/act' && req.method === 'POST') {
    const body = (await readBody(req)) as {
      address?: string;
      id?: string;
      act?: string;
      index?: number;
      /** The day the page shows: a habit kept on it is kept on that day, not today. */
      date?: string;
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
    const day = dayOf(body.date);
    const state = block && action ? todayAct(block, action, day) : undefined;
    if (!item || !block || !state) {
      send(res, 404, { error: 'no such card, or it cannot do that' });
      return true;
    }
    await applyBoard(live, address, [
      { op: 'update', id: item.id, patch: { block: { ...block, state } as never } },
    ]);
    send(res, 200, { state, ...drawn(await todaySources(live, ask.board), day) });
    return true;
  }

  return false;
}
