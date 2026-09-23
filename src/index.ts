/**
 * grimstroke -- a notebook for agents.
 *
 * Pages an agent writes, draws and annotates on, exported as images.
 *
 *   import { notebook } from 'grimstroke';
 *
 *   const book = notebook({ palette: 'newsprint' });
 *   book.page('login-button')
 *     .title('The login button is the same colour as its background')
 *     .chip('critical')
 *     .bullets('Measured `#4070F0` on `#4070F0` -- ratio `1.0:1`')
 *     .image('shot.png', { marks: [{ rect: 'src:150,400,600,100', badge: '1' }] })
 *     .note('The contrast threshold is 3:1.', { title: 'measured' });
 *
 *   await exportPages(book.render().map((p) => ({ page: p, out: `${p.id}.png` })));
 *
 * render() is pure and needs no browser. Export is optional and so is the
 * browser it needs.
 *
 * This file is the whole export surface. Everything below it is arranged as a
 * tree -- draw/ is pure, host/ touches the outside world -- and nothing outside
 * this file is part of the public API, so the tree can be rearranged without
 * breaking a caller.
 */

// -- draw/board: the workspace ----------------------------------------
export type { Placement } from '~/draw/doc/board/build.ts';
export { Board, board } from '~/draw/doc/board/build.ts';
export type { BoardItem, BoardSpec, Ink, InkTool } from '~/draw/doc/board/model.ts';
export { ITEM_HEIGHT, ITEM_MAX_WIDTH, ITEM_WIDTH } from '~/draw/doc/board/model.ts';
export type { Op, PatchResult } from '~/draw/doc/board/patch.ts';
export {
  apply as applyPatch,
  invert as invertPatch,
  PatchError,
  topZ,
} from '~/draw/doc/board/patch.ts';
export type { BoardRenderOptions } from '~/draw/doc/board/render.ts';
export {
  extentOf,
  renderBoard,
  renderOneItem,
  WORKSPACE_PAD,
  workspaceExtent,
} from '~/draw/doc/board/render.ts';
// -- draw/book: the notebook ------------------------------------------
export type { BookSpec, Cover, CoverMaterial, Leaf, Sticker } from '~/draw/doc/book/model.ts';
export {
  blankLeaf,
  boundLeaves,
  isFull,
  LEAF_HEIGHT,
  LEAF_WIDTH,
  MATERIALS,
  spineWidth,
} from '~/draw/doc/book/model.ts';
export type { BookRenderOptions } from '~/draw/doc/book/render.ts';
export {
  renderBook3d,
  renderCover,
  renderShelf,
  renderSpread,
  shelfLean,
} from '~/draw/doc/book/render.ts';
// -- draw/doc: what every document shares -----------------------------
export type { Direction, RenderedPage } from '~/draw/doc/model.ts';
// -- draw/page: the document ------------------------------------------
export { Notebook, notebook, Page, page } from '~/draw/doc/page/build.ts';
export type { Chip, NotebookSpec, PageSpec } from '~/draw/doc/page/model.ts';
export { renderPage } from '~/draw/doc/page/render.ts';
// -- draw/look: the visual vocabulary ---------------------------------
export { contrast, luminance, rgb, textOn } from '~/draw/look/colour.ts';
export type { Frame, FrameKind, FrameOptions, PlacedTape } from '~/draw/look/frame.ts';
export { FRAMES, frame } from '~/draw/look/frame.ts';
export type { GrainOptions } from '~/draw/look/grain.ts';
export { grain, grainPixels } from '~/draw/look/grain.ts';
export type { PaperKind, Ruling, RulingOptions } from '~/draw/look/grid.ts';
export { PAPERS, ruling } from '~/draw/look/grid.ts';
export type { Arrow, EllipseOptions, HandOptions } from '~/draw/look/hand.ts';
export {
  handArrow,
  handBracket,
  handCurve,
  handEllipse,
  handLine,
  handSwipe,
  handUnderline,
  smooth,
} from '~/draw/look/hand.ts';
export type { Palette } from '~/draw/look/palette.ts';
export {
  BODY_FLOOR,
  CHIP_FLOOR,
  check as checkPalette,
  customPalette,
  DEFAULT_PALETTE,
  PALETTES,
  palette,
} from '~/draw/look/palette.ts';
export type { Point, Tape, TornOptions } from '~/draw/look/paper.ts';
export {
  CURL_LEVELS,
  curlPath,
  tapeStrip,
  tornClipPath,
  tornRectPath,
  tornRectPoints,
} from '~/draw/look/paper.ts';
export type { Raster } from '~/draw/look/png.ts';
export { decodePng, encodePng } from '~/draw/look/png.ts';
export { hashString, mulberry32, Rng, seedFrom } from '~/draw/look/rng.ts';
// -- draw/material: what can be put down ------------------------------
export type {
  Block,
  ImageSource,
  LabelTone,
  Mark,
  MarkKind,
  Rect,
  RectRef,
  RedactStyle,
  Side,
  Space,
  ZoomSpec,
} from '~/draw/material/model.ts';
export { CoordinateError, resolve as resolveRect } from '~/draw/material/plate/coords.ts';
export { imageSize } from '~/draw/material/plate/probe.ts';
export type { RedactOptions, RedactResult } from '~/draw/material/plate/redact.ts';
export { isRedacted } from '~/draw/material/plate/redact.ts';
export { describeGaps, missingGlyphs } from '~/draw/type/coverage.ts';
export type { Face, FaceCheck, Role, Roles } from '~/draw/type/faces.ts';
export { fontFamily, setFontDirectory, verifyFaces } from '~/draw/type/faces.ts';
export type { ExportOptions, ExportResult } from '~/host/export.ts';
export { exportPage, exportPages } from '~/host/export.ts';
export type { RedactedFile } from '~/host/redact.ts';
export { redactImage } from '~/host/redact.ts';
// -- host: the outside world ------------------------------------------
export type { ServeOptions, Serving } from '~/host/serve/server.ts';
export { serve } from '~/host/serve/server.ts';
export type { Settings, StoreOptions } from '~/host/store/store.ts';
export { Store, safeName } from '~/host/store/store.ts';
