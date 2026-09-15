/**
 * Trust invariants registry (plan §5, INVARIANT-001).
 *
 * Canonical list of 20 trust invariants (TI-001 through TI-020) that
 * the verification engine must uphold. Each invariant is a structural
 * promise: the `verificationTest` field names the spec that locks it.
 *
 * Pure data module — no runtime logic beyond registry lookups.
 */

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
}

export const TRUST_INVARIANTS: readonly TrustInvariant[] = [
  {
    id: "TI-001",
    description: "Same semantic input → same verdict (determinism soak)",
    scope: "Scan",
    status: "CURRENT",
    verificationTest: "determinism-soak.spec.ts",
  },
  {
    id: "TI-002",
    description: "File ordering cannot change verdict (adversarial ordering)",
    scope: "Scan",
    status: "CURRENT",
    verificationTest: "adversarial test",
  },
  {
    id: "TI-003",
    description:
      "Rule registration ordering cannot change verdict (canonical sort)",
    scope: "Scan",
    status: "CURRENT",
    verificationTest: "canonical sort test",
  },
  {
    id: "TI-004",
    description: "Cache/no-cache semantically equivalent",
    scope: "Scan",
    status: "CURRENT",
    verificationTest: "scan-cache.spec.ts",
  },
  {
    id: "TI-005",
    description: "Incremental/full scan semantically equivalent",
    scope: "Scan",
    status: "REQUIRED",
    quarter: "Q4",
    verificationTest: "equivalence tests",
  },
  {
    id: "TI-006",
    description:
      "Unrelated file addition cannot change unrelated findings (golden snapshot)",
    scope: "Scan",
    status: "CURRENT",
    verificationTest: "golden snapshot",
  },
  {
    id: "TI-007",
    description: "Partial analysis cannot produce complete trust",
    scope: "Trust",
    status: "CURRENT",
    verificationTest: "trust-summary.spec.ts",
  },
  {
    id: "TI-008",
    description: "ANALYSIS_ERROR cannot become PASS",
    scope: "Exit",
    status: "CURRENT",
    verificationTest: "exit code tests",
  },
  {
    id: "TI-009",
    description: "Heuristic voting cannot manufacture deterministic proof",
    scope: "Evidence",
    status: "REQUIRED",
    quarter: "Q2",
    verificationTest: "evidence model tests",
  },
  {
    id: "TI-010",
    description: "Duplicate detection cannot multiply trust deductions",
    scope: "Scoring",
    status: "CURRENT",
    verificationTest: "overlap-dedup.spec.ts",
  },
  {
    id: "TI-011",
    description: "Evidence artifacts hashed into run identity",
    scope: "Identity",
    status: "REQUIRED",
    quarter: "Q3",
    verificationTest: "run identity tests",
  },
  {
    id: "TI-012",
    description: "Historical inputs hashed into run identity when used",
    scope: "Identity",
    status: "REQUIRED",
    quarter: "Q3",
    verificationTest: "run identity tests",
  },
  {
    id: "TI-013",
    description: "Plugin findings cannot inherit core trust tier",
    scope: "Plugins",
    status: "REQUIRED",
    quarter: "Q1",
    verificationTest: "plugin trust tests",
  },
  {
    id: "TI-014",
    description:
      "Score improvement requires real verification improvement (anti-gaming)",
    scope: "Scoring",
    status: "REQUIRED",
    quarter: "Q2",
    verificationTest: "anti-gaming corpus",
  },
  {
    id: "TI-015",
    description:
      "Two scans with identical semantic run identity produce identical trust results",
    scope: "Identity",
    status: "REQUIRED",
    quarter: "Q1",
    verificationTest: "run identity determinism test",
  },
  {
    id: "TI-016",
    description: "Runtime proximity does not automatically upgrade trust level",
    scope: "Evidence",
    status: "REQUIRED",
    quarter: "Q3",
    verificationTest: "runtime corroboration tests",
  },
  {
    id: "TI-017",
    description: "Suppression changes are represented in run identity",
    scope: "Identity",
    status: "REQUIRED",
    quarter: "Q1",
    verificationTest: "suppression fingerprint test",
  },
  {
    id: "TI-018",
    description: "Same PrCommentModelV1 → byte-identical rendered Markdown",
    scope: "PR Comments",
    status: "REQUIRED",
    quarter: "Q2",
    verificationTest: "golden render tests",
  },
  {
    id: "TI-019",
    description: "Presentation output cannot affect verification trust",
    scope: "PR Comments",
    status: "REQUIRED",
    quarter: "Q2",
    verificationTest: "PR trust-independence test",
  },
  {
    id: "TI-020",
    description:
      "Stale scan artifacts cannot overwrite presentation for a newer PR head",
    scope: "PR Comments",
    status: "REQUIRED",
    quarter: "Q3",
    verificationTest: "concurrency test",
  },
] as const;

/**
 * Look up a single invariant by ID.
 * Returns `undefined` for unknown IDs.
 */
export function getInvariantById(id: string): TrustInvariant | undefined {
  return TRUST_INVARIANTS.find((inv) => inv.id === id);
}

/**
 * Return all invariants that are REQUIRED and targeted at the given quarter.
 */
export function getRequiredForQuarter(
  quarter: "Q1" | "Q2" | "Q3" | "Q4",
): readonly TrustInvariant[] {
  return TRUST_INVARIANTS.filter(
    (inv) => inv.status === "REQUIRED" && inv.quarter === quarter,
  );
}

/**
 * Return all invariants whose scope matches the given value.
 */
export function getInvariantsByScope(
  scope: TrustInvariant["scope"],
): readonly TrustInvariant[] {
  return TRUST_INVARIANTS.filter((inv) => inv.scope === scope);
}
