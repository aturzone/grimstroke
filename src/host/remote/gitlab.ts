/**
 * GitLab, over its v4 API -- gitlab.com or a company's own instance at https://<host>/api/v4.
 * A project is named by its full path, URL-encoded, which works on every version in use.
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
  type Upload,
  type Whoami,
} from '~/host/remote/adapter.ts';
import { call } from '~/host/remote/http.ts';

type Json = Record<string, unknown>;

const STATUS: Record<string, Pipeline['status']> = {
  success: 'passed',
  failed: 'failed',
  running: 'running',
  pending: 'pending',
  created: 'pending',
  waiting_for_resource: 'pending',
  preparing: 'pending',
  scheduled: 'pending',
  manual: 'pending',
  skipped: 'skipped',
  canceled: 'cancelled',
};

export class GitLab implements Remote {
  readonly provider = 'gitlab' as const;
  readonly host: string;
  private readonly base: string;
  private readonly token: string;
  private me: string | undefined;

  private readonly bearer: boolean;

  constructor(host: string, token: string, base?: string, bearer = false) {
    this.host = host;
    this.token = token;
    this.base = base ?? `https://${host}/api/v4`;
    this.bearer = bearer;
  }

  private async get<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
    const reply = await call<T>(
      `${this.base}${path}`,
      (h) => {
        // A signed-in (OAuth) token goes as a bearer token; a personal one as PRIVATE-TOKEN.
        if (this.bearer) h.authorization = `Bearer ${this.token}`;
        else h['private-token'] = this.token;
      },
      init,
    );
    return reply.body;
  }

  private project(repo: string): string {
    return `/projects/${encodeURIComponent(repo)}`;
  }

  async whoami(): Promise<Whoami> {
    const me = await this.get<Json>('/user');
    this.me = String(me.username ?? '');
    let scopes: string[] = [];
    try {
      const self = await this.get<{ scopes?: string[] }>('/personal_access_tokens/self');
      scopes = self.scopes ?? [];
    } catch {
      // Older GitLab has no way to ask a token about itself; the first write will say.
    }
    return {
      ...(person(me) ?? { login: 'unknown' }),
      scopes,
      canWrite: scopes.length === 0 || scopes.includes('api'),
    };
  }

  private async myLogin(): Promise<string> {
    if (!this.me) await this.whoami();
    return this.me ?? '';
  }

  async repos(search?: string): Promise<RepoSummary[]> {
    const q = new URLSearchParams({
      membership: 'true',
      simple: 'true',
      per_page: '30',
      order_by: 'last_activity_at',
    });
    if (search) q.set('search', search);
    const list = await this.get<Json[]>(`/projects?${q}`);
    return list.map((p) => ({
      repo: String(p.path_with_namespace),
      ...(p.description ? { description: String(p.description) } : {}),
      private: p.visibility !== 'public',
    }));
  }

  async repo(repo: string): Promise<{ repo: string; defaultBranch: string; canPush: boolean }> {
    const p = await this.get<Json>(this.project(repo));
    const perms = (p.permissions ?? {}) as {
      project_access?: { access_level?: number } | null;
      group_access?: { access_level?: number } | null;
    };
    const level = Math.max(
      perms.project_access?.access_level ?? 0,
      perms.group_access?.access_level ?? 0,
    );
    return {
      repo: String(p.path_with_namespace),
      defaultBranch: String(p.default_branch ?? 'main'),
      canPush: level >= 30,
    };
  }

  private toIssue(i: Json): Issue {
    const labels = Array.isArray(i.labels) ? i.labels : [];
    return {
      number: String(i.iid),
      title: String(i.title ?? ''),
      state: i.state === 'closed' ? 'closed' : 'open',
      ...(i.description ? { body: String(i.description) } : {}),
      ...(person(i.author) ? { author: person(i.author) } : {}),
      assignees: people(i.assignees),
      labels: labels.map((l) =>
        typeof l === 'string'
          ? { name: l }
          : {
              name: String((l as Json).name),
              ...(hex((l as Json).color) ? { colour: hex((l as Json).color) } : {}),
            },
      ),
      comments: Number(i.user_notes_count ?? 0),
      ...(i.issue_type || i.type ? { type: String(i.issue_type ?? i.type).toLowerCase() } : {}),
      url: String(i.web_url ?? ''),
      ...(i.updated_at ? { updated: String(i.updated_at) } : {}),
      ...((i.milestone as Json | null)?.title
        ? { milestone: String((i.milestone as Json).title) }
        : {}),
    } as Issue;
  }

  private stateOf(state: IssueQuery['state']): string {
    return state === 'closed' ? 'closed' : state === 'all' ? 'all' : 'opened';
  }

  async issues(repo: string, q: IssueQuery): Promise<Issue[]> {
    const params = new URLSearchParams({
      state: this.stateOf(q.state),
      per_page: String(q.perPage ?? 30),
      page: String(q.page ?? 1),
      with_labels_details: 'true',
    });
    if (q.labels?.length) params.set('labels', q.labels.join(','));
    if (q.assignee)
      params.set('assignee_username', q.assignee === 'me' ? await this.myLogin() : q.assignee);
    if (q.search) params.set('search', q.search);
    const list = await this.get<Json[]>(`${this.project(repo)}/issues?${params}`);
    return list.map((i) => this.toIssue(i));
  }

  async issue(repo: string, n: string): Promise<Issue> {
    return this.toIssue(
      await this.get<Json>(`${this.project(repo)}/issues/${n}?with_labels_details=true`),
    );
  }

  async comments(repo: string, n: string): Promise<Comment[]> {
    const list = await this.get<Json[]>(
      `${this.project(repo)}/issues/${n}/notes?sort=asc&per_page=50`,
    );
    return list
      .filter((c) => !c.system)
      .map((c) => ({
        id: String(c.id),
        author: person(c.author) ?? { login: 'unknown' },
        body: String(c.body ?? ''),
        at: String(c.created_at ?? ''),
      }));
  }

  private async userIds(logins: readonly string[]): Promise<number[]> {
    const ids: number[] = [];
    for (const login of logins) {
      const found = await this.get<Json[]>(`/users?username=${encodeURIComponent(login)}`);
      if (found[0]?.id !== undefined) ids.push(Number(found[0].id));
    }
    return ids;
  }

  async create(repo: string, issue: NewIssue): Promise<Issue> {
    const body: Json = { title: issue.title };
    if (issue.body) body.description = issue.body;
    if (issue.labels?.length) body.labels = issue.labels.join(',');
    if (issue.assignees?.length) body.assignee_ids = await this.userIds(issue.assignees);
    return this.toIssue(
      await this.get<Json>(`${this.project(repo)}/issues`, { method: 'POST', body }),
    );
  }

  async update(repo: string, n: string, patch: IssuePatch): Promise<Issue> {
    const body: Json = {};
    if (patch.state) body.state_event = patch.state === 'closed' ? 'close' : 'reopen';
    if (patch.title) body.title = patch.title;
    if (patch.body !== undefined) body.description = patch.body;
    if (patch.addLabels?.length) body.add_labels = patch.addLabels.join(',');
    if (patch.removeLabels?.length) body.remove_labels = patch.removeLabels.join(',');
    if (patch.assignees) body.assignee_ids = await this.userIds(patch.assignees);
    await this.get<Json>(`${this.project(repo)}/issues/${n}`, { method: 'PUT', body });
    // Read back with the label colours, which the PUT reply leaves out.
    return this.issue(repo, n);
  }

  async comment(repo: string, n: string, text: string): Promise<Comment> {
    const c = await this.get<Json>(`${this.project(repo)}/issues/${n}/notes`, {
      method: 'POST',
      body: { body: text },
    });
    return {
      id: String(c.id),
      author: person(c.author) ?? { login: 'me' },
      body: String(c.body ?? ''),
      at: String(c.created_at ?? ''),
    };
  }

  private toMerge(m: Json, approvals?: number): Merge {
    const pipeline = (m.head_pipeline ?? m.pipeline) as Json | null | undefined;
    const status = pipeline ? STATUS[String(pipeline.status)] : undefined;
    return {
      number: String(m.iid),
      title: String(m.title ?? ''),
      state: m.state === 'merged' ? 'merged' : m.state === 'opened' ? 'open' : 'closed',
      ...(m.draft || m.work_in_progress ? { draft: true } : {}),
      source: String(m.source_branch ?? ''),
      target: String(m.target_branch ?? ''),
      ...(person(m.author) ? { author: person(m.author) } : {}),
      ...(approvals ? { approvals } : {}),
      checks: !status ? 'none' : status === 'skipped' || status === 'cancelled' ? 'none' : status,
      url: String(m.web_url ?? ''),
    } as Merge;
  }

  async merges(repo: string, q: IssueQuery): Promise<Merge[]> {
    const state = q.state === 'all' ? 'all' : q.state === 'closed' ? 'closed' : 'opened';
    const list = await this.get<Json[]>(
      `${this.project(repo)}/merge_requests?state=${state}&per_page=${q.perPage ?? 30}&page=${q.page ?? 1}`,
    );
    return list.map((m) => this.toMerge(m));
  }

  async merge(repo: string, n: string): Promise<Merge> {
    const m = await this.get<Json>(`${this.project(repo)}/merge_requests/${n}`);
    const approvals = await this.get<{ approved_by?: unknown[] }>(
      `${this.project(repo)}/merge_requests/${n}/approvals`,
    ).catch(() => ({ approved_by: [] }));
    return this.toMerge(m, approvals.approved_by?.length ?? 0);
  }

  private toCommit(c: Json): Commit {
    const message = String(c.message ?? c.title ?? '');
    return {
      sha: String(c.id ?? ''),
      message,
      ...(c.author_name ? { author: { login: String(c.author_name) } } : {}),
      ...(c.authored_date ? { at: String(c.authored_date) } : {}),
      closes: closesIn(message),
      url: String(c.web_url ?? ''),
    };
  }

  async commits(repo: string, q: { ref?: string; perPage?: number }): Promise<Commit[]> {
    const list = await this.get<Json[]>(
      `${this.project(repo)}/repository/commits?per_page=${q.perPage ?? 20}${q.ref ? `&ref_name=${encodeURIComponent(q.ref)}` : ''}`,
    );
    return list.map((c) => this.toCommit(c));
  }

  async commit(repo: string, sha: string): Promise<Commit> {
    return this.toCommit(await this.get<Json>(`${this.project(repo)}/repository/commits/${sha}`));
  }

  async pipeline(repo: string, id: string): Promise<Pipeline> {
    const p = await this.get<Json>(`${this.project(repo)}/pipelines/${id}`);
    const jobs = await this.get<Json[]>(
      `${this.project(repo)}/pipelines/${id}/jobs?per_page=50`,
    ).catch(() => [] as Json[]);
    return {
      id: String(p.id),
      ref: String(p.ref ?? ''),
      status: STATUS[String(p.status)] ?? 'pending',
      jobs: jobs.map((j) => ({
        name: String(j.name),
        status: STATUS[String(j.status)] ?? 'pending',
      })),
      url: String(p.web_url ?? ''),
    };
  }

  async labels(repo: string): Promise<Array<{ name: string; colour?: string }>> {
    const list = await this.get<Json[]>(`${this.project(repo)}/labels?per_page=100`);
    return list.map((l) => ({
      name: String(l.name),
      ...(hex(l.color) ? { colour: hex(l.color) as string } : {}),
    }));
  }

  async attach(repo: string, _issue: string, file: Upload): Promise<string> {
    const form = new FormData();
    form.append('file', new Blob([file.bytes], { type: file.type }), file.name);
    const up = await this.get<Json>(`${this.project(repo)}/uploads`, {
      method: 'POST',
      body: form,
    });
    return String(up.markdown ?? `![${file.name}](${String(up.url ?? '')})`);
  }
}
