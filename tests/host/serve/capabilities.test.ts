/**
 * The capabilities answer lists what the server answers: no route missing from it, and no
 * route in it the server does not have.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { capabilities, ENDPOINTS } from '~/host/serve/capabilities.ts';

const SERVE = join(import.meta.dirname, '../../../src/host/serve');

function routes(): Set<string> {
  const found = new Set<string>();
  for (const file of readdirSync(SERVE).filter((f) => f.endsWith('.ts'))) {
    const text = readFileSync(join(SERVE, file), 'utf8');
    for (const m of text.matchAll(/path === '(\/api\/[a-z/_-]+)'/g)) found.add(m[1] as string);
    // The bookcase's objects share one handler, named in a list.
    const shelf = text.match(/\['style', 'decor', 'remove', 'decal'\]/);
    if (shelf) for (const w of ['style', 'decor', 'remove', 'decal']) found.add(`/api/shelf/${w}`);
  }
  return found;
}

function listed(): Set<string> {
  const paths = new Set<string>();
  for (const group of Object.values(ENDPOINTS)) {
    for (const key of Object.keys(group)) paths.add((key.split(' ')[1] ?? '').split('?')[0] ?? '');
  }
  return paths;
}

describe('GET /api/capabilities', () => {
  it('lists every route the server answers', () => {
    const missing = [...routes()].filter((r) => !listed().has(r));
    expect(missing).toEqual([]);
  });

  it('lists no route the server does not answer', () => {
    const answered = routes();
    const extra = [...listed()].filter((r) => !answered.has(r));
    expect(extra).toEqual([]);
  });

  it('offers the vocabularies an agent chooses from', () => {
    const c = capabilities() as { vocabulary: Record<string, unknown> };
    const v = c.vocabulary as {
      bookcase: { woods: string[]; objects: unknown[] };
      pet: { coats: unknown[] };
      templates: string[];
    };
    expect(v.bookcase.woods).toContain('walnut');
    expect(v.bookcase.objects.length).toBeGreaterThan(10);
    expect(v.pet.coats.length).toBe(13);
    expect(v.templates).toContain('kanban');
  });
});
