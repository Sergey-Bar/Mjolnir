/**
 * One ledger for every silent capability loss.
 *
 * The defect class this exists to kill is not a deprecation warning. It is a
 * `catch` in a DETECTION path that swallows an error and returns a clean
 * default, so the scan still reports `analysisComplete` while quietly running
 * with less capability than the reader was promised. Fifteen such sites were
 * verified in this tree; the AST-layer ones are the worst, because the layer
 * they degrade is the one that keeps prose comments and sample strings from
 * becoming false-positive findings.
 *
 * Two shapes, one rule. The precedent already in the tree is
 * `parserRetryDegradationCount` (`src/engine/tree-sitter-ast.ts`): a counted,
 * readable number rather than a swallowed exception. This generalizes it —
 * every site records a REASON from the closed set below, and the scan result
 * carries the per-reason counts, so "the parser failed" becomes
 * "the AST mask was unavailable for 3 files".
 *
 * The ledger is APPEND-ONLY and process-scoped, which has one consequence
 * worth stating because it is the security-relevant direction: `beginWindow`
 * returns a MARKER, not an ownership claim. Two concurrent `runScan` calls in
 * one process (there is a test that does exactly this,
 * `tests/stress/concurrent-same-process.spec.ts`) each read the records
 * appended after their own marker, so a degradation one scan records may be
 * counted by the other. That can only ever OVER-count — a scan reporting a
 * degradation that happened to a sibling is more cautious than the truth, and
 * never less — so the failure direction is the honest one. The alternative,
 * a sink threaded through every rule context, is a diff across every call site
 * in the tree to fix a problem that cannot make a scan look better than it is.
 */

/**
 * Every reason a detection path may lose capability.
 *
 * Closed on purpose: a `catch` site that wants a new reason has to add it
 * here, which is the moment a reviewer sees the claim. `tests/contract/
 * no-uncounted-degradation.spec.ts` reads this list and fails on any `catch`
 * in a detection path that neither rethrows, records one of these, nor
 * appears in its allowlist with a stated reason.
 */
export const DEGRADATION_REASONS = [
  /** `parseTsFile` threw: the file drops to its regex path entirely. */
  "ast-parse-failed",
  /**
   * `getCodeOnlyText` threw and returned RAW text. Distinct from
   * `ast-parse-failed` because the failure is later and worse in kind: the
   * comment/string false-positive firewall is now OFF for that file, so a
   * prose comment or a sample string reads as code.
   */
  "ast-mask-unavailable",
  /**
   * `commentAndStringRanges` threw and returned no ranges. Every mask-oracle
   * rule that asks for them then treats the whole file as code.
   */
  "ast-range-scan-failed",
  /** `.github/workflows` could not be listed: the CI surface was never walked. */
  "ci-workflow-listing-unreadable",
  /**
   * The root `package.json` could not be read. `workspaceGlobs` come out
   * empty, so a monorepo scan silently narrows to the root package — a
   * smaller scan that looks complete.
   */
  "workspace-manifest-unreadable",
  /** Sibling build files could not be listed: monorepo module poms go out of scope. */
  "java-build-listing-unreadable",
  /**
   * A directory under the rule tree could not be listed while building the
   * detector fingerprint, so the whole subtree is omitted from the digest.
   * Two rule trees differing only inside it then hash identically, which is a
   * stale-cache hit wearing a fresh one's clothes.
   */
  "rules-tree-listing-unreadable",
  /** A trend history line was not valid JSON. */
  "trend-record-unparseable",
  /** An `explain` fixture could not be read. */
  "explain-fixture-unreadable",
  /** An `explain` workflow fixture could not be parsed. */
  "explain-workflow-parse-failed",
  /**
   * An `explain` rule THREW on its own fixture. Recorded as a degradation
   * because a rule that crashes is not a rule that stayed silent.
   */
  "explain-rule-crash",
] as const;

export type DegradationReason = (typeof DEGRADATION_REASONS)[number];

export interface DegradationRecord {
  readonly reason: DegradationReason;
}

export interface DegradationCount {
  readonly reason: DegradationReason;
  readonly count: number;
}

/**
 * Append-only. Records are never edited and never removed by a recording
 * site; a reader takes a window, and the window is defined by index, so
 * "delete my entry" is not an operation this module offers.
 */
const records: DegradationRecord[] = [];

/** Record one capability loss. `count` is for a site that fails N at once. */
export function recordDegradation(reason: DegradationReason, count = 1): void {
  if (!Number.isInteger(count) || count < 1) return;
  for (let index = 0; index < count; index++) {
    records.push({ reason });
  }
}

/**
 * Mark where this reader's window opens. Everything appended from here on is
 * what the reader will see; see the file header for what a concurrent scan
 * does to that boundary.
 */
export function beginDegradationWindow(): number {
  return records.length;
}

/** The records appended since `marker`, without consuming them. */
export function degradationsSince(marker: number): DegradationRecord[] {
  return records.slice(marker);
}

/**
 * Per-reason counts for a window, sorted by reason so the output is
 * byte-deterministic for the same set of degradations.
 */
export function summarizeDegradations(
  window: readonly DegradationRecord[],
): DegradationCount[] {
  const counts = new Map<DegradationReason, number>();
  for (const record of window) {
    counts.set(record.reason, (counts.get(record.reason) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => (a.reason < b.reason ? -1 : a.reason > b.reason ? 1 : 0));
}

/**
 * Test seam. Production code reads a window, never the whole ledger, so
 * nothing that ships has a reason to call this.
 */
export function resetDegradations(): void {
  records.length = 0;
}
