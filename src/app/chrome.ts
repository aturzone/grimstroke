/**
 * What every surface's chrome does, whichever surface it is.
 *
 * Menus that close when they should, the search, the shortcut sheet, toasts and the confirm
 * card. All of it is chrome -- the app is allowed to build chrome; what it must never build is
 * a document -- and all of it is built with textContent and createElement, never innerHTML:
 * search results carry text somebody else wrote.
 */

import { go, typing } from '~/app/dom.ts';
import { letterOf } from '~/app/keys.ts';

// ---------------------------------------------------------------- toasts

export interface Toast {
  /** Change what it says, and how it says it. */
  say(text: string, tone?: Tone): void;
  close(): void;
}

type Tone = 'info' | 'error' | 'busy';

function tray(): HTMLElement {
  let holder = document.querySelector<HTMLElement>('.gs-toasts');
  if (!holder) {
    holder = document.createElement('div');
    holder.className = 'gs-toasts';
    holder.setAttribute('role', 'status');
    holder.setAttribute('aria-live', 'polite');
    document.body.append(holder);
  }
  return holder;
}

/**
 * Say something, briefly.
 *
 * An error stays until it is dismissed: it is the one message somebody might need to read
 * twice, and a failure that vanishes on a timer is a failure that was never reported. Anything
 * else leaves on its own after a few seconds, and a busy message stays until it is told.
 */
export function toast(
  text: string,
  tone: Tone = 'info',
  /** One thing to do about it, on the slip itself -- undo, above all. */
  action?: { label: string; run: () => void },
): Toast {
  const slip = document.createElement('div');
  slip.className = 'gs-toast gs-card';
  const words = document.createElement('span');
  words.className = 'gs-toast-text';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'gs-btn gs-btn-icon';
  close.setAttribute('aria-label', 'dismiss');
  close.textContent = '×';
  slip.append(words);
  if (action) {
    const act = document.createElement('button');
    act.type = 'button';
    act.className = 'gs-btn gs-toast-act';
    act.textContent = action.label;
    act.addEventListener('click', () => {
      action.run();
      leave();
    });
    slip.append(act);
  }
  slip.append(close);
  tray().append(slip);

  let timer = 0;
  const leave = (): void => {
    window.clearTimeout(timer);
    slip.dataset.leaving = '1';
    window.setTimeout(() => slip.remove(), 180);
  };
  const say = (next: string, nextTone: Tone = tone): void => {
    words.textContent = next;
    slip.dataset.tone = nextTone;
    window.clearTimeout(timer);
    // Long enough to reach the button when there is one to reach.
    if (nextTone === 'info') timer = window.setTimeout(leave, action ? 9000 : 3600);
  };
  close.addEventListener('click', leave);
  say(text, tone);
  return { say, close: leave };
}

// ---------------------------------------------------------------- confirm

/**
 * Ask, on a card, and wait for the answer.
 *
 * window.confirm is a grey system box with "OK" on it, in the middle of a page that is
 * otherwise paper; it also cannot say which button is the dangerous one. This says what will
 * happen on the button that does it.
 */
export function confirmCard(o: {
  title: string;
  body: string;
  yes: string;
  no?: string;
}): Promise<boolean> {
  return new Promise((done) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'gs-dialog gs-confirm';
    const head = document.createElement('header');
    head.className = 'gs-dialog-head';
    const title = document.createElement('h2');
    title.textContent = o.title;
    head.append(title);
    const body = document.createElement('p');
    body.className = 'gs-dialog-body';
    body.textContent = o.body;
    const actions = document.createElement('div');
    actions.className = 'gs-dialog-actions';
    const no = document.createElement('button');
    no.type = 'button';
    no.className = 'gs-btn';
    no.textContent = o.no ?? 'keep it';
    const yes = document.createElement('button');
    yes.type = 'button';
    yes.className = 'gs-btn gs-btn-primary';
    yes.textContent = o.yes;
    actions.append(no, yes);
    dialog.append(head, body, actions);
    document.body.append(dialog);
    const finish = (answer: boolean): void => {
      dialog.close();
      dialog.remove();
      done(answer);
    };
    no.addEventListener('click', () => finish(false));
    yes.addEventListener('click', () => finish(true));
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      finish(false);
    });
    dialog.showModal();
    // The safe answer has the focus, so a reflexive Enter keeps the thing.
    no.focus();
  });
}

