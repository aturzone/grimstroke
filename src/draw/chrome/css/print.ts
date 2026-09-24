/**
 * Print, which is also how a PDF is made.
 *
 * Part of the one stylesheet, assembled in draw/doc/style.ts. It is CSS in a template
 * literal, so it CANNOT CONTAIN A BACKTICK -- not even in a comment. That has closed the
 * string and broken the build four times.
 */

/** Print, which is also how a PDF is made. */
export const PRINT = `/* ---- print ----

   Which is also how a PDF is made. The browser already has a vector renderer and a PDF writer
   in it, and using them costs nothing, needs nothing installed, and produces real text and
   real paths rather than a picture of them -- so a stroke stays a hairline at four hundred
   per cent and the words can be selected and searched.

   The board is printed at its true size with the chrome gone and the camera reset. The page
   size is set by the app from the actual content bounds: the sheet is much larger than what
   is on it, and printing the whole sheet gives a correct PDF of mostly empty paper. */
@media print {
  html, body.live {
    width: var(--print-w, auto);
    height: var(--print-h, auto);
    overflow: visible;
    background: none;
  }
  /* Browsers drop backgrounds when printing unless told otherwise, and the paper IS the
     background here -- without this the PDF is the ink with no sheet under it. */
  * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .gs-tray, .gs-bar, .gs-drop, .gs-marquee, .gs-editing, .gs-settings, .gs-rule, .gs-note-done { display: none !important; }
  /* Printing has no camera, so the paper draws its own ruling again. */
  .live .board { background-image: var(--paper-rule, none); background-color: var(--paper); }
  /* A printed board is paper. The note's toolbar and its grips are controls, and a control
     nobody can press is six grey smudges along the top of every sheet. The grip DOTS stay:
     they are printed on the paper in the reference material too. */
  .note .actions, .note .grips { display: none !important; }
  .note .handle { justify-content: flex-start; }
  .viewport {
    position: relative;
    inset: auto;
    overflow: visible;
    width: var(--print-w, auto);
    height: var(--print-h, auto);
  }
  .live .board {
    position: absolute;
    left: var(--print-x, 0px);
    top: var(--print-y, 0px);
    transform: none !important;
    box-shadow: none;
  }
  .live .item[data-selected] { outline: none; }
  /* Everything outside the export. A selection prints as a page of its own rather than as a
     crop with its neighbours showing along the edges. */
  .live .item[data-gs-hidden] { display: none !important; }
}
.live .item[data-gs-hidden] { display: none; }


/* Every surface prints as its document and nothing else: the top bar, the menus, the toasts
   and the profile page's actions are controls, and a control on paper is a smudge. */
@media print {
  .gs-top, .gs-toasts, .gs-turner, .gs-desk, .gs-selbar, .gs-empty, .pf-panel, dialog { display: none !important; }
  body.on-studio { background: none; padding: 0; }
  body.on-studio::before { display: none; }
  .pf-page { display: block; padding: 0; }
  .pf-stage { width: 105mm; padding: 10mm; }
}
`;
