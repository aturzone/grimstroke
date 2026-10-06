/**
 * How a picture is mounted.
 *
 * In the reference material no screenshot is ever just a screenshot: it is a
 * photo taped to a board, a polaroid with a caption written under it, a print
 * with a torn edge. The frame is what makes the picture an object on a surface
 * rather than a rectangle in a layout.
 *
 * THE FRAME IS A MOUNT, AND THE MOUNT IS NOT THE PICTURE. Everything here --
 * the tear, the rotation, the tape -- applies to a card the picture sits on,
 * never to the picture itself. A torn edge that clipped the screenshot would
 * quietly crop evidence, and cropping evidence to make it look nicer is the
 * single worst thing this library could do.
 *
 * Data, not markup. The renderer turns this into elements; keeping it as
 * numbers means a frame can be tested without a browser and read in a snapshot.
 */

import { tapeStrip, tornClipPath } from '~/draw/look/paper.ts';
import { Rng } from '~/draw/look/rng.ts';

import type { FrameKind } from '~/draw/look/vocab.ts';

export { FRAMES, type FrameKind } from '~/draw/look/vocab.ts';

/**
 * Tape on a mount.
 *
 * The strip itself is a fixed-size object -- masking tape is 60-odd pixels long whatever it is
 * stuck to -- so it is drawn in its own small SVG and only its CENTRE is a percentage of the
 * mount. Scaling the strip with the mount would stretch a 70px strip across a 900px
 * photograph, which is a banner, not tape.
 */
export interface PlacedTape {
  d: string;
  angle: number;
  /** Percent of the mount. */
  x: number;
  y: number;
}

export interface Frame {
  kind: FrameKind;
  /** Degrees. Applied to the whole mount, picture included. */
  rotation: number;
  /** Mount padding in px, as `top right bottom left`. */
  mat: [number, number, number, number];
  /** A `polygon()` for the mount, or '' when the mount is a rectangle. */
  clipPath: string;
  tapes: PlacedTape[];
  /** Percent of the mount. */
  pins: Array<{ x: number; y: number }>;
  /** The caption is written on the mount, under the picture, rather than above it. */
  captionInside: boolean;
  /** The mount is its own sheet of paper, not the page's. */
  paper: boolean;
}

export interface FrameOptions {
  /**
   * Cap on the random tilt, in degrees. Zero pins it straight.
   *
   * A page where every picture is tilted is harder to read than one where none
   * are, so this is small by default and the caller can switch it off.
   */
  tilt?: number;
}

const STRAIGHT = { rotation: 0, clipPath: '', tapes: [], pins: [] };

export function frame(kind: FrameKind, seed: string, options: FrameOptions = {}): Frame {
  const rng = new Rng(`${seed}:frame:${kind}`);
  const tilt = options.tilt ?? 2.6;
  /**
   * Sign, then magnitude -- deliberately not gauss().
   *
   * gauss() is the mean of four draws, so it clusters hard around zero: a cap
   * of 2.6 degrees produced leans of 0.09, -0.15 and -0.52, which is to say
   * photographs that looked accidentally crooked rather than deliberately
   * placed. A tilt wants to be unmistakable or absent.
   */
  const lean = (): number =>
    Number(((rng.next() < 0.5 ? -1 : 1) * rng.between(0.5, 1) * tilt).toFixed(2));

  switch (kind) {
    case 'none':
      return { kind, ...STRAIGHT, mat: [0, 0, 0, 0], captionInside: false, paper: false };

    case 'keyline':
      return { kind, ...STRAIGHT, mat: [0, 0, 0, 0], captionInside: false, paper: false };

    case 'polaroid':
      // The bottom mat is four times the sides. That ratio is the entire reason
      // a polaroid reads as a polaroid; an even border reads as a passe-partout.
      return {
        kind,
        rotation: lean(),
        mat: [14, 14, 54, 14],
        clipPath: '',
        tapes: [],
        pins: [],
        captionInside: true,
        paper: true,
      };

    case 'taped': {
      // Opposite corners, not adjacent: two strips along one edge look like a
      // hinge, and the picture stops reading as something stuck down flat.
      // A 100x100 box, so the centre comes back as a percentage directly.
      const strips: PlacedTape[] = ([0, 2] as const).map((corner) => {
        const strip = tapeStrip(100, 100, corner, seed);
        return { d: strip.d, angle: strip.angle, x: strip.cx, y: strip.cy };
      });
      return {
        kind,
        rotation: lean(),
        mat: [12, 12, 12, 12],
        clipPath: '',
        tapes: strips,
        pins: [],
        captionInside: false,
        paper: true,
      };
    }

    case 'torn':
      return {
        kind,
        rotation: lean(),
        mat: [16, 16, 16, 16],
        // Generated against a nominal card and expressed in percentages, so one
        // tear stretches to any picture without being regenerated per size.
        // Generated against a nominal card and expressed in percentages. The
        // amplitude has to be a sizeable fraction of that nominal box: at 6 on
        // 600x420 the tear was one per cent of the edge, which on a real card
        // is a rectangle with three faint dents in it.
        clipPath: tornClipPath(600, 420, `${seed}:mount`, {
          amplitude: 15,
          step: 30,
          nicks: 3,
        }),
        tapes: [],
        pins: [],
        captionInside: false,
        paper: true,
      };

    case 'pinned':
      return {
        kind,
        rotation: lean(),
        mat: [20, 12, 12, 12],
        clipPath: '',
        tapes: [],
        pins: [{ x: Number(rng.between(42, 58).toFixed(1)), y: 0 }],
        captionInside: false,
        paper: true,
      };
  }
}
