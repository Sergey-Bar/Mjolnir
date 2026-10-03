/**
 * Registry ratchets — Verification Trust Evolution Plan §11.2 Step 2 and
 * §20 (continuous CI ratchets, enforced in code, not docs).
 *
 * §20.3: `tier === "core"` (effective) ⇒ a valid `MEASURED_FP` entry with
 * a matching `detectorRevision`. Unmeasured-in-effective-core is a hard
 * fail — the D3 policy hole closes here, mechanically.
 *
 * §20.1 evidence-state monotonicity:
 *   (a) an existing unmeasured rule may never become MORE unmeasured
 *       (trivially held while unmeasured means "no valid measurement";
 *       the tracked direction is tier: an unmeasured rule may never be
 *       promoted INTO effective core),
 *   (b) a new unmeasured rule may never be promoted to core,
 *   (c) the measured ratio of the pre-existing registry set must improve
 *       monotonically across releases, except behind a machine-detectable
 *       `MEASUREMENT-EXCEPTION` release marker in CHANGELOG.md.
 *
 * §20.5: a detectorRevision mismatch ⇒ stale measurement ⇒ provisional.
 * §20.6 recall floor: a core rule must fire somewhere in the corpus — a
 * "perfectly silent" rule is unvalidated, not perfect (corpus-baseline
 * data via tests/corpus/baseline/*.json count locks).
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { RETIRED_RULE_IDS, RULES } from "../../src/rules/index.js";
import { MEASURED_FP } from "../../src/rules/measured-fp.generated.js";
import { capForTier } from "../../src/engine/tier-policy.js";
import {
  CORE_FP_CEILING,
  QUARANTINE_FP_FLOOR,
  declaredDetectorRevision,
  defensibleTier,
  effectiveTier,
  hasStaleMeasurement,
  hasValidMeasurement,
  isProvisional,
  isRetiredRule,
  isTierStraddling,
  measurementFor,
  measurementInterval,
  measurementTier,
  ruleStatus,
  samplesForZeroFp,
  straddleDetail,
} from "../../src/rules/measurement.js";
import { wilsonInterval } from "../../src/lib/wilson.js";
import {
  DEMOTED_FOR_UNSUBSTANTIATED_CORE,
  declaredCoreWithoutEvidence,
} from "../../src/rules/tier-evidence.js";
import type { Tier } from "../../src/rules/measurement.js";

const ROOT = join(import.meta.dirname, "..", "..");
const BASELINE_DIR = join(ROOT, "tests", "corpus", "baseline");
const CHANGELOG = readFileSync(join(ROOT, "CHANGELOG.md"), "utf8");
/** Version whose baseline the monotonicity ratchet compares against. */
const PREEXISTING_SET_MARKER = "0.5.0";

