/**
 * Documents written by earlier versions, brought up to date as they are read.
 *
 * A stored file is somebody's work, and it is never rewritten just because the code moved
 * on. It is read, upgraded in memory, and only written back the next time it actually
 * changes -- so a file nobody touches stays exactly what it was on disk.
 *
 * Pure: plain data in, plain data out.
 */

import type { BoardItem, BoardSpec } from '~/draw/doc/board/model.ts';
import {
  type BookSpec,
  CARD_PLACE,
  type Cover,
  LEAF_MARGIN,
  LEAF_WIDTH,
  type Leaf,
  type Sticker,
} from '~/draw/doc/book/model.ts';
import type { Block } from '~/draw/material/model.ts';
import { type Profile, readProfile } from '~/draw/material/profile/model.ts';

/**
 * One block. Characters became a single, drawn profile: a face on a board or a card made from
 * one becomes the profile card, carrying the name and the words the character had.
 */
export function upgradeBlock(block: Block): Block {
  const legacy = block as unknown as { kind: string; character?: unknown; profile?: unknown };
  if (
    legacy.kind === 'face' ||
    (legacy.kind === 'profile' && legacy.character && !legacy.profile)
  ) {
    return { kind: 'profile', profile: readProfile(legacy.character) };
  }
  return block;
}

export function upgradeBoard(spec: BoardSpec): BoardSpec {
  return {
    ...spec,
    items: spec.items.map((item) =>
      item.block ? { ...item, block: upgradeBlock(item.block) } : item,
    ),
  };
}

export function upgradeCover(cover: Cover | undefined): Cover | undefined {
  if (!cover) return cover;
  const stickers = cover.stickers?.filter(
    // A face sticker was a character's head. There is nothing honest to turn it into.
    (sticker) => (sticker as unknown as { kind: string }).kind !== 'face',
  ) as Sticker[] | undefined;
  const profile = cover.profile as (Profile & { parts?: unknown; id?: unknown }) | undefined;
  const { profile: _, ...rest } = cover;
  const list = (stickers ?? []).map((sticker) =>
    sticker.kind === 'card' && sticker.profile
      ? { ...sticker, profile: readProfile(sticker.profile) }
      : sticker,
  );
  // The card had one fixed place; it is a sticker now, left exactly where it was.
  if (profile && !list.some((sticker) => sticker.kind === 'card')) {
    list.push({ id: 'card', kind: 'card', ...CARD_PLACE, profile: readProfile(profile) });
  }
  return { ...rest, ...(list.length || stickers ? { stickers: list } : {}) };
}

export function upgradeBook(spec: BookSpec): BookSpec {
  const cover = upgradeCover(spec.cover);
  return {
    ...spec,
    ...(cover ? { cover } : {}),
    leaves: spec.leaves.map(upgradeLeaf),
  };
}

/** The id of the item a page's column of blocks is folded into. */
export function columnId(leaf: Pick<Leaf, 'id'>): string {
  return `${leaf.id}-column`;
}

/**
 * A leaf, as placed items only.
 *
 * Leaves were a column of blocks once, and a page can still be written that way. The column
 * becomes one 'stack' item set at the page's margins -- where the column used to sit -- and
 * a column written again replaces the stack's contents and keeps wherever it has been moved
 * to since. Nothing is lost: the blocks are all still there, inside the stack.
 */
export function upgradeLeaf(leaf: Leaf): Leaf {
  const { blocks: raw, ...rest } = leaf;
  const items: BoardItem[] = (leaf.items ?? []).map((item) =>
    item.block ? { ...item, block: upgradeBlock(item.block) } : item,
  );
  const blocks = (raw ?? []).map(upgradeBlock);
  if (blocks.length === 0) return { ...rest, items };
  const id = columnId(leaf);
  const existing = items.find((item) => item.id === id);
  const stack: BoardItem = existing
    ? { ...existing, block: { kind: 'stack', blocks } }
    : {
        id,
        at: [LEAF_MARGIN[0], LEAF_MARGIN[1]],
        size: [LEAF_WIDTH - LEAF_MARGIN[0] * 2],
        z: 0,
        block: { kind: 'stack', blocks },
      };
  return { ...rest, items: [stack, ...items.filter((item) => item.id !== id)] };
}
