/**
 * The day page, drawn: the calendar and the day under it. The day itself -- what is on it, and
 * what a tap does to a card -- is the core's (host/serve/today.ts); this is how it looks.
 */

import { calendarMonth, dayKey, gatherToday, type TodaySource } from '~/draw/today/gather.ts';
import { renderTodayMain, renderTodayPage } from '~/draw/today/render.ts';
import { type Ask, appUrl, html } from '~/host/serve/http.ts';
import type { Live } from '~/host/serve/live.ts';
import { lookOf, THEME_PALETTE, withLook } from '~/host/serve/look.ts';
import { dayOf, todaySources } from '~/host/serve/today.ts';

/** The day and the month it sits in: what the page shows, and what a tap draws again. */
export function drawDay(sources: TodaySource[], day: Date): string {
  const month = calendarMonth(sources, day.getFullYear(), day.getMonth(), new Date());
  return renderTodayMain(gatherToday(sources, day), day, {
    today: new Date(),
    days: month.days,
    year: day.getFullYear(),
    month: day.getMonth(),
  });
}

export async function todayPages(ask: Ask, live: Live): Promise<boolean> {
  const { path, res, url } = ask;
  if (path === '/calendar') {
    res.writeHead(302, { location: `/today${url.search}` });
    res.end();
    return true;
  }
  if (path === '/today') {
    const day = dayOf(url.searchParams.get('date'));
    const look = await lookOf(live.store);
    const rendered = renderTodayPage(
      drawDay(await todaySources(live, ask.board), day),
      dayKey(day),
      {
        live: { scripts: [appUrl()] },
        palette: THEME_PALETTE[look.theme],
      },
    );
    live.allow(rendered.assets);
    html(res, withLook(rendered.html, look, 'board', false));
    return true;
  }
  return false;
}
