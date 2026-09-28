/**
 * The bookcase, live: take a book down to look at it, carry it somewhere else, choose several,
 * make a new one, and fish one out of the trash.
 *
 * The bookcase itself is drawn by the server -- where each book stands, leans or lies comes from
 * one pure layout -- and every change here is sent as what a hand did ("put these down on the
 * third shelf, 400 pixels along") and answered with the room redrawn.
 */

import { confirmCard, toast } from '~/app/chrome.ts';
import { go, onClick, typing } from '~/app/dom.ts';
import { Carry } from '~/app/shelf/carry.ts';
import { Decorate } from '~/app/shelf/decorate.ts';
import { ShelfPet } from '~/app/shelf/pet.ts';
import { Preview } from '~/app/shelf/preview.ts';

export interface BookInfo {
  id: string;
  title: string;
  pages: string;
  edited?: string | undefined;
  whose?: string | undefined;
  archived: boolean;
}

/** What a spine says about its book, read from the markup the server drew. */
export function infoOf(spine: HTMLElement): BookInfo {
  return {
    id: spine.dataset.gsId ?? '',
    title: spine.dataset.title ?? '',
    pages: spine.dataset.pages ?? '',
    edited: spine.dataset.edited,
    whose: spine.dataset.whose,
    archived: spine.hasAttribute('data-archived'),
  };
}

interface ShelfReply {
  html: string;
  trash: number;
}

export class ShelfApp {
  /** This tab, so its own changes are not echoed back to it. */
  readonly client = Math.random().toString(36).slice(2, 12);
  readonly selected = new Set<string>();
  private readonly preview: Preview;
  readonly pet: ShelfPet;
  private readonly decorate: Decorate;
  private bar: HTMLElement | undefined;

  constructor() {
    this.preview = new Preview(this);
    this.pet = new ShelfPet();
    this.decorate = new Decorate(this);
    new Carry(this).bind();
  }

  get room(): HTMLElement | null {
    return document.querySelector<HTMLElement>('[data-gs="room"]');
  }

  get selecting(): boolean {
    return document.body.hasAttribute('data-selecting');
  }

  spine(id: string): HTMLElement | null {
    return document.querySelector<HTMLElement>(`.spine[data-gs-id="${CSS.escape(id)}"]`);
  }

  boot(): void {
    this.fitRoom();
    window.addEventListener('resize', () => this.fitRoom());
    this.bindNew();
    this.bindTrash();
    onClick('shelf-select', () => this.setSelecting(!this.selecting));
    onClick('pet-feed', () => this.startFeeding());
    onClick('shelf-decorate', () => this.decorate.toggle());
    // A sticker on the bookcase, pressed: it offers to come off.
    document.addEventListener('click', (event) => {
      const decal = (event.target as HTMLElement).closest<HTMLElement>('.case-decal');
      if (!decal || document.body.hasAttribute('data-placing')) return;
      toast('a sticker on the bookcase', 'info', {
        label: 'peel it off',
        run: () =>
          void this.shelfCall(
            'decal',
            {},
            'DELETE',
            `id=${encodeURIComponent(decal.dataset.gsId ?? '')}`,
          ),
      });
    });
    // Feeding: the next press on the bookcase is where the bowl goes.
    document.addEventListener(
      'pointerdown',
      (event) => {
        if (!document.body.hasAttribute('data-feeding')) return;
        if ((event.target as HTMLElement).closest('.gs-top')) return;
        event.preventDefault();
        event.stopPropagation();
        document.body.removeAttribute('data-feeding');
        if (!this.pet.feed(event.clientX, event.clientY))
          toast('put it on a shelf -- the bowl needs a plank to stand on');
      },
      true,
    );
    window.addEventListener('keydown', (event) => this.key(event));
    this.pet.start(this.room);
    // Changes made elsewhere -- another tab, or an agent over the API -- redraw the room.
    const events = new EventSource(`/api/events?kind=shelf&id=main&client=${this.client}`);
    events.addEventListener('reload', () => void this.refresh());
    if (new URLSearchParams(location.search).has('gone')) {
      toast('that notebook was thrown away; it is in the trash for thirty days');
      history.replaceState(history.state, '', '/shelf');
    }
  }

