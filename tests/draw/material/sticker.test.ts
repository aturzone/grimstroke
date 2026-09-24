import { describe, expect, it } from 'vitest';
import { surface } from '~/draw/doc/surface.ts';
import { renderBlock } from '~/draw/material/block.ts';
import { MARKS } from '~/draw/material/sticker/marks.ts';
import { renderStickerFace, withShortcodes } from '~/draw/material/sticker/render.ts';

describe('stickers', () => {
  it('draws every mark on the sheet', () => {
    for (const name of Object.keys(MARKS)) {
      const html = renderStickerFace({ mark: name });
      expect(html, name).toContain('class="dcut');
      expect(html, name).not.toContain('undefined');
    }
  });

  it('carries the services the git connection will name', () => {
    for (const name of ['github', 'gitlab', 'gitea', 'forgejo']) {
      expect(renderStickerFace({ mark: name })).toMatch(/<path d="[Mm]/);
    }
  });

  it('is a block on a board or a page', () => {
    const html = renderBlock({ kind: 'sticker', mark: 'done' }, surface('s'));
    expect(html).toContain('sticker-block');
    expect(html).toContain('DONE');
  });

  it('writes known shortcodes as small stickers and leaves every other colon alone', () => {
    const html = withShortcodes('shipped :rocket: at 10:30:45, :nope:');
    expect(html).toContain('emoji-sticker');
    expect(html).toContain('10:30:45');
    expect(html).toContain(':nope:');
  });
});
