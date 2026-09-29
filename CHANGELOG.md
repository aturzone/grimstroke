# Changelog

## 0.6.1 — 2026-09-29

The phone, for real this time.

- Every page now tells a phone to lay it out for its own screen. Without it, a phone drew each
  page 980 pixels wide and shrank it: the desktop, tiny, with none of the phone layout reached.
- The app script is kept by the browser until the next release instead of being sent in full on
  every page; with compression a phone downloads 191 KB once instead of 474 KB each time.
- On a touch screen, notes leave out the blended texture layers and blurred shadows that cost a
  phone's graphics most; the bars keep clear of a notch and the home bar.

## 0.6.0 — 2026-09-28

Several people, and reminders that reach a shut phone.

- **`grimstroke gateway`**: one login in front of a workspace for each person -- each its own
  process, data folder and token, reachable only through the gateway; the session cookie is
  signed, so no one can become someone else by editing it.
- **Web Push**: a phone or computer that allows notifications is told by the server itself --
  fifteen minutes before an event, ten before a reminder, at nine for something dated with no
  time -- once each, with quiet hours kept and the page shut. Encryption (RFC 8291) and signing
  (RFC 8292) with node:crypto alone.
- **An app for the home screen**: a manifest, icons and a service worker, so grimstroke can be
  added to a phone's home screen -- which an iPhone needs before it will notify.

## 0.5.0 — 2026-09-28

A calendar, light and dark, and pages with an edge.

- **Calendar**: the day page is a calendar -- a month from Saturday with each day's Solar Hijri
  date and a mark of how full it was and how much was done; any day opens to what it held, and a
  habit kept on a day gone by is kept on that day.
- **Light and dark**: Light (the studio blue) and Dark, the same blue on a dark room, are the
  defaults; settings chooses between them for everything without a template of its own, and the
  tools go dark with it. Every palette's paper, ink and accent can be changed, and colours that
  cannot be read are refused.
- **Notebook pages have an edge**: nothing can be left off a page -- a drag, an agent or a move
  lands inside it, and what was lost off an edge comes back. "Send it somewhere else" goes from
  any surface to the board or any page of any notebook, landing under what is there.
- An event marked done on the calendar can be taken back on its card; the phone's top bar looks
  as it does on a desk.
- **A login**, for a workspace served beyond this computer: a name and a password, the password
  kept only as a hash.

## 0.4.0 — 2026-09-28

The day, and a notebook that follows your theme.

### The day
- **`/today`**: a morning page gathered from every card on every board and notebook page -- what
  is running, what is on today and when, the habits due, what slipped past, the open lists, this
  week. Tick a list, mark a reminder done or keep a habit with a tap; type a plan with `/` right
  there. Every row takes you to its card. On a phone, the first opening of the day lands on it.
- Yesterday stays on the page as a record: what was kept and what was not.
- Reminders reach you: allowed once from the day page, a system notification when a reminder is
  due and five minutes before an event, while a grimstroke tab is open (quiet hours kept).
- `GET /api/today` gives the same day to an agent; `POST /api/today/act` and `/api/today/add`
  change it as the page does. The plan for what comes next is `docs/daily.md`.

### The look
- The `/` box and its cards take their paper, ink and accent from the theme; the accent is held
  dark enough to read on every palette.

### The phone
- Settings shows every section as tiles; the easel stays under half the screen; a phone on its
  side keeps the bars small.

### The pets
- An animation pass: anatomy side-on, eight-frame walks, a gallop, crouch-leap-land, and poses in
  between every state so nothing jumps. Legs join the body at hip and shoulder in every frame (a
  test holds each frame to it), the walk no longer lifts the body off its legs, and the husky and
  shiba have real faces instead of triangles.

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

### Simpler, and at home on a phone
- One value of corners now looks the same on every surface: at "soft" the board's small parts had
  been turned into pills while settings' cards barely changed. The `/` cards and the `/` box are
  drawn like the rest of the tools -- the same keyline, hard shadow and corners.
- A sticky note's toolbar comes up under the pointer or when the note is chosen, not on every note
  all the time.
- Settings: one set of corners and faces for everywhere, each part on its own folded away.
- On a phone: 40px targets everywhere; a tray of eight full-size tools, the marker and highlighter
  waiting beside the inks while drawing; the top bar gives its room to the name, with export in
  the menu and a page saying "12 / 40" once; a new note brings the camera in to write in it; a `/`
  guess can be kept with a tap; the `/` button sits beside the page turner.

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
