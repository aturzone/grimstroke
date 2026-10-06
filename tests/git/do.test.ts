/**
 * Git said in words, end to end: a sentence is understood, confirmed, and done -- against a
 * stand-in for GitHub, GitLab and Gitea that answers every call the adapters make. What is held
 * to is the call each sentence ends in: the right action, on the right repository, with the right
 * number, branch, label or person -- on each service, in its own API's terms.
 */

import { mkdtempSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { understandGit } from '@core/box/git/understand.ts';
import { doGit } from '@core/git/do.ts';
import { Live } from '@core/serve/live.ts';
import { Store } from '@core/store/store.ts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

interface Hit {
  method: string;
  path: string;
  query: string;
  body: Record<string, unknown>;
}

let server: Server;
let live: Live;
const hits: Hit[] = [];

async function bodyOf(req: IncomingMessage): Promise<Record<string, unknown>> {
  let text = '';
  for await (const chunk of req) text += chunk;
  try {
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** One thing, with every field any of the services' answers is read for. */
function thing(service: string, repo: string): Record<string, unknown> {
  return {
    id: 7,
    iid: 7,
    number: 7,
    node_id: 'N7',
    title: 'Draft: the thing',
    name: 'main',
    state: 'open',
    body: 'words',
    description: 'words',
    full_name: repo,
    path_with_namespace: repo,
    default_branch: 'main',
    permissions: { push: true },
    visibility: 'public',
    user: { login: 'ada', name: 'Ada' },
    author: { login: 'ada', username: 'ada' },
    username: 'ada',
    login: 'ada',
    assignees: [{ login: 'bo' }],
    labels: [{ name: 'bug', color: 'd73a4a' }],
    commit: { sha: 'abc1234def', id: 'abc1234def', message: 'fix it' },
    sha: 'abc1234def',
    message: 'fix it',
    head: { ref: 'fix/login', sha: 'abc1234def' },
    base: { ref: 'main' },
    source_branch: 'fix/login',
    target_branch: 'main',
    html_url: `https://${service}.example/${repo}/7`,
    web_url: `https://${service}.example/${repo}/7`,
    tag_name: 'v1.0.0',
    content: Buffer.from('hello\n').toString('base64'),
    size: 6,
    path: 'README.md',
    filename: 'README.md',
    ref: 'main',
    status: 'completed',
    conclusion: 'failure',
    head_branch: 'main',
    head_sha: 'abc1234def',
    subject: { title: 'ping', type: 'Issue' },
    repository: { full_name: repo },
    unread: true,
    target: { title: 'ping' },
    project: { path_with_namespace: repo },
    color: 'ededed',
    stargazers_count: 3,
    star_count: 3,
    stars_count: 3,
  };
}

/** Lists, by the last part of their path; everything else is one thing. */
const LIST =
  /\/(issues|pulls|merge_requests|branches|tags|releases|labels|milestones|commits|pipelines|members\/all|collaborators|contributors|notifications|todos|files|repos|projects|reviews|comments|notes|jobs|search|user\/repos)$/;

beforeAll(async () => {
  server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    const [, service = '', ...rest] = url.pathname.split('/');
    const path = `/${rest.join('/')}`;
    hits.push({
      method: req.method ?? 'GET',
      path: `/${service}${path}`,
      query: url.search,
      body: await bodyOf(req),
    });
    const repo = `acme/${service}-web`;
    const send = (status: number, data: unknown): void => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(data));
    };
    const one = thing(service, repo);
    if (req.method === 'DELETE') return send(204, undefined);
    if (path === '/graphql') return send(200, { data: {} });
    if (/\/actions\/(runs|tasks)$/.test(path)) return send(200, { workflow_runs: [one] });
    if (path === '/search/code') return send(200, { items: [one] });
    if (/\/changes$/.test(path))
      return send(200, { changes: [{ new_path: 'a.ts', diff: '+x\n-y' }] });
    if (/\/compare/.test(path))
      return send(200, { ahead_by: 2, behind_by: 1, commits: [one], files: [one], diffs: [] });
    if (/\/approvals$/.test(path)) return send(200, { approved_by: [] });
    if (/\/check-runs$/.test(path)) return send(200, { check_runs: [] });
    if (/\/namespaces\//.test(path)) return send(200, { id: 3 });
    if (/\/users$/.test(path)) return send(200, [{ id: 5, username: 'sina' }]);
    if (req.method === 'GET' && /\/milestones$/.test(path))
      return send(200, [{ ...one, title: 'beta' }]);
    if (req.method === 'GET' && /\/labels$/.test(path))
      return send(200, [one, { ...one, id: 8, name: 'wontfix' }]);
    if (req.method === 'GET' && LIST.test(path)) return send(200, [one]);
    return send(req.method === 'POST' ? 201 : 200, one);
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const at = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.GRIMSTROKE_REMOTE_BASES = `github.com=${at}/gh,gitlab.com=${at}/gl,gitea.example.org=${at}/gt`;
  live = new Live(new Store({ dir: mkdtempSync(join(tmpdir(), 'gs-git-')) }));
  const saved = new Date().toISOString();
  await live.remote.tokens.put('github.com', {
    provider: 'github',
    token: 'good',
    user: 'ada',
    savedAt: saved,
  });
  await live.remote.tokens.put('gitlab.com', {
    provider: 'gitlab',
    token: 'good',
    user: 'ada',
    savedAt: saved,
  });
  await live.remote.tokens.put('gitea.example.org', {
    provider: 'gitea',
    token: 'good',
    user: 'ada',
    savedAt: saved,
  });
  await live.remote.refreshProviders();
});

afterAll(() => {
  live.close();
  server.close();
  delete process.env.GRIMSTROKE_REMOTE_BASES;
});

/** Say it, confirm it, and the calls it made. */
async function run(
  text: string,
  last?: Record<string, string>,
): Promise<{ ok: boolean; says: string; calls: string[]; hits: Hit[]; action: string | null }> {
  const from = hits.length;
  const plan = understandGit(text, last ? { last } : {});
  const r = await doGit(plan, { live, confirmed: true, ...(last ? { last } : {}) });
  const mine = hits
    .slice(from)
    .filter((h) => h.method !== 'GET' || !/\/(user\/repos|projects|repos\/search)$/.test(h.path));
  return {
    ok: r.ok,
    says: r.says,
    action: r.action,
    hits: mine,
    calls: mine.map((h) => `${h.method} ${h.path}`),
  };
}

/**
 * Each sentence, the action it is, and the call it must make on each service ('-' where a
 * service cannot: then it must say so, not fail quietly). {r} is the service's repository.
 */
const CASES: Array<[string, string, string, string, string]> = [
  // sentence                                             action               GitHub                                          GitLab                                               Gitea
  [
    'close #12 in {r}',
    'issue.close',
    'PATCH /repos/{r}/issues/12',
    'PUT /projects/{e}/issues/12',
    'PATCH /repos/{r}/issues/12',
  ],
  [
    'reopen issue 12 in {r}',
    'issue.reopen',
    'PATCH /repos/{r}/issues/12',
    'PUT /projects/{e}/issues/12',
    'PATCH /repos/{r}/issues/12',
  ],
  [
    'comment on #12 in {r}: fixed in the last build',
    'issue.comment',
    'POST /repos/{r}/issues/12/comments',
    'POST /projects/{e}/issues/12/notes',
    'POST /repos/{r}/issues/12/comments',
  ],
  [
    'show issue 12 in {r}',
    'issue.show',
    'GET /repos/{r}/issues/12',
    'GET /projects/{e}/issues/12',
    'GET /repos/{r}/issues/12',
  ],
  [
    'open issues in {r}',
    'issue.list',
    'GET /repos/{r}/issues',
    'GET /projects/{e}/issues',
    'GET /repos/{r}/issues',
  ],
  [
    'assign #12 to sina in {r}',
    'issue.assign',
    'PATCH /repos/{r}/issues/12',
    'PUT /projects/{e}/issues/12',
    'PATCH /repos/{r}/issues/12',
  ],
  [
    'unassign sina from #12 in {r}',
    'issue.unassign',
    'PATCH /repos/{r}/issues/12',
    'PUT /projects/{e}/issues/12',
    'PATCH /repos/{r}/issues/12',
  ],
  [
    'add the label bug to #12 in {r}',
    'issue.label',
    'PATCH /repos/{r}/issues/12',
    'PUT /projects/{e}/issues/12',
    'PUT /repos/{r}/issues/12/labels',
  ],
  [
    'remove the bug label from #12 in {r}',
    'issue.unlabel',
    'PATCH /repos/{r}/issues/12',
    'PUT /projects/{e}/issues/12',
    'PUT /repos/{r}/issues/12/labels',
  ],
  [
    'rename issue 12 in {r} to "login fails on safari"',
    'issue.edit',
    'PATCH /repos/{r}/issues/12',
    'PUT /projects/{e}/issues/12',
    'PATCH /repos/{r}/issues/12',
  ],
  [
    'put #12 in milestone beta in {r}',
    'issue.milestone',
    'PATCH /repos/{r}/issues/12',
    'PUT /projects/{e}/issues/12',
    'PATCH /repos/{r}/issues/12',
  ],
  [
    'lock issue 12 in {r}',
    'issue.lock',
    'PUT /repos/{r}/issues/12/lock',
    'PUT /projects/{e}/issues/12',
    'PUT /repos/{r}/issues/12/lock',
  ],
  [
    'open a pull request from fix/login into main in {r}',
    'pr.create',
    'POST /repos/{r}/pulls',
    'POST /projects/{e}/merge_requests',
    'POST /repos/{r}/pulls',
  ],
  [
    'open pull requests in {r}',
    'pr.list',
    'GET /repos/{r}/pulls',
    'GET /projects/{e}/merge_requests',
    'GET /repos/{r}/pulls',
  ],
  [
    'show PR 14 in {r}',
    'pr.show',
    'GET /repos/{r}/pulls/14',
    'GET /projects/{e}/merge_requests/14',
    'GET /repos/{r}/pulls/14',
  ],
  [
    'what files changed in PR 14 in {r}',
    'pr.diff',
    'GET /repos/{r}/pulls/14/files',
    'GET /projects/{e}/merge_requests/14/changes',
    'GET /repos/{r}/pulls/14/files',
  ],
  [
    'close PR 14 in {r}',
    'pr.close',
    'PATCH /repos/{r}/pulls/14',
    'PUT /projects/{e}/merge_requests/14',
    'PATCH /repos/{r}/pulls/14',
  ],
  [
    'comment on PR 14 in {r}: looks good to me',
    'pr.comment',
    'POST /repos/{r}/issues/14/comments',
    'POST /projects/{e}/merge_requests/14/notes',
    'POST /repos/{r}/issues/14/comments',
  ],
  [
    'squash and merge PR 14 in {r}',
    'pr.merge',
    'PUT /repos/{r}/pulls/14/merge',
    'PUT /projects/{e}/merge_requests/14/merge',
    'POST /repos/{r}/pulls/14/merge',
  ],
  [
    'approve PR 14 in {r}',
    'pr.approve',
    'POST /repos/{r}/pulls/14/reviews',
    'POST /projects/{e}/merge_requests/14/approve',
    'POST /repos/{r}/pulls/14/reviews',
  ],
  [
    'request changes on PR 14 in {r}: the naming is off',
    'pr.request-changes',
    'POST /repos/{r}/pulls/14/reviews',
    'POST /projects/{e}/merge_requests/14/notes',
    'POST /repos/{r}/pulls/14/reviews',
  ],
  [
    'ask sina to review PR 14 in {r}',
    'pr.request-review',
    'POST /repos/{r}/pulls/14/requested_reviewers',
    'PUT /projects/{e}/merge_requests/14',
    'POST /repos/{r}/pulls/14/requested_reviewers',
  ],
  [
    'mark PR 14 in {r} as ready for review',
    'pr.ready',
    'POST /graphql',
    'PUT /projects/{e}/merge_requests/14',
    'PATCH /repos/{r}/pulls/14',
  ],
  [
    'list branches in {r}',
    'branch.list',
    'GET /repos/{r}/branches',
    'GET /projects/{e}/repository/branches',
    'GET /repos/{r}/branches',
  ],
  [
    'create a branch fix/login from main in {r}',
    'branch.create',
    'POST /repos/{r}/git/refs',
    'POST /projects/{e}/repository/branches',
    'POST /repos/{r}/branches',
  ],
  [
    'delete the branch fix/login in {r}',
    'branch.delete',
    'DELETE /repos/{r}/git/refs/heads/fix/login',
    'DELETE /projects/{e}/repository/branches/fix%2Flogin',
    'DELETE /repos/{r}/branches/fix%2Flogin',
  ],
  [
    'rename the branch fix/login to fix/auth in {r}',
    'branch.rename',
    'POST /repos/{r}/branches/fix/login/rename',
    '-',
    'PATCH /repos/{r}/branches/fix%2Flogin',
  ],
  [
    'last 5 commits on main in {r}',
    'commit.list',
    'GET /repos/{r}/commits',
    'GET /projects/{e}/repository/commits',
    'GET /repos/{r}/commits',
  ],
  [
    'compare develop with main in {r}',
    'commit.compare',
    'GET /repos/{r}/compare/main...develop',
    'GET /projects/{e}/repository/compare',
    'GET /repos/{r}/compare/main...develop',
  ],
  [
    'did ci pass on main in {r}?',
    'ci.status',
    'GET /repos/{r}/actions/runs',
    'GET /projects/{e}/pipelines',
    'GET /repos/{r}/actions/runs',
  ],
  [
    'rerun the pipeline on main in {r}',
    'ci.rerun',
    'POST /repos/{r}/actions/runs/7/rerun-failed-jobs',
    'POST /projects/{e}/pipelines/7/retry',
    '-',
  ],
  [
    'cancel the build on main in {r}',
    'ci.cancel',
    'POST /repos/{r}/actions/runs/7/cancel',
    'POST /projects/{e}/pipelines/7/cancel',
    '-',
  ],
  [
    'list the releases in {r}',
    'release.list',
    'GET /repos/{r}/releases',
    'GET /projects/{e}/releases',
    'GET /repos/{r}/releases',
  ],
  [
    'make a release v2.0.0 in {r}',
    'release.create',
    'POST /repos/{r}/releases',
    'POST /projects/{e}/releases',
    'POST /repos/{r}/releases',
  ],
  [
    'delete the release v2.0.0 in {r}',
    'release.delete',
    'DELETE /repos/{r}/releases/7',
    'DELETE /projects/{e}/releases/v2.0.0',
    'DELETE /repos/{r}/releases/tags/v2.0.0',
  ],
  [
    'list the tags in {r}',
    'tag.list',
    'GET /repos/{r}/tags',
    'GET /projects/{e}/repository/tags',
    'GET /repos/{r}/tags',
  ],
  [
    'create a tag v2.0.0 in {r}',
    'tag.create',
    'POST /repos/{r}/git/refs',
    'POST /projects/{e}/repository/tags',
    'POST /repos/{r}/tags',
  ],
  [
    'delete the tag v2.0.0 in {r}',
    'tag.delete',
    'DELETE /repos/{r}/git/refs/tags/v2.0.0',
    'DELETE /projects/{e}/repository/tags/v2.0.0',
    'DELETE /repos/{r}/tags/v2.0.0',
  ],
  [
    'what labels are there in {r}',
    'label.list',
    'GET /repos/{r}/labels',
    'GET /projects/{e}/labels',
    'GET /repos/{r}/labels',
  ],
  [
    'create a red label urgent in {r}',
    'label.create',
    'POST /repos/{r}/labels',
    'POST /projects/{e}/labels',
    'POST /repos/{r}/labels',
  ],
  [
    'delete the label wontfix in {r}',
    'label.delete',
    'DELETE /repos/{r}/labels/wontfix',
    'DELETE /projects/{e}/labels/wontfix',
    'DELETE /repos/{r}/labels/8',
  ],
  [
    'list the milestones in {r}',
    'milestone.list',
    'GET /repos/{r}/milestones',
    'GET /projects/{e}/milestones',
    'GET /repos/{r}/milestones',
  ],
  [
    'create a milestone beta in {r}',
    'milestone.create',
    'POST /repos/{r}/milestones',
    'POST /projects/{e}/milestones',
    'POST /repos/{r}/milestones',
  ],
  [
    'tell me about the {r} repo',
    'repo.show',
    'GET /repos/{r}',
    'GET /projects/{e}',
    'GET /repos/{r}',
  ],
  [
    'fork {r}',
    'repo.fork',
    'POST /repos/{r}/forks',
    'POST /projects/{e}/fork',
    'POST /repos/{r}/forks',
  ],
  [
    'star {r}',
    'repo.star',
    'PUT /user/starred/{r}',
    'POST /projects/{e}/star',
    'PUT /user/starred/{r}',
  ],
  [
    'delete the repository {r}',
    'repo.delete',
    'DELETE /repos/{r}',
    'DELETE /projects/{e}',
    'DELETE /repos/{r}',
  ],
  [
    'show README.md in {r}',
    'file.show',
    'GET /repos/{r}/contents/README.md',
    'GET /projects/{e}/repository/files/README.md',
    'GET /repos/{r}/contents/README.md',
  ],
  [
    'search the code for parseIssue in {r}',
    'code.search',
    'GET /search/code',
    'GET /projects/{e}/search',
    '-',
  ],
  [
    'who works on {r}',
    'member.list',
    'GET /repos/{r}/collaborators',
    'GET /projects/{e}/members/all',
    'GET /repos/{r}/collaborators',
  ],
];

const SERVICES = [
  ['github', 'gh'],
  ['gitlab', 'gl'],
  ['gitea', 'gt'],
] as const;

describe('a sentence to git, done on each service', () => {
  for (const [name, short] of SERVICES) {
    describe(name, () => {
      it.each(CASES)('%s', async (said, action, ...want) => {
        const repo = `acme/${short}-web`;
        const call = want[SERVICES.findIndex(([n]) => n === name)] as string;
        const r = await run(said.replace('{r}', repo));
        expect(r.action).toBe(action);
        if (call === '-') {
          expect(r.ok).toBe(false);
          expect(r.says).toMatch(/has no API|cannot|needs/i);
          return;
        }
        const expected = `${call.split(' ')[0]} /${short}${call.split(' ')[1]?.replace('{r}', repo).replace('{e}', encodeURIComponent(repo))}`;
        expect(r.ok, r.says).toBe(true);
        expect(r.calls).toContain(expected);
      });
    });
  }
});

describe('what each call carries', () => {
  const sent = (r: { hits: Hit[] }, method: string, end: string): Record<string, unknown> =>
    r.hits.filter((h) => h.method === method && h.path.endsWith(end)).pop()?.body ?? {};

  it('a comment carries its words, and only them', async () => {
    const r = await run(
      'comment on #12 in acme/gh-web: fixed in the last build, close it if you agree',
    );
    expect(sent(r, 'POST', '/issues/12/comments').body).toBe(
      'fixed in the last build, close it if you agree',
    );
  });

  it('a squash merge says squash, on GitHub and on Gitea', async () => {
    expect(
      sent(await run('squash and merge PR 14 in acme/gh-web'), 'PUT', '/pulls/14/merge')
        .merge_method,
    ).toBe('squash');
    expect(
      sent(await run('squash and merge PR 14 in acme/gt-web'), 'POST', '/pulls/14/merge').Do,
    ).toBe('squash');
  });

  it('a pull request goes from its branch into its base', async () => {
    const b = sent(
      await run('open a pull request from fix/login into develop in acme/gh-web'),
      'POST',
      '/pulls',
    );
    expect([b.head, b.base]).toEqual(['fix/login', 'develop']);
  });

  it('a new label gets the colour that was said', async () => {
    expect(
      sent(await run('create a red label urgent in acme/gh-web'), 'POST', '/labels'),
    ).toMatchObject({ name: 'urgent', color: 'd73a4a' });
  });

  it('an assignee is added to whoever is already on it', async () => {
    expect(
      sent(await run('assign #12 to sina in acme/gh-web'), 'PATCH', '/issues/12').assignees,
    ).toEqual(['bo', 'sina']);
  });
});

describe('the same, said in Persian and Russian', () => {
  it.each([
    ['ایشو ۱۲ رو تو acme/gh-web ببند', 'issue.close', 'PATCH /gh/repos/acme/gh-web/issues/12'],
    [
      'زیر ایشو ۱۲ تو acme/gh-web بنویس: درست شد',
      'issue.comment',
      'POST /gh/repos/acme/gh-web/issues/12/comments',
    ],
    ['پی ار ۱۴ رو تو acme/gh-web مرج کن', 'pr.merge', 'PUT /gh/repos/acme/gh-web/pulls/14/merge'],
    [
      'لیبل bug رو بزن رو ایشو ۱۲ تو acme/gh-web',
      'issue.label',
      'PATCH /gh/repos/acme/gh-web/issues/12',
    ],
    [
      'برنچ fix/login رو تو acme/gh-web پاک کن',
      'branch.delete',
      'DELETE /gh/repos/acme/gh-web/git/refs/heads/fix/login',
    ],
    ['закрой задачу 12 в acme/gh-web', 'issue.close', 'PATCH /gh/repos/acme/gh-web/issues/12'],
    ['смержи пр 14 в acme/gh-web', 'pr.merge', 'PUT /gh/repos/acme/gh-web/pulls/14/merge'],
    [
      'апрувни пул-реквест 14 в acme/gh-web',
      'pr.approve',
      'POST /gh/repos/acme/gh-web/pulls/14/reviews',
    ],
    ['создай релиз v2.0.0 в acme/gh-web', 'release.create', 'POST /gh/repos/acme/gh-web/releases'],
  ])('%s', async (said, action, call) => {
    const r = await run(said);
    expect(r.action).toBe(action);
    expect(r.ok, r.says).toBe(true);
    expect(r.calls).toContain(call);
  });
});

describe('it, that one: the conversation', () => {
  it('"merge it" after a pull request was shown merges that pull request', async () => {
    const r = await run('merge it', { object: 'pr', number: '14', repo: 'acme/gh-web' });
    expect(r.action).toBe('pr.merge');
    expect(r.calls).toContain('PUT /gh/repos/acme/gh-web/pulls/14/merge');
  });

  it('"ببندش" after an issue closes that issue', async () => {
    const r = await run('ببندش', { object: 'issue', number: '12', repo: 'acme/gh-web' });
    expect(r.action).toBe('issue.close');
    expect(r.calls).toContain('PATCH /gh/repos/acme/gh-web/issues/12');
  });
});

describe('nothing changes unconfirmed, and nothing is guessed', () => {
  it('waits for a confirmation before it changes anything', async () => {
    const from = hits.length;
    const r = await doGit(understandGit('close #12 in acme/gh-web'), { live });
    expect(r.ok).toBe(false);
    expect(r.confirm).toBe(true);
    expect(hits.slice(from).filter((h) => h.method !== 'GET')).toEqual([]);
  });

  it('asks for what it is not told: which issue', async () => {
    const r = await doGit(understandGit('close the issue in acme/gh-web'), {
      live,
      confirmed: true,
    });
    expect(r.ok).toBe(false);
    expect(r.missing).toContain('number');
  });

  it('says so when it is git but nothing it can do', async () => {
    const r = await doGit(understandGit('squash my last three commits into one'), {
      live,
      confirmed: true,
    });
    expect(r.ok).toBe(false);
    expect(r.action).toBeNull();
  });
});
