/**
 * What a block says, as plain text.
 *
 * One answer to "what words are on this", used by everything that needs the words and not
 * the markup: the glyph check that warns when a face cannot draw a character, the script
 * detection that switches leading for Persian, and search. There were three copies of this,
 * one per document, and they disagreed -- a board's did not read captions' callouts, a
 * notebook's did not read tables -- so a word could be findable on a page and not on a board.
 */

import type { Block } from '~/draw/material/model.ts';
import type { Profile } from '~/draw/material/profile/model.ts';

/** Every run of text a block shows, in reading order. */
export function textOf(block: Block): string[] {
  switch (block.kind) {
    case 'heading':
    case 'text':
    case 'label':
      return [block.text];
    case 'quote':
      return [block.text, block.cite ?? ''];
    case 'note':
      return [block.title ?? '', block.text];
    case 'bullets':
      return block.items;
    case 'table':
      return block.rows.flat();
    case 'code':
      return [block.label ?? '', block.text];
    case 'image':
      return [block.image.caption ?? '', ...(block.image.marks ?? []).map((m) => m.note ?? '')];
    case 'compare':
      return block.images.flatMap((image) => [
        image.caption ?? '',
        ...(image.marks ?? []).map((m) => m.note ?? ''),
      ]);
    case 'profile':
      return profileText(block.profile);
    case 'stack':
      return block.blocks.flatMap(textOf);
    case 'sticker':
      return [block.words ?? block.mark ?? ''].filter(Boolean);
    case 'divider':
    case 'spacer':
      return [];
  }
}

/** Everything a list of blocks says, as one string. */
export function textOfAll(blocks: readonly Block[]): string {
  return blocks.flatMap(textOf).filter(Boolean).join(' ');
}

/** Arabic script anywhere in the text: the switch for Persian leading and shaping. */
export const ARABIC = /[\u0600-\u06ff\u0750-\u077f\ufb50-\ufdff\ufe70-\ufeff]/;

/** Every word on a profile card: the name, what they are for, and the details. */
export function profileText(profile: Profile): string[] {
  return [
    profile.name ?? '',
    profile.role ?? '',
    profile.bio ?? '',
    ...(profile.details ?? []).flatMap((d) => [d.label, d.value]),
  ];
}

/** Every word on a page: what is placed on it, and a column written to it. */
export function leafText(leaf: {
  items?: ReadonlyArray<{ block?: Block }>;
  blocks?: readonly Block[];
}): string[] {
  return [
    ...(leaf.items ?? []).flatMap((item) => (item.block ? textOf(item.block) : [])),
    ...(leaf.blocks ?? []).flatMap(textOf),
  ];
}