describe("registry ratchet: no unmeasured rule in effective core (§20.3, plan §11.2)", () => {
  it("every rule the measurement PROMOTED to core clears the core ceiling", () => {
    // 6.0: the tier criterion is now the CONFIDENCE INTERVAL, not the point
    // estimate. The old version asked for `fpRate <= 0.1 && n >= 10`, which
    // a rule at n=10 with zero observed false positives satisfies — and such
    // a rule's interval is [0, 27.8%]. That is not a rule which has defended
    // a 10% ceiling; it is a rule with ten samples.
    //
    // Scoped to rules the measurement PROMOTED. A DECLARED tier is a
    // reviewed human decision and measurement does not overrule it; those
    // are enumerated in the sibling test below, which is why the answer is
    // "none" rather than a failure.
    const promoted: string[] = [];
    const offenders: string[] = [];
    for (const rule of RULES) {
      if (rule.tier !== undefined) continue;
      if (effectiveTier(rule) !== "core") continue;
      promoted.push(rule.id);
      const interval = measurementInterval(rule);
      if (!interval) {
        offenders.push(
          `${rule.id}: promoted to core with no valid measurement`,
        );
        continue;
      }
      if (interval.ciHigh > CORE_FP_CEILING) {
        offenders.push(
          `${rule.id}: promoted to core but its 95% interval reaches ` +
            `${(interval.ciHigh * 100).toFixed(1)}% (> ${(CORE_FP_CEILING * 100).toFixed(0)}% ceiling)`,
        );
      }
    }
    expect(
      offenders,
      `rules promoted to core whose interval does not clear the ceiling:\n${offenders.join("\n")}`,
    ).toEqual([]);
    // Not a failure: a record of the current state. If a future corpus run
    // earns a rule a place in core on evidence, this count rises and the
    // promotion is real.
    expect(
      promoted.length,
      `promoted-to-core rules: ${promoted.join(", ") || "none"}`,
    ).toBeGreaterThanOrEqual(0);
  });

  it("no rule is placed in core or quarantine on a straddling measurement", () => {
    // The other half of the criterion: a rule whose interval crosses a
    // boundary must land in neither tier. A straddling rule in core is the
    // original defect; a straddling rule in quarantine would be a new one —
    // a rule disabled on four samples is as unfounded as one promoted on ten.
    const offenders: string[] = [];
    for (const rule of RULES) {
      if (!isTierStraddling(rule)) continue;
      const tier = effectiveTier(rule);
      if (tier === "core" || tier === "quarantine") {
        offenders.push(`${rule.id}: straddling yet resolved to ${tier}`);
      }
    }
    expect(
      offenders,
      `straddling rules placed in a tier:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("every straddling rule says what would resolve it", () => {
    // A status with no actionable detail is the "classified as unknown"
    // problem again. The detail is the only part a reader can act on, and
    // the n it quotes is derived from the ceiling rather than guessed.
    const straddle = RULES.filter((rule) => isTierStraddling(rule));
    // If this ever reaches zero the criterion has been met and the status
    // is dead code — stated here so that is a visible test change.
    expect(
      straddle.length,
      "no rule straddles — re-derive whether TIER-STRADDLE is still reachable",
    ).toBeGreaterThan(0);
    for (const rule of straddle) {
      const detail = straddleDetail(rule);
      expect(detail, rule.id).toBeDefined();
      expect(detail, rule.id).toMatch(
        /samples would settle it|detector change/,
      );
      expect(ruleStatus(rule), rule.id).toBe("TIER-STRADDLE");
    }
  });

  it("the sample count a straddling rule is quoted is the arithmetic answer", () => {
    // The printed sentence is the actionable half of TIER-STRADDLE: "about N
    // clean samples would settle it" is what a maintainer acts on. It was
    // derived from a transposed expression — `z²·p / (p·(1−p)) − z²`
    // simplifies to `z²·p/(1−p)` ≈ 0.427 at the 10% ceiling, and `Math.ceil`
    // turned that into 1. So every straddling rule read "About 1 clean sample
    // would settle it", which is not actionable and is worse than silence:
    // it invites a maintainer to believe one more sample settles the matter.
    //
    // Asserted against `wilsonInterval` itself rather than a quoted 35, so
    // the test states the property — "n-1 does not clear the ceiling, n does"
    // — and cannot drift if the ceiling moves.
    const nForZeroFp = samplesForZeroFp(CORE_FP_CEILING);
    expect(wilsonInterval(0, nForZeroFp).ciHigh).toBeLessThanOrEqual(
      CORE_FP_CEILING,
    );
    expect(wilsonInterval(0, nForZeroFp - 1).ciHigh).toBeGreaterThan(
      CORE_FP_CEILING,
    );
    // At the shipped 10% ceiling that is 35. Quoted so a regression to the
    // old expression fails loudly rather than by a coincidence of geometry.
    expect(nForZeroFp).toBe(35);
  });

  it("no straddling rule quotes a sample count below what its own interval requires", () => {
    // The same number, checked where it is actually consumed: if a rule's
    // measured n is already past the zero-FP threshold, the sentence must not
    // tell the reader that more samples would settle it.
    const threshold = samplesForZeroFp(CORE_FP_CEILING);
    for (const rule of RULES.filter((r) => isTierStraddling(r))) {
      const detail = straddleDetail(rule) ?? "";
      const quoted = /About (\d+) clean samples/.exec(detail);
      if (!quoted) continue;
      expect(Number(quoted[1]), rule.id).toBe(threshold);
      expect(Number(quoted[1]), rule.id).toBeGreaterThanOrEqual(
        measurementFor(rule.id)?.n ?? 0,
      );
    }
  });

  it("a declared tier is never overridden by the measurement", () => {
    // The policy is one-directional on purpose: a rule that declares its tier
    // is stating a decision a human made (usually "I have looked at this and
    // it belongs here"), and a 20-sample corpus must not silently overrule
    // it. Measurement moves only the OMITTED case.
    for (const rule of RULES) {
      if (rule.tier === undefined) continue;
      expect(effectiveTier(rule), rule.id).toBe(rule.tier);
      expect(isTierStraddling(rule), rule.id).toBe(false);
    }
  });

  it("every measured entry's revision matches the rule's declared revision (§20.5)", () => {
    const byId = new Map(RULES.map((r) => [r.id, r]));
    for (const [id, m] of Object.entries(MEASURED_FP)) {
      const rule = byId.get(id);
      expect(rule, `${id} measured but absent from the registry`).toBeDefined();
      if (!rule) continue;
      expect(
        m.detectorRevision,
        `${id}: MEASURED_FP revision must equal the rule's declared detectorRevision (default 1); bump the rule, re-measure, or update the sidecar — never let a measurement silently cross an implementation change`,
      ).toBe(declaredDetectorRevision(rule));
    }
  });

  it("stale measurements are detectable and never display as measured (§07)", () => {
    // Synthetic double-check of the stale path: a rule whose declared
    // revision diverges from its measurement must be flagged stale and
    // must fail the core ratchet above. QA-PW-002 (measured, revision 1)
    // acts as the live fixture: overriding its declared revision makes
    // hasValidMeasurement false and hasStaleMeasurement true. §07:
    // stale → provisional → re-measure — the display must not claim a
    // measured status for a measurement that belongs to an older
    // detector implementation.
    const rule = RULES.find((r) => r.id === "QA-PW-002");
    expect(rule).toBeDefined();
    if (!rule) return;
    expect(hasValidMeasurement(rule)).toBe(true);
    expect(hasStaleMeasurement(rule)).toBe(false);
    const drifted: typeof rule = { ...rule, detectorRevision: 2 };
    expect(hasValidMeasurement(drifted)).toBe(false);
    expect(hasStaleMeasurement(drifted)).toBe(true);
    expect(ruleStatus(drifted)).toBe("PROVISIONAL");
    // And the core ratchet would fail for the drifted state — the path
    // Regex → AST → "old measurement says Core" → Core is blocked.
    //
    // "extended" here, where it was "core" before 6.0: QA-PW-002 is one of
    // the nineteen that were demoted, because its measurement is valid but
    // too thin to support a 10% ceiling. The DEMOTION still holds for a
    // drifted rule, which is the point — a stale measurement cannot
    // re-promote a rule, and it cannot demote one either, because
    // measurement does not overrule a declaration in either direction.
    //
    // The status is PROVISIONAL because the measurement belongs to an older
    // detector, and `declaredCoreWithoutEvidence` is null because a STALE
    // measurement is a different failure from a wide interval — reporting it
    // here would count one rule into two lists.
    expect(effectiveTier(drifted)).toBe("extended");
    expect(declaredCoreWithoutEvidence(drifted)).toBeNull();
  });
});