  /**
   * The room is drawn at the bookcase's own size and zoomed to the window, so every book is in
   * the pixels the layout was worked out in. On a phone it stops shrinking at a size a spine can
   * still be read at, and the shelves scroll sideways instead.
   */
  private fitRoom(): void {
    const room = this.room;
    if (!room) return;
    const vw = window.innerWidth;
    /*
     * Wide screens zoom the full bookcase to fit. A phone gets a narrower bookcase instead --
     * the same books in the same order, spilling onto more shelves -- drawn at a size a spine
     * can be read at, so nothing scrolls sideways.
     */
    const narrow = vw < 760;
    // The bookcase in use fits the window's height too, so its lower shelves are not below the
    // fold with nothing to say they are there -- down to a size a spine can still be read at.
    const shelves = room.querySelectorAll('.bookcase-use [data-gs="shelf"]').length || 3;
    const tall = shelves * 298 + 110;
    const byHeight = (window.innerHeight - 110) / tall;
    const scale = narrow ? 0.72 : Math.max(0.56, Math.min(1, (vw - 32) / 1140, byHeight));
    const width = narrow ? Math.max(280, Math.floor((vw - 20) / scale) - 150) : undefined;
    room.style.setProperty('--case-scale', scale.toFixed(3));
    document
      .querySelector<HTMLElement>('.case-trash')
      ?.style.setProperty('--case-scale', scale.toFixed(3));
    if (width !== this.width) {
      this.width = width;
      void this.refresh();
    }
    // The pet is drawn at whole pixels for the zoom: a new zoom, a new scale.
    this.pet.refit();
  }

  /** The shelf width asked of the server: undefined for the full bookcase. */
  private width: number | undefined;

  get scale(): number {
    return Number(this.room?.style.getPropertyValue('--case-scale')) || 1;
  }

  // ---------------------------------------------------------------- a press on a spine

  /** A spine pressed and let go without being carried. */
  pressed(spine: HTMLElement, event: MouseEvent | KeyboardEvent): void {
    const id = spine.dataset.gsId ?? '';
    if (spine.classList.contains('decor')) {
      // An object is not a notebook: pressed, it offers to be taken away.
      toast(`${spine.getAttribute('aria-label') ?? 'this'} on the shelf`, 'info', {
        label: 'take it away',
        run: () => void this.shelfCall('remove', { id }),
      });
      return;
    }
    if (this.selecting || event.shiftKey || event.ctrlKey || event.metaKey) {
      this.toggle(id);
      return;
    }
    this.preview.open(spine);
  }

  toggle(id: string, on = !this.selected.has(id)): void {
    if (on) this.selected.add(id);
    else this.selected.delete(id);
    if (this.selected.size > 0 && !this.selecting) this.setSelecting(true);
    this.showSelection();
  }

  setSelecting(on: boolean): void {
    document.body.toggleAttribute('data-selecting', on);
    document.querySelector('[data-gs="shelf-select"]')?.setAttribute('aria-pressed', String(on));
    if (!on) this.selected.clear();
    this.showSelection();
  }

  private showSelection(): void {
    for (const spine of document.querySelectorAll<HTMLElement>('.spine')) {
      spine.toggleAttribute('data-selected', this.selected.has(spine.dataset.gsId ?? ''));
    }
    this.drawBar();
  }

