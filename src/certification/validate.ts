/**
 * The §6 certification contract, as code.
 *
 * ## Counts in, verdicts out
 *
 * A record stores `tp`/`fp`/`fn`/`n` and NEVER a Wilson bound. `fpWilsonUpper`
 * and `recallWilsonLower` are computed here from the counts, every time, and
 * the record cannot carry one even if someone adds the field — `CellRecord`
 * below has no such property, and `assertCountsOnly` rejects a record that has
 * grown one.
 *
 * The reason is arithmetic, not taste: a stored bound is a number that can
 * disagree with the counts next to it, and a JSON file reading
 * `fp: 5, fpWilsonUpper: 0.02` LOOKS valid to anything that does not recompute
 * it. The plan's example is exactly this — `{fp: 5, n: 250}` with a stored
 * 0.02 upper bound — and the only defence is that the bound is not an input.
 *
 * ## Six dimensions, all independent
 *
 * A (precision) · B (sensitivity, tiered) · C (regression resistance) ·
 * D (language parity) · E (framework parity) · F (corpus diversity).
 *
 * Each returns its own verdict and the reasons it failed, so a cell's state
 * says WHICH gate is open rather than just that some gate is. A verdict that
 * only says "no" is a verdict a maintainer cannot act on, and the plan's cost
 * analysis is entirely about acting: 1,500 fixtures, contributed by people who
 * need to be told what to write.
 *
 * ## The thresholds are not round numbers
 *
 * `n ≥ 35` is where a PERFECT 35-of-35 clears both a `≤ 0.10` FP upper bound
 * and a `≥ 0.90` recall lower bound: `wilson(0,35) = 0.0989` and
 * `wilson(35,35) = 0.9011`. That coincidence is the entire justification for
 * the concept-level threshold, and the tests below pin both numbers so a
 * change to `Z95` or the rounding cannot quietly move the bar.
 *
 * The per-cell bar is `n ≥ 20` — `wilson(20,20) = 0.8389 ≥ 0.80` — and it is
 * lower ON PURPOSE. A language binding is a vocabulary table; "this table is
 * wired correctly" is a weaker and more honest claim than "this detector
 * works", and charging both the same bar is why the flat version costs 50× the
 * current fixture count for no extra truth.
 */

import { wilsonInterval } from "../lib/wilson.js";
import { CONCEPTS } from "./concepts.js";

/** §6.1 — concept level, pooled across languages. */
export const CONCEPT_MIN_N = 35;
export const CONCEPT_FP_WILSON_UPPER_MAX = 0.1;
export const CONCEPT_RECALL_WILSON_LOWER_MIN = 0.9;

/** §5.5b — cell level, one language and framework. */
export const CELL_MIN_N = 20;
export const CELL_RECALL_WILSON_LOWER_MIN = 0.8;

/** §5.5c/§6.F — diversity, and it applies to PRECISION only. */
export const PRECISION_MIN_UNIQUE_REPOS = 3;
export const PRECISION_MAX_SINGLE_REPO_SHARE = 0.4;

/** §6.C — the regression-fixture floor. */
export const MIN_REGRESSION_FIXTURES = 1;

/**
 * Counts, as stored. The ONLY thing a record carries about a rate.
 *
 * `n` is `tp + fp` for precision and `tp + fn` for sensitivity, and the two are
 * different numbers for the same finding set — which is why they are separate
 * fields and not one `n`. A record with one `n` cannot be right about both.
 */
export interface PrecisionCounts {
  readonly tp: number;
  readonly fp: number;
  readonly n: number;
}

export interface SensitivityCounts {
  readonly tp: number;
  readonly fn: number;
  readonly n: number;
}

export interface CorpusDiversity {
  /** Distinct repositories this cell's precision evidence came from. */
  readonly uniqueRepos: number;
  /** The largest single repository's share of the cell's precision `n`. */
  readonly maxSingleRepoShare: number;
}

/**
 * One cell's evidence — `concept × language × framework`.
 *
 * Note what is ABSENT: any interval, any bound, any percentage that is not a
 * count or a plain ratio the validator itself checks. `state` is the verdict,
 * computed by `validateCell`, not stored — a record that carried its own state
 * would be able to claim CERTIFIED without the evidence that earns it.
 */
