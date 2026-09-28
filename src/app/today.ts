/**
 * The day page: a tap ticks a list, marks something done or keeps a habit, on the card itself
 * wherever it lives. The server does it and draws the day again; nothing is drawn here.
 */

import { toast } from '~/app/chrome.ts';
import { appear, play } from '~/app/feel.ts';

export function bootToday(): boolean {
  const main = document.querySelector<HTMLElement>('[data-gs="today"]');
  if (!main) return false;
  // The day's rows come in one after another, as a morning page being set out.
  for (const [n, card] of [...main.querySelectorAll('.td-card')].entries()) appear(card, n * 40);
  main.addEventListener('click', async (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-td-act]');
    if (!button || button.disabled) return;
    const on = button.getAttribute('aria-pressed') !== 'true';
    button.disabled = true;
    button.setAttribute('aria-pressed', String(on));
    play(on ? 'tick' : 'untick');
    try {
      const res = await fetch('/api/today/act', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          address: button.dataset.address,
          id: button.dataset.id,
          act: button.dataset.tdAct,
          index: button.dataset.index === undefined ? undefined : Number(button.dataset.index),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const { html } = (await res.json()) as { html: string };
      // A moment for the tick to be seen before a finished list folds away.
      window.setTimeout(() => {
        // Our own server's markup, drawn by draw/today.
        main.innerHTML = html;
      }, 260);
    } catch {
      button.setAttribute('aria-pressed', String(!on));
      toast('that did not save -- is the workspace running?', 'error');
    } finally {
      button.disabled = false;
    }
  });
  return true;
}
