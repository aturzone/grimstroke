/**
 * The / box and the repositories from a terminal: everything the box does, with no browser and
 * no server -- straight on the workspace's files, the way git works on a repository.
 *
 *   grimstroke read  <words>          what the box makes of a line (kind, fields, summary)
 *   grimstroke add   <words>          make it: a card on the / board (or --board ID)
 *   grimstroke cards                  every card the box made, wherever it is (--kind, --open, --done)
 *   grimstroke done  <card>           mark a card done (or `undone`); `rm <card>` lets one go
 *   grimstroke today                  the day (--date YYYY-MM-DD)
 *   grimstroke accounts               the GitHub, GitLab and Gitea accounts connected
 *   grimstroke connect <service> --token T [--host H]
 *   grimstroke repos                  every repository there is to work in
 *   grimstroke issue <sentence>       open an issue from a sentence (--image FILE, repeatable)
 *   grimstroke issues [repo]          a repository's open issues (--mine, --closed)
 *   grimstroke close|reopen <n> [repo]
 *   grimstroke comment <n> [repo] -m <words>
 *   grimstroke git <sentence>         anything said to git, in any of its eleven languages
 *
 * Every command takes --json, for an agent. A card is named by its id, or by address|id.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { type ShapeBlock, summarize } from '@core/box/card.ts';
import { classify } from '@core/box/classify.ts';
import { matchCommands } from '@core/box/commands.ts';
import { fieldValues, readShape } from '@core/box/fields.ts';
import type { GitContext } from '@core/box/git/understand.ts';
import { INTENTS, isIntent } from '@core/box/intents.ts';
import { isDone, SLASH_BOARD } from '@core/box/slash.ts';
import { gatherToday, type TodayEntry } from '@core/day/gather.ts';
import { nextSpot } from '@core/docs/board-extent.ts';
import { topZ } from '@core/docs/board-patch.ts';
import { NOTE_HEIGHT, NOTE_WIDTH } from '@core/docs/note.ts';
import { PROVIDERS, type Provider } from '@core/git/model.ts';
import { actOnIssue, GitProblem, listIssues, openIssue, repositories } from '@core/git/work.ts';
import { applyBoard } from '@core/serve/api.ts';
import { Live } from '@core/serve/live.ts';
import { slashEntries } from '@core/serve/slash.ts';
import { dayOf, todaySources } from '@core/serve/today.ts';
import { Store } from '@core/store/store.ts';

export const WORK_VERBS = [
  'read',
  'add',
  'cards',
  'done',
  'undone',
  'rm',
  'today',
  'accounts',
  'connect',
  'repos',
  'issue',
  'issues',
  'close',
  'reopen',
  'comment',
  'git',
] as const;

interface Flags {
  json: boolean;
  values: Map<string, string[]>;
  bare: Set<string>;
  words: string[];
}

/** --name value, --flag, and the words between them. */
function flags(argv: string[]): Flags {
  const takes = new Set([
    '--board',
    '--kind',
    '--date',
    '--token',
    '--host',
    '--image',
    '-m',
    '--dir',
  ]);
  const out: Flags = { json: false, values: new Map(), bare: new Set(), words: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] as string;
    if (takes.has(a)) {
      const v = argv[++i];
      if (v !== undefined) out.values.set(a, [...(out.values.get(a) ?? []), v]);
    } else if (a === '--json') out.json = true;
    else if (a.startsWith('--')) out.bare.add(a);
    else out.words.push(a);
  }
  return out;
}

const one = (f: Flags, name: string): string | undefined => f.values.get(name)?.[0];

function say(f: Flags, data: unknown, text: string): void {
  process.stdout.write(f.json ? `${JSON.stringify(data, null, 2)}\n` : `${text}\n`);
}

function fail(f: Flags, message: string, extra: Record<string, unknown> = {}): number {
  if (f.json) process.stdout.write(`${JSON.stringify({ error: message, ...extra })}\n`);
  else process.stderr.write(`${message}\n`);
  return 1;
}