export interface CellEvidence {
  readonly concept: string;
  readonly language: string;
  readonly framework: string;
  /** Bumped when the detector's source identity changes; invalidates the cell. */
  readonly detectorHash: string;
  readonly precision: PrecisionCounts;
  readonly sensitivity: SensitivityCounts;
  /** §6.C — historical FP/FN/parsing bugs that became permanent fixtures. */
  readonly regressionFixtures: number;
  /** §6.F — precision cells only. */
  readonly corpusDiversity?: CorpusDiversity;
  /**
   * §5.5c — construction variety, the sensitivity analogue of F. Sensitivity
   * positives are built by hand and have no repository identity, so the
   * guard against 157 fires on one repo's shapes is variety, not diversity.
   */
  readonly distinctShapes?: number;
}

export type GateId = "A" | "B" | "C" | "D" | "E" | "F";

export interface GateVerdict {
  readonly gate: GateId;
  /** The dimension's own name, for a message a contributor can act on. */
  readonly dimension: string;
  readonly passed: boolean;
  /** Empty when `passed`. Populated with the ARITHMETIC, never "failed". */
  readonly reasons: readonly string[];
  /** The computed bound, when the gate has one. Output, never an input. */
  readonly bound?: number;
}

export interface CellVerdict {
  readonly concept: string;
  readonly language: string;
  readonly framework: string;
  readonly gates: readonly GateVerdict[];
  readonly passed: boolean;
  /** The computed bounds, for the report. Never stored in a record. */
  readonly fpWilsonUpper: number;
  readonly recallWilsonLower: number;
}

function ratio(n: number, d: number): number {
  return d <= 0 ? 0 : Math.round((n / d) * 10000) / 10000;
}

/**
 * Dimension A — precision.
 *
 * `n ≥ 35` AND `wilsonUpper(fp, n) ≤ 0.10`. Both, because either alone is
 * gameable: `n = 35` alone is satisfied by 35 positives and zero negatives
 * ever tried, and a bound alone is satisfied by any large `n` with a rate the
 * bound happens to admit.
 */
function gateA(e: CellEvidence): GateVerdict {
  const reasons: string[] = [];
  const { fp, n } = e.precision;
  const upper = wilsonInterval(fp, n).ciHigh;
  if (n < CONCEPT_MIN_N) {
    reasons.push(
      `precision n=${n} is below ${CONCEPT_MIN_N}. This is the bar where ` +
        "wilson(0,35)=0.0989 first clears 0.10, so a smaller n cannot claim " +
        "a rate this good without more evidence.",
    );
  }
  if (upper > CONCEPT_FP_WILSON_UPPER_MAX) {
    reasons.push(
      `precision wilsonUpper(${fp},${n}) = ${upper} is above ` +
        `${CONCEPT_FP_WILSON_UPPER_MAX}. Close it with real repositories, not ` +
        "with a bigger n over the same findings — re-observation re-tests the " +
        "same evidence rather than adding to it.",
    );
  }
  return {
    gate: "A",
    dimension: "precision",
    passed: reasons.length === 0,
    reasons,
    bound: upper,
  };
}

/**
 * Dimension B — sensitivity, TIERED.
 *
 * At concept level the bar is `n ≥ 35` and `wilsonLower(tp,n) ≥ 0.90`. This
 * function applies the CELL bar (`n ≥ 20`, `≥ 0.80`) because it validates one
 * cell; `validateConcept` applies the concept bar to the pooled counts. Both
 * are the same arithmetic at two thresholds, which is why they are two
 * functions over one body rather than one threshold that is sometimes 20 and
 * sometimes 35.
 */
function gateB(e: CellEvidence): GateVerdict {
  const reasons: string[] = [];
  const { tp, fn, n } = e.sensitivity;
  // The LOWER bound of a proportion whose SUCCESSES are the true
  // positives. See the file header: `wilsonInterval(x, n)` counts x events
  // of interest out of n, and for recall the event of interest is a TP.
  // Reading `fn` or `n - tp` here gives 0 on a PERFECT cell — the Wilson
  // bound at p = 0 is exactly 0 — so every cell in the tree would fail.
  const lower = wilsonInterval(tp, n).ciLow;
  if (n < CELL_MIN_N) {
    reasons.push(
      `sensitivity n=${n} is below ${CELL_MIN_N}. A cell proves the BINDING, ` +
        "not the detector: at n=20 a perfect cell reads wilson(20,20)=0.8389, " +
        "which is the claim 'this language table is wired correctly'.",
    );
  }
  if (lower < CELL_RECALL_WILSON_LOWER_MIN) {
    reasons.push(
      `sensitivity wilsonLower(tp=${tp},n=${n}) = ${lower} is below ` +
        `${CELL_RECALL_WILSON_LOWER_MIN}. ` +
        (fn === 0
          ? "There are no misses to find yet, because there is no evidence at " +
            "all: a lower bound at zero trials is 0, and it stays 0 until " +
            "positives exist. This is a task, not a defect."
          : `${fn} known misses were not recalled; each one needs a positive ` +
            "fixture before this cell can pass."),
    );
  }
  return {
    gate: "B",
    dimension: "sensitivity (cell tier)",
    passed: reasons.length === 0,
    reasons,
    bound: lower,
  };
}

