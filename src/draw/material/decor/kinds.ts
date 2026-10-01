/**
 * The objects a bookcase can hold, by name and size: what there is to choose from, as data.
 * How each one is drawn is the face's (decor/art.ts).
 */

export interface DecorKind {
  id: string;
  label: string;
  /** Size on the grid, in pixels; drawn at 2x on the bookcase. */
  w: number;
  h: number;
  frames: number;
}

export const DECOR: readonly DecorKind[] = [
  { id: 'plant', label: 'potted plant', w: 22, h: 30, frames: 1 },
  { id: 'cactus', label: 'cactus', w: 14, h: 24, frames: 1 },
  { id: 'lamp', label: 'reading lamp', w: 22, h: 34, frames: 2 },
  { id: 'globe', label: 'globe', w: 22, h: 30, frames: 1 },
  { id: 'clock', label: 'clock', w: 20, h: 24, frames: 2 },
  { id: 'candle', label: 'candle', w: 10, h: 20, frames: 2 },
  { id: 'hourglass', label: 'hourglass', w: 14, h: 22, frames: 1 },
  { id: 'trophy', label: 'trophy', w: 18, h: 24, frames: 1 },
  { id: 'frame', label: 'photo frame', w: 20, h: 24, frames: 1 },
  { id: 'mug', label: 'mug', w: 14, h: 14, frames: 2 },
  { id: 'vase', label: 'vase of flowers', w: 18, h: 30, frames: 1 },
  { id: 'duck', label: 'rubber duck', w: 16, h: 14, frames: 1 },
  { id: 'robot', label: 'little robot', w: 16, h: 22, frames: 2 },
  { id: 'crystal', label: 'crystal', w: 14, h: 18, frames: 1 },
  { id: 'snowglobe', label: 'snow globe', w: 18, h: 20, frames: 2 },
  { id: 'bookend', label: 'bookend', w: 10, h: 26, frames: 1 },
  { id: 'camera', label: 'camera', w: 20, h: 14, frames: 1 },
  { id: 'teapot', label: 'teapot', w: 22, h: 18, frames: 1 },
];

export function decorOf(id: string | undefined): DecorKind | undefined {
  return DECOR.find((d) => d.id === id);
}
