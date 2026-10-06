# What is next

The plans this repository was built from (the workspace, the notebook, repositories, the
redesign, the day) are done and in its history. What is open:

## The core
- **Translation in the / box.** It needs a model that writes, which the box's own model is not:
  either a service it asks (an API key, the owner's choice) or a translation model run beside
  the core on a machine that can carry it. Not yet chosen.
- **More languages for everything, not only repositories.** Repositories are read in eleven
  languages (src/box/lexicon.ts); dates, times and the other kinds of card in English, Persian
  and Russian. Each further language is a lexicon entry, date words in src/box/when.ts, and
  training sentences in tools/shape-data.ts.
- **An MCP server** over the same API, so any assistant can read the day, add a card, open an
  issue -- with the same keys as now.
- **Offline**: edits made with the workspace out of reach, kept and sent when it is back.

## The face (grimstroke-face)
- Tested on a real phone: touch, the on-screen keyboard over the / box and a note, reminders.
- The bookcase and the settings drawn in the box's style, as the board's popups now are.

## Releases
- The core is versioned and tagged here; the face, once it has its own repository, with it.
