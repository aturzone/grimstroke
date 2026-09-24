/**
 * The repositories, as the workspace sees them: which hosts it has keys for, and every question
 * and action a notebook sends -- see this, list those, close that, comment, create -- answered
 * by the right adapter with the right key.
 */

import type {
  Issue,
  Merge,
  Provider,
  RemoteLink,
  RemoteQuery,
  RemoteRef,
  Seen,
} from '~/draw/doc/remote/model.ts';
import type { IssuePatch, NewIssue, Remote, Whoami } from '~/host/remote/adapter.ts';
import { Gitea } from '~/host/remote/gitea.ts';
import { GitHub } from '~/host/remote/github.ts';
import { GitLab } from '~/host/remote/gitlab.ts';
import { RemoteError } from '~/host/remote/http.ts';
import { ghToken, type HostKey, Tokens } from '~/host/remote/tokens.ts';

export type RemoteAction =
  | { action: 'close' }
  | { action: 'reopen' }
  | { action: 'comment'; body: string }
  | { action: 'label'; add?: string[]; remove?: string[] }
  | { action: 'assign'; people: string[] };

export interface ServiceOptions {
  /**
   * Where each host's API really is, for a test double or an unusual install:
   * `{ 'git.example.com': 'http://127.0.0.1:9999/api/v4' }`.
   */
  bases?: Record<string, string>;
}

export class RemoteService {
  readonly tokens: Tokens;
  private readonly bases: Record<string, string>;
  private providers = new Map<string, Provider>();

  constructor(dir: string, options: ServiceOptions = {}) {
    this.tokens = new Tokens(dir);
    this.bases = { ...parseBases(process.env.GRIMSTROKE_REMOTE_BASES), ...options.bases };
  }

  /** Which service a host is, if it has been connected: GitLab hosts have no telling names. */
  providerOf(host: string): Provider | undefined {
    return (
      this.providers.get(host) ??
      (host === 'github.com' ? 'github' : host === 'gitlab.com' ? 'gitlab' : undefined)
    );
  }

  async refreshProviders(): Promise<void> {
    this.providers = new Map((await this.tokens.summary()).map((k) => [k.host, k.provider]));
  }

  private make(provider: Provider, host: string, token: string, bearer = false): Remote {
    const base = this.bases[host];
    if (provider === 'github') return new GitHub(host, token, base);
    if (provider === 'gitlab') return new GitLab(host, token, base, bearer);
    return new Gitea(host, token, base);
  }

  /** Where a host's API really is, if a test double or an unusual install says so. */
  baseOf(host: string): string | undefined {
    return this.bases[host];
  }

  /** The adapter for a host, with its key -- or a plain explanation of what is missing. */
  async adapter(link: Pick<RemoteLink, 'provider' | 'host'>): Promise<Remote> {
    const token = await this.tokens.token(link.host);
    if (!token) {
      throw new RemoteError(
        401,
        `grimstroke has no key for ${link.host} yet -- connect it from the notebook's repository button`,
      );
    }
    const key = await this.tokens.get(link.host);
    return this.make(link.provider, link.host, token, Boolean(key?.bearer));
  }

  /**
   * Test a key and keep it. Answers with who it belongs to and what it may do; a key that the
   * service refuses is not kept.
   */
  async saveKey(input: {
    provider: Provider;
    host: string;
    token?: string;
    gh?: boolean;
    bearer?: boolean;
  }): Promise<Whoami> {
    const token = input.gh ? await ghToken(input.host) : input.token?.trim();
    if (!token) {
      throw new RemoteError(
        400,
        input.gh
          ? 'the GitHub CLI is not signed in here -- run `gh auth login`, or paste a token'
          : 'paste a token first',
      );
    }
    const who = await this.make(input.provider, input.host, token, input.bearer).whoami();
    const old = await this.tokens.get(input.host);
    const key: HostKey = {
      provider: input.provider,
      ...(input.gh ? { gh: true } : { token }),
      ...(input.bearer ? { bearer: true } : {}),
      ...(old?.hookSecret ? { hookSecret: old.hookSecret } : {}),
      user: who.login,
      savedAt: new Date().toISOString(),
    };
    await this.tokens.put(input.host, key);
    await this.refreshProviders();
    return who;
  }

  async forgetKey(host: string): Promise<void> {
    await this.tokens.remove(host);
    await this.refreshProviders();
  }

  /** The thing a ref names, as it is now. */
  async see(ref: RemoteRef): Promise<Seen> {
    const r = await this.adapter(ref);
    if (ref.kind === 'issue') return r.issue(ref.repo, ref.id);
    if (ref.kind === 'merge') return r.merge(ref.repo, ref.id);
    if (ref.kind === 'commit') return r.commit(ref.repo, ref.id);
    return r.pipeline(ref.repo, ref.id);
  }

  /** A live list's rows, as they are now. */
  async ask(q: RemoteQuery): Promise<Array<Issue | Merge>> {
    const r = await this.adapter(q);
    const query = {
      state: q.state ?? 'open',
      ...(q.labels ? { labels: q.labels } : {}),
      ...(q.assignee ? { assignee: q.assignee } : {}),
      ...(q.search ? { search: q.search } : {}),
      perPage: Math.min(50, (q.limit ?? 8) + 1),
    } as const;
    const rows = q.of === 'merges' ? await r.merges(q.repo, query) : await r.issues(q.repo, query);
    const without = new Set(q.without ?? []);
    // Not every service can leave labels out of a list, so it is done here, for all of them.
    return without.size
      ? rows.filter((row) => !('labels' in row) || !row.labels.some((l) => without.has(l.name)))
      : rows;
  }

  /** Do something to an issue on its service, and answer with it as it now is. */
  async act(ref: RemoteRef, what: RemoteAction): Promise<Seen> {
    if (ref.kind !== 'issue')
      throw new RemoteError(400, `only an issue can be ${what.action}d from a card`);
    const r = await this.adapter(ref);
    if (what.action === 'comment') {
      if (!what.body.trim()) throw new RemoteError(400, 'a reply needs some words');
      await r.comment(ref.repo, ref.id, what.body);
      return r.issue(ref.repo, ref.id);
    }
    const patch: IssuePatch =
      what.action === 'close'
        ? { state: 'closed' }
        : what.action === 'reopen'
          ? { state: 'open' }
          : what.action === 'label'
            ? {
                ...(what.add ? { addLabels: what.add } : {}),
                ...(what.remove ? { removeLabels: what.remove } : {}),
              }
            : { assignees: what.people };
    return r.update(ref.repo, ref.id, patch);
  }

  async create(link: RemoteLink, issue: NewIssue): Promise<Issue> {
    if (!issue.title.trim()) throw new RemoteError(400, 'a new issue needs a title');
    return (await this.adapter(link)).create(link.repo, issue);
  }
}

/** GRIMSTROKE_REMOTE_BASES="host=url,host=url". */
function parseBases(raw: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of (raw ?? '').split(',')) {
    const at = pair.indexOf('=');
    if (at > 0) out[pair.slice(0, at).trim()] = pair.slice(at + 1).trim();
  }
  return out;
}
