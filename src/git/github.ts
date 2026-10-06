/**
 * GitHub, over its REST API. github.com at api.github.com; GitHub Enterprise at
 * https://<host>/api/v3.
 */

import {
  type Branch,
  type CodeHit,
  type Comparison,
  type FileChange,
  type FileText,
  type HistoryQuery,
  hex,
  type IssuePatch,
  type IssueQuery,
  type LabelEdit,
  type MergeMethod,
  type MergePatch,
  type Milestone,
  type NewIssue,
  type NewMerge,
  type NewRelease,
  type Notice,
  people,
  person,
  type Release,
  type Remote,
  type RepoInfo,
  type RepoSummary,
  RUN_STATUS,
  type Run,
  type Tag,
  type Upload,
  type Verdict,
  type Whoami,
} from '@core/git/adapter.ts';
import { call, RemoteError } from '@core/git/http.ts';
import {
  type Comment,
  type Commit,
  closesIn,
  type Issue,
  type Label,
  type Merge,
  type Person,
  type Pipeline,
} from '@core/git/model.ts';

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

  /**
   * GitHub has no API for an issue's pictures, so they go on a branch of their own,
   * grimstroke-uploads -- made from the default branch the first time, and never merged -- and
   * the issue links them there. Someone who can see the repository can see the picture.
   */
  async attach(repo: string, issue: string, file: Upload): Promise<string> {
    const branch = 'grimstroke-uploads';
    try {
      await this.get<Json>(`/repos/${repo}/git/ref/heads/${branch}`);
    } catch {
      const { defaultBranch } = await this.repo(repo);
      const head = await this.get<Json>(`/repos/${repo}/git/ref/heads/${defaultBranch}`);
      const sha = String((head.object as Json | undefined)?.sha ?? '');
      await this.get<Json>(`/repos/${repo}/git/refs`, {
        method: 'POST',
        body: { ref: `refs/heads/${branch}`, sha },
      });
    }
    const safe = file.name.replace(/[^\w.-]+/g, '-').slice(-60) || 'picture.png';
    const path = `issues/${issue}/${Date.now().toString(36)}-${safe}`;
    await this.get<Json>(`/repos/${repo}/contents/${path}`, {
      method: 'PUT',
      body: {
        message: `picture for #${issue}`,
        content: Buffer.from(file.bytes).toString('base64'),
        branch,
      },
    });
    return `![${file.name}](https://${this.host}/${repo}/blob/${branch}/${path}?raw=true)`;
  }

  // ---------------------------------------------------------------- the rest of git

  async lock(repo: string, n: string, locked: boolean): Promise<void> {
    await this.get(`/repos/${repo}/issues/${n}/lock`, {
      method: locked ? 'PUT' : 'DELETE',
      ...(locked ? { body: {} } : {}),
    });
  }

  private toMilestone(m: Json): Milestone {
    return {
      id: String(m.number),
      title: String(m.title ?? ''),
      state: m.state === 'closed' ? 'closed' : 'open',
      ...(m.due_on ? { due: String(m.due_on) } : {}),
      ...(m.description ? { description: String(m.description) } : {}),
      ...(m.html_url ? { url: String(m.html_url) } : {}),
    };
  }

  async milestones(repo: string, state: 'open' | 'closed' | 'all' = 'open'): Promise<Milestone[]> {
    const list = await this.get<Json[]>(`/repos/${repo}/milestones?state=${state}&per_page=50`);
    return list.map((m) => this.toMilestone(m));
  }

  async createMilestone(repo: string, title: string, description?: string): Promise<Milestone> {
    return this.toMilestone(
      await this.get<Json>(`/repos/${repo}/milestones`, {
        method: 'POST',
        body: { title, ...(description ? { description } : {}) },
      }),
    );
  }

  private async milestoneNamed(repo: string, title: string): Promise<Milestone> {
    const all = await this.milestones(repo, 'all');
    const m =
      all.find((x) => x.title === title) ??
      all.find((x) => x.title.toLowerCase() === title.toLowerCase());
    if (!m) throw new RemoteError(404, `no milestone called ${title} in ${repo}`);
    return m;
  }

  async closeMilestone(repo: string, title: string): Promise<Milestone> {
    const m = await this.milestoneNamed(repo, title);
    return this.toMilestone(
      await this.get<Json>(`/repos/${repo}/milestones/${m.id}`, {
        method: 'PATCH',
        body: { state: 'closed' },
      }),
    );
  }

  async setMilestone(repo: string, n: string, title: string): Promise<Issue> {
    const m = await this.milestoneNamed(repo, title);
    return this.toIssue(
      await this.get<Json>(`/repos/${repo}/issues/${n}`, {
        method: 'PATCH',
        body: { milestone: Number(m.id) },
      }),
    );
  }

  async createMerge(repo: string, m: NewMerge): Promise<Merge> {
    return this.toMerge(
      await this.get<Json>(`/repos/${repo}/pulls`, {
        method: 'POST',
        body: {
          title: m.title,
          head: m.source,
          base: m.target,
          ...(m.body ? { body: m.body } : {}),
          ...(m.draft ? { draft: true } : {}),
        },
      }),
    );
  }

  async updateMerge(repo: string, n: string, patch: MergePatch): Promise<Merge> {
    // A pull request is an issue too: its labels and people are changed as an issue's are.
    if (patch.addLabels || patch.removeLabels || patch.assignees)
      await this.update(repo, n, {
        ...(patch.addLabels ? { addLabels: patch.addLabels } : {}),
        ...(patch.removeLabels ? { removeLabels: patch.removeLabels } : {}),
        ...(patch.assignees ? { assignees: patch.assignees } : {}),
      });
    const body: Json = {};
    if (patch.title) body.title = patch.title;
    if (patch.body !== undefined) body.body = patch.body;
    if (patch.target) body.base = patch.target;
    if (patch.state) body.state = patch.state;
    if (!Object.keys(body).length) return this.merge(repo, n);
    return this.toMerge(
      await this.get<Json>(`/repos/${repo}/pulls/${n}`, { method: 'PATCH', body }),
    );
  }

  async mergeMerge(
    repo: string,
    n: string,
    how: { method?: MergeMethod; message?: string } = {},
  ): Promise<Merge> {
    await this.get<Json>(`/repos/${repo}/pulls/${n}/merge`, {
      method: 'PUT',
      body: {
        merge_method: how.method ?? 'merge',
        ...(how.message ? { commit_message: how.message } : {}),
      },
    });
    return this.merge(repo, n);
  }

  async review(repo: string, n: string, verdict: Verdict, body?: string): Promise<void> {
    const event =
      verdict === 'approve'
        ? 'APPROVE'
        : verdict === 'request-changes'
          ? 'REQUEST_CHANGES'
          : 'COMMENT';
    await this.get<Json>(`/repos/${repo}/pulls/${n}/reviews`, {
      method: 'POST',
      body: { event, ...(body ? { body } : {}) },
    });
  }

  async requestReview(repo: string, n: string, people: string[]): Promise<void> {
    await this.get<Json>(`/repos/${repo}/pulls/${n}/requested_reviewers`, {
      method: 'POST',
      body: { reviewers: people },
    });
  }

  /** REST cannot take a pull request out of draft; GraphQL can. */
  async ready(repo: string, n: string): Promise<Merge> {
    const p = await this.get<Json>(`/repos/${repo}/pulls/${n}`);
    const graphql = this.base.endsWith('/api/v3')
      ? `${this.base.slice(0, -3)}graphql`
      : `${this.base}/graphql`;
    const reply = await call<{ errors?: Array<{ message: string }> }>(
      graphql,
      (h) => {
        h.authorization = `Bearer ${this.token}`;
      },
      {
        method: 'POST',
        body: {
          query:
            'mutation($id: ID!) { markPullRequestReadyForReview(input: {pullRequestId: $id}) { clientMutationId } }',
          variables: { id: String(p.node_id ?? '') },
        },
      },
    );
    if (reply.body?.errors?.length)
      throw new RemoteError(422, reply.body.errors.map((e) => e.message).join('; '));
    return this.merge(repo, n);
  }

  async mergeFiles(repo: string, n: string): Promise<FileChange[]> {
    const list = await this.get<Json[]>(`/repos/${repo}/pulls/${n}/files?per_page=100`);
    return list.map((f) => ({
      path: String(f.filename ?? ''),
      status: String(f.status ?? 'modified'),
      additions: Number(f.additions ?? 0),
      deletions: Number(f.deletions ?? 0),
    }));
  }

  mergeComment(repo: string, n: string, body: string): Promise<Comment> {
    return this.comment(repo, n, body);
  }

  async branches(repo: string): Promise<Branch[]> {
    const list = await this.get<Json[]>(`/repos/${repo}/branches?per_page=100`);
    return list.map((b) => ({
      name: String(b.name),
      sha: String(((b.commit ?? {}) as Json).sha ?? ''),
      ...(b.protected ? { protected: true } : {}),
    }));
  }

  private async shaOf(repo: string, ref: string): Promise<string> {
    return String(
      (await this.get<Json>(`/repos/${repo}/commits/${encodeURIComponent(ref)}`)).sha ?? '',
    );
  }

  async createBranch(repo: string, name: string, from?: string): Promise<Branch> {
    const sha = await this.shaOf(repo, from ?? (await this.repo(repo)).defaultBranch);
    await this.get<Json>(`/repos/${repo}/git/refs`, {
      method: 'POST',
      body: { ref: `refs/heads/${name}`, sha },
    });
    return { name, sha };
  }

  async deleteBranch(repo: string, name: string): Promise<void> {
    await this.get(`/repos/${repo}/git/refs/heads/${name}`, { method: 'DELETE' });
  }

  async renameBranch(repo: string, from: string, to: string): Promise<Branch> {
    const b = await this.get<Json>(`/repos/${repo}/branches/${from}/rename`, {
      method: 'POST',
      body: { new_name: to },
    });
    return { name: String(b.name ?? to), sha: String(((b.commit ?? {}) as Json).sha ?? '') };
  }

  async history(repo: string, q: HistoryQuery): Promise<Commit[]> {
    const params = new URLSearchParams({ per_page: String(q.perPage ?? 20) });
    if (q.ref) params.set('sha', q.ref);
    if (q.author) params.set('author', q.author);
    if (q.path) params.set('path', q.path);
    const list = await this.get<Json[]>(`/repos/${repo}/commits?${params}`);
    return list.map((c) => this.toCommit(c));
  }

  async compare(repo: string, base: string, head: string): Promise<Comparison> {
    const c = await this.get<Json>(
      `/repos/${repo}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`,
    );
    return {
      ahead: Number(c.ahead_by ?? 0),
      behind: Number(c.behind_by ?? 0),
      commits: (Array.isArray(c.commits) ? (c.commits as Json[]) : []).map((x) => this.toCommit(x)),
      files: (Array.isArray(c.files) ? (c.files as Json[]) : []).map((f) => ({
        path: String(f.filename ?? ''),
        status: String(f.status ?? 'modified'),
        additions: Number(f.additions ?? 0),
        deletions: Number(f.deletions ?? 0),
      })),
      ...(c.html_url ? { url: String(c.html_url) } : {}),
    };
  }

  async runs(repo: string, q: { ref?: string; perPage?: number }): Promise<Run[]> {
    const params = new URLSearchParams({ per_page: String(q.perPage ?? 10) });
    if (q.ref) params.set('branch', q.ref);
    const found = await this.get<{ workflow_runs?: Json[] }>(
      `/repos/${repo}/actions/runs?${params}`,
    );
    return (found.workflow_runs ?? []).map((r) => ({
      id: String(r.id),
      name: String(r.name ?? r.display_title ?? 'run'),
      ref: String(r.head_branch ?? ''),
      ...(r.head_sha ? { sha: String(r.head_sha) } : {}),
      status:
        r.status === 'completed'
          ? (RUN_STATUS[String(r.conclusion)] ?? 'failed')
          : (RUN_STATUS[String(r.status)] ?? 'running'),
      url: String(r.html_url ?? ''),
      ...(r.created_at ? { at: String(r.created_at) } : {}),
    }));
  }

  async rerun(repo: string, id: string): Promise<void> {
    const run = await this.get<Json>(`/repos/${repo}/actions/runs/${id}`);
    // A failed run reruns what failed; any other, all of it.
    const failed = run.status === 'completed' && run.conclusion !== 'success';
    await this.get(`/repos/${repo}/actions/runs/${id}/${failed ? 'rerun-failed-jobs' : 'rerun'}`, {
      method: 'POST',
      body: {},
    });
  }

  async cancelRun(repo: string, id: string): Promise<void> {
    await this.get(`/repos/${repo}/actions/runs/${id}/cancel`, { method: 'POST', body: {} });
  }

  private toRelease(r: Json): Release {
    return {
      tag: String(r.tag_name ?? ''),
      name: String(r.name || r.tag_name || ''),
      ...(r.body ? { body: String(r.body) } : {}),
      ...(r.draft ? { draft: true } : {}),
      ...(r.prerelease ? { prerelease: true } : {}),
      ...(r.published_at ? { at: String(r.published_at) } : {}),
      url: String(r.html_url ?? ''),
    };
  }

  async releases(repo: string, perPage = 10): Promise<Release[]> {
    return (await this.get<Json[]>(`/repos/${repo}/releases?per_page=${perPage}`)).map((r) =>
      this.toRelease(r),
    );
  }

  async release(repo: string, tag?: string): Promise<Release> {
    return this.toRelease(
      await this.get<Json>(
        `/repos/${repo}/releases/${tag ? `tags/${encodeURIComponent(tag)}` : 'latest'}`,
      ),
    );
  }

  async createRelease(repo: string, r: NewRelease): Promise<Release> {
    return this.toRelease(
      await this.get<Json>(`/repos/${repo}/releases`, {
        method: 'POST',
        body: {
          tag_name: r.tag,
          name: r.name ?? r.tag,
          ...(r.body ? { body: r.body } : {}),
          ...(r.ref ? { target_commitish: r.ref } : {}),
          ...(r.draft ? { draft: true } : {}),
        },
      }),
    );
  }

  async deleteRelease(repo: string, tag: string): Promise<void> {
    const r = await this.get<Json>(`/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`);
    await this.get(`/repos/${repo}/releases/${r.id}`, { method: 'DELETE' });
  }

  async tags(repo: string, perPage = 30): Promise<Tag[]> {
    const list = await this.get<Json[]>(`/repos/${repo}/tags?per_page=${perPage}`);
    return list.map((t) => ({
      name: String(t.name),
      sha: String(((t.commit ?? {}) as Json).sha ?? ''),
    }));
  }

  async createTag(repo: string, name: string, ref: string, message?: string): Promise<Tag> {
    let sha = await this.shaOf(repo, ref);
    if (message) {
      // An annotated tag is an object of its own, which the ref then points at.
      const tag = await this.get<Json>(`/repos/${repo}/git/tags`, {
        method: 'POST',
        body: { tag: name, message, object: sha, type: 'commit' },
      });
      sha = String(tag.sha ?? sha);
    }
    await this.get<Json>(`/repos/${repo}/git/refs`, {
      method: 'POST',
      body: { ref: `refs/tags/${name}`, sha },
    });
    return { name, sha };
  }

  async deleteTag(repo: string, name: string): Promise<void> {
    await this.get(`/repos/${repo}/git/refs/tags/${name}`, { method: 'DELETE' });
  }

  private toLabel(l: Json): Label {
    return { name: String(l.name), ...(hex(l.color) ? { colour: hex(l.color) as string } : {}) };
  }

  async createLabel(repo: string, label: LabelEdit & { name: string }): Promise<Label> {
    return this.toLabel(
      await this.get<Json>(`/repos/${repo}/labels`, {
        method: 'POST',
        body: {
          name: label.name,
          color: (label.colour ?? '#ededed').replace('#', ''),
          ...(label.description ? { description: label.description } : {}),
        },
      }),
    );
  }

  async editLabel(repo: string, name: string, edit: LabelEdit): Promise<Label> {
    return this.toLabel(
      await this.get<Json>(`/repos/${repo}/labels/${encodeURIComponent(name)}`, {
        method: 'PATCH',
        body: {
          ...(edit.name ? { new_name: edit.name } : {}),
          ...(edit.colour ? { color: edit.colour.replace('#', '') } : {}),
          ...(edit.description !== undefined ? { description: edit.description } : {}),
        },
      }),
    );
  }

  async deleteLabel(repo: string, name: string): Promise<void> {
    await this.get(`/repos/${repo}/labels/${encodeURIComponent(name)}`, { method: 'DELETE' });
  }

  private toInfo(r: Json): RepoInfo {
    return {
      repo: String(r.full_name),
      ...(r.description ? { description: String(r.description) } : {}),
      private: Boolean(r.private),
      defaultBranch: String(r.default_branch ?? 'main'),
      stars: Number(r.stargazers_count ?? 0),
      forks: Number(r.forks_count ?? 0),
      openIssues: Number(r.open_issues_count ?? 0),
      url: String(r.html_url ?? ''),
    };
  }

  async info(repo: string): Promise<RepoInfo> {
    return this.toInfo(await this.get<Json>(`/repos/${repo}`));
  }

  async createRepo(r: {
    name: string;
    description?: string;
    private?: boolean;
  }): Promise<RepoInfo> {
    // "org/name" makes it in the organisation; a bare name, the user's own.
    const [owner, name] = r.name.includes('/') ? r.name.split('/', 2) : [undefined, r.name];
    return this.toInfo(
      await this.get<Json>(owner ? `/orgs/${owner}/repos` : '/user/repos', {
        method: 'POST',
        body: {
          name,
          ...(r.description ? { description: r.description } : {}),
          private: Boolean(r.private),
        },
      }),
    );
  }

  async fork(repo: string): Promise<RepoInfo> {
    return this.toInfo(await this.get<Json>(`/repos/${repo}/forks`, { method: 'POST', body: {} }));
  }

  async star(repo: string, on: boolean): Promise<void> {
    await this.get(`/user/starred/${repo}`, { method: on ? 'PUT' : 'DELETE' });
  }

  async deleteRepo(repo: string): Promise<void> {
    await this.get(`/repos/${repo}`, { method: 'DELETE' });
  }

  async file(repo: string, path: string, ref?: string): Promise<FileText> {
    const f = await this.get<Json>(
      `/repos/${repo}/contents/${path}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`,
    );
    if (Array.isArray(f)) throw new RemoteError(400, `${path} is a folder`);
    return {
      path: String(f.path ?? path),
      text: Buffer.from(String(f.content ?? ''), 'base64').toString('utf8'),
      size: Number(f.size ?? 0),
      url: String(f.html_url ?? ''),
    };
  }

  async searchCode(repo: string, q: string): Promise<CodeHit[]> {
    const found = await this.get<{ items?: Json[] }>(
      `/search/code?q=${encodeURIComponent(`${q} repo:${repo}`)}&per_page=20`,
    );
    return (found.items ?? []).map((i) => ({
      path: String(i.path ?? ''),
      repo: String(((i.repository ?? {}) as Json).full_name ?? repo),
      url: String(i.html_url ?? ''),
    }));
  }

  async members(repo: string): Promise<Person[]> {
    // Collaborators need push access to list; anyone can see who contributed.
    const list = await this.get<Json[]>(`/repos/${repo}/collaborators?per_page=100`).catch(() =>
      this.get<Json[]>(`/repos/${repo}/contributors?per_page=100`),
    );
    return people(list);
  }

  async notices(): Promise<Notice[]> {
    const list = await this.get<Json[]>('/notifications?per_page=50');
    return list.map((n) => {
      const subject = (n.subject ?? {}) as Json;
      return {
        id: String(n.id),
        title: String(subject.title ?? ''),
        repo: String(((n.repository ?? {}) as Json).full_name ?? ''),
        kind: String(subject.type ?? ''),
        unread: Boolean(n.unread),
        ...(n.updated_at ? { at: String(n.updated_at) } : {}),
      };
    });
  }

  async readNotices(): Promise<void> {
    await this.get('/notifications', { method: 'PUT', body: {} });
  }
}
