/**
 * What changes on a screen with no hover.
 *
 * Part of the one stylesheet, assembled in draw/doc/style.ts. It is CSS in a template
 * literal, so it CANNOT CONTAIN A BACKTICK -- not even in a comment. That has closed the
 * string and broken the build four times.
 *
 * Each piece of chrome says for itself what it gives up as the screen narrows, beside the
 * rules it is changing -- the top in top.ts, the tray in tray.ts -- because a single "mobile"
 * file far from the rules it overrides is how a tray ended up with two definitions of its
 * own padding that disagreed.
 */

/** A hover-only affordance is invisible to a finger. */
export const SCREEN = `/* Moving between surfaces. The top bar is the same on every one and stays put; what is under it
   fades out on leaving and in on arriving, over the same colour, so there is never a white page
   between the board and the shelf. Live pages only: an export never animates. */
:root:has(> body.live, > body.is-live, > body.on-profile) { background-color: var(--desk, #2f2a24); }
:root:has(> body.on-board) { background-color: var(--paper, #f4efe2); }
:is(body.live, body.is-live, body.on-profile) > :not(.gs-top, script, dialog, svg, .gs-toasts) {
  animation: gs-arrive 220ms cubic-bezier(0.2, 0.8, 0.25, 1) both;
}
@keyframes gs-arrive { from { opacity: 0; } to { opacity: 1; } }
html[data-gs-leaving] :is(body.live, body.is-live, body.on-profile) > :not(.gs-top, script, svg) {
  opacity: 0;
  transition: opacity 140ms linear;
}
@media (prefers-reduced-motion: reduce) {
  :is(body.live, body.is-live, body.on-profile) > * { animation: none !important; }
}

/* A hover-only affordance is invisible to a finger, and a tooltip covers the thing it
   labels. On a screen with no hover the grips are always faintly there and tips never are. */
@media (hover: none) {
  .note .grip { opacity: 0.45; }
}
`;