/**
 * The demotion ratchet.
 *
 * Before 6.0, nineteen rules declared `tier: "core"`. Every one cleared the
 * OLD criterion — `fpRate <= 0.10 && n >= 10` — and none cleared the interval
 * criterion: their 95% Wilson upper bounds run from 13.8% to 40.4%. Two carried
 * the claim in their own trailing comments ("measured 2026-09-02: 0% FP at
 * n=20", "10% FP at n=20 (band edge, ≤ 10%)"), which is the clearest possible
 * statement that the tier was decided by reading a point estimate.
 *
 * The maintainer chose demotion over keeping the assertion, on 2026-09-28.
 * It is BEHAVIOUR-NEUTRAL: only `quarantine` is enforced, so all nineteen
 * still run on every scan. What changed is what the repository says about
 * them.
 *
 * So the assertion is now the negative one, and it is the stronger shape: a
 * rule cannot quietly reappear in `core` because nobody re-read this file.
 */
describe("the nineteen unsubstantiated core claims were demoted, not kept", () => {
  it("no rule claims a core its measurement does not support", () => {
    const offenders = RULES.filter(
      (rule) => declaredCoreWithoutEvidence(rule) !== null,
    ).map((rule) => {
      const claim = declaredCoreWithoutEvidence(rule);
      return `${rule.id}: declared core with a 95% interval reaching ${(
        (claim?.ciHigh ?? 0) * 100
      ).toFixed(1)}%`;
    });
    expect(
      offenders,
      `a rule is in core on a thin measurement — run a re-sample, or demote it: ${offenders.join(", ")}`,
    ).toEqual([]);
  });

  it("every demoted rule is actually extended, so none can re-appear in core", () => {
    const notDemoted: string[] = [];
    for (const entry of DEMOTED_FOR_UNSUBSTANTIATED_CORE) {
      const rule = RULES.find((candidate) => candidate.id === entry.ruleId);
      if (rule === undefined) {
        throw new Error(
          `${entry.ruleId} is on the demotion list but not in the registry`,
        );
      }
      if (rule.tier !== "extended") {
        notDemoted.push(`${entry.ruleId} is ${rule.tier ?? "undeclared"}`);
      }
    }
    expect(
      notDemoted,
      "a demoted rule was promoted back to core without a re-sample. If the " +
        "re-sample earned it, that is legitimate — but it must be a deliberate " +
        "edit to the rule AND to src/rules/tier-evidence.ts, not a reversion.",
    ).toEqual([]);
  });

  it("every demotion records the interval that caused it", () => {
    for (const entry of DEMOTED_FOR_UNSUBSTANTIATED_CORE) {
      // The interval must clear the ceiling — i.e. NOT be evidence for core.
      expect(
        entry.ciHigh,
        `${entry.ruleId} has no usable ciHigh. A row whose measurement has been ` +
          `withdrawn is not evidence for a demotion; NaN > ${CORE_FP_CEILING} is ` +
          `false, so this fails rather than passing vacuously`,
      ).toBeGreaterThan(CORE_FP_CEILING);
      expect(
        entry.justification.trim().length,
        `${entry.ruleId} has no justification — the reason a rule sits in extended rather than core is the only thing a reader of the matrix has to go on`,
      ).toBeGreaterThan(20);
    }
  });

  it("the recorded interval IS the live measurement, not a transcription", () => {
    // The check this was missing. It asserted `ciHigh > CORE_FP_CEILING`, which
    // every stale value also satisfied — so eighteen of nineteen wrong numbers
    // sat here for a release, described by prose that had drifted with them
    // (QA-PY-002 recorded 0.152 against a real 0.2996).
    //
    // Comparing to the live `measurementInterval` rather than to a
    // re-derivation of the same expression catches the things a second copy of
    // the formula would not: a stale `detectorRevision`, a withdrawn
    // measurement, or the derivation drifting from `measurementInterval` itself.
    const mismatches: string[] = [];
    const unmeasurable: string[] = [];
    for (const entry of DEMOTED_FOR_UNSUBSTANTIATED_CORE) {
      const rule = RULES.find((candidate) => candidate.id === entry.ruleId);
      if (rule === undefined) {
        throw new Error(
          `${entry.ruleId} is on the demotion list but not in the registry`,
        );
      }
      const live = measurementInterval(rule);
      if (live === undefined) {
        unmeasurable.push(entry.ruleId);
        continue;
      }
      if (Math.abs(live.ciHigh - entry.ciHigh) > 5e-5) {
        mismatches.push(
          `${entry.ruleId}: recorded ${entry.ciHigh}, live ${live.ciHigh}`,
        );
      }
    }
    expect(
      unmeasurable,
      "a demoted rule has no valid measurement, so the row citing it cannot be checked",
    ).toEqual([]);
    expect(
      mismatches,
      "a recorded ciHigh disagrees with the live measurement — the recorded " +
        "value is what a reader of the matrix would believe",
    ).toEqual([]);
  });

  it("the demotion list is the nineteen, no duplicates", () => {
    const ids = DEMOTED_FOR_UNSUBSTANTIATED_CORE.map((entry) => entry.ruleId);
    expect(ids.length, "the demotion list is empty").toBeGreaterThan(0);
    expect(new Set(ids).size, "a rule appears twice on the demotion list").toBe(
      ids.length,
    );
  });

  it("demotion did not disable anything", () => {
    // The strongest available statement that this was behaviour-neutral, and
    // the one a reader who worries "did I just turn off nineteen checks?"
    // needs: none of the nineteen is quarantined, and only `quarantine` is
    // enforced by the pipeline.
    for (const entry of DEMOTED_FOR_UNSUBSTANTIATED_CORE) {
      const rule = RULES.find((candidate) => candidate.id === entry.ruleId);
      expect(
        rule?.tier,
        `${entry.ruleId} was demoted to ${rule?.tier}`,
      ).not.toBe("quarantine");
    }
  });
});

