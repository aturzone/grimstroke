/**
 * The "/" bar on a notebook's spread: the island (app/shape/island.ts), with the notebook as its
 * host.
 *
 * A card typed here goes on the page in view -- the second page of the spread, or the single
 * page on a phone -- under what is already on it, as a `leaf.items` patch on the notebook's own
 * session: the spread repaints that leaf from the server, with no reload, and undo takes it back.
 * A card's controls on the spread work as they do on its page.
 */

import { toast } from '~/app/chrome.ts';
import { appear, play } from '~/app/feel.ts';
import type { Session } from '~/app/net.ts';
import { ShapeIsland } from '~/app/shape/island.ts';
import { type BookSpec, boundLeaves, leafSize } from '~/draw/doc/book/model.ts';
import type { BookOp } from '~/draw/doc/book/patch.ts';
import { upgradeLeaf } from '~/draw/doc/legacy.ts';
import type { ShapeBlock } from '~/draw/shape/render.ts';

export interface BookShapeSource {
  readonly session: Session<BookSpec, BookOp>;
  /** The spread's element. */
  readonly element: HTMLElement;
  /** The leaf a new card goes on. */
  leafInView(): string | undefined;
  /** False while the notebook is shut. */
  isOpen(): boolean;
  /** Turn to a page (from one), if it is not in view. */
  turnTo?(page: number): void;
}

function shapeOn(spec: BookSpec, leafId: string, id: string): ShapeBlock | undefined {
  const leaf = boundLeaves(spec).find((l) => l.id === leafId);
  const item = leaf ? upgradeLeaf(leaf).items?.find((i) => i.id === id) : undefined;
  return item?.block?.kind === 'shape' ? item.block : undefined;
}

export function bookShapes(book: BookShapeSource): ShapeIsland {
  const where = (inside: HTMLElement): { leaf: string; id: string } | undefined => {
    const leaf = inside.closest<HTMLElement>('[data-gs="leaf"]')?.dataset.gsId;
    const id = inside.closest<HTMLElement>('[data-gs="item"]')?.dataset.gsId;
    return leaf && id ? { leaf, id } : undefined;
  };
  // Item ids are unique within a leaf; the island sees them as leaf/id.
  const split = (key: string): { leaf: string; id: string } => {
    const at = key.indexOf('/');
    return { leaf: key.slice(0, at), id: key.slice(at + 1) };
  };

  /**
   * Under the lowest thing on a page in view, at its margin -- or nothing, if it will not fit.
   * A page not drawn right now is measured only if it is empty.
   */
  const spot = (leafId: string, height: number): [number, number] | undefined => {
    const [, h] = leafSize(book.session.spec);
    const el = book.element.querySelector<HTMLElement>(
      `[data-gs="leaf"][data-gs-id="${CSS.escape(leafId)}"]`,
    );
    if (!el) {
      const leaf = boundLeaves(book.session.spec).find((l) => l.id === leafId);
      return leaf && !(upgradeLeaf(leaf).items ?? []).length ? [40, 44] : undefined;
    }
    let bottom = 0;
    for (const item of el.querySelectorAll<HTMLElement>('[data-gs="item"]')) {
      bottom = Math.max(bottom, item.offsetTop + item.offsetHeight);
    }
    const y = bottom ? bottom + 16 : 44;
    return y + height > h - 40 ? undefined : [40, Math.round(y)];
  };

  /** The page in view if it has room, else the other page of the spread, else the next empty one. */
  const room = (
    height: number,
  ): { leaf: string; at: [number, number]; page: number } | undefined => {
    const leaves = boundLeaves(book.session.spec);
    const first = book.leafInView();
    const index = Math.max(
      0,
      leaves.findIndex((l) => l.id === first),
    );
    const order = [
      index,
      index % 2 ? index - 1 : index + 1,
      ...leaves.map((_, i) => i).filter((i) => i > index + 1),
    ];
    for (const i of order) {
      const leaf = leaves[i];
      if (!leaf) continue;
      const at = spot(leaf.id, height);
      if (at) return { leaf: leaf.id, at, page: i + 1 };
    }
    return first ? { leaf: first, at: [40, 44], page: index + 1 } : undefined;
  };

  const topOf = (leafId: string): number => {
    const leaf = boundLeaves(book.session.spec).find((l) => l.id === leafId);
    return (leaf ? (upgradeLeaf(leaf).items ?? []) : []).reduce((m, i) => Math.max(m, i.z ?? 0), 0);
  };

  const island = new ShapeIsland({
    surface: book.element,
    find: (inside) => {
      const at = where(inside);
      const block = at ? shapeOn(book.session.spec, at.leaf, at.id) : undefined;
      return at && block ? { id: `${at.leaf}/${at.id}`, block } : undefined;
    },
    save: (key, block) => {
      const { leaf, id } = split(key);
      book.session.run(
        [{ op: 'leaf.items', id: leaf, ops: [{ op: 'update', id, patch: { block } }] }],
        `shape:${key}`,
      );
    },
    add: (block, width) => {
      const place = room(220);
      if (!place) return;
      const { leaf, at } = place;
      // A card that goes on another page is followed there, not just announced.
      if (place.leaf !== book.leafInView()) {
        toast(`this page is full: the card went on page ${place.page}`);
        window.setTimeout(() => book.turnTo?.(place.page), 250);
      }
      const [w] = leafSize(book.session.spec);
      const size = Math.min(width, w - 80);
      const cardId = `card-${Date.now().toString(36)}`;
      // The spread repaints the leaf from the server; when the card is on it, it lands.
      const started = performance.now();
      const land = (): void => {
        const el = book.element.querySelector(`[data-gs-id="${cardId}"]`);
        if (el) {
          appear(el);
          play('pop');
        } else if (performance.now() - started < 2000) requestAnimationFrame(land);
      };
      requestAnimationFrame(land);
      book.session.run(
        [
          {
            op: 'leaf.items',
            id: leaf,
            ops: [
              {
                op: 'add',
                item: {
                  id: cardId,
                  at,
                  size: [size],
                  z: topOf(leaf) + 1,
                  block,
                },
              },
            ],
          },
        ],
        'shape',
      );
    },
    ready: () => book.isOpen(),
  });
  return island;
}
