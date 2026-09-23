/**
 * The stylesheet, assembled.
 *
 * CSS lives in TypeScript rather than in .css files on purpose. This library is consumed as a
 * bundle, as raw TypeScript in tests, and as a CLI, and a file that has to be located relative
 * to the module resolves differently in all three. A string has no such problem.
 *
 * Every piece lives beside the thing it styles -- the note's rules in material/note/css.ts,
 * the tray's in chrome/css/tray.ts -- and this file only decides the ORDER, which is part of
 * the cascade: later pieces win ties. The eight sections below are the order the sheet has
 * always had, and a test holds every piece to balanced braces on its own.
 */

import { TURNER } from '~/draw/chrome/css/book.ts';
import { CAMERA } from '~/draw/chrome/css/camera.ts';
import { KIT, TOKENS } from '~/draw/chrome/css/kit.ts';
import { PANELS } from '~/draw/chrome/css/panels.ts';
import { PRINT } from '~/draw/chrome/css/print.ts';
import { SCREEN } from '~/draw/chrome/css/screen.ts';
import { EDITOR, HANDLES, SELECT } from '~/draw/chrome/css/select.ts';
import { SETTINGS } from '~/draw/chrome/css/settings.ts';
import { STUDIO } from '~/draw/chrome/css/studio.ts';
import { TOP } from '~/draw/chrome/css/top.ts';
import { TRAY } from '~/draw/chrome/css/tray.ts';
import { BOARD } from '~/draw/doc/board/css.ts';
import { BOOK_SCALE, COVER, FLIP, PAGES, SHELF, SPREAD } from '~/draw/doc/book/css.ts';
import { DESK, RESET, SCRIPT } from '~/draw/doc/css.ts';
import { PAGE_LAYOUT, PAGE_SHEET } from '~/draw/doc/page/css.ts';
import { BLOCKS, CODE, TAPE } from '~/draw/material/css.ts';
import { FACE, PROFILE } from '~/draw/material/face/css.ts';
import { NOTE } from '~/draw/material/note/css.ts';
import { MOUNT, PLATE, PLATE_LAYER, REDACT } from '~/draw/material/plate/css.ts';

/** Layout, written in logical properties so a page mirrors with no branch. */
export const BASE = [RESET, PAGE_LAYOUT, BLOCKS, PLATE, CODE, MOUNT].join('');

/** The look: torn paper, halftone, tape, hard shadows, censor bars. */
export const ZINE = [PAGE_SHEET, PLATE_LAYER, TAPE, REDACT].join('');

/** The notebook: the desk, the spread, covers, the shelf, the turn. */
export const BOOK = [DESK, SPREAD, COVER, SHELF, FLIP, PAGES, BOOK_SCALE].join('');

/** The live surface: the camera, the tray, the bar, and every panel. */
export const LIVE = [
  TOKENS,
  KIT,
  CAMERA,
  TOP,
  TRAY,
  TURNER,
  SELECT,
  HANDLES,
  PANELS,
  STUDIO,
  SETTINGS,
  EDITOR,
  SCREEN,
  PRINT,
].join('');

export { BOARD, FACE, NOTE, SCRIPT };

/** Every piece on its own, so a test can hold each one to balanced braces. */
export const PIECES: Readonly<Record<string, string>> = {
  RESET,
  PAGE_LAYOUT,
  BLOCKS,
  PLATE,
  CODE,
  MOUNT,
  PAGE_SHEET,
  PLATE_LAYER,
  TAPE,
  REDACT,
  NOTE,
  FACE,
  PROFILE,
  BOARD,
  DESK,
  SPREAD,
  COVER,
  SHELF,
  FLIP,
  PAGES,
  BOOK_SCALE,
  TOKENS,
  KIT,
  CAMERA,
  TOP,
  TRAY,
  TURNER,
  PANELS,
  SELECT,
  HANDLES,
  STUDIO,
  SETTINGS,
  EDITOR,
  SCREEN,
  PRINT,
  SCRIPT,
};

export const STYLESHEET = [BASE, ZINE, NOTE, FACE, PROFILE, BOARD, BOOK, LIVE, SCRIPT].join('\n');