/**
 * A sentence to git: understood, shown, and -- when it changes something -- done only once it is
 * confirmed, at the prompt or with --yes. --plan shows what it would do and stops. What it was
 * about is remembered in the workspace (git-context.json), so the next "close it" knows what "it"
 * is; and inside a working copy, local git is done on that working copy.
 */
async function sayGit(f: Flags, live: Live, store: Store, text: string): Promise<number> {
  if (!text)
    return fail(f, 'say it: grimstroke git "close #12" · "merge PR 14" · "ایشو ۱۲ رو ببند"');
  const [{ understandGit }, { doGit }, { WorkingCopy }] = await Promise.all([
    import('@core/box/git/understand.ts'),
    import('@core/git/do.ts'),
    import('@core/git/local.ts'),
  ]);
  const memory = join(store.dir, 'git-context.json');
  const last = await readFile(memory, 'utf8')
    .then((t) => JSON.parse(t) as GitContext['last'])
    .catch(() => undefined);
  const local = await WorkingCopy.find(process.cwd());
  const ctx: GitContext = {
    ...(last ? { last } : {}),
    ...(local ? { local: { root: local.root, branch: await local.branch().catch(() => '') } } : {}),
  };
  const plan = understandGit(text, ctx);
  if (f.bare.has('--plan')) {
    say(
      f,
      { plan },
      `${plan.action?.id ?? 'not known'} (${Math.round(plan.confidence * 100)}%) · ${plan.says}`,
    );
    return plan.action ? 0 : 1;
  }
  const env = { live, local, here: process.cwd(), ...(last ? { last } : {}) };
  let result = await doGit(plan, env);
  if (result.confirm) {
    let yes = f.bare.has('--yes');
    if (!yes && process.stdin.isTTY && !f.json) {
      const rl = createInterface({ input: process.stdin, output: process.stderr });
      const danger = plan.weight === 'destructive' ? ' (this cannot be undone)' : '';
      const answer = await rl.question(`${plan.says}${danger} — do it? [y/N] `);
      rl.close();
      yes = /^(y|yes|بله|آره|اره|да|д)$/i.test(answer.trim());
    }
    if (!yes) {
      say(
        f,
        result,
        `${plan.says} — not done${process.stdin.isTTY ? '' : ' (add --yes to do it)'}`,
      );
      return 1;
    }
    result = await doGit(plan, { ...env, confirmed: true });
  }
  if (result.last) await writeFile(memory, JSON.stringify(result.last));
  const lines = [result.says];
  for (const i of result.items ?? []) lines.push(`  ${i.title}${i.meta ? `  · ${i.meta}` : ''}`);
  if (result.text) lines.push('', result.text.trimEnd());
  if (result.url) lines.push(result.url);
  say(f, result, lines.join('\n'));
  return result.ok ? 0 : 1;
}

/** The card a name means: an id anywhere, or address|id. */
async function findCard(live: Live, name: string) {
  const all = await slashEntries(live, 'workspace');
  return all.find((e) => `${e.address}|${e.id}` === name) ?? all.find((e) => e.id === name);
}

