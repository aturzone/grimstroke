/**
 * The portrait and the profile card.
 *
 * Part of the one stylesheet, assembled in draw/doc/style.ts. It is CSS in a template
 * literal, so it CANNOT CONTAIN A BACKTICK -- not even in a comment. That has closed the
 * string and broken the build four times.
 */

/** A drawn portrait, wherever it is shown: the same rules as board ink. */
export const PORTRAIT = `/* ---- the portrait ---- */
.portrait { display: block; width: 100%; height: auto; aspect-ratio: 3 / 4; }
.portrait .pt-stroke.line {
  fill: none;
  stroke: var(--stroke, #14110e);
  stroke-width: var(--stroke-weight, 3px);
  stroke-linecap: round;
  stroke-linejoin: round;
}
.portrait .pt-stroke.fill { fill: var(--stroke, #14110e); stroke: none; }
.portrait .tool-highlighter { opacity: 0.38; mix-blend-mode: multiply; }
.portrait .tool-pencil { opacity: 0.72; }
.portrait .pt-empty {
  fill: #14110e;
  opacity: 0.35;
  font-family: var(--hand-font);
  font-size: 26px;
  text-anchor: middle;
}
`;

/** The profile card. */
export const PROFILE = `/* ---- the profile card ----

   A card, on photo paper whatever the page is printed on, sized entirely against its own
   width: one container unit is a hundredth of the card, so a card is the same card at 180px
   on a board and at 420px on its own page. */
.profile {
  position: relative;
  width: 100%;
  max-width: 340px;
  container-type: inline-size;
  transform: rotate(var(--pf-tilt, 0deg));
}
.board .item > .profile, .cover .profile, .leaf-item > .profile { max-width: none; }
.profile-card {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  padding-block-end: 6cqw;
  background: var(--mat-paper);
  color: var(--mat-ink);
  border: max(1.5px, 0.7cqw) solid var(--mat-ink);
  box-shadow: 2cqw 2.4cqw 0 rgba(0, 0, 0, 0.32);
}
/* Tooth, as on every other sheet: translucent, so no blend mode. */
.profile-card::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background-image: var(--grain, none);
  opacity: 0.35;
  pointer-events: none;
}
/* Two strips of tape across the top corners: it was stuck here, by somebody. */
.profile::before, .profile::after {
  content: '';
  position: absolute;
  z-index: 2;
  inset-block-start: -2.6cqw;
  width: 22cqw;
  height: 6.5cqw;
  background: color-mix(in oklab, #f4efe0 88%, var(--pf-accent));
  opacity: 0.78;
  border-inline: 1px solid rgba(0, 0, 0, 0.14);
}
.profile::before { inset-inline-start: -5cqw; transform: rotate(-24deg); }
.profile::after { inset-inline-end: -5cqw; transform: rotate(22deg); }

.profile-band {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2.6cqw 5cqw 2.4cqw;
  background: var(--pf-accent);
  color: var(--pf-on-accent);
  border-block-end: max(1.5px, 0.7cqw) solid var(--mat-ink);
  font-family: var(--mono-font);
  font-size: 3.7cqw;
  font-weight: 700;
  letter-spacing: 0.16em;
  line-height: 1;
  text-transform: uppercase;
}
.profile-no { letter-spacing: 0.08em; font-variant-numeric: tabular-nums; }
/* The photo: the drawn portrait, 3:4, mounted with a keyline and a hard shadow like every
   picture in this product. */
.profile-photo {
  width: 58cqw;
  margin: 5cqw auto 3cqw;
  border: max(1.5px, 0.6cqw) solid var(--mat-ink);
  box-shadow: 1.4cqw 1.6cqw 0 rgba(0, 0, 0, 0.28);
  transform: rotate(-1deg);
}
.profile-name {
  padding-inline: 6cqw;
  font-family: var(--marker-font);
  font-size: 13cqw;
  font-weight: 400;
  line-height: 0.95;
  text-align: center;
  overflow-wrap: anywhere;
}
.profile-role {
  margin: 2cqw 6cqw 0;
  text-align: center;
  font-family: var(--hand-font);
  font-size: 7.4cqw;
  font-weight: 700;
  line-height: 1.15;
}
/* A swipe of the accent under the role -- the highlighter across the one line that says what
   they are for. A plain var() in the stop: a color-mix() there renders nothing in Firefox. */
.profile-role::after {
  content: '';
  display: block;
  width: 46%;
  height: 1.8cqw;
  margin: 0.8cqw auto 0;
  background: var(--pf-accent);
  transform: rotate(-1.5deg);
  opacity: 0.85;
}
.profile-details {
  margin: 5cqw 7cqw 0;
  padding-block-start: 3cqw;
  border-block-start: max(1px, 0.4cqw) dashed color-mix(in oklab, var(--mat-ink) 35%, transparent);
  font-family: var(--mono-font);
  font-size: 3.7cqw;
  line-height: 1.35;
}
.profile-row { display: grid; grid-template-columns: 36% 1fr; gap: 2cqw; padding-block: 0.9cqw; }
.profile-row dt { font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.6; }
.profile-row dd { margin: 0; font-weight: 700; overflow-wrap: anywhere; }
.profile-bio {
  margin: 3.5cqw 7cqw 0;
  font-family: var(--hand-font);
  font-size: 5.6cqw;
  line-height: 1.2;
}
.profile-stamp {
  position: absolute;
  z-index: 1;
  inset-block-start: 62cqw;
  inset-inline-end: 3cqw;
  width: 29cqw;
  height: 29cqw;
  transform: rotate(var(--pf-stamp, -12deg));
  opacity: 0.8;
  mix-blend-mode: multiply;
  pointer-events: none;
}
.profile-stamp-ring { fill: none; stroke: var(--pf-accent); stroke-width: 2.4; }
.profile-stamp-tick {
  fill: none;
  stroke: var(--pf-accent);
  stroke-width: 5;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.profile-stamp text {
  fill: var(--pf-accent);
  font-family: var(--mono-font);
  font-size: 9.4px;
  font-weight: 700;
  letter-spacing: 0.06em;
}
:root[data-uppercase='off'] .profile-band, :root[data-uppercase='off'] .profile-row dt {
  text-transform: none;
  letter-spacing: 0;
}
`;
