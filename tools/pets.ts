/**
 * Every pet frame in every coat, as colours: `node --import ./tools/register.mjs tools/pets.ts`.
 *
 * Prints JSON -- { coat: { pose: [frame rows of hex or null] } } -- for a contact sheet to be
 * rendered from and looked at. Looking is how pixel art is checked; tests only say it is on the
 * grid and in colours that exist.
 */

import { COATS, colourOf, PET_FRAMES, POSES, petFrame } from '~/draw/material/pet/art.ts';

const out: Record<string, Record<string, Array<Array<Array<string | null>>>>> = {};
for (const coat of COATS) {
  const poses: Record<string, Array<Array<Array<string | null>>>> = {};
  for (const pose of POSES) {
    poses[pose] = Array.from({ length: PET_FRAMES[pose].count }, (_, n) =>
      petFrame(coat.species, coat, pose, n).map((row) =>
        row.map((k) => (k === '.' ? null : (colourOf(coat, k) ?? '#ff00ff'))),
      ),
    );
  }
  out[coat.id] = poses;
}
process.stdout.write(JSON.stringify(out));