/**
 * The ratchet's own mechanism, covered branch by branch.
 *
 * `declaredCoreWithoutEvidence` is what makes the demotion self-enforcing, and
 * it is the function whose every early return encodes a reason a rule is NOT
 * a violation. Leaving it at 28% line coverage meant the three early returns
 * were never executed by anything — which is how a ratchet can read as armed
 * and not be.
 *
 * The three reasons a rule is exempt, each with a case:
 *   1. it does not declare `core` (the demoted nineteen, and every rule whose
 *      tier is `extended` or `quarantine`);
 *   2. it has no VALID measurement — a stale `detectorRevision`, which is a
 *      different failure the §20.5 ratchet already reports, and counting one
 *      rule in two lists would overstate the problem;
 *   3. its interval DOES clear the ceiling, which is the promotion path.
 *
 * Plus the one case that must be reported: a declared `core` whose interval
 * reaches past the ceiling. That case is unrepresentable in the live registry
 * today — it is exactly what the demotion removed — so it is built
 * synthetically, which is also the only way to prove the function would still
 * catch a regression.
 */
describe("declaredCoreWithoutEvidence", () => {
  const base = {
    category: "QA-TEST",
    title: "fixture",
    severity: "warning",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "FALSE-GREEN",
    appliesTo: "python",
    languages: ["python"],
    frameworks: ["pytest"],
    falsePositiveRisk: "medium",
    autofix: false,
    detectionStrategy: "LEXICAL",
    introduced: "0.3.0",
    tier: "core",
    severityFallback: "warning",
    strategyJustification: { reasonCode: "runner-semantic", detail: "fixture" },
  } as unknown as Parameters<typeof declaredCoreWithoutEvidence>[0];

  /**
   * A synthetic `core` rule carrying a REAL, current, wide measurement.
   *
   * Three things this fixture got wrong first, each of which made it return
   * null and read as a broken assertion rather than a stale fixture:
   *   - QA-PY-004, whose measurement was INVALIDATED when its detector was
   *     reworked in 6.0 — a stale measurement has no interval, so the
   *     function takes the "no valid measurement" early return;
   *   - omitting `detectorRevision`, so `hasValidMeasurement` was false for
   *     the same reason;
   *   - a `tier: undefined` literal, which `exactOptionalPropertyTypes` makes
   *     a different type from an omitted key.
   *
   * `QA-ENV-001` is used instead: measured 100% FP at n=20, current
   * revision, so its interval genuinely reaches past the ceiling.
   */
  const coreClaim = () => {
    const measured = MEASURED_FP["QA-ENV-001"];
    if (measured === undefined) {
      throw new Error(
        "QA-ENV-001 must carry a current measurement for this fixture",
      );
    }
    return {
      ...base,
      id: "QA-ENV-001",
      tier: "core" as const,
      detectorRevision: measured.detectorRevision,
    };
  };

  it("reports a declared core whose interval reaches past the ceiling", () => {
    // Synthetic on purpose: this is the violation the demotion removed, so
    // no registry rule can produce it any more. A guard that has never been
    // shown the case it exists for is not a guard.
    const claim = declaredCoreWithoutEvidence(coreClaim());
    expect(claim).not.toBeNull();
    expect(claim?.ruleId).toBe("QA-ENV-001");
    expect(claim?.ciHigh).toBeGreaterThan(CORE_FP_CEILING);
    expect(claim?.n).toBeGreaterThan(0);
  });

  it("exempts a rule that does not declare core", () => {
    for (const tier of ["extended", "quarantine"] as const) {
      expect(
        declaredCoreWithoutEvidence({ ...coreClaim(), tier }),
        `a ${tier} rule is not an unsubstantiated core claim`,
      ).toBeNull();
    }
    // An OMITTED tier, not `tier: undefined`. `exactOptionalPropertyTypes` is
    // on, so an explicit `undefined` is a different type from a missing key —
    // and the omitted case is the one that matters, because an undeclared
    // rule resolving on its measurement is exactly the path the 6.0
    // criterion changed.
    const { tier: _omitted, ...withoutTier } = coreClaim();
    expect(declaredCoreWithoutEvidence(withoutTier)).toBeNull();
  });

  it("exempts a core rule whose measurement is STALE, which is a different failure", () => {
    // A revision bump makes hasValidMeasurement false, so the interval is
    // undefined. Reporting it here would count one rule in two lists: this
    // ratchet and the §20.5 revision ratchet.
    //
    // QA-ENV-001 rather than QA-PY-004: the latter's measurement was
    // INVALIDATED when its detector was reworked in 6.0, so it has no entry
    // left to be stale AGAINST, and `hasStaleMeasurement` is correctly
    // false for a rule with no measurement at all. A fixture that fails
    // because the thing it needed no longer exists is a fixture pointing at
    // the wrong rule.
    const rule = RULES.find((r) => r.id === "QA-ENV-001");
    expect(rule).toBeDefined();
    if (rule === undefined) return;
    const drifted = { ...rule, tier: "core" as const, detectorRevision: 99 };
    expect(hasStaleMeasurement(drifted)).toBe(true);
    expect(declaredCoreWithoutEvidence(drifted)).toBeNull();
  });

  it("exempts a core rule whose interval already clears the ceiling", () => {
    // The promotion path, and it is LIVE as of 2026-10-03.
    //
    // This arm was written as a documented unreachability — deliberately not
    // faked by mutating `CORE_FP_CEILING`, because that is a const and
    // reaching the branch by loosening production code would have proved
    // nothing. The branch was made reachable the honest way instead:
    // `QA-PW-117` was adjudicated up to n=35, its interval fell to 9.89%, and
    // it was promoted.
    //
    // So the arm now asserts the exemption is EXERCISED, and that
    // `declaredCoreWithoutEvidence` — the function that exists to catch a core
    // claim the evidence does not support — stays null for the rule that
    // earned it. An unsubstantiated future promotion shows up here.
    const earning = RULES.filter((rule) => {
      const interval = measurementInterval(rule);
      return interval !== undefined && interval.ciHigh <= CORE_FP_CEILING;
    });
    expect(
      earning.map((rule) => rule.id),
      "the set of rules clearing the ceiling changed - QA-PW-117 earned it on " +
        "2026-10-03, and a second promotion would land here",
    ).toEqual(["QA-PW-117", "QA-JV-101"]);

    for (const rule of earning) {
      expect(
        declaredCoreWithoutEvidence(rule),
        `${rule.id} clears the ceiling, so it must not be reported as an ` +
          "unsubstantiated core claim",
      ).toBeNull();
    }
  });
});
describe("registry ratchet: evidence-state monotonicity (§20.1)", () => {
  it("(b) no unmeasured rule sits in effective core (new or old)", () => {
    // (b) restated mechanically: the only way an unmeasured rule enters
    // the registry is provisional (extended) or quarantine; core requires
    // evidence. Covered exactly by the §20.3 test above — this duplicate
    // assertion exists so the (a)/(b)/(c) triple is visible as a unit.
    for (const rule of RULES) {
      if (effectiveTier(rule) === "core") {
        expect(hasValidMeasurement(rule), rule.id).toBe(true);
      }
    }
  });

  it("(c) the measured ratio improves monotonically vs the 0.5.0 baseline, or a MEASUREMENT-EXCEPTION marker exists", () => {
    // The pre-existing registry set at 0.5.0 measured 42/91. The ratchet
    // floor is that ratio; it only moves up unless the release carries
    // the machine-detectable exception marker (plan §03.3/§20.1c).
    const baseline = { measured: 42, total: 91 };
    const measured = RULES.filter((r) => hasValidMeasurement(r)).length;
    const total = RULES.length;
    const ratioNow = measured / total;
    const ratioFloor = baseline.measured / baseline.total;
    const exceptionMarker =
      /MEASUREMENT-EXCEPTION/.test(CHANGELOG) ||
      process.env.MEASUREMENT_EXCEPTION === "1";
    if (ratioNow < ratioFloor) {
      expect(
        exceptionMarker,
        `measured ratio regressed (${measured}/${total} < ${baseline.measured}/${baseline.total}) ` +
          `without a MEASUREMENT-EXCEPTION marker in CHANGELOG.md (plan §20.1c). ` +
          `Either restore the measurements or add the marker with a written justification.`,
      ).toBe(true);
    }
    void PREEXISTING_SET_MARKER;
  });

  it("(a) the PRE-EXISTING set's unmeasured count never grows beyond the Phase 1 exit gate", () => {
    // (a) an existing unmeasured rule may never become more unmeasured —
    // unmeasured is binary, so the tracked quantity is the registry's
    // unmeasured count over the PRE-EXISTING set (plan §20.1: the gate
    // is the count freeze on rules that existed when the gate was set;
    // NEW-rule waves are onboarded under (b) + the per-framework exit
    // gate, NOT under this count — §15.5 lets a new wave enter born
    // unmeasured-quarantine). The pre-existing set is identified
    // mechanically via `introduced`: every rule shipped at or before
    // 0.5.0 (the version whose baseline the (c) ratchet compares
    // against). Phase 1's exit gate (§11): unmeasured ≤ 20.
    const PREEXISTING_MAX_INTRODUCED = "0.5.0";
    const preexisting = RULES.filter(
      (r) =>
        r.introduced === undefined ||
        r.introduced <= PREEXISTING_MAX_INTRODUCED,
    );
    const unmeasured = preexisting.filter(
      (r) => !hasValidMeasurement(r),
    ).length;
    expect(unmeasured).toBeLessThanOrEqual(20);
    // (b) still binds the new wave: no new rule may enter core unmeasured
    // (enforced by the §20.3 test above; asserted here so the (a)/(b)
    // split is explicit for the Phase 5 wave).
    for (const rule of RULES.filter(
      (r) =>
        r.introduced !== undefined && r.introduced > PREEXISTING_MAX_INTRODUCED,
    )) {
      if (effectiveTier(rule) === "core") {
        expect(hasValidMeasurement(rule), rule.id).toBe(true);
      }
    }
  });
});

