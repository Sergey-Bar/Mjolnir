import type { AnalysisStatus } from "../types.js";

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
  scopeDegraded?: string;
  runtimeIncomplete?: boolean;
  identityIncomplete?: boolean;
}

export interface CompletionState {
  partial: boolean;
  analysisStatus: {
    discovery: AnalysisStatus;
    rules: AnalysisStatus;
    skippedFiles: number;
    rulesCrashed: number;
    parseFallbacks: number;
    truncationReasons?: string[];
    reasons: string[];
  };
}

export function deriveCompletion(input: CompletionInput): CompletionState {
  const truncationReasons = [...new Set(input.truncationReasons)].sort();
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
    truncationReasons.length > 0;

  return {
    partial,
    analysisStatus: {
      discovery: discoveryPartial ? "partial" : "complete",
      rules: rulesPartial ? "partial" : "complete",
      skippedFiles: input.skippedFiles,
      rulesCrashed: input.rulesCrashed,
      parseFallbacks: input.parseFallbacks ?? 0,
      ...(truncationReasons.length > 0 ? { truncationReasons } : {}),
      reasons: [...reasons].sort(),
    },
  };
}
