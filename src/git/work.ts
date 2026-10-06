/**
 * Working with repositories, the way the / box does: which repositories there are, their labels,
 * their issues, an issue opened from a sentence, closed, reopened or answered -- for the API and
 * the command line alike, so the two can never do it differently.
 *
 * The repositories are every one a connected account can see and every one a notebook is
 * connected to, so an account added later is simply there the next time it is asked. An issue
 * the box opens is kept as its card -- one that says which number it became -- on the board or
 * page it was typed on, or on the / board; and the issue follows that card when it is edited.
 */

import { readFile } from 'node:fs/promises';
import type { ShapeBlock } from '@core/box/card.ts';
import { readShape } from '@core/box/fields.ts';
import { type KnownRepo, resolveRepo } from '@core/box/issue.ts';
import { chooseLabels, labelWords } from '@core/box/labels.ts';
import { SLASH_BOARD } from '@core/box/slash.ts';
import type { BoardItem, BoardSpec } from '@core/docs/board.ts';
import { nextSpot } from '@core/docs/board-extent.ts';
import { topZ } from '@core/docs/board-patch.ts';
import { RemoteError } from '@core/git/http.ts';
import type { Provider } from '@core/git/model.ts';
import { applyBoard } from '@core/serve/api.ts';
import type { Live } from '@core/serve/live.ts';

export interface Target extends KnownRepo {
  provider: Provider;
  /** Where it was found: an account's own list, or a notebook connected to it. */
  from: 'account' | 'notebook';
}

