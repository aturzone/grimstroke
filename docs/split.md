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
2. **The API is all a face needs** -- done. The core answers every route in data; markup beside
   a patch, a leaf in an event, the bookcase, the profile card and the day are asked of the face
   (host/serve/face.ts), and are left out when there is none. The face lives in src/face, built
   to dist/face.js, loaded by `serve`; `GRIMSTROKE_FACE=none` runs the core alone, whose own
   page is the / board in a frame of its own (draw/slash/page.ts, dist/box.js).
3. **The front moves out.** `draw/` (all but the / card faces and what the core needs to read
   cards), `app/` (all but the box and the / board) and the HTML pages move to
   `../grimstroke-front`, which runs as its own server against the core's API.
4. **Everything through /** -- started: the box is on every page (a / button in every top bar),
   and besides cards it does what it is asked by name, in English, Persian or Russian: go to the
   board, the calendar, the notebooks or the settings; dark or light; a new notebook; search;
   connect a GitHub, GitLab or Gitea account; reminders on this device; a backup; sign out
   (draw/shape/commands.ts). Next: the bookcase, the settings and the calendar drawn as the box's
   own panels.
5. **The model.** Laya (an encoder that chooses among given options, ~650 MB multilingual) for
   choosing a card's kind and an issue's labels; translation needs a model that writes, which
   Laya does not.
6. **Repositories through /** -- started: an issue written in a sentence, its type and labels
   chosen from the repository's own, a pasted picture carried with it (docs/api.md).