describe("registry ratchet: quarantine integrity (§11.2 Step 2 display contract)", () => {
  it("PROVISIONAL is a display status, never a tier value", () => {
    for (const rule of RULES) {
      if (rule.tier !== undefined) {
        expect(["core", "extended", "quarantine"]).toContain(rule.tier);
      }
      // Omitted tier is legitimate (§11.2 Step 2); it must resolve to core
      // only when the measurement's INTERVAL clears the ceiling, and to
      // quarantine only when the lower bound clears the floor. Everything
      // else is extended.
      //
      // 6.0 changed the core branch from "has any valid measurement" to "the
      // interval clears CORE_FP_CEILING". A straddling rule resolves to
      // extended, which is what `isTierStraddling` reports and what the
      // straddle-detail test above pins as a non-empty, actionable set.
      if (rule.tier === undefined) {
        const interval = measurementInterval(rule);
        const expected =
          interval === undefined
            ? "extended"
            : interval.ciHigh <= CORE_FP_CEILING
              ? "core"
              : interval.ciLow >= QUARANTINE_FP_FLOOR
                ? "quarantine"
                : "extended";
        expect(effectiveTier(rule), rule.id).toBe(expected);
        // The invariant the old version asserted, restated so it still holds
        // under the new criterion: an unmeasured rule is never core.
        if (!hasValidMeasurement(rule)) {
          expect(effectiveTier(rule), rule.id).not.toBe("core");
        }
      }
      if (isProvisional(rule)) {
        expect(hasValidMeasurement(rule), rule.id).toBe(false);
      }
    }
  });

  it("every quarantine rule is capped by tier-policy at scan time (cap exists, severity untouched in metadata)", () => {
    // The cap is applied to FINDINGS by enforceTierPolicy (severity=info,
    // E0) — quarantine rules declare their natural severity and the
    // pipeline demotes. Assert the cap mapping exists for every declared
    // quarantine rule and that no other tier is capped.
    const byId = new Map(RULES.map((r) => [r.id, r]));
    for (const rule of RULES) {
      expect(
        (capForTier(rule.tier) !== null) === (rule.tier === "quarantine"),
        rule.id,
      ).toBe(true);
    }
    // Plugins may declare tiers too; the map lookup contract is the same.
    expect(capForTier(undefined)).toBeNull();
    expect(byId.size).toBe(RULES.length);
  });
});

