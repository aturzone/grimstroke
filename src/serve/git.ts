/**
 * Git said in words, over HTTP: what a sentence means, and doing it.
 *
 *   POST /api/git/understand  { text, last? }              -> the plan, done nothing
 *   POST /api/git/do          { text, last?, confirmed? }  -> the plan, done -- or why not yet
 *
 * The sentence is understood again on every call, here, from its words: a plan sent by a page is
 * never trusted to say what to do. The understanding (box/git/understand.ts) and its model are
 * loaded the first time a sentence about git arrives, never before, so a server nobody asks about
 * git does not hold them.
 */

import type { GitContext } from '@core/box/git/understand.ts';
import { type Ask, readBody, send } from '@core/serve/http.ts';
import type { Live } from '@core/serve/live.ts';

type Understand = typeof import('@core/box/git/understand.ts');
type Do = typeof import('@core/git/do.ts');
let mind: Promise<[Understand, Do]> | undefined;
const load = (): Promise<[Understand, Do]> =>
  (mind ??= Promise.all([import('@core/box/git/understand.ts'), import('@core/git/do.ts')]));

interface Said {
  text?: string;
  last?: GitContext['last'];
  confirmed?: boolean;
}

export async function gitApi(ask: Ask, live: Live): Promise<boolean> {
  const { path, req, res } = ask;
  const asked = path === '/api/git/understand' || path === '/api/git/do';
  if (!asked || req.method !== 'POST') return false;
  const body = (await readBody(req)) as Said;
  const text = String(body.text ?? '').trim();
  if (!text) {
    send(res, 400, { error: 'say something to git: "close #12", "merge PR 14", "push"' });
    return true;
  }
  const [{ understandGit }, { doGit }] = await load();
  const ctx: GitContext = body.last ? { last: body.last } : {};
  const plan = understandGit(text, ctx);
  if (path === '/api/git/understand') {
    send(res, 200, { plan });
    return true;
  }
  const result = await doGit(plan, {
    live,
    confirmed: body.confirmed === true,
    ...(body.last ? { last: body.last } : {}),
  });
  send(res, 200, result);
  return true;
}
