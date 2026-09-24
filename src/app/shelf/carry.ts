/**
 * Carrying a book: pressed and moved, it comes off the shelf and follows the hand; the shelf
 * under it shows where it would go -- a line between two books, or the outline of a book lying
 * flat where nothing would hold it up -- and let go, it is put there.
 *
 * Pressed and let go without moving, it was a press, not a carry: the book is taken down to
 * look at (or chosen, when choosing).
 */

import type { ShelfApp } from '~/app/shelf/index.ts';

/** Moved further than this, a press becomes a carry. */
const LIFT = 6;
/** Near the end of a run, a book joins it; this must match the layout's REACH. */
const REACH = 26;

interface Target {
  shelf: HTMLElement;
  to: 'use' | 'archive';
  row: number;
  x: number;
}

function num(el: HTMLElement | undefined, name: string): number {
  return Number.parseFloat(el?.style.getPropertyValue(name) ?? '0') || 0;
}

export class Carry {
  private readonly app: ShelfApp;

  constructor(app: ShelfApp) {
    this.app = app;
  }

  bind(): void {
    document.addEventListener('pointerdown', (event) => this.down(event));
    // A button's click from the keyboard: Enter or Space on a focused spine.
    document.addEventListener('click', (event) => {
      const spine = (event.target as HTMLElement).closest<HTMLElement>('.spine');
      if (!spine || event.detail !== 0) return;
      this.app.pressed(spine, event);
    });
  }

  private down(event: PointerEvent): void {
    const spine = (event.target as HTMLElement).closest<HTMLElement>('.spine');
    if (!spine || event.button !== 0 || !spine.closest('[data-gs="room"]')) return;
    event.preventDefault();
    const start = { x: event.clientX, y: event.clientY };
    const id = spine.dataset.gsId ?? '';
    let carry: HTMLElement | undefined;
    let marker: HTMLElement | undefined;
    let target: Target | undefined;
    const grab = spine.getBoundingClientRect();
    const offset = { x: start.x - grab.left, y: start.y - grab.bottom };
    // Carrying one of the chosen carries all of them.
    const ids = this.app.selected.has(id) ? [...this.app.selected] : [id];

    const move = (ev: PointerEvent): void => {
      if (!carry) {
        if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < LIFT) return;
        carry = this.lift(spine, ids);
      }
      carry.style.transform = `translate(${ev.clientX - offset.x}px, ${ev.clientY - offset.y}px) translate(0, -100%)`;
      target = this.targetAt(ev.clientX, ev.clientY, spine, offset.x);
      marker = this.mark(target, spine, marker);
    };
    const up = (ev: PointerEvent): void => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      marker?.remove();
      for (const s of document.querySelectorAll('[data-over]')) s.removeAttribute('data-over');
      if (!carry) {
        if (ev.type === 'pointerup') this.app.pressed(spine, ev);
        return;
      }
      const rect = carry.getBoundingClientRect();
      carry.remove();
      for (const s of document.querySelectorAll('.is-carried')) s.classList.remove('is-carried');
      if (!target || ev.type === 'pointercancel') return;
      void this.app.drop(ids, target.to, target.row, target.x, { id, rect });
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  }

  /** The book comes off the shelf: a copy follows the hand; the ones carried leave gaps. */
  private lift(spine: HTMLElement, ids: readonly string[]): HTMLElement {
    const carry = document.createElement('div');
    carry.className = 'shelf-carry';
    carry.style.zoom = String(this.app.scale);
    const copy = spine.cloneNode(true) as HTMLElement;
    copy.removeAttribute('data-flat');
    copy.removeAttribute('data-selected');
    copy.style.setProperty('--x', '0px');
    copy.style.setProperty('--y', '0px');
    copy.style.removeProperty('--lean');
    carry.append(copy);
    if (ids.length > 1) {
      const n = document.createElement('span');
      n.className = 'shelf-carry-count';
      n.textContent = String(ids.length);
      carry.append(n);
    }
    document.body.append(carry);
    for (const id of ids) this.app.spine(id)?.classList.add('is-carried');
    return carry;
  }

  /** The shelf under the hand, and how far along it, in the bookcase's own pixels. */
  private targetAt(cx: number, cy: number, spine: HTMLElement, grabX: number): Target | undefined {
    for (const s of document.querySelectorAll('[data-over]')) s.removeAttribute('data-over');
    const scale = this.app.scale;
    for (const shelf of document.querySelectorAll<HTMLElement>('[data-gs="shelf"]')) {
      const box = shelf.getBoundingClientRect();
      if (cy < box.top || cy > box.bottom + 20 || cx < box.left - 40 || cx > box.right + 40)
        continue;
      shelf.toggleAttribute('data-over', true);
      const w = num(spine, '--w');
      // Where the book's middle would be, measured from the wall.
      const x = (cx - box.left) / scale - grabX / scale + w / 2;
      return {
        shelf,
        to: shelf.dataset.shelf === 'archive' ? 'archive' : 'use',
        row: Number(shelf.dataset.row) || 0,
        x: Math.max(0, x),
      };
    }
    return undefined;
  }

  /** Show where it would go: between two books, or lying flat out along the shelf. */
  private mark(
    target: Target | undefined,
    spine: HTMLElement,
    old?: HTMLElement,
  ): HTMLElement | undefined {
    old?.remove();
    if (!target || target.to === 'archive') return undefined;
    const space = target.shelf.querySelector<HTMLElement>('.case-space');
    if (!space) return undefined;
    const standing = [
      ...space.querySelectorAll<HTMLElement>('.spine:not([data-flat]):not(.is-carried)'),
    ];
    const end = standing.reduce((e, s) => Math.max(e, num(s, '--x') + num(s, '--w')), 0);
    const marker = document.createElement('div');
    marker.className = 'case-drop';
    if (target.x - num(spine, '--w') / 2 > end + REACH) {
      const h = num(spine, '--h');
      marker.classList.add('case-drop-flat');
      marker.style.left = `${Math.max(end + 6, target.x - h / 2)}px`;
      marker.style.width = `${h}px`;
      marker.style.height = `${num(spine, '--w')}px`;
    } else {
      const before = standing.filter((s) => num(s, '--x') + num(s, '--w') / 2 < target.x);
      const last = before[before.length - 1];
      marker.classList.add('case-drop-in');
      marker.style.left = `${last ? num(last, '--x') + num(last, '--w') : 0}px`;
    }
    space.append(marker);
    return marker;
  }
}
