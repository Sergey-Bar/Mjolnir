/**
 * What the tier ladder can and cannot reach at the corpus cap.
 *
 * This file exists because of a measurement, and the measurement was the
 * arithmetic. B0 (2026-10-01) walked all 79 live rules and found that the
 * interval derivation returns `core` for NONE of them and `quarantine` for
 * NONE of them — it has one reachable output on this corpus, and the output is
 * `extended`. That is not a property of the rules; it is a property of two
 * constants chosen independently whose product is empty.
 *
 *   core        needs ciHigh <= 10%.  0/20 reads 16.1%.  Needs n >= 35.
 *   quarantine  needs ciLow  >= 50%.  15/20 reads 50.6%, 14/20 reads 48.1%.
 *
 * The product ships a three-valued tier system in which one value cannot occur
 * and the other requires a 75% error rate to occur. That is not a bug to be
 * tidied; it is the honest consequence of a 10% gate and a sample cap of 20,
 * and it is worth stating in arithmetic rather than leaving a reader to
 * discover it by trying.
 *
 * WHAT THIS TEST IS FOR. It fails LOUDLY the day the arithmetic stops holding,
 * in either direction:
 *
 *   - if someone funds the adjudication — which `--core-candidates` in
 *     scripts/corpus-sample.ts now makes fundable for two rules at a time —
 *     core opens. This test should then say so: that is a product win worth a
 *     diff, and it should be a deliberate one.
 *   - if someone lowers `CORE_FP_CEILING` below 0.162, core opens without any
 *     new sampling at all. Same: the test should notice.
 *
 * A structural fact that is true and silent is a trap for the next person. A
 * structural fact that is true and asserted is a note in the code.
 *
 * THE SECOND DIRECTION FIRED. On 2026-10-03 the first arm fired for real:
 * `QA-PW-117` cleared the ceiling at n=35 / 9.89% and was promoted, so the two
 * arms below now assert the core tier is NON-EMPTY and say what earned it. The
 * arithmetic arms above are unchanged and still true — the ceiling still needs
 * n=35, and it still cannot be reached at the default cap of 20. What changed is
 * that 35 is no longer hypothetical, so a reader can see the whole route in one
 * file: cap 20 -> `--core-candidates` cap 35 -> adjudicate -> n=35 -> promote.
 */

import { describe, expect, it } from "vitest";

import { wilsonInterval } from "../../src/lib/wilson.js";
import {
  CORE_FP_CEILING,
  QUARANTINE_FP_FLOOR,
  measurementFor,
  measurementInterval,
  measurementTier,
  samplesForZeroFp,
} from "../../src/rules/measurement.js";
import { RULES } from "../../src/rules/index.js";
import { declaredCoreWithoutEvidence } from "../../src/rules/tier-evidence.js";
import {
  CORE_CANDIDATE_CAP,
  isCoreCandidate,
  selectCoreCandidates,
} from "../../scripts/lib/core-candidates.js";

/**
 * `MAX_SAMPLES_PER_RULE` in scripts/corpus-sample.ts. Duplicated here as a
 * literal rather than imported on purpose: the script is an executable entry
 * point, and this test is about the CONSTANT'S VALUE, so a change to it should
 * break this file visibly rather than be silently picked up.
 */
const MAX_SAMPLES_PER_RULE = 20;

/** Lowest FP count at `n` whose Wilson lower bound clears `floor`. */
function lowestFpReaching(n: number, floor: number): number | undefined {
  for (let fp = 0; fp <= n; fp++) {
    if (wilsonInterval(fp, n).ciLow >= floor) return fp;
  }
  return undefined;
}

/** Lowest `n` at which zero false positives clears `ceiling`. */
function lowestNReachingCore(ceiling: number, limit = 200): number | undefined {
  for (let n = 1; n <= limit; n++) {
    if (wilsonInterval(0, n).ciHigh <= ceiling) return n;
  }
  return undefined;
}

