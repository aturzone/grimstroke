/**
 * Where the work is kept.
 *
 * Plain files, in plain JSON, in a directory you can open. No database, no
 * format that needs this tool to read it, and nothing that cannot be copied to
 * a USB stick or committed to a repository. A workspace that can only be read
 * by the program that wrote it is a workspace you will lose.
 *
 * Assets are stored by the hash of their contents. The same screenshot dropped
 * onto three boards is one file, a board that references it can be copied
 * without hunting for its images, and a file that is never referenced again is
 * identifiable rather than merely old.
 */

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import type { BoardSpec } from '~/draw/doc/board/model.ts';
import type { BookSpec } from '~/draw/doc/book/model.ts';
import { upgradeBoard, upgradeBook } from '~/draw/doc/legacy.ts';
import { type Profile, readProfile } from '~/draw/material/profile/model.ts';

/** How many past versions of a board are kept. A board is a few kilobytes of JSON. */
const KEEP = 40;

export interface StoreOptions {
  /** Defaults to $GRIMSTROKE_HOME, then ~/.grimstroke. */
  dir?: string;
}

/** How long a notebook thrown away can still be brought back. */
export const TRASH_DAYS = 30;

export interface TrashEntry {
  /** The file's name in trash/, which is what restores exactly this one. */
  name: string;
  id: string;
  title: string;
  at: Date;
}