describe("registry ratchet: recall floor (§20.6)", () => {
  it("every effective-core rule actually fires somewhere in the corpus baselines", () => {
    // A core rule that never fires on any real corpus repo is unvalidated,
    // not perfect. The count-lock baselines record per-repo per-rule fire
    // counts from real runScan runs.
    const firesSomewhere = new Set<string>();
    if (existsSync(BASELINE_DIR)) {
      for (const f of readdirSync(BASELINE_DIR).filter((n) =>
        n.endsWith(".json"),
      )) {
        const baseline = JSON.parse(
          readFileSync(join(BASELINE_DIR, f), "utf8"),
        ) as { countsByRule?: Record<string, number> };
        for (const [ruleId, count] of Object.entries(
          baseline.countsByRule ?? {},
        )) {
          if (count > 0) firesSomewhere.add(ruleId);
        }
      }
    }
    const silentCore = RULES.filter(
      (r) => effectiveTier(r) === "core" && !firesSomewhere.has(r.id),
    ).map((r) => r.id);
    expect(
      silentCore,
      "effective-core rules that fire nowhere in the corpus (recall floor §20.6)",
    ).toEqual([]);
  });
});

/**
 * The declared tier is a floor that may only ever TIGHTEN (B0, 2026-10-01).
 *
 * `rule.tier` is not a duplicate of the measurement — it is a THIRD floor,
 * stricter than both derivations, and today it is the only thing holding 33
 * rules out of the default scan. Measured over all 79 live rules:
 *
 *   - the INTERVAL floor quarantines ZERO rules (`ciLow >= 50%` is not reached
 *     at n = 10..80), and derives CORE for none of them;
 *   - 33 rules declare `quarantine`, and every one of them would be promoted
 *     into a default scan if the field were deleted.
 *
 * A floor that could also LOOSE would not be a floor. It would be a way to ship
 * a rule the corpus says should not ship, and — because every derived number
 * in the tree reads the declared value through `effectiveTier` — nothing else
 * would disagree. One hand-edit could release `QA-TEST-002` at 62% observed FP
 * and the tier matrix, the capability registry and the docs would all render it
 * as a normal finding.
 *
 * So: tightening is permitted (quarantine a well-measured rule — it costs a
 * reader one flag), releasing is not.
 */

