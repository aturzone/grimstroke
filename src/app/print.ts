/**
 * The printed notebook: a button that prints, and sheets that fit a narrow window.
 *
 * Saving as a PDF is the browser's print, with the notebook's page size already set by the
 * page. Arriving with ?print, the dialog opens by itself once the fonts are in.
 */

export function bootPrint(): boolean {
  const book = document.querySelector<HTMLElement>('[data-gs="print"]');
  if (!book) return false;
  const width = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--leaf-width'),
  );
  const fitSheets = (): void => {
    const zoom = width ? Math.min(1, (window.innerWidth - 32) / width) : 1;
    book.style.setProperty('--sheet-zoom', String(Math.round(zoom * 1000) / 1000));
  };
  fitSheets();
  window.addEventListener('resize', fitSheets);
  const print = async (): Promise<void> => {
    await document.fonts.ready;
    window.print();
  };
  document.querySelector('[data-gs="print-save"]')?.addEventListener('click', () => void print());
  if (new URLSearchParams(location.search).has('print')) void print();
  return true;
}
