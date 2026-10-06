/**
 * One way to talk to any of the services.
 *
 * GitHub, GitLab and Gitea answer the same questions in different shapes; each adapter turns
 * its service's answers into draw/doc/remote/model.ts, so nothing above this line knows which
 * one it is talking to. Everything here runs on the server: the browser never talks to a
 * service, and never sees a token.
 */

import type {
  Comment,
  Commit,
  Issue,
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
}

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
