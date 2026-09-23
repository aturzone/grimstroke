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
import type { BookSpec } from '~/draw/doc/book/model.ts';
import type { Store } from '~/host/store/store.ts';

interface Client {
  res: ServerResponse;
  /** The tab it belongs to, so a tab is never sent its own patch back. */
  tab?: string | undefined;
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

  /** Hold this as the board now, and write it through. */
  async commitBoard(spec: BoardSpec): Promise<void> {
    this.boards.set(spec.id, spec);
    await this.store.writeBoard(spec);
    this.seen.set(spec.id, await this.store.boardStamp(spec.id));
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
