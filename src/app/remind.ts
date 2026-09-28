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
  // With push, the server tells this device itself; the tab would only say it twice.
  if (pushOn()) return;
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

/**
 * This device, subscribed at the workspace's push service: from here on the server tells it,
 * with the page shut. The server sends a first one at once so the person sees it works.
 */
async function subscribePush(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    const { publicKey } = (await (await fetch('/api/push/key')).json()) as { publicKey: string };
    const key = Uint8Array.from(atob(publicKey.replace(/-/g, '+').replace(/_/g, '/')), (c) =>
      c.charCodeAt(0),
    );
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }));
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(sub.toJSON()),
    });
    if (!res.ok) return false;
    try {
      localStorage.setItem('gs-push', '1');
    } catch {
      // Not remembered: the tab also says what is due, which is harmless.
    }
    return true;
  } catch {
    return false;
  }
}

function pushOn(): boolean {
  try {
    return localStorage.getItem('gs-push') === '1';
  } catch {
    return false;
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
    const answer = await Notification.requestPermission();
    offer();
    if (answer === 'granted') await subscribePush();
    void check();
  });
  // Only the day page redraws the button; the board's constant changes are not watched.
  const day = document.querySelector('[data-gs="today"]');
  if (day) new MutationObserver(offer).observe(day, { childList: true });
  // Allowed before: keep this device's subscription fresh (it can change under the browser).
  if (Notification.permission === 'granted') void subscribePush();
  void check();
  window.setInterval(() => void check(), 60_000);
}
