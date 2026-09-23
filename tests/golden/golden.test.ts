/**
 * The golden check: every surface, held to a fingerprint of its HTML.
 *
 * render() is pure, so the same input is the same bytes. A refactor that should change
 * nothing -- moving files, splitting a stylesheet, renaming -- must leave every fingerprint
 * alone, and this is how that is proved rather than hoped. When a change is MEANT to alter
 * output, run `pnpm golden` before and after to see exactly what moved, then update the
 * fingerprints with `pnpm test -u`.
 */

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { surfaces } from './surfaces.ts';

describe('golden', () => {
  it('renders every surface exactly as before', () => {
    const prints = Object.fromEntries(
      surfaces().map(({ name, page }) => [
        name,
        `${createHash('sha256').update(page.html).digest('hex').slice(0, 16)} ${page.html.length}`,
      ]),
    );
    expect(prints).toMatchSnapshot();
  });
});