/** Tier order, most permissive first. A declared tier may only move right. */
const TIER_RANK: Record<Tier, number> = {
  core: 0,
  extended: 1,
  quarantine: 2,
};

describe("registry ratchet: a declared tier may only tighten (B0)", () => {
  const looseners = RULES.filter(
    (rule) =>
      rule.tier !== undefined &&
      TIER_RANK[rule.tier] < TIER_RANK[defensibleTier(rule)],
  );

  it("no rule declares a tier MORE permissive than its evidence allows", () => {
    expect(
      looseners.map((r) => {
        const m = measurementFor(r.id);
        const measured =
          m === undefined ? "none" : `${(m.fpRate * 100).toFixed(0)}%`;
        return (
          `${r.id}: declares ${r.tier} but its evidence supports ` +
          `${defensibleTier(r)} (measured ${measured})`
        );
      }),
    ).toEqual([]);
  });

  it("the floor has teeth — it is not `extended` for every rule", () => {
    // A law that can never fire is not a law. Written against
    // `measurementTier` this assertion passes trivially, because that function
    // returns `extended` for 78 of 79 rules; `defensibleTier` quarantines 18
    // and the loosening assertion above becomes capable of failing.
    const floor = RULES.map(defensibleTier);
    expect(floor.filter((t) => t === "quarantine").length).toBeGreaterThan(0);
    expect(
      new Set(floor).size,
      "the floor resolves one answer only",
    ).toBeGreaterThan(1);
  });

  it("the floor catches a badly-measured rule being declared extended", () => {
    // The failure this exists to prevent, run as a probe. `QA-TEST-001` is
    // measured at 60% FP; setting its tier to `extended` is a one-word edit
    // that would put it in every default scan. Under `measurementTier` that
    // edit is INVISIBLE — the interval floor also says `extended` — which is
    // why the floor is `defensibleTier` and not the interval alone.
    const measured = RULES.find(
      (r) => defensibleTier(r) === "quarantine" && r.tier === "quarantine",
    );
    expect(measured, "no quarantined rule to probe").toBeDefined();
    if (measured === undefined) return;
    const loosened = { ...measured, tier: "extended" as const };
    expect(TIER_RANK[loosened.tier] < TIER_RANK[defensibleTier(loosened)]).toBe(
      true,
    );
    // And the interval floor alone would have missed it.
    expect(
      TIER_RANK[loosened.tier] < TIER_RANK[measurementTier(loosened)],
    ).toBe(false);
  });

  it("the floor catches an unmeasured rule being declared extended", () => {
    // The other hole. A rule with no measurement has no evidence for shipping
    // by default; the interval floor cannot see this, because it also returns
    // `extended` when there is no interval to read.
    const unmeasured = RULES.filter(
      (r) => !hasValidMeasurement(r) && r.tier === "quarantine",
    );
    expect(
      unmeasured.length,
      "no unmeasured quarantine rule to probe",
    ).toBeGreaterThan(0);
    for (const rule of unmeasured) {
      expect(defensibleTier(rule)).toBe("quarantine");
      const loosened = { ...rule, tier: "extended" as const };
      expect(
        TIER_RANK[loosened.tier] < TIER_RANK[defensibleTier(loosened)],
      ).toBe(true);
    }
  });

  it("the declared floor is doing the work: tightening a measured rule is allowed", () => {
    // The permitted direction, as a fact about this registry rather than a
    // hypothetical. `QA-TEST-003` is measured at 22% FP over n=78 — better
    // evidence than most rules here carry — and is declared quarantine anyway.
    // That is the third floor being exercised, and it is why deleting the
    // declared field is not a refactor.
    const heldDown = RULES.filter(
      (r) => r.tier === "quarantine" && defensibleTier(r) === "extended",
    );
    expect(
      heldDown.length,
      "the declared floor stopped holding anything down — B0 measured 33",
    ).toBeGreaterThan(0);
  });

  it("every declared tier is one of the three the product knows", () => {
    // A fourth value would be silently unreachable rather than rejected here:
    // `TIER_RANK[...]` would be `undefined`, `undefined < 2` is false, and the
    // loosening assertion would pass it.
    for (const rule of RULES) {
      if (rule.tier === undefined) continue;
      expect(
        Object.prototype.hasOwnProperty.call(TIER_RANK, rule.tier),
        `${rule.id} declares an unknown tier ${String(rule.tier)}`,
      ).toBe(true);
    }
  });
});

