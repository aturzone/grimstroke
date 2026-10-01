/**
 * The face's command line: what draws. Write a JSON file, run one command, get PNGs -- the path
 * for an agent that cannot import a library. Everything else on the command line (serve, the
 * gateway, saving and opening, search, history) is the core's `grimstroke`.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { NotebookSpec, PageSpec } from '~/draw/doc/page/model.ts';
import { renderPage } from '~/draw/doc/page/render.ts';
import { check as checkPalette, PALETTES, palette } from '~/draw/look/palette.ts';
import { fontDirectory, verifyFaces } from '~/draw/type/faces.ts';
import { exportPages } from '~/host/export.ts';
import { redactImage } from '~/host/redact.ts';

const USAGE = `grimstroke-face — drawing pages

  grimstroke-face render <spec.json> [options]   write a PNG per page
  grimstroke-face html   <spec.json> [options]   write the HTML instead, and open no browser
  grimstroke-face check  <spec.json>             report anything that would render wrong
  grimstroke-face redact <in.png> <out.png> --region src:x,y,w,h ...
                                                 destroy those pixels, permanently
  grimstroke-face palettes                       list the palettes
  grimstroke-face doctor                         check the vendored faces against FONTS.toml

Options
  --region REF     for redact; repeat. src:x,y,w,h | pct:... | css:...
  --bleed N        grow each region by N px (default 2, and err this way)
  --out DIR        where to write        (default: alongside the spec)
  --engine NAME    firefox | chromium | webkit
  --dpr N          device pixel ratio    (2 for a page to be looked at closely)

The spec is one page or a notebook:

  { "id": "login", "title": "...", "blocks": [ { "kind": "text", "text": "..." } ] }
  { "pages": [ ... ], "palette": "newsprint" }
`;

interface Options {
  regions?: string[];
  bleed?: number | undefined;
  out?: string | undefined;
  engine?: 'firefox' | 'chromium' | 'webkit' | undefined;
  dpr?: number | undefined;
}

function parse(argv: string[]): { verb: string; file?: string; options: Options } {
  const options: Options = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--region') {
      const value = argv[++i];
      if (value !== undefined) options.regions = [...(options.regions ?? []), value];
    } else if (arg === '--bleed') options.bleed = Number(argv[++i]);
    else if (arg === '--out') options.out = argv[++i];
    else if (arg === '--engine') options.engine = argv[++i] as Options['engine'];
    else if (arg === '--dpr') options.dpr = Number(argv[++i]);
    else if (arg !== undefined) positional.push(arg);
  }
  const [verb, file] = positional;
  return { verb: verb ?? 'help', ...(file === undefined ? {} : { file }), options };
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
  const { verb, file, options } = parse(argv);
  if (verb === 'help' || verb === '--help' || verb === '-h') {
    process.stdout.write(USAGE);
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
