/**
 * GitLab, over its v4 API -- gitlab.com or a company's own instance at https://<host>/api/v4.
 * A project is named by its full path, URL-encoded, which works on every version in use.
 */

import {
  type Branch,
  type CodeHit,
  type Comparison,
  cannot,
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

  // ---------------------------------------------------------------- the rest of git

  async lock(repo: string, n: string, locked: boolean): Promise<void> {
    await this.get(`${this.project(repo)}/issues/${n}`, {
      method: 'PUT',
      body: { discussion_locked: locked },
    });
  }

  private toMilestone(m: Json): Milestone {
    return {
      id: String(m.id),
      title: String(m.title ?? ''),
      state: m.state === 'closed' ? 'closed' : 'open',
      ...(m.due_date ? { due: String(m.due_date) } : {}),
      ...(m.description ? { description: String(m.description) } : {}),
      ...(m.web_url ? { url: String(m.web_url) } : {}),
    };
  }

  async milestones(repo: string, state: 'open' | 'closed' | 'all' = 'open'): Promise<Milestone[]> {
    const s = state === 'open' ? '&state=active' : state === 'closed' ? '&state=closed' : '';
    const list = await this.get<Json[]>(`${this.project(repo)}/milestones?per_page=50${s}`);
    return list.map((m) => this.toMilestone(m));
  }

  async createMilestone(repo: string, title: string, description?: string): Promise<Milestone> {
    return this.toMilestone(
      await this.get<Json>(`${this.project(repo)}/milestones`, {
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
      await this.get<Json>(`${this.project(repo)}/milestones/${m.id}`, {
        method: 'PUT',
        body: { state_event: 'close' },
      }),
    );
  }

  async setMilestone(repo: string, n: string, title: string): Promise<Issue> {
    const m = await this.milestoneNamed(repo, title);
    await this.get(`${this.project(repo)}/issues/${n}`, {
      method: 'PUT',
      body: { milestone_id: Number(m.id) },
    });
    return this.issue(repo, n);
  }

  async createMerge(repo: string, m: NewMerge): Promise<Merge> {
    return this.toMerge(
      await this.get<Json>(`${this.project(repo)}/merge_requests`, {
        method: 'POST',
        body: {
          // A draft is said in the title on GitLab.
          title: m.draft ? `Draft: ${m.title}` : m.title,
          source_branch: m.source,
          target_branch: m.target,
          ...(m.body ? { description: m.body } : {}),
        },
      }),
    );
  }

  async updateMerge(repo: string, n: string, patch: MergePatch): Promise<Merge> {
    const body: Json = {};
    if (patch.title) body.title = patch.title;
    if (patch.body !== undefined) body.description = patch.body;
    if (patch.target) body.target_branch = patch.target;
    if (patch.state) body.state_event = patch.state === 'closed' ? 'close' : 'reopen';
    if (patch.addLabels?.length) body.add_labels = patch.addLabels.join(',');
    if (patch.removeLabels?.length) body.remove_labels = patch.removeLabels.join(',');
    if (patch.assignees) body.assignee_ids = await this.userIds(patch.assignees);
    return this.toMerge(
      await this.get<Json>(`${this.project(repo)}/merge_requests/${n}`, { method: 'PUT', body }),
    );
  }

  async mergeMerge(
    repo: string,
    n: string,
    how: { method?: MergeMethod; message?: string } = {},
  ): Promise<Merge> {
    if (how.method === 'rebase')
      await this.get(`${this.project(repo)}/merge_requests/${n}/rebase`, {
        method: 'PUT',
        body: {},
      });
    await this.get<Json>(`${this.project(repo)}/merge_requests/${n}/merge`, {
      method: 'PUT',
      body: {
        ...(how.method === 'squash' ? { squash: true } : {}),
        ...(how.message ? { merge_commit_message: how.message } : {}),
      },
    });
    return this.merge(repo, n);
  }

  async review(repo: string, n: string, verdict: Verdict, body?: string): Promise<void> {
    if (verdict === 'approve')
      await this.get(`${this.project(repo)}/merge_requests/${n}/approve`, {
        method: 'POST',
        body: {},
      });
    // GitLab has no "changes requested" state to set; it is said, and the approval taken back.
    if (verdict === 'request-changes')
      await this.get(`${this.project(repo)}/merge_requests/${n}/unapprove`, {
        method: 'POST',
        body: {},
      }).catch(() => undefined);
    if (body || verdict !== 'approve')
      await this.mergeComment(
        repo,
        n,
        verdict === 'request-changes' ? `Changes requested: ${body ?? ''}`.trim() : (body ?? ''),
      );
  }

  async requestReview(repo: string, n: string, people: string[]): Promise<void> {
    await this.get(`${this.project(repo)}/merge_requests/${n}`, {
      method: 'PUT',
      body: { reviewer_ids: await this.userIds(people) },
    });
  }

  async ready(repo: string, n: string): Promise<Merge> {
    const m = await this.get<Json>(`${this.project(repo)}/merge_requests/${n}`);
    const title = String(m.title ?? '').replace(/^\s*(?:\[?(?:draft|wip)\]?:?\s*)+/i, '');
    return this.updateMerge(repo, n, { title });
  }

  async mergeFiles(repo: string, n: string): Promise<FileChange[]> {
    const m = await this.get<{ changes?: Json[] }>(
      `${this.project(repo)}/merge_requests/${n}/changes`,
    );
    return (m.changes ?? []).map((c) => {
      const diff = String(c.diff ?? '');
      return {
        path: String(c.new_path ?? c.old_path ?? ''),
        status: c.new_file
          ? 'added'
          : c.deleted_file
            ? 'removed'
            : c.renamed_file
              ? 'renamed'
              : 'modified',
        additions: (diff.match(/^\+(?!\+\+)/gm) ?? []).length,
        deletions: (diff.match(/^-(?!--)/gm) ?? []).length,
      };
    });
  }

  async mergeComment(repo: string, n: string, body: string): Promise<Comment> {
    const c = await this.get<Json>(`${this.project(repo)}/merge_requests/${n}/notes`, {
      method: 'POST',
      body: { body },
    });
    return {
      id: String(c.id),
      author: person(c.author) ?? { login: 'me' },
      body: String(c.body ?? ''),
      at: String(c.created_at ?? ''),
    };
  }

  async branches(repo: string): Promise<Branch[]> {
    const list = await this.get<Json[]>(`${this.project(repo)}/repository/branches?per_page=100`);
    return list.map((b) => ({
      name: String(b.name),
      sha: String(((b.commit ?? {}) as Json).id ?? ''),
      ...(b.protected ? { protected: true } : {}),
    }));
  }

  async createBranch(repo: string, name: string, from?: string): Promise<Branch> {
    const ref = from ?? (await this.repo(repo)).defaultBranch;
    const b = await this.get<Json>(
      `${this.project(repo)}/repository/branches?branch=${encodeURIComponent(name)}&ref=${encodeURIComponent(ref)}`,
      { method: 'POST', body: {} },
    );
    return { name: String(b.name ?? name), sha: String(((b.commit ?? {}) as Json).id ?? '') };
  }

  async deleteBranch(repo: string, name: string): Promise<void> {
    await this.get(`${this.project(repo)}/repository/branches/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
  }

  renameBranch(): Promise<Branch> {
    return cannot('GitLab', 'rename a branch: make the new one from it, then delete the old');
  }

  async history(repo: string, q: HistoryQuery): Promise<Commit[]> {
    const params = new URLSearchParams({ per_page: String(q.perPage ?? 20) });
    if (q.ref) params.set('ref_name', q.ref);
    if (q.author) params.set('author', q.author);
    if (q.path) params.set('path', q.path);
    const list = await this.get<Json[]>(`${this.project(repo)}/repository/commits?${params}`);
    return list.map((c) => this.toCommit(c));
  }

  async compare(repo: string, base: string, head: string): Promise<Comparison> {
    const q = (from: string, to: string) =>
      this.get<{ commits?: Json[]; diffs?: Json[]; web_url?: string }>(
        `${this.project(repo)}/repository/compare?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&straight=false`,
      );
    const [ahead, behind] = await Promise.all([q(base, head), q(head, base)]);
    return {
      ahead: ahead.commits?.length ?? 0,
      behind: behind.commits?.length ?? 0,
      commits: (ahead.commits ?? []).map((c) => this.toCommit(c)),
      files: (ahead.diffs ?? []).map((d) => ({
        path: String(d.new_path ?? d.old_path ?? ''),
        status: d.new_file ? 'added' : d.deleted_file ? 'removed' : 'modified',
        additions: (String(d.diff ?? '').match(/^\+(?!\+\+)/gm) ?? []).length,
        deletions: (String(d.diff ?? '').match(/^-(?!--)/gm) ?? []).length,
      })),
      ...(ahead.web_url ? { url: ahead.web_url } : {}),
    };
  }

  async runs(repo: string, q: { ref?: string; perPage?: number }): Promise<Run[]> {
    const params = new URLSearchParams({ per_page: String(q.perPage ?? 10) });
    if (q.ref) params.set('ref', q.ref);
    const list = await this.get<Json[]>(`${this.project(repo)}/pipelines?${params}`);
    return list.map((p) => ({
      id: String(p.id),
      name: `pipeline ${String(p.id)}`,
      ref: String(p.ref ?? ''),
      ...(p.sha ? { sha: String(p.sha) } : {}),
      status: RUN_STATUS[String(p.status)] ?? 'pending',
      url: String(p.web_url ?? ''),
      ...(p.created_at ? { at: String(p.created_at) } : {}),
    }));
  }

  async rerun(repo: string, id: string): Promise<void> {
    await this.get(`${this.project(repo)}/pipelines/${id}/retry`, { method: 'POST', body: {} });
  }

  async cancelRun(repo: string, id: string): Promise<void> {
    await this.get(`${this.project(repo)}/pipelines/${id}/cancel`, { method: 'POST', body: {} });
  }

  private toRelease(r: Json): Release {
    const links = (r._links ?? {}) as Json;
    return {
      tag: String(r.tag_name ?? ''),
      name: String(r.name || r.tag_name || ''),
      ...(r.description ? { body: String(r.description) } : {}),
      ...(r.upcoming_release ? { prerelease: true } : {}),
      ...(r.released_at ? { at: String(r.released_at) } : {}),
      url: String(links.self ?? ''),
    };
  }

  async releases(repo: string, perPage = 10): Promise<Release[]> {
    return (await this.get<Json[]>(`${this.project(repo)}/releases?per_page=${perPage}`)).map((r) =>
      this.toRelease(r),
    );
  }

  async release(repo: string, tag?: string): Promise<Release> {
    if (!tag) {
      const [latest] = await this.releases(repo, 1);
      if (!latest) throw new RemoteError(404, `${repo} has no releases yet`);
      return latest;
    }
    return this.toRelease(
      await this.get<Json>(`${this.project(repo)}/releases/${encodeURIComponent(tag)}`),
    );
  }

  async createRelease(repo: string, r: NewRelease): Promise<Release> {
    return this.toRelease(
      await this.get<Json>(`${this.project(repo)}/releases`, {
        method: 'POST',
        body: {
          tag_name: r.tag,
          name: r.name ?? r.tag,
          ...(r.body ? { description: r.body } : {}),
          ...(r.ref ? { ref: r.ref } : { ref: (await this.repo(repo)).defaultBranch }),
        },
      }),
    );
  }

  async deleteRelease(repo: string, tag: string): Promise<void> {
    await this.get(`${this.project(repo)}/releases/${encodeURIComponent(tag)}`, {
      method: 'DELETE',
    });
  }

  async tags(repo: string, perPage = 30): Promise<Tag[]> {
    const list = await this.get<Json[]>(
      `${this.project(repo)}/repository/tags?per_page=${perPage}`,
    );
    return list.map((t) => ({
      name: String(t.name),
      sha: String(((t.commit ?? {}) as Json).id ?? ''),
    }));
  }

  async createTag(repo: string, name: string, ref: string, message?: string): Promise<Tag> {
    const t = await this.get<Json>(`${this.project(repo)}/repository/tags`, {
      method: 'POST',
      body: { tag_name: name, ref, ...(message ? { message } : {}) },
    });
    return { name: String(t.name ?? name), sha: String(((t.commit ?? {}) as Json).id ?? '') };
  }

  async deleteTag(repo: string, name: string): Promise<void> {
    await this.get(`${this.project(repo)}/repository/tags/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
  }

  private toLabel(l: Json): Label {
    return { name: String(l.name), ...(hex(l.color) ? { colour: hex(l.color) as string } : {}) };
  }

  async createLabel(repo: string, label: LabelEdit & { name: string }): Promise<Label> {
    return this.toLabel(
      await this.get<Json>(`${this.project(repo)}/labels`, {
        method: 'POST',
        body: {
          name: label.name,
          color: label.colour ?? '#ededed',
          ...(label.description ? { description: label.description } : {}),
        },
      }),
    );
  }

  async editLabel(repo: string, name: string, edit: LabelEdit): Promise<Label> {
    return this.toLabel(
      await this.get<Json>(`${this.project(repo)}/labels/${encodeURIComponent(name)}`, {
        method: 'PUT',
        body: {
          ...(edit.name ? { new_name: edit.name } : {}),
          ...(edit.colour ? { color: edit.colour } : {}),
          ...(edit.description !== undefined ? { description: edit.description } : {}),
        },
      }),
    );
  }

  async deleteLabel(repo: string, name: string): Promise<void> {
    await this.get(`${this.project(repo)}/labels/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
  }

  private toInfo(p: Json): RepoInfo {
    return {
      repo: String(p.path_with_namespace),
      ...(p.description ? { description: String(p.description) } : {}),
      private: p.visibility !== 'public',
      defaultBranch: String(p.default_branch ?? 'main'),
      stars: Number(p.star_count ?? 0),
      forks: Number(p.forks_count ?? 0),
      openIssues: Number(p.open_issues_count ?? 0),
      url: String(p.web_url ?? ''),
    };
  }

  async info(repo: string): Promise<RepoInfo> {
    return this.toInfo(await this.get<Json>(this.project(repo)));
  }

  async createRepo(r: {
    name: string;
    description?: string;
    private?: boolean;
  }): Promise<RepoInfo> {
    const [group, name] = r.name.includes('/')
      ? [r.name.slice(0, r.name.lastIndexOf('/')), r.name.slice(r.name.lastIndexOf('/') + 1)]
      : [undefined, r.name];
    let namespace: number | undefined;
    if (group)
      namespace = Number((await this.get<Json>(`/namespaces/${encodeURIComponent(group)}`)).id);
    return this.toInfo(
      await this.get<Json>('/projects', {
        method: 'POST',
        body: {
          name,
          path: name,
          visibility: r.private ? 'private' : 'public',
          ...(r.description ? { description: r.description } : {}),
          ...(namespace ? { namespace_id: namespace } : {}),
        },
      }),
    );
  }

  async fork(repo: string): Promise<RepoInfo> {
    return this.toInfo(
      await this.get<Json>(`${this.project(repo)}/fork`, { method: 'POST', body: {} }),
    );
  }

  async star(repo: string, on: boolean): Promise<void> {
    await this.get(`${this.project(repo)}/${on ? 'star' : 'unstar'}`, {
      method: 'POST',
      body: {},
    }).catch((e: unknown) => {
      // 304: it already was.
      if (!(e instanceof RemoteError && e.status === 304)) throw e;
    });
  }

  async deleteRepo(repo: string): Promise<void> {
    await this.get(this.project(repo), { method: 'DELETE' });
  }

  async file(repo: string, path: string, ref?: string): Promise<FileText> {
    const at = ref ?? (await this.repo(repo)).defaultBranch;
    const f = await this.get<Json>(
      `${this.project(repo)}/repository/files/${encodeURIComponent(path)}?ref=${encodeURIComponent(at)}`,
    );
    return {
      path: String(f.file_path ?? path),
      text: Buffer.from(String(f.content ?? ''), 'base64').toString('utf8'),
      size: Number(f.size ?? 0),
      url: `https://${this.host}/${repo}/-/blob/${at}/${path}`,
    };
  }

  async searchCode(repo: string, q: string): Promise<CodeHit[]> {
    const list = await this.get<Json[]>(
      `${this.project(repo)}/search?scope=blobs&search=${encodeURIComponent(q)}`,
    );
    return list.map((b) => ({
      path: String(b.path ?? b.filename ?? ''),
      repo,
      url: `https://${this.host}/${repo}/-/blob/${String(b.ref ?? 'HEAD')}/${String(b.path ?? '')}`,
    }));
  }

  async members(repo: string): Promise<Person[]> {
    return people(await this.get<Json[]>(`${this.project(repo)}/members/all?per_page=100`));
  }

  /** GitLab's notifications are its to-do list. */
  async notices(): Promise<Notice[]> {
    const list = await this.get<Json[]>('/todos?state=pending&per_page=50');
    return list.map((t) => {
      const target = (t.target ?? {}) as Json;
      return {
        id: String(t.id),
        title: String(target.title ?? t.body ?? ''),
        repo: String(((t.project ?? {}) as Json).path_with_namespace ?? ''),
        kind: String(t.target_type ?? t.action_name ?? ''),
        unread: t.state === 'pending',
        ...(t.target_url ? { url: String(t.target_url) } : {}),
        ...(t.created_at ? { at: String(t.created_at) } : {}),
      };
    });
  }

  async readNotices(): Promise<void> {
    await this.get('/todos/mark_as_done', { method: 'POST', body: {} });
  }
}
