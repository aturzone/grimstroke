/**
 * The face: what draws grimstroke for a person, kept apart from what grimstroke is.
 *
 * The core -- this server, the store, the documents as data, the / box and its board -- answers
 * every route in data and never draws a document. A face is what does: the desk, the notebooks,
 * the bookcase, the settings, the exports. It is handed to the server (see serve's `face`), its
 * own routes are asked first, and wherever the core's answer carries markup for a browser that
 * shows a document, the face is asked for that markup. With no face the same answers come back
 * without it, and there are no pages at all: the core draws nothing.
 *
 * Nothing in the core imports a face. A face imports the core, through this contract and the
 * documents' models, and may be replaced by any other that keeps it.
 */

import type { ShapeBlock } from '@core/box/card.ts';
import type { SlashEntry } from '@core/box/slash.ts';
import type { TodaySource } from '@core/day/gather.ts';
import type { BoardSpec } from '@core/docs/board.ts';
import type { BookSpec } from '@core/docs/book.ts';
import type { Pet, Profile } from '@core/docs/profile.ts';
import type { ShelfLayout } from '@core/docs/shelf.ts';
import type { Ask } from '@core/serve/http.ts';
import type { Live } from '@core/serve/live.ts';
import type { Look } from '@core/serve/look.ts';

/** Markup, and the files (pictures, fonts) it asks for, to be let through /a/ and /f/. */
export interface Drawn {
  html: string;
  assets?: Record<string, string>;
}

export interface Face {
  /**
   * Where its browser files are (app.js, and what it loads): served by the core at /app.js. A
   * face built on its own keeps them beside itself; one in the core's tree, in the core's dist.
   */
  files?: string;
  /** Its own routes, for GET /api/capabilities: group -> "METHOD /path" -> what it does. */
  endpoints?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /** Before a request is answered: the workspace's look (its palettes, its light or dark). */
  prepare?(look: Look): void;
  /** The face's own pages and routes, asked before the core's. */
  route?(ask: Ask, live: Live): Promise<boolean>;
  /** A board's items drawn again after a change, for the reply and for everyone watching. */
  item?(spec: BoardSpec, id: string): Drawn | undefined;
  /** A notebook's leaf drawn again after a change. */
  leaf?(book: BookSpec, index: number): Drawn | undefined;
  /** The profile card, as every place shows it. */
  profileCard?(profile: Profile): string;
  /** The bookcase drawn again after books were moved or it was made over. */
  shelf?(input: {
    books: BookSpec[];
    layout: ShelfLayout;
    edited?: Record<string, string> | undefined;
    trash: number;
    pet?: Pet | undefined;
    width?: number | undefined;
  }): string;
  /** A card the / box would make, as a preview (shown only, no controls). */
  card?(block: ShapeBlock): string;
  /** The / board's column, drawn again after a change made on it. */
  slash?(entries: SlashEntry[], now: Date): string;
  /** Before the workspace's look is kept: throws when it could not be drawn readably. */
  checkLook?(look: Look): void;
  /** Its own vocabulary, for GET /api/capabilities: palettes, sticker marks and the like. */
  vocabulary?: Readonly<Record<string, unknown>>;
  /** The day page's column, drawn again after a tap on it. */
  day?(sources: TodaySource[], day: Date): string;
}

/*
 * Held on the global object, not in this module: a face built on its own carries its own copy
 * of whatever core code it uses (applyBoard, say), and that copy must find the same face.
 */
const KEY = Symbol.for('grimstroke.face');
const held = globalThis as { [KEY]?: Face | undefined };

/** Which face this server draws with; none means the core alone. */
export function useFace(face: Face | undefined): void {
  held[KEY] = face;
}

export function face(): Face | undefined {
  return held[KEY];
}
