/**
 * An issue typed into the / box, end to end: the workspace against a stand-in for GitHub that
 * answers the calls the adapter makes. The labels must be the repository's own, chosen from the
 * sentence; the picture must reach the issue; the card must say which number it became.
 */

import { mkdtempSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type Serving, serve } from '@core/serve/server.ts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let running: Serving;
let github: Server;
let base: string;
const seen: Array<{ method: string; path: string; body: Record<string, unknown> }> = [];
let refExists = false;
let closed = false;

async function json(req: IncomingMessage): Promise<Record<string, unknown>> {
  let text = '';
  for await (const chunk of req) text += chunk;
  try {
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const ask = (path: string, init?: RequestInit): Promise<Response> =>
  fetch(`${base}${path}`, {
    ...init,
    headers: {
      'x-grimstroke-token': running.token,
      'content-type': 'application/json',
      ...((init?.headers as Record<string, string>) ?? {}),
    },
  });

beforeAll(async () => {
  github = createServer(async (req, res) => {
    const path = (req.url ?? '').split('?')[0] ?? '';
    const body = await json(req);
    seen.push({ method: req.method ?? 'GET', path, body });
    const send = (status: number, data: unknown): void => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(data));
    };
    if (req.headers.authorization !== 'Bearer good')
      return send(401, { message: 'Bad credentials' });
    if (path === '/user') return send(200, { login: 'ada' });
    if (path === '/user/repos') return send(200, [{ full_name: 'acme/web', private: false }]);
    if (path === '/repos/acme/web')
      return send(200, {
        full_name: 'acme/web',
        default_branch: 'main',
        permissions: { push: true },
      });
    if (path === '/repos/acme/web/labels')
      return send(
        200,
        ['type: bug', 'kind/feature', 'area/frontend', 'mobile', 'performance', 'P1'].map(
          (name) => ({ name, color: 'ededed' }),
        ),
      );
    if (path === '/repos/acme/web/issues' && req.method === 'GET')
      return send(200, [
        {
          number: 42,
          title: 'The save button is slow',
          state: 'open',
          labels: [{ name: 'mobile' }],
          html_url: 'https://github.com/acme/web/issues/42',
        },
        {
          number: 43,
          title: 'a pull request',
          state: 'open',
          labels: [],
          pull_request: {},
          html_url: 'x',
        },
      ]);
    if (path === '/repos/acme/web/issues/42' && req.method === 'GET')
      return send(200, {
        number: 42,
        title: 'x',
        state: closed ? 'closed' : 'open',
        labels: [],
        html_url: 'https://github.com/acme/web/issues/42',
      });
    if (path === '/repos/acme/web/issues/42/comments' && req.method === 'POST')
      return send(201, { id: 1, body: body.body, user: { login: 'ada' } });
    if (path === '/repos/acme/web/issues' && req.method === 'POST')
      return send(201, {
        number: 42,
        title: body.title,
        state: 'open',
        labels: body.labels,
        html_url: 'https://github.com/acme/web/issues/42',
      });
    if (path === '/repos/acme/web/issues/42' && req.method === 'PATCH' && body.state === 'closed') {
      closed = true;
      return send(200, {
        number: 42,
        title: 'x',
        state: 'closed',
        labels: [],
        html_url: 'https://github.com/acme/web/issues/42',
      });
    }
    if (path === '/repos/acme/web/issues/42' && req.method === 'PATCH')
      return send(200, {
        number: 42,
        title: 'x',
        state: 'open',
        body: body.body,
        html_url: 'https://github.com/acme/web/issues/42',
      });
    if (path === '/repos/acme/web/git/ref/heads/grimstroke-uploads')
      return refExists ? send(200, { object: { sha: 'b' } }) : send(404, { message: 'Not Found' });
    if (path === '/repos/acme/web/git/ref/heads/main') return send(200, { object: { sha: 'a1' } });
    if (path === '/repos/acme/web/git/refs' && req.method === 'POST') {
      refExists = true;
      return send(201, { ref: body.ref });
    }
    if (path.startsWith('/repos/acme/web/contents/') && req.method === 'PUT')
      return send(201, { content: {} });
    return send(404, { message: 'Not Found' });
  });
  await new Promise<void>((done) => github.listen(0, '127.0.0.1', done));
  process.env.GRIMSTROKE_REMOTE_BASES = `github.com=http://127.0.0.1:${(github.address() as AddressInfo).port}`;
  running = await serve({
    dir: mkdtempSync(join(tmpdir(), 'grimstroke-issue-')),
    port: 0,
  });
  base = `http://127.0.0.1:${running.port}`;
  const key = await ask('/api/remote/keys', {
    method: 'POST',
    body: JSON.stringify({ provider: 'github', host: 'github.com', token: 'good' }),
  });
  expect(key.status).toBe(200);
});

