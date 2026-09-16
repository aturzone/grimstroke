/**
 * Which characters a face can actually draw.
 *
 * The browser cannot answer this. document.fonts.check('24px Estedad', CJK)
 * returns true -- the CSS Font Loading API reports whether a face is loaded and
 * would be selected, not whether it has the glyph. So the cmap is parsed here,
 * before anything is rendered, and an uncovered character is reported rather
 * than drawn as an empty box into something meant to be a record.
 */

import { readFileSync } from 'node:fs';
import { FACES, facePath } from './fonts.ts';

/** Never drawn, so never needs covering. */
const IGNORED = new Set([
  0x09, 0x0a, 0x0d, 0x20, 0x200c, 0x200d, 0x200e, 0x200f, 0x2066, 0x2067, 0x2068, 0x2069, 0xfeff,
]);

function tables(view: DataView): Map<string, { offset: number; length: number }> {
  const out = new Map<string, { offset: number; length: number }>();
  const numTables = view.getUint16(4);
  for (let i = 0; i < numTables; i += 1) {
    const at = 12 + i * 16;
    let tag = '';
    for (let c = 0; c < 4; c += 1) tag += String.fromCharCode(view.getUint8(at + c));
    out.set(tag, { offset: view.getUint32(at + 8), length: view.getUint32(at + 12) });
  }
  return out;
}

function format4(view: DataView, base: number, into: Set<number>): void {
  const segX2 = view.getUint16(base + 6);
  const segs = segX2 / 2;
  const ends = base + 14;
  const starts = ends + segX2 + 2;
  const deltas = starts + segX2;
  const ranges = deltas + segX2;
  for (let i = 0; i < segs; i += 1) {
    const end = view.getUint16(ends + i * 2);
    const start = view.getUint16(starts + i * 2);
    const delta = view.getInt16(deltas + i * 2);
    const rangeOffset = view.getUint16(ranges + i * 2);
    if (start === 0xffff) continue;
    for (let cp = start; cp <= Math.min(end, 0xfffe); cp += 1) {
      let gid: number;
      if (rangeOffset === 0) {
        gid = (cp + delta) & 0xffff;
      } else {
        const at = ranges + i * 2 + rangeOffset + (cp - start) * 2;
        if (at + 2 > view.byteLength) continue;
        gid = view.getUint16(at);
        if (gid !== 0) gid = (gid + delta) & 0xffff;
      }
      if (gid !== 0) into.add(cp);
    }
  }
}

function format12(view: DataView, base: number, into: Set<number>): void {
  const groups = view.getUint32(base + 12);
  for (let i = 0; i < groups; i += 1) {
    const at = base + 16 + i * 12;
    const start = view.getUint32(at);
    const end = view.getUint32(at + 4);
    if (end - start > 0x20000) continue;
    for (let cp = start; cp <= end; cp += 1) into.add(cp);
  }
}

const cache = new Map<string, Set<number>>();

export function codepoints(path: string): Set<number> {
  const cached = cache.get(path);
  if (cached) return cached;
  const bytes = readFileSync(path);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const found = new Set<number>();
  const cmap = tables(view).get('cmap');
  if (cmap) {
    const base = cmap.offset;
    const subtables = view.getUint16(base + 2);
    for (let i = 0; i < subtables; i += 1) {
      const at = base + 4 + i * 8;
      const offset = base + view.getUint32(at + 4);
      const format = view.getUint16(offset);
      if (format === 12) format12(view, offset, found);
      else if (format === 4) format4(view, offset, found);
    }
  }
  cache.set(path, found);
  return found;
}

export function coverageOf(families: readonly string[]): Set<number> {
  const union = new Set<number>();
  for (const face of FACES) {
    if (!families.includes(face.family)) continue;
    try {
      for (const cp of codepoints(facePath(face))) union.add(cp);
    } catch {
      // A face that cannot be read is reported by the caller, not here.
    }
  }
  return union;
}

export interface Gap {
  char: string;
  codepoint: number;
}

export function missingGlyphs(text: string, families: readonly string[]): Gap[] {
  const have = coverageOf(families);
  if (have.size === 0) return [];
  const gaps = new Map<number, string>();
  for (const char of text) {
    const cp = char.codePointAt(0);
    if (cp === undefined || cp < 0x20 || IGNORED.has(cp) || have.has(cp)) continue;
    gaps.set(cp, char);
  }
  return [...gaps.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([codepoint, char]) => ({ char, codepoint }));
}

export function describeGaps(gaps: readonly Gap[], families: readonly string[]): string {
  const shown = gaps
    .slice(0, 6)
    .map(
      (g) =>
        `${JSON.stringify(g.char)} (U+${g.codepoint.toString(16).toUpperCase().padStart(4, '0')})`,
    )
    .join(', ');
  const more = gaps.length > 6 ? ` and ${gaps.length - 6} more` : '';
  return `no font in [${families.join(', ')}] can draw ${shown}${more}; it would render as empty boxes`;
}