describe("the core tier is unreachable at the DEFAULT corpus sample cap", () => {
  it("0 false positives at the cap does not clear the core ceiling", () => {
    // The strongest claim a rule can make at n=20 is "I was right every time",
    // and even that leaves an upper bound above the ceiling.
    const best = wilsonInterval(0, MAX_SAMPLES_PER_RULE);
    expect(best.ciHigh).toBeGreaterThan(CORE_FP_CEILING);
  });

  it("core needs a sample size the DEFAULT cap cannot produce", () => {
    const needed = lowestNReachingCore(CORE_FP_CEILING);
    expect(
      needed,
      "core became reachable at the default cap — see the module doc in " +
        "measurement.ts before assuming the tier ladder is still inert",
    ).toBeGreaterThan(MAX_SAMPLES_PER_RULE);
  });

  it("the candidate mode is what makes that size reachable", () => {
    // The same arithmetic, and the mode that funds it. Without this arm the two
    // above would read as "core cannot be earned", which stopped being true
    // when `--core-candidates` landed: the DERIVATION has always been able to
    // produce 35, and the gap was always the sample cap. Asserted in both
    // directions — if the candidate cap ever stopped exceeding the default one,
    // the mode would be decoration and this file should say so rather than let
    // docs/CORE-READINESS.md print a work list nobody can act on.
    const needed = samplesForZeroFp(CORE_FP_CEILING);
    expect(needed).toBe(CORE_CANDIDATE_CAP);
    expect(CORE_CANDIDATE_CAP).toBeGreaterThan(MAX_SAMPLES_PER_RULE);
    // One sample short of the cap is the last state that still fails, and the
    // two rules nearest the ceiling are both in it today.
    expect(wilsonInterval(0, CORE_CANDIDATE_CAP - 1).ciHigh).toBeGreaterThan(
      CORE_FP_CEILING,
    );
    expect(wilsonInterval(0, CORE_CANDIDATE_CAP).ciHigh).toBeLessThanOrEqual(
      CORE_FP_CEILING,
    );
    expect(
      isCoreCandidate("QA-JV-101"),
      "QA-JV-101 earned core on 2026-10-03, the same day as QA-PW-117 - the " +
        "predicate must stop offering to fund a promotion it already has",
    ).toBe(false);
    // QA-PW-117 earned core on 2026-10-03, so the predicate must stop offering
    // to fund a promotion it already has.
    expect(
      isCoreCandidate("QA-PW-117"),
      "QA-PW-117 is core - the candidate predicate is still offering to fund a " +
        "promotion it already has",
    ).toBe(false);
    expect(
      selectCoreCandidates(["QA-PW-113"]),
      "both plan targets have earned core - the funded set is read off " +
        "the live derivation instead, so this cannot name a rule that has moved",
    ).toEqual(["QA-PW-113"]);
  });

  it("the core tier is no longer empty: two rules earned it at n=35", () => {
    // The arm that fired on 2026-10-03, rewritten from "none" to the truth.
    //
    // Pinned by ID rather than by count, because a count passes again after the
    // second promotion and the reader learns nothing. This one is named so a
    // reviewer can check WHERE it came from: 20 keycloak rows adjudicated TP
    // against pinned source plus 4 orphans retracted (n 24 -> 34), then a
    // corpus-wide sweep over all 37 repositories found one more finding, also a
    // TP (n 34 -> 35), taking the Wilson upper bound to 9.89%.
    const core = RULES.filter((r) => measurementTier(r) === "core");
    expect(
      core.map((r) => r.id),
      "the derived-core set changed - if a rule left it the measurement moved " +
        "and docs/FP-AUDIT.md is the record; if one joined, it earned it the " +
        "same way QA-PW-117 did",
    ).toEqual(["QA-PW-117", "QA-JV-101"]);

    // And the promotion is MEASURED, not declared: the measurement reaches core
    // on its own, so `tier: "core"` records a decision the evidence had already
    // made rather than substituting for it.
    const promoted = RULES.find((r) => r.id === "QA-PW-117");
    if (promoted === undefined)
      throw new Error("QA-PW-117 is not in the registry");
    expect(measurementTier(promoted)).toBe("core");
    expect(declaredCoreWithoutEvidence(promoted)).toBeNull();
    const interval = measurementInterval(promoted);
    expect(measurementFor(promoted.id)?.n).toBe(CORE_CANDIDATE_CAP);
    expect(interval?.ciHigh).toBeLessThanOrEqual(CORE_FP_CEILING);
  });

  it("a rule declared core is still held to the measurement, not believed", () => {
    // The type-level gap this arm was written to precede is now closed - one
    // rule holds `tier: "core"` - so the arm has become the thing it preceded:
    // the promotion happened AND the measurement backs it.
    // `registry-ratchet.spec.ts` re-derives the interval on every run, so a
    // later re-sample that widens the interval fails there, not here.
    const declaredCore = RULES.filter((r) => r.tier === "core");
    expect(
      declaredCore.map((r) => r.id),
      "the declared-core set changed - every entry must clear the ceiling on " +
        "its own measurement, which registry-ratchet.spec.ts enforces",
    ).toEqual(["QA-PW-117", "QA-JV-101"]);
    for (const rule of declaredCore) {
      expect(measurementTier(rule), rule.id).toBe("core");
      expect(declaredCoreWithoutEvidence(rule), rule.id).toBeNull();
    }
  });
});

