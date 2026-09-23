/**
 * The surfaces a person opens: the board, a notebook, the shelf, the profile.
 *
 * Every one is the SAME HTML an export would produce, with the chrome and the app script
 * appended -- which is what makes "what you see is what you get" a fact rather than an
 * intention. The app attaches handles to that markup; it never draws the documents itself.
 */

import { chrome } from '~/draw/chrome/board.ts';
import { bookChrome } from '~/draw/chrome/book.ts';
import { renderProfilePage } from '~/draw/chrome/profile.ts';
import { shelfChrome } from '~/draw/chrome/shelf.ts';
import { renderBoard } from '~/draw/doc/board/render.ts';
import { bookTitle } from '~/draw/doc/book/model.ts';
import { renderShelf, renderSpread } from '~/draw/doc/book/render.ts';
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

  /*
   * One page of a notebook, as a board: every tool the board has, on a sheet with an edge.
   * The leaf is its id, or its page number counted from one.
   */
  if (path === '/page') {
    const book = url.searchParams.get('book') ?? 'notebook';
    const spec = await live.board(`book:${book}:${url.searchParams.get('leaf') ?? '1'}`);
    const rendered = renderBoard(spec, { live: { chrome: chrome(spec), scripts: APP } });
    live.allow(rendered.assets);
    html(res, rendered.html);
    return true;
  }

  if (path === '/book') {
    const spec = await live.book(url.searchParams.get('id') ?? 'notebook');
    const rendered = renderSpread(spec, {
      leaf: Number(url.searchParams.get('leaf') ?? 0),
      // Arriving from the shelf, it is shut; arriving at a page, it is open at it.
      closed: !url.searchParams.has('leaf'),
      live: { chrome: bookChrome(spec), scripts: APP },
    });
    live.allow(rendered.assets);
    html(res, rendered.html);
    return true;
  }

  // The studio of characters became the profile. An old link still arrives somewhere.
  if (path === '/face') {
    res.writeHead(302, { location: '/profile' });
    res.end();
    return true;
  }

  if (path === '/profile') {
    const books = await Promise.all(
      (await live.store.listBooks()).map(async (bookId) => {
        const spec = await live.book(bookId);
        return { id: spec.id, title: bookTitle(spec), archived: spec.archived === true };
      }),
    );
    const rendered = renderProfilePage(await live.store.readProfile(), {
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