afterAll(async () => {
  await running.close();
  github.close();
  delete process.env.GRIMSTROKE_REMOTE_BASES;
});

describe('an issue from the / box', () => {
  it('lists the repositories a connected account can see', async () => {
    const { repos } = (await (await ask('/api/remote/targets')).json()) as {
      repos: Array<{ repo: string }>;
    };
    expect(repos.map((r) => r.repo)).toContain('acme/web');
  });

  it("opens it with the repository's own labels and the pasted picture, and keeps its card", async () => {
    const png = Buffer.from('89504e470d0a1a0a', 'hex');
    const asset = (await (
      await fetch(`${base}/api/assets?name=shot.png`, {
        method: 'POST',
        headers: { 'x-grimstroke-token': running.token },
        body: png,
      })
    ).json()) as { name: string };
    const res = await ask('/api/remote/issue', {
      method: 'POST',
      body: JSON.stringify({
        block: {
          kind: 'shape',
          intent: 'issue',
          text: 'bug: the save button is very slow on the phone in web repo description: tap and wait',
        },
        images: [{ asset: asset.name, name: 'shot.png', type: 'image/png' }],
      }),
    });
    const reply = (await res.json()) as {
      issue: { number: string };
      labels: string[];
      address: string;
      id: string;
    };
    expect(res.status).toBe(200);
    expect(reply.issue.number).toBe('42');
    expect(reply.labels).toEqual(expect.arrayContaining(['type: bug', 'mobile', 'performance']));
    expect(reply.labels).not.toContain('kind/feature');

    const created = seen.find((s) => s.path === '/repos/acme/web/issues' && s.method === 'POST');
    expect(created?.body.title).toBe('The save button is very slow on the phone');
    expect(created?.body.body).toBe('tap and wait');
    expect(seen.some((s) => s.path === '/repos/acme/web/git/refs')).toBe(true);
    const patched = seen.find((s) => s.method === 'PATCH');
    expect(String(patched?.body.body)).toMatch(
      /tap and wait\n\n!\[shot\.png\]\(https:\/\/github\.com\/acme\/web\/blob\/grimstroke-uploads\/issues\/42\//,
    );

    // The card on the / board says what it became.
    const { cards } = (await (await ask('/api/slash')).json()) as {
      cards: Array<{ id: string; block: { state?: { issue?: { number: string } } } }>;
    };
    expect(cards.find((c) => c.id === reply.id)?.block.state?.issue?.number).toBe('42');
  });

  it('says which repository is meant when none can be told', async () => {
    const res = await ask('/api/remote/issue', {
      method: 'POST',
      body: JSON.stringify({
        block: { kind: 'shape', intent: 'issue', text: 'bug: x is broken in nowhere/else' },
      }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toMatch(/nowhere\/else/);
  });

  it("lists a repository's open issues, and leaves pull requests out", async () => {
    const reply = (await (await ask('/api/remote/issues?repo=web')).json()) as {
      repo: string;
      issues: Array<{ number: string; title: string }>;
    };
    expect(reply.repo).toBe('github.com/acme/web');
    expect(reply.issues.map((i) => i.number)).toEqual(['42']);
  });

  it('closes and comments on an issue named by its number', async () => {
    const shut = await ask('/api/remote/issues/act', {
      method: 'POST',
      body: JSON.stringify({ repo: 'web', number: '#42', action: 'close' }),
    });
    expect(shut.status).toBe(200);
    expect(((await shut.json()) as { issue: { state: string } }).issue.state).toBe('closed');
    const said = await ask('/api/remote/issues/act', {
      method: 'POST',
      body: JSON.stringify({ repo: 'web', number: 42, action: 'comment', body: 'fixed in 0.7' }),
    });
    expect(said.status).toBe(200);
    expect(
      seen.some((s) => s.path.endsWith('/issues/42/comments') && s.body.body === 'fixed in 0.7'),
    ).toBe(true);
  });
});
