/**
 * Finding lifecycle resolution (blueprint §14–§15, Contract E).
 *
 * Deterministic, side-effect-free, ORDERED — first match wins. The
 * invariant: **a finding disappearing from a subsequent scan MUST NOT
 * automatically be interpreted as "fixed."** Every disappearance is
 * classified with its cause; only VERIFIED-RESOLVED renders as "FIXED".
 *
 * States are DATA (`resolution: {status, cause?, comparedAgainst}`) —
 * rendered by consumers, never inferred from absence (§14).
 */

import type { ScanResult, Finding } from "../types.js";

/** Lifecycle states (§14) — additive metadata, no new verdict enums. */
export type ResolutionStatus =
  | "VERIFIED-RESOLVED"
  | "STILL-PRESENT"
  | "INCONCLUSIVE"
  | "SUPPRESSED"
  | "DISAPPEARED-NON-FIX";

/** Named causes for INCONCLUSIVE / DISAPPEARED-NON-FIX outcomes. */
export type ResolutionCause =
  | "partial"
  | "crash"
  | "skipped"
  | "excluded"
  | "revision-changed"
  | "legacy-baseline"
  | "retired"
  | "scope-changed";

/** The lifecycle record rendered by comparison surfaces. */
export interface Resolution {
  status: ResolutionStatus;
  cause?: ResolutionCause | undefined;
  /** What the comparison ran against (baseline commit/age context). */
  comparedAgainst?: string | undefined;
}

/** One baseline entry: the correlation identity + severity + revision. */
export interface BaselineEntry {
  ruleId: string;
  file: string;
  message: string;
  severity: string;
  /** detectorRevision at capture time (§17). Absent = revision-unknown. */
  detectorRevision?: number;
}

/** Correlation identity (v1-compatible): ruleId\0file\0message. */
export function fingerprint(entry: {
  ruleId: string;
  file: string;
  message: string;
}): string {
  return `${entry.ruleId}\u0000${entry.file}\u0000${entry.message}`;
}

export interface ResolveInput {
  entry: BaselineEntry;
  /** The full baseline file — to know the baseline's own revision stamp. */
  baseline: { commit?: string; findings: BaselineEntry[] };
  /** The current canonical scan result. */
  current: ScanResult;
  /** Registry-declared detector revisions for rules that ran. */
  registryRevisions: ReadonlyMap<string, number>;
  /** ruleIds that CRASHED during the current scan (crash isolation). */
  crashedRuleIds?: ReadonlySet<string> | undefined;
  /** Repo-relative files SKIPPED in the current scan (parser/budget). */
  skippedFiles?: ReadonlySet<string> | undefined;
  /** (ruleId, file) pairs under an ACTIVE suppression right now. */
  suppressed?: ReadonlySet<string> | undefined;
  /** Repo-relative files excluded from the current scan surface. */
  excludedFiles?: ReadonlySet<string> | undefined;
  /** RuleIds known to be retired/removed from the registry. */
  retiredRuleIds?: ReadonlySet<string> | undefined;
  /** Baseline context for the comparedAgainst field. */
  baselineCommit?: string | undefined;
}

/**
 * The §15 ordered algorithm. Pure; first match wins.
 */
export function resolve(input: ResolveInput): Resolution {
  const { entry, baseline, current } = input;
  const fp = fingerprint(entry);
  const comparedAgainst =
    input.baselineCommit ?? baseline.commit ?? "unknown baseline";
  // 1. Incomplete scan — nothing can be resolved from a partial view.
  // One condition suffices: a partial scan never carries a complete
  // rules phase (the pipeline sets rules="partial" whenever it sets
  // partial=true) — the rules check is a documented invariant, not a
  // live second branch. Conjoined for defensive clarity against a
  // future ScanResult that separates the two.
  if (current.partial || current.analysisStatus.rules !== "complete") {
    return { status: "INCONCLUSIVE", cause: "partial", comparedAgainst };
  }

  // 2. the finding's rule crashed during the current scan.
  if (input.crashedRuleIds?.has(entry.ruleId)) {
    return { status: "INCONCLUSIVE", cause: "crash", comparedAgainst };
  }

  // 3. the finding's file was skipped (parser failure/oversized/budget).
  if (input.skippedFiles?.has(entry.file)) {
    return { status: "INCONCLUSIVE", cause: "skipped", comparedAgainst };
  }

  // 4. an active suppression matches this (ruleId, file).
  if (input.suppressed?.has(`${entry.ruleId}\u0000${entry.file}`)) {
    return { status: "SUPPRESSED", comparedAgainst };
  }

  // 5. the file is excluded from the current surface.
  if (input.excludedFiles?.has(entry.file)) {
    return {
      status: "DISAPPEARED-NON-FIX",
      cause: "excluded",
      comparedAgainst,
    };
  }

  // 6. detector revision changed (or unknown on either side): the old
  //    measurement cannot speak for the new detector. Legacy entries
  //    (no revision) resolve no better than INCONCLUSIVE.
  const entryRev = entry.detectorRevision;
  if (entryRev === undefined) {
    return {
      status: "INCONCLUSIVE",
      cause: "legacy-baseline",
      comparedAgainst,
    };
  }
  const registryRev = input.registryRevisions.get(entry.ruleId);
  if (registryRev === undefined) {
    // The rule no longer declares a revision (or is retired): absent
    // registry entry for a known-old rule is a retirement, documented
    // lifecycle end — NOT a fix claim (§17.5).
    return {
      status: "DISAPPEARED-NON-FIX",
      cause: "retired",
      comparedAgainst,
    };
  }
  if (registryRev !== entryRev) {
    return {
      status: "INCONCLUSIVE",
      cause: "revision-changed",
      comparedAgainst,
    };
  }

  // 7. same revision, complete scan: presence decides.
  const stillThere = current.findings.some(
    (f: Finding) => fingerprint(f) === fp,
  );
  if (stillThere) {
    return { status: "STILL-PRESENT", comparedAgainst };
  }

  // 8. complete scan, same revision, rule ran, file in scope → resolved.
  return { status: "VERIFIED-RESOLVED", comparedAgainst };
}

/** The §15 rendering law: "FIXED" only for VERIFIED-RESOLVED. */
export function renderResolution(r: Resolution): string {
  switch (r.status) {
    case "VERIFIED-RESOLVED":
      return "FIXED SINCE BASELINE (verified by a complete same-revision scan)";
    case "STILL-PRESENT":
      return "STILL PRESENT";
    case "SUPPRESSED":
      return "SUPPRESSED (active ignore entry)";
    case "INCONCLUSIVE":
      return `INCONCLUSIVE (${r.cause})`;
    case "DISAPPEARED-NON-FIX":
      return `DISAPPEARED — NOT A FIX (${r.cause})`;
  }
}
