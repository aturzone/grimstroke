import { describe, expect, it } from 'vitest';
import { renderRemote } from '~/draw/material/remote/render.ts';

const link = { provider: 'gitlab' as const, host: 'git.example.com', repo: 'team/app' };

describe('repository cards', () => {
  it('draws an issue from its snapshot, with its tick and reply line', () => {
    const html = renderRemote({
      ref: { ...link, kind: 'issue', id: '12' },
      seen: {
        number: '12',
        title: 'Grey button :bug:',
        state: 'closed',
        assignees: [{ login: 'ada lovelace' }],
        labels: [{ name: 'ui', colour: '#1f75cb' }],
        comments: 2,
        url: 'https://git.example.com/team/app/-/issues/12',
      },
      seenAt: '2026-09-24T10:11:12Z',
      fixedBy: 'f00dcafe1234',
    });
    expect(html).toContain('rc-issue is-closed');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('data-gs="remote-reply"');
    expect(html).toContain('emoji-sticker');
    expect(html).toContain('fixed in <code>f00dcafe</code>');
    expect(html).toContain('seen 2026-09-24 10:11');
    expect(html).toContain('>AL<');
  });

  it('draws a merge request, a commit, a pipeline and a live list', () => {
    expect(
      renderRemote({
        ref: { ...link, kind: 'merge', id: '7' },
        seen: {
          number: '7',
          title: 'Fix',
          state: 'merged',
          source: 'fix',
          target: 'main',
          checks: 'passed',
          approvals: 2,
          url: '',
        },
      }),
    ).toContain('MERGED');
    expect(
      renderRemote({
        ref: { ...link, kind: 'commit', id: 'abc' },
        seen: { sha: 'abcdef123456', message: 'Stop it\n\nCloses #1', closes: ['1'], url: '' },
      }),
    ).toContain('closes #1');
    expect(
      renderRemote({
        ref: { ...link, kind: 'pipeline', id: '9' },
        seen: {
          id: '9',
          ref: 'main',
          status: 'failed',
          jobs: [{ name: 'test', status: 'failed' }],
          url: '',
        },
      }),
    ).toContain('rc-job-failed');
    const list = renderRemote({
      query: { ...link, of: 'issues', labels: ['bug'], assignee: 'me' },
      rows: [
        {
          number: '1',
          title: 'One',
          state: 'open',
          assignees: [],
          labels: [],
          comments: 0,
          url: '',
        },
      ],
    });
    expect(list).toContain('open · issues · bug · assigned to me');
    expect(list).toContain('#1');
  });

  it('shows what went wrong in the service’s own words, and keeps what it last saw', () => {
    const html = renderRemote({
      ref: { ...link, kind: 'issue', id: '3' },
      error: '403 Forbidden -- the token is not allowed to do that',
    });
    expect(html).toContain('could not be fetched');
    expect(html).toContain('403 Forbidden');
  });
});
