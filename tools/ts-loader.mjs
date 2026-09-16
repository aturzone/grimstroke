/**
 * Run TypeScript on a stock Node.
 *
 * `node --experimental-strip-types` only works on a Node compiled with
 * TypeScript support, and plenty are not -- Ubuntu's is not, which is exactly
 * the kind of machine an agent ends up on. Rather than making the build depend
 * on a lucky binary, esbuild (already a dependency) transforms on the fly.
 *
 * It also resolves the `~/` alias, so the same import paths work when running a
 * file directly, under vitest, and inside the bundle. Without that, `~/` is a
 * bundler-only convenience that breaks the moment anyone runs a script.
 */

import { readFile } from 'node:fs/promises';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { transform } from 'esbuild';

const SRC = resolvePath(dirname(fileURLToPath(import.meta.url)), '..', 'src');

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('~/')) {
    return { url: pathToFileURL(resolvePath(SRC, specifier.slice(2))).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.ts') && !url.includes('/node_modules/')) {
    const source = await readFile(fileURLToPath(url), 'utf8');
    const { code } = await transform(source, {
      loader: 'ts',
      format: 'esm',
      target: 'node22',
      sourcefile: fileURLToPath(url),
    });
    return { format: 'module', source: code, shortCircuit: true };
  }
  return nextLoad(url, context);
}
