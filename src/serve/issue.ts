/**
 * Repositories over HTTP: the routes the / box and an agent use, each a thin door onto
 * git/work.ts, which the command line uses too.
 */

import type { ShapeBlock } from '@core/box/card.ts';
import {
  actOnIssue,
  followEdits,
  GitProblem,
  labelsOf,
  listIssues,
  openIssue,
  repositories,
} from '@core/git/work.ts';
import { onBoardChange } from '@core/serve/api.ts';
import { type Ask, readBody, send } from '@core/serve/http.ts';
import type { Live } from '@core/serve/live.ts';

onBoardChange(followEdits);

function refused(ask: Ask, error: unknown): true {
  const p =
    error instanceof GitProblem
      ? error
      : new GitProblem(500, error instanceof Error ? error.message : String(error));
  send(ask.res, p.status, { error: p.message, ...p.extra });
  return true;
}

export async function issueApi(ask: Ask, live: Live): Promise<boolean> {
  const { path, req, res, url } = ask;
  try {
    if (path === '/api/remote/targets' && req.method === 'GET') {
      send(res, 200, {
        accounts: await live.remote.tokens.summary(),
        repos: await repositories(live, url.searchParams.has('fresh')),
      });
      return true;
    }

    if (path === '/api/remote/labels' && req.method === 'GET') {
      const host = url.searchParams.get('host') ?? '';
      const repo = url.searchParams.get('repo') ?? '';
      const t = (await repositories(live)).find((x) => x.host === host && x.repo === repo);
      if (!t) throw new GitProblem(404, 'that repository is not one a connected account can see');
      send(res, 200, { labels: await labelsOf(live, t) });
      return true;
    }

    // A repository's issues, for the box: { repo?, mine?, state?, last? }.
    if (path === '/api/remote/issues' && req.method === 'GET') {
      send(
        res,
        200,
        await listIssues(live, {
          repo: url.searchParams.get('repo') || null,
          mine: url.searchParams.has('mine'),
          state: url.searchParams.get('state'),
          ...(url.searchParams.get('last') ? { last: url.searchParams.get('last') as string } : {}),
        }),
      );
      return true;
    }

    // Close, reopen or comment on an issue by its number: { repo?, number, action, body? }.
    if (path === '/api/remote/issues/act' && req.method === 'POST') {
      const body = (await readBody(req)) as {
        repo?: string;
        number?: string | number;
        action?: string;
        body?: string;
        last?: string;
      };
      send(
        res,
        200,
        await actOnIssue(live, {
          repo: body.repo || null,
          number: body.number ?? '',
          action: body.action ?? '',
          ...(body.body !== undefined ? { body: body.body } : {}),
          ...(body.last ? { last: body.last } : {}),
        }),
      );
      return true;
    }

    // Open an issue from a card the box made: { block, address?, id?, images?, last? }.
    if (path === '/api/remote/issue' && req.method === 'POST') {
      const body = (await readBody(req)) as {
        block?: ShapeBlock;
        address?: string;
        id?: string;
        images?: Array<{ name?: string; type?: string; asset?: string }>;
        last?: string;
      };
      send(res, 200, await openIssue(live, body));
      return true;
    }
  } catch (error) {
    return refused(ask, error);
  }
  return false;
}
