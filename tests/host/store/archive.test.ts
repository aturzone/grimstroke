import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { board } from '~/draw/doc/board/build.ts';
import type { BookSpec } from '~/draw/doc/book/model.ts';
import { ArchiveError, pack, readArchive, unpack } from '~/host/store/archive.ts';
import { Store } from '~/host/store/store.ts';

function freshStore(): Store {
  return new Store({ dir: mkdtempSync(join(tmpdir(), 'grimstroke-archive-')) });
}

/** A tiny but real PNG, so the asset that round trips is bytes and not a placeholder. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

async function populate(store: Store): Promise<{ asset: string }> {
  const asset = await store.putAsset(PNG, '.png');
  const spec = board('workspace', { palette: 'studio' })
    .note('stuck', { at: [10, 20], size: [260, 180] }, { title: 'measured' })
    .image(store.assetPath(asset), { at: [400, 40], size: [480] }, { caption: 'shot' }).spec;
  await store.writeBoard(spec);
  const notebook: BookSpec = {
    id: 'notebook',
    title: 'Field notes',
    leaves: [{ id: 'leaf-1', blocks: [] }],
  };
  await store.writeBook(notebook);
  await store.writeSettings({ last: 'workspace' });
  return { asset };
}

describe('the workspace archive', () => {
  it('carries a whole store into one file and back out again', async () => {
    const from = freshStore();
    const { asset } = await populate(from);

    const archive = await pack(from);
    const file = join(from.dir, 'backup.grimstroke');
    writeFileSync(file, JSON.stringify(archive));

    // A different store, as if this were a different machine.
    const to = freshStore();
    const restored = await unpack(to, readArchive(JSON.parse(readFileSync(file, 'utf8'))));

    expect(restored.boards).toEqual(['workspace']);
    expect(restored.books).toEqual(['notebook']);
    expect(restored.assets).toBe(1);
    expect((await to.readSettings()).last).toBe('workspace');

    const there = await to.readBoard('workspace');
    const here = await from.readBoard('workspace');
    expect(there?.items.length).toBe(here?.items.length);
    // The picture points into the NEW store, and its bytes are the same picture.
    const src = there?.items.find((item) => item.block?.kind === 'image');
    expect(src).toBeDefined();
    const path = (src?.block as { image: { src: string } } | undefined)?.image.src ?? '';
    expect(path.startsWith(to.assetsDir)).toBe(true);
    expect(path.startsWith(from.assetsDir)).toBe(false);
    expect(readFileSync(path)).toEqual(PNG);
    expect(readFileSync(path)).toEqual(readFileSync(from.assetPath(asset)));
  });

  it('leaves out pictures nothing points at any more', async () => {
    // A content-addressed store keeps bytes for as long as they exist, which is right for a
    // store and wrong for a backup: every screenshot ever dropped and deleted would ride
    // along forever, and the file would only ever get slower to write.
    const store = freshStore();
    await populate(store);
    await store.putAsset(Buffer.concat([PNG, Buffer.from([0])]), '.png');
    const archive = await pack(store);
    expect(Object.keys(archive.assets).length).toBe(1);
  });

  it('refuses a file it does not fully understand', async () => {
    expect(() => readArchive({ format: 'something-else' })).toThrow(ArchiveError);
    expect(() => readArchive(null)).toThrow(ArchiveError);
    // Restoring is the one thing here that can lose work, so a file from a newer version is
    // refused outright rather than half imported.
    expect(() => readArchive({ format: 'grimstroke', version: 99, boards: [], books: [] })).toThrow(
      /newer grimstroke/,
    );
  });

  it('round-trips everything this session added, losslessly', async () => {
    // A feature is not finished until its data is in the backup and comes back out exactly.
    const from = freshStore();
    const asset = await from.putAsset(PNG, '.png');
    const person = {
      id: 'rio',
      name: 'Rio',
      role: 'design lead',
      bio: 'Owns the palette.',
      details: [{ label: 'team', value: 'platform' }],
      style: 'pixel' as const,
      parts: { shape: 'heart', hair: 'afro', outfit: 'hoodie', headwear: 'beret' },
      palette: { cloth: '#c0392f' },
      sizes: { head: 1.2 },
    };
    await from.writeFace(person);
    const spec = board('workspace')
      .place({ kind: 'profile', character: person }, { at: [0, 0], size: [280], rotation: -4 })
      .note('- [x] done\n- [ ] not yet', { at: [300, 0], size: [240, 170], group: 'g1' })
      .image(from.assetPath(asset), { at: [600, 0], size: [320], group: 'g1', locked: true }).spec;
    await from.writeBoard(spec);
    await from.writeBook({
      id: 'crew',
      title: 'Crew',
      archived: true,
      cover: {
        material: 'kraft',
        colour: '#e0a21a',
        ink: '#14110e',
        profile: person,
        stickers: [
          { id: 's1', kind: 'shape', shape: 'star', at: [30, 40], width: 20, rotation: 12 },
          { id: 's2', kind: 'picture', src: from.assetPath(asset), at: [60, 60] },
          { id: 's3', kind: 'face', character: person, at: [70, 20], width: 24 },
        ],
      },
      leaves: [{ id: 'l1', blocks: [{ kind: 'profile', character: person }] }],
    });

    const to = freshStore();
    await unpack(to, readArchive(JSON.parse(JSON.stringify(await pack(from)))));

    expect(await to.readFace('rio')).toEqual(person);
    const board2 = await to.readBoard('workspace');
    expect(board2?.items.map(({ block, ink, ...rest }) => rest)).toEqual(
      spec.items.map(({ block, ink, ...rest }) => rest),
    );
    expect(board2?.items[0]?.block).toEqual(spec.items[0]?.block);
    const book = await to.readBook('crew');
    expect(book?.archived).toBe(true);
    expect(book?.cover?.profile).toEqual(person);
    expect(book?.cover?.stickers?.map((s) => s.kind)).toEqual(['shape', 'picture', 'face']);
    // The picture sticker points into the new store, and the bytes came with it.
    const src = book?.cover?.stickers?.[1]?.src ?? '';
    expect(src.startsWith(to.assetsDir)).toBe(true);
    expect(readFileSync(src)).toEqual(PNG);
  });
});
