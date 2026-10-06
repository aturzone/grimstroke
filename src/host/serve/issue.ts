/**
 * Issues from the / box: which repositories there are to write one in, what labels each has,
 * and the issue itself, opened on its service with its pictures.
 *
 * The repositories are every one a connected account can see and every one a notebook is
 * connected to, so an account added later is simply there the next time the box asks. What the
 * box made is kept as its card -- an issue card that says which number it became and links to
 * it -- on the board or page it was typed on, or on the / board.
 */

import { readFile } from 'node:fs/promises';
import type { BoardItem } from '~/draw/doc/board/model.ts';
import { topZ } from '~/draw/doc/board/patch.ts';
import type { Provider } from '~/draw/doc/remote/model.ts';
import type { ShapeBlock } from '~/draw/shape/card.ts';
import { readShape } from '~/draw/shape/fields.ts';
import { type KnownRepo, resolveRepo } from '~/draw/shape/issue.ts';
import { chooseLabels, labelWords } from '~/draw/shape/labels.ts';
import { RemoteError } from '~/host/remote/http.ts';
import { applyBoard } from '~/host/serve/api.ts';
import { type Ask, readBody, send } from '~/host/serve/http.ts';
import type { Live } from '~/host/serve/live.ts';
import { SLASH_BOARD } from '~/host/serve/slash.ts';

interface Target extends KnownRepo {
  provider: Provider;
  /** Where it was found: an account's own list, or a notebook connected to it. */
  from: 'account' | 'notebook';
}

const MINUTES = 60_000;
let targetsCache: { at: number; list: Target[] } | undefined;
const labelsCache = new Map<
  string,
  { at: number; list: Array<{ name: string; colour?: string }> }
>();

/** Every repository the box can write an issue in, newest account included. */
async function targets(live: Live, fresh = false): Promise<Target[]> {
  if (!fresh && targetsCache && Date.now() - targetsCache.at < 5 * MINUTES)
    return targetsCache.list;
  const out = new Map<string, Target>();
  for (const id of await live.store.listBooks()) {
    const link = (await live.book(id)).remote;
    if (link) out.set(`${link.host}/${link.repo}`, { ...link, from: 'notebook' });
  }
  for (const key of await live.remote.tokens.summary()) {
    try {
      const repos = await (await live.remote.adapter(key)).repos('');
      for (const r of repos)
        if (!out.has(`${key.host}/${r.repo}`))
          out.set(`${key.host}/${r.repo}`, {
            provider: key.provider,
            host: key.host,
            repo: r.repo,
            from: 'account',
          });
    } catch {
      // An account that cannot list right now leaves its notebooks' repositories in the list.
    }
  }
  targetsCache = { at: Date.now(), list: [...out.values()] };
  return targetsCache.list;
}

async function labelsOf(
  live: Live,
  t: KnownRepo & { provider: Provider },
): Promise<Array<{ name: string; colour?: string }>> {
  const key = `${t.host}/${t.repo}`;
  const kept = labelsCache.get(key);
  if (kept && Date.now() - kept.at < 10 * MINUTES) return kept.list;
  const list = await (await live.remote.adapter(t)).labels(t.repo);
  labelsCache.set(key, { at: Date.now(), list });
  return list;
}

