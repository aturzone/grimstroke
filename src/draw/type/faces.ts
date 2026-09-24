/**
 * The vendored faces.
 *
 * Nothing is resolved from the system. A system font makes output
 * machine-dependent, and a page that renders differently on someone else's
 * laptop is not much use as a record of anything.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Direction } from '~/draw/doc/model.ts';

export interface Face {
  family: string;
  /**
   * A single weight, or the range a variable face covers. Caveat ships one
   * variable file for 400-700, which is one file to verify instead of two that
   * can drift apart.
   */
  weight: number | readonly [number, number];
  file: string;
}

export const FACES: readonly Face[] = [
  { family: 'Estedad', weight: 400, file: 'Estedad-Regular.ttf' },
  { family: 'Estedad', weight: 700, file: 'Estedad-Bold.ttf' },
  { family: 'JetBrains Mono', weight: 400, file: 'JetBrainsMono-Regular.ttf' },
  { family: 'JetBrains Mono', weight: 700, file: 'JetBrainsMono-Bold.ttf' },
  { family: 'Caveat', weight: [400, 700], file: 'Caveat-Variable.ttf' },
  { family: 'Caveat Brush', weight: 400, file: 'CaveatBrush-Regular.ttf' },
];

/** What `@font-face` wants: `700`, or `400 700` for a variable range. */
export function weightRule(face: Face): string {
  return typeof face.weight === 'number' ? String(face.weight) : face.weight.join(' ');
}

// ---------------------------------------------------------------- roles

/**
 * Four roles, not four fonts.
 *
 * A caller names a role and gets a stack. It matters that it is a STACK: the
 * two hands are Latin-only, and a Persian note set in Caveat alone would render
 * as a row of empty boxes. The Persian face is appended to every role so the
 * fallback lands somewhere vendored rather than on whatever the machine has --
 * which is the whole reason nothing is resolved from the system.
 */
export const DEFAULT_BODY = 'JetBrains Mono';
export const DEFAULT_MONO = 'JetBrains Mono';
/** Notes, captions, anything a person would have written rather than typed. */
export const DEFAULT_HAND = 'Caveat';
/** Headlines and labels: the thick strokes on a sticky note. */
export const DEFAULT_MARKER = 'Caveat Brush';
/** Arabic script, and the Latin that has to sit beside it. */
export const PERSIAN = 'Estedad';

export type Role = 'body' | 'mono' | 'hand' | 'marker';

export interface Roles {
  body?: string | undefined;
  mono?: string | undefined;
  hand?: string | undefined;
  marker?: string | undefined;
}

const GENERIC: Record<Role, string> = {
  body: 'sans-serif',
  mono: 'monospace',
  hand: 'cursive',
  marker: 'cursive',
};

function chosen(role: Role, override: Roles, direction: Direction): string {
  const explicit = override[role];
  if (explicit) return explicit;
  if (role === 'body') return direction === 'rtl' ? PERSIAN : DEFAULT_BODY;
  if (role === 'mono') return DEFAULT_MONO;
  return role === 'hand' ? DEFAULT_HAND : DEFAULT_MARKER;
}

/** The families a role resolves to, most specific first. */
export function stack(role: Role, override: Roles = {}, direction: Direction = 'ltr'): string[] {
  const first = chosen(role, override, direction);
  const families = [first];
  // Technical text is never handed to a proportional face: a log excerpt that
  // reflows is not the log excerpt.
  if (role !== 'mono' && first !== PERSIAN) families.push(PERSIAN);
  if (role !== 'mono') families.push(DEFAULT_MONO);
  return families;
}

/**
 * The chrome's face: the mono stack, with the Persian face behind it. Chrome text is a name, a
 * title, a label typed by a person -- never code -- so a Persian notebook title in a field must
 * not fall through to whatever the system has, with its own spacing.
 */
export function uiFontFamily(override: Roles = {}, direction: Direction = 'ltr'): string {
  const families = stack('mono', override, direction);
  if (!families.includes(PERSIAN)) families.push(PERSIAN);
  return [...families.map((f) => `'${f}'`), GENERIC.mono].join(', ');
}

/** The same stack as a CSS `font-family` value. */
export function fontFamily(role: Role, override: Roles = {}, direction: Direction = 'ltr'): string {
  return [...stack(role, override, direction).map((f) => `'${f}'`), GENERIC[role]].join(', ');
}

// ---------------------------------------------------------------- files

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
  for (let i = 0; i < 8; i += 1) {
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

// ---------------------------------------------------------------- doctor

export interface FaceCheck {
  file: string;
  family: string;
  expected: string | undefined;
  actual: string;
  ok: boolean;
}

/**
 * Check every vendored file against the hashes in FONTS.toml.
 *
 * A font file is binary, it is large, and nobody reviews a diff of one. It can
 * be replaced by a build step, a partial download or a well-meaning upgrade and
 * the only symptom is that pages start looking slightly different -- which is
 * the one thing this tool promises does not happen. The manifest has always
 * said this check exists; this is it.
 *
 * Only the [sha256] table is read, by hand. A TOML parser is a dependency, and
 * `"key" = "value"` inside one named section is fifteen lines.
 */
export function verifyFaces(): FaceCheck[] {
  const dir = fontDirectory();
  const expected = new Map<string, string>();
  let manifest = '';
  try {
    manifest = readFileSync(join(dir, 'FONTS.toml'), 'utf8');
  } catch {
    // Reported per file below as a missing expectation, rather than thrown: a
    // consumer that vendored its own faces has no manifest and is not broken.
  }
  let inTable = false;
  for (const line of manifest.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('[')) {
      inTable = trimmed === '[sha256]';
      continue;
    }
    if (!inTable) continue;
    const match = /^"([^"]+)"\s*=\s*"([0-9a-f]{64})"$/.exec(trimmed);
    if (match?.[1] && match[2]) expected.set(match[1], match[2]);
  }

  return FACES.map((face) => {
    let actual = '';
    try {
      actual = createHash('sha256')
        .update(readFileSync(join(dir, face.file)))
        .digest('hex');
    } catch {
      actual = 'missing';
    }
    const want = expected.get(face.file);
    return { file: face.file, family: face.family, expected: want, actual, ok: want === actual };
  });
}