/** Run a work verb; undefined when the verb is not one of these. */
export async function work(
  verb: string,
  argv: string[],
  dir?: string,
): Promise<number | undefined> {
  if (!(WORK_VERBS as readonly string[]).includes(verb)) return undefined;
  const f = flags(argv);
  const store = new Store(dir === undefined ? {} : { dir });
  await store.ready();
  const live = new Live(store);
  const text = f.words.join(' ').trim();
  const now = new Date();
  try {
    switch (verb) {
      case 'read': {
        if (!text) return fail(f, 'read what? grimstroke read "dinner friday 8pm"');
        const command = matchCommands(text).find((m) => m.sure);
        const r = classify(text, now);
        const kind = r.intent.value;
        const block: ShapeBlock | undefined =
          kind === 'none'
            ? undefined
            : { kind: 'shape', intent: kind, text, made: now.toISOString() };
        const fields = block
          ? fieldValues(kind as never, readShape(kind as never, text, now, {}))
          : {};
        const summary = block ? summarize(block, now) : '';
        say(
          f,
          {
            kind,
            confidence: Math.round(r.intent.confidence * 1000) / 1000,
            ...(command ? { command: command.command.id, arg: command.arg } : {}),
            fields,
            summary,
          },
          command
            ? `a command: ${command.command.label}${command.arg ? ` (${command.arg})` : ''}`
            : kind === 'none'
              ? 'not a card yet: say more'
              : `${INTENTS[kind].label} (${Math.round(r.intent.confidence * 100)}%) · ${summary}`,
        );
        return 0;
      }

      case 'add': {
        if (!text) return fail(f, 'add what? grimstroke add "call the bank tomorrow 10am"');
        const asked = one(f, '--kind');
        const kind = asked && isIntent(asked) ? asked : classify(text, now).intent.value;
        if (kind === 'none')
          return fail(f, 'that is not a card yet: say more, or name it with --kind');
        const address = one(f, '--board') ?? SLASH_BOARD;
        const spec = await live.board(address);
        const id = `card-${Date.now().toString(36)}`;
        const block =
          kind === 'note'
            ? { kind: 'note' as const, text }
            : { kind: 'shape' as const, intent: kind, text, made: now.toISOString() };
        await applyBoard(live, address, [
          {
            op: 'add',
            item: {
              id,
              at: nextSpot(spec),
              z: topZ(spec) + 1,
              size: kind === 'note' ? [NOTE_WIDTH, NOTE_HEIGHT] : [kind === 'timer' ? 400 : 360],
              block: block as never,
            },
          },
        ]);
        const summary = block.kind === 'shape' ? summarize(block, now) : text;
        say(
          f,
          { id, address, kind, summary },
          `${INTENTS[kind].label} on ${address} · ${summary} · ${id}`,
        );
        return 0;
      }

      case 'cards': {
        const kind = one(f, '--kind');
        const cards = (await slashEntries(live, 'workspace'))
          .filter((e) => !kind || e.block.intent === kind)
          .filter((e) =>
            f.bare.has('--done') ? isDone(e.block) : f.bare.has('--open') ? !isDone(e.block) : true,
          )
          .map((e) => ({
            id: e.id,
            address: e.address,
            kind: e.block.intent,
            done: isDone(e.block),
            summary: summarize(e.block, now),
          }));
        say(
          f,
          { cards },
          cards.length
            ? cards
                .map(
                  (c) =>
                    `${c.done ? '✓' : '·'} ${c.kind.padEnd(9)} ${c.summary}  [${c.address}|${c.id}]`,
                )
                .join('\n')
            : 'no cards yet: grimstroke add "..."',
        );
        return 0;
      }

      case 'done':
      case 'undone':
      case 'rm': {
        const name = f.words[0];
        const card = name ? await findCard(live, name) : undefined;
        if (!card) return fail(f, `no card called ${name ?? '(nothing)'}: see grimstroke cards`);
        if (verb === 'rm') {
          await applyBoard(live, card.address, [{ op: 'remove', id: card.id }]);
          say(
            f,
            { removed: card.id, address: card.address },
            `let go: ${summarize(card.block, now)}`,
          );
          return 0;
        }
        const state = { ...(card.block.state ?? {}), closed: verb === 'done' };
        await applyBoard(live, card.address, [
          { op: 'update', id: card.id, patch: { block: { ...card.block, state } as never } },
        ]);
        say(
          f,
          { id: card.id, done: verb === 'done' },
          `${verb === 'done' ? '✓' : '·'} ${summarize(card.block, now)}`,
        );
        return 0;
      }

      case 'today': {
        const day = dayOf(one(f, '--date'));
        const data = gatherToday(await todaySources(live, 'workspace'), day);
        const line = (e: TodayEntry): string =>
          `${e.done ? '✓' : '·'} ${e.when && e.hasTime ? new Date(e.when).toTimeString().slice(0, 5) : '     '} ${e.title}  (${e.where.title})`;
        const parts: Array<[string, TodayEntry[]]> = [
          ['now', data.now],
          ['today', data.today],
          ['every day', data.habits],
          ['slipped past', data.overdue],
          ['open lists', data.lists],
          ['this week', data.soon],
        ];
        say(
          f,
          data,
          [
            `${data.date}`,
            ...parts
              .filter(([, rows]) => rows.length)
              .map(([t, rows]) => `\n${t}\n${rows.map(line).join('\n')}`),
          ].join('\n') || 'a clear day',
        );
        return 0;
      }

      case 'accounts': {
        const accounts = await live.remote.tokens.summary();
        say(
          f,
          { accounts },
          accounts.length
            ? accounts.map((a) => `${a.provider.padEnd(7)} ${a.host}  ${a.user ?? ''}`).join('\n')
            : 'none: grimstroke connect github --token <token>',
        );
        return 0;
      }

      case 'connect': {
        const service = f.words[0] ?? '';
        if (!(PROVIDERS as readonly string[]).includes(service))
          return fail(
            f,
            'connect github, gitlab or gitea: grimstroke connect github --token <token>',
          );
        const token = one(f, '--token');
        if (!token)
          return fail(
            f,
            'a token is needed: --token <token> (it is kept on this computer, mode 0600)',
          );
        const host =
          one(f, '--host') ??
          (service === 'github' ? 'github.com' : service === 'gitlab' ? 'gitlab.com' : '');
        if (!host) return fail(f, 'which host? --host git.example.com');
        const who = await live.remote.saveKey({ provider: service as Provider, host, token });
        say(
          f,
          { host, user: who.login, canWrite: who.canWrite },
          `connected ${host} as ${who.login}`,
        );
        return 0;
      }

      case 'repos': {
        const repos = await repositories(live, true);
        say(
          f,
          { repos },
          repos.length
            ? repos.map((r) => `${r.host}/${r.repo}`).join('\n')
            : 'none: grimstroke connect github --token <token>',
        );
        return 0;
      }

      case 'issue': {
        if (!text)
          return fail(
            f,
            'say the issue: grimstroke issue "bug: the save button is slow, label mobile in owner/name"',
          );
        const images = [];
        for (const path of f.values.get('--image') ?? []) {
          const asset = await store.importAsset(path);
          images.push({ asset, name: path.split('/').pop() ?? asset });
        }
        const done = await openIssue(live, {
          block: { kind: 'shape', intent: 'issue', text, made: now.toISOString() },
          ...(one(f, '--board') ? { address: one(f, '--board') } : {}),
          images,
        });
        say(
          f,
          done,
          `#${done.issue.number} opened in ${done.repo}${done.labels.length ? ` · ${done.labels.join(', ')}` : ''}\n${done.issue.url}`,
        );
        return 0;
      }

      case 'issues': {
        const list = await listIssues(live, {
          repo: f.words[0] ?? null,
          mine: f.bare.has('--mine'),
          state: f.bare.has('--closed') ? 'closed' : f.bare.has('--all') ? 'all' : 'open',
        });
        say(
          f,
          list,
          `${list.repo}\n${list.issues.map((i) => `#${String(i.number).padEnd(5)} ${i.title}${i.labels.length ? `  [${i.labels.join(', ')}]` : ''}`).join('\n') || 'nothing open'}`,
        );
        return 0;
      }

      case 'git':
        return await sayGit(f, live, store, text);

      case 'close':
      case 'reopen':
      case 'comment': {
        const [number, repo] = f.words;
        const body = one(f, '-m');
        const done = await actOnIssue(live, {
          repo: repo ?? null,
          number: number ?? '',
          action: verb,
          ...(body !== undefined ? { body } : {}),
        });
        say(
          f,
          done,
          `#${done.issue.number} ${verb === 'close' ? 'closed' : verb === 'reopen' ? 'open again' : 'answered'} in ${done.repo}`,
        );
        return 0;
      }
    }
  } catch (error) {
    if (error instanceof GitProblem) return fail(f, error.message, error.extra);
    return fail(f, error instanceof Error ? error.message : String(error));
  } finally {
    live.close();
  }
  return undefined;
}
