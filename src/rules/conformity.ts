/**
 * Per-rule conformance, as Conformity Monkey defines it.
 *
 * Netflix's Simian Army member does not decide what a good cloud is. It applies
 * a SET OF DECLARED RULES to every resource, marks the ones that do not
 * conform, records which rule broke on which resource, and notifies the owner.
 * The three properties that make it work, and that this module reproduces:
 *
 *   - the human is not in the DETECTION loop. A machine decides, every hour,
 *     for every resource. There is no queue of things somebody has not got to.
 *   - the human is in the RESPONSE loop. A nonconforming resource is fixed, or
 *     explicitly opted out, and the opt-out is recorded with a reason.
 *   - `leashed` runs the checks and sends nothing. Arming is a separate,
 *     deliberate act — which is how a new check gets rolled out across a fleet
 *     without the first report being a page of red nobody has read yet.
 *
 * THAT IS THE WHOLE DESIGN, and it is why it replaces opinion with arithmetic
 * here rather than pretending to. The corpus false-positive rate asks a human
 * "is this code legitimate?", which is the one question no tree can answer. The
 * five checks below ask questions the tree CAN answer — does a measurement
 * exist, was it taken at the detector revision that produced the finding, is a
 * tier claim owned and unexpired, does the fixture quad have four legs, and is
 * the negative fixture plausibly the positive one with the defect neutralised —
 * and therefore need no judgement, only an owner who reacts.
 *
 * Why a RATCHET over an opt-out registry rather than a gate that fails:
 *
 * Sixty-two of the seventy-nine rules fail at least one check today. A gate that
 * went red on all of them on day one would be red forever and read as noise,
 * which is how the 6.0 raise of `MAX_SAMPLES_PER_RULE` produced 1,121
 * unadjudicated rows nobody looked at. The opt-out registry is the alternative:
 * every known nonconformity is recorded, with an owner, a reason, and a DATE IT
 * LAPSES. The gate then fails on anything new, and — the part that does the real
 * work — on anything whose opt-out has expired. Maximum enforcement that is a
 * mechanism rather than an intention: the debt decays on a schedule instead of
 * persisting because nobody re-looked at it.
 *
 * `UNPROVEN` is deliberately NOT `NONCONFORMING`. A rule with no measurement has
 * not been shown to be wrong; it has not been shown to be right either, and the
 * difference is the difference between a measurement and an absence of one.
 * Collapsing the two is how "zero false positives" comes to describe a rule
 * nobody ever ran.
 *
 * TIER_DEFENSIBLE is not here. `defensibleTier` already enforces it in
 * `tests/rules/registry-ratchet.spec.ts`; a second copy of one check is a second
 * thing to keep in sync with the first, and the drift shows up as a file
 * protected from one gate and not the other.
 */

import { RULES } from "./index.js";
import type { QADoctorRule } from "./rule.js";
import {
  defensibleTier,
  hasStaleMeasurement,
  hasValidMeasurement,
  measurementTier,
} from "./measurement.js";
import { quadFor } from "../v6/fixture-quad-probe.js";
import { MUTANT_MAX_DIVERGENCE, sensitivityOf } from "./fixture-sensitivity.js";

export const CONFORMITY_CHECKS = [
  "MEASURED",
  "DETECTOR_CURRENT",
  "CLAIM_OWNED",
  "QUAD_COMPLETE",
  "PREDICATE_SENSITIVE",
] as const;

export type ConformityCheck = (typeof CONFORMITY_CHECKS)[number];

export interface CheckResult {
  ok: boolean;
  /** What a reader needs to act on it. Never just "failed". */
  detail: string;
}

export type ConformityState = "CONFORMING" | "NONCONFORMING";

export interface RuleConformity {
  ruleId: string;
  /** The tier the rule declares, or `null` when it resolves by measurement. */
  declaredTier: Tier | null;
  /** The floor its own evidence supports. */
  defensibleTier: Tier;
  checks: Record<ConformityCheck, CheckResult>;
  /** The checks that failed, in `CONFORMITY_CHECKS` order. */
  failed: ConformityCheck[];
  state: ConformityState;
  /**
   * Whether the rule has ever been measured. ORTHOGONAL to `state`, and
   * deliberately so.
   *
   * The first version of this module modelled "unmeasured" as a third state
   * beside CONFORMING and NONCONFORMING, and the gate printed
   * `unproven: 0` on its first run — the state was unreachable, because every
   * unmeasured rule here also fails something else and so read
   * NONCONFORMING. A law that can never fire is not a law, and
   * `tests/rules/registry-ratchet.spec.ts` says so about its own floor.
   *
   * The two facts are also genuinely independent: a rule can be measured and
   * still be broken, and unmeasured and otherwise clean. Collapsing them either
   * way loses one.
   */
  unmeasured: boolean;
}

