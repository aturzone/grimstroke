/**
 * Doing what a git sentence asked: the plan understand.ts made, carried out on the service or on
 * a working copy, and answered in the sentence's own language.
 *
 * One door for every caller -- the box over HTTP, the command line, an agent -- so none of them
 * can do it differently. It never does more than the plan says, and never does anything that
 * changes something unless the plan is confirmed: a plan with something missing says what is
 * missing, a plan not yet confirmed says what it would do and waits.
 */

import { join } from 'node:path';
import type { SlotName } from '@core/box/git/actions.ts';
import type { GitContext, GitPlan } from '@core/box/git/understand.ts';
import type { Lang } from '@core/box/text.ts';
import type { Remote } from '@core/git/adapter.ts';
import { RemoteError } from '@core/git/http.ts';
import { cloneInto, GitFailed, initAt, keyHeader, WorkingCopy } from '@core/git/local.ts';
import { type Merge, PROVIDERS, type Provider } from '@core/git/model.ts';
import {
  GitProblem,
  listIssues,
  openIssue,
  repositories,
  repositoryFor,
  type Target,
} from '@core/git/work.ts';
import type { Live } from '@core/serve/live.ts';

export interface GitItem {
  title: string;
  url?: string;
  /** A short line under it: state, labels, who, when. */
  meta?: string;
}

export interface GitResult {
  /** Done. False: waiting for a confirmation, for something missing, or it failed. */
  ok: boolean;
  action: string | null;
  plan: GitPlan;
  /** Asks to be confirmed before it is done. */
  confirm?: boolean;
  /** What it cannot be done without. */
  missing?: SlotName[];
  /** One line, in the sentence's language. */
  says: string;
  items?: GitItem[];
  /** A long answer: a diff, a file, a status. */
  text?: string;
  url?: string;
  /** What was talked about now, for the next sentence's "it". */
  last?: GitContext['last'];
  /** The service's or git's own answer, for an agent. */
  data?: unknown;
}

export interface GitEnv {
  live: Live;
  /** A working copy here: the command line's folder. The server has its clones instead. */
  local?: WorkingCopy | null;
  /** The folder a person runs grimstroke in, on their own machine; absent on a server. */
  here?: string;
  /** The plan may be done: it was shown, and confirmed. */
  confirmed?: boolean;
  last?: GitContext['last'];
}

const say = (lang: Lang, en: string, fa: string, ru: string): string =>
  lang === 'fa' ? fa : lang === 'ru' ? ru : en;

const ASK: Partial<Record<SlotName, [string, string, string]>> = {
  number: ['which number?', 'شماره‌اش چنده؟', 'какой номер?'],
  repo: ['which repository?', 'کدوم ریپو؟', 'какой репозиторий?'],
  people: ['who?', 'به کی؟', 'кому?'],
  labels: ['which label?', 'کدوم لیبل؟', 'какая метка?'],
  title: ['what should it be called?', 'اسمش چی باشه؟', 'как назвать?'],
  body: ['what should it say?', 'چی بنویسم؟', 'что написать?'],
  branch: ['which branch?', 'کدوم برنچ؟', 'какая ветка?'],
  base: ['into which branch?', 'به کدوم برنچ؟', 'в какую ветку?'],
  ref: ['which commit?', 'کدوم کامیت؟', 'какой коммит?'],
  tag: ['which version?', 'کدوم نسخه؟', 'какая версия?'],
  path: ['which file?', 'کدوم فایل؟', 'какой файл?'],
  query: ['looking for what?', 'دنبال چی بگردم؟', 'что искать?'],
  milestone: ['which milestone?', 'کدوم مایلستون؟', 'какая веха?'],
  host: ['which account?', 'کدوم حساب؟', 'какой аккаунт?'],
  url: ['at which address?', 'آدرسش چیه؟', 'какой адрес?'],
};

/** Do what the plan says -- or say why not yet. */
export async function doGit(plan: GitPlan, env: GitEnv): Promise<GitResult> {
  const lang = plan.lang;
  const base = { action: plan.action?.id ?? null, plan };
  if (!plan.action) return { ...base, ok: false, says: plan.says };
  if (plan.missing.length) {
    const asks = plan.missing.map((m) => {
      const q = ASK[m];
      return q ? say(lang, ...q) : m;
    });
    return { ...base, ok: false, missing: plan.missing, says: `${plan.says} — ${asks.join(' ')}` };
  }
  if (plan.confirm && !env.confirmed) return { ...base, ok: false, confirm: true, says: plan.says };
  try {
    const done =
      plan.where === 'local'
        ? await onLocal(plan, env)
        : plan.where === 'account'
          ? await onAccounts(plan, env)
          : await onService(plan, env);
    return { ...base, ok: true, ...done };
  } catch (error) {
    const message =
      error instanceof GitProblem || error instanceof RemoteError || error instanceof GitFailed
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);
    return { ...base, ok: false, says: `${plan.says} — ${message}` };
  }
}

type Done = Omit<GitResult, 'ok' | 'action' | 'plan'>;

// ---------------------------------------------------------------- on the service

const when = (at?: string): string => (at ? at.slice(0, 10) : '');

function mergeLine(m: Merge): GitItem {
  return {
    title: `!${m.number} ${m.title}`,
    url: m.url,
    meta: [
      m.state,
      `${m.source} → ${m.target}`,
      m.draft ? 'draft' : '',
      m.checks && m.checks !== 'none' ? `ci ${m.checks}` : '',
      m.author?.login ?? '',
    ]
      .filter(Boolean)
      .join(' · '),
  };
}

async function target(env: GitEnv, plan: GitPlan): Promise<{ t: Target; r: Remote }> {
  const t = await repositoryFor(env.live, plan.slots.repo ?? null, env.last?.repo);
  return { t, r: await env.live.remote.adapter(t) };
}

