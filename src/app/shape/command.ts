/**
 * Doing what the / box was asked: going somewhere, or changing something. What each command is
 * and how it is recognised is in draw/shape/commands.ts; this is only the doing.
 */

import { RepoSetup } from '~/app/book/repo.ts';
import { remindHere } from '~/app/remind.ts';
import { calendarPanel, notebooksPanel, settingsPanel } from '~/app/shape/panels.ts';
import { toast } from '~/app/toast.ts';
import { type CommandMatch, issueRef, languageOf } from '~/draw/shape/commands.ts';

/** Where a command that answers in the box puts its answer. */
export interface Panel {
  show(content: HTMLElement): void;
}

const LAST = 'gs-issue-repo';
function lastRepo(): string {
  try {
    return localStorage.getItem(LAST) ?? '';
  } catch {
    return '';
  }
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** A repository's open issues, in the box: each a link to it on its service. */
async function issueList(arg: string, mine: boolean, panel: Panel | undefined): Promise<void> {
  const { repo } = issueRef(arg);
  const q = new URLSearchParams({ last: lastRepo(), ...(repo ? { repo } : {}) });
  if (mine) q.set('mine', '1');
  const res = await fetch(`/api/remote/issues?${q}`);
  const reply = (await res.json()) as {
    error?: string;
    repo?: string;
    issues?: Array<{ number: string; title: string; url: string; labels: string[] }>;
  };
  if (!res.ok || !reply.issues) {
    toast(reply.error ?? 'the issues could not be read', 'error');
    return;
  }
  const box = el('div', 'ss-panel');
  box.append(
    el(
      'p',
      'ss-panel-head',
      `${reply.repo ?? ''} · ${reply.issues.length} open${mine ? ', yours' : ''}`,
    ),
  );
  const list = el('ul', 'ss-panel-list');
  for (const issue of reply.issues) {
    const li = el('li', '');
    const a = el('a', 'ss-panel-row');
    a.href = issue.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.append(el('b', '', `#${issue.number}`), el('span', '', issue.title));
    a.dir = 'auto';
    li.append(a);
    list.append(li);
  }
  if (!reply.issues.length) list.append(el('li', 'ss-panel-none', 'nothing open'));
  box.append(list);
  if (panel) panel.show(box);
}

/** Close, reopen or comment on an issue named by its number. */
async function issueAct(arg: string, action: 'close' | 'reopen' | 'comment'): Promise<void> {
  const { number, repo, words } = issueRef(arg);
  if (action === 'comment' && !words) {
    toast('say the comment after a colon: “comment #12: fixed in the last build”', 'error');
    return;
  }
  const res = await post('/api/remote/issues/act', {
    number,
    action,
    last: lastRepo(),
    ...(repo ? { repo } : {}),
    ...(action === 'comment' ? { body: words } : {}),
  });
  const reply = (await res.json()) as { error?: string; repo?: string; issue?: { url?: string } };
  if (!res.ok) {
    toast(reply.error ?? 'that did not happen', 'error');
    return;
  }
  const url = reply.issue?.url;
  toast(
    `#${number} ${action === 'close' ? 'closed' : action === 'reopen' ? 'open again' : 'commented on'} in ${reply.repo ?? 'the repository'}`,
    'info',
    url ? { label: 'see it', run: () => window.open(url, '_blank', 'noopener') } : undefined,
  );
}

async function post(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function runCommand(match: CommandMatch, panel?: Panel): Promise<void> {
  const { command, arg } = match;
  const lang = languageOf(arg || match.said || '');
  switch (command.id) {
    // The places, in the box: the calendar, the notebooks, the settings.
    case 'go-calendar':
    case 'go-shelf':
    case 'go-settings': {
      if (!panel) break;
      try {
        panel.show(
          command.id === 'go-calendar'
            ? await calendarPanel(lang)
            : command.id === 'go-shelf'
              ? await notebooksPanel(lang)
              : await settingsPanel(lang),
        );
      } catch {
        toast('that could not be read -- is the workspace running?', 'error');
      }
      return;
    }
    case 'issue-list':
      // "my issues", "ایشوهای من", "мои задачи": the ones assigned to whoever is signed in.
      await issueList(arg, /my|من|мои/i.test(match.said ?? ''), panel);
      return;
    case 'issue-close':
    case 'issue-reopen':
    case 'issue-comment':
      await issueAct(
        arg,
        command.id === 'issue-close'
          ? 'close'
          : command.id === 'issue-reopen'
            ? 'reopen'
            : 'comment',
      );
      return;
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
      break;
  }
  if (command.href) location.href = command.href;
}
