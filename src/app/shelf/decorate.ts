/**
 * Making the bookcase your own: a panel of woods, backs, objects and sticker packs.
 *
 * Choosing a wood or a back changes it at once. Choosing an object or a sticker is picking it up:
 * the next press on the bookcase is where it goes -- an object onto the shelf under the press, a
 * sticker onto the bookcase wherever it was pressed. Everything is a call to the shelf API, so an
 * agent has the same choices (GET /api/shelf/catalogue).
 */

import { type Toast, toast } from '~/app/chrome.ts';
import type { ShelfApp } from '~/app/shelf/index.ts';
import { BACKS, WOODS } from '~/draw/doc/shelf/model.ts';
import { DECOR, decorSvg } from '~/draw/material/decor/art.ts';
import { findStickers, PACKS, type PackItem } from '~/draw/material/sticker/packs.ts';
import { renderStickerFace } from '~/draw/material/sticker/render.ts';

type Holding = { decor: string } | { sticker: PackItem } | undefined;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export class Decorate {
  private readonly app: ShelfApp;
  private panel: HTMLElement | undefined;
  private holding: Holding;
  /** The one hint saying what to do with what is held. */
  private hint: Toast | undefined;

  constructor(app: ShelfApp) {
    this.app = app;
    document.addEventListener('pointerdown', (event) => this.put(event), true);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.holding) this.drop();
    });
  }

  toggle(): void {
    if (this.panel) {
      this.close();
      return;
    }
    const panel = el('aside', 'gs-decorate gs-card');
    panel.dataset.gs = 'decorate';
    panel.setAttribute('aria-label', 'make the bookcase your own');
    const head = el('header', 'gs-decorate-head');
    head.append(el('h2', '', 'your bookcase'));
    const close = el('button', 'gs-btn gs-btn-icon', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'close');
    close.addEventListener('click', () => this.close());
    head.append(close);
    panel.append(head);

    const room = this.app.room;
    const section = (title: string, body: HTMLElement): void => {
      const s = el('section', 'gs-decorate-section');
      s.append(el('h3', 'gs-menu-head', title), body);
      panel.append(s);
    };
    const swatches = (
      list: readonly string[],
      current: string,
      key: 'wood' | 'back',
    ): HTMLElement => {
      const row = el('div', 'gs-decorate-swatches');
      for (const v of list) {
        const b = el('button', `gs-decorate-swatch gs-${key}-${v}`);
        b.type = 'button';
        b.title = v;
        b.dataset.gs = `shelf-${key}`;
        b.dataset.value = v;
        b.setAttribute('aria-label', `${key} ${v}`);
        b.setAttribute('aria-pressed', String(v === current));
        b.addEventListener('click', () => {
          for (const o of row.querySelectorAll('button'))
            o.setAttribute('aria-pressed', String(o === b));
          void this.app.shelfCall('style', { [key]: v });
        });
        row.append(b);
      }
      return row;
    };
    section('wood', swatches(WOODS, room?.dataset.wood ?? 'oak', 'wood'));
    section('the back', swatches(BACKS, room?.dataset.back ?? 'boards', 'back'));

    const objects = el('div', 'gs-decorate-grid');
    for (const d of DECOR) {
      const b = el('button', 'gs-decorate-pick');
      b.type = 'button';
      b.title = d.label;
      b.dataset.gs = 'decor-pick';
      b.dataset.value = d.id;
      b.setAttribute('aria-label', d.label);
      // The same picture the bookcase draws, from the same function.
      b.innerHTML = decorSvg(d.id, 0, 1);
      b.addEventListener('click', () => this.hold({ decor: d.id }, d.label));
      objects.append(b);
    }
    section('put on a shelf', objects);

    const stickers = el('div');
    const search = el('input', 'gs-field gs-decorate-search');
    search.type = 'search';
    search.placeholder = 'find a sticker';
    search.dataset.gs = 'sticker-search';
    const tabs = el('div', 'gs-decorate-tabs');
    const grid = el('div', 'gs-decorate-grid gs-decorate-stickers');
    const show = (items: readonly PackItem[]): void => {
      grid.replaceChildren(
        ...items.map((item) => {
          const b = el('button', 'gs-decorate-pick');
          b.type = 'button';
          b.title = item.name;
          b.dataset.gs = 'sticker-pick';
          b.setAttribute('aria-label', `${item.name} sticker`);
          b.innerHTML = renderStickerFace({ mark: item.mark, emoji: item.emoji });
          b.addEventListener('click', () =>
            this.hold({ sticker: item }, `the ${item.name} sticker`),
          );
          return b;
        }),
      );
    };
    for (const pack of PACKS) {
      const t = el('button', 'gs-btn gs-chip-btn', pack.label);
      t.type = 'button';
      t.dataset.gs = `pack-${pack.id}`;
      t.addEventListener('click', () => {
        for (const o of tabs.querySelectorAll('button'))
          o.setAttribute('aria-pressed', String(o === t));
        search.value = '';
        show(pack.items);
      });
      tabs.append(t);
    }
    search.addEventListener('input', () =>
      show(search.value.trim() ? findStickers(search.value) : (PACKS[0]?.items ?? [])),
    );
    stickers.append(search, tabs, grid);
    tabs.querySelector('button')?.setAttribute('aria-pressed', 'true');
    show(PACKS[0]?.items ?? []);
    section('stick on the bookcase', stickers);
    panel.append(
      el(
        'p',
        'gs-decorate-note',
        'Carry objects like books. Press one, or a sticker, to take it away.',
      ),
    );
    document.body.append(panel);
    this.panel = panel;
    document.querySelector('[data-gs="shelf-decorate"]')?.setAttribute('aria-pressed', 'true');
  }

  close(): void {
    this.panel?.remove();
    this.panel = undefined;
    this.drop();
    document.querySelector('[data-gs="shelf-decorate"]')?.setAttribute('aria-pressed', 'false');
  }

  private hold(what: NonNullable<Holding>, label: string): void {
    this.holding = what;
    document.body.toggleAttribute('data-placing', true);
    this.hint?.close();
    this.hint = toast(
      `press the bookcase where ${label} should go (press beside it, or Escape, to cancel)`,
    );
  }

  private drop(): void {
    this.holding = undefined;
    document.body.removeAttribute('data-placing');
    this.hint?.close();
    this.hint = undefined;
  }

  /** The press that puts down what is held. */
  private put(event: PointerEvent): void {
    const holding = this.holding;
    if (!holding) return;
    const target = event.target as HTMLElement;
    if (target.closest('.gs-decorate, .gs-top, .gs-toasts')) return;
    const room = this.app.room;
    // A press beside the bookcase puts it back: a phone has no Escape key.
    if (!room || !target.closest('[data-gs="room"]')) {
      this.drop();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.drop();
    const scale = this.app.scale;
    if ('decor' in holding) {
      const shelf =
        target.closest<HTMLElement>('[data-shelf="use"]') ?? this.shelfAt(event.clientY);
      if (!shelf) {
        toast('put it on a shelf in use', 'error');
        return;
      }
      const box = shelf.getBoundingClientRect();
      void this.app.shelfCall('decor', {
        decor: holding.decor,
        row: Number(shelf.dataset.row) || 0,
        x: Math.round((event.clientX - box.left) / scale),
      });
      return;
    }
    const bookcase =
      room.querySelector<HTMLElement>('.bookcase-use .case-decals') ??
      room.querySelector<HTMLElement>('.bookcase-use');
    if (!bookcase) return;
    const box = room.querySelector<HTMLElement>('.bookcase-use')?.getBoundingClientRect();
    const inner = bookcase.getBoundingClientRect();
    const area = bookcase.classList.contains('case-decals') ? inner : box;
    if (!area) return;
    void this.app.shelfCall('decal', {
      ...(holding.sticker.mark ? { mark: holding.sticker.mark } : { emoji: holding.sticker.emoji }),
      x: Math.round(((event.clientX - area.left) / area.width) * 1000) / 10,
      y: Math.round(((event.clientY - area.top) / area.height) * 1000) / 10,
      size: 52,
      rotation: Math.round((Math.random() - 0.5) * 16),
    });
  }

  private shelfAt(clientY: number): HTMLElement | undefined {
    return [...document.querySelectorAll<HTMLElement>('[data-shelf="use"]')].find((s) => {
      const r = s.getBoundingClientRect();
      return clientY >= r.top && clientY <= r.bottom;
    });
  }
}
