/**
 * The profile page: put the card somewhere.
 *
 * Both places take the card BY VALUE -- what is sent is the character as it is now -- so the
 * board and the cover keep it as it was, whatever the studio does next.
 */

import { toast } from '~/app/chrome.ts';
import { onClick } from '~/app/dom.ts';
import type { Character } from '~/draw/material/face/model.ts';

export function bootProfile(): boolean {
  const stage = document.querySelector('[data-gs="profile-stage"]');
  if (!stage) return false;
  const raw = document.querySelector<HTMLElement>('[data-gs="face-data"]')?.textContent ?? '{}';
  const character = JSON.parse(raw) as Character;

  onClick('profile-print', () => window.print());
  onClick('profile-place', async () => {
    const res = await fetch('/api/face/place', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ character, card: true }),
    });
    if (res.ok) window.location.href = '/';
    else toast('the card could not be put on the board', 'error');
  });
  onClick('profile-cover', async () => {
    const book = document.querySelector<HTMLSelectElement>('[data-gs="profile-book"]')?.value;
    if (!book) return;
    const res = await fetch('/api/patch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        kind: 'book',
        id: book,
        ops: [{ op: 'cover', patch: { profile: character } }],
      }),
    });
    if (res.ok) window.location.href = `/book?id=${encodeURIComponent(book)}`;
    else toast('the cover could not be changed', 'error');
  });
  return true;
}