// ---------------------------------------------------------------- menus

/**
 * Menus are native details elements; this adds the manners.
 *
 * Only one open at a time, closed by a press anywhere else, by Escape, and by choosing a row
 * -- none of which a details element does by itself.
 */
function bindMenus(): void {
  const menus = (): HTMLDetailsElement[] => [
    ...document.querySelectorAll<HTMLDetailsElement>('details.gs-menu'),
  ];
  for (const menu of menus()) {
    menu.addEventListener('toggle', () => {
      if (!menu.open) return;
      for (const other of menus()) if (other !== menu) other.open = false;
    });
    menu.querySelector('.gs-menu-card')?.addEventListener('click', (event) => {
      const row = (event.target as HTMLElement).closest('.gs-item');
      if (row) menu.open = false;
    });
  }
  document.addEventListener(
    'pointerdown',
    (event) => {
      for (const menu of menus()) {
        if (menu.open && !menu.contains(event.target as Node)) menu.open = false;
      }
    },
    true,
  );
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    for (const menu of menus()) {
      if (!menu.open) continue;
      menu.open = false;
      menu.querySelector<HTMLElement>('summary')?.focus();
    }
  });
}

// ---------------------------------------------------------------- search

interface Hit {
  kind: string;
  docTitle: string;
  title: string;
  snippet: Array<{ text: string; mark?: boolean }>;
  href: string;
}

const KIND_LABEL: Record<string, string> = {
  board: 'board',
  notebook: 'notebook',
  archive: 'archive',
  person: 'person',
};

class Search {
  private readonly dialog: HTMLDialogElement;
  private readonly input: HTMLInputElement;
  private readonly results: HTMLElement;
  private hits: Hit[] = [];
  private chosen = 0;
  private timer = 0;
  private asked = '';

