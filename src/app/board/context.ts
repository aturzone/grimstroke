/**
 * What every part of the board app shares.
 *
 * The board is split by concern -- the gestures, the selection, the notes, the exports -- and
 * each part is handed this rather than the whole app, so what a part can reach is written
 * down in one place instead of being whatever happened to be a field on a class.
 */

import type { Selection } from '~/app/board/select.ts';
import type { Tool } from '~/app/board/tools.ts';
import type { View } from '~/app/board/view.ts';
import type { Session } from '~/app/net.ts';
import type { BoardItem, BoardSpec } from '~/draw/doc/board/model.ts';
import type { Op } from '~/draw/doc/board/patch.ts';

export interface BoardContext {
  readonly view: View;
  readonly viewport: HTMLElement;
  /** The scaled sheet every item is a child of. */
  readonly board: HTMLElement;
  readonly session: Session<BoardSpec, Op>;
  readonly selection: Selection;
  /** The tool in hand, and the ink it draws with. */
  readonly tool: Tool;
  readonly ink: string;
  setTool(tool: Tool): void;
  /** The model's items, by id. */
  items(): Map<string, BoardItem>;
  /** The element on screen for an item, if it is there. */
  element(id: string): HTMLElement | null;
  /** Put an item's element at a board position, without touching the model. */
  place(element: HTMLElement, at: [number, number]): void;
  /** A fresh id with a readable prefix. */
  nextId(prefix: string): string;
}
