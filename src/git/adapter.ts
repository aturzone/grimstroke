/**
 * One way to talk to any of the services.
 *
 * GitHub, GitLab and Gitea answer the same questions in different shapes; each adapter turns
 * its service's answers into draw/doc/remote/model.ts, so nothing above this line knows which
 * one it is talking to. Everything here runs on the server: the browser never talks to a
 * service, and never sees a token.
 */

import { RemoteError } from '@core/git/http.ts';
import type {
  Comment,
  Commit,
  Issue,
  Job,
  Label,
  Merge,
  Person,
  Pipeline,
  Provider,
} from '@core/git/model.ts';

export interface IssueQuery {
  state?: 'open' | 'closed' | 'all';
  labels?: string[];
  /** A login, or 'me'. */
  assignee?: string;
  search?: string;
  page?: number;
  perPage?: number;
}

export interface IssuePatch {
  state?: 'open' | 'closed';
  title?: string;
  body?: string;
  addLabels?: string[];
  removeLabels?: string[];
  assignees?: string[];
}

export interface NewIssue {
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
}

/** A file to carry into an issue: a picture pasted into the / box. */
export interface Upload {
  name: string;
  type: string;
  bytes: Uint8Array<ArrayBuffer>;
}

export interface Whoami extends Person {
  /** What the token may do, as far as the service says: read, and write. */
  scopes: string[];
  canWrite: boolean;
}

export interface RepoSummary {
  repo: string;
  description?: string;
  private?: boolean;
}

export interface Remote {
  readonly provider: Provider;
  readonly host: string;
  whoami(): Promise<Whoami>;
  repos(search?: string): Promise<RepoSummary[]>;
  /** That the repository exists and the token can see it; its default branch. */
  repo(repo: string): Promise<{ repo: string; defaultBranch: string; canPush: boolean }>;
  issues(repo: string, q: IssueQuery): Promise<Issue[]>;
  issue(repo: string, n: string): Promise<Issue>;
  comments(repo: string, n: string): Promise<Comment[]>;
  create(repo: string, issue: NewIssue): Promise<Issue>;
  update(repo: string, n: string, patch: IssuePatch): Promise<Issue>;
  comment(repo: string, n: string, body: string): Promise<Comment>;
  merges(repo: string, q: IssueQuery): Promise<Merge[]>;
  merge(repo: string, n: string): Promise<Merge>;
  commits(repo: string, q: { ref?: string; perPage?: number }): Promise<Commit[]>;
  commit(repo: string, sha: string): Promise<Commit>;
  pipeline(repo: string, id: string): Promise<Pipeline>;
  labels(repo: string): Promise<Label[]>;
  /**
   * Put a file where an issue can show it, and answer with the markdown that shows it. Each
   * service keeps it its own way: GitLab and Gitea as an upload or an attachment of the issue,
   * GitHub -- which has no API for it -- as a file on a branch of its own, grimstroke-uploads.
   */
  attach(repo: string, issue: string, file: Upload): Promise<string>;

  // ---------------------------------------------------------------- the rest of git
  // Everything the box can be asked (src/box/git/actions.ts) that is done on the service. What a
  // service cannot do it refuses with a RemoteError saying so (status 501), never quietly.

  lock(repo: string, n: string, locked: boolean): Promise<void>;
  milestones(repo: string, state?: 'open' | 'closed' | 'all'): Promise<Milestone[]>;
  createMilestone(repo: string, title: string, description?: string): Promise<Milestone>;
  closeMilestone(repo: string, title: string): Promise<Milestone>;
  /** Put an issue in a milestone, named by its title. */
  setMilestone(repo: string, n: string, title: string): Promise<Issue>;

  createMerge(repo: string, m: NewMerge): Promise<Merge>;
  updateMerge(repo: string, n: string, patch: MergePatch): Promise<Merge>;
  mergeMerge(
    repo: string,
    n: string,
    how?: { method?: MergeMethod; message?: string },
  ): Promise<Merge>;
  review(repo: string, n: string, verdict: Verdict, body?: string): Promise<void>;
  requestReview(repo: string, n: string, people: string[]): Promise<void>;
  ready(repo: string, n: string): Promise<Merge>;
  mergeFiles(repo: string, n: string): Promise<FileChange[]>;
  mergeComment(repo: string, n: string, body: string): Promise<Comment>;

  branches(repo: string): Promise<Branch[]>;
  createBranch(repo: string, name: string, from?: string): Promise<Branch>;
  deleteBranch(repo: string, name: string): Promise<void>;
  renameBranch(repo: string, from: string, to: string): Promise<Branch>;
  history(repo: string, q: HistoryQuery): Promise<Commit[]>;
  compare(repo: string, base: string, head: string): Promise<Comparison>;

  runs(repo: string, q: { ref?: string; perPage?: number }): Promise<Run[]>;
  rerun(repo: string, id: string): Promise<void>;
  cancelRun(repo: string, id: string): Promise<void>;

