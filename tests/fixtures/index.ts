/**
 * Where the fixture images are.
 *
 * Resolved once, from this module, rather than from each test's own location.
 * Every test used to compute `../fixtures` for itself, and the first time the
 * suite was rearranged into folders all of them started pointing at a directory
 * that does not exist -- a failure that says ENOENT rather than "your test moved".
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const FIXTURES = dirname(fileURLToPath(import.meta.url));

/** A tall phone screenshot: the case where imageMaxHeight matters. */
export const DEVICE = join(FIXTURES, 'device.png');
/** A wide desktop screenshot. */
export const DESKTOP = join(FIXTURES, 'desktop.png');
/**
 * A screenshot with something in it.
 *
 * DEVICE and DESKTOP are flat colour on purpose -- the export tests count
 * pixels of one exact value, so they cannot have detail. That makes them
 * useless for the look-sheet, which spent its life rendering a navy rectangle
 * and therefore could not show whether a mark, a mount or a censor bar landed
 * anywhere sensible. This one has text, rules, colour and a number worth
 * redacting.
 */
export const UI = join(FIXTURES, 'ui.png');
