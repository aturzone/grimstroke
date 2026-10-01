/**
 * The face grimstroke has always had: the desk and its boards, the notebooks, the bookcase, the
 * settings, the day page and the exports -- everything that draws a document for a person.
 *
 * It keeps host/serve/face.ts and nothing more: the core hands it a request or a document and
 * it answers with markup. It is meant to leave this repository for one of its own.
 */

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderOneItem } from '~/draw/doc/board/render.ts';
import { renderOneLeaf } from '~/draw/doc/book/render.ts';
import { renderCases } from '~/draw/doc/shelf/render.ts';
import { useClock } from '~/draw/doc/surface.ts';
import { useDefaultPalette, usePalettes } from '~/draw/look/palette.ts';
import { renderProfile } from '~/draw/material/profile/render.ts';
import { frame } from '~/face/frame.ts';
import { pages } from '~/face/pages.ts';
import { drawingRoutes } from '~/face/routes.ts';
import { drawDay, todayPages } from '~/face/today.ts';
import type { Face } from '~/host/serve/face.ts';
import { THEME_PALETTE } from '~/host/serve/look.ts';

export const desk: Face = {
  // Its app.js: beside this module once built (dist/face.js beside dist/app.js), and in the
  // build when this is run from the source tree.
  files: (() => {
    const here = dirname(fileURLToPath(import.meta.url));
    return existsSync(join(here, 'app.js')) ? here : resolve(here, '..', '..', 'dist');
  })(),
  prepare(look) {
    // Cards that count days, and say "today", are drawn against the real time.
    useClock(Date.now);
    // The owner's colours for the palettes, for every page drawn in this request.
    usePalettes(look.palettes);
    useDefaultPalette(THEME_PALETTE[look.theme]);
  },
  async route(ask, live) {
    return (await pages(ask, live)) || (await todayPages(ask, live)) || drawingRoutes(ask, live);
  },
  item: (spec, id) => renderOneItem(spec, id),
  leaf: (book, index) => renderOneLeaf(book, index),
  profileCard: (profile) => renderProfile(profile, { flat: true }),
  shelf: ({ books, layout, edited, trash, pet, width }) =>
    renderCases(books, {
      layout,
      trash,
      ...(edited ? { edited } : {}),
      ...(pet ? { pet } : {}),
      ...(width ? { width } : {}),
    }),
  day: drawDay,
  frame,
};
