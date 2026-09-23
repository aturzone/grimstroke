/**
 * Pictures and backups arriving: the file picker, a drop anywhere, and the clipboard.
 */

import type { BoardContext } from '~/app/board/context.ts';
import type { Point } from '~/app/board/view.ts';
import { topZ } from '~/draw/doc/board/patch.ts';

export class Files {
  private readonly ctx: BoardContext;
  private readonly fail: (message: string) => void;

  constructor(ctx: BoardContext, fail: (message: string) => void) {
    this.ctx = ctx;
    this.fail = fail;
  }

  bind(): void {
    const input = document.querySelector<HTMLInputElement>('[data-gs="file"]');
    input?.addEventListener('change', () => {
      for (const file of Array.from(input.files ?? [])) void this.take(file, undefined);
      input.value = '';
    });

    let depth = 0;
    window.addEventListener('dragover', (event) => event.preventDefault());
    window.addEventListener('dragenter', (event) => {
      event.preventDefault();
      depth += 1;
      document.body.dataset.dropping = '1';
    });
    window.addEventListener('dragleave', () => {
      depth -= 1;
      if (depth <= 0) delete document.body.dataset.dropping;
    });
    window.addEventListener('drop', (event) => {
      event.preventDefault();
      depth = 0;
      delete document.body.dataset.dropping;
      const at = this.ctx.view.toBoard({ x: event.clientX, y: event.clientY });
      for (const file of Array.from(event.dataTransfer?.files ?? [])) void this.take(file, at);
    });

    // A screenshot on the clipboard is the single most common way a picture
    // arrives here, and asking someone to save it to disk first is asking them
    // to use a different tool.
    window.addEventListener('paste', (event) => {
      for (const file of Array.from(event.clipboardData?.files ?? []))
        void this.take(file, undefined);
    });
  }

  /** One file, arriving from the picker, a drop or the clipboard. */
  async take(file: File, at: Point | undefined): Promise<void> {
    /*
     * A backup dropped onto the board is a restore.
     *
     * There is no import screen and no menu: the file came out of the same board, and the
     * gesture that put a screenshot here is the gesture that puts a whole workspace back.
     * The page reloads afterwards because every board in it may have just been replaced.
     */
    if (file.name.endsWith('.grimstroke') || file.type === 'application/grimstroke') {
      const text = await file.text();
      const res = await fetch('/api/archive', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: text,
      });
      const reply = (await res.json()) as { boards?: string[]; error?: string };
      if (!res.ok) {
        this.fail(`That file could not be read: ${reply.error ?? res.status}`);
        return;
      }
      window.location.reload();
      return;
    }
    if (!file.type.startsWith('image/')) return;
    const box = this.ctx.viewport.getBoundingClientRect();
    const where =
      at ?? this.ctx.view.toBoard({ x: box.left + box.width / 2, y: box.top + box.height / 2 });
    const res = await fetch(`/api/assets?name=${encodeURIComponent(file.name)}`, {
      method: 'POST',
      headers: { 'content-type': file.type },
      body: file,
    });
    if (!res.ok) return;
    const { path } = (await res.json()) as { path: string };
    const source = await measureImage(file);

    /*
     * A picture arrives MOUNTED, never bare.
     *
     * A screenshot pasted onto a board as a plain rectangle is a rectangle in a layout; the
     * frame is what makes it an object lying on a surface, which is the whole look. Which
     * mount depends on the shape: a wide screenshot is taped down flat, the way one is
     * stuck to a wall, and anything squarer or upright gets a polaroid, whose deep bottom
     * mat reads as a photograph rather than a window.
     */
    const wide = source ? source.width / source.height > 1.3 : true;
    const frame = wide ? 'taped' : 'polaroid';
    // Big enough to read the interface in a screenshot, small enough that pasting one does
    // not bury the board. A picture smaller than that is placed at its own size rather than
    // blown up, because upscaling a screenshot destroys the thing it was taken to show.
    const width = Math.round(Math.min(source?.width ?? 480, 640));

    this.ctx.session.run(
      [
        {
          op: 'add',
          item: {
            id: this.ctx.nextId('photo'),
            at: [Math.round(where.x), Math.round(where.y)],
            size: [width],
            z: topZ(this.ctx.session.spec) + 1,
            block: {
              kind: 'image',
              image: {
                src: path,
                frame,
                // Carried so marks can be placed on it by percentage without the renderer
                // having to open the file to find out how big it is.
                ...(source ? { width: source.width, height: source.height } : {}),
              },
            },
          },
        },
      ],
      'add picture',
    );
  }
}

/**
 * How big the picture actually is.
 *
 * Read in the browser from the file itself, before it is anywhere near the board: the mount
 * and the placed width both depend on the shape, and a default guessed at the moment of
 * pasting is a default that is wrong for every screenshot that is not that shape.
 */
async function measureImage(file: File): Promise<{ width: number; height: number } | undefined> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((done, fail) => {
      img.addEventListener('load', () => done(), { once: true });
      img.addEventListener('error', () => fail(new Error('undecodable')), { once: true });
      img.src = url;
    });
    return { width: img.naturalWidth, height: img.naturalHeight };
  } catch {
    // An image the browser cannot decode is still worth placing: the server may know how.
    return undefined;
  } finally {
    URL.revokeObjectURL(url);
  }
}