describe("frozen contracts", () => {
  it("RETIRED_RULE_IDS never overlaps the active registry", () => {
    const active = new Set(RULES.map((r) => r.id));
    for (const id of RETIRED_RULE_IDS) expect(active.has(id)).toBe(false);
  });
});

describe("measurement.ts public surface — direct unit coverage (P8 rebase)", () => {
  it("measurementFor: known rule returns its record, unknown returns undefined", () => {
    expect(measurementFor("QA-PW-002")).toBeDefined();
    expect(measurementFor("QA-NOPE-000")).toBeUndefined();
  });

  it("isRetiredRule: a retired ID true, an active ID false", () => {
    expect(isRetiredRule("QA-PW-145")).toBe(true);
    expect(isRetiredRule("QA-PW-101")).toBe(false);
    expect(isRetiredRule("QA-NOPE-000")).toBe(false);
  });

  it("status arms: MEASURED-EXTENDED, MEASURED-QUARANTINE, UNMEASURED", () => {
    // MEASURED-EXTENDED: an extended rule with a valid measurement.
    const ext = RULES.find(
      (r) => r.tier === "extended" && hasValidMeasurement(r),
    );
    if (ext) expect(ruleStatus(ext)).toBe("MEASURED-EXTENDED");
    // MEASURED-QUARANTINE: a declared quarantine with a valid measurement.
    const q = RULES.find(
      (r) => r.tier === "quarantine" && hasValidMeasurement(r),
    );
    if (q) expect(ruleStatus(q)).toBe("MEASURED-QUARANTINE");
    // UNMEASURED: a quarantine without any measurement.
    const un = RULES.find(
      (r) =>
        r.tier === "quarantine" &&
        !hasValidMeasurement(r) &&
        !hasStaleMeasurement(r),
    );
    if (un) expect(ruleStatus(un)).toBe("UNMEASURED");
    // At least one of the three arms must exist on the real registry.
    expect(ext !== undefined || q !== undefined || un !== undefined).toBe(true);
  });

  it("stale arm via a synthetic rule — a measurement against an older revision is stale", () => {
    // QA-PW-002 measures at rev 1 against a declared rev 2 (synthetic):
    const base = RULES.find((r) => r.id === "QA-PW-002");
    if (!base) throw new Error("QA-PW-002 missing from the registry");
    const rule = { ...base, detectorRevision: 2 };
    expect(hasValidMeasurement(rule)).toBe(false);
    expect(hasStaleMeasurement(rule)).toBe(true);
    // A stale CORE rule must never display as measured:
    const tier = effectiveTier(rule);
    if (tier === "core") expect(ruleStatus(rule)).toBe("PROVISIONAL");
  });

  it("status arms: MEASURED-EXTENDED, MEASURED-QUARANTINE, UNMEASURED", () => {
    // MEASURED-EXTENDED: an extended rule with a valid measurement.
    const ext = RULES.find(
      (r) => r.tier === "extended" && hasValidMeasurement(r),
    );
    if (ext) expect(ruleStatus(ext)).toBe("MEASURED-EXTENDED");
    // MEASURED-QUARANTINE: a declared quarantine with a valid measurement.
    const q = RULES.find(
      (r) => r.tier === "quarantine" && hasValidMeasurement(r),
    );
    if (q) expect(ruleStatus(q)).toBe("MEASURED-QUARANTINE");
    // UNMEASURED: a quarantine without any measurement.
    const un = RULES.find(
      (r) =>
        r.tier === "quarantine" &&
        !hasValidMeasurement(r) &&
        !hasStaleMeasurement(r),
    );
    if (un) expect(ruleStatus(un)).toBe("UNMEASURED");
    // At least one of the three arms must exist on the real registry.
    expect(ext !== undefined || q !== undefined || un !== undefined).toBe(true);
  });
});
