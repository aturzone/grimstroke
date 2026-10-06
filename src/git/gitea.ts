/**
 * Gitea and Forgejo, over their v1 API at https://<host>/api/v1. The two share it; where they
 * have grown apart it is in things this does not use.
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

  async attach(repo: string, issue: string, file: Upload): Promise<string> {
    const form = new FormData();
    form.append('attachment', new Blob([file.bytes], { type: file.type }), file.name);
    const up = await this.get<Json>(`/repos/${repo}/issues/${issue}/assets`, {
      method: 'POST',
      body: form,
    });
    return `![${file.name}](${String(up.browser_download_url ?? '')})`;
  }

  // ---------------------------------------------------------------- the rest of git

  async lock(repo: string, n: string, locked: boolean): Promise<void> {
    try {
      await this.get(`/repos/${repo}/issues/${n}/lock`, {
        method: locked ? 'PUT' : 'DELETE',
        ...(locked ? { body: {} } : {}),
      });
    } catch (error) {
      if (error instanceof RemoteError && (error.status === 404 || error.status === 405))
        cannot('This Gitea', 'lock an issue (it needs a newer Gitea or Forgejo)');
      throw error;
    }
  }

  private toMilestone(m: Json): Milestone {
    return {
      id: String(m.id),
      title: String(m.title ?? ''),
      state: m.state === 'closed' ? 'closed' : 'open',
      ...(m.due_on ? { due: String(m.due_on) } : {}),
      ...(m.description ? { description: String(m.description) } : {}),
    };
  }

  async milestones(repo: string, state: 'open' | 'closed' | 'all' = 'open'): Promise<Milestone[]> {
    const list = await this.get<Json[]>(`/repos/${repo}/milestones?state=${state}&limit=50`);
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
          // A draft is said in the title on Gitea.
          title: m.draft ? `WIP: ${m.title}` : m.title,
          head: m.source,
          base: m.target,
          ...(m.body ? { body: m.body } : {}),
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
    await this.get(`/repos/${repo}/pulls/${n}/merge`, {
      method: 'POST',
      body: {
        Do: how.method ?? 'merge',
        ...(how.message ? { MergeMessageField: how.message } : {}),
      },
    });
    return this.merge(repo, n);
  }

  async review(repo: string, n: string, verdict: Verdict, body?: string): Promise<void> {
    const event =
      verdict === 'approve'
        ? 'APPROVED'
        : verdict === 'request-changes'
          ? 'REQUEST_CHANGES'
          : 'COMMENT';
    await this.get(`/repos/${repo}/pulls/${n}/reviews`, {
      method: 'POST',
      body: { event, body: body ?? '' },
    });
  }

  async requestReview(repo: string, n: string, people: string[]): Promise<void> {
    await this.get(`/repos/${repo}/pulls/${n}/requested_reviewers`, {
      method: 'POST',
      body: { reviewers: people },
    });
  }

  async ready(repo: string, n: string): Promise<Merge> {
    const p = await this.get<Json>(`/repos/${repo}/pulls/${n}`);
    const title = String(p.title ?? '').replace(/^\s*(?:\[?(?:draft|wip)\]?:?\s*)+/i, '');
    return this.updateMerge(repo, n, { title });
  }

  async mergeFiles(repo: string, n: string): Promise<FileChange[]> {
    const list = await this.get<Json[]>(`/repos/${repo}/pulls/${n}/files?limit=100`);
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
    const list = await this.get<Json[]>(`/repos/${repo}/branches?limit=100`);
    return list.map((b) => ({
      name: String(b.name),
      sha: String(((b.commit ?? {}) as Json).id ?? ''),
      ...(b.protected ? { protected: true } : {}),
    }));
  }

  async createBranch(repo: string, name: string, from?: string): Promise<Branch> {
    const ref = from ?? (await this.repo(repo)).defaultBranch;
    const b = await this.get<Json>(`/repos/${repo}/branches`, {
      method: 'POST',
      body: { new_branch_name: name, old_ref_name: ref, old_branch_name: ref },
    });
    return { name: String(b.name ?? name), sha: String(((b.commit ?? {}) as Json).id ?? '') };
  }

  async deleteBranch(repo: string, name: string): Promise<void> {
    await this.get(`/repos/${repo}/branches/${encodeURIComponent(name)}`, { method: 'DELETE' });
  }

  async renameBranch(repo: string, from: string, to: string): Promise<Branch> {
    try {
      await this.get(`/repos/${repo}/branches/${encodeURIComponent(from)}`, {
        method: 'PATCH',
        body: { name: to },
      });
    } catch (error) {
      if (error instanceof RemoteError && (error.status === 404 || error.status === 405))
        cannot('This Gitea', 'rename a branch (it needs Gitea 1.23 or newer)');
      throw error;
    }
    const b = await this.get<Json>(`/repos/${repo}/branches/${encodeURIComponent(to)}`);
    return { name: to, sha: String(((b.commit ?? {}) as Json).id ?? '') };
  }

  async history(repo: string, q: HistoryQuery): Promise<Commit[]> {
    const params = new URLSearchParams({ limit: String(q.author ? 50 : (q.perPage ?? 20)) });
    if (q.ref) params.set('sha', q.ref);
    if (q.path) params.set('path', q.path);
    const list = (await this.get<Json[]>(`/repos/${repo}/commits?${params}`)).map((c) =>
      this.toCommit(c),
    );
    // Gitea cannot filter by author; it is done here.
    const who = q.author?.toLowerCase();
    return (who ? list.filter((c) => c.author?.login.toLowerCase() === who) : list).slice(
      0,
      q.perPage ?? 20,
    );
  }

  async compare(repo: string, base: string, head: string): Promise<Comparison> {
    const q = (a: string, b: string) =>
      this.get<{ total_commits?: number; commits?: Json[]; files?: Json[] }>(
        `/repos/${repo}/compare/${encodeURIComponent(a)}...${encodeURIComponent(b)}`,
      );
    const [ahead, behind] = await Promise.all([q(base, head), q(head, base)]);
    return {
      ahead: ahead.total_commits ?? ahead.commits?.length ?? 0,
      behind: behind.total_commits ?? behind.commits?.length ?? 0,
      commits: (ahead.commits ?? []).map((c) => this.toCommit(c)),
      files: (ahead.files ?? []).map((f) => ({
        path: String(f.filename ?? ''),
        status: String(f.status ?? 'modified'),
        additions: Number(f.additions ?? 0),
        deletions: Number(f.deletions ?? 0),
      })),
    };
  }

  async runs(repo: string, q: { ref?: string; perPage?: number }): Promise<Run[]> {
    // Gitea 1.23 lists runs; older ones only their tasks, which say the same.
    const found = await this.get<{ workflow_runs?: Json[] }>(
      `/repos/${repo}/actions/runs?limit=${q.perPage ?? 10}${q.ref ? `&branch=${encodeURIComponent(q.ref)}` : ''}`,
    ).catch(() =>
      this.get<{ workflow_runs?: Json[] }>(`/repos/${repo}/actions/tasks?limit=${q.perPage ?? 10}`),
    );
    return (found.workflow_runs ?? [])
      .filter((r) => !q.ref || String(r.head_branch ?? '') === q.ref)
      .map((r) => ({
        id: String(r.id),
        name: String(r.name ?? r.display_title ?? 'run'),
        ref: String(r.head_branch ?? ''),
        ...(r.head_sha ? { sha: String(r.head_sha) } : {}),
        status:
          r.status === 'completed'
            ? (RUN_STATUS[String(r.conclusion)] ?? 'failed')
            : (RUN_STATUS[String(r.status)] ?? 'pending'),
        url: String(r.html_url ?? r.url ?? ''),
        ...(r.created_at ? { at: String(r.created_at) } : {}),
      }));
  }

  rerun(): Promise<void> {
    return cannot('Gitea', 'run a workflow again; it is done from the run’s page');
  }

  cancelRun(): Promise<void> {
    return cannot('Gitea', 'cancel a run; it is done from the run’s page');
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
    return (await this.get<Json[]>(`/repos/${repo}/releases?limit=${perPage}`)).map((r) =>
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
    await this.get(`/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`, { method: 'DELETE' });
  }

  async tags(repo: string, perPage = 30): Promise<Tag[]> {
    const list = await this.get<Json[]>(`/repos/${repo}/tags?limit=${perPage}`);
    return list.map((t) => ({
      name: String(t.name),
      sha: String(((t.commit ?? {}) as Json).sha ?? ''),
    }));
  }

  async createTag(repo: string, name: string, ref: string, message?: string): Promise<Tag> {
    const t = await this.get<Json>(`/repos/${repo}/tags`, {
      method: 'POST',
      body: { tag_name: name, target: ref, ...(message ? { message } : {}) },
    });
    return { name: String(t.name ?? name), sha: String(((t.commit ?? {}) as Json).sha ?? '') };
  }

  async deleteTag(repo: string, name: string): Promise<void> {
    await this.get(`/repos/${repo}/tags/${encodeURIComponent(name)}`, { method: 'DELETE' });
  }

  private toLabel(l: Json): Label {
    return { name: String(l.name), ...(hex(l.color) ? { colour: hex(l.color) as string } : {}) };
  }

  private async labelId(repo: string, name: string): Promise<number> {
    const [id] = await this.labelIds(repo, [name]);
    if (id === undefined) throw new RemoteError(404, `no label called ${name} in ${repo}`);
    return id;
  }

  async createLabel(repo: string, label: LabelEdit & { name: string }): Promise<Label> {
    return this.toLabel(
      await this.get<Json>(`/repos/${repo}/labels`, {
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
      await this.get<Json>(`/repos/${repo}/labels/${await this.labelId(repo, name)}`, {
        method: 'PATCH',
        body: {
          ...(edit.name ? { name: edit.name } : {}),
          ...(edit.colour ? { color: edit.colour } : {}),
          ...(edit.description !== undefined ? { description: edit.description } : {}),
        },
      }),
    );
  }

  async deleteLabel(repo: string, name: string): Promise<void> {
    await this.get(`/repos/${repo}/labels/${await this.labelId(repo, name)}`, { method: 'DELETE' });
  }

  private toInfo(r: Json): RepoInfo {
    return {
      repo: String(r.full_name),
      ...(r.description ? { description: String(r.description) } : {}),
      private: Boolean(r.private),
      defaultBranch: String(r.default_branch ?? 'main'),
      stars: Number(r.stars_count ?? 0),
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

  searchCode(): Promise<CodeHit[]> {
    return cannot(
      'Gitea',
      'search inside the code; its search box on the site can, when indexing is on',
    );
  }

  async members(repo: string): Promise<Person[]> {
    return people(await this.get<Json[]>(`/repos/${repo}/collaborators?limit=100`));
  }

  async notices(): Promise<Notice[]> {
    const list = await this.get<Json[]>('/notifications?limit=50');
    return list.map((n) => {
      const subject = (n.subject ?? {}) as Json;
      return {
        id: String(n.id),
        title: String(subject.title ?? ''),
        repo: String(((n.repository ?? {}) as Json).full_name ?? ''),
        kind: String(subject.type ?? ''),
        unread: Boolean(n.unread),
        ...(subject.html_url ? { url: String(subject.html_url) } : {}),
        ...(n.updated_at ? { at: String(n.updated_at) } : {}),
      };
    });
  }

  async readNotices(): Promise<void> {
    await this.get('/notifications', { method: 'PUT', body: {} });
  }
}
