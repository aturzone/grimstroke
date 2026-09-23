/**
 * Destructive redaction, as a file operation.
 *
 * The pixel work is pure and lives in draw/material/plate/redact.ts. This is the half that
 * touches the disk: read a PNG, destroy the regions, and write a NEW file -- never the
 * original, because the original is the one thing a mistaken rectangle must not cost.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from '~/draw/look/png.ts';
import type { RectRef } from '~/draw/material/model.ts';
import {
  MARKER_KEY,
  type RedactOptions,
  type RedactResult,
  redactRaster,
} from '~/draw/material/plate/redact.ts';

export interface RedactedFile extends RedactResult {
  out: string;
}

/** Fill each region with flat ink and write the result to `out`. */
export function redactImage(
  src: string,
  out: string,
  regions: readonly RectRef[],
  options: RedactOptions = {},
): RedactedFile {
  const raster = decodePng(readFileSync(src));
  const result = redactRaster(raster, regions, options);
  writeFileSync(out, encodePng(raster, { [MARKER_KEY]: result.marker }));
  return { out, ...result };
}