  constructor(dialog: HTMLDialogElement) {
    this.dialog = dialog;
    this.input = dialog.querySelector<HTMLInputElement>(
      '[data-gs="search-input"]',
    ) as HTMLInputElement;
    this.results = dialog.querySelector<HTMLElement>('[data-gs="search-results"]') as HTMLElement;
    this.input.addEventListener('input', () => {
      window.clearTimeout(this.timer);
      this.timer = window.setTimeout(() => void this.run(), 110);
    });
    this.input.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        this.move(event.key === 'ArrowDown' ? 1 : -1);
      } else if (event.key === 'Escape') {
        // A search field's own Escape only empties it, so closing took two presses. One
        // Escape closes the search, whatever is typed in it.
        event.preventDefault();
        this.dialog.close();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const hit = this.hits[this.chosen];
        if (hit) go(hit.href);
      }
    });
    // A click on the backdrop is a click outside the card.
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  }

  open(): void {
    if (this.dialog.open) return;
    this.dialog.showModal();
    this.input.select();
  }

  private async run(): Promise<void> {
    const query = this.input.value.trim();
    this.asked = query;
    if (!query) {
      this.show([], '');
      return;
    }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error(String(res.status));
      const { hits } = (await res.json()) as { hits: Hit[] };
      // An answer to an older question is thrown away; typing fast must not show the results
      // for three letters ago under a box that says five.
      if (query === this.asked) this.show(hits, query);
    } catch {
      this.note('the workspace did not answer', 'check that grimstroke serve is still running');
    }
  }

  private show(hits: Hit[], query: string): void {
    this.hits = hits;
    this.chosen = 0;
    this.results.replaceChildren();
    if (!query) return;
    if (hits.length === 0) {
      this.note(
        `nothing for “${query}”`,
        'boards, notebooks, the archive and people were searched',
      );
      return;
    }
    hits.forEach((hit, index) => {
      const row = document.createElement('a');
      row.className = 'gs-hit';
      row.href = hit.href;
      row.setAttribute('role', 'option');
      row.id = `gs-hit-${index}`;
      const kind = document.createElement('span');
      kind.className = 'gs-hit-kind';
      kind.dataset.kind = hit.kind;
      kind.textContent = KIND_LABEL[hit.kind] ?? hit.kind;
      const title = document.createElement('span');
      title.className = 'gs-hit-title';
      title.dir = 'auto';
      title.textContent = hit.title === hit.docTitle ? hit.title : `${hit.docTitle} · ${hit.title}`;
      const text = document.createElement('span');
      text.className = 'gs-hit-text';
      text.dir = 'auto';
      for (const run of hit.snippet) {
        if (run.mark) {
          const mark = document.createElement('mark');
          mark.textContent = run.text;
          text.append(mark);
        } else {
          text.append(run.text);
        }
      }
      row.append(kind, title, text);
      row.addEventListener('pointerenter', () => this.select(index));
      this.results.append(row);
    });
    this.select(0);
  }

  private note(title: string, line: string): void {
    this.results.replaceChildren();
    const box = document.createElement('p');
    box.className = 'gs-search-none';
    const b = document.createElement('b');
    b.textContent = title;
    box.append(b, line);
    this.results.append(box);
  }

  private move(step: number): void {
    if (this.hits.length === 0) return;
    this.select((this.chosen + step + this.hits.length) % this.hits.length);
  }

  private select(index: number): void {
    this.chosen = index;
    for (const [i, row] of [...this.results.querySelectorAll<HTMLElement>('.gs-hit')].entries()) {
      row.setAttribute('aria-selected', String(i === index));
      if (i === index) row.scrollIntoView({ block: 'nearest' });
    }
    this.input.setAttribute('aria-activedescendant', `gs-hit-${index}`);
  }
}

// ---------------------------------------------------------------- boot

/** Wire the chrome every surface shares. Safe to call on a page that has none of it. */
export function bootChrome(): void {
  // Changes made offline, kept across a reload and sent again: say so, once.
  window.addEventListener('gs-restored', (event) => {
    const { count, stale } = (event as CustomEvent<{ count: number; stale: boolean }>).detail;
    const what =
      count === 1
        ? 'one change made before the reload is'
        : `${count} changes made before the reload are`;
    toast(
      stale
        ? `${what} being sent -- the page changed meanwhile, so anything that no longer fits is left out`
        : `${what} being sent`,
    );
  });
  bindMenus();
  const searchDialog = document.querySelector<HTMLDialogElement>('dialog[data-gs="search"]');
  const search = searchDialog ? new Search(searchDialog) : undefined;
  const help = document.querySelector<HTMLDialogElement>('dialog[data-gs="help"]');
  if (help) {
    help.addEventListener('click', (event) => {
      if (event.target === help) help.close();
    });
  }

  document.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-gs]');
    if (target?.dataset.gs === 'search-open') search?.open();
    if (target?.dataset.gs === 'help-open') help?.showModal();
  });

  window.addEventListener('keydown', (event) => {
    if (event.defaultPrevented) return;
    const open = document.querySelector('dialog[open]');
    // Ctrl+K searches from anywhere, even from a text box -- it is what every other tool
    // with a search does, and there is nothing in a note that Ctrl+K should mean instead
    // except a link, which the note's own editor claims before this ever hears it.
    if ((event.ctrlKey || event.metaKey) && !event.altKey && letterOf(event) === 'k' && !open) {
      if (typing(event.target)) return;
      event.preventDefault();
      search?.open();
      return;
    }
    if (typing(event.target) || open || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === '/') {
      event.preventDefault();
      search?.open();
    } else if (event.key === '?') {
      event.preventDefault();
      help?.showModal();
    }
  });
}
