/**
 * The command line.
 *
 * This is the path for an agent that cannot import a library: write a JSON file,
 * run one command, get PNGs. It is deliberately the smallest possible surface --
 * the page format is the API, and this only feeds it.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { NotebookSpec, PageSpec } from '~/draw/doc/page/model.ts';
import { renderPage } from '~/draw/doc/page/render.ts';
import { search } from '~/draw/doc/search.ts';
import { check as checkPalette, PALETTES, palette } from '~/draw/look/palette.ts';
import { fontDirectory, verifyFaces } from '~/draw/type/faces.ts';
import { exportPages } from '~/host/export.ts';
import { redactImage } from '~/host/redact.ts';
import { hashPassword, type Login, loginFromEnv } from '~/host/serve/login.ts';
import { serve } from '~/host/serve/server.ts';
import { type Archive, pack, readArchive, unpack } from '~/host/store/archive.ts';
import { Store, TRASH_DAYS } from '~/host/store/store.ts';

declare const __VERSION__: string;
const VERSION = typeof __VERSION__ === 'string' ? __VERSION__ : '0.0.0-dev';

const USAGE = `grimstroke ${VERSION} — a notebook for agents

  grimstroke render <spec.json> [options]   write a PNG per page
  grimstroke html   <spec.json> [options]   write the HTML instead, and open no browser
  grimstroke check  <spec.json>             report anything that would render wrong
  grimstroke redact <in.png> <out.png> --region src:x,y,w,h ...
                                            destroy those pixels, permanently
  grimstroke serve [--port N] [--board ID]  open the workspace on a port
                   with GRIMSTROKE_LOGIN_USER and GRIMSTROKE_LOGIN_HASH set, it asks for a
                   name and password at /login instead of a token in the address
  grimstroke hash-password  < password    the hash for GRIMSTROKE_LOGIN_HASH
  grimstroke save   <file.grimstroke>       write everything to one file
  grimstroke open   <file.grimstroke>       read one back in
  grimstroke search <words>                 boards, notebooks, the archive and the profile
  grimstroke trash                          notebooks thrown away, still recoverable
  grimstroke untrash <name|id>              put one back
  grimstroke history [board]                past versions still on disk
  grimstroke rollback <board> [version]     put one of them back
  grimstroke palettes                       list the palettes
  grimstroke doctor                         check the vendored faces against FONTS.toml

Options
  --region REF     for redact; repeat. src:x,y,w,h | pct:... | css:...
  --bleed N        grow each region by N px (default 2, and err this way)
  --out DIR        where to write        (default: alongside the spec)
  --port N         for serve; 0 or absent picks a free one
  --board ID       which board to open           (default: workspace)
  --dir PATH       where the work is kept        (default: ~/.grimstroke)
  --host ADDR      for serve                     (default: 127.0.0.1)
  --token STR      for serve; fixes the token so an agent has a stable URL
  --engine NAME    firefox | chromium | webkit
  --dpr N          device pixel ratio    (2 for a page to be looked at closely)

The spec is one page or a notebook:

  { "id": "login", "title": "...", "blocks": [ { "kind": "text", "text": "..." } ] }
  { "pages": [ ... ], "palette": "newsprint" }
`;

interface Options {
  port?: number | undefined;
  token?: string | undefined;
  board?: string | undefined;
  dir?: string | undefined;
  host?: string | undefined;
  regions?: string[];
  bleed?: number | undefined;
  out?: string | undefined;
  engine?: 'firefox' | 'chromium' | 'webkit' | undefined;
  dpr?: number | undefined;
}

function parse(argv: string[]): { verb: string; file?: string; rest: string[]; options: Options } {
  const options: Options = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--region') {
      const value = argv[++i];
      if (value !== undefined) options.regions = [...(options.regions ?? []), value];
    } else if (arg === '--port') options.port = Number(argv[++i]);
    else if (arg === '--board') options.board = argv[++i];
    else if (arg === '--dir') options.dir = argv[++i];
    else if (arg === '--host') options.host = argv[++i];
    else if (arg === '--token') options.token = argv[++i];
    else if (arg === '--bleed') options.bleed = Number(argv[++i]);
    else if (arg === '--out') options.out = argv[++i];
    else if (arg === '--engine') options.engine = argv[++i] as Options['engine'];
    else if (arg === '--dpr') options.dpr = Number(argv[++i]);
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

function pagesOf(spec: PageSpec | NotebookSpec): PageSpec[] {
  if ('pages' in spec && Array.isArray(spec.pages)) {
    const defaults = spec as NotebookSpec;
    return defaults.pages.map((p) => ({
      ...(defaults.palette === undefined ? {} : { palette: defaults.palette }),
      ...(defaults.direction === undefined ? {} : { direction: defaults.direction }),
      ...p,
    }));
  }
  return [spec as PageSpec];
}

async function load(file: string): Promise<PageSpec[]> {
  const raw = await readFile(resolve(file), 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`${file} is not valid JSON: ${error instanceof Error ? error.message : error}`);
  }
  const pages = pagesOf(parsed as PageSpec | NotebookSpec);
  if (pages.length === 0) throw new Error(`${file} has no pages`);
  for (const page of pages) {
    if (!page.id) throw new Error('every page needs an id; it seeds the paper and names the file');
    if (!Array.isArray(page.blocks)) throw new Error(`page ${page.id} has no blocks array`);
  }
  return pages;
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
  if (verb === 'palettes') {
    for (const p of PALETTES) {
      const problems = checkPalette(p);
      const mark = problems.length === 0 ? 'ok  ' : 'WARN';
      process.stdout.write(
        `  ${mark} ${p.id.padEnd(11)} ${p.label.padEnd(16)} ` +
          `${p.dark ? 'dark ' : 'light'}  paper ${p.paper}  ink ${p.ink}\n`,
      );
      for (const problem of problems) process.stdout.write(`       ${problem}\n`);
    }
    return 0;
  }

  if (verb === 'doctor') {
    const checks = verifyFaces();
    process.stdout.write(`faces in ${fontDirectory()}\n`);
    for (const check of checks) {
      const mark = check.ok ? 'ok  ' : 'FAIL';
      process.stdout.write(`  ${mark} ${check.family.padEnd(14)} ${check.file}\n`);
      if (check.ok) continue;
      process.stdout.write(
        `       expected ${check.expected ?? '(not in FONTS.toml)'}\n` +
          `       actual   ${check.actual}\n`,
      );
    }
    const bad = checks.filter((c) => !c.ok).length;
    if (bad > 0) {
      process.stdout.write(
        `\n${bad} face(s) are not what the manifest says. A page set in a face that is\n` +
          'not the one that was vendored looks slightly wrong and blames the renderer.\n',
      );
    }
    return bad === 0 ? 0 : 1;
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
    const running = await serve({
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

  if (verb === 'redact') {
    const [, , target] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
    if (!file || !target) {
      process.stderr.write(`redact needs an input and an output file\n\n${USAGE}`);
      return 2;
    }
    if (!options.regions?.length) {
      process.stderr.write('redact needs at least one --region\n');
      return 2;
    }
    const result = redactImage(file, target, options.regions, {
      ...(options.bleed === undefined ? {} : { bleed: options.bleed }),
    });
    process.stdout.write(
      `wrote ${result.out}  ${result.width}x${result.height}  ` +
        `${result.regions.length} region(s) destroyed\n` +
        '  those pixels are gone from this copy; the original still has them\n',
    );
    return 0;
  }

  if (!file) {
    process.stderr.write(`${verb} needs a spec file\n\n${USAGE}`);
    return 2;
  }

  const pages = await load(file);
  const outDir = resolve(options.out ?? resolve(file, '..'));
  await mkdir(outDir, { recursive: true });

  if (verb === 'check') {
    let problems = 0;
    for (const spec of pages) {
      const rendered = renderPage(spec);
      if (spec.palette) rendered.warnings.push(...checkPalette(palette(spec.palette)));
      if (rendered.warnings.length === 0) {
        process.stdout.write(`  ok   ${spec.id}\n`);
        continue;
      }
      problems += rendered.warnings.length;
      process.stdout.write(`  WARN ${spec.id}\n`);
      for (const warning of rendered.warnings) process.stdout.write(`       ${warning}\n`);
    }
    return problems === 0 ? 0 : 1;
  }

  if (verb === 'html') {
    for (const spec of pages) {
      const rendered = renderPage(spec);
      const out = join(outDir, `${spec.id}.html`);
      await writeFile(out, rendered.html, 'utf8');
      process.stdout.write(`wrote ${out}\n`);
      for (const warning of rendered.warnings) process.stderr.write(`  warn: ${warning}\n`);
    }
    return 0;
  }

  if (verb === 'render') {
    const jobs = pages.map((spec) => ({
      page: renderPage(spec),
      out: join(outDir, `${spec.id}.png`),
    }));
    for (const job of jobs) {
      for (const warning of job.page.warnings) process.stderr.write(`  warn: ${warning}\n`);
    }
    const results = await exportPages(jobs, {
      ...(options.engine === undefined ? {} : { engine: options.engine }),
      ...(options.dpr === undefined ? {} : { dpr: options.dpr }),
    });
    for (const result of results) {
      process.stdout.write(
        `wrote ${result.path}  ${result.width}x${result.height}  ` +
          `${Math.round(result.bytes / 1024)}KB  ${result.sha256.slice(0, 12)}\n`,
      );
    }
    return 0;
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
