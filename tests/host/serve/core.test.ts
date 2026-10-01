/**
 * The core on its own, with no face: every answer in data, and its one page, the / board, in a
 * frame of its own. Nothing a face draws may be needed for any of it.
 */

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type Serving, serve } from '~/host/serve/server.ts';

let running: Serving;
let base: string;

const ask = (path: string, init?: RequestInit): Promise<Response> =>
  fetch(`${base}${path}`, {
    redirect: 'manual',
    ...init,
    headers: {
      'x-grimstroke-token': running.token,
      'content-type': 'application/json',
      ...((init?.headers as Record<string, string>) ?? {}),
    },
  });

beforeAll(async () => {
  running = await serve({ dir: mkdtempSync(join(tmpdir(), 'grimstroke-core-')), port: 0 });
  base = `http://127.0.0.1:${running.port}`;
});

afterAll(async () => {
  await running.close();
});

describe('the core with no face', () => {
  it('opens on the / board, in a page of its own', async () => {
    const home = await ask('/');
    expect(home.status).toBe(302);
    expect(home.headers.get('location')).toBe('/slash');
    const page = await (await ask('/slash')).text();
    expect(page).toContain('data-gs="slash"');
    expect(page).toContain('/box.js');
    expect(page).not.toContain('/app.js');
    expect(page).toContain('name="viewport"');
  });

  it('answers a change in data, with nothing drawn', async () => {
    const reply = (await (
      await ask('/api/patch', {
        method: 'POST',
        body: JSON.stringify({
          board: 'workspace',
          ops: [{ op: 'add', item: { id: 'n1', at: [0, 0], block: { kind: 'note', text: 'hi' } } }],
        }),
      })
    ).json()) as { changed: Array<{ id: string; html?: string }> };
    expect(reply.changed).toEqual([{ id: 'n1' }]);
  });

  it('keeps what the box makes, and gives it back as data', async () => {
    await ask('/api/slash/add', {
      method: 'POST',
      body: JSON.stringify({ block: { kind: 'shape', intent: 'timer', text: '25 min focus' } }),
    });
    const { cards } = (await (await ask('/api/slash')).json()) as {
      cards: Array<{ block: { intent: string }; summary: string }>;
    };
    expect(cards.map((c) => c.block.intent)).toContain('timer');
  });

  it("has none of the face's pages", async () => {
    expect((await ask('/today')).status).toBe(404);
    expect((await ask('/shelf')).status).toBe(404);
  });
});
