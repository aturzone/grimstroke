/**
 * The core's public API: the documents as data and the operations on them, the / box's reading
 * of what is typed, the day, the store, and the server. Nothing here draws; a face does
 * (host/serve/face.ts), and a face is what `serve` is given to draw with.
 */

export type { ShapeBlock, ShapeState } from '@core/box/card.ts';
export { summarize } from '@core/box/card.ts';
export type { IntentKey } from '@core/box/classify.ts';
export { classify } from '@core/box/classify.ts';
export { COMMANDS, matchCommands } from '@core/box/commands.ts';
export type { ShapeIntent } from '@core/box/intents.ts';
export { INTENTS, SHAPE_INTENTS } from '@core/box/intents.ts';
export { parseIssue } from '@core/box/issue.ts';
export { CONCEPTS, chooseLabels } from '@core/box/labels.ts';
export type { TodayData, TodayEntry, TodaySource } from '@core/day/gather.ts';
export { calendarMonth, gatherToday } from '@core/day/gather.ts';
export type { Block } from '@core/docs/block.ts';
export type { BoardItem, BoardSpec, Ink, InkTool } from '@core/docs/board.ts';
export { ITEM_HEIGHT, ITEM_MAX_WIDTH, ITEM_WIDTH } from '@core/docs/board.ts';
export { extentOf, WORKSPACE_PAD, workspaceExtent } from '@core/docs/board-extent.ts';
export type { Op, PatchResult } from '@core/docs/board-patch.ts';
export { apply, PatchError, topZ } from '@core/docs/board-patch.ts';
export type { BookSpec, Cover, CoverMaterial, Leaf, Sticker } from '@core/docs/book.ts';
export { bookTitle, boundLeaves, leafSize } from '@core/docs/book.ts';
export type { BookOp } from '@core/docs/book-patch.ts';
export { apply as applyBook } from '@core/docs/book-patch.ts';
export type { Profile } from '@core/docs/profile.ts';
export { search } from '@core/docs/search.ts';
export type { ShelfLayout, ShelfSlot } from '@core/docs/shelf.ts';
export type { Drawn, Face } from '@core/serve/face.ts';
export type { ServeOptions, Serving } from '@core/serve/server.ts';
export { serve } from '@core/serve/server.ts';
export type { Settings, StoreOptions } from '@core/store/store.ts';
export { Store, safeName } from '@core/store/store.ts';
