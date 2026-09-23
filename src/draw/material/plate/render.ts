/**
 * The picture, and what is drawn on it.
 *
 * A plate is a screenshot shown at its own proportions, with hard marks (boxes, callouts,
 * censor bars) positioned in percentages of it, hand marks (circles, arrows, underlines,
 * highlighter) drawn in its own pixel space, an optional magnified inset, and the card it may
 * be mounted on. The guarantee that comes with all of it: the picture is never altered by the
 * thing it is mounted in.
 *
 * Pure. Nothing here opens a browser or touches the network.
 */

import type { Surface } from '~/draw/doc/surface.ts';
import { servedPath } from '~/draw/doc/surface.ts';
import { frame } from '~/draw/look/frame.ts';
import { handArrow, handEllipse, handSwipe, handUnderline } from '~/draw/look/hand.ts';
import type { ImageSource, Mark, MarkKind, Side, ZoomSpec } from '~/draw/material/model.ts';
import { resolve, toStyle } from '~/draw/material/plate/coords.ts';
import { imageSize } from '~/draw/material/plate/probe.ts';
import { isRedacted } from '~/draw/material/plate/redact.ts';
import { AUTO } from '~/draw/material/words.ts';
import { escapeHtml, inline, label } from '~/draw/type/text.ts';

export function renderCompare(images: ImageSource[], sync: boolean, ctx: Surface): string {
  const shared = sync ? (images[0]?.marks ?? []) : [];
  const cells = images
    .map((image, index) =>
      plate(
        sync && index > 0 && !image.marks?.length ? { ...image, marks: shared } : image,
        ctx,
        undefined,
      ),
    )
    .join('');
  // Plates are listed in logical order -- the reference first -- and laid in
  // document order, so in a right-to-left page the first lands on the right,
  // which is where that reader expects it.
  return `<figure class="block"><div class="plates">${cells}</div></figure>`;
}

