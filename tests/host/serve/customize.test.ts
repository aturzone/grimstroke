/**
 * Everything a person can make their own, an agent can too -- and it shows.
 *
 * Each setting is changed over plain HTTP, the way an agent would, and then the page a person
 * would open is fetched and checked for it. A setting the API accepts but no surface draws is
 * a setting that does not exist; this is the test that says so.
 */

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type Serving, serve } from '~/host/serve/server.ts';

let running: Serving;
let base: string;

const ask = (path: string, body?: unknown): Promise<Response> =>
  fetch(`${base}${path}`, {
    ...(body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) }),
    headers: { 'x-grimstroke-token': running.token, 'content-type': 'application/json' },
  });
const page = async (path: string): Promise<string> => (await ask(path)).text();
const json = async <T>(path: string, body?: unknown): Promise<T> =>
  (await ask(path, body)).json() as Promise<T>;

let book = '';

beforeAll(async () => {
  running = await serve({ dir: mkdtempSync(join(tmpdir(), 'grimstroke-custom-')), port: 0 });
  base = `http://127.0.0.1:${running.port}`;
  book = (await json<{ id: string }>('/api/books', { title: 'Made my own' })).id;
});

afterAll(async () => {
  await running.close();
});

describe('the workspace look', () => {
  it('rounds every corner everywhere, and a notebook can keep its own', async () => {
    expect((await json<{ look: { corners: number } }>('/api/look')).look.corners).toBe(1);
    await json('/api/look', { corners: 2.5 });
    for (const path of [
      '/',
      '/shelf',
      `/book?id=${book}`,
      `/page?book=${book}&leaf=1`,
      '/profile',
      `/print?book=${book}`,
    ]) {
      expect(await page(path), path).toContain('--gs-round:2.5');
    }
    // Out of range is held to the range.
    expect(
      (await json<{ look: { corners: number } }>('/api/look', { corners: 9 })).look.corners,
    ).toBe(3);
    await json('/api/patch', {
      kind: 'book',
      id: book,
      ops: [{ op: 'book', patch: { corners: 0 } }],
    });
    expect(await page(`/book?id=${book}`)).toContain('--round:0;');
    expect(await page(`/page?book=${book}&leaf=1`)).toContain('--round:0;');
    await json('/api/patch', {
      board: 'workspace',
      ops: [{ op: 'board', patch: { corners: 1.8 } }],
    });
    expect(await page('/')).toContain('--round:1.8;');
    await json('/api/look', { corners: 1 });
    expect(await page('/shelf')).not.toContain('gs-look');
  });
});

describe('each setting shows', () => {
  it('a board: palette and paper', async () => {
    await json('/api/patch', {
      board: 'workspace',
      ops: [{ op: 'board', patch: { palette: 'riso-pink', paper: 'dotted' } }],
    });
    const html = await page('/');
    expect(html).toContain('data-gs-palette="riso-pink"');
    expect(html).toMatch(/radial-gradient|--paper-rule/);
  });

  it('a notebook: page size, template, cover colour', async () => {
    await json('/api/patch', {
      kind: 'book',
      id: book,
      ops: [
        { op: 'book', patch: { pageSize: 'a4', template: 'cornell' } },
        { op: 'cover', patch: { colour: '#1f6f5c' } },
      ],
    });
    const html = await page(`/book?id=${book}`);
    expect(html).toContain('--leaf-width:640px');
    expect(html).toContain('page-template-cornell');
    expect(await page('/shelf')).toContain('#1f6f5c');
  });

  it('the bookcase: wood, back, an object and a sticker', async () => {
    await json('/api/shelf/style', { wood: 'walnut', back: 'stars' });
    await json('/api/shelf/decor', { decor: 'plant', row: 0, x: 400 });
    await json('/api/shelf/decal', { mark: 'star', x: 50, y: 50 });
    const html = await page('/shelf');
    expect(html).toContain('data-wood="walnut"');
    expect(html).toContain('data-back="stars"');
    expect(html).toContain('decor:plant');
    expect(html).toContain('case-decal');
  });

  it('the pet and the profile', async () => {
    await json('/api/pet', { species: 'dog', coat: 'husky', name: 'Rex' });
    const shelf = await page('/shelf');
    expect(shelf).toContain('husky');
    await json('/api/profile', { patch: { name: 'Ada', accent: '#1f3fd0' } });
    const profile = await page('/profile');
    expect(profile).toContain('Ada');
    expect(profile).toContain('#1f3fd0');
  });

  it('a card typed into the bar, placed by an agent', async () => {
    const placed = await json<{ id: string; card: string }>('/api/shape/place', {
      board: 'workspace',
      text: 'split 2400 between 3',
    });
    expect(placed.card).toBe('split');
    const html = await page('/');
    expect(html).toContain('sc-is-split');
    expect(html).toContain('800');
  });

  it('every customisation is listed for an agent', async () => {
    const c = await json<{
      endpoints: Record<string, Record<string, string>>;
      vocabulary: Record<string, unknown>;
    }>('/api/capabilities');
    const all = Object.values(c.endpoints).flatMap((g) => Object.keys(g));
    for (const route of [
      'POST /api/look',
      'POST /api/pet',
      'POST /api/shelf/style',
      'POST /api/profile',
      'POST /api/shape/place',
    ]) {
      expect(all, route).toContain(route);
    }
    expect(c.vocabulary.corners).toMatchObject({ min: 0, max: 3, designed: 1 });
  });
});
