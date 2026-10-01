/**
 * The core's own page script: the / box, and the / board it keeps what it makes on. It is what
 * a core served with no face runs (dist/box.js); a face's app carries the same box itself.
 */

import { bindFeel } from '~/app/feel.ts';
import { bootSlash } from '~/app/slash.ts';

bindFeel();
bootSlash();
