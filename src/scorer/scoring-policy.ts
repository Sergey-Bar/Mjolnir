/**
 * `mjolnir scan --policy` — the scoring policy, as the code states it.
 *
 * The plan's §3 maps the `policy` verb to a flag on `scan`, which is right
 * for a view and wrong for a verb with subcommands: `mjolnir policy init` and
 * `mjolnir policy validate` manage `mjolnir.policy.json`, a file that gates
 * CI, and folding them into a flag would lose both. This renders the OTHER
 * thing "policy" can mean — the scoring table, the deductions, the ceilings —
 * which is what the report claims and what a reader has to be able to check.
 *
 * Every number here is IMPORTED, never written down. A policy nobody can
 * check is a policy nobody can argue with, and an argument-proof policy is
 * the failure this product exists to catch. When the scorer changes, this
 * table changes with it.
 *
 * There is deliberately no dimension-weight list: the scorer has no
 * dimension weights. `computeDimensions` groups findings by CATEGORY and
 * there is nothing to weight, so a weight table here would be an invention
 * that happened to look like the scorer.
 */
import {
  DEDUCTION_MASS_CEILINGS,
  ERROR_SEVERITY_CEILING,
  NORMALIZATION_K,
  SMOOTHING_C,
  SUITE_INVALIDATED_CEILING,
} from "./scorer.js";

export interface ScoringPolicyView {
  readonly normalizationK: number;
  readonly smoothingC: number;
  readonly suiteInvalidatedCeiling: number;
  readonly errorSeverityCeiling: number;
  readonly deductionMassCeilings: ReadonlyArray<{
    readonly minMass: number;
    readonly ceiling: number;
  }>;
}

/** The policy as data, so `--policy --json` needs no prose parsing. */
export function scoringPolicy(): ScoringPolicyView {
  return {
    normalizationK: NORMALIZATION_K,
    smoothingC: SMOOTHING_C,
    suiteInvalidatedCeiling: SUITE_INVALIDATED_CEILING,
    errorSeverityCeiling: ERROR_SEVERITY_CEILING,
    deductionMassCeilings: DEDUCTION_MASS_CEILINGS.map((c) => ({ ...c })),
  };
}

/**
 * The policy as the lines a terminal reader sees.
 *
 * The NORMALIZATION_K line says "unfitted" because it IS unfitted: the value
 * is a declared default pending a corpus fit, and printing a bare `5` in a
 * table of measured numbers would read as a measurement. docs/SCORING.md says
 * the same thing in prose; this is the same fact in the place someone looks
 * when deciding whether to trust the score.
 */
export function renderScoringPolicy(): string {
  const p = scoringPolicy();
  const lines: string[] = [];
  lines.push("SCORING POLICY — the numbers this run used");
  lines.push("");
  lines.push("Formula");
  lines.push("  score = 100 · (1 − deductions / (findings + NORMALIZATION_K))");
  lines.push("");
  lines.push("Constants");
  lines.push(
    `  NORMALIZATION_K          ${p.normalizationK}    DECLARED, not fitted — a corpus fit is outstanding`,
  );
  lines.push(
    `  SMOOTHING_C             ${p.smoothingC}    the standard Laplace constant`,
  );
  lines.push("");
  lines.push("Ceilings (categorical, not averaged)");
  lines.push(
    `  suite-invalidated       ≤ ${p.suiteInvalidatedCeiling}    a committed .only caps the score outright`,
  );
  lines.push(
    `  any error finding       ≤ ${p.errorSeverityCeiling}    an error is a categorical defect, however large the suite`,
  );
  lines.push("");
  lines.push("Deduction-mass ceilings (anti-dilution)");
  for (const c of p.deductionMassCeilings) {
    lines.push(
      `  ≥ ${String(c.minMass).padStart(4)} deduction-pts   score ≤ ${c.ceiling}`,
    );
  }
  lines.push("");
  lines.push(
    "Every number above is imported from src/scorer/scorer.ts at run time. A",
    "policy that cannot be read cannot be checked, and an uncheckable policy",
    "is the thing this product exists to catch.",
  );
  return lines.join("\n");
}
