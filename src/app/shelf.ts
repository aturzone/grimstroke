/**
 * The shelf, as something you can use: a new notebook, and nothing else.
 *
 * Opening a notebook needs no script -- every book on a live shelf is a link.
 */

import { toast } from '~/app/chrome.ts';
import { onClick } from '~/app/dom.ts';

export function bootShelf(): boolean {
  const dialog = document.querySelector<HTMLDialogElement>('[data-gs="book-new-dialog"]');
  if (!dialog) return false;
  const input = dialog.querySelector<HTMLInputElement>('[data-gs="book-new-title"]');
  onClick('book-new', () => {
    if (input) input.value = '';
    dialog.showModal();
  });
  dialog.addEventListener('close', async () => {
    if (dialog.returnValue !== 'make' || !input?.value.trim()) return;
    const res = await fetch('/api/books', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: input.value.trim() }),
    });
    if (!res.ok) {
      toast('the notebook could not be made', 'error');
      return;
    }
    const { id } = (await res.json()) as { id: string };
    window.location.href = `/book?id=${encodeURIComponent(id)}`;
  });
  return true;
}