  /** The bar of what can be done to the chosen notebooks. */
  private drawBar(): void {
    if (!this.selecting) {
      this.bar?.remove();
      this.bar = undefined;
      return;
    }
    if (!this.bar) {
      this.bar = document.createElement('div');
      this.bar.className = 'gs-shelfbar gs-card';
      this.bar.setAttribute('role', 'toolbar');
      this.bar.setAttribute('aria-label', 'the chosen notebooks');
      document.body.append(this.bar);
    }
    const chosen = [...this.selected]
      .map((id) => this.spine(id))
      .filter((s): s is HTMLElement => s !== null);
    const anyOpen = chosen.some((s) => !s.hasAttribute('data-archived'));
    const anyPut = chosen.some((s) => s.hasAttribute('data-archived'));
    const n = chosen.length;
    this.bar.replaceChildren();
    const count = document.createElement('span');
    count.className = 'gs-shelfbar-count';
    count.textContent = n === 0 ? 'choose notebooks' : n === 1 ? 'one chosen' : `${n} chosen`;
    this.bar.append(count);
    const act = (label: string, gs: string, enabled: boolean, run: () => void, tone = ''): void => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `gs-btn ${tone}`.trim();
      b.dataset.gs = gs;
      b.textContent = label;
      b.disabled = !enabled;
      b.addEventListener('click', run);
      this.bar?.append(b);
    };
    act('archive', 'batch-archive', anyOpen, () => void this.batch('archive'));
    act('take out', 'batch-unarchive', anyPut, () => void this.batch('unarchive'));
    act('throw away', 'batch-delete', n > 0, () => void this.batch('delete'), 'gs-btn-danger');
    act('all', 'batch-all', true, () => {
      for (const s of document.querySelectorAll<HTMLElement>('.spine'))
        this.selected.add(s.dataset.gsId ?? '');
      this.showSelection();
    });
    act('done', 'batch-done', true, () => this.setSelecting(false), 'gs-btn-primary');
  }

  private async batch(action: 'archive' | 'unarchive' | 'delete'): Promise<void> {
    const ids = [...this.selected];
    if (ids.length === 0) return;
    if (action === 'delete') {
      const titles = ids.map((id) => this.spine(id)?.dataset.title ?? id);
      const yes = await confirmCard({
        title:
          ids.length === 1 ? `throw away “${titles[0]}”?` : `throw away ${ids.length} notebooks?`,
        body:
          (ids.length > 1 ? `${titles.join(', ')}. ` : '') +
          'They go to the trash for thirty days -- bring them back from the trash below the ' +
          'bookcase, or with grimstroke untrash. After that they are gone for good.',
        yes: 'throw away',
      });
      if (!yes) return;
    }
    const res = await fetch('/api/books/batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-grimstroke-client': this.client },
      body: JSON.stringify({ ids, action }),
    });
    if (!res.ok) {
      toast('that could not be done', 'error');
      return;
    }
    const reply = (await res.json()) as { done: string[]; trash?: Record<string, string> };
    this.selected.clear();
    await this.refresh();
    const n = reply.done.length;
    const what = n === 1 ? 'one notebook' : `${n} notebooks`;
    if (action === 'delete') {
      toast(`${what} thrown away`, 'info', {
        label: 'undo',
        run: () => void this.restore(Object.values(reply.trash ?? {})),
      });
    } else {
      toast(action === 'archive' ? `${what} archived` : `${what} taken out of the archive`);
    }
  }

  async restore(names: readonly string[]): Promise<void> {
    for (const name of names) {
      await fetch('/api/trash/restore', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name }),
      });
    }
    await this.refresh();
  }

  // ---------------------------------------------------------------- the room, redrawn

  /**
   * Lay in the room the server drew, and move every book from where it was to where it is now,
   * so the others visibly make room and a book put down in the open visibly tips over.
   */
  absorb(reply: ShelfReply, from?: { id: string; rect: DOMRect }): void {
    const room = this.room;
    if (!room) return;
    const before = new Map<string, { rect: DOMRect; flat: boolean }>();
    for (const spine of room.querySelectorAll<HTMLElement>('.spine, .decor')) {
      before.set(spine.dataset.gsId ?? '', {
        rect: spine.getBoundingClientRect(),
        flat: spine.hasAttribute('data-flat'),
      });
    }
    if (from) before.set(from.id, { rect: from.rect, flat: false });
    const scale = room.style.getPropertyValue('--case-scale');
    const holder = document.createElement('div');
    // Our own server's markup, drawn by the same code that drew the page.
    holder.innerHTML = reply.html;
    const next = holder.firstElementChild as HTMLElement | null;
    if (!next) return;
    next.style.setProperty('--case-scale', scale);
    room.replaceWith(next);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const spine of next.querySelectorAll<HTMLElement>('.spine, .decor')) {
      const id = spine.dataset.gsId ?? '';
      const was = before.get(id);
      if (!was || reduced) continue;
      const now = spine.getBoundingClientRect();
      const s = Number(scale) || 1;
      const dx = (was.rect.left - now.left) / s;
      const dy = (was.rect.bottom - now.bottom) / s;
      if (spine.hasAttribute('data-flat') && !was.flat) {
        // Stood up where it was let go, then over it goes.
        spine.toggleAttribute('data-fell', true);
        spine.addEventListener('animationend', () => spine.removeAttribute('data-fell'), {
          once: true,
        });
        continue;
      }
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      spine.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
        duration: 380,
        easing: 'cubic-bezier(0.2, 0.8, 0.25, 1)',
      });
    }
    const count = document.querySelector<HTMLElement>('[data-gs="trash-count"]');
    if (count) count.textContent = String(reply.trash);
    document
      .querySelector<HTMLElement>('[data-gs="trash-open"]')
      ?.toggleAttribute('hidden', !reply.trash);
    for (const id of [...this.selected]) if (!this.spine(id)) this.selected.delete(id);
    this.showSelection();
    this.pet.start(next);
    const title = document.querySelector<HTMLElement>('.gs-top-title');
    const n = next.querySelectorAll('.spine').length;
    if (title) title.textContent = n === 1 ? 'one notebook' : `${n} notebooks`;
  }

  async refresh(): Promise<void> {
    const res = await fetch(`/api/shelf${this.width ? `?width=${this.width}` : ''}`);
    if (res.ok) this.absorb((await res.json()) as ShelfReply);
  }

  /** Put books down: on a shelf in use at x along it, or onto the archive. */
  async drop(
    ids: readonly string[],
    to: 'use' | 'archive',
    row: number,
    x: number,
    from?: { id: string; rect: DOMRect },
  ): Promise<void> {
    const res = await fetch('/api/shelf/drop', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-grimstroke-client': this.client },
      body: JSON.stringify({ ids, to, row, x, ...(this.width ? { width: this.width } : {}) }),
    });
    if (!res.ok) {
      toast('the bookcase could not be rearranged', 'error');
      await this.refresh();
      return;
    }
    this.absorb((await res.json()) as ShelfReply, from);
  }

  private startFeeding(): void {
    if (!this.pet.out) return;
    document.body.toggleAttribute('data-feeding', true);
    toast(`press a shelf to put ${this.pet.name}'s bowl down`);
  }

  /** A change to the bookcase itself -- its style, an object, a sticker -- and the room redrawn. */
  async shelfCall(
    what: string,
    body: Record<string, unknown>,
    method = 'POST',
    query = '',
  ): Promise<void> {
    const width = this.width ? `width=${this.width}` : '';
    const q = [query, method === 'DELETE' ? width : ''].filter(Boolean).join('&');
    const res = await fetch(`/api/shelf/${what}${q ? `?${q}` : ''}`, {
      method,
      headers: { 'content-type': 'application/json', 'x-grimstroke-client': this.client },
      ...(method === 'POST'
        ? { body: JSON.stringify({ ...body, ...(this.width ? { width: this.width } : {}) }) }
        : {}),
    });
    const reply = (await res.json().catch(() => ({}))) as {
      html?: string;
      error?: string;
      trash?: number;
    };
    if (!res.ok || !reply.html) {
      toast(reply.error ?? 'the bookcase could not be changed', 'error');
      return;
    }
    this.absorb({
      html: reply.html,
      trash: Number(document.querySelector('[data-gs="trash-count"]')?.textContent) || 0,
    });
  }

  // ---------------------------------------------------------------- keys

  private key(event: KeyboardEvent): void {
    if (typing(event.target) || this.preview.isOpen) return;
    if (event.key === 'Escape' && document.body.hasAttribute('data-feeding')) {
      document.body.removeAttribute('data-feeding');
      return;
    }
    if (event.key === 'Escape' && this.selecting) {
      this.setSelecting(false);
      return;
    }
    const spine = (event.target as HTMLElement | null)?.closest<HTMLElement>('.spine');
    if (!spine) return;
    // Alt and an arrow carries the focused book: along its shelf, or up and down a shelf.
    if (event.altKey && event.key.startsWith('Arrow')) {
      event.preventDefault();
      void this.nudge(spine, event.key);
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.selected.clear();
      this.selected.add(spine.dataset.gsId ?? '');
      void this.batch('delete');
    }
  }

  private async nudge(spine: HTMLElement, key: string): Promise<void> {
    const shelf = spine.closest<HTMLElement>('[data-gs="shelf"]');
    if (shelf?.dataset.shelf !== 'use') return;
    const id = spine.dataset.gsId ?? '';
    const row = Number(shelf.dataset.row) || 0;
    const standing = [...shelf.querySelectorAll<HTMLElement>('.spine:not([data-flat])')];
    const at = standing.indexOf(spine);
    const x = (s: HTMLElement | undefined): number =>
      Number.parseFloat(s?.style.getPropertyValue('--x') ?? '0');
    const w = (s: HTMLElement | undefined): number =>
      Number.parseFloat(s?.style.getPropertyValue('--w') ?? '0');
    let target = row;
    let along = 0;
    if (key === 'ArrowLeft') along = at > 0 ? x(standing[at - 1]) + 1 : 0;
    else if (key === 'ArrowRight') {
      const next = standing[at + 1];
      along = next ? x(next) + w(next) - 1 : x(spine) + w(spine);
    } else {
      target = key === 'ArrowUp' ? Math.max(0, row - 1) : row + 1;
      const there = document.querySelector<HTMLElement>(`[data-shelf="use"][data-row="${target}"]`);
      const run = [...(there?.querySelectorAll<HTMLElement>('.spine:not([data-flat])') ?? [])];
      const last = run[run.length - 1];
      along = last ? x(last) + w(last) : 0;
    }
    await this.drop([id], 'use', target, along);
    this.spine(id)?.focus();
  }

  // ---------------------------------------------------------------- new, and the trash

  private bindNew(): void {
    const dialog = document.querySelector<HTMLDialogElement>('[data-gs="book-new-dialog"]');
    if (!dialog) return;
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
      go(`/book?id=${encodeURIComponent(id)}&opening`);
    });
  }

  /** The trash: what was thrown away in the last thirty days, each with a way back. */
  private bindTrash(): void {
    onClick('trash-open', async () => {
      const res = await fetch('/api/trash');
      if (!res.ok) return;
      const { trash } = (await res.json()) as {
        trash: Array<{ name: string; title: string; at: string }>;
      };
      const dialog = document.createElement('dialog');
      dialog.className = 'gs-dialog gs-trash';
      dialog.setAttribute('aria-label', 'the trash');
      const head = document.createElement('header');
      head.className = 'gs-dialog-head';
      head.innerHTML = '<h2>the trash</h2>';
      const list = document.createElement('ul');
      list.className = 'gs-trash-list';
      for (const one of trash) {
        const li = document.createElement('li');
        const words = document.createElement('span');
        const title = document.createElement('b');
        title.textContent = one.title;
        const when = document.createElement('small');
        when.textContent = `thrown away ${one.at.slice(0, 10)}`;
        words.append(title, when);
        const back = document.createElement('button');
        back.type = 'button';
        back.className = 'gs-btn';
        back.textContent = 'bring it back';
        back.dataset.gs = 'trash-restore';
        back.addEventListener('click', async () => {
          await this.restore([one.name]);
          li.remove();
          toast(`${one.title} is back on the shelf`);
          if (!list.children.length) dialog.close();
        });
        li.append(words, back);
        list.append(li);
      }
      const note = document.createElement('p');
      note.className = 'gs-trash-note';
      note.textContent = 'Kept for thirty days after it was thrown away, then gone for good.';
      const actions = document.createElement('div');
      actions.className = 'gs-dialog-actions';
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'gs-btn gs-btn-primary';
      close.textContent = 'close';
      close.addEventListener('click', () => dialog.close());
      actions.append(close);
      dialog.append(head, list, note, actions);
      dialog.addEventListener('close', () => dialog.remove());
      document.body.append(dialog);
      dialog.showModal();
    });
  }
}

export function bootShelf(): boolean {
  if (!document.querySelector('[data-gs="shelves"]')) return false;
  const app = new ShelfApp();
  app.boot();
  // Handy for an agent driving a browser, and for anyone in a console: grimstroke.pet.state.
  (window as unknown as { grimstroke: unknown }).grimstroke = app;
  return true;
}