type Tier = "core" | "extended" | "quarantine";

const TODAY = "2026-10-02";

function claimFor(
  rule: QADoctorRule,
): "corePromotion" | "quarantinePromotion" | null {
  if (rule.tier === "core") return "corePromotion";
  if (rule.tier === "quarantine") return "quarantinePromotion";
  // `extended` is the resolution, not a claim. Requiring a promotion record for
  // it would demand paperwork for a default.
  return null;
}

function checkMeasured(rule: QADoctorRule): CheckResult {
  if (hasValidMeasurement(rule)) {
    return { ok: true, detail: "a current measurement exists." };
  }
  return {
    ok: false,
    detail:
      "no valid measurement. A rule nobody measured is UNPROVEN, not clean, " +
      "and cannot be reported as having a low false-positive rate.",
  };
}

function checkDetectorCurrent(rule: QADoctorRule): CheckResult {
  if (!hasStaleMeasurement(rule)) {
    return { ok: true, detail: "measurement taken at the declared revision." };
  }
  return {
    ok: false,
    detail:
      "a measurement exists but was taken against an EARLIER detector " +
      "revision, so the rate describes a detector that no longer ships. It " +
      "reads as current everywhere it is displayed, which is the defect.",
  };
}

function checkClaimOwned(rule: QADoctorRule): CheckResult {
  const field = claimFor(rule);
  if (field === null) {
    return { ok: true, detail: "declares no tier claim." };
  }
  const promotion = rule[field];
  if (promotion === undefined) {
    /**
     * No hand-written record. Before `QA-PW-117`, that was the end of the
     * check and the gap the gate was built to close: a claim with no record is
     * permanent by default.
     *
     * It is no longer the end, because a claim can now be owned by a
     * MEASUREMENT rather than by a person's note. `QA-PW-117` reached n=35 with
     * zero observed false positives, so `measurementTier` returns `core` from
     * its own evidence, and requiring an expiring `corePromotion` on top of
     * that would be worse than redundant — it would fail this gate on the
     * record's expiry date while the measurement still cleared the ceiling,
     * leaving a rule that is simultaneously conforming and failing.
     *
     * So the record is now one of two owners, and the other is arithmetic:
     *
     *   - a `corePromotion` is how a person owns a claim the measurement does
     *     NOT support. That is the case this arm was written for and it still
     *     fails without a record.
     *   - a measurement that independently derives the claimed tier owns
     *     itself. It has an owner (the corpus), a rationale (the FP rate and
     *     its interval), and it cannot silently lapse: it is re-derived on every
     *     run, so a re-sample that widens the interval withdraws the ownership
     *     by itself, with no date for anyone to forget.
     *
     * This is the asymmetry worth naming: the second owner is STRONGER than the
     * first. A hand record has an expiry that has to be renewed; the measurement
     * has a condition that either still holds or does not.
     */
    if (measurementTier(rule) === rule.tier) {
      return {
        ok: true,
        detail:
          `declares tier "${rule.tier}" and the measurement derives the same ` +
          "tier independently — owned by the corpus, not by a note.",
      };
    }
    return {
      ok: false,
      detail:
        `declares tier "${rule.tier}" with no ${field} record, and its measurement ` +
        `derives ${measurementTier(rule)}. The field's own documentation says a claim ` +
        "without one is permanent by default, which is the outcome the tier exists " +
        "to avoid — so the omission is not neutral, it is a decision nobody made.",
    };
  }
  if (promotion.owner.trim().length < 3) {
    return { ok: false, detail: `${field} has no named owner` };
  }
  if (promotion.rationale.trim().length < 24) {
    return {
      ok: false,
      detail: `${field} has no rationale a reader could check`,
    };
  }
  if (promotion.expiresOn !== undefined && promotion.expiresOn < TODAY) {
    return {
      ok: false,
      detail:
        `${field} lapsed on ${promotion.expiresOn}. A claim that is renewed by ` +
        "not being looked at is a default nobody chose.",
    };
  }
  return {
    ok: true,
    detail: `${field} owned by ${promotion.owner}, expires ${promotion.expiresOn}`,
  };
}

