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
    { entryPoints: ['src/cli.ts'], outfile: 'dist/cli.js', banner: { js: '#!/usr/bin/env node' } },
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
