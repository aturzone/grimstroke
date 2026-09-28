# The daily notebook: a plan

grimstroke began as a notebook for agents. The next step is that it becomes a person's own
notebook -- the thing opened first in the morning and last at night, on a phone as much as at a
desk -- which brings order to a day without asking for any, and which other AIs can read and
write for them.

## What it must feel like

1. **Opening it is the start of the day.** The first screen is the day: what is on, what is due,
   what slipped, in the order a morning asks it. No setup, no empty dashboard.
2. **Writing is one gesture.** `/` and a sentence, in English or Persian, and it is a card that
   knows what it is -- a plan, a list, a timer, a habit. Nothing to file.
3. **Order comes from what was written, not from forms.** The day page is gathered from the
   cards where they were written; nobody keeps a second list.
4. **Calm, small, lovable.** Soft paper, few controls, big targets, sounds that are touch not
   alarms, a pet that is glad to see you. It is a notebook, not a control panel.
5. **An open notebook for agents.** Everything a person can do, an agent can do over the API,
   and the day is data an agent can plan around.

## Phases

### 1. The day (started)
- [x] `/today`: gathered from every card on every board and page -- now, today, every day,
  slipped past, open lists, this week -- with tick, done and keep-a-habit in a tap.
- [x] `GET /api/today` for agents; `POST /api/today/act`.
- [x] The day as the phone's first screen: the first opening of the day on a phone lands on the
  day, with the board a tap away (once a day, only arriving from outside, only at `/`).
- [ ] Type from the day: the `/` box on the day page itself, putting the card on today's page of
  a "days" notebook (below) instead of sending the person to the board.
- [ ] Evening: "how the day went" -- what was kept, what moves to tomorrow in one tap.

### 2. A notebook of days
- [ ] A notebook that makes its own page each day (a journal): what was planned, what was done,
  notes and pictures of the day; the day page writes into it.
- [ ] Carry over: an unfinished item offered on the next day's page, never silently.
- [ ] A week view and a month view, as spreads of the same notebook.

### 3. Reminders that reach you
- [ ] The browser's notifications (asked once, off by default) for timed events and reminders,
  honouring quiet hours.
- [ ] Installable as an app on a phone (a web app manifest and an offline shell), so it opens
  full-screen from the home screen.

### 4. Other AIs
- [ ] A small, documented MCP server over the same API, so an assistant (Claude or another) can
  read the day, add a card, tick a list, write a page -- with the same token model as now.
- [ ] "Ask" from the day page: a question about the notebook answered by the connected assistant,
  its answer written as a card where it belongs.
- [ ] Every agent write is marked as the agent's, and undoable like any edit.

### 5. The phone, finished
- [ ] Tested on a real Android device or emulator for touch: pinch, two-finger pan, swipe to turn,
  the on-screen keyboard over the `/` box and over a note.
- [ ] Offline: edits made without the workspace are kept and sent when it is back.

## Measured, not guessed
Each phase is looked at on a phone (360-430 wide) and a desk, in English and Persian, and the
layout audit holds every surface -- `/today` included -- at six sizes.
