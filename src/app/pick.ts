/** Choosing a place to send something to. */

/**
 * Where to send something: the board, the / board, or a page of a notebook -- a small card
 * with the places and a page number. Shared by the board's "send to" and the / board's.
 */
export async function pickPage(from = ''): Promise<string | undefined> {
  const res = await fetch('/api/shelf');
  if (!res.ok) return undefined;
  const { rows, archive } = (await res.json()) as {
    rows: Array<Array<{ id: string }>>;
    archive: string[];
  };
  // Notebooks only: the bookcase's rows also hold its objects (a plant, a lamp).
  const ids = [...rows.flat().map((s) => s.id), ...archive].filter(
    (id) => !id.startsWith('decor:'),
  );
  const titles = await Promise.all(
    ids.map(async (id) => {
      const r = await fetch(`/api/state?kind=book&id=${encodeURIComponent(id)}`);
      const { spec } = (await r.json()) as { spec: { title?: string; cover?: { title?: string } } };
      return spec.cover?.title ?? spec.title ?? id;
    }),
  );
  return new Promise((done) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'gs-dialog gs-ask';
    dialog.setAttribute('aria-label', 'send to a page');
    const form = document.createElement('form');
    form.method = 'dialog';
    form.innerHTML =
      '<header class="gs-dialog-head"><h2>send it somewhere else</h2></header>' +
      '<div class="gs-dialog-body">' +
      '<label class="gs-ask-label" for="gs-move-book">where to</label>' +
      '<select class="gs-field" id="gs-move-book" data-gs="move-book"></select>' +
      '<label class="gs-ask-label" for="gs-move-page">page</label>' +
      '<input class="gs-field" id="gs-move-page" type="number" min="1" value="1" data-gs="move-page">' +
      '</div><div class="gs-dialog-actions">' +
      '<button class="gs-btn" value="cancel" formnovalidate>not now</button>' +
      '<button class="gs-btn gs-btn-primary" value="send" data-gs="move-send">send</button></div>';
    const select = form.querySelector('select') as HTMLSelectElement;
    const pageField = form.querySelector('input') as HTMLInputElement;
    // The boards, leaving out the one they are coming from: first from a page, after the
    // notebooks from a board, where sending to a notebook is what is usually meant.
    const boards = (
      [
        ['workspace', 'the board'],
        ['slash', 'the / board'],
      ] as const
    )
      .filter(([value]) => value !== from)
      .map(([value, text]) => {
        const board = document.createElement('option');
        board.value = value;
        board.textContent = text;
        return board;
      });
    if (from.startsWith('book:')) select.append(...boards);
    const onBoard = (): void => {
      pageField.disabled = !select.value.startsWith('book:');
    };
    select.addEventListener('change', onBoard);
    ids.forEach((id, i) => {
      const option = document.createElement('option');
      option.value = `book:${id}`;
      option.textContent = titles[i] ?? id;
      select.append(option);
    });
    if (!from.startsWith('book:')) select.append(...boards);
    dialog.append(form);
    onBoard();
    dialog.addEventListener('close', () => {
      const page = Math.max(1, Number(pageField.value) || 1);
      const place = select.value;
      dialog.remove();
      if (dialog.returnValue !== 'send') return done(undefined);
      done(place.startsWith('book:') ? `${place}:${page}` : place);
    });
    document.body.append(dialog);
    dialog.showModal();
  });
}
