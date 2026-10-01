# The core and the front: a plan

grimstroke is becoming two things, the way git is plumbing and porcelain.

- **grimstroke (this repository) is the core.** Everything that is kept and everything that is
  understood: the store, the documents as data and their patches, the / box's reading of what is
  typed, the day, reminders, the logins, the repositories it is connected to, the JSON API and
  the CLI. Its own face is the smallest one that is still complete: **the / box, and the / board**
  (`/slash`) where everything the box made is looked after. The box is meant to be usable from
  anywhere as a shortcut; what it makes without being told where goes onto the board `slash`.
- **grimstroke-front (a separate folder, later its own repository) is one face of many.** The
  desk, the notebooks, the bookcase, the pets, the calendar, the settings, the exports. It reads
  and writes only through the core's API, so it can be redesigned, replaced, or joined by others.

## Stages

1. **The / board in the core** -- done: `/slash`, `GET /api/slash`, `POST /api/slash/{add,save,delete,restore}`.
2. **The API is all a face needs.** Every route answers in data; markup that the API returns
   today (`html` beside a patch, the rendered leaf in an event) is drawn by the front instead.
3. **The front moves out.** `draw/` (all but the / card faces and what the core needs to read
   cards), `app/` (all but the box and the / board) and the HTML pages move to
   `../grimstroke-front`, which runs as its own server against the core's API.
4. **Everything through /.** The bookcase, the settings and the calendar become things the box
   opens, so there is one way in.
5. **The model.** Laya (an encoder that chooses among given options, ~650 MB multilingual) for
   choosing a card's kind and an issue's labels; translation needs a model that writes, which
   Laya does not.
6. **Repositories through /.** An issue written in a sentence, its type and labels chosen from the
   repository's own, a pasted picture carried with it.