describe("the quarantine threshold needs a 75% error rate to fire on measurement", () => {
  it("fourteen of twenty false positives does not clear the floor", () => {
    expect(wilsonInterval(14, MAX_SAMPLES_PER_RULE).ciLow).toBeLessThan(
      QUARANTINE_FP_FLOOR,
    );
  });

  it("the floor is only reached at an implausible error rate", () => {
    const lowest = lowestFpReaching(MAX_SAMPLES_PER_RULE, QUARANTINE_FP_FLOOR);
    expect(lowest).toBeGreaterThanOrEqual(15);
  });

  it("exactly one rule is quarantined by measurement — the 100%-FP one", () => {
    // `QA-ENV-001` observed 20/20, so its lower bound reads 84%. That is the
    // ONLY way the interval floor fires on this corpus, and it takes a rule
    // that is wrong every single time.
    //
    // I wrote this arm as "no rule", from a summary that said the interval
    // rule quarantines nothing. The summary was wrong and the assertion caught
    // it — B0's own table has shown `QA-ENV-001` at `quarantine` throughout,
    // under a declared column that happened to agree with it. The arithmetic
    // is the thing to trust here, and it says one, not zero.
    const byMeasurement = RULES.filter(
      (r) => measurementTier(r) === "quarantine",
    );
    expect(byMeasurement.map((r) => r.id)).toEqual(["QA-ENV-001"]);
    // And it is quarantined because it was wrong every time, which is the
    // whole point: a rule at 62% (QA-TEST-002, the worst of the rest) does
    // not get there.
    const worstOther = Math.max(
      ...RULES.filter((r) => r.id !== "QA-ENV-001").map((r) => {
        const m = measurementFor(r.id);
        return m === undefined ? 0 : m.fpRate;
      }),
    );
    expect(worstOther).toBeLessThan(0.75);
  });

  it("the declared floor is what holds the other 32 quarantined rules down", () => {
    // The arm above says the interval rule reaches exactly one. This says who
    // does the rest of the work, so the file cannot be read as "quarantine is
    // derived".
    //
    // 34 rules declare quarantine. 33 of them are held down ONLY by that
    // declaration — `QA-ENV-001` would be quarantined either way. This is the
    // same 33 B0 counted, and the count differs between the two framings
    // because B0 counted *promotions* (declared quarantine, derived extended)
    // and this counts *declarations*.
    const declared = RULES.filter((r) => r.tier === "quarantine");
    expect(declared.length).toBe(34);
    expect(
      declared.filter((r) => measurementTier(r) === "extended").length,
    ).toBe(33);
  });
});

describe("the ladder reaches all three outputs now", () => {
  it("measurementTier returns all three tiers", () => {
    // Was `["extended", "quarantine"]`, with the file's own header explaining
    // that `core` was the one output the interval could not produce on this
    // corpus. That was true and worth asserting, because it is what made the
    // sampling campaign necessary. It stopped being true on 2026-10-03, when
    // `QA-PW-117` reached n=35 and the ladder produced all three values from
    // the same derivation.
    const derived = new Set(RULES.map(measurementTier));
    expect([...derived].sort()).toEqual(["core", "extended", "quarantine"]);
  });
});
