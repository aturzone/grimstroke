# grimstroke

The core of a notebook for people and agents: what is kept, and what is understood.

Boards, notebooks and their pages are documents kept as plain JSON, changed only by patches,
and every change is broadcast to whoever is watching. The **/ box** reads a line of English,
Persian or Russian (and, for repositories, eight more languages) -- "dinner friday 8pm", "۲۵ دقیقه تمرکز", "bug: the save button is slow on the
phone, label mobile" -- and knows what it is: an event, a checklist, a timer, a habit, a sum, a
poll, an issue for a repository, and a dozen more; or a thing to do ("settings", "тёмная тема",
"new notebook Travel"). The day is gathered from every card, reminders reach a phone with the
page shut, and issues are opened on GitHub, GitLab or Gitea with that repository's own labels.

The core answers all of it as data -- over HTTP, or on the command line -- and has no
appearance at all: it runs on almost anything, with nothing to draw and nothing to install but
Node. Working with repositories is its first job, in eleven languages. Everything a person sees
-- the / box and the / board, the desk, the notebooks, the bookcase, the settings, the exports --
is a **face**, kept in its own repository (grimstroke-face) and plugged in through one contract
(`src/serve/face.ts`). A face can be replaced, and the core does not change.

```sh
grimstroke serve
# grimstroke is on http://127.0.0.1:53199/?t=...
```

With a face beside it (`../grimstroke-face/dist/face.js`, or `GRIMSTROKE_FACE=path`), that is the
whole workspace. With none (`GRIMSTROKE_FACE=none`), it is the API alone: the core draws nothing.

Or with no server at all, straight on the workspace's files, the way git works on a repository:

```sh
grimstroke read "gym mon wed fri 7am"        # what the box makes of a line
grimstroke add "milk, eggs, bread"           # a card on the / board
grimstroke cards --open
grimstroke today
grimstroke connect github --token <token>
grimstroke issue "bug: save is slow on the phone, label mobile in owner/name" --image shot.png
grimstroke issues web --mine
grimstroke close 12 web
```

Every command answers in JSON with `--json`. An agent can equally use HTTP:

```sh
curl -X POST "$URL/api/shape/place" -H 'content-type: application/json' \
  -d '{ "text": "call the bank tomorrow 10am" }'
curl "$URL/api/slash"          # every card the box made, wherever it is
curl "$URL/api/today"          # the day, as data
```

`docs/api.md` lists every endpoint and operation (`GET /api/capabilities` lists them live);
`docs/split.md` is how the core and the face came apart.

## The model

The / box decides with grimstroke's own model: a multinomial logistic regression over named
facts and hashed character and word n-grams, trained on generated sentences in three languages
(`pnpm train`), with int8 weights of a few tens of kilobytes. A decision takes well under a
millisecond, in the browser or on the server, with nothing to install and nothing sent anywhere.
An issue's labels are chosen against the repository's own by an archive of what labels stand for
(`src/box/labels.ts`), in eleven languages (`src/box/lexicon.ts`).

## Several people

`grimstroke gateway --users FILE --dir DIR` puts several people behind one login, each with a
workspace of their own in `DIR/<name>`: a separate process, a separate store, nothing shared.

## Working on it

```sh
pnpm check   # typecheck, lint, test, build
pnpm train   # teach the / box's model again, and see how it does on what it never saw
```

`AGENTS.md` maps the tree.

## License

MPL-2.0.
