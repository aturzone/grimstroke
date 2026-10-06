/**
 * The repository API: keys, connecting a notebook, the drawer's lists, placing cards, acting on
 * issues, and keeping every card on an open page fresh.
 *
 * The browser only ever talks to this; this talks to the services. A token goes in once, to be
 * tested and kept (host/remote/tokens.ts), and never comes back out.
 */

import type { Block } from '@core/docs/block.ts';
import type { BoardItem, BoardSpec } from '@core/docs/board.ts';
import type { Op } from '@core/docs/board-patch.ts';
import { topZ } from '@core/docs/board-patch.ts';
import { apply as applyBook } from '@core/docs/book-patch.ts';
import { RemoteError } from '@core/git/http.ts';
import {
  PROVIDERS,
  type Provider,
  type RemoteLink,
  type RemoteQuery,
  type RemoteRef,
  refFromUrl,
} from '@core/git/model.ts';
import {
  authorizeUrl,
  devicePoll,
  deviceStart,
  exchangeCode,
  githubClientId,
  gitlabAppId,
  hookSecret,
  pkce,
  recall,
  remember,
  verifyHook,
} from '@core/git/oauth.ts';
import type { RemoteAction } from '@core/git/service.ts';
import { ghToken } from '@core/git/tokens.ts';
import { applyBoard } from '@core/serve/api.ts';
import { type Ask, header, readBody, readRaw, send } from '@core/serve/http.ts';
import type { Live } from '@core/serve/live.ts';

type RemoteBlock = Extract<Block, { kind: 'remote' }>;

/** Report a failure in the service's own words, with a status that says whose fault it was. */
function fail(ask: Ask, error: unknown): void {
  if (error instanceof RemoteError) {
    send(ask.res, error.status >= 400 && error.status < 600 ? error.status : 502, {
      error: error.message,
    });
    return;
  }
  send(ask.res, 500, { error: error instanceof Error ? error.message : String(error) });
}

function isProvider(value: unknown): value is Provider {
  return typeof value === 'string' && (PROVIDERS as readonly string[]).includes(value);
}

/** A host name as typed -- 'https://git.example.com/' -- down to 'git.example.com'. */
export function cleanHost(raw: unknown): string {
  const text = String(raw ?? '').trim();
  try {
    return new URL(text.includes('://') ? text : `https://${text}`).host.toLowerCase();
  } catch {
    return '';
  }
}

/** The repository a board or page is about: its notebook's, for a page. */
async function linkOf(live: Live, address: string): Promise<RemoteLink | undefined> {
  const page = /^book:([^:]+):/.exec(address);
  if (!page) return undefined;
  return (await live.book(page[1] as string)).remote;
}

/** Where a new card goes when none is said: down the page's margin, or beside the rest. */
function freeSpot(spec: BoardSpec): [number, number] {
  const cards = spec.items.filter((i) => i.block?.kind === 'remote').length;
  if (spec.sheet) return [36 + (cards % 2) * 250, 40 + Math.floor(cards / 2) * 280];
  const right = spec.items.length
    ? Math.max(...spec.items.map((i) => i.at[0] + (i.size?.[0] ?? 240)))
    : 0;
  return [Math.round(right + 60), 80 + cards * 40];
}

/** A snapshot for a ref or a query, with the moment it was seen, or the error it met. */
async function look(live: Live, block: RemoteBlock): Promise<RemoteBlock> {
  const seenAt = new Date().toISOString();
  try {
    if (block.query)
      return { ...withoutError(block), rows: await live.remote.ask(block.query), seenAt };
    if (block.ref)
      return { ...withoutError(block), seen: await live.remote.see(block.ref), seenAt };
    return block;
  } catch (error) {
    return { ...block, error: error instanceof Error ? error.message : String(error) };
  }
}

function withoutError(block: RemoteBlock): RemoteBlock {
  const { error: _, ...rest } = block;
  return rest;
}

