import type { AnalysisStatus } from "../types.js";
import type { DegradationCount } from "./degradation-ledger.js";

export interface CompletionInput {
  discoveryTruncated: boolean;
  rulesPartial: boolean;
  skippedFiles: number;
  rulesCrashed: number;
  truncationReasons: Iterable<string>;
  scopeIgnored: number;
  scopeUnrecognized: number;
  parseFailed: number;
  parseFallbacks?: number;
  /**
   * Files that had an AST stage and lost it to the scan deadline, so they
   * were analyzed by regex alone. Distinct from `parseFallbacks`, which
   * counts a file whose parse was ATTEMPTED and then failed or degraded.
   */
  astFallbackFiles?: number;
  /**
   * Per-reason counts of capability lost inside a `catch` that returned a
   * clean default. Distinct from `truncationReasons` (the scan stopped) and
   * from `reasons` (a flat string set): this is the reason-coded ledger, so a
   * reader can tell "the AST mask was off for 3 files" from "3 files were
   * skipped". Any non-empty value forces `partial`.
   */
  degradations?: readonly DegradationCount[];
  /**
   * Rules that were WITHHELD from this run — the quarantine tier, removed
   * from the rule set unless `--strict` (scan-pipeline.ts). Counted, not
   * fed into `partial`: see `coverageState`.
   */
  rulesWithheld?: number;
  /**
   * Rules that actually ran. The denominator for `coverageState`: a scan
   * that ran 45 of 79 rules is a PARTIAL-coverage scan whether or not
   * anything went wrong inside those 45.
   */
  rulesApplied?: number;
  scopeDegraded?: string;
  runtimeIncomplete?: boolean;
  identityIncomplete?: boolean;
}

/**
 * How much of the RULE REGISTRY this scan could see.
 *
 * Orthogonal to `partial` by construction, and the whole point of the field.
 * `partial` answers "did this run lose something it was in the middle of
 * doing" — a truncated walk, a crash-isolated rule, a swallowed parser
 * error. `coverageState` answers a different question: "were rules removed
 * from the run before it started". A scan that reads every file it was
 * given, parses all of them, and finds nothing is `partial: false` — and
 * was still run with a third of the registry switched off. Folding that
 * into `partial` would be wrong in the direction that matters: `partial`
 * drives `scanExitCode`, SARIF `executionSuccessful`, and whether generated
 * CI blocks, so adding a withheld-rule input would turn every non-`--strict`
 * scan into a non-zero exit and teach everyone to pass `--strict`.
 */
export type CoverageState = "COMPLETE" | "PARTIAL";

export interface CompletionState {
  partial: boolean;
  coverageState: CoverageState;
  analysisStatus: {
    discovery: AnalysisStatus;
    rules: AnalysisStatus;
    skippedFiles: number;
    rulesCrashed: number;
    parseFallbacks: number;
    rulesApplied: number;
    rulesWithheld: number;
    truncationReasons?: string[];
    degradations?: DegradationCount[];
    reasons: string[];
  };
}

export function deriveCompletion(input: CompletionInput): CompletionState {
  const truncationReasons = [...new Set(input.truncationReasons)].sort();
  const degradations = [...(input.degradations ?? [])].sort((a, b) =>
    a.reason < b.reason ? -1 : a.reason > b.reason ? 1 : 0,
  );
  const reasons = new Set<string>();
  if (input.discoveryTruncated) reasons.add("discovery-truncated");
  if (input.rulesPartial) reasons.add("rules-partial");
  if (input.skippedFiles > 0)
    reasons.add(`skipped-files:${input.skippedFiles}`);
  if (input.rulesCrashed > 0)
    reasons.add(`rules-crashed:${input.rulesCrashed}`);
  if (input.scopeIgnored > 0)
    reasons.add(`scope-ignored:${input.scopeIgnored}`);
  if (input.scopeUnrecognized > 0) {
    reasons.add(`scope-unrecognized:${input.scopeUnrecognized}`);
  }
  if (input.parseFailed > 0) reasons.add(`parse-failed:${input.parseFailed}`);
  if (input.parseFallbacks && input.parseFallbacks > 0) {
    reasons.add(`parse-fallbacks:${input.parseFallbacks}`);
  }
  // The count of files analyzed WITHOUT the AST stage they could have had.
  // The named reason alone says "some capability was lost"; this says how
  // much, which is the difference between a reader trusting the score and a
  // reader knowing exactly how much of the surface it does not cover.
  if (input.astFallbackFiles && input.astFallbackFiles > 0) {
    reasons.add(`ast-budget-fallback-files:${input.astFallbackFiles}`);
  }
  if (input.scopeDegraded) reasons.add(`scope-degraded:${input.scopeDegraded}`);
  if (input.runtimeIncomplete) reasons.add("runtime-incomplete");
  if (input.identityIncomplete) reasons.add("identity-incomplete");
  for (const reason of truncationReasons) reasons.add(`truncated:${reason}`);
  // The flat `reasons` set is what a machine consumer reads, so the ledger
  // has to appear there too, not only in the structured field. One entry per
  // REASON with its count: a reader who never learns the schema still sees
  // that something was lost, and a reader who does can tell which.
  for (const entry of degradations) {
    reasons.add(`degraded:${entry.reason}:${entry.count}`);
  }

  const discoveryPartial =
    input.discoveryTruncated ||
    input.scopeIgnored > 0 ||
    input.scopeUnrecognized > 0 ||
    input.scopeDegraded !== undefined;
  const rulesPartial =
    input.rulesPartial || input.rulesCrashed > 0 || input.parseFailed > 0;
  const partial =
    discoveryPartial ||
    rulesPartial ||
    input.skippedFiles > 0 ||
    input.runtimeIncomplete === true ||
    input.identityIncomplete === true ||
    truncationReasons.length > 0 ||
    // A scan that lost capability inside a swallowed `catch` is not a
    // complete scan, whatever its finding count says. This is the whole
    // point of the ledger: without this clause the counts were computed and
    // then thrown away, which is strictly worse than not counting.
    degradations.length > 0;

  const rulesWithheld = input.rulesWithheld ?? 0;
  // Computed from the withheld count, never from anything that also feeds
  // `partial`. `analysisStatus.rules` deliberately does NOT become
  // "partial" here: that field is about rules that were attempted and
  // failed, and overloading it would make the two questions
  // indistinguishable in the one place a reader is most likely to look.
  const coverageState: CoverageState =
    rulesWithheld > 0 ? "PARTIAL" : "COMPLETE";

  return {
    partial,
    coverageState,
    analysisStatus: {
      discovery: discoveryPartial ? "partial" : "complete",
      rules: rulesPartial ? "partial" : "complete",
      skippedFiles: input.skippedFiles,
      rulesCrashed: input.rulesCrashed,
      parseFallbacks: input.parseFallbacks ?? 0,
      rulesApplied: input.rulesApplied ?? 0,
      rulesWithheld,
      ...(truncationReasons.length > 0 ? { truncationReasons } : {}),
      ...(degradations.length > 0 ? { degradations } : {}),
      reasons: [...reasons].sort(),
    },
  };
}
