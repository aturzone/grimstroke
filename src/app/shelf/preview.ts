/**
 * A book taken down from the shelf to look at: it comes out of its place towards you, turning
 * from its spine to its cover, and stands in front of the bookcase with what there is to know
 * about it and what can be done with it. Opening it carries it on into the reading spread,
 * where it opens.
 *
 * The cover is drawn by the server, as every document is; this is only the chrome around it.
 */

import { confirmCard, toast } from '~/app/chrome.ts';
import { infoOf, type ShelfApp } from '~/app/shelf/index.ts';

const EASE = 'cubic-bezier(0.2, 0.8, 0.25, 1)';

export class Preview {
  private readonly app: ShelfApp;
  private root: HTMLElement | undefined;
  private from: HTMLElement | undefined;
  private readonly covers = new Map<string, Promise<string>>();

  constructor(app: ShelfApp) {
    this.app = app;
    // Fetched as the pointer arrives, so the cover is there by the time the press is.
    document.addEventListener('pointerover', (event) => {
      const spine = (event.target as HTMLElement).closest<HTMLElement>('.spine');
      if (spine?.dataset.gsId) void this.cover(spine.dataset.gsId);
    });
  }

  get isOpen(): boolean {
    return this.root !== undefined;
  }

  private cover(id: string): Promise<string> {
    let got = this.covers.get(id);
    if (!got) {
      got = fetch(`/api/cover?id=${encodeURIComponent(id)}`)
        .then((res) => (res.ok ? res.json() : { html: '' }))
        .then((body: { html?: string }) => body.html ?? '')
        .catch(() => '');
      this.covers.set(id, got);
    }
    return got;
  }