/** Refresh every card on one board or page; only the ones that changed are written back. */
export async function refreshCards(live: Live, address: string): Promise<number> {
  const spec = await live.board(address);
  const ops: Op[] = [];
  for (const item of spec.items) {
    if (item.block?.kind !== 'remote') continue;
    const before = item.block;
    const after = await look(live, before);
    const { seenAt: _a, ...was } = before;
    const { seenAt: _b, ...now } = after;
    if (JSON.stringify(was) === JSON.stringify(now)) continue;
    ops.push({ op: 'update', id: item.id, patch: { block: after } });
  }
  ops.push(...linkFixes(spec.items, ops));
  if (ops.length) await applyBoard(live, address, ops);
  return ops.length;
}

/**
 * The "fixed it" flow: a commit card on the page that says it closes #n marks the issue card for
 * #n with that commit; a closed issue is drawn struck through already. Only changes are returned.
 */
export function linkFixes(items: readonly BoardItem[], pending: readonly Op[] = []): Op[] {
  const latest = (item: BoardItem): RemoteBlock | undefined => {
    const update = pending.find((op) => op.op === 'update' && op.id === item.id) as
      | { patch: { block?: RemoteBlock } }
      | undefined;
    const block = update?.patch.block ?? item.block;
    return block?.kind === 'remote' ? (block as RemoteBlock) : undefined;
  };
  const fixes = new Map<string, string>();
  for (const item of items) {
    const b = latest(item);
    if (b?.ref?.kind !== 'commit') continue;
    for (const n of (b.seen as { closes?: string[] } | undefined)?.closes ?? [])
      fixes.set(`${b.ref.repo}#${n}`, b.ref.id);
  }
  const out: Op[] = [];
  for (const item of items) {
    const b = latest(item);
    if (b?.ref?.kind !== 'issue') continue;
    const sha = fixes.get(`${b.ref.repo}#${b.ref.id}`);
    if (sha === b.fixedBy) continue;
    const { fixedBy: _, ...rest } = b;
    const next = sha ? { ...rest, fixedBy: sha } : rest;
    const at = out.findIndex((op) => op.op === 'update' && op.id === item.id);
    if (at >= 0) out.splice(at, 1);
    out.push({ op: 'update', id: item.id, patch: { block: next } });
  }
  return out;
}

/**
 * Every minute, the cards on the pages somebody has open are asked about again. ETags make an
 * unchanged answer free, and nothing is asked about a page nobody is looking at.
 */
export function keepFresh(live: Live, every = 60_000): () => void {
  const timer = setInterval(() => {
    void (async () => {
      for (const watched of live.watched()) {
        if (!watched.startsWith('board:')) continue;
        const address = watched.slice('board:'.length);
        const spec = await live.board(address).catch(() => undefined);
        if (!spec?.items.some((i) => i.block?.kind === 'remote')) continue;
        await refreshCards(live, address).catch(() => 0);
      }
    })();
  }, every);
  timer.unref?.();
  return () => clearInterval(timer);
}

