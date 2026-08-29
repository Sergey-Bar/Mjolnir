/**
 * Mjolnir — canonical types (JSON contract v1, schemaVersion 1).
 *
 * STABILITY: This file is public API. Per Product-MVP.txt §24.2:
 * additive changes only within schemaVersion 1; removing or renaming
 * fields requires a schemaVersion bump.
 */

export const SCHEMA_VERSION = 1 as const;

/** Severity ladder. Order matters for sorting and gating. */
export const SEVERITY_ORDER = ["error", "warning", "info"] as const;
export type Severity = (typeof SEVERITY_ORDER)[number];

/**
 * Confidence that the finding is real. `low` findings render dimmer and
 * NEVER gate CI regardless of severity (Product-MVP.txt GAP-E).
 */
export type Confidence = "high" | "medium" | "low";

/** Epistemic type of the finding (§7). v1 ships deterministic-defect only. */
export type FindingType =
  "deterministic-defect" | "heuristic-risk" | "observation";

/**
 * Evidence levels (Product.txt §9, Honesty Core subset E0–E2):
 *   E0 — observation only: no proof, informational by definition.
 *   E1 — weak/partial evidence: heuristic pattern, may be context-dependent.
 *   E2 — strong static evidence: deterministic defect at its boundary.
 * The product must never turn missing evidence into confidence: an E0
 * finding can never deduct points or gate CI, regardless of severity.
 */
export const EVIDENCE_ORDER = ["E0", "E1", "E2"] as const;
export type EvidenceLevel = (typeof EVIDENCE_ORDER)[number];

/**
 * QA-native impact framing (#21 Legendary Tier 5): what this finding means
 * for the QA engineer's actual job, in their vocabulary.
 */
export type QaImpact =
  | "BLOCKS-RELEASE" // can hide broken behavior from a release decision
  | "FLAKY-RISK" // will cause intermittent failures / wasted triage
  | "FALSE-GREEN" // makes CI checkmarks untrustworthy
  | "HYGIENE"; // maintenance drag, no immediate release risk

/** Default QA impact per rule category+severity heuristic. */
export const QA_IMPACT_LABELS: Record<QaImpact, string> = {
  "BLOCKS-RELEASE": "Blocks release confidence",
  "FLAKY-RISK": "Flaky-test risk",
  "FALSE-GREEN": "False-green risk",
  HYGIENE: "Test hygiene debt",
};

/** Rule namespaces are frozen public API (§18.4). IDs are never reused. */
export type RuleCategory = "QA-TEST" | "QA-TQUAL" | "QA-PW" | "QA-CI";

export interface Finding {
  ruleId: string;
  category: RuleCategory;
  severity: Severity;
  confidence: Confidence;
  findingType: FindingType;
  /** QA-native impact framing (Tier 5 #21). */
  qaImpact: QaImpact;
  /**
   * How strong the evidence behind this finding is (Honesty Core).
   * Derived from findingType+confidence unless the rule overrides it.
   * Optional in the JSON contract (additive within schemaVersion 1).
   */
  evidenceLevel?: EvidenceLevel;
  /**
   * Measured false-positive rate (0..1) for the rule that produced this
   * finding, from hand-classified corpus verdicts — present only when the
   * rule has ≥ 10 classified verdicts. Absent means the rule ships on
   * assumption. Additive within schemaVersion 1.
   */
  measuredFpRate?: number;
  /** Classified (TP+FP) verdicts behind `measuredFpRate`. */
  measuredFpN?: number;
  /** Repo-relative path with forward slashes, regardless of OS. */
  file: string;
  /** 1-based. */
  line: number;
  /** 1-based. */
  column: number;
  message: string;
  /** Why it matters — one sentence. */
  why: string;
  /** How to fix — concrete action. */
  fix: string;
  docsUrl?: string;
}

/**
 * Honest default evidence level for a finding (Honesty Core Phase 1).
 * Derivation is deterministic and conservative:
 *   observation → E0 (never proof)
 *   heuristic-risk → E1 (pattern, not boundary proof)
 *   deterministic-defect → E2, downgraded to E1 when confidence is low
 *     (a deterministic detector we're unsure fired correctly is weak
 *     evidence, not strong).
 */
export function deriveEvidenceLevel(
  findingType: FindingType,
  confidence: Confidence,
): EvidenceLevel {
  if (findingType === "observation") return "E0";
  if (findingType === "heuristic-risk") return "E1";
  return confidence === "low" ? "E1" : "E2";
}

/**
 * Advisory finding (Honesty Core Phase 2): evidence too weak to cost
 * points or gate CI. Advisory findings are REPORTED, never hidden —
 * honesty means showing what we saw and what it's worth, nothing more.
 */
export function isAdvisoryFinding(
  f: Pick<Finding, "evidenceLevel" | "confidence" | "findingType">,
): boolean {
  const level =
    f.evidenceLevel ?? deriveEvidenceLevel(f.findingType, f.confidence);
  return level === "E0";
}

/** Canonical sort: file → line → column → ruleId (Sprint-Plan S3). */
export function compareFindings(a: Finding, b: Finding): number {
  if (a.file !== b.file) return a.file < b.file ? -1 : 1;
  if (a.line !== b.line) return a.line - b.line;
  if (a.column !== b.column) return a.column - b.column;
  if (a.ruleId < b.ruleId) return -1;
  if (a.ruleId > b.ruleId) return 1;
  return 0;
}

/** Public deduction constants (§8). Changes require changelog + version bump. */
export const DEDUCTIONS: Record<Severity, number> = {
  error: 8,
  warning: 3,
  info: 1,
};

export interface DimensionScore {
  category: RuleCategory;
  score: number;
  errors: number;
  warnings: number;
  infos: number;
}

export type AnalysisStatus = "complete" | "partial";

export interface ScanResult {
  schemaVersion: typeof SCHEMA_VERSION;
  /** False when budget expired or files were skipped (§18.3). */
  partial: boolean;
  /** null when no tests found — never fake 100 (R2 empty-state rule). */
  score: number | null;
  reason?: "no-tests-found";
  /** Present when --scope changed was requested. */
  scope?: "all" | "changed";
  scopeDegraded?: string;
  /** Detected test frameworks (0.2). Empty + unknown=true when undetectable. */
  frameworks: string[];
  frameworkDetectionUnknown: boolean;
  dimensions: DimensionScore[];
  findings: Finding[];
  /** Number of test files scanned (Phase 5 — reporting only). */
  testFileCount?: number;
  /** Test declarations found — the normalization denominator (Phase 5). */
  testDeclarationCount?: number;
  /** Raw deduction total before normalization (Phase 5 — transparency). */
  rawDeductions?: number;
  /** Number of findings suppressed by active config entries (suppression transparency). */
  suppressionCount?: number;
  analysisStatus: {
    discovery: AnalysisStatus;
    rules: AnalysisStatus;
    skippedFiles: number;
    durationMs: number;
  };
}
