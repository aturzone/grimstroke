/**
 * The documents the server is holding, and who is watching them.
 *
 * Boards and notebooks are cached in memory because every request needs one, and they are
 * written through to the store on every change because a workspace that only exists in a
 * process is a workspace that dies with it. Everyone looking at a document is subscribed to
 * it, and every change is broadcast -- which is what lets a person watch an agent work.
 */

import type { ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import type { BoardSpec } from '~/draw/doc/board/model.ts';
import { workspaceExtent } from '~/draw/doc/board/render.ts';
import { type BookSpec, bookTitle, boundLeaves, leafSize } from '~/draw/doc/book/model.ts';
import { apply as applyBook } from '~/draw/doc/book/patch.ts';
import { renderOneLeaf } from '~/draw/doc/book/render.ts';
import { upgradeLeaf } from '~/draw/doc/legacy.ts';
import { dropInto, readLayout, type ShelfLayout, settle } from '~/draw/doc/shelf/model.ts';
import type { Store } from '~/host/store/store.ts';

interface Client {
  res: ServerResponse;
  /** The tab it belongs to, so a tab is never sent its own patch back. */
  tab?: string | undefined;
}

/**
 * A page of a notebook, addressed as a board: book:<notebook>:<leaf>.
 *
 * One address, so the board's whole machinery -- the editor, the patch API, the events, the
 * undo stack, export -- works on a page with nothing written twice. The leaf may also be
 * given as a page number, counted from one.
 */
export function pageAddress(id: string): { book: string; leaf: string } | undefined {
  const match = /^book:([^:]+):(.+)$/.exec(id);
  return match ? { book: match[1] as string, leaf: match[2] as string } : undefined;
}

export class Live {
  readonly store: Store;
  private readonly boards = new Map<string, BoardSpec>();
  private readonly books = new Map<string, BookSpec>();
  private readonly clients = new Map<string, Set<Client>>();
  /** When the file each cached board was read from was last written. */
  private readonly seen = new Map<string, number>();
  /** Every path the renderer said it needs, and nothing else. */
  private readonly served = new Map<string, string>();

  constructor(store: Store) {
    this.store = store;
  }

  // ---------------------------------------------------------------- boards

  async board(id: string): Promise<BoardSpec> {
    const page = pageAddress(id);
    if (page) return this.page(page.book, page.leaf);
    /*
     * The cache is checked against the FILE, every time.
     *
     * Held blindly, it made the server the only thing that could ever change a board: a
     * restore from a backup, an edit by the CLI, a git checkout or another process all
     * looked like they had worked -- and then the first patch wrote the server's stale copy
     * straight back over them. A whole board was recovered from an archive and silently
     * destroyed again within the minute.
     *
     * One stat per request is nothing next to that.
     */
    const stamp = await this.store.boardStamp(id);
    const cached = this.boards.get(id);
    if (cached && this.seen.get(id) === stamp) return cached;
    if (cached) {
      // Changed underneath us. Whoever is looking at it is looking at the old one.
      //
      // Addressed as board:<id>, which is how a watcher subscribes. It was sent to the bare id
      // at first -- a channel nobody listens on -- so a restore reached the disk and every open
      // page carried on showing, and then saving, the board from before it.
      this.boards.delete(id);
      this.broadcast(`board:${id}`, 'reload', { id });
    }
    const stored = await this.store.readBoard(id);
    const spec: BoardSpec = stored ?? {
      id,
      palette: 'studio',
      paper: 'squared',
      grain: 0.7,
      items: [],
      version: 0,
    };
    // Pinned on first sight and then left alone. Every item's position is
    // rendered relative to this origin, so it has to be the same number for
    // the page and for every item re-rendered into it afterwards.
    if (!spec.extent) {
      spec.extent = workspaceExtent(spec);
      await this.store.writeBoard(spec);
    }
    this.boards.set(id, spec);
    this.seen.set(id, await this.store.boardStamp(id));
    return spec;
  }

  /** A notebook's page, as a board with an edge. */
  async page(bookId: string, ref: string): Promise<BoardSpec> {
    const book = await this.book(bookId);
    const leaves = boundLeaves(book);
    let index = leaves.findIndex((leaf) => leaf.id === ref);
    if (index < 0 && /^\d+$/.test(ref))
      index = Math.min(leaves.length, Math.max(1, Number(ref))) - 1;
    const leaf = upgradeLeaf(leaves[Math.max(0, index)] ?? { id: 'blank-1', items: [] });
    return {
      id: `book:${book.id}:${leaf.id}`,
      title: `${bookTitle(book)} · page ${Math.max(0, index) + 1}`,
      ...(book.palette ? { palette: book.palette } : {}),
      ...(book.direction ? { direction: book.direction } : {}),
      paper: leaf.paper ?? book.paper ?? 'ruled',
      ...((leaf.template ?? book.template) ? { template: leaf.template ?? book.template } : {}),
      ...(book.grain !== undefined ? { grain: book.grain } : {}),
      ...(book.fonts ? { fonts: book.fonts } : {}),
      ...(book.digits ? { digits: book.digits } : {}),
      ...(book.uppercaseLabels !== undefined ? { uppercaseLabels: book.uppercaseLabels } : {}),
      items: leaf.items ?? [],
      extent: [0, 0, ...leafSize(book)],
      version: book.version ?? 0,
      sheet: {
        book: book.id,
        bookTitle: bookTitle(book),
        leaf: leaf.id,
        index: Math.max(0, index),
        count: leaves.length,
      },
    };
  }

  /** Hold this as the board now, and write it through. */
  async commitBoard(spec: BoardSpec): Promise<void> {
    const page = pageAddress(spec.id);
    if (page) {
      await this.commitPage(page.book, page.leaf, spec);
      return;
    }
    this.boards.set(spec.id, spec);
    await this.store.writeBoard(spec);
    this.seen.set(spec.id, await this.store.boardStamp(spec.id));
  }

  /**
   * A page's items, written back into its notebook -- and the notebook's viewers told, so a
   * spread open in another tab shows the page as it now is.
   */
  private async commitPage(bookId: string, leafId: string, spec: BoardSpec): Promise<void> {
    const book = await this.book(bookId);
    const existing = book.leaves.find((leaf) => leaf.id === leafId) ?? { id: leafId };
    const { blocks: _folded, ...leaf } = upgradeLeaf(existing);
    const result = applyBook(book, [
      {
        op: 'leaf.replace',
        leaf: {
          ...leaf,
          items: spec.items,
          ...(spec.paper ? { paper: spec.paper } : {}),
          ...(spec.template !== (book.template ?? undefined) ? { template: spec.template } : {}),
        },
      },
    ]);
    await this.commitBook(result.spec);
    const index = result.spec.leaves.findIndex((one) => one.id === leafId);
    const drawn = index < 0 ? undefined : renderOneLeaf(result.spec, index);
    if (drawn) this.allow(drawn.assets);
    this.broadcast(`book:${bookId}`, 'patch', {
      version: result.spec.version ?? 0,
      removed: [],
      reset: result.reset,
      changed: drawn ? [{ id: leafId, html: drawn.html }] : [],
    });
  }

  // ---------------------------------------------------------------- books

  async book(id: string): Promise<BookSpec> {
    const cached = this.books.get(id);
    if (cached) return cached;
    const stored = (await this.store.readBook(id)) ?? {
      id,
      title: id,
      palette: 'newsprint',
      paper: 'ruled',
      grain: 0.7,
      minLeaves: 40,
      leaves: [{ id: 'leaf-1', blocks: [] }],
      version: 0,
    };
    this.books.set(id, stored);
    return stored;
  }

  async commitBook(spec: BookSpec): Promise<void> {
    this.books.set(spec.id, spec);
    await this.store.writeBook(spec);
  }

  /**
   * Everything the bookcase needs, in one place: every notebook, the saved order of the shelves,
   * when each was last written, and how many are in the trash.
   */
  async shelf(): Promise<{
    books: BookSpec[];
    layout: ShelfLayout;
    edited: Record<string, string>;
    trash: number;
  }> {
    const ids = await this.store.listBooks();
    const books = await Promise.all(ids.map((id) => this.book(id)));
    const edited: Record<string, string> = {};
    for (const id of ids) {
      const at = await this.store.bookEdited(id);
      if (at) edited[id] = at.toISOString().slice(0, 10);
    }
    const settings = await this.store.readSettings();
    return {
      books,
      layout: readLayout(settings.shelf),
      edited,
      trash: (await this.store.listTrash()).length,
    };
  }

  /** Save the order of the shelves: only notebooks that exist, each once. */
  async saveShelf(rows: unknown): Promise<ShelfLayout> {
    const { books } = await this.shelf();
    const layout = {
      rows: settle(
        readLayout({ rows }),
        books.filter((b) => !b.archived),
      ),
    };
    await this.store.writeSettings({ ...(await this.store.readSettings()), shelf: layout });
    return layout;
  }

  /**
   * Books put down somewhere on the bookcase, the way a hand puts them: onto a shelf in use at x
   * along it -- joining the run, or lying flat where nothing holds them up -- or onto the archive,
   * which puts them away. Taking one off the archive and onto a shelf takes it out again.
   */
  async dropBooks(
    ids: readonly string[],
    to: 'use' | 'archive',
    row: number,
    x: number,
  ): Promise<void> {
    const { books, layout } = await this.shelf();
    const known = new Set(books.map((b) => b.id));
    const moving = ids.filter((id) => known.has(id));
    for (const id of moving) {
      const spec = await this.book(id);
      const archived = to === 'archive';
      if (Boolean(spec.archived) === archived) continue;
      const { archived: _, ...rest } = spec;
      await this.commitBook(archived ? { ...rest, archived: true } : rest);
    }
    const open = (await Promise.all([...known].map((id) => this.book(id)))).filter(
      (b) => !b.archived,
    );
    const rows = settle(layout, open);
    const next =
      to === 'archive'
        ? rows.map((r) => r.filter((s) => !moving.includes(s.id)))
        : dropInto(rows, open, moving, Math.max(0, Math.floor(row)), x);
    await this.store.writeSettings({ ...(await this.store.readSettings()), shelf: { rows: next } });
  }

  /** A notebook thrown away: out of memory, and anyone watching it is sent to the shelf. */
  async trashBook(id: string): Promise<string | undefined> {
    this.books.delete(id);
    const name = await this.store.trashBook(id);
    if (name) this.broadcast(id, 'gone', { id, trash: name });
    return name;
  }

  /** Whatever was cached is now wrong: the files under it have been replaced. */
  forget(): void {
    this.boards.clear();
    this.books.clear();
  }

  // ---------------------------------------------------------------- watchers

  /** Tell everyone watching, except the tab the change came from. */
  broadcast(id: string, event: string, data: unknown, exceptTab?: string): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients.get(id) ?? []) {
      if (exceptTab && client.tab === exceptTab) continue;
      client.res.write(payload);
    }
  }

  subscribe(id: string, res: ServerResponse, tab?: string): () => void {
    const client: Client = { res, tab };
    const set = this.clients.get(id) ?? new Set<Client>();
    set.add(client);
    this.clients.set(id, set);
    return () => set.delete(client);
  }

  close(): void {
    for (const set of this.clients.values()) for (const client of set) client.res.end();
  }

  // ---------------------------------------------------------------- assets

  /** Allow these paths to be served. The renderer names them; nothing else is reachable. */
  allow(assets: Record<string, string>): void {
    for (const [key, source] of Object.entries(assets)) this.served.set(key, resolve(source));
  }

  source(path: string): string | undefined {
    return this.served.get(path);
  }
}
