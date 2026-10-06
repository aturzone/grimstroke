/**
 * The command line.
 *
 * This is the path for an agent that cannot import a library: write a JSON file,
 * run one command, get PNGs. It is deliberately the smallest possible surface --
 * the page format is the API, and this only feeds it.
 */

import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { search } from '@core/docs/search.ts';
import type { Face } from '@core/serve/face.ts';
import { gateway, readUsers } from '@core/serve/gateway.ts';
import { hashPassword, type Login, loginFromEnv } from '@core/serve/login.ts';
import { serve } from '@core/serve/server.ts';
import { type Archive, pack, readArchive, unpack } from '@core/store/archive.ts';
import { Store, TRASH_DAYS } from '@core/store/store.ts';

declare const __VERSION__: string;
const VERSION = typeof __VERSION__ === 'string' ? __VERSION__ : '0.0.0-dev';

const USAGE = `grimstroke ${VERSION} — a notebook for agents: the core

  (drawing pages -- render, html, check, redact, palettes, doctor -- is the face's)

  grimstroke serve [--port N] [--board ID]  open the workspace on a port
                   with GRIMSTROKE_LOGIN_USER and GRIMSTROKE_LOGIN_HASH set, it asks for a
                   name and password at /login instead of a token in the address
  grimstroke hash-password  < password    the hash for GRIMSTROKE_LOGIN_HASH
  grimstroke gateway --users FILE --dir DIR [--port N] [--host ADDR]
                   several people behind one login, each with a workspace in DIR/<name>
  grimstroke save   <file.grimstroke>       write everything to one file
  grimstroke open   <file.grimstroke>       read one back in
  grimstroke search <words>                 boards, notebooks, the archive and the profile
  grimstroke trash                          notebooks thrown away, still recoverable
  grimstroke untrash <name|id>              put one back
  grimstroke history [board]                past versions still on disk
  grimstroke rollback <board> [version]     put one of them back

Options
  --port N         for serve; 0 or absent picks a free one
  --board ID       which board to open           (default: workspace)
  --dir PATH       where the work is kept        (default: ~/.grimstroke)
  --host ADDR      for serve                     (default: 127.0.0.1)
  --token STR      for serve; fixes the token so an agent has a stable URL

`;

interface Options {
  port?: number | undefined;
  token?: string | undefined;
  board?: string | undefined;
  dir?: string | undefined;
  host?: string | undefined;
}

function parse(argv: string[]): { verb: string; file?: string; rest: string[]; options: Options } {
  const options: Options = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--port') options.port = Number(argv[++i]);
    else if (arg === '--board') options.board = argv[++i];
    else if (arg === '--dir') options.dir = argv[++i];
    else if (arg === '--host') options.host = argv[++i];
    else if (arg === '--token') options.token = argv[++i];
    else if (arg !== undefined) positional.push(arg);
  }
  const [verb, file] = positional;
  return {
    verb: verb ?? 'help',
    ...(file === undefined ? {} : { file }),
    rest: positional.slice(1),
    options,
  };
}

