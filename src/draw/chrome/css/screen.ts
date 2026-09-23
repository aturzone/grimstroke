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
export const SCREEN = `/* A hover-only affordance is invisible to a finger, and a tooltip covers the thing it
   labels. On a screen with no hover the grips are always faintly there and tips never are. */
@media (hover: none) {
  .note .grip { opacity: 0.45; }
}
`;
