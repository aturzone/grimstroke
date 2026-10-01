/**
 * The cards a repository's things are drawn as: an issue, a merge request, a commit, a
 * pipeline, and a live list of any of them.
 *
 * Drawn from the snapshot each card keeps, never from the network: a card in an export, a backup,
 * or on a train still reads correctly, marked with when it was last seen. On a live page the
 * card carries its controls -- the tick that closes, the reply line that comments -- as hooks
 * the app answers; printed, they are only a box and a line.
 */

import {
  type Commit,
  type Issue,
  type Merge,
  type Pipeline,
  type RemoteBlock,
  type RemoteQuery,
  type RemoteRef,
  webUrl,
} from '~/draw/doc/remote/model.ts';
import { queryTitle, remoteText } from '~/draw/doc/remote/text.ts';
import { renderMarkdown } from '~/draw/material/note/markdown.ts';

export { queryTitle, remoteText };

import { renderStickerFace, withShortcodes } from '~/draw/material/sticker/render.ts';
import { escapeHtml } from '~/draw/type/text.ts';

export type { RemoteBlock } from '~/draw/doc/remote/model.ts';

const esc = escapeHtml;

function when(at: string | undefined): string {
  return at ? at.replace('T', ' ').slice(0, 16) : '';
}

function initials(login: string): string {
  const parts = login
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ');
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '')).toUpperCase() || '?';
}

/** Where it lives, with the service's mark as a small sticker: the one line every card has. */
function header(ref: { provider: string; repo: string }, tag: string): string {
  return (
    '<header class="rc-head">' +
    `<span class="rc-brand">${renderStickerFace({ mark: ref.provider })}</span>` +
    `<span class="rc-where">${esc(ref.repo)}</span><span class="rc-tag">${esc(tag)}</span>` +
    '</header>'
  );
}

function footer(block: RemoteBlock, extra = ''): string {
  return (
    '<footer class="rc-foot">' +
    extra +
    (block.seenAt
      ? `<span class="rc-seen" title="as last seen">seen ${esc(when(block.seenAt))}</span>`
      : '') +
    '</footer>' +
    (block.error ? `<p class="rc-error" role="alert">${esc(block.error)}</p>` : '')
  );
}

function stamp(state: string, tone: string): string {
  return `<span class="rc-stamp rc-stamp-${tone}">${esc(state.toUpperCase())}</span>`;
}

function people(list: ReadonlyArray<{ login: string; name?: string }>): string {
  return list
    .slice(0, 4)
    .map(
      (p) =>
        `<span class="rc-face" title="${esc(p.name ?? p.login)}">${esc(initials(p.login))}</span>`,
    )
    .join('');
}

function issueCard(ref: RemoteRef, issue: Issue, block: RemoteBlock): string {
  const labels = issue.labels
    .slice(0, 6)
    .map(
      (l) =>
        `<span class="rc-label" style="--label:${esc(l.colour ?? '#8a8f98')}">${esc(l.name)}</span>`,
    )
    .join('');
  const body = (issue.body ?? '').trim();
  const excerpt = body
    ? `<div class="rc-body note-md">${renderMarkdown(body.length > 420 ? `${body.slice(0, 420)}…` : body)}</div>`
    : '';
  const closed = issue.state === 'closed';
  return (
    `<article class="rc rc-issue${closed ? ' is-closed' : ''}" data-gs="remote" data-remote-kind="issue">` +
    header(ref, `${ref.provider === 'gitlab' ? '#' : '#'}${issue.number}`) +
    '<div class="rc-title-row">' +
    `<button type="button" class="rc-tick" data-gs="remote-tick" aria-pressed="${closed}" ` +
    `aria-label="${closed ? 'reopen' : 'close'} #${esc(issue.number)}"></button>` +
    `<h3 class="rc-title" dir="auto">${withShortcodes(esc(issue.title))}</h3>` +
    '</div>' +
    stamp(closed ? 'closed' : 'open', closed ? 'closed' : 'open') +
    (block.fixedBy
      ? `<p class="rc-fixed">fixed in <code>${esc(block.fixedBy.slice(0, 8))}</code>${closed ? '' : ' -- close it when that lands'}</p>`
      : '') +
    (issue.type && issue.type !== 'issue'
      ? `<span class="rc-type">${esc(issue.type)}</span>`
      : '') +
    (labels ? `<div class="rc-labels">${labels}</div>` : '') +
    excerpt +
    footer(
      block,
      `<span class="rc-people">${people(issue.assignees)}</span>` +
        `<button type="button" class="rc-count" data-gs="remote-thread" title="the whole conversation">${issue.comments} ${issue.comments === 1 ? 'reply' : 'replies'}</button>`,
    ) +
    '<form class="rc-reply" data-gs="remote-reply">' +
    '<input class="rc-reply-line" name="body" dir="auto" autocomplete="off" placeholder="write a reply…" aria-label="a reply">' +
    '<button type="submit" class="rc-send" data-gs="remote-send">send</button>' +
    '</form>' +
    `<a class="rc-open" href="${esc(issue.url || webUrl(ref))}" target="_blank" rel="noopener">open on ${esc(ref.host)}</a>` +
    '</article>'
  );
}

