# Changelog

## 0.3.0 — 2026-09-28

The redesign's first pass (docs/redesign.md): everything that changes, moves, and says what just
happened; small sounds for what a hand does; the tools set in one clear type.

### Motion
- What moves by anything but the hand -- undo, redo, a tidy, an agent -- slides there instead of
  jumping; a thing picked up lifts and lands; a choice slides its highlight across.
- A card flies from the `/` box to its place; a card sent to another page is followed there.
- Every page fans in and folds away; a page opened to work on comes up off the spread to meet you
  and settles back into it after.
- Going between the board, the notebooks and the settings, the place's highlight slides over to
  the one you chose as the next surface fades up.
- The bookcase reflows its books and objects; a book set down rocks once on its foot.

### Sound
- A sound per material -- a sticky note, a sticker, a picture, a card, ink -- and for opening a
  notebook, turning a page, a menu, a dialog or a drawer, a lock, a tick, a timer done, the pet.
- Quiet hours: no sound between two hours of the day, across midnight; sounds on or off from
  the menu on every surface.
- "Nothing moves" in settings now stops everything -- the page turn, the pet, the bookcase, the
  way between surfaces -- and "calm" leaves out the flourishes.

### Clearer
- The tools in a clear sans on one readable scale; the notebook's bar in three groups; a first-visit
  tour; the shelf counts what is in use and archived; empty bookcases say what goes in them.
- Where in a notebook you are: a rail along the page turner, and the open pages marked in every
  page.
- The tools' inks are measured on every palette by a test: Carbon's quiet ink was 3.6:1, now 4.7:1.

### Fixed
- A timer that ran out while the page was shut no longer says "time is up" on every visit.
- Settings sits centred on a wide screen, with one left edge in every card.
- On a phone: the shelf's title is not cut off, a tapped button's tip does not stay up, and the
  tour points at the menu the places fold into.
- A repository's error says its status once; the stamp on a card no longer covers its title.
- The `/` box fades out the way it came in, and a `/` pressed as it goes opens a new one.

### The pet
- A proper loaf; the dog's crouch, leap and landing on its walking body, and a real crouch to
  spring from; sleep curled on its side, and a cat asleep lays its ears flat; a Siamese mask and
  dark points on its ears; a clean Dalmatian face.

## 0.2.0 — 2026-09-28

The workspace grows up: notebooks you can connect to a repository, a bookcase you can make your
own, a pet that lives on it, cards you type into being, and a settings page for all of it.

### Writing and pages
- **Type anything, and it becomes a card.** `/` on a board, a page or a notebook's spread opens one
  box; a line becomes an event, checklist, timer, habit, colour, split, expense, conversion, sum,
  trip, poll, contact, bookmark, countdown, time zone, dice roll, goal or note -- in English or
  Persian. A small classifier that ships inside the page decides which (no network, no
  dependency); every value on a card is computed, never guessed. Every card can be changed by hand
  after it is made.
- Notebooks: a page turn that shows only what a real one shows, a smooth opening, turning back
  fixed, the whole notebook as one PDF (in the browser or made on the server), page sizes and
  templates, two-column writing with numbered figures and page references for agents.
- A page can move apart what overlaps on it; a Kanban page can be a tracker of a repository's
  issues.

### Repositories
- Connect a notebook to GitHub, GitLab or Gitea, step by step; issue, merge request, commit and
  pipeline cards that stay up to date; tick to close, reply to comment, an issue's whole
  conversation beside the page, live lists and trackers.

### The bookcase and the pet
- A bookcase you carry books around, in nine woods and eight backs, with objects and stickers.
- A cat or a dog in thirteen coats that walks the shelves, sleeps, washes, stretches, eats from a
  bowl you put down and purrs when you stroke it.

### Settings and the look
- One settings page: profile, pet, look and fonts, sound and motion, connections, workspace
  (backup, restore, trash), about.
- Corners from square to very round, and faces for buttons and text, for each part -- the board,
  notebooks, settings -- with notebooks and boards able to keep their own.
- Things arrive, settle and leave; small synthesised sounds when a hand does something. Both can
  be turned down or off.
- Every button says what it is for; every surface checked at phone to desktop sizes, and the
  check runs on every build.

### For agents
- Everything a person can do has an endpoint; `GET /api/capabilities` lists them all with every
  vocabulary. See docs/api.md.