/** Something asked that cannot be done, with the status an API answers it with. */
export class GitProblem extends Error {
  readonly status: number;
  readonly extra: Record<string, unknown>;
  constructor(status: number, message: string, extra: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

/** A service's own refusal, as a problem with its status. */
function problem(error: unknown): GitProblem {
  if (error instanceof GitProblem) return error;
  if (error instanceof RemoteError) return new GitProblem(error.status || 502, error.message);
  return new GitProblem(500, error instanceof Error ? error.message : String(error));
}

const MINUTES = 60_000;
let targetsCache: { at: number; list: Target[] } | undefined;
const labelsCache = new Map<
  string,
  { at: number; list: Array<{ name: string; colour?: string }> }
>();

/** Every repository there is to work in, newest account included. */
export async function repositories(live: Live, fresh = false): Promise<Target[]> {
  if (!fresh && targetsCache && Date.now() - targetsCache.at < 5 * MINUTES)
    return targetsCache.list;
  const out = new Map<string, Target>();
  for (const id of await live.store.listBooks()) {
    const link = (await live.book(id)).remote;
    if (link) out.set(`${link.host}/${link.repo}`, { ...link, from: 'notebook' });
  }
  for (const key of await live.remote.tokens.summary()) {
    try {
      for (const r of await (await live.remote.adapter(key)).repos(''))
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

export async function labelsOf(
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

/** The repository a sentence (or a name) means, or a problem saying which there are. */
export async function repositoryFor(
  live: Live,
  asked: string | null,
  last?: string,
): Promise<Target> {
  const known = await repositories(live);
  const target = resolveRepo(asked, known, last);
  if (target) return target;
  throw new GitProblem(
    400,
    asked
      ? `no connected account can see a repository called ${asked}`
      : known.length
        ? 'which repository? say it, like "in owner/name"'
        : 'connect a GitHub, GitLab or Gitea account first ("connect" in the / box, or grimstroke connect)',
    { repos: known.map((k) => `${k.host}/${k.repo}`) },
  );
}

export interface IssueRow {
  number: string;
  title: string;
  state: string;
  url: string;
  labels: string[];
}

/** A repository's issues: open by default, only those assigned to whoever is signed in if mine. */
export async function listIssues(
  live: Live,
  o: { repo?: string | null; mine?: boolean; state?: string | null; last?: string },
): Promise<{ repo: string; issues: IssueRow[] }> {
  const target = await repositoryFor(live, o.repo ?? null, o.last);
  try {
    const rows = await (await live.remote.adapter(target)).issues(target.repo, {
      state: o.state === 'closed' || o.state === 'all' ? o.state : 'open',
      ...(o.mine ? { assignee: 'me' } : {}),
      perPage: 20,
    });
    return {
      repo: `${target.host}/${target.repo}`,
      issues: rows.map((i) => ({
        number: i.number,
        title: i.title,
        state: i.state,
        url: i.url,
        labels: i.labels.map((l) => l.name),
      })),
    };
  } catch (error) {
    throw problem(error);
  }
}

/** Close, reopen or answer an issue named by its number. */
export async function actOnIssue(
  live: Live,
  o: {
    repo?: string | null;
    number: string | number;
    action: string;
    body?: string;
    last?: string;
  },
): Promise<{
  repo: string;
  issue: {
    number?: string | undefined;
    title?: string | undefined;
    state?: string | undefined;
    url?: string | undefined;
  };
}> {
  const n = String(o.number ?? '').replace(/^#/, '');
  const action = o.action;
  if (!/^\d+$/.test(n) || (action !== 'close' && action !== 'reopen' && action !== 'comment'))
    throw new GitProblem(400, 'an issue number, and close, reopen or comment, are needed');
  if (action === 'comment' && !o.body?.trim())
    throw new GitProblem(400, 'a comment needs some words');
  const target = await repositoryFor(live, o.repo ?? null, o.last);
  try {
    const ref = { ...target, kind: 'issue' as const, id: n };
    const seen =
      action === 'comment'
        ? await live.remote.act(ref, { action, body: o.body ?? '' })
        : await live.remote.act(ref, { action });
    const issue = seen as { number?: string; title?: string; state?: string; url?: string };
    return {
      repo: `${target.host}/${target.repo}`,
      issue: { number: issue.number, title: issue.title, state: issue.state, url: issue.url },
    };
  } catch (error) {
    throw problem(error);
  }
}

export interface Opened {
  issue: { number: string; url: string; title: string };
  repo: string;
  labels: string[];
  address: string;
  id: string;
}

/**
 * Open the issue an issue card says: on its repository, with the repository's own labels for
 * it and its pictures, and keep the card -- the one given by address and id, or a new one on the
 * board or page given, or on the / board -- saying which number it became.
 */
export async function openIssue(
  live: Live,
  o: {
    block?: ShapeBlock | undefined;
    address?: string | undefined;
    id?: string | undefined;
    /** Pictures already in the workspace's assets. */
    images?: Array<{ name?: string; type?: string; asset?: string }> | undefined;
    last?: string | undefined;
  },
): Promise<Opened> {
  const address = o.address || SLASH_BOARD;
  let block = o.block;
  if (o.id) {
    const item = (await live.board(address)).items.find((i) => i.id === o.id);
    if (item?.block?.kind === 'shape') block = item.block as unknown as ShapeBlock;
  }
  if (block?.kind !== 'shape' || block.intent !== 'issue')
    throw new GitProblem(400, 'an issue card is needed');
  if (block.state?.issue)
    throw new GitProblem(409, `this card is already #${block.state.issue.number}`);
  const d = readShape('issue', block.text, new Date(block.made ?? Date.now()), block.state ?? {});
  if (!d.title.trim()) throw new GitProblem(400, 'the issue needs a title');
  const target = await repositoryFor(live, d.repo, o.last);
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
    for (const image of (o.images ?? []).slice(0, 8)) {
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
    let id = o.id;
    if (id) {
      await applyBoard(live, address, [{ op: 'update', id, patch: { block: sent as never } }]);
    } else {
      const spec = await live.board(address);
      id = `card-${Date.now().toString(36)}`;
      const item: BoardItem = {
        id,
        at: nextSpot(spec),
        z: topZ(spec) + 1,
        size: [spec.sheet ? 300 : 360],
        block: sent as never,
      };
      await applyBoard(live, address, [{ op: 'add', item }]);
    }
    return {
      issue: { number: issue.number, url: issue.url, title: issue.title },
      repo: `${target.host}/${target.repo}`,
      labels: chosen,
      address,
      id,
    };
  } catch (error) {
    throw problem(error);
  }
}

/*
 * A card whose issue is open on its service: a title, a description or labels changed on the
 * card (by hand, in Details) are changed on the issue too, so the two never say different
 * things. In the background: a board is not held up by a service.
 */
export function followEdits(
  live: Live,
  _address: string,
  before: BoardSpec,
  after: BoardSpec,
): void {
  for (const item of after.items) {
    const block = item.block as unknown as ShapeBlock | undefined;
    const sent =
      block?.kind === 'shape' && block.intent === 'issue' ? block.state?.issue : undefined;
    if (!block || !sent) continue;
    const old = before.items.find((i) => i.id === item.id)?.block as unknown as
      | ShapeBlock
      | undefined;
    if (old?.kind !== 'shape' || JSON.stringify(old) === JSON.stringify(block)) continue;
    const was = readShape('issue', old.text, new Date(old.made ?? 0), old.state ?? {});
    const now = readShape('issue', block.text, new Date(block.made ?? 0), block.state ?? {});
    const add = now.labels.filter((l) => !was.labels.includes(l));
    const remove = was.labels.filter((l) => !now.labels.includes(l));
    const patch = {
      ...(now.title !== was.title && now.title.trim() ? { title: now.title } : {}),
      ...(now.body !== was.body ? { body: now.body } : {}),
      ...(add.length ? { addLabels: add } : {}),
      ...(remove.length ? { removeLabels: remove } : {}),
    };
    if (!Object.keys(patch).length) continue;
    void (async () => {
      const target = resolveRepo(now.repo, await repositories(live));
      if (!target) return;
      await (await live.remote.adapter(target)).update(target.repo, String(sent.number), patch);
    })().catch(() => {
      // The service did not take it; the card keeps what was written.
    });
  }
}