function mergeCard(ref: RemoteRef, merge: Merge, block: RemoteBlock): string {
  const tone = merge.state === 'merged' ? 'merged' : merge.state === 'closed' ? 'closed' : 'open';
  const checks =
    merge.checks && merge.checks !== 'none'
      ? `<span class="rc-checks rc-checks-${merge.checks}" title="checks ${merge.checks}">${
          merge.checks === 'passed' ? '✓' : merge.checks === 'failed' ? '✗' : '…'
        } checks</span>`
      : '';
  return (
    `<article class="rc rc-merge" data-gs="remote" data-remote-kind="merge">` +
    header(ref, `${ref.provider === 'gitlab' ? '!' : '#'}${merge.number}`) +
    `<h3 class="rc-title" dir="auto">${withShortcodes(esc(merge.title))}</h3>` +
    `<p class="rc-branches"><code>${esc(merge.source)}</code> → <code>${esc(merge.target)}</code></p>` +
    stamp(
      merge.draft && merge.state === 'open' ? 'draft' : merge.state,
      merge.draft ? 'draft' : tone,
    ) +
    footer(
      block,
      checks +
        (merge.approvals ? `<span class="rc-count">${merge.approvals} approved</span>` : '') +
        (merge.author ? `<span class="rc-people">${people([merge.author])}</span>` : ''),
    ) +
    `<a class="rc-open" href="${esc(merge.url || webUrl(ref))}" target="_blank" rel="noopener">open on ${esc(ref.host)}</a>` +
    '</article>'
  );
}

function commitCard(ref: RemoteRef, commit: Commit, block: RemoteBlock): string {
  const [first, ...rest] = commit.message.split('\n');
  const closes = commit.closes
    .map((n) => `<span class="rc-closes">closes #${esc(n)}</span>`)
    .join('');
  return (
    `<article class="rc rc-commit" data-gs="remote" data-remote-kind="commit">` +
    header(ref, 'commit') +
    `<p class="rc-sha">${esc(commit.sha.slice(0, 8))}</p>` +
    `<h3 class="rc-title" dir="auto">${withShortcodes(esc(first ?? ''))}</h3>` +
    (rest.join('\n').trim()
      ? `<p class="rc-more" dir="auto">${esc(rest.join('\n').trim().slice(0, 240))}</p>`
      : '') +
    (closes ? `<div class="rc-labels">${closes}</div>` : '') +
    footer(
      block,
      (commit.author ? `<span class="rc-people">${people([commit.author])}</span>` : '') +
        (commit.at ? `<span class="rc-count">${esc(when(commit.at))}</span>` : ''),
    ) +
    `<a class="rc-open" href="${esc(commit.url || webUrl(ref))}" target="_blank" rel="noopener">open on ${esc(ref.host)}</a>` +
    '</article>'
  );
}

