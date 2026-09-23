/**
 * One file that holds the whole workspace.
 *
 * Every board, every notebook, every picture and every setting, in a single document you can
 * put on a USB stick, attach to a message, or commit to a repository. It is the answer to
 * "what happens to my work if this machine goes away", and it is deliberately the dullest
 * possible answer: plain JSON, no archive format, no dependency, readable in any text editor.
 *
 * ASSET PATHS ARE MADE PORTABLE ON THE WAY OUT. Inside the store a picture is referenced by
 * its absolute path, which is correct there and meaningless anywhere else -- restore that on
 * another machine, or into another home directory, and every screenshot on every board is a
 * broken image. So an asset inside the store is written as `asset:<name>` and resolved back
 * to wherever the store now lives when it is read.
 *
 * Base64 costs a third more bytes than the raw picture. That is the price of one file that
 * needs nothing to open it, and it is worth paying.
 */

import { readdir, readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type { BoardSpec } from '~/draw/doc/board/model.ts';
import type { BookSpec } from '~/draw/doc/book/model.ts';
import { type Profile, readProfile } from '~/draw/material/profile/model.ts';
import type { Settings, Store } from '~/host/store/store.ts';

export const ARCHIVE_FORMAT = 'grimstroke';
export const ARCHIVE_VERSION = 1;

/** How a reference to a stored picture is written inside an archive. */
const ASSET_PREFIX = 'asset:';

export interface Archive {
  format: typeof ARCHIVE_FORMAT;
  version: number;
  /** When it was written. Informational: nothing reads it back. */
  savedAt: string;
  settings: Settings;
  boards: BoardSpec[];
  books: BookSpec[];
  /** The workspace's profile: its words and its drawn portrait. */
  profile?: Profile;
  /** Asset name to base64 of its bytes. */
  assets: Record<string, string>;
}

export interface Restored {
  boards: string[];
  books: string[];
  /** Whether the archive carried a profile, and it was restored. */
  profile: boolean;
  assets: number;
}

// ---------------------------------------------------------------- out

/** Read the whole store into one object. */
export async function pack(store: Store): Promise<Archive> {
  await store.ready();

  const boardIds = await store.listBoards();
  const bookIds = await store.listBooks();
  const boards: BoardSpec[] = [];
  const books: BookSpec[] = [];

  for (const id of boardIds) {
    const spec = await store.readBoard(id);
    if (spec) boards.push(portable(spec, store) as BoardSpec);
  }
  for (const id of bookIds) {
    const spec = await store.readBook(id);
    if (spec) books.push(portable(spec, store) as BookSpec);
  }

  const profile = await store.readProfile();

  /*
   * Only the assets that something still points at.
   *
   * The store keeps a picture for as long as its bytes exist, which is the right behaviour
   * for a content-addressed store and the wrong behaviour for a backup: a workspace where
   * forty screenshots have been dropped and deleted would carry all forty forever, and the
   * file would get slower to write every week without ever getting more useful.
   */
  const wanted = new Set<string>();
  for (const spec of [...boards, ...books]) collectAssets(spec, wanted);

  const assets: Record<string, string> = {};
  const present = new Set(await readdir(store.assetsDir).catch(() => [] as string[]));
  for (const name of [...wanted].sort()) {
    if (!present.has(name)) continue;
    assets[name] = (await readFile(store.assetPath(name))).toString('base64');
  }

  return {
    format: ARCHIVE_FORMAT,
    version: ARCHIVE_VERSION,
    savedAt: new Date().toISOString(),
    settings: await store.readSettings(),
    boards,
    books,
    profile,
    assets,
  };
}

// ---------------------------------------------------------------- in

export class ArchiveError extends Error {}

/**
 * Check a parsed object really is an archive, and say precisely what is wrong if it is not.
 *
 * Restoring is the one operation here that can lose work, so it refuses anything it does not
 * fully recognise rather than importing the half of a file it happened to understand.
 */
export function readArchive(value: unknown): Archive {
  if (typeof value !== 'object' || value === null) throw new ArchiveError('not an archive');
  const a = value as Partial<Archive>;
  if (a.format !== ARCHIVE_FORMAT) {
    throw new ArchiveError(`not a grimstroke archive (format ${JSON.stringify(a.format)})`);
  }
  if (typeof a.version !== 'number' || a.version > ARCHIVE_VERSION) {
    throw new ArchiveError(
      `this archive was written by a newer grimstroke (version ${String(a.version)})`,
    );
  }
  if (!Array.isArray(a.boards) || !Array.isArray(a.books)) {
    throw new ArchiveError('archive has no boards or books');
  }
  return {
    format: ARCHIVE_FORMAT,
    version: a.version,
    savedAt: typeof a.savedAt === 'string' ? a.savedAt : '',
    settings: (a.settings ?? {}) as Settings,
    boards: a.boards as BoardSpec[],
    books: a.books as BookSpec[],
    /*
     * The profile arrived later, in the same version. An archive from before it may carry the
     * studio's characters instead; the first real one is read as the profile, which keeps the
     * person's words. An archive with neither simply has no profile.
     */
    ...profileOf(a as Partial<Archive> & { faces?: unknown }),
    assets: (a.assets ?? {}) as Record<string, string>,
  };
}

/**
 * Write an archive into a store.
 *
 * Assets go in FIRST. A board written before its pictures is a board that renders with holes
 * for however long the restore takes, and if it fails halfway it is a board with permanent
 * holes. Pictures are content-addressed, so writing them is idempotent and writing them
 * early costs nothing.
 */
export async function unpack(store: Store, archive: Archive): Promise<Restored> {
  await store.ready();

  let assets = 0;
  for (const [name, base64] of Object.entries(archive.assets)) {
    const dot = name.lastIndexOf('.');
    const extension = dot > 0 ? name.slice(dot) : '.png';
    await store.putAsset(Buffer.from(base64, 'base64'), extension);
    assets += 1;
  }

  const boards: string[] = [];
  for (const spec of archive.boards) {
    const local = local_(spec, store) as BoardSpec;
    await store.writeBoard(local);
    boards.push(local.id);
  }
  const books: string[] = [];
  for (const spec of archive.books) {
    const local = local_(spec, store) as BookSpec;
    await store.writeBook(local);
    books.push(local.id);
  }

  if (archive.profile) await store.writeProfile(archive.profile);

  if (Object.keys(archive.settings).length > 0) {
    await store.writeSettings({ ...(await store.readSettings()), ...archive.settings });
  }

  return { boards, books, profile: archive.profile !== undefined, assets };
}

function profileOf(a: Partial<Archive> & { faces?: unknown }): { profile?: Profile } {
  if (a.profile && typeof a.profile === 'object') return { profile: readProfile(a.profile) };
  if (!Array.isArray(a.faces) || a.faces.length === 0) return {};
  const faces = a.faces as Array<{ id?: unknown }>;
  const chosen = faces.find((face) => face?.id !== 'default') ?? faces[0];
  return { profile: readProfile(chosen) };
}

// ---------------------------------------------------------------- paths

/** Every string in a spec that points into the store, rewritten by `map`. */
function rewrite(value: unknown, map: (src: string) => string): unknown {
  if (typeof value === 'string') return map(value);
  if (Array.isArray(value)) return value.map((entry) => rewrite(entry, map));
  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) out[key] = rewrite(entry, map);
    return out;
  }
  return value;
}

function portable(spec: unknown, store: Store): unknown {
  const dir = store.assetsDir;
  return rewrite(spec, (src) => (src.startsWith(dir) ? `${ASSET_PREFIX}${basename(src)}` : src));
}

function local_(spec: unknown, store: Store): unknown {
  return rewrite(spec, (src) =>
    src.startsWith(ASSET_PREFIX) ? store.assetPath(src.slice(ASSET_PREFIX.length)) : src,
  );
}

function collectAssets(value: unknown, into: Set<string>): void {
  if (typeof value === 'string') {
    if (value.startsWith(ASSET_PREFIX)) into.add(value.slice(ASSET_PREFIX.length));
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectAssets(entry, into);
    return;
  }
  if (typeof value === 'object' && value !== null) {
    for (const entry of Object.values(value)) collectAssets(entry, into);
  }
}
