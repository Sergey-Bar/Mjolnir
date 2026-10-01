/**
 * Measurement-aware tier resolution (Verification Trust Evolution Plan
 * §07/§11.2 Step 2/§20.3) — the code-side closure of defect D3.
 *
 * The omitted-tier default is no longer unconditionally "core". A rule
 * that does not declare a tier resolves by its measurement's CONFIDENCE
 * INTERVAL, not its point estimate:
 *   - "core"      when the 95% Wilson upper bound is at or below
 *                  CORE_FP_CEILING (confidently good);
 *   - "quarantine" when the lower bound is at or above
 *                  QUARANTINE_FP_FLOOR (confidently bad);
 *   - "extended"  otherwise, with the display status TIER-STRADDLE.
 *
 * 6.0 changed that criterion from a point estimate to the interval, and the
 * change is not cosmetic. Under the old rule a rule needed `fpRate <= 0.1`
 * AND `n >= 10`. Under the new rule it needs `ciHigh <= 0.1`, which for a
 * rule observing ZERO false positives needs n >= 35: the Wilson upper bound
 * for 0/n is about 3.84/(n+3.84), which only drops under 10% at n ≈ 35.
 * Every undeclared-tier rule in the registry fails that today — the best of
 * them is n=14 at 0% observed, ciHigh 21.5%. So all five move to TIER-STRADDLE.
 *
 * That is the honest answer rather than a regression: the point estimate said
 * "0% false positives" and the data said "we have seen fourteen findings and
 * none of them was wrong", which is not the same claim. A rule promoted to
 * core on n=10 is a rule whose ceiling was never established, and a ceiling
 * nobody established is not a ceiling.
 *
 * "PROVISIONAL" and "TIER-STRADDLE" are DISPLAY statuses, not tier values,
 * exactly as "PROVISIONAL" already was: the `Tier` union stays three wide.
 * Adding a fourth member would ripple through `tier-policy.ts`, every
 * `switch` on `Tier`, the matrix schema and the emitted JSON, and it would
 * buy nothing a status string cannot carry — the distinction is for the
 * reader, and the reader reads `ruleStatus`.
 *
 * A measurement is VALID only when its `detectorRevision` matches the
 * rule's declared implementation revision (default 1): a mismatch means
 * the measurement was taken against an older detector (stale) and the
 * rule is treated as unmeasured → provisional → re-measure (§07). This
 * blocks the path Regex → AST → "old measurement says Core" → Core.
 *
 * Consumers: `mjolnir explain`, the rules catalog, the generated rule
 * docs, `mjolnir doctor`'s tier ratchets, the capability matrix, and
 * `src/engine/scan-pipeline.ts`.
 *
 * The pipeline use is the one that matters for findings: it resolves the tier
 * through `effectiveTier` for the quarantine filter and for the `tier` field
 * on every emitted finding. The "every quarantine rule declares its tier
 * explicitly, so this cannot change findings" claim was TRUE when written and
 * is true only because a TEST says so —
 * `tests/rules/registry-ratchet.spec.ts` asserts that every quarantined rule
 * declares the tier. That is a narrower guarantee than "by design", and the
 * distinction is the difference between an invariant and a coincidence.
 */

import type { QADoctorRule } from "./rule.js";
import { MEASURED_FP, MEASURED_FP_RAW } from "./measured-fp.generated.js";
import { RETIRED_RULE_IDS } from "./index.js";
import { wilsonInterval, type WilsonInterval } from "../lib/wilson.js";

export type Tier = "core" | "extended" | "quarantine";

export type RuleStatus =
  | "MEASURED-CORE"
  | "MEASURED-EXTENDED"
  | "MEASURED-QUARANTINE"
  | "PROVISIONAL"
  | "TIER-STRADDLE"
  | "UNMEASURED";

/**
 * The false-positive rate a rule must be able to defend at 95% confidence to
 * count as core. Applied to the Wilson UPPER bound, so a rule earns core by
 * proving its ceiling, not by reporting a point estimate under it.
 */
export const CORE_FP_CEILING = 0.1;

/**
 * The rate a rule must be able to defend at 95% confidence to be quarantined
 * on measurement alone. Applied to the Wilson LOWER bound: a rule is not
 * quarantined for looking bad on four samples.
 */
export const QUARANTINE_FP_FLOOR = 0.5;

/** The rule's declared detector implementation revision (§07). */
export function declaredDetectorRevision(rule: QADoctorRule): number {
  return rule.detectorRevision ?? 1;
}