export async function remoteApi(ask: Ask, live: Live): Promise<boolean> {
  const { req, res, url, path } = ask;
  if (!path.startsWith('/api/remote/')) return false;
  const service = live.remote;

  try {
    // ---------------------------------------------------------------- keys
    if (path === '/api/remote/keys' && req.method === 'GET') {
      send(res, 200, {
        keys: await service.tokens.summary(),
        // Whether the GitHub CLI could lend its key, so the setup can offer that first.
        gh: Boolean(await ghToken('github.com')),
        // Whether signing in with the browser is set up (see host/remote/oauth.ts).
        device: Boolean(githubClientId()),
      });
      return true;
    }
    if (path === '/api/remote/keys' && req.method === 'POST') {
      const body = (await readBody(req)) as {
        provider?: unknown;
        host?: unknown;
        token?: unknown;
        gh?: unknown;
      };
      if (!isProvider(body.provider)) {
        send(res, 400, { error: 'provider is github, gitlab or gitea' });
        return true;
      }
      const host = cleanHost(body.host ?? (body.provider === 'github' ? 'github.com' : ''));
      if (!host) {
        send(res, 400, { error: 'which host? for example gitlab.com, or your company’s address' });
        return true;
      }
      const who = await service.saveKey({
        provider: body.provider,
        host,
        ...(typeof body.token === 'string' ? { token: body.token } : {}),
        ...(body.gh ? { gh: true } : {}),
      });
      send(res, 200, {
        host,
        user: who.login,
        name: who.name,
        scopes: who.scopes,
        canWrite: who.canWrite,
      });
      return true;
    }
    // ---------------------------------------------------------------- signing in with the browser
    if (path === '/api/remote/device/start' && req.method === 'POST') {
      const id = githubClientId();
      if (!id) {
        send(res, 501, {
          error:
            'signing in with the browser needs GRIMSTROKE_GITHUB_CLIENT_ID; paste a token instead',
        });
        return true;
      }
      send(res, 200, await deviceStart(id));
      return true;
    }
    if (path === '/api/remote/device/poll' && req.method === 'POST') {
      const id = githubClientId();
      const body = (await readBody(req)) as { device?: string };
      if (!id || !body.device) {
        send(res, 400, { error: 'nothing is waiting to be signed in' });
        return true;
      }
      const got = await devicePoll(id, body.device);
      if (got.token) {
        const who = await service.saveKey({
          provider: 'github',
          host: 'github.com',
          token: got.token,
        });
        send(res, 200, { done: true, host: 'github.com', user: who.login, canWrite: who.canWrite });
      } else if (got.wait) send(res, 200, { wait: got.wait });
      else send(res, 400, { error: got.error });
      return true;
    }
    if (path === '/api/remote/oauth/available') {
      send(res, 200, { available: Boolean(gitlabAppId(cleanHost(url.searchParams.get('host')))) });
      return true;
    }
    if (path === '/api/remote/oauth/start') {
      const host = cleanHost(url.searchParams.get('host'));
      const app = gitlabAppId(host);
      if (!app) {
        send(res, 501, {
          error: `signing in to ${host} with the browser needs an application id; paste a token instead`,
        });
        return true;
      }
      const p = pkce();
      const redirect = `http://${req.headers.host}/api/remote/oauth/callback`;
      remember(p.state, {
        host,
        verifier: p.verifier,
        redirect,
        ...(url.searchParams.get('book') ? { book: url.searchParams.get('book') as string } : {}),
      });
      const base = service.baseOf(host)?.replace(/\/api\/v4$/, '');
      res.writeHead(302, { location: authorizeUrl(host, app, redirect, p, base) });
      res.end();
      return true;
    }

    // ---------------------------------------------------------------- webhooks
    if (path === '/api/remote/keys/hook' && req.method === 'POST') {
      const body = (await readBody(req)) as { host?: string };
      const host = cleanHost(body.host);
      const key = await service.tokens.get(host);
      if (!key) {
        send(res, 404, { error: `connect ${host} first` });
        return true;
      }
      const secret = hookSecret();
      await service.tokens.put(host, { ...key, hookSecret: secret });
      send(res, 200, {
        secret,
        path: `/api/remote/hook?host=${encodeURIComponent(host)}`,
        note:
          'The workspace listens on this computer only, so a service reaches it only through a tunnel you run. ' +
          'Give the service the URL (with ?t= and your workspace token) and this secret; deliveries without it are refused.',
      });
      return true;
    }

    if (path === '/api/remote/keys' && req.method === 'DELETE') {
      await service.forgetKey(cleanHost(url.searchParams.get('host')));
      send(res, 200, { ok: true });
      return true;
    }

    // ---------------------------------------------------------------- repositories
    if (path === '/api/remote/repos') {
      const provider = url.searchParams.get('provider');
      const host = cleanHost(url.searchParams.get('host'));
      if (!isProvider(provider) || !host) {
        send(res, 400, { error: 'provider and host are needed' });
        return true;
      }
      const repos = await (await service.adapter({ provider, host })).repos(
        url.searchParams.get('q') ?? '',
      );
      send(res, 200, { repos });
      return true;
    }

    if (path === '/api/remote/connect' && req.method === 'POST') {
      const body = (await readBody(req)) as {
        book?: string;
        provider?: unknown;
        host?: unknown;
        repo?: unknown;
      };
      const bookId = body.book ?? '';
      if (!isProvider(body.provider) || !body.host || !body.repo) {
        send(res, 400, { error: 'book, provider, host and repo are needed' });
        return true;
      }
      const host = cleanHost(body.host);
      const repo = String(body.repo)
        .trim()
        .replace(/^\/+|\/+$/g, '')
        .replace(/\.git$/, '');
      const checked = await (await service.adapter({ provider: body.provider, host })).repo(repo);
      const remote: RemoteLink = { provider: body.provider, host, repo: checked.repo };
      const book = await live.book(bookId);
      const others = (book.cover?.stickers ?? []).filter((s) => s.id !== 'remote-mark');
      // The service's mark goes on the cover as a sticker -- by value, so it can be moved or
      // peeled off like any other.
      const result = applyBook(book, [
        { op: 'book', patch: { remote } },
        {
          op: 'cover',
          patch: {
            stickers: [
              ...others,
              {
                id: 'remote-mark',
                kind: 'mark',
                mark: body.provider,
                at: [82, 88],
                width: 14,
                rotation: -8,
              },
            ],
          },
        },
      ]);
      await live.commitBook(result.spec);
      live.broadcast(`book:${bookId}`, 'reload', {}, header(req, 'x-grimstroke-client'));
      send(res, 200, { remote, defaultBranch: checked.defaultBranch, canPush: checked.canPush });
      return true;
    }

    if (path === '/api/remote/disconnect' && req.method === 'POST') {
      const body = (await readBody(req)) as { book?: string };
      const book = await live.book(body.book ?? '');
      const { remote: _, ...rest } = book;
      const stickers = (book.cover?.stickers ?? []).filter((s) => s.id !== 'remote-mark');
      await live.commitBook({ ...rest, cover: { ...book.cover, stickers } });
      live.broadcast(`book:${book.id}`, 'reload', {}, header(req, 'x-grimstroke-client'));
      send(res, 200, { ok: true });
      return true;
    }

    // ---------------------------------------------------------------- the drawer
    if (path === '/api/remote/list') {
      const address = url.searchParams.get('board') ?? '';
      const book = url.searchParams.get('book');
      const link = book ? (await live.book(book)).remote : await linkOf(live, address);
      if (!link) {
        send(res, 400, { error: 'this notebook is not connected to a repository yet' });
        return true;
      }
      const of = url.searchParams.get('of') ?? 'issues';
      const r = await service.adapter(link);
      const state = (url.searchParams.get('state') ?? 'open') as 'open' | 'closed' | 'all';
      const q = {
        state,
        ...(url.searchParams.get('q') ? { search: url.searchParams.get('q') as string } : {}),
        ...(url.searchParams.get('labels')
          ? { labels: (url.searchParams.get('labels') as string).split(',') }
          : {}),
        ...(url.searchParams.get('assignee')
          ? { assignee: url.searchParams.get('assignee') as string }
          : {}),
        page: Number(url.searchParams.get('page') ?? 1) || 1,
        perPage: 30,
      };
      const items =
        of === 'merges'
          ? await r.merges(link.repo, q)
          : of === 'commits'
            ? await r.commits(link.repo, { perPage: 30 })
            : await r.issues(link.repo, q);
      send(res, 200, { link, of, items });
      return true;
    }

    // ---------------------------------------------------------------- a thread
    // An issue card's whole conversation: the description and every comment, oldest first.
    if (path === '/api/remote/thread') {
      const address = url.searchParams.get('board') ?? ask.board;
      const spec = await live.board(address);
      const item = spec.items.find((i) => i.id === url.searchParams.get('id'));
      const block = item?.block?.kind === 'remote' ? item.block : undefined;
      if (!block?.ref || block.ref.kind !== 'issue') {
        send(res, 404, { error: 'no issue card by that id here' });
        return true;
      }
      const r = await service.adapter(block.ref);
      const [issue, comments] = await Promise.all([
        r.issue(block.ref.repo, block.ref.id),
        r.comments(block.ref.repo, block.ref.id),
      ]);
      send(res, 200, { ref: block.ref, issue, comments });
      return true;
    }

    // ---------------------------------------------------------------- cards
    if (path === '/api/remote/place' && req.method === 'POST') {
      const body = (await readBody(req)) as {
        board?: string;
        url?: string;
        ref?: RemoteRef;
        query?: Partial<RemoteQuery>;
        kind?: RemoteRef['kind'];
        id?: string;
        at?: [number, number];
        size?: [number];
      };
      const address = body.board ?? ask.board;
      const link = await linkOf(live, address);
      let block: RemoteBlock;
      if (body.query) {
        const base =
          link ??
          (body.query.provider && body.query.host && body.query.repo
            ? (body.query as RemoteLink)
            : undefined);
        if (!base) {
          send(res, 400, {
            error: 'a live list needs a connected notebook, or provider, host and repo',
          });
          return true;
        }
        block = {
          kind: 'remote',
          query: {
            provider: base.provider,
            host: base.host,
            repo: base.repo,
            of: body.query.of ?? 'issues',
            ...stripLink(body.query),
          },
        };
      } else {
        const ref =
          body.ref ??
          (body.url ? refFromUrl(body.url, (host) => service.providerOf(host)) : undefined) ??
          (link && body.kind && body.id
            ? { ...link, kind: body.kind, id: String(body.id) }
            : undefined);
        if (!ref) {
          send(res, 400, {
            error:
              'that is not an address of an issue, a merge request, a commit or a pipeline on a connected host',
          });
          return true;
        }
        block = { kind: 'remote', ref };
      }
      block = await look(live, block);
      const spec = await live.board(address);
      let id = `card-${block.ref?.kind ?? 'list'}-${block.ref?.id ?? Date.now().toString(36)}`
        .replace(/[^\w-]/g, '')
        .slice(0, 40);
      const taken = new Set(spec.items.map((i) => i.id));
      for (let n = 2; taken.has(id); n += 1) id = `${id.replace(/-\d+$/, '')}-${n}`;
      const item: BoardItem = {
        id,
        at: body.at ?? freeSpot(spec),
        z: topZ(spec) + 1,
        // Two to a row on a page; roomier on a board.
        size: body.size ?? [spec.sheet ? 238 : block.ref?.kind === 'pipeline' ? 280 : 320],
        rotation: Math.round((Math.random() - 0.5) * 3 * 10) / 10,
        block,
      };
      const reply = await applyBoard(live, address, [{ op: 'add', item }]);
      // A commit put next to the issue it closes says so on the issue's card.
      const links = linkFixes((await live.board(address)).items);
      if (links.length) await applyBoard(live, address, links);
      send(res, 200, { id, block, reply });
      return true;
    }

    if (path === '/api/remote/act' && req.method === 'POST') {
      const body = (await readBody(req)) as { board?: string; id?: string } & Partial<{
        action: RemoteAction['action'];
        body: string;
        add: string[];
        remove: string[];
        people: string[];
      }>;
      const address = body.board ?? ask.board;
      const spec = await live.board(address);
      const item = spec.items.find((i) => i.id === body.id);
      const block = item?.block?.kind === 'remote' ? item.block : undefined;
      if (!item || !block?.ref) {
        send(res, 404, { error: 'no issue card by that id here' });
        return true;
      }
      const action = body.action;
      const what: RemoteAction | undefined =
        action === 'close' || action === 'reopen'
          ? { action }
          : action === 'comment'
            ? { action, body: body.body ?? '' }
            : action === 'label'
              ? {
                  action,
                  ...(body.add ? { add: body.add } : {}),
                  ...(body.remove ? { remove: body.remove } : {}),
                }
              : action === 'assign'
                ? { action, people: body.people ?? [] }
                : undefined;
      if (!what) {
        send(res, 400, { error: 'action is close, reopen, comment, label or assign' });
        return true;
      }
      try {
        const seen = await service.act(block.ref, what);
        const next: RemoteBlock = {
          ...withoutError(block),
          seen,
          seenAt: new Date().toISOString(),
        };
        await applyBoard(live, address, [{ op: 'update', id: item.id, patch: { block: next } }]);
        send(res, 200, { seen });
      } catch (error) {
        // Nothing on the page pretends it worked: the card keeps what it was and says why.
        const message = error instanceof Error ? error.message : String(error);
        await applyBoard(live, address, [
          { op: 'update', id: item.id, patch: { block: { ...block, error: message } } },
        ]);
        throw error;
      }
      return true;
    }

    if (path === '/api/remote/create' && req.method === 'POST') {
      const body = (await readBody(req)) as {
        board?: string;
        title?: string;
        body?: string;
        labels?: string[];
        at?: [number, number];
      };
      const address = body.board ?? ask.board;
      const link = await linkOf(live, address);
      if (!link) {
        send(res, 400, { error: 'a new issue is made from a page of a connected notebook' });
        return true;
      }
      const issue = await service.create(link, {
        title: body.title ?? '',
        ...(body.body ? { body: body.body } : {}),
        ...(body.labels?.length ? { labels: body.labels } : {}),
      });
      const spec = await live.board(address);
      const block: RemoteBlock = {
        kind: 'remote',
        ref: { ...link, kind: 'issue', id: issue.number },
        seen: issue,
        seenAt: new Date().toISOString(),
      };
      const id = `card-issue-${issue.number}`;
      await applyBoard(live, address, [
        {
          op: 'add',
          item: {
            id: spec.items.some((i) => i.id === id) ? `${id}-${Date.now().toString(36)}` : id,
            at: body.at ?? freeSpot(spec),
            z: topZ(spec) + 1,
            size: [spec.sheet ? 238 : 320],
            block,
          },
        },
      ]);
      send(res, 200, { issue });
      return true;
    }

    if (path === '/api/remote/refresh' && req.method === 'POST') {
      const body = (await readBody(req)) as { board?: string };
      send(res, 200, { changed: await refreshCards(live, body.board ?? ask.board) });
      return true;
    }

    // A service telling us something changed: every open page's cards are looked at again --
    // if the delivery is signed with this host's secret. Anything else is refused.
    if (path === '/api/remote/hook' && req.method === 'POST') {
      const raw = await readRaw(req);
      const key = await service.tokens.get(cleanHost(url.searchParams.get('host')));
      if (!verifyHook(key?.hookSecret, req.headers, raw)) {
        send(res, 401, { error: 'not signed with this host’s webhook secret' });
        return true;
      }
      for (const watched of live.watched()) {
        if (watched.startsWith('board:')) void refreshCards(live, watched.slice(6)).catch(() => 0);
      }
      send(res, 200, { ok: true });
      return true;
    }
  } catch (error) {
    fail(ask, error);
    return true;
  }
  send(res, 404, { error: 'no such repository call' });
  return true;
}

