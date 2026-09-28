/**
 * Reminders that reach you: a system notification when a reminder is due, and five minutes
 * before an event, while any grimstroke tab is open in the browser.
 *
 * Asked for once, from a button on the day page, and never on its own. Quiet hours hold.
 * Each thing is announced once (remembered in this browser), and a click on the notification
 * goes to the card. A page that is shut cannot notify: that needs an installed app, planned in
 * docs/daily.md.
 */

import { hushed } from '~/app/feel.ts';
import type { TodayData, TodayEntry } from '~/draw/today/gather.ts';

const EARLY_MS = 5 * 60_000;
const STALE_MS = 15 * 60_000;

function said(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function remember(key: string): void {
  try {
    localStorage.setItem(key, '1');
  } catch {
    // Unremembered: at worst it is said again after a reload.
  }
}

function due(e: TodayEntry, now: number): number | undefined {
  if (e.done || !e.when || !e.hasTime) return undefined;
  const at = new Date(e.when).getTime() - (e.kind === 'event' ? EARLY_MS : 0);
  return now >= at && now - at < STALE_MS ? at : undefined;
}

async function check(): Promise<void> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if (hushed(new Date().getHours())) return;
  let day: TodayData;
  try {
    const res = await fetch('/api/today');
    if (!res.ok) return;
    day = (await res.json()) as TodayData;
  } catch {
    return;
  }
  const now = Date.now();
  for (const e of day.today) {
    const at = due(e, now);
    if (at === undefined) continue;
    const key = `gs-told:${e.address}:${e.id}:${e.when}`;
    if (said(key)) continue;
    remember(key);
    const soon = e.kind === 'event' ? 'in five minutes' : 'now';
    const note = new Notification(e.title, {
      body: `${soon} · ${e.where.title}`,
      tag: key,
    });
    note.onclick = () => {
      window.focus();
      location.href = e.where.href;
    };
  }
}

export function bootReminders(): void {
  if (typeof Notification === 'undefined') return;
  const offer = (): void => {
    for (const b of document.querySelectorAll<HTMLButtonElement>('[data-gs="remind-on"]'))
      b.hidden = Notification.permission !== 'default';
  };
  offer();
  // The day page draws itself again after a tap, so the button is found through the document.
  document.addEventListener('click', async (event) => {
    if (!(event.target as HTMLElement).closest('[data-gs="remind-on"]')) return;
    await Notification.requestPermission();
    offer();
    void check();
  });
  // Only the day page redraws the button; the board's constant changes are not watched.
  const day = document.querySelector('[data-gs="today"]');
  if (day) new MutationObserver(offer).observe(day, { childList: true });
  void check();
  window.setInterval(() => void check(), 60_000);
}
