/**
 * The surfaces a person opens: the board, a notebook, the shelf, the studio.
 *
 * Every one is the SAME HTML an export would produce, with the chrome and the app script
 * appended -- which is what makes "what you see is what you get" a fact rather than an
 * intention. The app attaches handles to that markup; it never draws the documents itself.
 */

import { chrome } from '~/draw/chrome/board.ts';
import { bookChrome } from '~/draw/chrome/book.ts';
import { renderProfilePage } from '~/draw/chrome/profile.ts';
import { shelfChrome } from '~/draw/chrome/shelf.ts';
import { renderStudio } from '~/draw/chrome/studio.ts';
import { renderBoard } from '~/draw/doc/board/render.ts';
import { renderShelf, renderSpread } from '~/draw/doc/book/render.ts';
import { type Character, DEFAULT_FACE } from '~/draw/material/face/model.ts';
import { type Ask, html } from '~/host/serve/http.ts';
import type { Live } from '~/host/serve/live.ts';

const APP = ['/app.js'];

export async function pages(ask: Ask, live: Live): Promise<boolean> {
  const { url, path, res } = ask;

  if (path === '/' || path === '/index.html') {
    const spec = await live.board(url.searchParams.get('board') ?? ask.board);
    const rendered = renderBoard(spec, { live: { chrome: chrome(spec), scripts: APP } });
    live.allow(rendered.assets);
    html(res, rendered.html);
    return true;
  }

  if (path === '/book') {
    const spec = await live.book(url.searchParams.get('id') ?? 'notebook');
    const rendered = renderSpread(spec, {
      leaf: Number(url.searchParams.get('leaf') ?? 0),
      live: { chrome: bookChrome(spec), scripts: APP },
    });
    live.allow(rendered.assets);
    html(res, rendered.html);
    return true;
  }

  /*
   * The studio.
   *
   * A character is opened by id, and an id nobody has saved yet is simply a new character
   * -- so /face?id=anything is a usable blank sheet rather than a 404, and an agent can
   * name one before it exists.
   */
  if (path === '/face') {
    const id = url.searchParams.get('id') ?? 'default';
    const character = (await live.store.readFace(id)) ?? { ...DEFAULT_FACE, id };
    const saved: Character[] = [];
    for (const other of await live.store.listFaces()) {
      const one = await live.store.readFace(other);
      if (one) saved.push(one);
    }
    const rendered = renderStudio(character, { saved, live: { scripts: APP } });
    live.allow(rendered.assets);
    html(res, rendered.html);
    return true;
  }

  if (path === '/profile') {
    const id = url.searchParams.get('id') ?? 'default';
    const character = (await live.store.readFace(id)) ?? { ...DEFAULT_FACE, id };
    const books = await Promise.all(
      (await live.store.listBooks()).map(async (bookId) => {
        const spec = await live.book(bookId);
        return { id: spec.id, title: spec.title ?? spec.id, archived: spec.archived === true };
      }),
    );
    const rendered = renderProfilePage(character, {
      books: books.filter((b) => !b.archived),
      live: { scripts: APP },
    });
    live.allow(rendered.assets);
    html(res, rendered.html);
    return true;
  }

  if (path === '/shelf') {
    const ids = await live.store.listBooks();
    const all = await Promise.all(ids.map((id) => live.book(id)));
    const rendered = renderShelf(all, { live: { chrome: shelfChrome(all.length), scripts: APP } });
    live.allow(rendered.assets);
    html(res, rendered.html);
    return true;
  }

  return false;
}
