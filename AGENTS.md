# grimstroke, for an agent

You are working on the **core** of grimstroke: what is kept and what is understood. Boards and
notebooks as data and the patches that change them, the / box's reading of a line of text (its
own model, in English, Persian and Russian, and for repositories eight more languages), the
day, reminders, logins, repositories, and the server and command line that answer all of it in
data. **It has no appearance at all.** What draws -- the / box in a browser, the / board, the
desk, the notebooks -- is a **face**: `../grimstroke-face` is the one there is, plugged in through
`src/serve/face.ts`.

Keep it that way: nothing here imports a face, nothing here makes markup, styles or colours, and
a route that needs markup asks the face for it and answers without it when there is none
(`GRIMSTROKE_FACE=none` runs the core alone; tests/serve/core.test.ts holds it to that).

## Orientation

The core imports itself as `@core/` (tsconfig, vitest, the build and tools/ts-loader.mjs all
resolve it), which is how a face imports it too. Pure modules -- no clock, no network, no disk --
are everything in `box/`, `docs/`, `day/` and `vocab/`; `git/`, `serve/`, `store/` and the command
line are where those are allowed.

```
src/index.ts         the public API: models, patches, the box's model, the day, serve, Store
src/cli.ts           grimstroke: serve, gateway, hash-password, save/open, search, trash,
                     history -- and src/work.ts's verbs; it loads a face if one is beside it
src/work.ts          the / box and repositories from a terminal, on the workspace's files:
                     read, add, cards, done, today, connect, repos, issue, issues, close...

src/box/             THE / BOX, pure
  classify.ts        the model (multinomial logistic regression); weights.ts its weights,
                     written by tools/train-shape.ts from tools/shape-data.ts
  rules.ts           the named facts the model weighs; parse.ts and its readers: when.ts
                     (dates and times), units.ts, zones.ts, colors.ts, issue.ts (an issue)
  labels.ts          a repository's labels chosen for an issue: an archive of what labels mean
  lexicon.ts         repository words in eleven languages: one entry per language
  commands.ts        what the box does besides cards ("settings", "close #12")
  card.ts            a card as data, and its summary; fields.ts (values set by hand);
                     decide.ts (the box's calm state machine); intents.ts; slash.ts (the / board)
src/docs/            boards, notebooks, the bookcase, blocks, notes, the profile: models and
                     patches; board-extent.ts (geometry, and where a new card goes); search.ts;
                     words.ts (any block's words); legacy.ts (old stored shapes, upgraded)
src/day/gather.ts    the day, gathered from every card
src/vocab/           the names documents use (look.ts: paper, templates, frames, palettes,
                     quiet hours), decor kinds, pet coats, sticker packs; rng.ts (hashing)
src/git/             GitHub, GitLab, Gitea adapters; keys (0600); sign-in; work.ts (repositories
                     as the box works with them, for the API and the command line alike)
src/serve/           the server: server.ts (the door, then the face's routes, then the core's),
                     face.ts (the contract), api.ts, live.ts (documents held and watched),
                     slash.ts, issue.ts, today.ts, push.ts (Web Push), gateway.ts and login.ts
                     (several people behind one login), look.ts (the owner's look settings)
src/store/           boards, notebooks, assets by content hash; the archive

tests/               mirrors src/
tools/               build.ts, train-shape.ts and shape-data.ts (the model), the TS loader
docs/api.md          every endpoint and operation; docs/split.md the core and the face;
docs/roadmap.md      what is open
```

## Before you change anything

```sh
pnpm check
```

It types, lints, tests and builds. Commit only on a green check, gated on its exit code --
`pnpm check && git commit`, never a pipe through grep that swallows the failure. After
`pnpm build`, restart a running server, or you are looking at the old code.

## The rules that are not style

**The core draws nothing.** No markup, no styles, no colours, no fonts: a face does. A route
that needs markup asks the face (src/serve/face.ts) and answers without it when there is none.
Everything pure -- box, docs, day, vocab -- stays free of the clock, the network and the disk.

**A language is one entry.** Repository words live in src/box/lexicon.ts, one entry per
language; the issue reader, the rules, the label archive and the commands all read them. Add a
language there and in tools/shape-data.ts, run `pnpm train`, and keep the held-out accuracy
where it was. Never move the model by hand-editing weights.ts.

**`null` clears a field in a patch; `undefined` does not exist.** JSON drops `undefined` keys,
so a patch that "cleared" a title with it arrived as a patch that changed nothing, and its
inverse could not restore the title either. `apply` deletes keys set to `null`, and `invert`
records `null` for keys that were absent.

**A tab is never sent its own patch back.** Each tab has a client id, sent as
`x-grimstroke-client` on patches and `?client=` on the event stream. Position-only changes
reply with `placed: [{id, at, z}]`, not re-drawn items.

**A page of a notebook is a board.** It is addressed as `book:<notebook>:<leaf>` and served by
`Live.page()`, which builds a BoardSpec from the leaf and writes items back into it. Do not give
pages their own patch vocabulary: every board operation works on a page because it is the same
code.

**Stored data is upgraded on read and never rewritten for it.** `docs/legacy.ts` turns old
shapes into current ones in memory. A file is only written when its content actually changes,
and nothing deletes what a user left on disk.

**A card the core puts down goes under what is there** (`docs/board-extent.ts` nextSpot), on
every route. Placing it at a fixed spot stacked an agent's cards on top of each other.

## The house style

Comments explain **why**, and where there is one, the failure that produced the rule. A bare
imperative gets reverted by whoever finds it inconvenient; a rule with a scar attached survives.

No `any`. Single quotes, two-space indent, 100 columns; Biome enforces all of it. A test name
with an apostrophe in it goes in double quotes: a single-quoted one breaks the transform.

**A backslash-u escape typed into a tool writes the literal character.** When generating source
that must contain `\u0627`-style escapes (the Persian ranges in `docs/words.ts`,
`docs/search.ts`), double the backslash, then read the file back and check.
