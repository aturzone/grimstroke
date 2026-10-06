import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { BookSpec } from '@core/docs/book.ts';
import { Store, TRASH_DAYS } from '@core/store/store.ts';
import { describe, expect, it } from 'vitest';

function fresh(): Store {
  return new Store({ dir: mkdtempSync(join(tmpdir(), 'grimstroke-trash-')) });
}

function book(id: string, title: string): BookSpec {
  return { id, title, leaves: [{ id: 'l1', items: [] }] };
}

describe('the trash', () => {
  it('moves a notebook out of the shelf and brings it back whole', async () => {
    const store = fresh();
    await store.writeBook(book('audit', 'The audit'));
    const name = await store.trashBook('audit');
    expect(name).toMatch(/^audit--.*\.json$/);
    expect(await store.listBooks()).toEqual([]);
    const listed = await store.listTrash();
    expect(listed.map((e) => [e.id, e.title])).toEqual([['audit', 'The audit']]);
    expect(await store.untrash('audit')).toBe('audit');
    expect((await store.readBook('audit'))?.title).toBe('The audit');
    expect(await store.listTrash()).toEqual([]);
  });

  it('gives a restored notebook a new id when its old one has been taken', async () => {
    const store = fresh();
    await store.writeBook(book('notes', 'first'));
    const name = await store.trashBook('notes');
    await store.writeBook(book('notes', 'second'));
    expect(await store.untrash(name ?? '')).toBe('notes-2');
    expect((await store.readBook('notes'))?.title).toBe('second');
    expect((await store.readBook('notes-2'))?.title).toBe('first');
  });

  it('forgets what has been in it longer than the grace period', async () => {
    const store = fresh();
    await store.writeBook(book('old', 'old'));
    const then = new Date('2026-01-01T00:00:00Z');
    await store.trashBook('old', then);
    const later = new Date(then.getTime() + (TRASH_DAYS + 1) * 86_400_000);
    expect(await store.listTrash(later)).toEqual([]);
  });

  it('answers undefined for a notebook that is not there', async () => {
    const store = fresh();
    expect(await store.trashBook('nothing')).toBeUndefined();
    expect(await store.untrash('nothing')).toBeUndefined();
  });
});
