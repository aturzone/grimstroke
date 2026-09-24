/**
 * GitHub, over its REST API. github.com at api.github.com; GitHub Enterprise at
 * https://<host>/api/v3.
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
import { call } from '~/host/remote/http.ts';

type Json = Record<string, unknown>;

export class GitHub implements Remote {
  readonly provider = 'github' as const;
  readonly host: string;
  private readonly base: string;
  private readonly token: string;

  constructor(host: string, token: string, base?: string) {
    this.host = host;
    this.token = token;
    this.base =
      base ?? (host === 'github.com' ? 'https://api.github.com' : `https://${host}/api/v3`);
  }

  private async get<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
    const reply = await call<T>(
      `${this.base}${path}`,
      (h) => {
        h.authorization = `Bearer ${this.token}`;
        h.accept = 'application/vnd.github+json';
        h['x-github-api-version'] = '2022-11-28';
      },
      init,
    );
    return reply.body;
  }

  async whoami(): Promise<Whoami> {
    const reply = await call<Json>(`${this.base}/user`, (h) => {
      h.authorization = `Bearer ${this.token}`;
    });
    const scopes = (reply.headers['x-oauth-scopes'] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const me = person(reply.body) ?? { login: 'unknown' };
    // A fine-grained token lists no scopes; what it may do is decided per repository, and the
    // repository check (repo()) is where that is found out.
    return {
      ...me,
      scopes,
      canWrite: scopes.length === 0 || scopes.includes('repo') || scopes.includes('public_repo'),
    };
  }

  async repos(search?: string): Promise<RepoSummary[]> {
    const list = await this.get<Json[]>(
      '/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator,organization_member',
    );
    const q = (search ?? '').toLowerCase();
    return list
      .map((r) => ({
        repo: String(r.full_name),
        ...(r.description ? { description: String(r.description) } : {}),
        private: Boolean(r.private),
      }))
      .filter((r) => !q || r.repo.toLowerCase().includes(q))
      .slice(0, 30);
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
      labels: (Array.isArray(i.labels) ? i.labels : []).map((l) => {
        const label = l as Json;
        return {
          name: String(label.name ?? l),
          ...(hex(label.color) ? { colour: hex(label.color) } : {}),
        };
      }),
      comments: Number(i.comments ?? 0),
      url: String(i.html_url ?? ''),
      ...(i.updated_at ? { updated: String(i.updated_at) } : {}),
      ...((i.milestone as Json | null)?.title
        ? { milestone: String((i.milestone as Json).title) }
        : {}),
    } as Issue;
  }

  async issues(repo: string, q: IssueQuery): Promise<Issue[]> {
    if (q.search) {
      const parts = [`repo:${repo}`, 'is:issue', q.search];
      if (q.state && q.state !== 'all') parts.push(`is:${q.state}`);
      for (const l of q.labels ?? []) parts.push(`label:"${l}"`);
      if (q.assignee) parts.push(`assignee:${q.assignee === 'me' ? '@me' : q.assignee}`);
      const found = await this.get<{ items: Json[] }>(
        `/search/issues?q=${encodeURIComponent(parts.join(' '))}&per_page=${q.perPage ?? 30}&page=${q.page ?? 1}`,
      );
      return found.items.map((i) => this.toIssue(i));
    }
    const params = new URLSearchParams({
      state: q.state ?? 'open',
      per_page: String(q.perPage ?? 30),
      page: String(q.page ?? 1),
    });
    if (q.labels?.length) params.set('labels', q.labels.join(','));
    if (q.assignee)
      params.set('assignee', q.assignee === 'me' ? (await this.whoami()).login : q.assignee);
    const list = await this.get<Json[]>(`/repos/${repo}/issues?${params}`);
    // The issues list includes pull requests; they are merges here, not issues.
    return list.filter((i) => !i.pull_request).map((i) => this.toIssue(i));
  }

  async issue(repo: string, n: string): Promise<Issue> {
    return this.toIssue(await this.get<Json>(`/repos/${repo}/issues/${n}`));
  }

  async comments(repo: string, n: string): Promise<Comment[]> {
    const list = await this.get<Json[]>(`/repos/${repo}/issues/${n}/comments?per_page=50`);
    return list.map((c) => ({
      id: String(c.id),
      author: person(c.user) ?? { login: 'unknown' },
      body: String(c.body ?? ''),
      at: String(c.created_at ?? ''),
    }));
  }

  async create(repo: string, issue: NewIssue): Promise<Issue> {
    return this.toIssue(
      await this.get<Json>(`/repos/${repo}/issues`, { method: 'POST', body: issue }),
    );
  }

  async update(repo: string, n: string, patch: IssuePatch): Promise<Issue> {
    const body: Json = {};
    if (patch.state) body.state = patch.state;
    if (patch.title) body.title = patch.title;
    if (patch.body !== undefined) body.body = patch.body;
    if (patch.assignees) body.assignees = patch.assignees;
    if (patch.addLabels?.length || patch.removeLabels?.length) {
      const current = (await this.issue(repo, n)).labels.map((l) => l.name);
      body.labels = [
        ...new Set([
          ...current.filter((l) => !patch.removeLabels?.includes(l)),
          ...(patch.addLabels ?? []),
        ]),
      ];
    }
    return this.toIssue(
      await this.get<Json>(`/repos/${repo}/issues/${n}`, { method: 'PATCH', body }),
    );
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

  private toMerge(p: Json, checks?: Merge['checks']): Merge {
    const head = (p.head ?? {}) as Json;
    const base = (p.base ?? {}) as Json;
    return {
      number: String(p.number),
      title: String(p.title ?? ''),
      state: p.merged_at ? 'merged' : p.state === 'closed' ? 'closed' : 'open',
      ...(p.draft ? { draft: true } : {}),
      source: String(head.ref ?? ''),
      target: String(base.ref ?? ''),
      ...(person(p.user) ? { author: person(p.user) } : {}),
      ...(checks ? { checks } : {}),
      url: String(p.html_url ?? ''),
    } as Merge;
  }

  async merges(repo: string, q: IssueQuery): Promise<Merge[]> {
    const state = q.state === 'all' ? 'all' : (q.state ?? 'open');
    const list = await this.get<Json[]>(
      `/repos/${repo}/pulls?state=${state}&per_page=${q.perPage ?? 30}&page=${q.page ?? 1}`,
    );
    return list.map((p) => this.toMerge(p));
  }

  async merge(repo: string, n: string): Promise<Merge> {
    const p = await this.get<Json>(`/repos/${repo}/pulls/${n}`);
    let checks: Merge['checks'] = 'none';
    try {
      const sha = String(((p.head ?? {}) as Json).sha ?? '');
      const runs = await this.get<{ check_runs: Json[] }>(
        `/repos/${repo}/commits/${sha}/check-runs?per_page=50`,
      );
      const all = runs.check_runs;
      checks =
        all.length === 0
          ? 'none'
          : all.some((r) => r.conclusion === 'failure' || r.conclusion === 'timed_out')
            ? 'failed'
            : all.some((r) => r.status !== 'completed')
              ? 'running'
              : 'passed';
    } catch {
      // Checks are a nicety; a token that cannot read them still gets the merge request.
    }
    const reviews = await this.get<Json[]>(`/repos/${repo}/pulls/${n}/reviews`).catch(
      () => [] as Json[],
    );
    const approvals = new Set(
      reviews.filter((r) => r.state === 'APPROVED').map((r) => person(r.user)?.login),
    ).size;
    return { ...this.toMerge(p, checks), ...(approvals ? { approvals } : {}) };
  }

  private toCommit(c: Json): Commit {
    const inner = (c.commit ?? {}) as Json;
    const message = String(inner.message ?? '');
    const author =
      person(c.author) ??
      (inner.author ? { login: String((inner.author as Json).name ?? 'someone') } : undefined);
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
      `/repos/${repo}/commits?per_page=${q.perPage ?? 20}${q.ref ? `&sha=${encodeURIComponent(q.ref)}` : ''}`,
    );
    return list.map((c) => this.toCommit(c));
  }

  async commit(repo: string, sha: string): Promise<Commit> {
    return this.toCommit(await this.get<Json>(`/repos/${repo}/commits/${sha}`));
  }

  async pipeline(repo: string, id: string): Promise<Pipeline> {
    const run = await this.get<Json>(`/repos/${repo}/actions/runs/${id}`);
    const jobs = await this.get<{ jobs: Json[] }>(`/repos/${repo}/actions/runs/${id}/jobs`).catch(
      () => ({ jobs: [] }),
    );
    const status = (s: unknown, c: unknown): Pipeline['status'] =>
      s !== 'completed'
        ? s === 'queued'
          ? 'pending'
          : 'running'
        : c === 'success'
          ? 'passed'
          : c === 'skipped'
            ? 'skipped'
            : c === 'cancelled'
              ? 'cancelled'
              : 'failed';
    return {
      id: String(run.id),
      ref: String(run.head_branch ?? ''),
      status: status(run.status, run.conclusion),
      jobs: jobs.jobs.map((j) => ({
        name: String(j.name),
        status: status(j.status, j.conclusion),
      })),
      url: String(run.html_url ?? ''),
    };
  }

  async labels(repo: string): Promise<Array<{ name: string; colour?: string }>> {
    const list = await this.get<Json[]>(`/repos/${repo}/labels?per_page=100`);
    return list.map((l) => ({
      name: String(l.name),
      ...(hex(l.color) ? { colour: hex(l.color) as string } : {}),
    }));
  }
}
