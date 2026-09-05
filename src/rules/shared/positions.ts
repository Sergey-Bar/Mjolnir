/**
 * Shared position helpers (Phase 6 — Tempering Plan).
 * One lineAt, one colAt, one matchBrace. The other 79 copies are dead.
 *
 * Audit M5 (line-index): lineAt used to be a linear scan from offset 0
 * per call — O(fileSize) per finding, O(findings × fileSize) per scan.
 * A per-text newline-offset index + binary search makes it
 * O(log lines). The index is memoized for the most recently used texts
 * (rules process files sequentially, so a tiny bounded cache captures
 * essentially every repeat call).
 */

const LINE_INDEX_CACHE_MAX = 8;

const lineIndexCache = new Map<string, number[]>();

/** Newline-offset index: offsets[i] = offset of the START of line i+1. */
function buildLineIndex(text: string): number[] {
  const offsets = [0];
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) offsets.push(i + 1);
  }
  return offsets;
}

function lineIndexFor(text: string): number[] {
  const cached = lineIndexCache.get(text);
  if (cached) return cached;
  const index = buildLineIndex(text);
  if (lineIndexCache.size >= LINE_INDEX_CACHE_MAX) {
    // Map preserves insertion order — evict the oldest entry.
    const oldest = lineIndexCache.keys().next().value;
    if (oldest !== undefined) lineIndexCache.delete(oldest);
  }
  lineIndexCache.set(text, index);
  return index;
}

/** 1-based line number for a character offset in text. */
export function lineAt(text: string, index: number): number {
  if (index <= 0) return 1;
  const offsets = lineIndexFor(text);
  // Binary search: greatest line-start offset ≤ index.
  let lo = 0;
  let hi = offsets.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((offsets[mid] as number) <= index) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
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
