/**
 * A block, as HTML: the one switch every document draws its materials through.
 *
 * The materials themselves live beside it -- words.ts for text, plate/ for pictures, note/
 * for the sticky note and profile/ for the card. A page stacks them in a column, a board
 * scatters them across a plane and a notebook binds them into leaves, but the markup
 * is identical in all three, and so is the guarantee that comes with it -- most importantly
 * that a picture is never altered by the thing it is mounted in.
 *
 * Pure. Nothing here opens a browser or touches the network.
 */

import type { Surface } from '~/draw/doc/surface.ts';
import type { Block, NoteInk } from '~/draw/material/model.ts';
import type { NoteStyle } from '~/draw/material/note/model.ts';
import { renderNote } from '~/draw/material/note/render.ts';
import { plate, renderCompare } from '~/draw/material/plate/render.ts';
import { renderProfile } from '~/draw/material/profile/render.ts';
import {
  renderBullets,
  renderCode,
  renderHeading,
  renderLabel,
  renderQuote,
  renderTable,
  renderText,
} from '~/draw/material/words.ts';

/**
 * What the board knows about a block that a page does not.
 *
 * A page stacks blocks in a column and gives each one a sequence number; a board places
 * items, and an item has an identity and a size that outlive any particular render. Passing
 * those down matters for exactly one reason: generative art is seeded, and a seed that moves
 * is art that changes. Seeded off the sequence number, a note re-tore its own edge and moved
 * its tape every time the pile was reordered -- which is every time you pick one up.
 */
export interface BlockPlacement {
  /** Stable identity. Seeds the tear and the tape. */
  seed?: string | undefined;
  /** The box the item actually occupies, so the paper is cut to fit it. */
  size?: readonly [number, (number | undefined)?] | undefined;
}

export function renderBlock(block: Block, ctx: Surface, place: BlockPlacement = {}): string {
  switch (block.kind) {
    case 'heading':
      return renderHeading(block, ctx);
    case 'text':
      return renderText(block, ctx);
    case 'label':
      return renderLabel(block, ctx);
    case 'bullets':
      return renderBullets(block, ctx);
    case 'table':
      return renderTable(block.rows, block.head ?? true, ctx);
    case 'code':
      return renderCode(block, ctx);
    case 'quote':
      return renderQuote(block, ctx);
    case 'image':
      return `<figure class="block"><div class="plates">${plate(block.image, ctx, block.zoom)}</div></figure>`;
    case 'compare':
      return renderCompare(block.images, block.syncMarks ?? true, ctx);
    case 'note':
      return renderSticky(block, ctx, place);
    case 'profile':
      return renderProfile(block.profile);
    case 'divider':
      return '<hr class="block">';
    case 'spacer':
      return `<div class="block" style="height:${block.size ?? 12}px"></div>`;
  }
}

/**
 * A sticky note.
 *
 * The real one, brought over from chevaletNote: torn paper with a stroked keyline, the
 * halftone pattern, the grain tile, a strip of tape across a corner, and the hard offset
 * shadow sharing the same torn path. A note is the object this whole look is named after, so
 * it is not approximated here.
 *
 * It defaults to a DIFFERENT palette from the page, not the page's own. A note in the same
 * ink and paper as the sheet it is stuck to is not a note stuck to a sheet, it is an indented
 * paragraph -- and the block exists precisely to say "this was added afterwards, by someone,
 * about the thing above it".
 */
function renderSticky(
  block: {
    text: string;
    title?: string;
    palette?: string;
    style?: Partial<NoteStyle>;
    collapsed?: boolean;
    ink?: readonly NoteInk[];
  },
  ctx: Surface,
  place: BlockPlacement = {},
): string {
  ctx.seq += 1;
  const chosen = block.palette ?? (ctx.pal.id === 'postit' ? 'acid' : 'postit');
  const [w, h] = place.size ?? [];
  return renderNote({
    // On a board the note is seeded by the item's own id, so the tear and the tape belong to
    // THAT note for as long as it exists. On a page there is no such identity and the
    // sequence number is the best there is.
    id: place.seed ? `${ctx.id}:note:${place.seed}` : `${ctx.id}:note:${ctx.seq}`,
    text: block.text,
    ...(block.title === undefined ? {} : { name: block.title }),
    ...(w === undefined ? {} : { width: w }),
    ...(h === undefined ? {} : { height: h }),
    ...(block.collapsed ? { collapsed: true } : {}),
    ...(block.ink?.length ? { ink: block.ink } : {}),
    digits: ctx.digits,
    style: { palette: chosen, ...block.style },
  });
}
