/**
 * The vendored faces.
 *
 * Nothing is resolved from the system. A system font makes output
 * machine-dependent, and a page that renders differently on someone else's
 * laptop is not much use as a record of anything.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface Face {
  family: string;
  weight: number;
  file: string;
}

export const FACES: readonly Face[] = [
  { family: 'Estedad', weight: 400, file: 'Estedad-Regular.ttf' },
  { family: 'Estedad', weight: 700, file: 'Estedad-Bold.ttf' },
  { family: 'JetBrains Mono', weight: 400, file: 'JetBrainsMono-Regular.ttf' },
  { family: 'JetBrains Mono', weight: 700, file: 'JetBrainsMono-Bold.ttf' },
];

export const DEFAULT_BODY = 'JetBrains Mono';
export const DEFAULT_MONO = 'JetBrains Mono';

/**
 * Where the .ttf files live.
 *
 * Walk up from this module looking for the assets directory, so the same code
 * works from src/ during tests and from dist/ once bundled. An override exists
 * because a consumer may vendor its own faces elsewhere.
 */
let override: string | undefined;

export function setFontDirectory(path: string): void {
  override = resolve(path);
}

export function fontDirectory(): string {
  if (override) return override;
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i += 1) {
    const candidate = join(dir, 'assets', 'fonts');
    try {
      readFileSync(join(candidate, 'JetBrainsMono-Regular.ttf'));
      return candidate;
    } catch {
      dir = dirname(dir);
    }
  }
  throw new Error(
    'could not find assets/fonts. Call setFontDirectory() with the path to the vendored faces.',
  );
}

export function facePath(face: Face): string {
  return join(fontDirectory(), face.file);
}
