/**
 * The workspace, end to end, without a browser.
 *
 * That is the point of the test as much as the convenience of it: an agent
 * talks to this server over plain HTTP and needs nothing else, so a test that
 * needed a browser would be testing a different product.
 */

import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type Serving, serve } from '~/host/serve/server.ts';
import { Store } from '~/host/store/store.ts';

let running: Serving;
let dir: string;
let base: string;

const ask = (path: string, init?: RequestInit): Promise<Response> =>
  fetch(`${base}${path}`, {
    ...init,
    headers: {
      'x-grimstroke-token': running.token,
      ...((init?.headers as Record<string, string>) ?? {}),
    },
  });

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'grimstroke-'));
  running = await serve({ dir, port: 0 });
  base = `http://127.0.0.1:${running.port}`;
});

afterAll(async () => {
  await running.close();
});

describe('the store', () => {
  it('keeps a name inside the directory it belongs to', () => {
    // Ids arrive over HTTP. `../../.ssh/id_ed25519` is a perfectly good string
    // as far as JSON is concerned, and this is the only place that turns one
    // into a path. The property that matters is where the file LANDS, not
    // whether two dots survive somewhere in the middle of its name -- a name
    // with no separator in it cannot traverse anywhere.
    const store = new Store({ dir });
    for (const hostile of ['../../etc/passwd', '....//x', 'a/b/c', '.ssh', '\\..\\..\\x']) {
      const path = store.boardPath(hostile);
      expect(dirname(path), hostile).toBe(store.boardsDir);
      expect(basename(path).startsWith('.'), hostile).toBe(false);
    }
    expect(() => store.boardPath('///')).toThrow(/not a usable name/);
  });

  it('stores an asset once, however many times it arrives', async () => {
    const store = new Store({ dir });
    const bytes = Buffer.from('the same picture');
    const first = await store.putAsset(bytes, '.png');
    const second = await store.putAsset(bytes, '.png');
    expect(first).toBe(second);
  });

  it('writes a board through a rename, so a crash cannot leave half a file', async () => {
    const store = new Store({ dir });
    await store.writeBoard({ id: 'atomic', items: [] });
    const raw = readFileSync(store.boardPath('atomic'), 'utf8');
    expect(JSON.parse(raw).id).toBe('atomic');
  });
});

