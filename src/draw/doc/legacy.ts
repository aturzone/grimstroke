/**
 * Documents written by earlier versions, brought up to date as they are read.
 *
 * A stored file is somebody's work, and it is never rewritten just because the code moved
 * on. It is read, upgraded in memory, and only written back the next time it actually
 * changes -- so a file nobody touches stays exactly what it was on disk.
 *
 * Pure: plain data in, plain data out.
 */

import type { BoardSpec } from '~/draw/doc/board/model.ts';
import type { BookSpec, Cover, Sticker } from '~/draw/doc/book/model.ts';
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

function upgradeCover(cover: Cover | undefined): Cover | undefined {
  if (!cover) return cover;
  const stickers = cover.stickers?.filter(
    // A face sticker was a character's head. There is nothing honest to turn it into.
    (sticker) => (sticker as unknown as { kind: string }).kind !== 'face',
  ) as Sticker[] | undefined;
  const profile = cover.profile as (Profile & { parts?: unknown; id?: unknown }) | undefined;
  return {
    ...cover,
    ...(stickers ? { stickers } : {}),
    ...(profile ? { profile: readProfile(profile) } : {}),
  };
}

export function upgradeBook(spec: BookSpec): BookSpec {
  const cover = upgradeCover(spec.cover);
  return {
    ...spec,
    ...(cover ? { cover } : {}),
    leaves: spec.leaves.map((leaf) => ({ ...leaf, blocks: leaf.blocks.map(upgradeBlock) })),
  };
}