  releases(repo: string, perPage?: number): Promise<Release[]>;
  /** A release by its tag, or the latest. */
  release(repo: string, tag?: string): Promise<Release>;
  createRelease(repo: string, r: NewRelease): Promise<Release>;
  deleteRelease(repo: string, tag: string): Promise<void>;
  tags(repo: string, perPage?: number): Promise<Tag[]>;
  createTag(repo: string, name: string, ref: string, message?: string): Promise<Tag>;
  deleteTag(repo: string, name: string): Promise<void>;

  createLabel(repo: string, label: LabelEdit & { name: string }): Promise<Label>;
  editLabel(repo: string, name: string, edit: LabelEdit): Promise<Label>;
  deleteLabel(repo: string, name: string): Promise<void>;

  info(repo: string): Promise<RepoInfo>;
  createRepo(r: { name: string; description?: string; private?: boolean }): Promise<RepoInfo>;
  fork(repo: string): Promise<RepoInfo>;
  star(repo: string, on: boolean): Promise<void>;
  deleteRepo(repo: string): Promise<void>;
  file(repo: string, path: string, ref?: string): Promise<FileText>;
  searchCode(repo: string, q: string): Promise<CodeHit[]>;
  members(repo: string): Promise<Person[]>;
  notices(): Promise<Notice[]>;
  readNotices(): Promise<void>;
}

export type MergeMethod = 'merge' | 'squash' | 'rebase';
export type Verdict = 'approve' | 'request-changes' | 'comment';

export interface NewMerge {
  title: string;
  source: string;
  target: string;
  body?: string;
  draft?: boolean;
}

export interface MergePatch {
  title?: string;
  body?: string;
  target?: string;
  state?: 'open' | 'closed';
  addLabels?: string[];
  removeLabels?: string[];
  assignees?: string[];
}

export interface HistoryQuery {
  ref?: string;
  author?: string;
  path?: string;
  perPage?: number;
}

export interface Branch {
  name: string;
  sha: string;
  protected?: boolean;
}

export interface Tag {
  name: string;
  sha: string;
}

export interface FileChange {
  path: string;
  status: string;
  additions: number;
  deletions: number;
}

export interface Comparison {
  ahead: number;
  behind: number;
  commits: Commit[];
  files: FileChange[];
  url?: string;
}

export interface Run {
  id: string;
  name: string;
  ref: string;
  sha?: string;
  status: Job['status'];
  url: string;
  at?: string;
}

export interface Release {
  tag: string;
  name: string;
  body?: string;
  draft?: boolean;
  prerelease?: boolean;
  at?: string;
  url: string;
}

export interface NewRelease {
  tag: string;
  name?: string;
  body?: string;
  /** What the tag is made on, if it is new: a branch or a sha. */
  ref?: string;
  draft?: boolean;
}

export interface Milestone {
  id: string;
  title: string;
  state: 'open' | 'closed';
  due?: string;
  description?: string;
  url?: string;
}

export interface LabelEdit {
  name?: string;
  /** '#rrggbb'. */
  colour?: string;
  description?: string;
}

export interface RepoInfo extends RepoSummary {
  defaultBranch: string;
  stars: number;
  forks: number;
  openIssues: number;
  url: string;
}

export interface FileText {
  path: string;
  text: string;
  size: number;
  url: string;
}

export interface CodeHit {
  path: string;
  repo: string;
  url: string;
}

export interface Notice {
  id: string;
  title: string;
  repo: string;
  kind: string;
  unread: boolean;
  url?: string;
  at?: string;
}

/** A service that has no way to do something: said, with what to do instead. */
export function cannot(service: string, what: string): never {
  throw new RemoteError(501, `${service} has no API to ${what}`);
}

/** Pass/fail for a run, from whatever a service calls it. */
export const RUN_STATUS: Record<string, Job['status']> = {
  success: 'passed',
  passed: 'passed',
  completed: 'passed',
  failure: 'failed',
  failed: 'failed',
  timed_out: 'failed',
  startup_failure: 'failed',
  action_required: 'pending',
  running: 'running',
  in_progress: 'running',
  pending: 'pending',
  queued: 'pending',
  waiting: 'pending',
  requested: 'pending',
  created: 'pending',
  waiting_for_resource: 'pending',
  preparing: 'pending',
  scheduled: 'pending',
  manual: 'pending',
  blocked: 'pending',
  skipped: 'skipped',
  neutral: 'skipped',
  cancelled: 'cancelled',
  canceled: 'cancelled',
};

/** A person as the services send one: login and, sometimes, a name. */
export function person(raw: unknown): Person | undefined {
  const p = raw as { login?: string; username?: string; name?: string; full_name?: string } | null;
  const login = p?.login ?? p?.username;
  if (!login) return undefined;
  const name = p?.name ?? p?.full_name;
  return name && name !== login ? { login, name } : { login };
}

export function people(raw: unknown): Person[] {
  return Array.isArray(raw) ? raw.map(person).filter((p): p is Person => p !== undefined) : [];
}

/** '#rrggbb' from 'rrggbb' or '#rrggbb'. */
export function hex(colour: unknown): string | undefined {
  if (typeof colour !== 'string' || !colour) return undefined;
  return colour.startsWith('#') ? colour : `#${colour}`;
}