describe('the server', () => {
  it('refuses a request with no token', async () => {
    // A board holds screenshots of whatever its owner was working on, and "it
    // is only on localhost" is not an access control policy on a shared box.
    const res = await fetch(`${base}/api/state`);
    expect(res.status).toBe(401);
  });

  it('refuses a token that is merely the right length', async () => {
    const res = await fetch(`${base}/api/state`, {
      headers: { 'x-grimstroke-token': 'x'.repeat(running.token.length) },
    });
    expect(res.status).toBe(401);
  });

  it('hands out an empty board with its extent already pinned', async () => {
    // The origin is subtracted from every item's position, so it has to be the
    // same number for the page and for every item rendered into it later.
    const res = await ask('/api/state?board=fresh');
    const { spec } = (await res.json()) as { spec: { extent?: number[]; items: unknown[] } };
    expect(spec.items).toEqual([]);
    expect(spec.extent).toHaveLength(4);
  });

  it('applies a patch, renders what changed, and saves it', async () => {
    const res = await ask('/api/patch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        board: 'work',
        ops: [
          {
            op: 'add',
            item: { id: 'n1', at: [40, 50], block: { kind: 'note', text: 'hello' } },
          },
        ],
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      version: number;
      changed: Array<{ id: string; html: string }>;
    };
    expect(body.version).toBe(1);
    expect(body.changed[0]?.id).toBe('n1');
    expect(body.changed[0]?.html).toContain('class="note"');
    expect(body.changed[0]?.html).toContain('data-gs-id="n1"');

    const stored = JSON.parse(readFileSync(join(dir, 'boards', 'work.json'), 'utf8'));
    expect(stored.items[0].id).toBe('n1');
  });

  it('renders an item against the same origin as the page it goes into', async () => {
    // The live board used to be padded after the extent was computed, so an
    // item rendered after an edit was placed against a different origin and
    // arrived nine hundred pixels off the screen.
    const page = await (await ask('/?board=work')).text();
    const origin = /data-gs-origin="(-?\d+),(-?\d+)"/.exec(page);
    expect(origin).not.toBeNull();
    const patched = await ask('/api/patch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        board: 'work',
        // An update, not a move: a move comes back as a position rather than as markup, and
        // this is about the markup.
        ops: [{ op: 'update', id: 'n1', patch: { at: [40, 50], rotation: 0 } }],
      }),
    });
    const body = (await patched.json()) as { changed: Array<{ html: string }> };
    const left = /left:(-?\d+)px/.exec(body.changed[0]?.html ?? '');
    expect(Number(left?.[1])).toBe(40 - Number(origin?.[1]));
  });

  it('sends a moved item back as its position, not as markup', async () => {
    const patched = await ask('/api/patch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ board: 'work', ops: [{ op: 'move', id: 'n1', at: [60, 70] }] }),
    });
    const body = (await patched.json()) as {
      changed: unknown[];
      placed: Array<{ id: string; at: [number, number] }>;
    };
    expect(body.changed).toEqual([]);
    expect(body.placed).toEqual([{ id: 'n1', at: [60, 70], z: expect.any(Number) }]);
  });

  it('rejects a patch that names something that is not there, and changes nothing', async () => {
    const version = async (): Promise<number> =>
      ((await (await ask('/api/state?board=work')).json()) as { spec: { version: number } }).spec
        .version;
    const before = await version();
    const res = await ask('/api/patch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ board: 'work', ops: [{ op: 'move', id: 'ghost', at: [0, 0] }] }),
    });
    expect(res.status).toBe(409);
    expect(await version()).toBe(before);
  });

  it('tells a watching page to reload when its board changes on disk', async () => {
    await ask('/api/state?board=watched');
    const ctrl = new AbortController();
    const events = await ask('/api/events?kind=board&id=watched&client=tab-a', {
      signal: ctrl.signal,
    });
    const reader = (events.body as ReadableStream<Uint8Array>).getReader();
    await reader.read(); // the opening comment
    // Something else writes the board: a restore, the CLI, a git checkout.
    const store = new Store({ dir });
    const spec = await store.readBoard('watched');
    await new Promise((done) => setTimeout(done, 20));
    await store.writeBoard({ ...(spec as { id: string; items: [] }), title: 'changed underneath' });
    await ask('/api/state?board=watched');
    const { value } = await reader.read();
    ctrl.abort();
    expect(new TextDecoder().decode(value)).toContain('event: reload');
  });

  it('never sends a tab its own patch back', async () => {
    const ctrl = new AbortController();
    const listen = async (client: string): Promise<ReadableStreamDefaultReader<Uint8Array>> => {
      const res = await ask(`/api/events?kind=board&id=echo&client=${client}`, {
        signal: ctrl.signal,
      });
      const reader = (res.body as ReadableStream<Uint8Array>).getReader();
      await reader.read();
      return reader;
    };
    const mine = await listen('tab-mine');
    const theirs = await listen('tab-theirs');
    await ask('/api/patch', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-grimstroke-client': 'tab-mine' },
      body: JSON.stringify({ board: 'echo', ops: [{ op: 'add', item: { id: 'e1', at: [0, 0] } }] }),
    });
    const got = await theirs.read();
    expect(new TextDecoder().decode(got.value)).toContain('event: patch');
    const echo = await Promise.race([
      mine.read().then(() => 'echoed'),
      new Promise((done) => setTimeout(() => done('quiet'), 150)),
    ]);
    ctrl.abort();
    expect(echo).toBe('quiet');
  });

  it('serves the app and the page that loads it', async () => {
    const page = await (await ask('/?board=work')).text();
    expect(page).toContain('data-gs="viewport"');
    expect(page).toContain('data-gs="tray"');
    expect(page).toContain('src="/app.js"');
    // Nothing from anywhere else: the product is a URL, and that only stays
    // true if the page it serves needs nothing from the network.
    expect(page).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
  });

  it('takes an upload and stores it by its contents', async () => {
    const res = await ask('/api/assets?name=shot.png', {
      method: 'POST',
      headers: { 'content-type': 'image/png' },
      body: Buffer.from('not really a png, but bytes are bytes'),
    });
    const { name, path } = (await res.json()) as { name: string; path: string };
    expect(name).toMatch(/^[0-9a-f]{32}\.png$/);
    expect(readFileSync(path, 'utf8')).toContain('bytes are bytes');
  });

  it('lists the boards it has', async () => {
    const { boards } = (await (await ask('/api/boards')).json()) as { boards: string[] };
    expect(boards).toContain('work');
  });
});

describe('the profile, over HTTP', () => {
  it('starts from nothing, and changes one field without touching the rest', async () => {
    const first = (await (await ask('/api/profile')).json()) as { profile: { name: string } };
    expect(first.profile.name).toBe('me');
    const stroke = { d: 'M1 1 L 20 20', colour: '#14110e', weight: 3, tool: 'pen' };
    await ask('/api/profile', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ profile: { name: 'Rio', portrait: { strokes: [stroke] } } }),
    });
    const res = await ask('/api/profile', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ patch: { role: 'design lead' } }),
    });
    const { profile, card } = (await res.json()) as {
      profile: { name: string; role: string; portrait: { strokes: unknown[] } };
      card: string;
    };
    expect(profile).toMatchObject({ name: 'Rio', role: 'design lead' });
    expect(profile.portrait.strokes).toEqual([stroke]);
    // The card comes back drawn, so a page never draws one itself.
    expect(card).toContain('class="profile"');
    expect(card).toContain('M1 1 L 20 20');
  });

  it('puts the card on a board by value', async () => {
    const res = await ask('/api/profile/place', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ board: 'cards' }),
    });
    expect(res.ok).toBe(true);
    const { spec } = (await (await ask('/api/state?board=cards')).json()) as {
      spec: { items: Array<{ block?: { kind: string; profile?: { name: string } } }> };
    };
    const card = spec.items.find((item) => item.block?.kind === 'profile');
    expect(card?.block?.profile?.name).toBe('Rio');
  });

  it('serves the profile page, and sends the old studio address to it', async () => {
    const page = await (await ask('/profile')).text();
    expect(page).toContain('data-gs="canvas"');
    expect(page).toContain('data-gs="portrait-ink"');
    const old = await ask('/face?id=rio', { redirect: 'manual' });
    expect(old.status).toBe(302);
    expect(old.headers.get('location')).toBe('/profile');
  });
});
