/**
 * A card on the / board, as data: the card, and where it lives. Whether it is done is a fact
 * about its state, read the same way by the board, the day and an agent.
 */

import type { ShapeBlock } from '@core/box/card.ts';

/** One card, and where it lives. */
export interface SlashEntry {
  /** The board, or the page of a notebook (book:<id>:<page>), the card is on. */
  address: string;
  id: string;
  block: ShapeBlock;
  where: { title: string; href: string };
}

/** The key a card is found by on this page: its address and its id. */
export const slashKey = (e: Pick<SlashEntry, 'address' | 'id'>): string => `${e.address}|${e.id}`;

/** Done is a thing marked done, or a list with every line ticked. */
export function isDone(block: ShapeBlock): boolean {
  if (block.state?.closed) return true;
  if (block.intent !== 'todo') return false;
  const lines = block.text.split('\n').filter((l) => l.trim()).length;
  return lines > 0 && (block.state?.done?.length ?? 0) >= lines;
}

/** Where the box puts what it makes when nobody said where. */
export const SLASH_BOARD = 'slash';
