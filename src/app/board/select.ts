/**
 * What is selected, on screen and in the model.
 *
 * One set of ids, and the one attribute that shows it. The export buttons act on it, the
 * Delete key acts on it, and a drag moves all of it -- so there is exactly one answer to
 * "what am I about to do this to".
 */

import type { Point } from '~/app/board/view.ts';

export class Selection {
  private readonly ids = new Set<string>();
  private readonly board: HTMLElement;
  private readonly find: (id: string) => HTMLElement | null;
  private readonly watchers = new Set<() => void>();

  constructor(board: HTMLElement, find: (id: string) => HTMLElement | null) {
    this.board = board;
    this.find = find;
  }

  /** Told whenever what is selected changes. */
  watch(fn: () => void): void {
    this.watchers.add(fn);
  }

  get size(): number {
    return this.ids.size;
  }

  has(id: string): boolean {
    return this.ids.has(id);
  }

  list(): string[] {
    return [...this.ids];
  }

  set(id: string, on: boolean): void {
    if (on) this.ids.add(id);
    else this.ids.delete(id);
    const element = this.find(id);
    if (element) {
      if (on) element.dataset.selected = '1';
      else delete element.dataset.selected;
    }
    this.showScope();
  }

  /** Forget an id without touching the page: the element is already gone. */
  drop(id: string): void {
    this.ids.delete(id);
    this.showScope();
  }

  clear(): void {
    for (const id of [...this.ids]) this.set(id, false);
    this.showScope();
  }

  /** Everything whose box on screen overlaps the rectangle between two screen points. */
  within(a: Point, b: Point): void {
    const left = Math.min(a.x, b.x);
    const right = Math.max(a.x, b.x);
    const top = Math.min(a.y, b.y);
    const bottom = Math.max(a.y, b.y);
    if (right - left < 4 && bottom - top < 4) return;
    for (const element of this.board.querySelectorAll<HTMLElement>('[data-gs="item"]')) {
      const box = element.getBoundingClientRect();
      const inside = box.left < right && box.right > left && box.top < bottom && box.bottom > top;
      if (inside && element.dataset.gsId) this.set(element.dataset.gsId, true);
    }
  }

  /** Say what the export buttons will act on, so nobody has to guess. */
  private showScope(): void {
    const n = this.ids.size;
    const badge = document.querySelector<HTMLElement>('[data-gs="scope"]');
    if (badge) {
      badge.hidden = n < 2;
      badge.textContent = `${n} selected`;
    }
    const scope = document.querySelector<HTMLElement>('[data-gs="export-scope"]');
    if (scope)
      scope.textContent =
        n === 0 ? 'the whole board' : n === 1 ? 'the one selected' : `the ${n} selected`;
    for (const fn of this.watchers) fn();
  }
}