/** Dimension C — every historical defect became a permanent fixture. */
function gateC(e: CellEvidence): GateVerdict {
  const reasons: string[] = [];
  if (e.regressionFixtures < MIN_REGRESSION_FIXTURES) {
    reasons.push(
      `regressionFixtures=${e.regressionFixtures}; a cell with no regression ` +
        "fixture has not recorded the defect that made it worth having. Every " +
        "historical FP, FN, parsing bug, framework incompatibility, async bug " +
        "and syntax edge that caused a fix becomes one.",
    );
  }
  return {
    gate: "C",
    dimension: "regression resistance",
    passed: reasons.length === 0,
    reasons,
  };
}

/**
 * Dimension D — this cell names a language the concept is bound to.
 *
 * NOT "this concept has one language". That version failed every cell of
 * every multi-language concept, which means no cell of the three-language
 * concepts could EVER pass — a gate that can only subtract is not a gate.
 * §6.E's language parity is a property of the SET ("is this concept covered
 * in every language it is bound to?"), and the ecosystem roll-up in the
 * matrix is where that is computed; a single cell cannot answer it and does
 * not pretend to.
 *
 * What a cell CAN answer is whether it is one of the cells that coverage
 * needs — which is this check. A cell naming a language the concept is not
 * bound to is a cell certifying something that does not exist.
 */
function gateD(e: CellEvidence): GateVerdict {
  const concept = CONCEPTS[e.concept];
  const reasons: string[] = [];
  if (concept === undefined) {
    reasons.push(
      `concept "${e.concept}" is not in the vocabulary. A cell for a concept ` +
        "nobody defined is a cell whose language binding cannot be checked.",
    );
  } else if (
    concept.languages.length > 0 &&
    !concept.languages.includes(e.language)
  ) {
    reasons.push(
      `this cell names the language "${e.language}", which this concept is not ` +
        `bound to. It is bound to ${concept.languages.join(", ")}. A cell ` +
        "certifying a language the concept does not target is a cell measuring " +
        "something that is not on the surface.",
    );
  }
  return {
    gate: "D",
    dimension: "language binding",
    passed: reasons.length === 0,
    reasons,
  };
}

/** Dimension E — framework parity, only where framework semantics differ. */
function gateE(e: CellEvidence): GateVerdict {
  const reasons: string[] = [];
  if (e.framework === "n/a" && e.language !== "n/a") {
    reasons.push(
      'framework "n/a" on a cell that names a language claims framework ' +
        "parity for a framework that does not exist. Use the framework the " +
        "detector actually needs, or mark the cell NOT_APPLICABLE in the " +
        "surface manifest with a reason.",
    );
  }
  return {
    gate: "E",
    dimension: "framework parity",
    passed: reasons.length === 0,
    reasons,
  };
}

/**
 * Dimension F — corpus diversity, PRECISION cells only.
 *
 * It exists because `QA-TEST-004` fires 157 times on `tanstack-query` alone,
 * and 157 fires on one repository is not evidence about hard-coded waits. It
 * does NOT apply to sensitivity: those positives are constructed by design and
 * have no repository identity, and demanding three repositories of them would
 * be demanding a fact that does not exist. The analogous guard there is
 * `distinctShapes`.
 */