export async function issueApi(ask: Ask, live: Live): Promise<boolean> {
  const { path, req, res, url } = ask;

  if (path === '/api/remote/targets' && req.method === 'GET') {
    send(res, 200, {
      accounts: await live.remote.tokens.summary(),
      repos: await targets(live, url.searchParams.has('fresh')),
    });
    return true;
  }

  if (path === '/api/remote/labels' && req.method === 'GET') {
    const host = url.searchParams.get('host') ?? '';
    const repo = url.searchParams.get('repo') ?? '';
    const t = (await targets(live)).find((x) => x.host === host && x.repo === repo);
    if (!t) {
      send(res, 404, { error: 'that repository is not one a connected account can see' });
      return true;
    }
    try {
      send(res, 200, { labels: await labelsOf(live, t) });
    } catch (error) {
      send(res, error instanceof RemoteError ? error.status || 502 : 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  /*
   * A repository's issues, for the box: { repo?, mine?, state? }. The repository is named the
   * way a sentence names it, or is the one used last.
   */
  if (path === '/api/remote/issues' && req.method === 'GET') {
    const known = await targets(live);
    const target = resolveRepo(
      url.searchParams.get('repo') || null,
      known,
      url.searchParams.get('last') ?? undefined,
    );
    if (!target) {
      send(res, 400, {
        error: known.length
          ? 'which repository?'
          : 'connect a GitHub, GitLab or Gitea account first',
        repos: known.map((k) => `${k.host}/${k.repo}`),
      });
      return true;
    }
    try {
      const state = url.searchParams.get('state');
      const rows = await (await live.remote.adapter(target)).issues(target.repo, {
        state: state === 'closed' || state === 'all' ? state : 'open',
        ...(url.searchParams.has('mine') ? { assignee: 'me' } : {}),
        perPage: 20,
      });
      send(res, 200, {
        repo: `${target.host}/${target.repo}`,
        issues: rows.map((i) => ({
          number: i.number,
          title: i.title,
          state: i.state,
          url: i.url,
          labels: i.labels.map((l) => l.name),
        })),
      });
    } catch (error) {
      send(res, error instanceof RemoteError ? error.status || 502 : 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  /** Close, reopen or comment on an issue by its number: { repo?, number, action, body? }. */
  if (path === '/api/remote/issues/act' && req.method === 'POST') {
    const body = (await readBody(req)) as {
      repo?: string;
      number?: string | number;
      action?: string;
      body?: string;
      last?: string;
    };
    const target = resolveRepo(body.repo || null, await targets(live), body.last);
    const n = String(body.number ?? '').replace(/^#/, '');
    const action = body.action;
    if (
      !target ||
      !/^\d+$/.test(n) ||
      (action !== 'close' && action !== 'reopen' && action !== 'comment')
    ) {
      send(res, 400, {
        error: 'a repository, an issue number and close, reopen or comment are needed',
      });
      return true;
    }
    try {
      const seen =
        action === 'comment'
          ? await live.remote.act(
              { ...target, kind: 'issue', id: n },
              { action, body: body.body ?? '' },
            )
          : await live.remote.act({ ...target, kind: 'issue', id: n }, { action });
      const issue = seen as { number?: string; title?: string; state?: string; url?: string };
      send(res, 200, {
        repo: `${target.host}/${target.repo}`,
        issue: { number: issue.number, title: issue.title, state: issue.state, url: issue.url },
      });
    } catch (error) {
      send(res, error instanceof RemoteError ? error.status || 502 : 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  /*
   * Open an issue from a card the box made: { block, address?, id?, images?, last? }. With an id
   * the card already on that board or page is the one that says where the issue went; without,
   * a new card goes onto the board or page given, or the / board.
   */
  if (path === '/api/remote/issue' && req.method === 'POST') {
    const body = (await readBody(req)) as {
      block?: ShapeBlock;
      address?: string;
      id?: string;
      images?: Array<{ name?: string; type?: string; asset?: string }>;
      last?: string;
    };
    const address = body.address || SLASH_BOARD;
    let block = body.block;
    if (body.id) {
      const item = (await live.board(address)).items.find((i) => i.id === body.id);
      if (item?.block?.kind === 'shape') block = item.block as unknown as ShapeBlock;
    }
    if (!block || block.kind !== 'shape' || block.intent !== 'issue') {
      send(res, 400, { error: 'an issue card is needed' });
      return true;
    }
    if (block.state?.issue) {
      send(res, 409, { error: `this card is already #${block.state.issue.number}` });
      return true;
    }
    const d = readShape('issue', block.text, new Date(block.made ?? Date.now()), block.state ?? {});
    if (!d.title.trim()) {
      send(res, 400, { error: 'the issue needs a title' });
      return true;
    }
    const known = await targets(live);
    const target = resolveRepo(d.repo, known, body.last);
    if (!target) {
      send(res, 400, {
        error: d.repo
          ? `no connected account can see a repository called ${d.repo}`
          : known.length
            ? 'which repository? say it, like "in owner/name", or choose it in details'
            : 'connect a GitHub, GitLab or Gitea account first: open a notebook and press “connect” on its bar',
        repos: known.map((k) => `${k.host}/${k.repo}`),
      });
      return true;
    }
    try {
      const available = (await labelsOf(live, target)).map((l) => l.name);
      // Labels the card holds are kept as the repository spells them; the rest are chosen.
      const asked = d.labels
        .map((l) => available.find((a) => a === l || labelWords(a) === labelWords(l)))
        .filter((l): l is string => Boolean(l));
      const chosen =
        asked.length === d.labels.length && asked.length
          ? asked
          : chooseLabels(d, available).map((c) => c.name);
      const adapter = await live.remote.adapter(target);
      let issue = await adapter.create(target.repo, {
        title: d.title,
        ...(d.body ? { body: d.body } : {}),
        ...(chosen.length ? { labels: [...new Set(chosen)] } : {}),
      });
      // The pictures once the issue has a number: some services attach them to it.
      const shown: string[] = [];
      for (const image of (body.images ?? []).slice(0, 8)) {
        if (!image.asset) continue;
        const bytes = new Uint8Array(await readFile(live.store.assetPath(image.asset)));
        shown.push(
          await adapter.attach(target.repo, String(issue.number), {
            name: image.name || image.asset,
            type: image.type || 'image/png',
            bytes,
          }),
        );
      }
      if (shown.length)
        issue = await adapter.update(target.repo, String(issue.number), {
          body: [d.body, ...shown].filter(Boolean).join('\n\n'),
        });
      const sent: ShapeBlock = {
        ...block,
        state: {
          ...(block.state ?? {}),
          fields: { ...(block.state?.fields ?? {}), repo: target.repo, labels: chosen },
          issue: { url: issue.url, number: issue.number },
        },
      };
      let id = body.id;
      if (id) {
        await applyBoard(live, address, [{ op: 'update', id, patch: { block: sent as never } }]);
      } else {
        const spec = await live.board(address);
        id = `card-${Date.now().toString(36)}`;
        const bottom = spec.items.length
          ? Math.max(...spec.items.map((i) => i.at[1] + (i.size?.[1] ?? 240)))
          : 0;
        const item: BoardItem = {
          id,
          at: spec.sheet ? [40, Math.round(bottom + 16)] : [80, Math.round(bottom + 40)],
          z: topZ(spec) + 1,
          size: [spec.sheet ? 300 : 360],
          block: sent as never,
        };
        await applyBoard(live, address, [{ op: 'add', item }]);
      }
      send(res, 200, {
        issue: { number: issue.number, url: issue.url, title: issue.title },
        repo: `${target.host}/${target.repo}`,
        labels: chosen,
        address,
        id,
      });
    } catch (error) {
      send(res, error instanceof RemoteError ? error.status || 502 : 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  return false;
}