async function onService(plan: GitPlan, env: GitEnv): Promise<Done> {
  const s = plan.slots;
  const lang = plan.lang;
  const id = plan.action?.id ?? '';
  const n = s.number ?? '';

  // Opening an issue is the box's own path: its card, its labels, its pictures.
  if (id === 'issue.create') {
    const opened = await openIssue(env.live, {
      block: { kind: 'shape', intent: 'issue', text: plan.text, made: new Date().toISOString() },
      ...(env.last?.repo ? { last: env.last.repo } : {}),
    });
    return {
      says: say(
        lang,
        `#${opened.issue.number} opened in ${opened.repo}`,
        `ایشوی #${opened.issue.number} در ${opened.repo} باز شد`,
        `#${opened.issue.number} создана в ${opened.repo}`,
      ),
      url: opened.issue.url,
      last: {
        object: 'issue',
        number: opened.issue.number,
        repo: opened.repo.split('/').slice(1).join('/'),
      },
      data: opened,
    };
  }
  if (id === 'repo.list') {
    const list = await repositories(env.live, true);
    const shown = list.filter((r) => !s.provider || r.provider === s.provider);
    return {
      says: say(
        lang,
        `${shown.length} repositories`,
        `${shown.length} ریپو`,
        `${shown.length} репозиториев`,
      ),
      items: shown.map((r) => ({ title: r.repo, meta: `${r.host} · ${r.from}` })),
      data: shown,
    };
  }
  if (id === 'repo.create') {
    const accounts = await env.live.remote.tokens.summary();
    const key = accounts.find((a) => !s.provider || a.provider === s.provider);
    if (!key) throw new GitProblem(400, 'connect an account first');
    const r = await env.live.remote.adapter(key);
    const info = await r.createRepo({
      name: s.repo ?? '',
      ...(s.body ? { description: s.body } : {}),
      ...(s.private ? { private: true } : {}),
    });
    return {
      says: say(lang, `${info.repo} made`, `ریپوی ${info.repo} ساخته شد`, `${info.repo} создан`),
      url: info.url,
      last: { object: 'repo', repo: info.repo },
      data: info,
    };
  }

  const { t, r } = await target(env, plan);
  const repo = t.repo;
  const where = `${t.host}/${repo}`;
  const last = (more: NonNullable<GitResult['last']>): GitResult['last'] => ({ repo, ...more });

  switch (id) {
    // -------------------------------------------------- issues
    case 'issue.list': {
      const found = await listIssues(env.live, {
        repo: where,
        mine: Boolean(s.mine),
        state: s.state === 'merged' ? 'closed' : (s.state ?? null),
      });
      let rows = found.issues;
      if (s.labels?.length)
        rows = rows.filter((i) =>
          s.labels?.every((l) => i.labels.some((x) => x.toLowerCase() === l.toLowerCase())),
        );
      if (s.query) {
        const q = s.query.toLowerCase();
        rows = rows.filter((i) => i.title.toLowerCase().includes(q));
      }
      return {
        says: say(
          lang,
          `${rows.length} issues in ${repo}`,
          `${rows.length} ایشو در ${repo}`,
          `${rows.length} задач в ${repo}`,
        ),
        items: rows.map((i) => ({
          title: `#${i.number} ${i.title}`,
          url: i.url,
          meta: [i.state, ...i.labels].join(' · '),
        })),
        last: last({ object: 'issue' }),
        data: rows,
      };
    }
    case 'issue.show': {
      const [issue, comments] = await Promise.all([r.issue(repo, n), r.comments(repo, n)]);
      return {
        says: `#${issue.number} ${issue.title}`,
        url: issue.url,
        text: [issue.body ?? '', ...comments.map((c) => `— ${c.author.login}: ${c.body}`)]
          .filter(Boolean)
          .join('\n\n'),
        items: [
          {
            title: `#${issue.number} ${issue.title}`,
            url: issue.url,
            meta: [
              issue.state,
              ...issue.labels.map((l) => l.name),
              ...issue.assignees.map((p) => `@${p.login}`),
            ].join(' · '),
          },
        ],
        last: last({ object: 'issue', number: n }),
        data: { issue, comments },
      };
    }
    case 'issue.close':
    case 'issue.reopen': {
      if (s.body) await r.comment(repo, n, s.body);
      const issue = await r.update(repo, n, { state: id === 'issue.close' ? 'closed' : 'open' });
      return {
        says:
          id === 'issue.close'
            ? say(
                lang,
                `#${n} closed in ${repo}`,
                `ایشوی #${n} در ${repo} بسته شد`,
                `#${n} закрыта в ${repo}`,
              )
            : say(
                lang,
                `#${n} open again in ${repo}`,
                `ایشوی #${n} دوباره باز شد`,
                `#${n} снова открыта`,
              ),
        url: issue.url,
        last: last({ object: 'issue', number: n }),
        data: issue,
      };
    }
    case 'issue.comment': {
      const c = await r.comment(repo, n, s.body ?? '');
      const issue = await r.issue(repo, n);
      return {
        says: say(lang, `answered on #${n}`, `زیر #${n} نوشته شد`, `ответ в #${n}`),
        url: issue.url,
        last: last({ object: 'issue', number: n }),
        data: c,
      };
    }
    case 'issue.assign':
    case 'issue.unassign': {
      const people = await resolvePeople(r, repo, s.people ?? []);
      const current = (await r.issue(repo, n)).assignees.map((p) => p.login);
      const next =
        id === 'issue.assign'
          ? [...new Set([...current, ...people])]
          : current.filter((p) => !people.includes(p));
      const issue = await r.update(repo, n, { assignees: next });
      return {
        says: say(
          lang,
          `#${n}: ${next.map((p) => `@${p}`).join(' ') || 'nobody'}`,
          `#${n}: ${next.map((p) => `@${p}`).join(' ') || 'بدون مسئول'}`,
          `#${n}: ${next.map((p) => `@${p}`).join(' ') || 'никто'}`,
        ),
        url: issue.url,
        last: last({ object: 'issue', number: n }),
        data: issue,
      };
    }
    case 'issue.label':
    case 'issue.unlabel': {
      const names = await repoLabels(r, repo, s.labels ?? []);
      const issue = await r.update(
        repo,
        n,
        id === 'issue.label' ? { addLabels: names } : { removeLabels: names },
      );
      return {
        says: `#${n}: ${issue.labels.map((l) => `[${l.name}]`).join(' ') || '—'}`,
        url: issue.url,
        last: last({ object: 'issue', number: n }),
        data: issue,
      };
    }
    case 'issue.edit': {
      const issue = await r.update(repo, n, {
        ...(s.title ? { title: s.title } : {}),
        ...(s.body !== undefined ? { body: s.body } : {}),
      });
      return {
        says: `#${n} ${issue.title}`,
        url: issue.url,
        last: last({ object: 'issue', number: n }),
        data: issue,
      };
    }
    case 'issue.milestone': {
      const issue = await r.setMilestone(repo, n, s.milestone ?? '');
      return {
        says: `#${n} → ${s.milestone}`,
        url: issue.url,
        last: last({ object: 'issue', number: n }),
        data: issue,
      };
    }
    case 'issue.lock':
    case 'issue.unlock': {
      await r.lock(repo, n, id === 'issue.lock');
      return {
        says:
          id === 'issue.lock'
            ? say(lang, `#${n} locked`, `#${n} قفل شد`, `#${n} заблокирована`)
            : say(lang, `#${n} unlocked`, `قفل #${n} باز شد`, `#${n} разблокирована`),
        last: last({ object: 'issue', number: n }),
      };
    }

    // -------------------------------------------------- pull requests
    case 'pr.create': {
      const target = s.base ?? (await r.repo(repo)).defaultBranch;
      const branch = s.branch ?? '';
      const m = await r.createMerge(repo, {
        title: s.title ?? branch.replace(/^[\w-]+\//, '').replace(/[-_]+/g, ' '),
        source: branch,
        target,
        ...(s.body ? { body: s.body } : {}),
        ...(s.draft ? { draft: true } : {}),
      });
      if (s.people?.length)
        await r.requestReview(repo, m.number, await resolvePeople(r, repo, s.people));
      if (s.labels?.length)
        await r.updateMerge(repo, m.number, { addLabels: await repoLabels(r, repo, s.labels) });
      return {
        says: say(
          lang,
          `!${m.number} opened: ${branch} → ${target}`,
          `پول ریکوئست !${m.number} باز شد: ${branch} ← ${target}`,
          `!${m.number} открыт: ${branch} → ${target}`,
        ),
        url: m.url,
        last: last({ object: 'pr', number: m.number, branch }),
        data: m,
      };
    }
    case 'pr.list': {
      let rows = await r.merges(repo, {
        state: s.state === 'merged' ? 'closed' : (s.state ?? 'open'),
        perPage: 30,
      });
      if (s.state === 'merged') rows = rows.filter((m) => m.state === 'merged');
      if (s.mine || s.author) {
        const who = s.author ?? (await r.whoami()).login;
        rows = rows.filter((m) => m.author?.login.toLowerCase() === who.toLowerCase());
      }
      return {
        says: say(
          lang,
          `${rows.length} pull requests in ${repo}`,
          `${rows.length} پول ریکوئست در ${repo}`,
          `${rows.length} пул-реквестов в ${repo}`,
        ),
        items: rows.map(mergeLine),
        last: last({ object: 'pr' }),
        data: rows,
      };
    }
    case 'pr.show': {
      const m = await r.merge(repo, n);
      return {
        says: `!${m.number} ${m.title}`,
        url: m.url,
        items: [mergeLine(m)],
        last: last({ object: 'pr', number: n, branch: m.source }),
        data: m,
      };
    }
    case 'pr.diff': {
      const files = await r.mergeFiles(repo, n);
      return {
        says: say(
          lang,
          `!${n} changes ${files.length} files`,
          `!${n} ${files.length} فایل را تغییر می‌دهد`,
          `!${n} меняет ${files.length} файлов`,
        ),
        items: files.map((f) => ({
          title: f.path,
          meta: `${f.status} +${f.additions} −${f.deletions}`,
        })),
        last: last({ object: 'pr', number: n }),
        data: files,
      };
    }
    case 'pr.close':
    case 'pr.reopen': {
      if (s.body) await r.mergeComment(repo, n, s.body);
      const m = await r.updateMerge(repo, n, { state: id === 'pr.close' ? 'closed' : 'open' });
      return {
        says: `!${n} ${m.state}`,
        url: m.url,
        last: last({ object: 'pr', number: n }),
        data: m,
      };
    }
    case 'pr.comment': {
      const c = await r.mergeComment(repo, n, s.body ?? '');
      return {
        says: say(lang, `answered on !${n}`, `زیر !${n} نوشته شد`, `ответ в !${n}`),
        last: last({ object: 'pr', number: n }),
        data: c,
      };
    }
    case 'pr.merge': {
      const m = await r.mergeMerge(repo, n, {
        ...(s.method ? { method: s.method } : {}),
        ...(s.body ? { message: s.body } : {}),
      });
      return {
        says: say(
          lang,
          `!${n} merged into ${m.target}`,
          `!${n} در ${m.target} مرج شد`,
          `!${n} влит в ${m.target}`,
        ),
        url: m.url,
        last: last({ object: 'pr', number: n }),
        data: m,
      };
    }
    case 'pr.approve':
    case 'pr.request-changes': {
      await r.review(repo, n, id === 'pr.approve' ? 'approve' : 'request-changes', s.body);
      return {
        says:
          id === 'pr.approve'
            ? say(lang, `!${n} approved`, `!${n} تایید شد`, `!${n} одобрен`)
            : say(
                lang,
                `changes asked for on !${n}`,
                `برای !${n} تغییر خواسته شد`,
                `запрошены изменения в !${n}`,
              ),
        last: last({ object: 'pr', number: n }),
      };
    }
    case 'pr.request-review': {
      const people = await resolvePeople(r, repo, s.people ?? []);
      await r.requestReview(repo, n, people);
      return {
        says: `!${n}: ${people.map((p) => `@${p}`).join(' ')}`,
        last: last({ object: 'pr', number: n }),
      };
    }
    case 'pr.assign': {
      const m = await r.updateMerge(repo, n, {
        assignees: await resolvePeople(r, repo, s.people ?? []),
      });
      return {
        says: `!${n} → ${(s.people ?? []).map((p) => `@${p}`).join(' ')}`,
        url: m.url,
        last: last({ object: 'pr', number: n }),
        data: m,
      };
    }
    case 'pr.label': {
      const m = await r.updateMerge(repo, n, {
        addLabels: await repoLabels(r, repo, s.labels ?? []),
      });
      return {
        says: `!${n} [${(s.labels ?? []).join('] [')}]`,
        url: m.url,
        last: last({ object: 'pr', number: n }),
        data: m,
      };
    }
    case 'pr.edit': {
      const m = await r.updateMerge(repo, n, {
        ...(s.title ? { title: s.title } : {}),
        ...(s.body !== undefined ? { body: s.body } : {}),
        ...(s.base ? { target: s.base } : {}),
      });
      return {
        says: `!${n} ${m.title}`,
        url: m.url,
        last: last({ object: 'pr', number: n }),
        data: m,
      };
    }
    case 'pr.ready': {
      const m = await r.ready(repo, n);
      return {
        says: say(
          lang,
          `!${n} is ready for review`,
          `!${n} آماده‌ی ریویو شد`,
          `!${n} готов к ревью`,
        ),
        url: m.url,
        last: last({ object: 'pr', number: n }),
        data: m,
      };
    }

    // -------------------------------------------------- branches and commits
    case 'branch.list': {
      const list = await r.branches(repo);
      return {
        says: say(
          lang,
          `${list.length} branches in ${repo}`,
          `${list.length} برنچ در ${repo}`,
          `${list.length} веток в ${repo}`,
        ),
        items: list.map((b) => ({
          title: b.name,
          meta: `${b.sha.slice(0, 8)}${b.protected ? ' · protected' : ''}`,
        })),
        last: last({ object: 'branch' }),
        data: list,
      };
    }
    case 'branch.create': {
      const b = await r.createBranch(repo, s.branch ?? '', s.ref);
      return {
        says: say(
          lang,
          `branch ${b.name} made in ${repo}`,
          `برنچ ${b.name} در ${repo} ساخته شد`,
          `ветка ${b.name} создана в ${repo}`,
        ),
        last: last({ object: 'branch', branch: b.name }),
        data: b,
      };
    }
    case 'branch.delete': {
      await r.deleteBranch(repo, s.branch ?? '');
      return {
        says: say(
          lang,
          `branch ${s.branch} deleted from ${repo}`,
          `برنچ ${s.branch} از ${repo} حذف شد`,
          `ветка ${s.branch} удалена`,
        ),
        last: last({ object: 'branch' }),
      };
    }
    case 'branch.rename': {
      const b = await r.renameBranch(repo, s.branch ?? '', s.title ?? '');
      return {
        says: `${s.branch} → ${b.name}`,
        last: last({ object: 'branch', branch: b.name }),
        data: b,
      };
    }
    case 'commit.list': {
      const list = await r.history(repo, {
        ...(s.branch ? { ref: s.branch } : {}),
        ...(s.author ? { author: s.author } : {}),
        ...(s.path ? { path: s.path } : {}),
        perPage: Number(s.count ?? 10),
      });
      return {
        says: say(
          lang,
          `${list.length} commits`,
          `${list.length} کامیت`,
          `${list.length} коммитов`,
        ),
        items: list.map((c) => ({
          title: `${c.sha.slice(0, 8)} ${c.message.split('\n')[0]}`,
          url: c.url,
          meta: [c.author?.login ?? '', when(c.at)].filter(Boolean).join(' · '),
        })),
        last: last({ object: 'commit' }),
        data: list,
      };
    }
    case 'commit.show': {
      const c = await r.commit(repo, s.ref ?? '');
      return {
        says: `${c.sha.slice(0, 8)} ${c.message.split('\n')[0]}`,
        url: c.url,
        text: c.message,
        last: last({ object: 'commit', ref: c.sha }),
        data: c,
      };
    }
    case 'commit.compare': {
      const c = await r.compare(repo, s.base ?? '', s.ref ?? '');
      return {
        says: say(
          lang,
          `${s.ref} is ${c.ahead} ahead of ${s.base}, ${c.behind} behind`,
          `${s.ref} از ${s.base} ${c.ahead} کامیت جلو و ${c.behind} کامیت عقب است`,
          `${s.ref} впереди ${s.base} на ${c.ahead}, позади на ${c.behind}`,
        ),
        items: c.commits.map((x) => ({
          title: `${x.sha.slice(0, 8)} ${x.message.split('\n')[0]}`,
          url: x.url,
        })),
        ...(c.url ? { url: c.url } : {}),
        data: c,
      };
    }

    // -------------------------------------------------- CI
    case 'ci.status':
    case 'ci.list':
    case 'ci.rerun':
    case 'ci.cancel': {
      let ref = s.branch;
      if (!ref && n) ref = (await r.merge(repo, n)).source;
      if (!ref && !s.ref && id !== 'ci.list') ref = (await r.repo(repo)).defaultBranch;
      const runs = await r.runs(repo, {
        ...(ref ? { ref } : {}),
        perPage: id === 'ci.list' ? Number(s.count ?? 10) : 5,
      });
      const latest = s.ref ? runs.find((x) => x.sha?.startsWith(s.ref ?? '')) : runs[0];
      if (id === 'ci.list')
        return {
          says: say(lang, `${runs.length} runs`, `${runs.length} اجرا`, `${runs.length} запусков`),
          items: runs.map((x) => ({
            title: `${x.name} · ${x.ref}`,
            url: x.url,
            meta: `${x.status} · ${when(x.at)}`,
          })),
          last: last({ object: 'ci', ...(ref ? { branch: ref } : {}) }),
          data: runs,
        };
      if (!latest) throw new GitProblem(404, `no CI runs for ${ref ?? repo}`);
      if (id === 'ci.rerun') {
        await r.rerun(repo, latest.id);
        return {
          says: say(
            lang,
            `${latest.name} on ${latest.ref} is running again`,
            `${latest.name} روی ${latest.ref} دوباره اجرا شد`,
            `${latest.name} на ${latest.ref} перезапущен`,
          ),
          url: latest.url,
          last: last({ object: 'ci', branch: latest.ref }),
        };
      }
      if (id === 'ci.cancel') {
        await r.cancelRun(repo, latest.id);
        return {
          says: say(
            lang,
            `${latest.name} on ${latest.ref} cancelled`,
            `${latest.name} روی ${latest.ref} لغو شد`,
            `${latest.name} на ${latest.ref} отменён`,
          ),
          url: latest.url,
          last: last({ object: 'ci', branch: latest.ref }),
        };
      }
      const word: Record<string, [string, string, string]> = {
        passed: ['passed', 'پاس شد', 'прошёл'],
        failed: ['failed', 'رد شد', 'упал'],
        running: ['is running', 'در حال اجراست', 'идёт'],
        pending: ['is waiting', 'در صف است', 'ждёт'],
        cancelled: ['was cancelled', 'لغو شد', 'отменён'],
        skipped: ['was skipped', 'رد شد', 'пропущен'],
      };
      const [en, fa, ru] = word[latest.status] ?? [latest.status, latest.status, latest.status];
      let jobs: GitItem[] = [];
      try {
        const p = await r.pipeline(repo, latest.id);
        jobs = p.jobs.map((j) => ({ title: j.name, meta: j.status }));
      } catch {
        // The jobs are a nicety; the run's own status is the answer.
      }
      return {
        says: say(
          lang,
          `CI on ${latest.ref} ${en}`,
          `CI روی ${latest.ref} ${fa}`,
          `CI на ${latest.ref} ${ru}`,
        ),
        url: latest.url,
        items: jobs,
        last: last({ object: 'ci', branch: latest.ref }),
        data: latest,
      };
    }

    // -------------------------------------------------- releases and tags
    case 'release.list': {
      const list = await r.releases(repo, Number(s.count ?? 10));
      return {
        says: say(
          lang,
          `${list.length} releases`,
          `${list.length} ریلیز`,
          `${list.length} релизов`,
        ),
        items: list.map((x) => ({
          title: `${x.tag} ${x.name !== x.tag ? x.name : ''}`.trim(),
          url: x.url,
          meta: [when(x.at), x.draft ? 'draft' : '', x.prerelease ? 'pre-release' : '']
            .filter(Boolean)
            .join(' · '),
        })),
        last: last({ object: 'release' }),
        data: list,
      };
    }
    case 'release.show': {
      const x = await r.release(repo, s.tag);
      return {
        says: `${x.tag} ${x.name !== x.tag ? x.name : ''}`.trim(),
        url: x.url,
        text: x.body ?? '',
        last: last({ object: 'release', tag: x.tag }),
        data: x,
      };
    }
    case 'release.create': {
      const x = await r.createRelease(repo, {
        tag: s.tag ?? '',
        ...(s.title ? { name: s.title } : {}),
        ...(s.body ? { body: s.body } : {}),
        ...(s.ref ? { ref: s.ref } : {}),
        ...(s.draft ? { draft: true } : {}),
      });
      return {
        says: say(
          lang,
          `release ${x.tag} published`,
          `ریلیز ${x.tag} منتشر شد`,
          `релиз ${x.tag} опубликован`,
        ),
        url: x.url,
        last: last({ object: 'release', tag: x.tag }),
        data: x,
      };
    }
    case 'release.delete': {
      await r.deleteRelease(repo, s.tag ?? '');
      return {
        says: say(
          lang,
          `release ${s.tag} deleted`,
          `ریلیز ${s.tag} حذف شد`,
          `релиз ${s.tag} удалён`,
        ),
        last: last({ object: 'release' }),
      };
    }
    case 'tag.list': {
      const list = await r.tags(repo, Number(s.count ?? 30));
      return {
        says: say(lang, `${list.length} tags`, `${list.length} تگ`, `${list.length} тегов`),
        items: list.map((x) => ({ title: x.name, meta: x.sha.slice(0, 8) })),
        last: last({ object: 'tag' }),
        data: list,
      };
    }
    case 'tag.create': {
      const ref = s.ref ?? (await r.repo(repo)).defaultBranch;
      const x = await r.createTag(repo, s.tag ?? '', ref, s.body);
      return {
        says: say(
          lang,
          `tag ${x.name} on ${ref}`,
          `تگ ${x.name} روی ${ref} زده شد`,
          `тег ${x.name} на ${ref}`,
        ),
        last: last({ object: 'tag', tag: x.name }),
        data: x,
      };
    }
    case 'tag.delete': {
      await r.deleteTag(repo, s.tag ?? '');
      return {
        says: say(lang, `tag ${s.tag} deleted`, `تگ ${s.tag} حذف شد`, `тег ${s.tag} удалён`),
        last: last({ object: 'tag' }),
      };
    }

    // -------------------------------------------------- labels and milestones
    case 'label.list': {
      const list = await r.labels(repo);
      return {
        says: say(
          lang,
          `${list.length} labels in ${repo}`,
          `${list.length} لیبل در ${repo}`,
          `${list.length} меток в ${repo}`,
        ),
        items: list.map((l) => ({ title: l.name, ...(l.colour ? { meta: l.colour } : {}) })),
        last: last({ object: 'label' }),
        data: list,
      };
    }
    case 'label.create': {
      const name = s.labels?.[0] ?? '';
      const l = await r.createLabel(repo, {
        name,
        ...(s.colour ? { colour: colourHex(s.colour) } : {}),
        ...(s.body ? { description: s.body } : {}),
      });
      return {
        says: say(
          lang,
          `label ${l.name} made`,
          `لیبل ${l.name} ساخته شد`,
          `метка ${l.name} создана`,
        ),
        last: last({ object: 'label' }),
        data: l,
      };
    }
    case 'label.edit': {
      const name = (await repoLabels(r, repo, s.labels?.slice(0, 1) ?? []))[0] ?? '';
      const newName = s.title ?? (s.labels && s.labels.length > 1 ? s.labels[1] : undefined);
      const l = await r.editLabel(repo, name, {
        ...(newName ? { name: newName } : {}),
        ...(s.colour ? { colour: colourHex(s.colour) } : {}),
        ...(s.body ? { description: s.body } : {}),
      });
      return {
        says: say(
          lang,
          `label ${l.name} changed`,
          `لیبل ${l.name} عوض شد`,
          `метка ${l.name} изменена`,
        ),
        last: last({ object: 'label' }),
        data: l,
      };
    }
    case 'label.delete': {
      const names = await repoLabels(r, repo, s.labels ?? []);
      for (const name of names) await r.deleteLabel(repo, name);
      return {
        says: say(
          lang,
          `label ${names.join(', ')} deleted`,
          `لیبل ${names.join('، ')} حذف شد`,
          `метка ${names.join(', ')} удалена`,
        ),
        last: last({ object: 'label' }),
      };
    }
    case 'milestone.list': {
      const list = await r.milestones(
        repo,
        s.state === 'closed' ? 'closed' : s.state === 'all' ? 'all' : 'open',
      );
      return {
        says: say(
          lang,
          `${list.length} milestones`,
          `${list.length} مایلستون`,
          `${list.length} вех`,
        ),
        items: list.map((m) => ({
          title: m.title,
          ...(m.url ? { url: m.url } : {}),
          meta: [m.state, m.due ? when(m.due) : ''].filter(Boolean).join(' · '),
        })),
        last: last({ object: 'milestone' }),
        data: list,
      };
    }
    case 'milestone.create': {
      const m = await r.createMilestone(repo, s.milestone ?? '', s.body);
      return {
        says: say(
          lang,
          `milestone ${m.title} made`,
          `مایلستون ${m.title} ساخته شد`,
          `веха ${m.title} создана`,
        ),
        last: last({ object: 'milestone' }),
        data: m,
      };
    }
    case 'milestone.close': {
      const m = await r.closeMilestone(repo, s.milestone ?? '');
      return {
        says: say(
          lang,
          `milestone ${m.title} closed`,
          `مایلستون ${m.title} بسته شد`,
          `веха ${m.title} закрыта`,
        ),
        last: last({ object: 'milestone' }),
        data: m,
      };
    }

    // -------------------------------------------------- the repository itself
    case 'repo.show': {
      const info = await r.info(repo);
      return {
        says: `${info.repo} · ★${info.stars} · ${info.openIssues} open · ${info.defaultBranch}`,
        url: info.url,
        text: info.description ?? '',
        last: last({ object: 'repo' }),
        data: info,
      };
    }
    case 'repo.fork': {
      const info = await r.fork(repo);
      return {
        says: say(lang, `forked: ${info.repo}`, `فورک شد: ${info.repo}`, `форк: ${info.repo}`),
        url: info.url,
        last: { object: 'repo', repo: info.repo },
        data: info,
      };
    }
    case 'repo.star':
    case 'repo.unstar': {
      await r.star(repo, id === 'repo.star');
      return {
        says:
          id === 'repo.star'
            ? say(lang, `★ ${repo}`, `به ${repo} ستاره داده شد`, `★ ${repo}`)
            : say(
                lang,
                `star taken from ${repo}`,
                `ستاره‌ی ${repo} برداشته شد`,
                `звезда снята с ${repo}`,
              ),
        last: last({ object: 'repo' }),
      };
    }
    case 'repo.delete': {
      await r.deleteRepo(repo);
      return {
        says: say(lang, `${repo} deleted`, `ریپوی ${repo} حذف شد`, `${repo} удалён`),
        last: {},
      };
    }
    case 'file.show': {
      const f = await r.file(repo, s.path ?? '', s.ref);
      return {
        says: `${f.path} · ${f.size} B`,
        url: f.url,
        text: f.text,
        last: last({ object: 'file' }),
        data: { path: f.path, size: f.size, url: f.url },
      };
    }
    case 'code.search': {
      const hits = await r.searchCode(repo, s.query ?? '');
      return {
        says: say(
          lang,
          `${hits.length} files mention “${s.query}”`,
          `${hits.length} فایل «${s.query}» دارند`,
          `«${s.query}» в ${hits.length} файлах`,
        ),
        items: hits.map((h) => ({ title: h.path, url: h.url })),
        last: last({ object: 'code' }),
        data: hits,
      };
    }
    case 'member.list': {
      const people = await r.members(repo);
      return {
        says: say(
          lang,
          `${people.length} people on ${repo}`,
          `${people.length} نفر روی ${repo}`,
          `${people.length} человек в ${repo}`,
        ),
        items: people.map((p) => ({ title: `@${p.login}`, ...(p.name ? { meta: p.name } : {}) })),
        last: last({ object: 'member' }),
        data: people,
      };
    }
  }
  throw new GitProblem(501, `${id} is not done on a service`);
}

/** Labels as the repository spells them: "Bug" for "bug", "area: mobile" for "mobile". */
async function repoLabels(r: Remote, repo: string, asked: string[]): Promise<string[]> {
  const have = (await r.labels(repo)).map((l) => l.name);
  const fold = (x: string): string => x.toLowerCase().replace(/[\s_:/-]+/g, '');
  return asked.map(
    (a) =>
      have.find((h) => h === a) ??
      have.find((h) => fold(h) === fold(a)) ??
      have.find((h) => fold(h).endsWith(fold(a))) ??
      a,
  );
}

/** People by login: "@me" is whoever is signed in; a name is matched to whoever works on it. */
async function resolvePeople(r: Remote, repo: string, asked: string[]): Promise<string[]> {
  const out: string[] = [];
  let members: Array<{ login: string; name?: string }> | undefined;
  for (const p of asked) {
    if (p === '@me') {
      out.push((await r.whoami()).login);
      continue;
    }
    if (/^[\w.-]+$/.test(p)) {
      out.push(p);
      continue;
    }
    // A name written as it is said -- "سینا", "Саше" -- matched to a login if it can be.
    members ??= await r.members(repo).catch(() => []);
    const hit = members.find((m) => m.name?.toLowerCase().startsWith(p.toLowerCase().slice(0, 3)));
    out.push(hit?.login ?? p);
  }
  return out;
}

const NAMED_COLOURS: Record<string, string> = {
  red: '#d73a4a',
  orange: '#f28c28',
  yellow: '#fbca04',
  green: '#0e8a16',
  blue: '#1d76db',
  purple: '#5319e7',
  pink: '#e99695',
  grey: '#bfbfbf',
  black: '#000000',
  white: '#ffffff',
};

function colourHex(said: string): string {
  if (said.startsWith('#')) return said;
  const t = said.toLowerCase();
  const pairs: Array<[RegExp, string]> = [
    [/red|قرمز|красн|rouge|rojo|vermelh|rosso|kırmızı|أحمر|红/u, 'red'],
    [/orange|نارنجی|оранжев|naranja|laranja|arancion|turuncu|برتقالي|橙/u, 'orange'],
    [/yellow|زرد|желт|jaune|amarill|amarel|giall|gelb|sarı|أصفر|黄/u, 'yellow'],
    [/green|سبز|зелен|verde|grün|yeşil|أخضر|绿/u, 'green'],
    [/blue|آبی|голуб|син|bleu|azul|blau|mavi|أزرق|蓝/u, 'blue'],
    [/purple|violet|بنفش|фиолет|morado|roxo|viola|lila|بنفسجي|紫/u, 'purple'],
    [/pink|صورتی|розов|pembe|وردي|粉/u, 'pink'],
    [/gr[ae]y|طوسی|خاکستری|сер|gris|cinza|grigio|رمادي|灰/u, 'grey'],
    [/black|مشکی|سیاه|черн|noir|negro|preto|nero|schwarz|siyah|أسود|黑/u, 'black'],
    [/white|سفید|бел|blanc|blanco|branco|bianco|weiß|beyaz|أبيض|白/u, 'white'],
  ];
  const name = pairs.find(([re]) => re.test(t))?.[1];
  return NAMED_COLOURS[name ?? ''] ?? '#ededed';
}

// ---------------------------------------------------------------- accounts

async function onAccounts(plan: GitPlan, env: GitEnv): Promise<Done> {
  const s = plan.slots;
  const lang = plan.lang;
  const keys = await env.live.remote.tokens.summary();
  const chosen = keys.filter(
    (k) => (!s.provider || k.provider === s.provider) && (!s.host || k.host === s.host),
  );
  switch (plan.action?.id) {
    case 'account.list':
      return {
        says: keys.length
          ? say(
              lang,
              `${keys.length} accounts connected`,
              `${keys.length} حساب وصل است`,
              `подключено аккаунтов: ${keys.length}`,
            )
          : say(
              lang,
              'no account is connected yet',
              'هنوز هیچ حسابی وصل نیست',
              'ни один аккаунт не подключён',
            ),
        items: keys.map((k) => ({
          title: `${k.provider} · ${k.host}`,
          meta: k.user ? `@${k.user}` : '',
        })),
        data: keys,
      };
    case 'account.whoami': {
      const out: GitItem[] = [];
      for (const k of chosen) {
        const who = await (await env.live.remote.adapter(k)).whoami();
        out.push({
          title: `@${who.login}`,
          meta: `${k.provider} · ${k.host}${who.canWrite ? '' : ' · read only'}`,
        });
      }
      return {
        says:
          out.map((o) => o.title).join(' ') ||
          say(lang, 'no account is connected', 'حسابی وصل نیست', 'нет подключённых аккаунтов'),
        items: out,
      };
    }
    case 'account.disconnect': {
      const k = chosen[0];
      if (!k)
        throw new GitProblem(
          404,
          `no account on ${s.host ?? s.provider ?? 'that host'} is connected`,
        );
      await env.live.remote.forgetKey(k.host);
      return {
        says: say(lang, `${k.host} disconnected`, `حساب ${k.host} قطع شد`, `${k.host} отключён`),
      };
    }
    case 'account.connect': {
      // A key is never typed into the box: connecting is the face's (or `grimstroke connect`'s).
      const provider: Provider = s.provider ?? 'github';
      const host =
        s.host ??
        (provider === 'github' ? 'github.com' : provider === 'gitlab' ? 'gitlab.com' : '');
      return {
        says: say(
          lang,
          `connect ${provider}${host ? ` at ${host}` : ''}`,
          `وصل کردن ${provider}${host ? ` روی ${host}` : ''}`,
          `подключить ${provider}${host ? ` на ${host}` : ''}`,
        ),
        data: { connect: { provider, host, providers: PROVIDERS } },
      };
    }
    case 'notification.list':
    case 'notification.read': {
      const items: GitItem[] = [];
      for (const k of chosen) {
        const r = await env.live.remote.adapter(k);
        if (plan.action.id === 'notification.read') await r.readNotices();
        else
          for (const x of await r.notices())
            if (!s.repo || x.repo.endsWith(s.repo))
              items.push({
                title: x.title,
                ...(x.url ? { url: x.url } : {}),
                meta: [x.repo, x.kind, when(x.at)].filter(Boolean).join(' · '),
              });
      }
      return plan.action.id === 'notification.read'
        ? {
            says: say(
              lang,
              'notifications marked read',
              'اعلان‌ها خوانده شدند',
              'уведомления прочитаны',
            ),
          }
        : {
            says: say(
              lang,
              `${items.length} notifications`,
              `${items.length} اعلان`,
              `${items.length} уведомлений`,
            ),
            items,
          };
    }
  }
  throw new GitProblem(501, `${plan.action?.id} is not an account's`);
}

// ---------------------------------------------------------------- here

/** Where the box keeps the clones it makes, on a server: under the workspace's own folder. */
export function clonesDir(live: Live): string {
  return join(live.store.dir, 'clones');
}

/** The working copy an action means: the command line's, or the server's clone of the repository. */
async function workingCopy(plan: GitPlan, env: GitEnv): Promise<WorkingCopy> {
  if (env.local && !plan.slots.repo) return env.local;
  const fromEnv = process.env.GRIMSTROKE_GIT_DIR;
  if (fromEnv && !plan.slots.repo) {
    const wc = await WorkingCopy.find(fromEnv);
    if (wc) return wc;
  }
  const t = await repositoryFor(env.live, plan.slots.repo ?? null, env.last?.repo).catch(
    () => undefined,
  );
  if (t) {
    const dir = join(clonesDir(env.live), t.host, t.repo);
    const wc = await WorkingCopy.find(dir);
    if (wc && wc.root.startsWith(clonesDir(env.live))) {
      const token = await env.live.remote.tokens.token(t.host);
      const key = await env.live.remote.tokens.get(t.host);
      return new WorkingCopy(wc.root, token ? keyHeader(t.provider, token, key?.user) : undefined);
    }
    throw new GitProblem(400, `${t.repo} is not cloned here yet -- say "clone ${t.repo}" first`);
  }
  throw new GitProblem(
    400,
    'there is no working copy here: run grimstroke inside one, or clone a repository first',
  );
}

async function onLocal(plan: GitPlan, env: GitEnv): Promise<Done> {
  const s = plan.slots;
  const lang = plan.lang;
  const id = plan.action?.id ?? '';

  if (id === 'repo.clone') {
    const t = await repositoryFor(env.live, s.repo ?? null, env.last?.repo);
    const token = await env.live.remote.tokens.token(t.host);
    const key = await env.live.remote.tokens.get(t.host);
    // On someone's own machine a clone goes where they say, or beside them; on a server, under
    // the workspace, where the box finds it again.
    const dir = env.here
      ? s.path
        ? s.path.replace(/^~/, process.env.HOME ?? '~')
        : join(env.here, t.repo.split('/').pop() ?? t.repo)
      : join(clonesDir(env.live), t.host, t.repo);
    const wc = await cloneInto(`https://${t.host}/${t.repo}.git`, dir, {
      ...(s.branch ? { branch: s.branch } : {}),
      ...(token ? { header: keyHeader(t.provider, token, key?.user) } : {}),
    });
    return {
      says: say(
        lang,
        `${t.repo} cloned to ${wc.root}`,
        `${t.repo} در ${wc.root} کلون شد`,
        `${t.repo} склонирован в ${wc.root}`,
      ),
      last: { object: 'repo', repo: t.repo },
      data: { root: wc.root },
    };
  }
  if (id === 'local.init') {
    if (!env.here)
      throw new GitProblem(400, 'a repository is made from the command line, in its folder');
    const wc = await initAt(s.path?.replace(/^~/, process.env.HOME ?? '~') ?? env.here);
    return {
      says: say(
        lang,
        `a repository now in ${wc.root}`,
        `ریپو در ${wc.root} ساخته شد`,
        `репозиторий создан в ${wc.root}`,
      ),
      data: { root: wc.root },
    };
  }

  const wc = await workingCopy(plan, env);
  const here = {
    last: { object: 'local' as const, ...(env.last?.repo ? { repo: env.last.repo } : {}) },
  };
  switch (id) {
    case 'local.status': {
      const st = await wc.status();
      return {
        ...here,
        says: say(
          lang,
          `${st.branch}: ${st.changes.length} changed${st.ahead ? `, ${st.ahead} to push` : ''}${st.behind ? `, ${st.behind} to pull` : ''}`,
          `${st.branch}: ${st.changes.length} تغییر${st.ahead ? `، ${st.ahead} کامیت برای پوش` : ''}${st.behind ? `، ${st.behind} کامیت برای پول` : ''}`,
          `${st.branch}: изменений ${st.changes.length}${st.ahead ? `, к пушу ${st.ahead}` : ''}${st.behind ? `, к пуллу ${st.behind}` : ''}`,
        ),
        items: st.changes.map((c) => ({ title: c.path, meta: c.state.trim() })),
        data: st,
      };
    }
    case 'local.diff': {
      const text = await wc.diff({
        ...(s.path ? { path: s.path } : {}),
        ...(s.ref ? { ref: s.ref } : {}),
      });
      return {
        ...here,
        says: say(
          lang,
          text ? 'the changes' : 'nothing changed',
          text ? 'تغییرات' : 'تغییری نیست',
          text ? 'изменения' : 'изменений нет',
        ),
        text,
      };
    }
    case 'local.stage':
      await wc.stage(s.path ? [s.path] : []);
      return {
        ...here,
        says: say(
          lang,
          `staged ${s.path ?? 'everything'}`,
          `${s.path ?? 'همه'} استیج شد`,
          `в индексе: ${s.path ?? 'всё'}`,
        ),
      };
    case 'local.unstage':
      await wc.unstage(s.path ? [s.path] : []);
      return {
        ...here,
        says: say(
          lang,
          `unstaged ${s.path ?? 'everything'}`,
          `${s.path ?? 'همه'} از استیج درآمد`,
          `убрано из индекса: ${s.path ?? 'всё'}`,
        ),
      };
    case 'local.commit':
    case 'local.amend': {
      const c =
        id === 'local.commit'
          ? await wc.commit(s.body ?? '', s.path ? [s.path] : [])
          : await wc.amend(s.body);
      return { says: `${c.sha} ${c.message}`, last: { object: 'commit', ref: c.sha }, data: c };
    }
    case 'local.push': {
      const branch = s.branch ?? (await wc.branch());
      await wc.push({ branch, ...(s.force ? { force: true } : {}) });
      return {
        ...here,
        says: say(lang, `${branch} pushed`, `${branch} پوش شد`, `${branch} запушена`),
      };
    }
    case 'local.pull': {
      const out = await wc.pull(s.branch ? { branch: s.branch } : {});
      return { ...here, says: say(lang, 'up to date', 'به‌روز شد', 'обновлено'), text: out };
    }
    case 'local.fetch':
      await wc.fetch();
      return { ...here, says: say(lang, 'fetched', 'فچ شد', 'получено') };
    case 'local.merge': {
      const out = await wc.merge(s.branch ?? '');
      return {
        ...here,
        says: say(
          lang,
          `${s.branch} merged into ${await wc.branch()}`,
          `${s.branch} در ${await wc.branch()} مرج شد`,
          `${s.branch} влита в ${await wc.branch()}`,
        ),
        text: out,
      };
    }
    case 'local.rebase': {
      const out = await wc.rebase(s.branch ?? '');
      return {
        ...here,
        says: say(
          lang,
          `rebased onto ${s.branch}`,
          `روی ${s.branch} ریبیس شد`,
          `перебазировано на ${s.branch}`,
        ),
        text: out,
      };
    }
    case 'local.stash':
      await wc.stash(s.body);
      return {
        ...here,
        says: say(lang, 'changes stashed', 'تغییرات استش شد', 'изменения спрятаны'),
      };
    case 'local.unstash':
      await wc.unstash();
      return {
        ...here,
        says: say(lang, 'stash brought back', 'استش برگشت', 'изменения возвращены'),
      };
    case 'local.reset': {
      const ref = s.ref ?? 'HEAD~1';
      await wc.reset(ref, Boolean(s.force));
      return {
        ...here,
        says: say(
          lang,
          `reset to ${ref}${s.force ? ' (hard)' : ''}`,
          `ریست به ${ref}${s.force ? ' (هارد)' : ''}`,
          `сброшено на ${ref}${s.force ? ' (hard)' : ''}`,
        ),
      };
    }
    case 'local.discard':
      await wc.discard(s.path);
      return {
        ...here,
        says: say(
          lang,
          `changes thrown away${s.path ? ` in ${s.path}` : ''}`,
          `تغییرات${s.path ? ` ${s.path}` : ''} دور ریخته شد`,
          `изменения отменены${s.path ? ` в ${s.path}` : ''}`,
        ),
      };
    case 'local.cherry-pick':
    case 'local.revert': {
      const out =
        id === 'local.revert' ? await wc.revert(s.ref ?? '') : await wc.cherryPick(s.ref ?? '');
      const [c] = await wc.log({ count: 1 });
      return {
        says: `${c?.sha ?? ''} ${c?.message ?? ''}`.trim(),
        text: out,
        ...(c ? { last: { object: 'commit' as const, ref: c.sha } } : {}),
      };
    }
    case 'local.remote-add':
      await wc.addRemote(s.title ?? 'origin', s.url ?? '');
      return { ...here, says: `${s.title ?? 'origin'} → ${s.url}` };
    case 'file.blame': {
      const rows = await wc.blame(s.path ?? '');
      const by = new Map<string, number>();
      for (const r of rows) by.set(r.author, (by.get(r.author) ?? 0) + 1);
      return {
        ...here,
        says: [...by]
          .sort((a, b) => b[1] - a[1])
          .map(([a, k]) => `${a} ${k}`)
          .join(' · '),
        text: rows.map((r) => `${r.sha} ${r.author.padEnd(14).slice(0, 14)} ${r.text}`).join('\n'),
      };
    }
    case 'pr.checkout': {
      const branch = `pr-${s.number}`;
      const t = env.last?.repo
        ? await repositoryFor(env.live, env.last.repo).catch(() => undefined)
        : undefined;
      const ref =
        t?.provider === 'gitlab' ? `merge-requests/${s.number}/head` : `pull/${s.number}/head`;
      await wc.fetchRef(ref, branch);
      await wc.switchTo(branch);
      return {
        ...here,
        says: say(lang, `on ${branch} now`, `حالا روی ${branch}`, `теперь на ${branch}`),
      };
    }
    // Things that are both: here, in this working copy.
    case 'branch.list': {
      const list = await wc.branches();
      return {
        ...here,
        says: say(lang, `${list.length} branches`, `${list.length} برنچ`, `${list.length} веток`),
        items: list.map((b) => ({ title: `${b.current ? '* ' : ''}${b.name}`, meta: b.sha })),
      };
    }
    case 'branch.create':
      await wc.createBranch(s.branch ?? '', s.ref);
      return {
        says: say(
          lang,
          `on a new branch ${s.branch}`,
          `برنچ ${s.branch} ساخته شد و روی آن هستی`,
          `новая ветка ${s.branch}`,
        ),
        last: { object: 'branch', ...(s.branch ? { branch: s.branch } : {}) },
      };
    case 'branch.delete':
      await wc.deleteBranch(s.branch ?? '', Boolean(s.force));
      return {
        ...here,
        says: say(
          lang,
          `branch ${s.branch} deleted`,
          `برنچ ${s.branch} حذف شد`,
          `ветка ${s.branch} удалена`,
        ),
      };
    case 'branch.switch':
      await wc.switchTo(s.branch ?? '');
      return {
        says: say(lang, `on ${s.branch} now`, `حالا روی ${s.branch}`, `теперь на ${s.branch}`),
        last: { object: 'branch', ...(s.branch ? { branch: s.branch } : {}) },
      };
    case 'branch.rename':
      await wc.renameBranch(s.branch ?? '', s.title ?? '');
      return { ...here, says: `${s.branch} → ${s.title}` };
    case 'commit.list': {
      const list = await wc.log({
        ...(s.branch ? { ref: s.branch } : {}),
        ...(s.author ? { author: s.author } : {}),
        ...(s.path ? { path: s.path } : {}),
        count: Number(s.count ?? 10),
      });
      return {
        ...here,
        says: say(
          lang,
          `${list.length} commits`,
          `${list.length} کامیت`,
          `${list.length} коммитов`,
        ),
        items: list.map((c) => ({
          title: `${c.sha} ${c.message}`,
          meta: `${c.author} · ${when(c.at)}`,
        })),
      };
    }
    case 'commit.show':
      return {
        says: s.ref ?? '',
        text: await wc.show(s.ref ?? 'HEAD'),
        last: { object: 'commit', ...(s.ref ? { ref: s.ref } : {}) },
      };
    case 'commit.compare': {
      const c = await wc.compare(s.base ?? '', s.ref ?? '');
      return {
        ...here,
        says: say(
          lang,
          `${s.ref} is ${c.ahead} ahead of ${s.base}, ${c.behind} behind`,
          `${s.ref} از ${s.base} ${c.ahead} جلو و ${c.behind} عقب است`,
          `${s.ref} впереди ${s.base} на ${c.ahead}, позади на ${c.behind}`,
        ),
        items: c.commits.map((x) => ({ title: `${x.sha} ${x.message}` })),
      };
    }
    case 'tag.list': {
      const list = await wc.tags();
      return {
        ...here,
        says: say(lang, `${list.length} tags`, `${list.length} تگ`, `${list.length} тегов`),
        items: list.map((x) => ({ title: x })),
      };
    }
    case 'tag.create':
      await wc.createTag(s.tag ?? '', s.ref, s.body);
      return { ...here, says: say(lang, `tag ${s.tag}`, `تگ ${s.tag} زده شد`, `тег ${s.tag}`) };
    case 'tag.delete':
      await wc.deleteTag(s.tag ?? '');
      return {
        ...here,
        says: say(lang, `tag ${s.tag} deleted`, `تگ ${s.tag} حذف شد`, `тег ${s.tag} удалён`),
      };
    case 'file.show':
      return { ...here, says: s.path ?? '', text: await wc.file(s.path ?? '', s.ref) };
  }
  throw new GitProblem(501, `${id} is not done here`);
}
