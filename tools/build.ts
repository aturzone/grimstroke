/**
 * The build. esbuild, run through node's own type stripping, so there is no
 * bundler config language to learn and no plugin chain to debug.
 */

import { cp, mkdir, rm } from 'node:fs/promises';
import { build, context } from 'esbuild';

const dev = process.argv.includes('--dev');
const watch = process.argv.includes('--watch');

const shared = {
  bundle: true,
  platform: 'node' as const,
  target: 'node22',
  format: 'esm' as const,
  sourcemap: dev,
  minify: false,
  // Everything is inlined except playwright, which is an optional peer and must
  // stay a runtime import so a consumer without it can still render.
  external: ['playwright'],
  define: { __VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0') },
  alias: { '~': './src' },
};

async function run(): Promise<void> {
  await rm('dist', { recursive: true, force: true });
  await mkdir('dist', { recursive: true });

  const targets = [
    { entryPoints: ['src/index.ts'], outfile: 'dist/index.js' },
    {
      entryPoints: ['src/host/cli.ts'],
      outfile: 'dist/cli.js',
      banner: { js: '#!/usr/bin/env node' },
    },
    // The face: everything that draws a document for a person, loaded by `serve` from beside
    // the CLI. It is meant to leave for a repository of its own (docs/split.md).
    { entryPoints: ['src/face/index.ts'], outfile: 'dist/face.js' },
    // The core's own page script: the / box and the / board, and nothing of any face.
    {
      entryPoints: ['src/app/box.ts'],
      outfile: 'dist/box.js',
      platform: 'browser' as const,
      external: [] as string[],
      minify: !dev,
    },
    // The app. Browser platform, and nothing external: the page must need
    // nothing from anywhere else, which is what makes the product a URL.
    {
      entryPoints: ['src/app/main.ts'],
      outfile: 'dist/app.js',
      platform: 'browser' as const,
      external: [] as string[],
      minify: !dev,
    },
  ];

  if (watch) {
    const contexts = await Promise.all(targets.map((t) => context({ ...shared, ...t })));
    await Promise.all(contexts.map((c) => c.watch()));
    console.warn('watching');
    return;
  }

  for (const target of targets) {
    await build({ ...shared, ...target });
  }
  // The faces ship with the package; the renderer walks up to find them.
  await cp('assets', 'dist/assets', { recursive: true });
  console.warn(`built${dev ? ' (dev)' : ''}`);
}

await run();
