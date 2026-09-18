/**
 * ASCII art assets for the QA Doctor terminal experience.
 * Minimal diagnostic engineering aesthetic.
 * All art must render identically with and without colors (NO_COLOR safety).
 *
 * There is no score graphic here any more. Eight rows of block glyphs drew one
 * above the score in four states (cracked, strained, charged, excellent).
 * It was the one illustration left in a system whose rule is "no
 * illustration" (docs/design/BRAND-SYSTEM.md), it said the same thing as
 * the verdict word printed two lines below it, and it pushed the score
 * eleven rows down the screen. The state it carried without colour is
 * carried by that verdict word, and EXCELLENT keeps its own block below.
 */

/** The report's wordmark: the name, spaced, and what it is. */
export const LOGO = `
  Q A  D O C T O R  ·  VERIFICATION TRUST ENGINE
`;

/** Plain-ASCII fallback for cmd.exe/legacy consoles. */
export const LOGO_ASCII = `
  Q A  D O C T O R  -  VERIFICATION TRUST ENGINE
`;

/** Small divider. */
export const DIVIDER = "─".repeat(58);

/** Wordmark for the zero-findings state. */
export const EXCELLENT_WORDMARK = "✓ E X C E L L E N T";
