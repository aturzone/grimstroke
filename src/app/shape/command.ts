/**
 * Doing what the / box was asked: going somewhere, or changing something. What each command is
 * and how it is recognised is in draw/shape/commands.ts; this is only the doing.
 */

import { RepoSetup } from '~/app/book/repo.ts';
import { toast } from '~/app/chrome.ts';
import { remindHere } from '~/app/remind.ts';
import type { CommandMatch } from '~/draw/shape/commands.ts';

async function post(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function runCommand(match: CommandMatch): Promise<void> {
  const { command, arg } = match;
  switch (command.id) {
    case 'theme-dark':
    case 'theme-light': {
      const res = await post('/api/look', {
        theme: command.id === 'theme-dark' ? 'dark' : 'light',
      });
      if (!res.ok) {
        toast('the theme could not be changed', 'error');
        return;
      }
      location.reload();
      return;
    }
    case 'new-notebook': {
      const res = await post('/api/books', { title: arg || 'Untitled' });
      if (!res.ok) {
        toast('the notebook was not made', 'error');
        return;
      }
      const { id } = (await res.json()) as { id: string };
      location.href = `/book?id=${encodeURIComponent(id)}&cover`;
      return;
    }
    case 'search': {
      const open = document.querySelector<HTMLElement>('[data-gs="search-open"]');
      if (!open) {
        toast('there is no search on this page', 'error');
        return;
      }
      open.click();
      const input = document.querySelector<HTMLInputElement>('[data-gs="search-input"]');
      if (input && arg) {
        input.value = arg;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return;
    }
    case 'connect':
      await new RepoSetup(undefined).open();
      return;
    case 'remind-device':
      toast(
        (await remindHere())
          ? 'this device will be reminded before what is planned'
          : 'reminders were not allowed on this device -- the browser decides, in its site settings',
        'info',
      );
      return;
    case 'backup': {
      const a = document.createElement('a');
      a.href = '/api/archive';
      a.download = '';
      document.body.append(a);
      a.click();
      a.remove();
      return;
    }
    default:
      if (command.href) location.href = command.href;
  }
}