function gateF(e: CellEvidence): GateVerdict {
  const reasons: string[] = [];
  const d = e.corpusDiversity;
  if (d === undefined) {
    reasons.push(
      "corpusDiversity is absent. This gate applies to PRECISION cells, whose " +
        "evidence is real repositories; without it a rate can be supplied by " +
        "one repository.",
    );
  } else {
    if (d.uniqueRepos < PRECISION_MIN_UNIQUE_REPOS) {
      reasons.push(
        `uniqueRepos=${d.uniqueRepos} is below ${PRECISION_MIN_UNIQUE_REPOS}. ` +
          "Three repositories is the floor at which a rate says anything " +
          "about a language rather than about a codebase.",
      );
    }
    if (d.maxSingleRepoShare > PRECISION_MAX_SINGLE_REPO_SHARE) {
      reasons.push(
        `maxSingleRepoShare=${d.maxSingleRepoShare} exceeds ` +
          `${PRECISION_MAX_SINGLE_REPO_SHARE}. One repository may not supply ` +
          "more than 40% of a cell's evidence.",
      );
    }
  }
  return {
    gate: "F",
    dimension: "corpus diversity (precision only)",
    passed: reasons.length === 0,
    reasons,
  };
}

/**
 * Validate one cell.
 *
 * Returns every gate's verdict, not the first failure. A contributor opening a
 * gap report needs to see every open dimension at once: fixing B and then
 * discovering A is still open is how 1,500 fixtures becomes 3,000.
 */
export function validateCell(e: CellEvidence): CellVerdict {
  const gates: GateVerdict[] = [
    gateA(e),
    gateB(e),
    gateC(e),
    gateD(e),
    gateE(e),
    gateF(e),
  ];
  return {
    concept: e.concept,
    language: e.language,
    framework: e.framework,
    gates,
    passed: gates.every((g) => g.passed),
    fpWilsonUpper: wilsonInterval(e.precision.fp, e.precision.n).ciHigh,
    recallWilsonLower: wilsonInterval(e.sensitivity.tp, e.sensitivity.n).ciLow,
  };
}

/**
 * Reject a record that has grown a stored interval.
 *
 * The type makes it impossible in TypeScript; a JSON file does not care, and a
 * JSON file is where records live. This is the runtime half of the rule, and
 * it names the field so the fix is obvious.
 */
export function assertCountsOnly(record: object): void {
  const FORBIDDEN = new Set([
    "fpWilsonUpper",
    "recallWilsonLower",
    "fpRate",
    "fnRate",
    "precisionWilsonUpper",
    "sensitivityWilsonLower",
  ]);
  // A record is a TREE, so the walk is a tree. `fpRate` nested inside
  // `precision` is the same defect as `fpRate` beside it, and the first
  // version checked only the top level — so the one place a rate is most
  // likely to be pasted, inside the counts it was computed from, was the one
  // place it slipped through.
  const found: string[] = [];
  const walk = (node: unknown, path: string): void => {
    if (node === null || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${path}[${i}]`));
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      const at = path === "" ? key : `${path}.${key}`;
      if (FORBIDDEN.has(key)) found.push(at);
      walk(value, at);
    }
  };
  walk(record, "");
  if (found.length > 0) {
    throw new Error(
      `certification record carries computed value(s) ${found.join(", ")}. ` +
        "Counts are stored; intervals are outputs of validateCell(). A stored " +
        "bound can disagree with the counts beside it, and nothing that reads " +
        "the JSON recomputes it — so a record carrying one looks valid while " +
        "asserting a number the counts do not support.",
    );
  }
}

/**
 * The concept-level tier: pooled counts across every cell of the concept.
 *
 * §5.5b. `n ≥ 35` and `wilsonLower(tp,n) ≥ 0.90` on the POOLED sensitivity
 * counts — which is the only place the 0.90 appears. A cell never sees it; the
 * concept does, because the concept is what claims "this detector catches the
 * failure mode" rather than "this table is wired".
 */
export function validateConcept(
  concept: string,
  pooled: SensitivityCounts,
): GateVerdict {
  const reasons: string[] = [];
  // Successes for recall are the true positives; see the note in gateB.
  const lower = wilsonInterval(pooled.tp, pooled.n).ciLow;
  if (pooled.n < CONCEPT_MIN_N) {
    reasons.push(`pooled sensitivity n=${pooled.n} is below ${CONCEPT_MIN_N}.`);
  }
  if (lower < CONCEPT_RECALL_WILSON_LOWER_MIN) {
    reasons.push(
      `pooled wilsonLower(tp=${pooled.tp},n=${pooled.n}) = ${lower} is below ` +
        `${CONCEPT_RECALL_WILSON_LOWER_MIN}, where wilson(35,35)=0.9011 first ` +
        "clears it.",
    );
  }
  return {
    gate: "B",
    dimension: "sensitivity (concept tier, pooled)",
    passed: reasons.length === 0,
    reasons,
    bound: lower,
  };
}

export { ratio };
