/**
 * ASCII art assets for the Mjölnir terminal experience.
 * Minimal Nordic / engineering aesthetic — professional, not fantasy.
 * All art must render identically with and without colors (NO_COLOR safety).
 *
 * The hammer illustration was removed in the Nordic brand pass. The state
 * it carried is now conveyed by the verdict word and the score gauge.
 * renderHammer is retained as a minimal stub for backward compatibility
 * until all callers are migrated.
 */

import type { Palette } from "./theme.js";
import type { ScoreState } from "./score-state.js";

/** The report's wordmark: the name, spaced, and what it is. */
export const LOGO = `
  M J Ö L N I R  ·  VERIFICATION TRUST ENGINE
`;

/** Plain-ASCII fallback for cmd.exe/legacy consoles. */
export const LOGO_ASCII = `
  M J O L N I R  -  VERIFICATION TRUST ENGINE
`;

export const TROPHY = String.raw`
        ___________
       '._==_==_=_.'
       .-\:      /-.
      | (|:.     |) |
       '-|:.     |-'
         \::.    /
          '::. .'
            ) (
          _.' '._
         '-------'
`;

/** Small divider. */
export const DIVIDER = "─".repeat(58);

/** Wordmark for the 100-state celebration block. */
export const FORGED_WORDMARK = "⚡ F O R G E D ⚡";

/**
 * Minimal stub — the hammer illustration was removed. Returns the
 * state caption as a single line so callers that still reference this
 * function get a meaningful, compact output. Will be removed entirely
 * once terminal.ts is migrated.
 */
export function renderHammer(
  state: ScoreState,
  _p: Palette,
  _ascii: boolean,
): string[] {
  const captions: Record<string, string> = {
    critical: "[CRACKED]",
    warning: "[STRAINED]",
    trusted: "[CHARGED]",
    forged: "[FORGED]",
    unmeasured: "[UNMEASURED]",
  };
  return [captions[state.band] ?? ""];
}
