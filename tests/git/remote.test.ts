import { mkdtempSync, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Issue } from '@core/git/model.ts';
import { closesIn, refFromUrl, webUrl } from '@core/git/model.ts';
import { RemoteService } from '@core/git/service.ts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * A small stand-in for GitHub and GitLab: just the calls the adapters make, answering the way
 * the real ones do -- shapes, ETags, 304s, and a refusal for a bad token.
 */
interface Fake {
  server: Server;
  base: string;
  hits: string[];
  issue: { state: string; comments: number; labels: string[] };
}

async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  let text = '';
  for await (const chunk of req) text += chunk;
  return text ? (JSON.parse(text) as Record<string, unknown>) : {};
}

async function fake(): Promise<Fake> {
  const state: Fake = {
    server: undefined as unknown as Server,
    base: '',
    hits: [],
    issue: { state: 'open', comments: 1, labels: ['bug'] },
  };
  state.server = createServer(async (req, res) => {
    const path = (req.url ?? '').split('?')[0] ?? '';
    state.hits.push(
      `${req.method} ${path}${req.headers['if-none-match'] ? ' (if-none-match)' : ''}`,
    );
    const json = (status: number, data: unknown, headers: Record<string, string> = {}): void => {
      res.writeHead(status, { 'content-type': 'application/json', ...headers });
      res.end(JSON.stringify(data));
    };
    const gh = req.headers.authorization === 'Bearer good';
    const gl = req.headers['private-token'] === 'good';
    // ---- GitHub
    if (path.startsWith('/gh/')) {
      if (!gh) return json(401, { message: 'Bad credentials' });
      const p = path.slice(3);
      if (p === '/user')
        return json(200, { login: 'ada', name: 'Ada' }, { 'x-oauth-scopes': 'repo, read:org' });
      if (p === '/repos/o/r')
        return json(200, { full_name: 'o/r', default_branch: 'main', permissions: { push: true } });
      if (p === '/repos/o/r/issues/7' && req.method === 'GET') {
        const etag = `"v-${state.issue.state}-${state.issue.comments}"`;
        if (req.headers['if-none-match'] === etag) {
          res.writeHead(304);
          return res.end();
        }
        return json(
          200,
          {
            number: 7,
            title: 'The button is grey',
            state: state.issue.state,
            body: 'It should be **blue**.',
            user: { login: 'ada' },
            assignees: [{ login: 'bo' }],
            labels: state.issue.labels.map((name) => ({ name, color: 'd73a4a' })),
            comments: state.issue.comments,
            html_url: 'https://github.com/o/r/issues/7',
          },
          { etag },
        );
      }
      if (p === '/repos/o/r/issues/7' && req.method === 'PATCH') {
        const b = await body(req);
        if (b.state) state.issue.state = String(b.state);
        if (Array.isArray(b.labels)) state.issue.labels = b.labels as string[];
        return json(200, {
          number: 7,
          title: 'The button is grey',
          state: state.issue.state,
          user: { login: 'ada' },
          assignees: [],
          labels: state.issue.labels.map((name) => ({ name })),
          comments: state.issue.comments,
          html_url: 'https://github.com/o/r/issues/7',
        });
      }
      if (p === '/repos/o/r/issues/7/comments' && req.method === 'POST') {
        state.issue.comments += 1;
        const b = await body(req);
        return json(201, {
          id: 99,
          user: { login: 'ada' },
          body: b.body,
          created_at: '2026-09-24T10:00:00Z',
        });
      }
      if (p === '/repos/o/r/issues' && req.method === 'POST') {
        const b = await body(req);
        return json(201, {
          number: 8,
          title: b.title,
          state: 'open',
          user: { login: 'ada' },
          assignees: [],
          labels: [],
          comments: 0,
          html_url: 'https://github.com/o/r/issues/8',
        });
      }
      if (p === '/repos/o/r/issues') {
        return json(200, [
          {
            number: 7,
            title: 'The button is grey',
            state: 'open',
            assignees: [],
            labels: [],
            comments: 1,
            html_url: 'x',
          },
          {
            number: 6,
            title: 'A pull request, not an issue',
            state: 'open',
            pull_request: {},
            assignees: [],
            labels: [],
            comments: 0,
            html_url: 'y',
          },
        ]);
      }
      if (p === '/repos/o/r/commits/abc123') {
        return json(200, {
          sha: 'abc123def',
          commit: {
            message: 'Make the button blue\n\nFixes #7, #9',
            author: { name: 'Ada', date: '2026-09-24T09:00:00Z' },
          },
          author: { login: 'ada' },
          html_url: 'https://github.com/o/r/commit/abc123def',
        });
      }
      return json(404, { message: 'Not Found' });
    }
    // ---- GitLab
    if (path.startsWith('/gl/')) {
      if (!gl) return json(401, { message: '401 Unauthorized' });
      const p = path.slice(3);
      if (p === '/user') return json(200, { username: 'ada', name: 'Ada' });
      if (p === '/personal_access_tokens/self') return json(200, { scopes: ['read_api'] });
      if (p === '/projects/g%2Fsub%2Fp/issues/3' && req.method === 'GET') {
        return json(200, {
          iid: 3,
          title: 'Deploy fails',
          state: state.issue.state === 'closed' ? 'closed' : 'opened',
          description: 'On staging',
          author: { username: 'ada' },
          assignees: [],
          labels: [{ name: 'ops', color: '#1f75cb' }],
          user_notes_count: 2,
          issue_type: 'incident',
          web_url: 'https://git.example.com/g/sub/p/-/issues/3',
        });
      }
      if (p === '/projects/g%2Fsub%2Fp/issues/3' && req.method === 'PUT') {
        const b = await body(req);
        if (b.state_event === 'close') state.issue.state = 'closed';
        return json(200, {});
      }
      return json(404, { message: '404 Project Not Found' });
    }
    json(404, { message: 'nothing' });
  });
  await new Promise<void>((done) => state.server.listen(0, '127.0.0.1', done));
  state.base = `http://127.0.0.1:${(state.server.address() as AddressInfo).port}`;
  return state;
}

