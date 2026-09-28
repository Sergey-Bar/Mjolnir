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
 * docs, `mjolnir doctor`'s tier ratchets, and the capability matrix.
 * NOT a consumer: scan behavior — quarantine is the only tier the
 * pipeline enforces (severity/info + E0 caps, `--strict` filter), and
 * every quarantine rule declares its tier explicitly, so this module
 * cannot change findings (BEHAVIOR-NEUTRAL for scan output by design).
 */

import type { QADoctorRule } from "./rule.js";
import { MEASURED_FP } from "./measured-fp.generated.js";
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

/** A measurement exists but was taken against an older detector. */
export function hasStaleMeasurement(rule: QADoctorRule): boolean {
  const m = MEASURED_FP[rule.id];
  return (
    m !== undefined && m.detectorRevision !== declaredDetectorRevision(rule)
  );
}

/**
 * The confidence interval of a rule's VALID measurement, or undefined when
 * it has none. A stale measurement returns undefined rather than its stale
 * interval: a number derived from an older detector is not evidence about
 * this one, and returning it would let the straddle test pass on stale data.
 */
export function measurementInterval(
  rule: QADoctorRule,
): WilsonInterval | undefined {
  if (!hasValidMeasurement(rule)) return undefined;
  const m = MEASURED_FP[rule.id];
  if (m === undefined) return undefined;
  return wilsonInterval(m.fpRate * m.n, m.n);
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
  const nForZeroFp = Math.ceil(
    (Z_SQUARED * CORE_FP_CEILING) / (CORE_FP_CEILING * (1 - CORE_FP_CEILING)) -
      Z_SQUARED,
  );
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