/** The measurement recorded for the rule, if it has one. */
export function measurementFor(
  ruleId: string,
): (typeof MEASURED_FP)[string] | undefined {
  return MEASURED_FP[ruleId];
}

/**
 * A measurement exists AND was taken against the detector revision the
 * rule declares now. A revision mismatch (stale) does NOT count — §07:
 * stale → provisional → re-measure.
 */
export function hasValidMeasurement(rule: QADoctorRule): boolean {
  const m = MEASURED_FP[rule.id];
  return (
    m !== undefined && m.detectorRevision === declaredDetectorRevision(rule)
  );
}

/**
 * A measurement exists but was taken against an older detector.
 *
 * Read from `MEASURED_FP_RAW`, not from `MEASURED_FP`.
 *
 * The generator filters `MEASURED_FP` to measurements whose revision still
 * matches the rule's, so a stale row is not IN it — and reading `MEASURED_FP`
 * made this function structurally always `false` for every real rule. It was
 * the one predicate in this file that could not return `true`, and its one
 * live consumer (`scripts/core-readiness.ts`) emitted a dead branch that
 * rendered as "no measurement at the current detector revision" for a rule
 * with 42 hand-classified verdicts behind it. That sentence is the defect, not
 * the report.
 *
 * The RAW map holds the same rows unfiltered, so this is now a question with
 * an answer, and the answer is the one a maintainer needs: there IS a
 * measurement, and it has to be redone.
 */
export function hasStaleMeasurement(rule: QADoctorRule): boolean {
  const raw = MEASURED_FP_RAW[rule.id];
  return (
    raw !== undefined && raw.detectorRevision !== declaredDetectorRevision(rule)
  );
}

/**
 * The confidence interval of a rule's VALID measurement, or undefined when
 * it has none. A stale measurement returns undefined rather than its stale
 * interval: a number derived from an older detector is not evidence about
 * this one, and returning it would let the straddle test pass on stale data.
 *
 * The FP count is ROUNDED, and it is not an optimization. The shipped
 * measurement records a rate and a sample count, not an integer count of false
 * positives, so `fpRate * n` is generally fractional — 10.5% of 19 is 1.995.
 * `wilsonInterval` rounds internally, so passing the raw product gave this
 * function and `scripts/core-readiness.ts` two different `ciHigh` values for
 * the same rule at the same n: the ratchet decided one tier and the
 * readiness table printed another, both derived, neither reconciled. Every
 * caller now reconstructs the count the same way.
 */
export function measurementInterval(
  rule: QADoctorRule,
): WilsonInterval | undefined {
  if (!hasValidMeasurement(rule)) return undefined;
  const m = MEASURED_FP[rule.id];
  if (m === undefined) return undefined;
  return wilsonInterval(Math.round(m.fpRate * m.n), m.n);
}

/**
 * Why a rule's interval does not resolve to a tier, in one sentence.
 *
 * Returned rather than merely implied so the capability matrix, `explain` and
 * the ratchet can all say the SAME reason. "TIER-STRADDLE" on its own tells a
 * reader a decision was declined; it does not tell them how many findings to
 * collect, which is the only actionable part.
 */
export function straddleDetail(rule: QADoctorRule): string | undefined {
  const interval = measurementInterval(rule);
  if (interval === undefined) return undefined;
  if (interval.ciHigh <= CORE_FP_CEILING) return undefined;
  if (interval.ciLow >= QUARANTINE_FP_FLOOR) return undefined;
  const m = MEASURED_FP[rule.id];
  const n = m?.n ?? 0;
  // The n that would settle it, for a rule currently observing zero false
  // positives. Derived rather than quoted so the number stays correct if the
  // ceiling moves: wilson(0, n).ciHigh <= CEILING.
  const nForZeroFp = samplesForZeroFp(CORE_FP_CEILING);
  return (
    `measured FP ${(interval.ciLow * 100).toFixed(1)}–${(interval.ciHigh * 100).toFixed(1)}% ` +
    `(95% Wilson, n=${n}); the interval crosses the ${(CORE_FP_CEILING * 100).toFixed(0)}% core ceiling. ` +
    (nForZeroFp > n
      ? `About ${nForZeroFp} clean samples would settle it.`
      : `Its point estimate is high enough that more samples will not help; it needs a detector change, not a re-measure.`)
  );
}

const Z_SQUARED = 1.959963984540054 ** 2;

