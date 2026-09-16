/**
 * Destructive redaction.
 *
 * Drawing a censor bar over an image is not redaction. The original still holds
 * the numbers, and so does every copy of it -- including the one that ends up in
 * a bug report attachment, a chat message, or a git history nobody rewrites.
 * This writes a NEW file with those pixels gone.
 *
 * Pixelation is refused outright. It is a digital artefact in a paper world, it
 * LOOKS reversible and invites the question, and for a short low-entropy string
 * like a sixteen-digit card number mosaic redaction is genuinely attackable.
 * Covering is irreversible by construction.
 *
 * No image library: this decodes and re-encodes PNG with zlib from node's own
 * standard library, because a dependency for "fill some rectangles with black"
 * is a dependency that will one day not install on the machine that needs it.
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';
import { resolve as resolveRect } from '~/render/coords.ts';
import type { RectRef } from '~/types.ts';

export interface RedactOptions {
  /**
   * Grow every region by this many pixels on each side.
   *
   * A rectangle read off a picture by eye is routinely a pixel or two short, and
   * the two failure directions are not symmetric: covering slightly too much
   * costs nothing, covering slightly too little leaves part of the number on
   * screen. The default errs the safe way on purpose.
   */
  bleed?: number;
  /** The fill. Defaults to the near-black used as ink everywhere else. */
  colour?: [number, number, number];
}

export interface RedactResult {
  out: string;
  regions: string[];
  width: number;
  height: number;
  /** Written into the file, so a page can tell this image has been through here. */
  marker: string;
}

const MARKER_KEY = 'grimstroke:redacted';

interface Raster {
  width: number;
  height: number;
  /** RGBA, 4 bytes per pixel. */
  pixels: Buffer;
}

// ---------------------------------------------------------------- PNG

function crc32(buffer: Buffer): number {
  let table = crcTable;
  if (!table) {
    table = new Int32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
    crcTable = table;
  }
  let crc = -1;
  for (const byte of buffer) crc = (crc >>> 8) ^ (table[(crc ^ byte) & 0xff] as number);
  return (crc ^ -1) >>> 0;
}
let crcTable: Int32Array | undefined;

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

function decodePng(bytes: Buffer): Raster {
  if (bytes.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let offset = 8;
  let width = 0;
  let height = 0;
  let depth = 0;
  let colourType = 0;
  const idat: Buffer[] = [];

  while (offset + 8 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString('latin1');
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      depth = data.readUInt8(8);
      colourType = data.readUInt8(9);
      if (depth !== 8 || (colourType !== 2 && colourType !== 6)) {
        throw new Error(
          `only 8-bit RGB and RGBA PNGs are supported (this one is depth ${depth}, type ${colourType})`,
        );
      }
      if (data.readUInt8(12) !== 0) throw new Error('interlaced PNGs are not supported');
    } else if (type === 'IDAT') {
      idat.push(Buffer.from(data));
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }

  const channels = colourType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(width * height * 4);
  const line = Buffer.alloc(stride);
  const previous = Buffer.alloc(stride);

  let cursor = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[cursor];
    cursor += 1;
    raw.copy(line, 0, cursor, cursor + stride);
    cursor += stride;
    for (let i = 0; i < stride; i += 1) {
      const a = i >= channels ? (line[i - channels] as number) : 0;
      const b = previous[i] as number;
      const c = i >= channels ? (previous[i - channels] as number) : 0;
      const x = line[i] as number;
      let value = x;
      if (filter === 1) value = x + a;
      else if (filter === 2) value = x + b;
      else if (filter === 3) value = x + ((a + b) >> 1);
      else if (filter === 4) value = x + paeth(a, b, c);
      line[i] = value & 0xff;
    }
    line.copy(previous);
    for (let x = 0; x < width; x += 1) {
      const from = x * channels;
      const to = (y * width + x) * 4;
      pixels[to] = line[from] as number;
      pixels[to + 1] = line[from + 1] as number;
      pixels[to + 2] = line[from + 2] as number;
      pixels[to + 3] = channels === 4 ? (line[from + 3] as number) : 255;
    }
  }
  return { width, height, pixels };
}

function encodePng(raster: Raster, text: Record<string, string>): Buffer {
  const { width, height, pixels } = raster;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // no filter; the image is already tiny to compress
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(6, 9);

  const chunks = [
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
  ];
  for (const [key, value] of Object.entries(text)) {
    chunks.push(chunk('tEXt', Buffer.from(`${key}\u0000${value}`, 'latin1')));
  }
  chunks.push(chunk('IDAT', deflateSync(raw, { level: 6 })));
  chunks.push(chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(chunks);
}

// ---------------------------------------------------------------- api

/** Has this file been through redactImage? */
export function isRedacted(path: string): boolean {
  try {
    const bytes = readFileSync(path);
    return bytes.includes(Buffer.from(MARKER_KEY, 'latin1'));
  } catch {
    return false;
  }
}

/**
 * Fill each region with flat ink and write a new file.
 *
 * Regions use the same space-prefixed references as marks, so a rectangle can be
 * authored once and used for both the redaction and the bar drawn over it.
 */
export function redactImage(
  src: string,
  out: string,
  regions: readonly RectRef[],
  options: RedactOptions = {},
): RedactResult {
  if (regions.length === 0) throw new Error('redactImage needs at least one region');
  const bleed = options.bleed ?? 2;
  const [r, g, b] = options.colour ?? [20, 18, 16];

  const raster = decodePng(readFileSync(src));
  const applied: string[] = [];

  for (const ref of regions) {
    const rect = resolveRect(ref, { width: raster.width, height: raster.height });
    const x0 = Math.max(0, Math.floor((rect.x / 100) * raster.width) - bleed);
    const y0 = Math.max(0, Math.floor((rect.y / 100) * raster.height) - bleed);
    const x1 = Math.min(
      raster.width,
      Math.ceil(((rect.x + rect.w) / 100) * raster.width) + bleed,
    );
    const y1 = Math.min(
      raster.height,
      Math.ceil(((rect.y + rect.h) / 100) * raster.height) + bleed,
    );
    if (x1 <= x0 || y1 <= y0) continue;
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        const at = (y * raster.width + x) * 4;
        raster.pixels[at] = r;
        raster.pixels[at + 1] = g;
        raster.pixels[at + 2] = b;
        raster.pixels[at + 3] = 255;
      }
    }
    applied.push(String(ref));
  }

  const marker = createHash('sha256').update(applied.join('|')).digest('hex').slice(0, 16);
  writeFileSync(out, encodePng(raster, { [MARKER_KEY]: marker }));
  return { out, regions: applied, width: raster.width, height: raster.height, marker };
}
