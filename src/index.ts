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
 */

export { tapeStrip, tornClipPath, tornPath } from '~/art/paper.ts';
export { hashString, Rng } from '~/art/prng.ts';
export type { ExportOptions, ExportResult } from '~/export/playwright.ts';
export { exportPage, exportPages } from '~/export/playwright.ts';
export { Notebook, notebook, Page, page } from '~/notebook.ts';
export { CoordinateError, resolve as resolveRect } from '~/render/coords.ts';
export { describeGaps, missingGlyphs } from '~/render/coverage.ts';
export { renderPage } from '~/render/document.ts';
export { setFontDirectory } from '~/render/fonts.ts';
export { imageSize } from '~/render/probe.ts';
export type { Palette } from '~/theme/palette.ts';
export {
  check as checkPalette,
  contrast,
  customPalette,
  DEFAULT_PALETTE,
  PALETTES,
  palette,
  textOn,
} from '~/theme/palette.ts';
export type {
  Block,
  Chip,
  Direction,
  ImageSource,
  Mark,
  MarkKind,
  NotebookSpec,
  PageSpec,
  Rect,
  RectRef,
  RedactStyle,
  RenderedPage,
  Space,
  ZoomSpec,
} from '~/types.ts';