function stripLink(
  q: Partial<RemoteQuery>,
): Omit<Partial<RemoteQuery>, 'provider' | 'host' | 'repo' | 'of'> {
  const { provider: _p, host: _h, repo: _r, of: _o, ...rest } = q;
  return rest;
}

/**
 * Where a browser sign-in comes back to. It carries no workspace token -- the service sent the
 * browser here -- so it is let through only with the single-use state this process handed out a
 * moment ago, and it does exactly one thing: exchange the code for a key and keep it.
 */
export async function oauthCallback(ask: Ask, live: Live): Promise<boolean> {
  if (ask.path !== '/api/remote/oauth/callback') return false;
  const state = ask.url.searchParams.get('state') ?? '';
  const code = ask.url.searchParams.get('code') ?? '';
  const entry = recall(state);
  const page = (status: number, words: string, back?: string): void => {
    ask.res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
    ask.res.end(
      `<!doctype html><meta charset="utf-8"><title>grimstroke</title><body style="font:16px system-ui;padding:40px">` +
        `<p>${words}</p>${back ? `<p><a href="${back}">back to the notebook</a></p>` : ''}</body>`,
    );
  };
  if (!entry || !code) {
    page(
      400,
      'That sign-in was not started here, or it has expired. Start it again from the notebook.',
    );
    return true;
  }
  const app = gitlabAppId(entry.host);
  try {
    if (!app) throw new Error('no application id for that host');
    const base = live.remote.baseOf(entry.host)?.replace(/\/api\/v4$/, '');
    const token = await exchangeCode(entry.host, app, entry.redirect, code, entry.verifier, base);
    const who = await live.remote.saveKey({
      provider: 'gitlab',
      host: entry.host,
      token,
      bearer: true,
    });
    page(
      200,
      `Signed in to ${entry.host} as ${who.login}. You can close this tab.`,
      entry.book ? `/book?id=${encodeURIComponent(entry.book)}&repo` : undefined,
    );
  } catch (error) {
    page(
      502,
      `${entry.host} did not complete the sign-in: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return true;
}
