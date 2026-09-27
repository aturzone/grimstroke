/**
 * The "/" bar on a board or a page: the island (app/shape/island.ts), with the board as its host.
 *
 * A new card goes in clear space near the middle of the view; a change is a patch on the board's
 * own session, so undo takes it back like anything else.
 */

import type { BoardContext } from '~/app/board/context.ts';
import { ShapeIsland } from '~/app/shape/island.ts';
import type { BoardItem } from '~/draw/doc/board/model.ts';
import { topZ } from '~/draw/doc/board/patch.ts';
import type { ShapeBlock } from '~/draw/shape/render.ts';

export class ShapeBar {
  private readonly ctx: BoardContext;
  private readonly island: ShapeIsland;
  private placed = 0;

  constructor(ctx: BoardContext) {
    this.ctx = ctx;
    const shapeOf = (id: string): ShapeBlock | undefined => {
      const block = ctx.items().get(id)?.block;
      return block?.kind === 'shape' ? block : undefined;
    };
    this.island = new ShapeIsland({
      get surface() {
        return ctx.viewport;
      },
      find: (inside) => {
        const id = inside.closest<HTMLElement>('[data-gs="item"]')?.dataset.gsId;
        const block = id ? shapeOf(id) : undefined;
        return id && block ? { id, block } : undefined;
      },
      save: (id, block) => ctx.session.run([{ op: 'update', id, patch: { block } }], `shape:${id}`),
      add: (block, width) => {
        const id = ctx.nextId('card');
        const item: BoardItem = {
          id,
          at: this.freeSpot(width, 240),
          z: topZ(ctx.session.spec) + 1,
          size: [width],
          block,
        };
        ctx.session.run([{ op: 'add', item }], 'shape');
        ctx.selection.clear();
        ctx.selection.set(id, true);
      },
    });
  }

  bind(): void {
    this.island.bind();
  }

  /** A placed card, back in the box to be changed. */
  edit(id: string): void {
    const block = this.ctx.items().get(id)?.block;
    if (block?.kind === 'shape') this.island.edit(id, block);
  }

  /**
   * Where a new card goes: the middle of the view if it is clear, else the nearest clear place
   * around it, ring by ring -- cards made one after another sit side by side, not in a pile.
   */
  private freeSpot(w: number, h: number): [number, number] {
    const box = this.ctx.viewport.getBoundingClientRect();
    const centre = this.ctx.view.toBoard({
      x: box.left + box.width / 2,
      y: box.top + box.height * 0.42,
    });
    const taken: Array<[number, number, number, number]> = [];
    for (const node of this.ctx.board.querySelectorAll<HTMLElement>('[data-gs="item"]')) {
      const r = node.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const a = this.ctx.view.toBoard({ x: r.left, y: r.top });
      const b = this.ctx.view.toBoard({ x: r.right, y: r.bottom });
      taken.push([a.x, a.y, b.x, b.y]);
    }
    const sheet = this.ctx.board.dataset.gsSheet?.split(',').map(Number);
    const clear = (x: number, y: number): boolean =>
      taken.every(
        ([x1, y1, x2, y2]) => x + w + 12 <= x1 || x >= x2 + 12 || y + h + 12 <= y1 || y >= y2 + 12,
      );
    const inside = (x: number, y: number): boolean =>
      !sheet ||
      sheet.length !== 2 ||
      (x >= 8 && y >= 8 && x + w <= (sheet[0] ?? 0) - 8 && y + h <= (sheet[1] ?? 0) - 8);
    const start: [number, number] = [Math.round(centre.x - w / 2), Math.round(centre.y - h / 2)];
    if (clear(...start) && inside(...start)) return start;
    for (let ring = 1; ring <= 14; ring++) {
      const d = ring * 40;
      for (let k = 0; k < ring * 8; k++) {
        const a = (k / (ring * 8)) * Math.PI * 2;
        const x = Math.round(start[0] + Math.cos(a) * d * 1.6);
        const y = Math.round(start[1] + Math.sin(a) * d);
        if (clear(x, y) && inside(x, y)) return [x, y];
      }
    }
    const step = (this.placed++ % 6) * 28;
    return [start[0] + step, start[1] + step];
  }
}