/**
 * The sample count a rule observing ZERO false positives needs before its
 * Wilson upper bound falls to `ceiling`.
 *
 * This is the number a maintainer reads to decide what to do about a
 * straddling rule, so it has to be right. It was wrong by a transposition:
 * `z²·p / (p·(1−p)) − z²` simplifies to `z²·p/(1−p)` ≈ 0.43 at the 10%
 * ceiling, and `Math.ceil` turned that into **"about 1 clean sample would
 * settle it"** for every straddling rule.
 *
 * For zero successes the Wilson upper bound collapses to
 * `ciHigh(0, n) = z² / (n + z²)` — the `p̂ = 0` term vanishes from `center`
 * and from the radicand, leaving the two halves of `center ± half` equal.
 * Solving `z²/(n + z²) ≤ c` for `n` gives `n ≥ z²(1 − c) / c`:
 *
 *     c = 0.1 → n ≥ 34.57 → 35
 *
 * Cross-checked against the interval function itself: `wilsonInterval(0, 34)`
 * gives ciHigh 0.1015 — above the ceiling — and `wilsonInterval(0, 35)` gives
 * 0.0989, which clears it. This function returns 35.
 *
 * The n=34 figure was quoted here as 0.1012, which is not what the function
 * returns. A cross-check exists to be run; one carrying a number that fails
 * when you run it is worse than no cross-check, because it reads as evidence
 * and is not.
 */
export function samplesForZeroFp(ceiling: number): number {
  if (!(ceiling > 0) || ceiling >= 1) return 1;
  return Math.ceil((Z_SQUARED * (1 - ceiling)) / ceiling);
}

/**
 * A rule whose measurement exists, is current, and does not confidently
 * resolve to either tier.
 *
 * The predicate is on the INTERVAL, which is what makes it useful: it names
 * exactly the rules whose evidence is too thin to place, and a re-run of the
 * corpus at a larger sample size can move it. The old point-estimate rule
 * could not straddle, because `fpRate <= 0.1 && n >= 10` was a gate a rule
 * either passed or failed — so a rule at n=10 with 0% observed FP was
 * indistinguishable from one at n=400.
 */
export function isTierStraddling(rule: QADoctorRule): boolean {
  if (rule.tier !== undefined) return false;
  return straddleDetail(rule) !== undefined;
}

/**
 * The tier a rule effectively ships as: its declared tier, or — for the
 * omitted-tier case — what its measurement's interval supports (§11.2 Step 2).
 */
export function effectiveTier(rule: QADoctorRule): Tier {
  if (rule.tier !== undefined) return rule.tier;
  const interval = measurementInterval(rule);
  if (interval === undefined) return "extended";
  if (interval.ciHigh <= CORE_FP_CEILING) return "core";
  if (interval.ciLow >= QUARANTINE_FP_FLOOR) return "quarantine";
  return "extended";
}

/**
 * Display status (§11.2 Step 2 + §07): PROVISIONAL covers both paths to
 * "not honestly measured" — an extended rule without a valid measurement
 * (the D3 demotion display) and a core rule whose measurement went stale
 * via a detectorRevision mismatch (§07: stale → provisional →
 * re-measure; the §20.3 registry ratchet fails CI for that state, so it
 * is transient, but it must never DISPLAY as measured). UNMEASURED is
 * reserved for quarantine rules without a valid measurement (their cap
 * already makes them advisory; the matrix renders the distinction).
 */
export function ruleStatus(rule: QADoctorRule): RuleStatus {
  // Checked before the tier, because the status is the more specific claim:
  // a straddling rule is `extended` and also straddling, and reporting only
  // the tier would report the half that carries no information.
  if (isTierStraddling(rule)) return "TIER-STRADDLE";
  const tier = effectiveTier(rule);
  const valid = hasValidMeasurement(rule);
  if (tier === "core") return valid ? "MEASURED-CORE" : "PROVISIONAL";
  if (tier === "extended") return valid ? "MEASURED-EXTENDED" : "PROVISIONAL";
  return valid ? "MEASURED-QUARANTINE" : "UNMEASURED";
}

/** The §11.2 Step 2 PROVISIONAL display predicate. */
export function isProvisional(rule: QADoctorRule): boolean {
  return effectiveTier(rule) === "extended" && !hasValidMeasurement(rule);
}

/**
 * Owner ruling 2026-09-08 (E-1, MVP recon audit): RETIRED_RULE_IDS is
 * the canonical source of retirement — quarantine does NOT equal
 * retirement, and a retired rule never counts toward the active census
 * or the measurement KPI.
 */
export function isRetiredRule(ruleId: string): boolean {
  return RETIRED_RULE_IDS.includes(ruleId);
}
