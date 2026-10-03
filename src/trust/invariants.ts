/**
 * How much it costs to lose this one.
 *
 * `status` was the only ranking-shaped field, and it is not one: it is a
 * CURRENT/REQUIRED flag answering "does this hold today" against "must this
 * hold", not "how bad is the breach". A reader could not tell which of the 24
 * they would be embarrassed to lose, which is the only question a severity
 * field exists to answer.
 *
 * CRITICAL — a breach turns a claim the product makes into a lie. A false-green
 * is the product's whole thesis; an invariant that lets one through is a
 * product defect, not a quality regression.
 *
 * HIGH — a breach silently removes a check. The gate stops refusing something
 * it used to refuse, and nothing reports it.
 *
 * MEDIUM — a breach narrows coverage or costs determinism. Real, visible in
 * the output, and not a claim the product makes about itself.
 *
 * LOW — a hygiene gap. The claim is true but incomplete, or the invariant is
 * about the repository rather than about a scan.
 */
export type TrustInvariantSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

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
  /**
   * What a breach costs.
   *
   * Required, not defaulted. A 24-entry table and a required field is 24
   * edits; a defaulted field is one edit and an invitation to never make the
   * other 24, and the first version of this change did exactly that.
   */
  readonly severity: TrustInvariantSeverity;
  readonly quarter?: "Q1" | "Q2" | "Q3" | "Q4";
  readonly verificationTest: string;
  readonly verificationCase?: string;
  readonly verificationGap?: string;
}

/**
 * THE 24 INVARIANTS ARE SELF-REFERENTIAL, and a reader who does not know that
 * will over-trust them.
 *
 * These are 24 statements about this repository, verified by this repository.
 * A detector that is wrong in a way nobody noticed produces invariants that
 * are individually true, consistent, and jointly describe a tool that does not
 * work. Nothing in the list can catch that: the corpus is the only outside
 * input, and the corpus is adjudicated by the same project's owner.
 *
 * What the list IS good for is drift and regression — a change that breaks
 * determinism, identity, exit codes, or a privacy property is caught here
 * even when nobody was looking. What it is NOT is external validation of the
 * detectors themselves, and `status: "CURRENT"` means "this holds in this
 * repository as of this commit", never "this has been independently confirmed".
 *
 * The outside evidence is the corpus, and its authority is
 * `docs/ADJUDICATION-KIT.md` — human classification by a person the tool is
 * not derived from. Where an invariant and the corpus disagree, the corpus
 * wins, and the invariant is the bug.
 */
