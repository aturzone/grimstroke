/**
 * Write every golden surface out as HTML, into tools/golden/<label>/.
 *
 *   pnpm golden before     # on the old code
 *   pnpm golden after      # on the new code
 *   diff -r tools/golden/before tools/golden/after
 *
 * The test only says WHICH surface changed. This says how.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { surfaces } from '../tests/golden/surfaces.ts';

const label = process.argv[2] ?? 'now';
const dir = join(import.meta.dirname, 'golden', label);
mkdirSync(dir, { recursive: true });
for (const { name, page } of surfaces()) writeFileSync(join(dir, `${name}.html`), page.html);
process.stdout.write(`wrote ${surfaces().length} surfaces to ${dir}\n`);
