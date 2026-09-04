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

/**
 * Trust levels (Verification Trust Evolution Plan §16): the OVERALL
 * trust a consumer can place in one finding, combining the static
 * evidence ladder (E0–E2) with RUNTIME corroboration from a real run
 * report. Exposed honestly, never overclaimed:
 *   L0 — observation only (E0, no runtime evidence).
 *   L1 — heuristic static evidence (E1), no runtime evidence.
 *   L2 — deterministic static evidence (E2), no runtime evidence.
 *   L3 — RUNTIME: the file containing this finding appeared in a real
 *        run report (tests in that file executed).
 *   L4 — RUNTIME: the specific test containing this finding was
 *        identified in the report and executed (its outcome is known).
 *   L5 — RUNTIME: the run verdict directly corroborates the DEFECT
 *        class (e.g. a flake-risk finding whose test actually flaked,
 *        retried, or timed out in the report).
 * INVARIANT (structurally enforced): L3–L5 require runtime
 * corroboration — a static-only finding can never claim L4/L5.
 */
export const TRUST_ORDER = ["L0", "L1", "L2", "L3", "L4", "L5"] as const;
export type TrustLevel = (typeof TRUST_ORDER)[number];

/**
 * Runtime corroboration for one finding (plan §16): what a real run
 * report says about the code this finding points at. Additive within
 * schemaVersion 1; absent means "no runtime evidence" — never
 * fabricated.
 */
export interface RuntimeCorroboration {
  /** Granularity of what the runtime report could vouch for. */
  level: "file" | "test" | "defect";
  /** Report format the evidence came from. */
  source: "playwright-json" | "junit-xml";
  /** Number of tests executed in the finding's file (any level). */
  testsExecuted: number;
  /**
   * The containing test's verdict, when the finding line falls inside a
   * test the report identifies (level "test"/"defect").
   */
  matchedTest?: {
    title: string;
    finalStatus: string;
    attempts: number;
    passedOnRetry: boolean;
    everFailed: boolean;
    skipped: boolean;
  };
}

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
  /**
   * Runtime corroboration from a real run report (plan §16), stamped
   * when a report was available and matched this finding's file/test.
   * Absent means "no runtime evidence" — the static evidence ladder
   * (E0–E2) is all the consumer has. Additive within schemaVersion 1.
   */
  runtimeCorroboration?: RuntimeCorroboration;
  /**
   * Overall trust level (plan §16, see TRUST_ORDER). Derived
   * deterministically from evidenceLevel + runtimeCorroboration;
   * stamped with the corroboration pass. Additive within schemaVersion 1.
   */
  trustLevel?: TrustLevel;
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
  /**
   * Third-party plugin code that executed during this scan (audit S-8).
   * Plugins run with full Node privileges by documented design — anyone
   * reading a report must be able to tell whether they ran. Absent
   * when no plugins are configured.
   */
  plugins?: Array<{ name: string; rules: number }>;
  /**
   * Agentic Trust Profile (plan §17): per-scan provenance metadata —
   * share of test files carrying detected generative markers and the
   * findings split across those surfaces. PROVENANCE IS NOT TRUST: the
   * profile never changes scoring, evidence levels, or tier behavior
   * (§17.4 — the same evidence standard applies regardless of author).
   * Additive within schemaVersion 1; present on every completed scan.
   */
  agenticProfile?: {
    testFiles: number;
    generatedMarkedFiles: number;
    codegenLikeFiles: number;
    /** generatedMarkedFiles / testFiles (0..1). */
    shareMarkedGenerated: number;
    findingsInGeneratedFiles: number;
    findingsInUnmarkedFiles: number;
    note: string;
  };
  analysisStatus: {
    discovery: AnalysisStatus;
    rules: AnalysisStatus;
    skippedFiles: number;
    durationMs: number;
    /**
     * Named reasons the scan stopped early (audit H-8): "deadline",
     * "file-cap:<adapter>", "rule-loop-deadline". Present only when
     * truncation actually happened — absence means the scan is whole.
     */
    truncationReasons?: string[];
    /**
     * Rule executions that threw and were swallowed by crash isolation
     * (audit R-9). 0 means no rule silently failed; absence means the
     * producer predates the counter.
     */
    rulesCrashed?: number;
  };
  /**
   * Local incremental cache report (Beta-to-Stable plan, M5.2). Present
   * only when the scan ran with `--cache`; additive within
   * schemaVersion 1. The cache is content-addressed and local-only
   * (plan A-2) — it never leaves the machine and never touches the
   * network.
   */
  cache?: {
    /** Files whose rule verdicts were reused from the cache. */
    hits: number;
    /** Files analyzed fresh this run (cache misses). */
    misses: number;
    /** Absolute path of the cache file — auditable, gitignored. */
    file: string;
  };
}
