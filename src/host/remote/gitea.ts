/**
 * Gitea and Forgejo, over their v1 API at https://<host>/api/v1. The two share it; where they
 * have grown apart it is in things this does not use.
 */

import {
  type Comment,
  type Commit,
  closesIn,
  type Issue,
  type Merge,
  type Pipeline,
} from '~/draw/doc/remote/model.ts';
import {
  hex,
  type IssuePatch,
  type IssueQuery,
  type NewIssue,
  people,
  person,
  type Remote,
  type RepoSummary,
  type Whoami,
} from '~/host/remote/adapter.ts';
import { call, RemoteError } from '~/host/remote/http.ts';

type Json = Record<string, unknown>;

export class Gitea implements Remote {
  readonly provider = 'gitea' as const;
  readonly host: string;
  private readonly base: string;
  private readonly token: string;

  constructor(host: string, token: string, base?: string) {
    this.host = host;
    this.token = token;
    this.base = base ?? `https://${host}/api/v1`;
  }

  private async get<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
    const reply = await call<T>(
      `${this.base}${path}`,
      (h) => {
        h.authorization = `token ${this.token}`;
      },
      init,
    );
    return reply.body;
  }

  async whoami(): Promise<Whoami> {
    const me = await this.get<Json>('/user');
    return { ...(person(me) ?? { login: 'unknown' }), scopes: [], canWrite: true };
  }

  async repos(search?: string): Promise<RepoSummary[]> {
    const found = await this.get<{ data?: Json[] } | Json[]>(
      `/repos/search?limit=30${search ? `&q=${encodeURIComponent(search)}` : ''}`,
    );
    const list = Array.isArray(found) ? found : (found.data ?? []);
    return list.map((r) => ({
      repo: String(r.full_name),
      ...(r.description ? { description: String(r.description) } : {}),
      private: Boolean(r.private),
    }));
  }

  async repo(repo: string): Promise<{ repo: string; defaultBranch: string; canPush: boolean }> {
    const r = await this.get<Json>(`/repos/${repo}`);
    const perms = (r.permissions ?? {}) as { push?: boolean };
    return {
      repo: String(r.full_name),
      defaultBranch: String(r.default_branch ?? 'main'),
      canPush: Boolean(perms.push),
    };
  }

  private toIssue(i: Json): Issue {
    return {
      number: String(i.number),
      title: String(i.title ?? ''),
      state: i.state === 'closed' ? 'closed' : 'open',
      ...(i.body ? { body: String(i.body) } : {}),
      ...(person(i.user) ? { author: person(i.user) } : {}),
      assignees: people(i.assignees),
      labels: (Array.isArray(i.labels) ? i.labels : []).map((l) => ({
        name: String((l as Json).name),
        ...(hex((l as Json).color) ? { colour: hex((l as Json).color) } : {}),
      })),
      comments: Number(i.comments ?? 0),
      url: String(i.html_url ?? ''),
      ...(i.updated_at ? { updated: String(i.updated_at) } : {}),
      ...((i.milestone as Json | null)?.title
        ? { milestone: String((i.milestone as Json).title) }
        : {}),
    } as Issue;
  }

  async issues(repo: string, q: IssueQuery): Promise<Issue[]> {
    const params = new URLSearchParams({
      type: 'issues',
      state: q.state === 'all' ? 'all' : (q.state ?? 'open'),
      limit: String(q.perPage ?? 30),
      page: String(q.page ?? 1),
    });
    if (q.labels?.length) params.set('labels', q.labels.join(','));
    if (q.search) params.set('q', q.search);
    if (q.assignee)
      params.set('assigned_by', q.assignee === 'me' ? (await this.whoami()).login : q.assignee);
    const list = await this.get<Json[]>(`/repos/${repo}/issues?${params}`);
    return list.map((i) => this.toIssue(i));
  }

  async issue(repo: string, n: string): Promise<Issue> {
    return this.toIssue(await this.get<Json>(`/repos/${repo}/issues/${n}`));
  }

  async comments(repo: string, n: string): Promise<Comment[]> {
    const list = await this.get<Json[]>(`/repos/${repo}/issues/${n}/comments`);
    return list.map((c) => ({
      id: String(c.id),
      author: person(c.user) ?? { login: 'unknown' },
      body: String(c.body ?? ''),
      at: String(c.created_at ?? ''),
    }));
  }

  /** Gitea sets labels by id; names are what everyone else, and this app, uses. */
  private async labelIds(repo: string, names: readonly string[]): Promise<number[]> {
    const all = await this.get<Json[]>(`/repos/${repo}/labels?limit=100`);
    return all.filter((l) => names.includes(String(l.name))).map((l) => Number(l.id));
  }

  async create(repo: string, issue: NewIssue): Promise<Issue> {
    const body: Json = { title: issue.title, ...(issue.body ? { body: issue.body } : {}) };
    if (issue.labels?.length) body.labels = await this.labelIds(repo, issue.labels);
    if (issue.assignees?.length) body.assignees = issue.assignees;
    return this.toIssue(await this.get<Json>(`/repos/${repo}/issues`, { method: 'POST', body }));
  }

  async update(repo: string, n: string, patch: IssuePatch): Promise<Issue> {
    const body: Json = {};
    if (patch.state) body.state = patch.state;
    if (patch.title) body.title = patch.title;
    if (patch.body !== undefined) body.body = patch.body;
    if (patch.assignees) body.assignees = patch.assignees;
    if (Object.keys(body).length)
      await this.get<Json>(`/repos/${repo}/issues/${n}`, { method: 'PATCH', body });
    if (patch.addLabels?.length || patch.removeLabels?.length) {
      const current = (await this.issue(repo, n)).labels.map((l) => l.name);
      const names = [
        ...new Set([
          ...current.filter((l) => !patch.removeLabels?.includes(l)),
          ...(patch.addLabels ?? []),
        ]),
      ];
      await this.get<Json>(`/repos/${repo}/issues/${n}/labels`, {
        method: 'PUT',
        body: { labels: await this.labelIds(repo, names) },
      });
    }
    return this.issue(repo, n);
  }

  async comment(repo: string, n: string, text: string): Promise<Comment> {
    const c = await this.get<Json>(`/repos/${repo}/issues/${n}/comments`, {
      method: 'POST',
      body: { body: text },
    });
    return {
      id: String(c.id),
      author: person(c.user) ?? { login: 'me' },
      body: String(c.body ?? ''),
      at: String(c.created_at ?? ''),
    };
  }

  private toMerge(p: Json): Merge {
    return {
      number: String(p.number),
      title: String(p.title ?? ''),
      state: p.merged ? 'merged' : p.state === 'closed' ? 'closed' : 'open',
      ...(p.draft ? { draft: true } : {}),
      source: String(((p.head ?? {}) as Json).ref ?? ''),
      target: String(((p.base ?? {}) as Json).ref ?? ''),
      ...(person(p.user) ? { author: person(p.user) } : {}),
      checks: 'none',
      url: String(p.html_url ?? ''),
    } as Merge;
  }

  async merges(repo: string, q: IssueQuery): Promise<Merge[]> {
    const list = await this.get<Json[]>(
      `/repos/${repo}/pulls?state=${q.state === 'all' ? 'all' : (q.state ?? 'open')}&limit=${q.perPage ?? 30}&page=${q.page ?? 1}`,
    );
    return list.map((p) => this.toMerge(p));
  }

  async merge(repo: string, n: string): Promise<Merge> {
    return this.toMerge(await this.get<Json>(`/repos/${repo}/pulls/${n}`));
  }

  private toCommit(c: Json): Commit {
    const inner = (c.commit ?? {}) as Json;
    const message = String(inner.message ?? c.message ?? '');
    const author =
      person(c.author) ??
      ((inner.author as Json | undefined)?.name
        ? { login: String((inner.author as Json).name) }
        : undefined);
    return {
      sha: String(c.sha ?? ''),
      message,
      ...(author ? { author } : {}),
      ...((inner.author as Json | undefined)?.date
        ? { at: String((inner.author as Json).date) }
        : {}),
      closes: closesIn(message),
      url: String(c.html_url ?? ''),
    };
  }

  async commits(repo: string, q: { ref?: string; perPage?: number }): Promise<Commit[]> {
    const list = await this.get<Json[]>(
      `/repos/${repo}/commits?limit=${q.perPage ?? 20}${q.ref ? `&sha=${encodeURIComponent(q.ref)}` : ''}`,
    );
    return list.map((c) => this.toCommit(c));
  }

  async commit(repo: string, sha: string): Promise<Commit> {
    return this.toCommit(await this.get<Json>(`/repos/${repo}/git/commits/${sha}`));
  }

  async pipeline(repo: string, id: string): Promise<Pipeline> {
    try {
      const run = await this.get<Json>(`/repos/${repo}/actions/runs/${id}`);
      const s = String(run.status ?? '');
      const status: Pipeline['status'] =
        s === 'success'
          ? 'passed'
          : s === 'failure'
            ? 'failed'
            : s === 'running'
              ? 'running'
              : 'pending';
      return {
        id: String(run.id ?? id),
        ref: String(run.head_branch ?? ''),
        status,
        jobs: [],
        url: String(run.html_url ?? ''),
      };
    } catch (error) {
      if (error instanceof RemoteError && error.status === 404) {
        throw new RemoteError(
          404,
          'this server has no Actions runs API (it needs Gitea 1.23 or Forgejo 9)',
        );
      }
      throw error;
    }
  }

  async labels(repo: string): Promise<Array<{ name: string; colour?: string }>> {
    const list = await this.get<Json[]>(`/repos/${repo}/labels?limit=100`);
    return list.map((l) => ({
      name: String(l.name),
      ...(hex(l.color) ? { colour: hex(l.color) as string } : {}),
    }));
  }
}