/** `<id>--2026-09-24T10-11-12-345Z.json` back into an id and a moment. */
function parseTrashName(name: string): { id: string; at: Date } | undefined {
  const m = /^(.*)--(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z\.json$/.exec(name);
  if (!m) return undefined;
  const at = new Date(`${m[2]}T${m[3]}:${m[4]}:${m[5]}.${m[6]}Z`);
  return Number.isNaN(at.getTime()) ? undefined : { id: m[1] ?? '', at };
}

export interface Settings {
  /** The board to open when none is named. */
  last?: string;
  [key: string]: unknown;
}

export class Store {
  readonly dir: string;

  constructor(options: StoreOptions = {}) {
    this.dir = resolve(
      options.dir ?? process.env.GRIMSTROKE_HOME ?? join(homedir(), '.grimstroke'),
    );
  }

  get boardsDir(): string {
    return join(this.dir, 'boards');
  }

  get booksDir(): string {
    return join(this.dir, 'books');
  }

  get assetsDir(): string {
    return join(this.dir, 'assets');
  }

  async ready(): Promise<void> {
    await mkdir(this.boardsDir, { recursive: true });
    await mkdir(this.booksDir, { recursive: true });
    await mkdir(this.assetsDir, { recursive: true });
  }

  // ---------------------------------------------------------------- boards

  boardPath(id: string): string {
    return join(this.boardsDir, `${safe(id)}.json`);
  }

  async listBoards(): Promise<string[]> {
    await this.ready();
    const names = await readdir(this.boardsDir);
    return names
      .filter((n) => n.endsWith('.json'))
      .map((n) => n.slice(0, -5))
      .sort();
  }

  async readBoard(id: string): Promise<BoardSpec | undefined> {
    try {
      const raw = await readFile(this.boardPath(id), 'utf8');
      return upgradeBoard(JSON.parse(raw) as BoardSpec);
    } catch {
      return undefined;
    }
  }

  /**
   * Write a board.
   *
   * Through a temporary file and a rename, which is atomic on every filesystem
   * this will run on. A board is autosaved on every change, so a crash during
   * a write is not a remote possibility -- and a half-written JSON file is a
   * workspace that no longer opens.
   */
  async writeBoard(spec: BoardSpec): Promise<void> {
    await this.ready();
    await this.keep(spec.id);
    await atomically(this.boardPath(spec.id), `${JSON.stringify(spec, null, 2)}\n`);
  }

  // ---------------------------------------------------------------- history

  get historyDir(): string {
    return join(this.dir, 'history');
  }

  /**
   * Keep the version that is about to be overwritten.
   *
   * Undo lives in the browser tab, which means it is gone the moment the page is reloaded --
   * and the mistake people most want back is exactly the one that made them reload. A board
   * is a small JSON file autosaved on every change, so keeping the last few dozen costs
   * nothing and turns "I destroyed my board an hour ago" into one command.
   *
   * Snapshots are only taken when something was actually LOST. Moving a note writes a file
   * too, and a hundred snapshots of a drag would push the version worth recovering out of
   * the window it is kept in.
   */
  private async keep(id: string): Promise<void> {
    const current = await this.readBoard(id);
    if (!current) return;
    const dir = join(this.historyDir, safe(id));
    await mkdir(dir, { recursive: true });

    const stamp = String(current.version ?? 0).padStart(8, '0');
    const at = join(dir, `${stamp}.json`);
    if (existsSync(at)) return;
    await writeFile(at, `${JSON.stringify(current, null, 2)}\n`, 'utf8');

    // Keep the most recent KEEP versions, oldest pruned first.
    const names = (await readdir(dir)).filter((n) => n.endsWith('.json')).sort();
    for (const name of names.slice(0, Math.max(0, names.length - KEEP))) {
      await rm(join(dir, name), { force: true });
    }
  }

  /** Every kept version of a board, newest first. */
  async history(id: string): Promise<Array<{ version: number; items: number; at: Date }>> {
    const dir = join(this.historyDir, safe(id));
    let names: string[];
    try {
      names = (await readdir(dir)).filter((n) => n.endsWith('.json'));
    } catch {
      return [];
    }
    const out: Array<{ version: number; items: number; at: Date }> = [];
    for (const name of names.sort().reverse()) {
      try {
        const raw = JSON.parse(await readFile(join(dir, name), 'utf8')) as BoardSpec;
        out.push({
          version: raw.version ?? 0,
          items: raw.items.length,
          at: (await stat(join(dir, name))).mtime,
        });
      } catch {
        // A snapshot that will not parse is one nobody can restore from either; skip it.
      }
    }
    return out;
  }

  /** Read one kept version back. */
  async readHistory(id: string, version: number): Promise<BoardSpec | undefined> {
    const at = join(this.historyDir, safe(id), `${String(version).padStart(8, '0')}.json`);
    try {
      return upgradeBoard(JSON.parse(await readFile(at, 'utf8')) as BoardSpec);
    } catch {
      return undefined;
    }
  }

  /**
   * When a board's file was last written, as a number, or 0 if there is none.
   *
   * A server that caches boards in memory has to be able to tell that something else
   * changed one -- a restore, the CLI, another process, a git checkout. Without it the cache
   * is authoritative over the disk, and the next write destroys whatever the disk had.
   */
  async boardStamp(id: string): Promise<number> {
    try {
      return (await stat(this.boardPath(id))).mtimeMs;
    } catch {
      return 0;
    }
  }

  // ---------------------------------------------------------------- books

  bookPath(id: string): string {
    return join(this.booksDir, `${safe(id)}.json`);
  }

  async listBooks(): Promise<string[]> {
    await this.ready();
    const names = await readdir(this.booksDir);
    return names
      .filter((n) => n.endsWith('.json'))
      .map((n) => n.slice(0, -5))
      .sort();
  }

  async readBook(id: string): Promise<BookSpec | undefined> {
    try {
      return upgradeBook(JSON.parse(await readFile(this.bookPath(id), 'utf8')) as BookSpec);
    } catch {
      return undefined;
    }
  }

  async writeBook(spec: BookSpec): Promise<void> {
    await this.ready();
    await atomically(this.bookPath(spec.id), `${JSON.stringify(spec, null, 2)}\n`);
  }

  // ---------------------------------------------------------------- trash

  get trashDir(): string {
    return join(this.dir, 'trash');
  }

  /**
   * Throw a notebook away -- into the trash, not into nothing.
   *
   * Archive is "put away"; this is "I do not want it". Even so the file is moved, not deleted:
   * it sits in trash/ for thirty days under its id and the moment it went, and `grimstroke
   * untrash` or POST /api/trash/restore puts it back. After thirty days it is gone for good.
   */
  async trashBook(id: string, now = new Date()): Promise<string | undefined> {
    const from = this.bookPath(id);
    if (!existsSync(from)) return undefined;
    await mkdir(this.trashDir, { recursive: true });
    const name = `${safe(id)}--${now.toISOString().replace(/[:.]/g, '-')}.json`;
    await rename(from, join(this.trashDir, name));
    await this.purgeTrash(now);
    return name;
  }

  /** What is in the trash, newest first, with the title each notebook had. */
  async listTrash(now = new Date()): Promise<TrashEntry[]> {
    await this.purgeTrash(now);
    let names: string[];
    try {
      names = (await readdir(this.trashDir)).filter((n) => n.endsWith('.json'));
    } catch {
      return [];
    }
    const out: TrashEntry[] = [];
    for (const name of names) {
      const parsed = parseTrashName(name);
      if (!parsed) continue;
      let title = parsed.id;
      try {
        const spec = JSON.parse(await readFile(join(this.trashDir, name), 'utf8')) as BookSpec;
        title = spec.cover?.title ?? spec.title ?? spec.id;
      } catch {
        // A file that cannot be read is still listed, by its id, so it can be restored or left.
      }
      out.push({ name, id: parsed.id, title, at: parsed.at });
    }
    return out.sort((a, b) => b.at.getTime() - a.at.getTime());
  }

  /**
   * Put a notebook back from the trash: by its trash name, or by its id (the newest one).
   * If its id has been taken since, it comes back under a new one. Answers with the id.
   */
  async untrash(which: string): Promise<string | undefined> {
    const all = await this.listTrash();
    const entry = all.find((e) => e.name === which) ?? all.find((e) => e.id === which);
    if (!entry) return undefined;
    const taken = new Set(await this.listBooks());
    let id = entry.id;
    for (let n = 2; taken.has(id); n += 1) id = `${entry.id}-${n}`;
    const spec = JSON.parse(await readFile(join(this.trashDir, entry.name), 'utf8')) as BookSpec;
    await this.writeBook({ ...spec, id });
    await rm(join(this.trashDir, entry.name), { force: true });
    return id;
  }

  /** Anything in the trash for more than thirty days goes for good. */
  private async purgeTrash(now: Date): Promise<void> {
    let names: string[];
    try {
      names = await readdir(this.trashDir);
    } catch {
      return;
    }
    for (const name of names) {
      const parsed = parseTrashName(name);
      if (parsed && now.getTime() - parsed.at.getTime() > TRASH_DAYS * 86_400_000) {
        await rm(join(this.trashDir, name), { force: true });
      }
    }
  }

  // ---------------------------------------------------------------- profile

  get profilePath(): string {
    return join(this.dir, 'profile.json');
  }

  /**
   * The workspace's profile.
   *
   * There is one. Before there was, there was a studio of characters in faces/, and the first
   * read here carries the person's own words across from them -- the name, the role, the
   * sentence and the details -- preferring any character over the built-in default one. The
   * faces directory itself is left exactly as it was: it is somebody's data, and nothing here
   * deletes it.
   */
  async readProfile(): Promise<Profile> {
    try {
      return readProfile(JSON.parse(await readFile(this.profilePath, 'utf8')));
    } catch {
      // No profile yet: fall through to what the studio left, if anything.
    }
    try {
      const faces = join(this.dir, 'faces');
      const names = (await readdir(faces)).filter((n) => n.endsWith('.json')).sort();
      const chosen = names.find((n) => n !== 'default.json') ?? names[0];
      if (chosen) return readProfile(JSON.parse(await readFile(join(faces, chosen), 'utf8')));
    } catch {
      // No studio either. A profile starts from nothing.
    }
    return readProfile({});
  }

  async writeProfile(profile: Profile): Promise<void> {
    await this.ready();
    await atomically(this.profilePath, `${JSON.stringify(readProfile(profile), null, 2)}\n`);
  }

  // ---------------------------------------------------------------- assets

  /** Store bytes under the hash of their contents, and return the name. */
  async putAsset(bytes: Buffer, extension = '.png'): Promise<string> {
    await this.ready();
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 32);
    const name = `${hash}${extension.startsWith('.') ? extension : `.${extension}`}`;
    const path = join(this.assetsDir, name);
    if (!existsSync(path)) await writeFile(path, bytes);
    return name;
  }

  assetPath(name: string): string {
    return join(this.assetsDir, safe(name));
  }

  /** Copy a file that is already on disk into the store. */
  async importAsset(from: string): Promise<string> {
    return this.putAsset(await readFile(from), extname(from) || '.png');
  }

  // ---------------------------------------------------------------- settings

  async readSettings(): Promise<Settings> {
    try {
      return JSON.parse(await readFile(join(this.dir, 'settings.json'), 'utf8')) as Settings;
    } catch {
      return {};
    }
  }

  async writeSettings(settings: Settings): Promise<void> {
    await this.ready();
    await writeFile(
      join(this.dir, 'settings.json'),
      `${JSON.stringify(settings, null, 2)}\n`,
      'utf8',
    );
  }
}

/**
 * Write through a temporary file and a rename, which is atomic on every
 * filesystem this will run on. A document is autosaved on every change, so a
 * crash during a write is not a remote possibility -- and half a JSON file is a
 * workspace that no longer opens.
 */
async function atomically(path: string, contents: string): Promise<void> {
  const temp = `${path}.${process.pid}.tmp`;
  await writeFile(temp, contents, 'utf8');
  await rename(temp, path);
}

/**
 * A name that cannot leave the directory it belongs to.
 *
 * Ids arrive over HTTP. `../../.ssh/id_ed25519` is a perfectly good string and
 * a perfectly good board id as far as JSON is concerned, and this is the only
 * place that turns one into a path.
 */
function safe(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9._-]/g, '-').replace(/^[.-]+/, '');
  // A name has to contain something that is actually a name. `///` cleans to
  // `---`, which is a perfectly valid filename and a perfectly useless board
  // id, and letting it through means a directory slowly filling with them.
  if (!/[A-Za-z0-9]/.test(cleaned)) {
    throw new Error(`${JSON.stringify(name)} is not a usable name`);
  }
  return cleaned.slice(0, 120);
}

export { safe as safeName };
