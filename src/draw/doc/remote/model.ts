/**
 * A repository's things, as data: issues, merge requests, commits, pipelines, the people and
 * labels on them -- the same shape whichever service they came from.
 *
 * Pure. The cards are drawn from these without knowing whether GitHub, GitLab or Gitea sent
 * them; where one service has more (GitLab's work item types, weights), the field is simply
 * present or not. The network is host/remote/'s business, never this file's.
 */

export type Provider = 'github' | 'gitlab' | 'gitea';
export const PROVIDERS: readonly Provider[] = ['github', 'gitlab', 'gitea'];

/** Which repository a notebook is about. No token: a notebook is a document that travels. */
export interface RemoteLink {
  provider: Provider;
  /** 'github.com', 'gitlab.com', or a company's own host. */
  host: string;
  /** 'owner/name', or a GitLab 'group/sub/project'. */
  repo: string;
}

export type RemoteKind = 'issue' | 'merge' | 'commit' | 'pipeline';

/** One thing in a repository, by name. */
export interface RemoteRef extends RemoteLink {
  kind: RemoteKind;
  /** An issue's or merge request's number, a commit's sha, a pipeline's id. */
  id: string;
}

export interface Person {
  login: string;
  name?: string;
}

export interface Label {
  name: string;
  /** '#rrggbb'. */
  colour?: string;
}

export interface Comment {
  id: string;
  author: Person;
  body: string;
  at: string;
}

export interface Issue {
  number: string;
  title: string;
  state: 'open' | 'closed';
  body?: string;
  author?: Person;
  assignees: Person[];
  labels: Label[];
  comments: number;
  /** GitLab's work item type (task, incident, epic...), where there is one. */
  type?: string;
  url: string;
  updated?: string;
  milestone?: string;
}

export interface Merge {
  number: string;
  title: string;
  state: 'open' | 'closed' | 'merged';
  draft?: boolean;
  source: string;
  target: string;
  author?: Person;
  approvals?: number;
  /** The latest pipeline or check run's outcome. */
  checks?: 'passed' | 'failed' | 'running' | 'pending' | 'none';
  url: string;
}

export interface Commit {
  sha: string;
  message: string;
  author?: Person;
  at?: string;
  /** Issue numbers the message says it closes: "closes #12", "fixes #3". */
  closes: string[];
  url: string;
}

export interface Job {
  name: string;
  status: 'passed' | 'failed' | 'running' | 'pending' | 'skipped' | 'cancelled';
}

export interface Pipeline {
  id: string;
  ref: string;
  status: Job['status'];
  jobs: Job[];
  url: string;
}

/** What a card knows about its thing, as last seen: a snapshot, kept for exports and offline. */
export type Seen = Issue | Merge | Commit | Pipeline;

/** A live list: "open issues labelled bug, assigned to me". */
export interface RemoteQuery extends RemoteLink {
  of: 'issues' | 'merges';
  state?: 'open' | 'closed' | 'all';
  labels?: string[];
  /** A login, or 'me' for whoever the token belongs to. */
  assignee?: string;
  search?: string;
  /** How many to show. The rest are left where they are. */
  limit?: number;
  /** Shown above the list. */
  title?: string;
  /** A tracker column's limit on work in progress: over it, the card says so. */
  wip?: number;
  /** Which column of a tracker page this list is. */
  column?: number;
  /** Leave out anything carrying one of these labels -- another column's. */
  without?: string[];
}

/**
 * Which issues a commit message closes. The keywords GitHub, GitLab and Gitea all understand --
 * close, fix, resolve in their forms -- followed by #n, possibly several: "fixes #3, #4".
 */
export function closesIn(message: string): string[] {
  const out = new Set<string>();
  const re =
    /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?|implement(?:s|ed)?)\b[:\s]+((?:#\d+[\s,and]*)+)/gi;
  for (const m of message.matchAll(re)) {
    for (const n of (m[1] ?? '').matchAll(/#(\d+)/g)) out.add(n[1] as string);
  }
  return [...out];
}

/**
 * A pasted URL, read as a reference to something in a repository -- or undefined.
 *
 * github.com/o/r/issues/12 · /pull/5 · /commit/sha · /actions/runs/9;
 * <host>/group/proj/-/issues/12 · /-/merge_requests/5 · /-/commit/sha · /-/pipelines/9;
 * a Gitea host's /o/r/issues/12 · /pulls/5 · /commit/sha. Which service a host is, the caller
 * says (a company's GitLab has no name that gives it away).
 */
export function refFromUrl(
  raw: string,
  providerOf: (host: string) => Provider | undefined,
): RemoteRef | undefined {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return undefined;
  }
  const host = url.host;
  const provider =
    providerOf(host) ??
    (host === 'github.com' ? 'github' : host === 'gitlab.com' ? 'gitlab' : undefined);
  if (!provider) return undefined;
  const path = url.pathname.replace(/\/+$/, '');
  if (provider === 'gitlab') {
    const m = /^\/(.+?)\/-\/(issues|work_items|merge_requests|commit|pipelines)\/([^/]+)/.exec(
      path,
    );
    if (!m) return undefined;
    const kind: RemoteKind =
      m[2] === 'merge_requests'
        ? 'merge'
        : m[2] === 'commit'
          ? 'commit'
          : m[2] === 'pipelines'
            ? 'pipeline'
            : 'issue';
    return { provider, host, repo: m[1] as string, kind, id: m[3] as string };
  }
  const m = /^\/([^/]+\/[^/]+)\/(issues|pull|pulls|commit|actions\/runs)\/([^/]+)/.exec(path);
  if (!m) return undefined;
  const kind: RemoteKind =
    m[2] === 'pull' || m[2] === 'pulls'
      ? 'merge'
      : m[2] === 'commit'
        ? 'commit'
        : m[2] === 'actions/runs'
          ? 'pipeline'
          : 'issue';
  return { provider, host, repo: m[1] as string, kind, id: m[3] as string };
}

/** The address of a thing on its service's own site. */
export function webUrl(ref: RemoteRef): string {
  const base = `https://${ref.host}/${ref.repo}`;
  if (ref.provider === 'gitlab') {
    const part = {
      issue: 'issues',
      merge: 'merge_requests',
      commit: 'commit',
      pipeline: 'pipelines',
    }[ref.kind];
    return `${base}/-/${part}/${ref.id}`;
  }
  const part =
    ref.kind === 'merge'
      ? ref.provider === 'gitea'
        ? 'pulls'
        : 'pull'
      : ref.kind === 'pipeline'
        ? 'actions/runs'
        : ref.kind === 'commit'
          ? 'commit'
          : 'issues';
  return `${base}/${part}/${ref.id}`;
}

/** Same thing? Two refs name the same issue whatever else differs. */
export function sameRef(a: RemoteRef, b: RemoteRef): boolean {
  return a.host === b.host && a.repo === b.repo && a.kind === b.kind && a.id === b.id;
}