let f: Fake;
let service: RemoteService;
let dir: string;

beforeAll(async () => {
  f = await fake();
  dir = mkdtempSync(join(tmpdir(), 'grimstroke-remote-'));
  service = new RemoteService(dir, {
    bases: { 'github.com': `${f.base}/gh`, 'git.example.com': `${f.base}/gl` },
  });
});
afterAll(() => f.server.close());

describe('keys', () => {
  it('refuses a token the service refuses, and keeps nothing', async () => {
    await expect(
      service.saveKey({ provider: 'github', host: 'github.com', token: 'bad' }),
    ).rejects.toThrow(/401 Bad credentials/);
    expect(await service.tokens.summary()).toEqual([]);
  });

  it('keeps a good one where only the user can read it, and never lists the token', async () => {
    const who = await service.saveKey({ provider: 'github', host: 'github.com', token: 'good' });
    expect(who).toMatchObject({ login: 'ada', canWrite: true });
    expect(statSync(join(dir, 'tokens.json')).mode & 0o777).toBe(0o600);
    const summary = await service.tokens.summary();
    expect(summary).toEqual([{ host: 'github.com', provider: 'github', user: 'ada' }]);
    expect(JSON.stringify(summary)).not.toContain('good');
  });

  it('knows a company host is GitLab once it has been connected', async () => {
    expect(service.providerOf('git.example.com')).toBeUndefined();
    const who = await service.saveKey({
      provider: 'gitlab',
      host: 'git.example.com',
      token: 'good',
    });
    expect(who).toMatchObject({ login: 'ada', scopes: ['read_api'], canWrite: false });
    expect(service.providerOf('git.example.com')).toBe('gitlab');
  });
});

