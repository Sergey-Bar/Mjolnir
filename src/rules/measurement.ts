/**
 * Measurement-aware tier resolution (Verification Trust Evolution Plan
 * §07/§11.2 Step 2/§20.3) — the code-side closure of defect D3.
 *
 * The omitted-tier default is no longer unconditionally "core". A rule
 * that does not declare a tier resolves to:
 *   - "core"     when it carries a VALID corpus measurement, or
 *   - "extended" when it does not (never silently measured).
 *
 * "PROVISIONAL" is a DISPLAY status, not a tier value: an effective
 * extended rule without a valid measurement (`tier === "extended" &&
 * measured === false`). No schema churn — the tier union is unchanged.
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

export type Tier = "core" | "extended" | "quarantine";

export type RuleStatus =
  | "MEASURED-CORE"
  | "MEASURED-EXTENDED"
  | "MEASURED-QUARANTINE"
  | "PROVISIONAL"
  | "UNMEASURED";

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
 * The tier a rule effectively ships as: its declared tier, or — for the
 * omitted-tier case — the measurement-dependent default (§11.2 Step 2).
 */
export function effectiveTier(rule: QADoctorRule): Tier {
  if (rule.tier !== undefined) return rule.tier;
  if (hasValidMeasurement(rule)) return "core";
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
