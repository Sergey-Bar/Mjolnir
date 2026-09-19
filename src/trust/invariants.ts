export interface TrustInvariant {
  readonly id: string;
  readonly description: string;
  readonly scope:
    | "Scan"
    | "Trust"
    | "Exit"
    | "Evidence"
    | "Identity"
    | "Scoring"
    | "Plugins"
    | "PR Comments";
  readonly status: "CURRENT" | "REQUIRED";
  readonly quarter?: "Q1" | "Q2" | "Q3" | "Q4";
  readonly verificationTest: string;
  readonly verificationCase?: string;
  readonly verificationGap?: string;
}

export const TRUST_INVARIANTS: readonly TrustInvariant[] = [
  {
    id: "TI-001",
    description: "Same semantic input → same verdict (determinism soak)",
    scope: "Scan",
    status: "CURRENT",
    verificationTest: "tests/engine/determinism-soak.spec.ts",
    verificationCase:
      "repeated real scans with identical identity produce identical trust results",
  },
  {
    id: "TI-002",
    description: "File ordering cannot change verdict (adversarial ordering)",
    scope: "Scan",
    status: "REQUIRED",
    verificationTest: "tests/engine/determinism-soak.spec.ts",
    verificationGap:
      "Existing ordering tests compare identity only, not scan verdicts.",
  },
  {
    id: "TI-003",
    description:
      "Rule registration ordering cannot change verdict (canonical sort)",
    scope: "Scan",
    status: "REQUIRED",
    verificationTest: "tests/engine/determinism-soak.spec.ts",
    verificationGap:
      "No executable scan comparison with permuted rule registration.",
  },
  {
    id: "TI-004",
    description: "Cache/no-cache semantically equivalent",
    scope: "Scan",
    status: "CURRENT",
    verificationTest: "tests/engine/scan-cache.spec.ts",
    verificationCase:
      "two --cache runs produce identical findings, score, and counters",
  },
  {
    id: "TI-005",
    description: "Incremental/full scan semantically equivalent",
    scope: "Scan",
    status: "REQUIRED",
    verificationTest: "tests/contract/incremental-equivalence.spec.ts",
    verificationGap:
      "Source cache reuse is tested, but changed-file safety and dependency-aware merging are not integrated into scanning.",
  },
  {
    id: "TI-006",
    description:
      "Unrelated file addition cannot change unrelated findings (golden snapshot)",
    scope: "Scan",
    status: "REQUIRED",
    verificationTest: "tests/engine/determinism-soak.spec.ts",
    verificationGap:
      "No before/after scan verifier for unrelated file additions.",
  },
  {
    id: "TI-007",
    description: "Partial analysis cannot produce complete trust",
    scope: "Trust",
    status: "CURRENT",
    verificationTest: "tests/engine/trust-summary.spec.ts",
    verificationCase:
      "CEILING LAW: a partial scan can never exceed its ceiling, even with L5 findings",
  },
  {
    id: "TI-008",
    description: "ANALYSIS_ERROR cannot become PASS",
    scope: "Exit",
    status: "REQUIRED",
    verificationTest: "tests/e2e/journey-9-exit-codes.spec.ts",
    verificationGap:
      "Usage/config exit smoke tests do not verify scan analysis failures cannot become PASS.",
  },
  {
    id: "TI-009",
    description: "Heuristic voting cannot manufacture deterministic proof",
    scope: "Evidence",
    status: "CURRENT",
    verificationTest: "tests/contract/evidence-voting.spec.ts",
    verificationCase: "three E1 findings converge as SUPPORTING, never STRONG",
  },
  {
    id: "TI-010",
    description: "Duplicate detection cannot multiply trust deductions",
    scope: "Scoring",
    status: "CURRENT",
    verificationTest: "tests/engine/analysis/overlap-dedup.spec.ts",
    verificationCase: "drops the declared finding; the declaring rule survives",
  },
  {
    id: "TI-011",
    description: "Evidence artifacts hashed into run identity",
    scope: "Identity",
    status: "REQUIRED",
    verificationTest: "tests/engine/run-identity-determinism.spec.ts",
    verificationGap:
      "No scan-level verifier mutates an ingested artifact and checks identity invalidation.",
  },
  {
    id: "TI-012",
    description: "Historical inputs hashed into run identity when used",
    scope: "Identity",
    status: "REQUIRED",
    verificationTest: "tests/engine/run-identity-determinism.spec.ts",
    verificationGap:
      "Identity helper accepts historical fingerprints; scan wiring is not verified.",
  },
  {
    id: "TI-013",
    description: "Plugin findings cannot inherit core trust tier",
    scope: "Plugins",
    status: "CURRENT",
    verificationTest: "tests/plugins/local-rules.spec.ts",
    verificationCase:
      "declared tier core is CLAMPED to extended with a warning (§18 measurement requirement)",
  },
  {
    id: "TI-014",
    description:
      "Score improvement requires real verification improvement (anti-gaming)",
    scope: "Scoring",
    status: "REQUIRED",
    verificationTest: "tests/anti-gaming/corpus.spec.ts",
    verificationGap:
      "Corpus tests validate scenario metadata, not before/after scan behavior.",
  },
  {
    id: "TI-015",
    description:
      "Two scans with identical semantic run identity produce identical trust results",
    scope: "Identity",
    status: "CURRENT",
    verificationTest: "tests/engine/determinism-soak.spec.ts",
    verificationCase:
      "repeated real scans with identical identity produce identical trust results",
  },
  {
    id: "TI-016",
    description: "Runtime proximity does not automatically upgrade trust level",
    scope: "Evidence",
    status: "CURRENT",
    verificationTest: "tests/engine/trust-proximity.spec.ts",
    verificationCase: "E0 with defect-level corroboration → L4, never L5",
  },
  {
    id: "TI-017",
    description: "Suppression changes are represented in run identity",
    scope: "Identity",
    status: "REQUIRED",
    verificationTest: "tests/engine/run-identity-determinism.spec.ts",
    verificationGap:
      "Fingerprint helper is tested, but scan construction does not supply suppressionFingerprint.",
  },
  {
    id: "TI-018",
    description: "Same PrCommentModelV1 → byte-identical rendered Markdown",
    scope: "PR Comments",
    status: "CURRENT",
    verificationTest: "tests/reporters/pr-comment-determinism.spec.ts",
    verificationCase: "soak: 50 renders produce identical output",
  },
  {
    id: "TI-019",
    description: "Presentation output cannot affect verification trust",
    scope: "PR Comments",
    status: "CURRENT",
    verificationTest: "tests/contract/presentation-trust.spec.ts",
    verificationCase: "changing message does not affect trust level",
  },
  {
    id: "TI-020",
    description:
      "Stale scan artifacts cannot overwrite presentation for a newer PR head",
    scope: "PR Comments",
    status: "CURRENT",
    verificationTest: "tests/integrations/github/stale-guard-ti020.spec.ts",
    verificationCase: "does not overwrite for mismatched SHA",
  },
] as const;

export function getInvariantById(id: string): TrustInvariant | undefined {
  return TRUST_INVARIANTS.find((inv) => inv.id === id);
}

export function getRequiredForQuarter(
  quarter: "Q1" | "Q2" | "Q3" | "Q4",
): readonly TrustInvariant[] {
  return TRUST_INVARIANTS.filter(
    (inv) => inv.status === "REQUIRED" && inv.quarter === quarter,
  );
}

export function getInvariantsByScope(
  scope: TrustInvariant["scope"],
): readonly TrustInvariant[] {
  return TRUST_INVARIANTS.filter((inv) => inv.scope === scope);
}
