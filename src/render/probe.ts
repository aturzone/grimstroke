/**
 * Image dimensions, from the file header.
 *
 * A dependency would do this, but the whole reason marks are usable is that the
 * source size is known, and taking a dependency for twenty lines of header
 * parsing in a tool that must run anywhere is a bad trade.
 */

import { closeSync, openSync, readSync } from 'node:fs';

export interface Size {
  width: number;
  height: number;
}

const HEAD = 64 * 1024;

function head(path: string): Buffer {
  const fd = openSync(path, 'r');
  try {
    const buffer = Buffer.alloc(HEAD);
    const read = readSync(fd, buffer, 0, HEAD, 0);
    return buffer.subarray(0, read);
  } finally {
    closeSync(fd);
  }
}

export function imageSize(path: string): Size {
  if (path.startsWith('data:')) {
    throw new Error('a data: URI has no readable size; give width and height, or use pct: marks');
  }
  const bytes = head(path);

  // PNG: an IHDR chunk always starts at byte 8.
  if (bytes.length > 24 && bytes.readUInt32BE(0) === 0x89504e47) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }

  // GIF
  if (bytes.length > 10 && bytes.subarray(0, 3).toString('latin1') === 'GIF') {
    return { width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) };
  }

  // WebP (VP8X and lossy VP8 )
  if (bytes.length > 30 && bytes.subarray(0, 4).toString('latin1') === 'RIFF') {
    const kind = bytes.subarray(12, 16).toString('latin1');
    if (kind === 'VP8X') {
      return {
        width: 1 + (bytes.readUIntLE(24, 3) & 0xffffff),
        height: 1 + (bytes.readUIntLE(27, 3) & 0xffffff),
      };
    }
    if (kind === 'VP8 ') {
      return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
    }
  }

  // JPEG: walk the markers to the first start-of-frame.
  if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = bytes[offset + 1] ?? 0;
      const isFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
      if (isFrame) {
        return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
      }
      offset += 2 + bytes.readUInt16BE(offset + 2);
    }
  }

  throw new Error(`cannot read the size of ${path}: not a PNG, JPEG, GIF or WebP`);
}
