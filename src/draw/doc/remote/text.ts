/**
 * A repository card's words, for search and for a query's name: data, not drawing.
 */

import type { Commit, Issue, RemoteBlock, RemoteQuery } from '~/draw/doc/remote/model.ts';

/** What a query asks for, in a few words: "open · bug · assigned to me". */
export function queryTitle(q: RemoteQuery): string {
  if (q.title) return q.title;
  const parts = [
    q.state === 'all' ? 'all' : (q.state ?? 'open'),
    q.of === 'merges' ? 'merge requests' : 'issues',
    ...(q.labels ?? []),
    ...(q.assignee ? [q.assignee === 'me' ? 'assigned to me' : `for ${q.assignee}`] : []),
    ...(q.search ? [`“${q.search}”`] : []),
  ];
  return parts.join(' · ');
}

/** The words on a card, for search. */
export function remoteText(block: RemoteBlock): string[] {
  const out: string[] = [];
  const seen = block.seen as Partial<Issue & Commit> | undefined;
  if (seen?.title) out.push(seen.title);
  if (seen?.message) out.push(seen.message);
  if (seen?.body) out.push(seen.body);
  for (const row of block.rows ?? []) out.push(row.title);
  if (block.query) out.push(queryTitle(block.query));
  return out;
}