/** Source-pixel size, from the caller if given, else from the file header. */
function sizeOf(image: ImageSource, ctx: Surface): { width: number; height: number } | undefined {
  if (image.width && image.height) return { width: image.width, height: image.height };
  try {
    return imageSize(image.src);
  } catch (error) {
    ctx.warnings.push(
      `could not read ${image.src}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return undefined;
  }
}

const HARD = new Set<MarkKind>(['box', 'redact', 'callout']);

export function plate(image: ImageSource, ctx: Surface, zoom: ZoomSpec | undefined): string {
  ctx.seq += 1;
  const served = servedPath(image.src, ctx);
  const size = sizeOf(image, ctx);
  const seed = `${ctx.id}:plate:${ctx.seq}`;

  const hard: string[] = [];
  const hand: string[] = [];
  const notes: string[] = [];
  /**
   * Numbering, when some marks are numbered by the caller and some are not.
   *
   * The implicit counter used to count notes, so a page with an explicit
   * badge '1' and one unbadged note produced two callouts both labelled 1 --
   * pointing at different things. A number on a page like this is a reference,
   * and two of them meaning different things is worse than none.
   */
  const claimed = new Set(
    (image.marks ?? []).map((m) => m.badge).filter((b): b is string => b !== undefined),
  );
  let counter = 0;
  const nextTag = (): string => {
    do {
      counter += 1;
    } while (claimed.has(String(counter)));
    claimed.add(String(counter));
    return String(counter);
  };
  for (const mark of image.marks ?? []) {
    try {
      const kind = mark.kind ?? 'box';
      if (HARD.has(kind)) {
        hard.push(renderMark(mark, size, image.dpr, ctx));
      } else if (size) {
        hand.push(renderHand(mark, kind, size, image.dpr, seed, ctx));
      } else {
        // A hand mark is geometry, and geometry needs a coordinate space. The
        // hard marks survive without one because they are percentages of the
        // plate; a circle drawn in percentages of a box of unknown aspect is
        // an ellipse of unknown shape.
        ctx.warnings.push(
          `${image.src}: a ${kind} mark needs the image size. Give width and height ` +
            'on the image, or use a file whose header can be read.',
        );
      }
      if (mark.note) {
        const tag = mark.badge ?? nextTag();
        notes.push(
          `<div class="callout-note"${AUTO}><b>${escapeHtml(tag)}</b> ` +
            `${inline(mark.note, { digits: ctx.digits })}</div>`,
        );
      }
    } catch (error) {
      ctx.warnings.push(error instanceof Error ? error.message : String(error));
    }
  }

  // Drawing a bar over pixels that are still there is the failure nobody
  // notices until it is public.
  const covering = (image.marks ?? []).some((m) => m.kind === 'redact');
  if (covering && !image.src.startsWith('data:') && !isRedacted(image.src)) {
    ctx.warnings.push(
      `${image.src} has a censor bar drawn on it but the pixels underneath are ` +
        'still there. Run redactImage() first, or grimstroke redact.',
    );
  }

  const overlay = hand.length
    ? `<svg class="hand" viewBox="0 0 ${size?.width ?? 0} ${size?.height ?? 0}" ` +
      `aria-hidden="true">${hand.join('')}</svg>`
    : '';
  const picture =
    `<div class="plate"><img src="${escapeHtml(served)}" alt="">` +
    hard.join('') +
    overlay +
    '</div>';

  const caption = image.caption
    ? `<figcaption${AUTO}>${inline(image.caption, { digits: ctx.digits })}</figcaption>`
    : '';
  const zoomHtml = zoom && size ? renderZoom(zoom, served, size, image.dpr, ctx) : '';
  const kind = image.frame ?? 'keyline';
  const isMount = kind !== 'keyline' && kind !== 'none';
  const mounted = mount(image, picture, caption, seed);

  return (
    `<div class="cell${isMount ? ' mounted' : ''}">` +
    `${mounted}${zoomHtml}${notes.join('')}</div>`
  );
}

/**
 * The card the picture sits on.
 *
 * A keyline needs no card, and emitting one anyway would change the markup of
 * every page that already exists for no visible gain -- so the default path is
 * still a bare plate with a caption above it.
 */
function mount(image: ImageSource, picture: string, caption: string, seed: string): string {
  const kind = image.frame ?? 'keyline';
  if (kind === 'keyline') return caption + picture;
  if (kind === 'none') return caption + picture.replace('class="plate"', 'class="plate bare"');

  const fr = frame(kind, seed, image.tilt === undefined ? {} : { tilt: image.tilt });
  const style = [
    `--tilt:${fr.rotation}deg`,
    `--mat:${fr.mat.map((n) => `${n}px`).join(' ')}`,
    // The tear goes on a variable, not on clip-path. It is applied to a
    // backing element behind the picture, never to the box that contains it.
    fr.clipPath ? `--mount-torn:${fr.clipPath}` : '',
  ]
    .filter(Boolean)
    .join(';');

  const tapes = fr.tapes
    .map(
      (tape) =>
        `<svg class="tape" viewBox="-48 -48 96 96" width="96" height="96" aria-hidden="true" ` +
        `style="left:${tape.x}%;top:${tape.y}%">` +
        `<path class="tape-strip" d="${tape.d}" transform="rotate(${tape.angle})"/></svg>`,
    )
    .join('');
  const pins = fr.pins
    .map((pin) => `<div class="pin" style="left:${pin.x}%;top:${pin.y}%"></div>`)
    .join('');

  const inside = fr.captionInside ? caption : '';
  const above = fr.captionInside ? '' : caption;
  return `${above}<div class="mat mat-${kind}" style="${style}">${picture}${inside}${tapes}${pins}</div>`;
}

function renderMark(
  mark: Mark,
  size: { width: number; height: number } | undefined,
  dpr: number | undefined,
  ctx: Surface,
): string {
  const source = size ? { ...size, ...(dpr === undefined ? {} : { dpr }) } : undefined;
  const rect = resolve(mark.rect, source);
  const kind = mark.kind ?? 'box';
  const classes = ['mark', kind === 'callout' ? 'box' : kind];
  if (kind === 'redact' && mark.style) classes.push(mark.style);
  const inner =
    kind === 'redact'
      ? `<span>${label('redacted', ctx.uppercase)}</span>`
      : mark.badge
        ? `<span class="badge">${escapeHtml(mark.badge)}</span>`
        : '';
  const colour = mark.colour ? `;--accent:${escapeHtml(mark.colour)}` : '';
  return `<div class="${classes.join(' ')}" style="${toStyle(rect)}${colour}">${inner}</div>`;
}

/**
 * A mark made by a hand, in the picture's own pixel space.
 *
 * The overlay's viewBox is the source image, so the geometry here is authored
 * in source pixels and scales with the picture for free. Stroke width is the
 * exception: `vector-effect: non-scaling-stroke` keeps it a constant number of
 * displayed pixels, because a 3px stroke on a 3000px-wide screenshot shown at
 * 600px is a 0.6px stroke, which is to say invisible.
 */
function renderHand(
  mark: Mark,
  kind: MarkKind,
  size: { width: number; height: number },
  dpr: number | undefined,
  seed: string,
  ctx: Surface,
): string {
  const rect = resolve(mark.rect, { ...size, ...(dpr === undefined ? {} : { dpr }) });
  const x = (rect.x / 100) * size.width;
  const y = (rect.y / 100) * size.height;
  const w = (rect.w / 100) * size.width;
  const h = (rect.h / 100) * size.height;
  // Wobble is authored for a page-sized picture; on a 3000px screenshot the
  // same two pixels of wander do not exist.
  const scale = Math.max(0.4, size.width / 900);
  const at = `${seed}:${mark.rect}`;
  const stroke = mark.colour ? `style="--accent:${escapeHtml(mark.colour)}"` : '';

  switch (kind) {
    case 'circle': {
      const d = handEllipse(x + w / 2, y + h / 2, w * 0.62, h * 0.74, at, {
        wobble: 2.4 * scale,
      });
      return `<path class="ink" d="${d}" ${stroke}/>`;
    }
    case 'underline': {
      const d = handUnderline(x, y + h + 5 * scale, w, at, { wobble: 1.8 * scale });
      return `<path class="ink" d="${d}" ${stroke}/>`;
    }
    case 'highlight': {
      const d = handSwipe(x, y, w, h, at, {});
      return `<path class="wash" d="${d}" ${stroke}/>`;
    }
    case 'arrow': {
      const from = mark.from ?? roomiest(x, y, w, h, size, ctx);
      // Clamped to the room actually available on that side. An arrow whose
      // tail lands outside the picture is drawn on the page instead, over
      // whatever text happens to be there.
      const room = { top: y, bottom: size.height - (y + h), start: x, end: size.width - (x + w) }[
        from
      ];
      const reach = Math.max(
        28 * scale,
        Math.min(Math.max(w, h) * 1.5, size.width * 0.3, room * 0.82),
      );
      const gap = 10 * scale;
      const tip = {
        top: { x: x + w / 2, y: y - gap },
        bottom: { x: x + w / 2, y: y + h + gap },
        start: { x: x - gap, y: y + h / 2 },
        end: { x: x + w + gap, y: y + h / 2 },
      }[from];
      const tail = {
        top: { x: tip.x, y: tip.y - reach },
        bottom: { x: tip.x, y: tip.y + reach },
        start: { x: tip.x - reach, y: tip.y },
        end: { x: tip.x + reach, y: tip.y },
      }[from];
      const arrow = handArrow(tail, tip, at, { wobble: 2 * scale });
      return (
        `<path class="ink" d="${arrow.shaft}" ${stroke}/>` +
        `<path class="ink" d="${arrow.head[0]}" ${stroke}/>` +
        `<path class="ink" d="${arrow.head[1]}" ${stroke}/>`
      );
    }
    default:
      return '';
  }
}

/**
 * Which side an arrow has room to come from.
 *
 * `start` and `end` are resolved against the PAGE direction, not the image.
 * The rectangle never mirrors -- that rule is absolute -- but which side a
 * reader expects an annotation to fly in from does follow their reading order.
 */
function roomiest(
  x: number,
  y: number,
  w: number,
  h: number,
  size: { width: number; height: number },
  ctx: Surface,
): Side {
  const rtl = ctx.direction === 'rtl';
  const room: Array<[Side, number]> = [
    ['top', y],
    ['bottom', size.height - (y + h)],
    [rtl ? 'end' : 'start', x],
    [rtl ? 'start' : 'end', size.width - (x + w)],
  ];
  room.sort((a, b) => b[1] - a[1]);
  return (room[0] as [Side, number])[0];
}

function renderZoom(
  zoom: ZoomSpec,
  served: string,
  size: { width: number; height: number },
  dpr: number | undefined,
  ctx: Surface,
): string {
  let rect: ReturnType<typeof resolve>;
  try {
    rect = resolve(zoom.rect, { ...size, ...(dpr === undefined ? {} : { dpr }) });
  } catch (error) {
    ctx.warnings.push(error instanceof Error ? error.message : String(error));
    return '';
  }
  const regionW = (rect.w / 100) * size.width;
  const regionH = (rect.h / 100) * size.height;
  // The factor is honoured directly: the window is the region's own size times
  // the factor, capped so it cannot dominate the page.
  let factor = Math.max(1, zoom.factor ?? 3);
  const maxWidth = 320;
  if (regionW * factor > maxWidth) factor = maxWidth / regionW;
  const shownW = size.width * factor;
  const left = -((rect.x / 100) * size.width * factor);
  const top = -((rect.y / 100) * size.height * factor);
  return (
    `<div class="zoom" style="width:${(regionW * factor).toFixed(0)}px;` +
    `height:${(regionH * factor).toFixed(0)}px">` +
    `<img src="${escapeHtml(served)}" alt="" style="width:${shownW.toFixed(0)}px;` +
    `left:${left.toFixed(0)}px;top:${top.toFixed(0)}px"></div>`
  );
}