  async open(spine: HTMLElement): Promise<void> {
    if (this.root) return;
    const info = infoOf(spine);
    const html = await this.cover(info.id);
    const root = document.createElement('div');
    root.className = 'gs-preview';
    root.dataset.gs = 'preview';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', info.title);

    const stage = document.createElement('div');
    stage.className = 'gs-preview-stage';
    const book = document.createElement('div');
    book.className = 'gs-preview-book';
    book.style.setProperty('--cover', spine.style.getPropertyValue('--cover'));
    book.style.setProperty(
      '--depth',
      `${Number.parseFloat(spine.style.getPropertyValue('--w')) || 30}px`,
    );
    const front = document.createElement('div');
    front.className = 'gs-preview-front';
    // Our own server's markup, drawn by the same code that draws the cover everywhere.
    front.innerHTML = html;
    const edge = document.createElement('div');
    edge.className = 'gs-preview-spine';
    edge.append(...[...(spine.querySelector('.spine-face')?.cloneNode(true).childNodes ?? [])]);
    const pages = document.createElement('div');
    pages.className = 'gs-preview-pages';
    book.append(front, edge, pages);
    stage.append(book);

    const card = document.createElement('div');
    card.className = 'gs-preview-card gs-card';
    const title = document.createElement('h2');
    title.dir = 'auto';
    title.textContent = info.title;
    const facts = document.createElement('dl');
    const fact = (term: string, value: string | undefined): void => {
      if (!value) return;
      const dt = document.createElement('dt');
      dt.textContent = term;
      const dd = document.createElement('dd');
      dd.dir = 'auto';
      dd.textContent = value;
      facts.append(dt, dd);
    };
    fact('pages', info.pages);
    fact('last written', info.edited);
    fact('whose', info.whose);
    fact('where', info.archived ? 'in the archive' : 'in use');
    const actions = document.createElement('div');
    actions.className = 'gs-preview-actions';
    const act = (label: string, gs: string, run: () => void, tone = ''): HTMLButtonElement => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `gs-btn ${tone}`.trim();
      b.dataset.gs = gs;
      b.textContent = label;
      b.addEventListener('click', run);
      actions.append(b);
      return b;
    };
    const openIt = act('open', 'preview-open', () => this.go(info.id), 'gs-btn-primary');
    act('the cover', 'preview-cover', () => {
      window.location.href = `/book?id=${encodeURIComponent(info.id)}&cover`;
    });
    act(
      info.archived ? 'take out' : 'archive',
      'preview-archive',
      () => void this.archive(info.id, !info.archived),
    );
    act(
      'throw away',
      'preview-delete',
      () => void this.throwAway(info.id, info.title),
      'gs-btn-danger',
    );
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'gs-btn gs-btn-icon gs-preview-close';
    close.setAttribute('aria-label', 'put it back');
    close.dataset.gs = 'preview-close';
    close.textContent = '×';
    close.addEventListener('click', () => void this.close());
    card.append(close, title, facts, actions);
    root.append(stage, card);
    root.addEventListener('pointerdown', (event) => {
      if (event.target === root || event.target === stage) void this.close();
    });
    root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        void this.close();
      }
    });
    document.body.append(root);
    this.root = root;
    this.from = spine;
    spine.classList.add('is-out');
    openIt.focus({ preventScroll: true });

    // Out of its place on the shelf: from the spine's own box, turning to show its cover.
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const a = spine.getBoundingClientRect();
      const b = book.getBoundingClientRect();
      const dx = a.left + a.width / 2 - (b.left + b.width / 2);
      const dy = a.top + a.height / 2 - (b.top + b.height / 2);
      const k = a.height / b.height;
      book.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(${k}) rotateY(88deg)` },
          {
            transform: `translate(${dx * 0.4}px, ${dy * 0.4 - 30}px) scale(${(1 + k) / 2}) rotateY(40deg)`,
            offset: 0.45,
          },
          { transform: 'none' },
        ],
        { duration: 620, easing: EASE },
      );
      card.animate(
        [
          { opacity: 0, transform: 'translateX(24px)' },
          { opacity: 1, transform: 'none' },
        ],
        {
          duration: 360,
          delay: 220,
          easing: EASE,
          fill: 'backwards',
        },
      );
      root.animate([{ backgroundColor: 'rgba(0,0,0,0)' }, {}], { duration: 360 });
    }
  }

  async close(): Promise<void> {
    const root = this.root;
    const spine = this.from;
    if (!root) return;
    this.root = undefined;
    const book = root.querySelector<HTMLElement>('.gs-preview-book');
    if (book && spine?.isConnected && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const a = spine.getBoundingClientRect();
      const b = book.getBoundingClientRect();
      const dx = a.left + a.width / 2 - (b.left + b.width / 2);
      const dy = a.top + a.height / 2 - (b.top + b.height / 2);
      root.querySelector('.gs-preview-card')?.remove();
      root.animate([{}, { backgroundColor: 'rgba(0,0,0,0)' }], { duration: 420, fill: 'forwards' });
      await book.animate(
        [
          { transform: 'none' },
          { transform: `translate(${dx}px, ${dy}px) scale(${a.height / b.height}) rotateY(88deg)` },
        ],
        { duration: 420, easing: 'cubic-bezier(0.5, 0, 0.75, 0.3)', fill: 'forwards' },
      ).finished;
    }
    root.remove();
    spine?.classList.remove('is-out');
    spine?.focus({ preventScroll: true });
  }

  /** Into the reading spread: the book moves to where its cover will lie there, then opens. */
  private go(id: string): void {
    const book = this.root?.querySelector<HTMLElement>('.gs-preview-book');
    this.root?.querySelector('.gs-preview-card')?.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 240,
      fill: 'forwards',
    });
    const href = `/book?id=${encodeURIComponent(id)}&opening`;
    if (!book || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.location.href = href;
      return;
    }
    const b = book.getBoundingClientRect();
    // The spread puts a shut cover on the right half of the desk, at the centre.
    const tx = window.innerWidth * 0.5 + b.width * 0.5 - (b.left + b.width / 2) + 12;
    const ty = window.innerHeight * 0.52 - (b.top + b.height / 2);
    void book
      .animate([{ transform: 'none' }, { transform: `translate(${tx}px, ${ty}px)` }], {
        duration: 340,
        easing: EASE,
        fill: 'forwards',
      })
      .finished.then(() => {
        window.location.href = href;
      });
  }

  private async archive(id: string, on: boolean): Promise<void> {
    const res = await fetch('/api/books/batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: [id], action: on ? 'archive' : 'unarchive' }),
    });
    if (!res.ok) {
      toast('that could not be done', 'error');
      return;
    }
    this.root?.remove();
    this.root = undefined;
    await this.app.refresh();
    toast(on ? 'put in the archive' : 'taken out of the archive');
  }

  private async throwAway(id: string, title: string): Promise<void> {
    const yes = await confirmCard({
      title: `throw away “${title}”?`,
      body:
        'It goes to the trash for thirty days: bring it back from the trash below the bookcase, ' +
        'or with grimstroke untrash. After that it is gone for good.',
      yes: 'throw it away',
    });
    if (!yes) return;
    const res = await fetch(`/api/books?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) {
      toast('it could not be thrown away', 'error');
      return;
    }
    const { trash } = (await res.json()) as { trash: string };
    this.root?.remove();
    this.root = undefined;
    await this.app.refresh();
    toast(`${title} thrown away`, 'info', {
      label: 'undo',
      run: () => void this.app.restore([trash]),
    });
  }
}