describe('reading', () => {
  it('reads an issue into one shape, from either service', async () => {
    const gh = (await service.see({
      provider: 'github',
      host: 'github.com',
      repo: 'o/r',
      kind: 'issue',
      id: '7',
    })) as Issue;
    expect(gh).toMatchObject({
      number: '7',
      state: 'open',
      comments: 1,
      assignees: [{ login: 'bo' }],
    });
    expect(gh.labels[0]).toEqual({ name: 'bug', colour: '#d73a4a' });
    const gl = (await service.see({
      provider: 'gitlab',
      host: 'git.example.com',
      repo: 'g/sub/p',
      kind: 'issue',
      id: '3',
    })) as Issue;
    expect(gl).toMatchObject({
      number: '3',
      state: 'open',
      type: 'incident',
      comments: 2,
      labels: [{ name: 'ops', colour: '#1f75cb' }],
    });
  });

  it('asks again with the ETag, and a 304 is the answer it already had', async () => {
    f.hits.length = 0;
    await service.see({
      provider: 'github',
      host: 'github.com',
      repo: 'o/r',
      kind: 'issue',
      id: '7',
    });
    expect(f.hits).toContain('GET /gh/repos/o/r/issues/7 (if-none-match)');
  });

  it('leaves pull requests out of a list of issues', async () => {
    const rows = await service.ask({
      provider: 'github',
      host: 'github.com',
      repo: 'o/r',
      of: 'issues',
    });
    expect(rows.map((r) => r.number)).toEqual(['7']);
  });

  it('reads which issues a commit closes', async () => {
    const commit = await service.see({
      provider: 'github',
      host: 'github.com',
      repo: 'o/r',
      kind: 'commit',
      id: 'abc123',
    });
    expect(commit).toMatchObject({ closes: ['7', '9'] });
  });
});

describe('acting', () => {
  it('closes, comments and creates, and answers with the issue as it now is', async () => {
    const ref = {
      provider: 'github' as const,
      host: 'github.com',
      repo: 'o/r',
      kind: 'issue' as const,
      id: '7',
    };
    const closed = (await service.act(ref, { action: 'close' })) as Issue;
    expect(closed.state).toBe('closed');
    const commented = (await service.act(ref, {
      action: 'comment',
      body: 'fixed in abc123',
    })) as Issue;
    expect(commented.comments).toBe(2);
    const labelled = (await service.act(ref, {
      action: 'label',
      add: ['ui'],
      remove: ['bug'],
    })) as Issue;
    expect(labelled.labels.map((l) => l.name)).toEqual(['ui']);
    const made = await service.create(
      { provider: 'github', host: 'github.com', repo: 'o/r' },
      { title: 'New one' },
    );
    expect(made).toMatchObject({ number: '8', title: 'New one' });
  });

  it('refuses an empty reply before asking anyone', async () => {
    const ref = {
      provider: 'github' as const,
      host: 'github.com',
      repo: 'o/r',
      kind: 'issue' as const,
      id: '7',
    };
    await expect(service.act(ref, { action: 'comment', body: '  ' })).rejects.toThrow(
      /needs some words/,
    );
  });

  it('says plainly when there is no key for a host', async () => {
    await expect(
      service.see({
        provider: 'gitea',
        host: 'code.example.org',
        repo: 'a/b',
        kind: 'issue',
        id: '1',
      }),
    ).rejects.toThrow(/no key for code.example.org/);
  });
});

describe('addresses', () => {
  it('reads a pasted address on any of the services', () => {
    const gl = (host: string) => (host === 'git.example.com' ? ('gitlab' as const) : undefined);
    expect(refFromUrl('https://github.com/o/r/issues/12', gl)).toMatchObject({
      provider: 'github',
      repo: 'o/r',
      kind: 'issue',
      id: '12',
    });
    expect(refFromUrl('https://github.com/o/r/pull/5', gl)).toMatchObject({
      kind: 'merge',
      id: '5',
    });
    expect(refFromUrl('https://git.example.com/g/sub/p/-/merge_requests/4', gl)).toMatchObject({
      provider: 'gitlab',
      repo: 'g/sub/p',
      kind: 'merge',
      id: '4',
    });
    expect(refFromUrl('https://git.example.com/g/p/-/pipelines/99', gl)).toMatchObject({
      kind: 'pipeline',
      id: '99',
    });
    expect(refFromUrl('https://example.com/nothing', gl)).toBeUndefined();
    expect(
      webUrl({ provider: 'gitlab', host: 'git.example.com', repo: 'g/p', kind: 'issue', id: '3' }),
    ).toBe('https://git.example.com/g/p/-/issues/3');
  });

  it('finds every issue a message closes, and nothing that only mentions one', () => {
    expect(closesIn('Fix the grey button\n\nCloses #12 and #13. See #40.')).toEqual(['12', '13']);
    expect(closesIn('resolved #3')).toEqual(['3']);
    expect(closesIn('mentions #9 only')).toEqual([]);
  });
});