async function main(argv: string[]): Promise<number> {
  const { verb, file, rest: words, options } = parse(argv);

  if (verb === 'help' || verb === '--help' || verb === '-h') {
    process.stdout.write(USAGE);
    return 0;
  }
  if (verb === '--version' || verb === '-v') {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }
  if (verb === 'search') {
    const store = new Store(options.dir === undefined ? {} : { dir: options.dir });
    const query = words.join(' ');
    if (!query.trim()) {
      process.stderr.write('search needs some words\n');
      return 2;
    }
    const boards = (
      await Promise.all((await store.listBoards()).map((id) => store.readBoard(id)))
    ).filter((b): b is NonNullable<typeof b> => b !== undefined);
    const books = (
      await Promise.all((await store.listBooks()).map((id) => store.readBook(id)))
    ).filter((b): b is NonNullable<typeof b> => b !== undefined);
    const hits = search({ boards, books, profile: await store.readProfile() }, query);
    if (hits.length === 0) {
      process.stdout.write(`nothing for "${query}"\n`);
      return 1;
    }
    for (const hit of hits) {
      const text = hit.snippet.map((r) => (r.mark ? `[${r.text}]` : r.text)).join('');
      process.stdout.write(
        `  ${hit.kind.padEnd(8)} ${hit.docTitle} · ${hit.title}\n           ${text}\n           ${hit.href}\n`,
      );
    }
    return 0;
  }

  if (verb === 'trash') {
    const store = new Store(options.dir === undefined ? {} : { dir: options.dir });
    const all = await store.listTrash();
    if (all.length === 0) {
      process.stdout.write('the trash is empty\n');
      return 0;
    }
    process.stdout.write(`thrown away, newest first (kept ${TRASH_DAYS} days)\n`);
    for (const one of all) {
      process.stdout.write(
        `  ${one.at.toISOString().replace('T', ' ').slice(0, 19)}  ${one.title}\n           ${one.name}\n`,
      );
    }
    return 0;
  }

  if (verb === 'untrash') {
    const store = new Store(options.dir === undefined ? {} : { dir: options.dir });
    if (!file) {
      process.stderr.write('untrash needs a name from `grimstroke trash`, or a notebook id\n');
      return 2;
    }
    const id = await store.untrash(file);
    if (!id) {
      process.stderr.write(`nothing called ${file} in the trash\n`);
      return 1;
    }
    process.stdout.write(`back on the shelf as ${id}\n`);
    return 0;
  }

  if (verb === 'history') {
    const store = new Store(options.dir === undefined ? {} : { dir: options.dir });
    const id = file ?? options.board ?? 'workspace';
    const versions = await store.history(id);
    if (versions.length === 0) {
      process.stdout.write(`no past versions of ${id} yet\n`);
      return 0;
    }
    process.stdout.write(`past versions of ${id}, newest first\n`);
    for (const one of versions) {
      process.stdout.write(
        `  v${String(one.version).padEnd(6)} ${String(one.items).padStart(3)} item(s)  ` +
          `${one.at.toISOString().replace('T', ' ').slice(0, 19)}\n`,
      );
    }
    process.stdout.write(`\ngrimstroke rollback ${id} <version>\n`);
    return 0;
  }

  if (verb === 'rollback') {
    const store = new Store(options.dir === undefined ? {} : { dir: options.dir });
    const rest = process.argv.slice(3).filter((a) => !a.startsWith('--'));
    const id = rest[0] ?? 'workspace';
    const versions = await store.history(id);
    if (versions.length === 0) {
      process.stderr.write(`no past versions of ${id}\n`);
      return 1;
    }
    // No version named means the most recent one that still had something on it, which is
    // what somebody who has just wiped a board is asking for.
    const wanted = rest[1]
      ? Number(rest[1])
      : (versions.find((v) => v.items > 0) ?? versions[0])?.version;
    const spec = wanted === undefined ? undefined : await store.readHistory(id, wanted);
    if (!spec) {
      process.stderr.write(`${id} has no version ${String(wanted)}\n`);
      return 1;
    }
    // Written as a NEW version rather than by rewinding the counter, so the board that is
    // being replaced is itself kept -- a rollback is undoable too.
    await store.writeBoard({ ...spec, version: (await store.readBoard(id))?.version ?? 0 });
    process.stdout.write(
      `${id} is back at v${wanted}, with ${spec.items.length} item(s)\n` +
        '  the version it replaced was kept too\n',
    );
    return 0;
  }

  if (verb === 'save' || verb === 'open') {
    if (!file) {
      process.stderr.write(`${verb} needs a file\n\n${USAGE}`);
      return 2;
    }
    const store = new Store(options.dir === undefined ? {} : { dir: options.dir });

    if (verb === 'save') {
      const archive = await pack(store);
      await writeFile(file, `${JSON.stringify(archive, null, 2)}\n`, 'utf8');
      const megabytes = ((await readFile(file)).length / 1e6).toFixed(2);
      process.stdout.write(
        `wrote ${file}\n` +
          `  ${archive.boards.length} board(s), ${archive.books.length} notebook(s), ` +
          `${archive.profile ? 'the profile, ' : ''}` +
          `${Object.keys(archive.assets).length} picture(s), ${megabytes} MB\n` +
          '  it is plain JSON: you can read it, diff it, and commit it\n',
      );
      return 0;
    }

    /*
     * Restoring MERGES, and says so.
     *
     * A board in the file replaces a board of the same id here, and anything not mentioned
     * is left alone. That is the behaviour that makes an archive useful for moving one
     * workspace onto a machine that already has another; the alternative -- wiping the
     * store first -- turns a mistyped filename into lost work.
     */
    let archive: Archive;
    try {
      archive = readArchive(JSON.parse(await readFile(file, 'utf8')));
    } catch (error) {
      process.stderr.write(`${file}: ${error instanceof Error ? error.message : error}\n`);
      return 1;
    }
    const restored = await unpack(store, archive);
    process.stdout.write(
      `read ${file}\n` +
        `  into ${store.dir}\n` +
        `  boards:    ${restored.boards.join(', ') || '(none)'}\n` +
        `  notebooks: ${restored.books.join(', ') || '(none)'}\n` +
        `  profile:   ${restored.profile ? 'restored' : '(none in the file)'}\n` +
        `  pictures:  ${restored.assets}\n` +
        '  anything already here that the file did not mention was left alone\n',
    );
    return 0;
  }

  // Several people, each with a workspace of their own, behind one login (host/serve/gateway.ts).
  if (verb === 'gateway') {
    const flag = (name: string): string | undefined => {
      const i = argv.indexOf(name);
      return i >= 0 ? argv[i + 1] : undefined;
    };
    const usersFile = flag('--users');
    const dir = flag('--dir');
    if (!usersFile || !dir) throw new Error('gateway needs --users FILE and --dir DIR');
    const secretFile = join(dir, '.gateway-secret');
    let secret: string;
    try {
      secret = readFileSync(secretFile, 'utf8').trim();
    } catch {
      secret = randomBytes(32).toString('base64url');
      mkdirSync(dir, { recursive: true });
      writeFileSync(secretFile, secret, { mode: 0o600 });
    }
    const users = readUsers(usersFile);
    gateway({
      users,
      dir,
      port: Number(flag('--port') ?? 7777),
      host: flag('--host') ?? '127.0.0.1',
      cli: fileURLToPath(import.meta.url),
      secret,
    });
    process.stdout.write(
      `grimstroke gateway on ${flag('--port') ?? 7777} for ${users.map((u) => u.user).join(', ')}\n`,
    );
    await new Promise(() => {});
    return 0;
  }

  // A password's hash, for GRIMSTROKE_LOGIN_HASH: read from stdin so it is not in the shell's history.
  if (verb === 'hash-password') {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
    const password = Buffer.concat(chunks)
      .toString('utf8')
      .replace(/\r?\n$/, '');
    if (!password) throw new Error('give the password on stdin');
    process.stdout.write(`${hashPassword(password)}\n`);
    return 0;
  }

  if (verb === 'serve') {
    const drawing = await loadFace();
    const running = await serve({
      ...(drawing ? { face: drawing } : {}),
      ...(options.port === undefined ? {} : { port: options.port }),
      ...(options.host === undefined ? {} : { host: options.host }),
      ...(options.dir === undefined ? {} : { dir: options.dir }),
      ...(options.board === undefined ? {} : { board: options.board }),
      ...(options.token === undefined ? {} : { token: options.token }),
      ...(loginFromEnv() ? { login: loginFromEnv() as Login } : {}),
    });
    process.stdout.write(
      `grimstroke is on ${running.url}\n` +
        `  work is kept in ${running.store.dir}\n` +
        '  the token is in the URL; open it once and the browser keeps it\n' +
        '  an agent can POST /api/patch with the same token and no browser at all\n',
    );
    // Held open by the server. Ctrl-C is the way out, and there is deliberately
    // nothing else listening for a shutdown: a workspace that closes itself
    // while someone is looking at it is a workspace that lost their place.
    await new Promise(() => {});
    return 0;
  }

  if (['render', 'html', 'check', 'redact', 'palettes', 'doctor'].includes(verb)) {
    process.stderr.write(
      `${verb} draws, and drawing is the face's: run it with grimstroke-face ${verb} (docs/split.md)\n`,
    );
    return 2;
  }
  process.stderr.write(`unknown command ${JSON.stringify(verb)}\n\n${USAGE}`);
  return 2;
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}

/**
 * The face to draw with: GRIMSTROKE_FACE names a module (or "none" for the core alone); else a
 * face installed with the core (face/face.js, beside dist/), or built in a checkout beside this
 * one (../grimstroke-face/dist/face.js). None found: the core alone.
 */
async function loadFace(): Promise<Face | undefined> {
  const asked = process.env.GRIMSTROKE_FACE?.trim();
  if (asked === 'none') return undefined;
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = asked
    ? [resolve(asked)]
    : [
        join(here, '..', 'face', 'face.js'),
        join(here, '..', '..', 'grimstroke-face', 'dist', 'face.js'),
      ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const mod = (await import(pathToFileURL(path).href)) as {
      face?: Face;
      desk?: Face;
      default?: Face;
    };
    const found = mod.face ?? mod.desk ?? mod.default;
    if (found) return found;
  }
  if (asked) throw new Error(`no face in ${asked}: it should export \`face\``);
  return undefined;
}
