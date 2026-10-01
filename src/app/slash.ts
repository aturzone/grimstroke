/**
 * The / board: the box at the head of the page, every card it made below.
 *
 * A card is changed here exactly as on the board -- the box's own controls, through the box's
 * own host -- and kept wherever it lives; the server draws the page again and it is put in.
 * Nothing is drawn here. Finding and the kind chips only show and hide what was drawn.
 */

import { toast } from '~/app/chrome.ts';
import { appear, play } from '~/app/feel.ts';
import { pickPage } from '~/app/pick.ts';
import { type PlacedBlock, ShapeIsland } from '~/app/shape/island.ts';
import type { ShapeBlock } from '~/draw/shape/render.ts';

interface Where {
  address: string;
  id: string;
}

const split = (key: string): Where => {
  const at = key.lastIndexOf('|');
  return { address: key.slice(0, at), id: key.slice(at + 1) };
};

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as T;
}

export function bootSlash(): boolean {
  const main = document.querySelector<HTMLElement>('[data-gs="slash"]');
  if (!main) return false;
  let kind = '';

  const blocks = (): Record<string, ShapeBlock> => {
    const raw = main.querySelector('[data-sl="blocks"]')?.textContent ?? '{}';
    return JSON.parse(raw) as Record<string, ShapeBlock>;
  };

  /** Only what matches the words being looked for and the kind chosen. */
  const filter = (): void => {
    const words = (main.querySelector<HTMLInputElement>('[data-sl="find"]')?.value ?? '')
      .trim()
      .toLowerCase();
    let shown = 0;
    for (const item of main.querySelectorAll<HTMLElement>('.sl-item')) {
      const show =
        (!kind || item.dataset.slKind === kind) &&
        (!words || (item.dataset.slWords ?? '').includes(words));
      item.hidden = !show;
      if (show) shown++;
    }
    for (const chip of main.querySelectorAll<HTMLElement>('[data-sl-filter]'))
      chip.setAttribute('aria-pressed', String((chip.dataset.slFilter ?? '') === kind));
    const none = main.querySelector<HTMLElement>('.sl-none');
    if (none) none.hidden = shown > 0;
  };

  /** The page drawn again by the server, with what was being looked for kept. */
  const put = (html: string, fresh?: string): void => {
    const words = main.querySelector<HTMLInputElement>('[data-sl="find"]')?.value ?? '';
    const open = main.querySelector<HTMLDetailsElement>('.sl-done')?.open ?? false;
    // Our own server's markup, drawn by draw/slash.
    main.innerHTML = html;
    const find = main.querySelector<HTMLInputElement>('[data-sl="find"]');
    if (find) find.value = words;
    const done = main.querySelector<HTMLDetailsElement>('.sl-done');
    if (done) done.open = open;
    if (!main.querySelector(`[data-sl-filter="${CSS.escape(kind)}"]`)) kind = '';
    filter();
    if (fresh) {
      const card = main.querySelector(`[data-gs-id="${CSS.escape(fresh)}"]`);
      if (card) appear(card);
    }
  };

  const failed = (): void => {
    toast('that did not save -- is the workspace running?', 'error');
  };

  const island = new ShapeIsland({
    surface: main,
    find: (inside) => {
      const key = inside.closest<HTMLElement>('.sl-item')?.dataset.gsId;
      const block = key ? blocks()[key] : undefined;
      return key && block ? { id: key, block } : undefined;
    },
    save: (key, block) => {
      post<{ html: string }>('/api/slash/save', { ...split(key), block })
        .then(({ html }) => put(html))
        .catch(failed);
    },
    address: (key) => (key ? split(key).address : 'slash'),
    placed: (address, id) => void refresh(`${address}|${id}`).catch(() => {}),
    add: (block: PlacedBlock, width) => {
      post<{ id: string; address: string; html: string }>('/api/slash/add', { block, width })
        .then(({ id, address, html }) => {
          play('pop');
          put(html, `${address}|${id}`);
        })
        .catch(failed);
    },
  });
  island.bind();

  main.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement;
    const chip = target.closest<HTMLElement>('[data-sl-filter]');
    if (chip) {
      kind = chip.dataset.slFilter ?? '';
      play('tap', 0.7);
      filter();
      return;
    }
    if (target.closest('[data-gs="shape-open"]')) {
      island.open();
      return;
    }
    const button = target.closest<HTMLElement>('[data-sl]');
    const key = button?.closest<HTMLElement>('.sl-item')?.dataset.gsId;
    if (!button || !key) return;
    const where = split(key);
    try {
      if (button.dataset.sl === 'delete') {
        const { item, html } = await post<{ item: unknown; html: string }>(
          '/api/slash/delete',
          where,
        );
        play('untick');
        put(html);
        toast('let go', 'info', {
          label: 'undo',
          run: () => {
            post<{ html: string }>('/api/slash/restore', { address: where.address, item })
              .then(({ html: back }) => put(back, key))
              .catch(failed);
          },
        });
      } else if (button.dataset.sl === 'move') {
        const to = await pickPage(where.address);
        if (!to || to === where.address) return;
        const reply = await post<{ ids: string[] }>('/api/items/move', {
          from: where.address,
          to,
          ids: [where.id],
        });
        await refresh(`${to}|${reply.ids[0] ?? where.id}`);
        toast('sent', 'info');
      }
    } catch {
      failed();
    }
  });
  main.addEventListener('input', (event) => {
    if ((event.target as HTMLElement).closest('[data-sl="find"]')) filter();
  });

  /** What changed on a board or a page while this one was away is drawn again on coming back. */
  const refresh = async (fresh?: string): Promise<void> => {
    if (island.isOpen) return;
    const res = await fetch('/api/slash?html');
    if (res.ok) put(((await res.json()) as { html: string }).html, fresh);
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void refresh().catch(() => {});
  });
  for (const [n, card] of [...main.querySelectorAll('.sl-item')].slice(0, 12).entries())
    appear(card, n * 30);
  return true;
}
