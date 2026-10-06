/**
 * The build. esbuild, run through node's own type stripping, so there is no
 * bundler config language to learn and no plugin chain to debug.
 */

import { mkdir, rm } from 'node:fs/promises';
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
  alias: { '@core': './src' },
};

async function run(): Promise<void> {
  await rm('dist', { recursive: true, force: true });
  await mkdir('dist', { recursive: true });

  // One build for both, split: what is loaded on demand (the git model, box/git/understand.ts)
  // is a chunk of its own, read from disk the first time it is asked for and not before.
  const target = {
    entryPoints: { index: 'src/index.ts', cli: 'src/cli.ts' },
    outdir: 'dist',
    splitting: true,
    chunkNames: 'chunks/[name]-[hash]',
    // Every output may be run, so each starts as a script; Node reads the line as a comment.
    banner: { js: '#!/usr/bin/env node' },
  };

  if (watch) {
    const ctx = await context({ ...shared, ...target });
    await ctx.watch();
    console.warn('watching');
    return;
  }

  await build({ ...shared, ...target });
  console.warn(`built${dev ? ' (dev)' : ''}`);
}

await run();