function pipelineCard(ref: RemoteRef, pipeline: Pipeline, block: RemoteBlock): string {
  const jobs = pipeline.jobs
    .slice(0, 24)
    .map(
      (j) =>
        `<span class="rc-job rc-job-${j.status}" title="${esc(`${j.name}: ${j.status}`)}"></span>`,
    )
    .join('');
  return (
    `<article class="rc rc-pipeline" data-gs="remote" data-remote-kind="pipeline">` +
    header(ref, `pipeline ${pipeline.id}`) +
    `<h3 class="rc-title"><code>${esc(pipeline.ref)}</code></h3>` +
    stamp(
      pipeline.status,
      pipeline.status === 'passed' ? 'open' : pipeline.status === 'failed' ? 'failed' : 'draft',
    ) +
    `<div class="rc-jobs">${jobs}</div>` +
    footer(block) +
    `<a class="rc-open" href="${esc(pipeline.url || webUrl(ref))}" target="_blank" rel="noopener">open on ${esc(ref.host)}</a>` +
    '</article>'
  );
}

function queryCard(q: RemoteQuery, block: RemoteBlock): string {
  const rows = (block.rows ?? [])
    .slice(0, q.limit ?? 8)
    .map((row) => {
      const state = row.state;
      return (
        `<li class="rc-row rc-row-${state}"><span class="rc-dot"></span>` +
        `<span class="rc-row-n">${q.of === 'merges' && q.provider === 'gitlab' ? '!' : '#'}${esc(row.number)}</span>` +
        `<span class="rc-row-title" dir="auto">${withShortcodes(esc(row.title))}</span></li>`
      );
    })
    .join('');
  const more =
    (block.rows?.length ?? 0) > (q.limit ?? 8)
      ? `<li class="rc-row-more">and more on ${esc(q.host)}</li>`
      : '';
  const count = block.rows?.length ?? 0;
  const over = q.wip !== undefined && count > q.wip;
  const tally = q.wip !== undefined ? `${count} / ${q.wip}` : String(count);
  return (
    `<article class="rc rc-query${over ? ' is-over' : ''}" data-gs="remote" data-remote-kind="query">` +
    header(q, 'live list') +
    `<h3 class="rc-title">${esc(queryTitle(q))}</h3>` +
    (rows
      ? `<ol class="rc-rows">${rows}${more}</ol>`
      : '<p class="rc-empty">nothing, as last seen</p>') +
    footer(
      block,
      `<span class="rc-count${over ? ' rc-over' : ''}" title="${over ? 'over the limit' : 'how many'}">${esc(tally)}</span>`,
    ) +
    '</article>'
  );
}

/** A card for whatever the block names. */
export function renderRemote(block: RemoteBlock): string {
  let card: string;
  if (block.query) card = queryCard(block.query, block);
  else if (!block.ref)
    card = '<article class="rc rc-missing">a repository card with nothing named</article>';
  else if (!block.seen)
    card =
      `<article class="rc rc-loading" data-gs="remote" data-remote-kind="${esc(block.ref.kind)}">` +
      header(
        block.ref,
        block.ref.kind === 'commit' ? block.ref.id.slice(0, 8) : `#${block.ref.id}`,
      ) +
      `<p class="rc-empty">${block.error ? 'could not be fetched' : 'fetching…'}</p>${footer(block)}</article>`;
  else {
    const ref = block.ref;
    const seen = block.seen;
    card =
      ref.kind === 'issue'
        ? issueCard(ref, seen as Issue, block)
        : ref.kind === 'merge'
          ? mergeCard(ref, seen as Merge, block)
          : ref.kind === 'commit'
            ? commitCard(ref, seen as Commit, block)
            : pipelineCard(ref, seen as Pipeline, block);
  }
  return `<div class="block remote-block">${card}</div>`;
}