export const TRUST_INVARIANTS: readonly TrustInvariant[] = [
  {
    id: "TI-001",
    description: "Same semantic input → same verdict (determinism soak)",
    scope: "Scan",
    status: "CURRENT",
    severity: "CRITICAL",
    verificationTest: "tests/engine/determinism-soak.spec.ts",
    verificationCase:
      "repeated real scans with identical identity produce identical trust results",
  },
  {
    id: "TI-002",
    description: "File ordering cannot change verdict (adversarial ordering)",
    scope: "Scan",
    status: "REQUIRED",
    severity: "CRITICAL",
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
    severity: "HIGH",
    verificationTest: "tests/engine/determinism-soak.spec.ts",
    verificationGap:
      "No executable scan comparison with permuted rule registration.",
  },
  {
    id: "TI-004",
    description: "Cache/no-cache semantically equivalent",
    scope: "Scan",
    status: "CURRENT",
    severity: "MEDIUM",
    verificationTest: "tests/engine/scan-cache.spec.ts",
    verificationCase:
      "two --cache runs produce identical findings, score, and counters",
  },
  {
    id: "TI-005",
    description: "Incremental/full scan semantically equivalent",
    scope: "Scan",
    status: "REQUIRED",
    severity: "MEDIUM",
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
    severity: "MEDIUM",
    verificationTest: "tests/engine/determinism-soak.spec.ts",
    verificationGap:
      "No before/after scan verifier for unrelated file additions.",
  },
  {
    id: "TI-007",
    description: "Partial analysis cannot produce complete trust",
    scope: "Trust",
    status: "CURRENT",
    severity: "CRITICAL",
    verificationTest: "tests/engine/trust-summary.spec.ts",
    verificationCase:
      "CEILING LAW: a partial scan can never exceed its ceiling, even with L5 findings",
  },
  {
    id: "TI-008",
    description: "ANALYSIS_ERROR cannot become PASS",
    scope: "Exit",
    status: "REQUIRED",
    severity: "CRITICAL",
    verificationTest: "tests/e2e/journey-9-exit-codes.spec.ts",
    verificationGap:
      "Usage/config exit smoke tests do not verify scan analysis failures cannot become PASS.",
  },
  {
    id: "TI-009",
    description: "Heuristic voting cannot manufacture deterministic proof",
    scope: "Evidence",
    status: "CURRENT",
    severity: "CRITICAL",
    verificationTest: "tests/contract/evidence-voting.spec.ts",
    verificationCase: "three E1 findings converge as SUPPORTING, never STRONG",
  },
  {
    id: "TI-010",
    description: "Duplicate detection cannot multiply trust deductions",
    scope: "Scoring",
    status: "CURRENT",
    severity: "HIGH",
    verificationTest: "tests/engine/analysis/overlap-dedup.spec.ts",
    verificationCase: "drops the declared finding; the declaring rule survives",
  },
  {
    id: "TI-011",
    description: "Evidence artifacts hashed into run identity",
    scope: "Identity",
    status: "REQUIRED",
    severity: "HIGH",
    verificationTest: "tests/engine/run-identity-determinism.spec.ts",
    verificationGap:
      "No scan-level verifier mutates an ingested artifact and checks identity invalidation.",
  },
  {
    id: "TI-012",
    description: "Historical inputs hashed into run identity when used",
    scope: "Identity",
    status: "REQUIRED",
    severity: "HIGH",
    verificationTest: "tests/engine/run-identity-determinism.spec.ts",
    verificationGap:
      "Identity helper accepts historical fingerprints; scan wiring is not verified.",
  },
  {
    id: "TI-013",
    description: "Plugin findings cannot inherit core trust tier",
    scope: "Plugins",
    status: "CURRENT",
    severity: "CRITICAL",
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
    severity: "CRITICAL",
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
    severity: "HIGH",
    verificationTest: "tests/engine/determinism-soak.spec.ts",
    verificationCase:
      "repeated real scans with identical identity produce identical trust results",
  },
  {
    id: "TI-016",
    description: "Runtime proximity does not automatically upgrade trust level",
    scope: "Evidence",
    status: "CURRENT",
    severity: "CRITICAL",
    verificationTest: "tests/engine/trust-proximity.spec.ts",
    verificationCase: "E0 with defect-level corroboration → L4, never L5",
  },
  {
    id: "TI-017",
    description: "Suppression changes are represented in run identity",
    scope: "Identity",
    status: "REQUIRED",
    severity: "MEDIUM",
    verificationTest: "tests/engine/run-identity-determinism.spec.ts",
    verificationGap:
      "Fingerprint helper is tested, but scan construction does not supply suppressionFingerprint.",
  },
  {
    id: "TI-018",
    description: "PR-comment rendering is deterministic",
    scope: "PR Comments",
    status: "CURRENT",
    severity: "MEDIUM",
    verificationTest: "tests/reporters/pr-comment-determinism.spec.ts",
    // Was "soak: 50 renders produce identical output", which asserted
    // determinism of `renderPrComment` — a function with NO production
    // importer. The live renderer is `renderUnifiedReport`, so the invariant
    // was `CURRENT` while verifying code no user could reach.
    verificationCase: "soak: 50 renders of each shape are identical",
  },
  {
    id: "TI-019",
    description: "Presentation output cannot affect verification trust",
    scope: "PR Comments",
    status: "CURRENT",
    severity: "MEDIUM",
    verificationTest: "tests/contract/presentation-trust.spec.ts",
    verificationCase: "changing message does not affect trust level",
  },
  {
    id: "TI-020",
    description:
      "Stale scan artifacts cannot overwrite presentation for a newer PR head",
    scope: "PR Comments",
    // REQUIRED, not CURRENT, and the downgrade is the honest reading of the
    // tree rather than a reassessment of the property. The property is real
    // and MEDIUM is the right severity for it (presentation, not a false
    // claim about the product) — but its ONLY enforcement was
    // `src/integrations/github/stale-guard.ts` and its only proof was
    // `tests/integrations/github/stale-guard-ti020.spec.ts`. Both were deleted
    // on 2026-10-01, because there is no PR comment publisher in `src/` at
    // all: the `pr-comment` verb went with the v6 carve, so the stale-guard
    // guarded a path nothing reaches.
    //
    // Leaving it CURRENT would have been the exact defect this registry
    // exists to prevent — a listed invariant whose verification points at a
    // file that does not exist, which the registry spec catches as an ENOENT
    // rather than as a claim. REQUIRED plus a gap is what it now is: the
    // obligation survives, the enforcement does not, and the gap names the
    // work.
    status: "REQUIRED",
    severity: "MEDIUM",
    verificationTest: "tests/contract/gate-exit-codes.spec.ts",
    verificationGap:
      "No publisher exists to enforce it: `src/integrations/github/stale-guard.ts` was deleted 2026-10-01 and the `pr-comment` verb was removed by the v6 carve, so nothing in `src/` writes a PR comment and nothing can overwrite one. When a publisher returns it must stamp the head SHA and refuse to publish a mismatch; the property becomes CURRENT with a real test at that point, not before.",
  },
  // TI-021..TI-024 are one failure mode recorded four times: a gate that
  // cannot fail is indistinguishable from a gate that passed. Each was a
  // live silent success with no test and no CI wiring — a three-state
  // result flattened to two by a ternary, an exit code nothing could
  // reach, a filter over a word no row carried, and a banner that said
  // "exit 0 by design" while exiting 1.
  {
    id: "TI-021",
    description: "A gate that did not run cannot report success",
    scope: "Exit",
    status: "CURRENT",
    severity: "CRITICAL",
    verificationTest: "tests/contract/gate-exit-codes.spec.ts",
    verificationCase:
      "maps PASS, BLOCKED and FAIL to three distinct exit codes",
  },
  {
    id: "TI-022",
    description: "A gate cannot rewrite the artifact it is asserted against",
    scope: "Exit",
    status: "CURRENT",
    severity: "CRITICAL",
    // 6.0 repointed this. It used to verify `--check leaves the tracked
    // artifact byte-identical and still reports red` against the v6 archive
    // reconciler, which read the deleted M26 GitHub snapshot and was deleted
    // with it. The property did not go with the script: it is the shape of
    // every gate in this repository, and it now has a gate of its own —
    // `npm run entry-points:check` refuses an entry point that reaches a
    // write-mode script. The spec asserts that gate by feeding it an entry
    // point that does, which is the same proof the reconciler gave: a gate
    // cannot rewrite what it asserts against because it is built not to.
    verificationTest: "tests/contract/entry-points-budget.spec.ts",
    verificationCase: "rejects an entry point that reaches a write-mode script",
  },
  {
    id: "TI-023",
    description:
      "An unverifiable gap never reports as a cleared release blocker",
    scope: "Exit",
    status: "CURRENT",
    severity: "CRITICAL",
    // 6.0 repointed this. It used to verify
    // "reports every release-blocker row that is not provably cleared" against
    // `docs/M26-GAP-LEDGER.jsonl` and `src/ledger/m26-validators.ts` — both
    // deleted with the M26 program, and what is left of the assertion would be
    // a predicate with no input.
    //
    // The property is not the ledger; it is that an evidence-less dimension
    // stays BLOCKED. That is now enforced where the remaining evidence lives:
    // the candidate manifest, which holds every external readiness dimension
    // and refuses to authorize a release while one of them is unproven.
    verificationTest: "tests/certification/candidate-manifest.spec.ts",
    verificationCase: "blocks every unproven external readiness dimension",
  },
  {
    id: "TI-024",
    description: "A staleness report that can enforce must be wired to enforce",
    scope: "Exit",
    status: "CURRENT",
    severity: "CRITICAL",
    // The instance this invariant was raised against is gone: the
    // translation staleness gate and the twenty-two READMEs it measured were
    // removed by the v6 carve, and a gate whose only reachable outcome was a
    // permanently-red report was the empty exclusion the carve exists to
    // delete. What is verified now is the removal itself — a check that fails
    // if the machinery drifts back under a name nobody greps for. The
    // `verificationCase` is that case's exact title; the registry spec proves
    // the title still exists in the named file, so a rename cannot silently
    // orphan this entry.
    verificationTest: "tests/contract/gate-exit-codes.spec.ts",
    verificationCase:
      "the translation machinery is absent, not merely unreferenced",
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
