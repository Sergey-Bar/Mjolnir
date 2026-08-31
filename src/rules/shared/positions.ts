/**
 * Shared position helpers (Phase 6 — Tempering Plan).
 * One lineAt, one colAt, one matchBrace. The other 79 copies are dead.
 */

/** 1-based line number for a character offset in text. */
export function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text[i] === "\n") line++;
  return line;
}

/** 1-based column number for a character offset in text. */
export function colAt(text: string, index: number): number {
  // Bug-audit M0 #12: with index 0, `lastIndexOf("\n", -1)` searched from
  // the END of the string (negative fromIndex semantics), so a file
  // ending in a newline produced a hugely negative column for a match at
  // offset 0. No preceding newline exists before offset ≤ 0 — use -1.
  const lastBreak = index <= 0 ? -1 : text.lastIndexOf("\n", index - 1);
  return index - lastBreak;
}

/**
 * Find the matching closing brace for an opening brace at `start`.
 * Returns -1 if unmatched. Handles nested braces.
 */
export function matchBrace(
  text: string,
  start: number,
  open = "{",
  close = "}",
): number {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === open) depth++;
    else if (text[i] === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
