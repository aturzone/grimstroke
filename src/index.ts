/**
 * The core's public API: the documents as data and the operations on them, the / box's reading
 * of what is typed, the day, the store, and the server. Nothing here draws; a face does
 * (host/serve/face.ts), and a face is what `serve` is given to draw with.
 */

export { extentOf, WORKSPACE_PAD, workspaceExtent } from '~/draw/doc/board/extent.ts';
export type { BoardItem, BoardSpec, Ink, InkTool } from '~/draw/doc/board/model.ts';
export { ITEM_HEIGHT, ITEM_MAX_WIDTH, ITEM_WIDTH } from '~/draw/doc/board/model.ts';
export type { Op, PatchResult } from '~/draw/doc/board/patch.ts';
export { apply, PatchError, topZ } from '~/draw/doc/board/patch.ts';
export type { BookSpec, Cover, CoverMaterial, Leaf, Sticker } from '~/draw/doc/book/model.ts';
export { bookTitle, boundLeaves, leafSize } from '~/draw/doc/book/model.ts';
export type { BookOp } from '~/draw/doc/book/patch.ts';
export { apply as applyBook } from '~/draw/doc/book/patch.ts';
export { search } from '~/draw/doc/search.ts';
export type { ShelfLayout, ShelfSlot } from '~/draw/doc/shelf/model.ts';
export type { Block } from '~/draw/material/model.ts';
export type { Profile } from '~/draw/material/profile/model.ts';
export type { ShapeBlock, ShapeState } from '~/draw/shape/card.ts';
export { summarize } from '~/draw/shape/card.ts';
export type { IntentKey } from '~/draw/shape/classify.ts';
export { classify } from '~/draw/shape/classify.ts';
export { COMMANDS, matchCommands } from '~/draw/shape/commands.ts';
export type { ShapeIntent } from '~/draw/shape/intents.ts';
export { INTENTS, SHAPE_INTENTS } from '~/draw/shape/intents.ts';
export { parseIssue } from '~/draw/shape/issue.ts';
export { CONCEPTS, chooseLabels } from '~/draw/shape/labels.ts';
export type { TodayData, TodayEntry, TodaySource } from '~/draw/today/gather.ts';
export { calendarMonth, gatherToday } from '~/draw/today/gather.ts';
export type { Drawn, Face } from '~/host/serve/face.ts';
export type { ServeOptions, Serving } from '~/host/serve/server.ts';
export { serve } from '~/host/serve/server.ts';
export type { Settings, StoreOptions } from '~/host/store/store.ts';
export { Store, safeName } from '~/host/store/store.ts';