function checkQuadComplete(rule: QADoctorRule, root: string): CheckResult {
  const quad = quadFor(rule.id, root);
  if (quad.complete) {
    return { ok: true, detail: "all four fixture legs present." };
  }
  const missing = quad.missing;
  const noMustLegs =
    !quad.present.includes("MUST-FIRE") ||
    !quad.present.includes("MUST-NOT-FIRE");
  return {
    ok: false,
    detail: noMustLegs
      ? `has no MUST-FIRE or MUST-NOT-FIRE fixture (missing ${missing.join(", ") || "both"}). ` +
        "A detector with only positive fixtures cannot be shown to stay quiet."
      : `quad is missing ${missing.join(", ")}. RECALL and PRECISION are ` +
        "generated by running the detector over its own fixtures, so this leg " +
        "needs no human.",
  };
}

/**
 * Is the predicate actually SENSITIVE to the defect it claims to detect?
 *
 * QUAD_COMPLETE asks whether both fixture legs exist. It cannot ask whether the
 * negative one means anything, and that is the whole gap: a hand-written
 * MUST-NOT-FIRE fixture is usually a DIFFERENT PROGRAM that happens not to
 * trigger, and the pair then shows the detector is directional — it fires on the
 * case built for it and is quiet on unrelated code — without showing the
 * predicate responds to the defect at all.
 *
 * A negative fixture is evidence about the predicate only when it is plausibly
 * the positive fixture with the defect neutralised. That is measurable without
 * knowing what the defect is: measure how far the two files diverge.
 *
 * Reported as a separate leg rather than folded into QUAD_COMPLETE because it is
 * a different claim. "Both legs exist" is about coverage and can be satisfied by
 * adding a file. "The negative leg is the defect, removed" is about evidence and
 * cannot.
 *
 * The threshold and the full per-rule classification live in
 * `scripts/check-fixture-sensitivity.ts` and `docs/SENSITIVITY-RATCHET.json`;
 * this reads the same measurement rather than reimplementing it, so the leg and
 * the nightly arm cannot disagree.
 */
function checkPredicateSensitive(
  rule: QADoctorRule,
  root: string,
): CheckResult {
  const measured = sensitivityOf(rule.id, root);
  if (measured === null) {
    return {
      ok: true,
      detail:
        "no paired fixture to compare — QUAD_COMPLETE reports the missing legs, " +
        "and a rule with no negative fixture is not this leg's problem to guess at.",
    };
  }
  if (measured.classification === "MUTANT") {
    return {
      ok: true,
      detail:
        `MUST-NOT-FIRE diverges from MUST-FIRE by ${measured.divergence} ` +
        `(${measured.changedLines} of ${measured.lines} lines) — plausibly the ` +
        "same program with the defect neutralised.",
    };
  }
  return {
    ok: false,
    detail:
      `MUST-NOT-FIRE diverges from MUST-FIRE by ${measured.divergence} ` +
      `(${measured.changedLines} of ${measured.lines} lines, limit ` +
      `${MUTANT_MAX_DIVERGENCE}) — it is a DIFFERENT PROGRAM that does not ` +
      "trigger, so the pair shows the detector is directional and not that the " +
      "predicate is sensitive to the defect. Fixing this needs a recipe for what " +
      "the defect IS, so the neutralised mutant can be generated rather than " +
      "hand-written a second time. See docs/SENSITIVITY-RATCHET.json.",
  };
}

/** One rule's state across all five checks. */
export function conformityOf(rule: QADoctorRule, root: string): RuleConformity {
  const checks: Record<ConformityCheck, CheckResult> = {
    MEASURED: checkMeasured(rule),
    DETECTOR_CURRENT: checkDetectorCurrent(rule),
    CLAIM_OWNED: checkClaimOwned(rule),
    QUAD_COMPLETE: checkQuadComplete(rule, root),
    PREDICATE_SENSITIVE: checkPredicateSensitive(rule, root),
  };
  const failed = CONFORMITY_CHECKS.filter((name) => !checks[name].ok);
  return {
    ruleId: rule.id,
    declaredTier: rule.tier ?? null,
    defensibleTier: defensibleTier(rule),
    checks,
    failed,
    state: failed.length === 0 ? "CONFORMING" : "NONCONFORMING",
    unmeasured: !hasValidMeasurement(rule),
  };
}

/** Every live rule's state, registry order. */
export function allConformity(root: string): RuleConformity[] {
  return RULES.map((rule) => conformityOf(rule, root));
}
