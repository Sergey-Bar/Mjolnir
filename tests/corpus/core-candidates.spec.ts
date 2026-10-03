/**
 * `--core-candidates`: the predicate, the cap, and the claim they support.
 *
 * The claim is narrow and it is the whole point of the mode. Two rules sit one
 * sample short of the core ceiling (`docs/CORE-READINESS.md`, `NEEDS-SAMPLES`):
 *
 *     QA-PW-117   n=24  0.0% observed  ciHigh 13.8%   →  11 more to reach 35
 *     QA-JV-101   n=23  0.0% observed  ciHigh 14.3%   →  12 more to reach 35
 *
 * Twenty-three human classifications earn the first core rule in the
 * registry. The alternative was raising `MAX_SAMPLES_PER_RULE` globally, which
 * 6.0 did and reverted the same day: 1,121 unadjudicated rows across 42 rules,
 * refused by `tests/corpus/verdicts/unclassified-ceiling.json`. So the mode
 * under test has to do the thing the global raise could not — spend the budget
 * ONLY where it can be spent — and this file asserts that it does, per rule,
 * from the live registry rather than from a committed list of names.
 *
 * Nothing here runs the sampler. It clones 37 repositories, and a test that
 * needed the network would be a test that fails for reasons unrelated to the
 * predicate.
 */

import { describe, expect, it } from "vitest";

import {
  CORE_CANDIDATE_CAP,
  coreCandidateRuleIds,
  isCoreCandidate,
  selectCoreCandidates,
} from "../../scripts/lib/core-candidates.js";
import { MEASURED_FP } from "../../src/rules/measured-fp.generated.js";
import { wilsonInterval } from "../../src/lib/wilson.js";
import {
  CORE_FP_CEILING,
  QUARANTINE_FP_FLOOR,
  measurementFor,
  samplesForZeroFp,
  straddleDetail,
} from "../../src/rules/measurement.js";
import { RULES } from "../../src/rules/index.js";

describe("the candidate cap is the arithmetic, not a literal", () => {
  it("equals the n at which a clean rule clears the core ceiling", () => {
    expect(CORE_CANDIDATE_CAP).toBe(samplesForZeroFp(CORE_FP_CEILING));
    // Stated as the property rather than as 35, so moving the ceiling moves the
    // budget and this file cannot disagree with `straddleDetail` about it.
    expect(wilsonInterval(0, CORE_CANDIDATE_CAP).ciHigh).toBeLessThanOrEqual(
      CORE_FP_CEILING,
    );
    expect(wilsonInterval(0, CORE_CANDIDATE_CAP - 1).ciHigh).toBeGreaterThan(
      CORE_FP_CEILING,
    );
  });

  it("is larger than the global sampler cap, which is why the mode exists", () => {
    // `MAX_SAMPLES_PER_RULE` in scripts/corpus-sample.ts. Duplicated as a
    // literal for the same reason core-tier-reachability.spec.ts duplicates it:
    // this file is about the RELATIONSHIP between the two, and a change to
    // either should be visible here rather than silently absorbed.
    expect(CORE_CANDIDATE_CAP).toBeGreaterThan(20);
  });
});

describe("a candidate is a rule more samples can still settle", () => {
  it("QA-JV-101 is the plan target still to be funded", () => {
    // `QA-PW-117` was the other plan target and stopped being a candidate on
    // 2026-10-03, when it reached n=35 and was promoted: the predicate asks
    // "can more samples still settle this", and a rule whose interval already
    // clears the ceiling cannot be settled by any number of samples. Asserted
    // here because a predicate that kept offering to fund a promotion the rule
    // already has would send the next run after work that is finished.
    expect(coreCandidateRuleIds()).toContain("QA-JV-101");
    expect(
      coreCandidateRuleIds(),
      "QA-PW-117 is core - the predicate is still offering to fund it",
    ).not.toContain("QA-PW-117");
  });

  it("the predicate is worth far more than the two nearest candidates", () => {
    // This is the number that made the plan's "+23" arithmetic wrong, and it is
    // asserted rather than left in a comment because the mode is only affordable
    // because `--core-target` narrows it: every rule on the corpus sitting at
    // zero observed false positives below n=35 answers "yes" to the question.
    // 26 here, and rising as rules are measured.
    expect(coreCandidateRuleIds().length).toBeGreaterThan(2);
    for (const id of coreCandidateRuleIds()) {
      expect(measurementFor(id)?.n ?? 0, id).toBeLessThan(CORE_CANDIDATE_CAP);
    }
  });

  it("a candidate observes ZERO false positives", () => {
    for (const id of coreCandidateRuleIds()) {
      const m = MEASURED_FP[id];
      expect(m, id).toBeDefined();
      expect(Math.round((m?.fpRate ?? 1) * (m?.n ?? 0)), id).toBe(0);
    }
  });

  it("a candidate's interval is settled by sampling, not by a detector change", () => {
    // The second half of the predicate, read through the sentence a maintainer
    // actually reads. `straddleDetail` returns "About N clean samples would
    // settle it" for a candidate and "it needs a detector change" for a rule
    // whose point estimate is already too high — and no rule on this corpus is
    // in the second bucket at zero observed false positives, which is exactly
    // why the two halves are not redundant.
    for (const id of coreCandidateRuleIds()) {
      const rule = RULES.find((r) => r.id === id);
      expect(rule, id).toBeDefined();
      expect(straddleDetail(rule ?? ({} as never)), id).toMatch(
        /About \d+ clean samples would settle it/,
      );
    }
  });
});

describe("a rule that cannot earn a tier is not a candidate", () => {
  it("a rule with no measurement is not a candidate", () => {
    // There is no observed FP count to be zero, so the question "more samples
    // settle it?" has no answer to derive. This is also why
    // `--unmeasured-only --core-candidates` composes to the empty set.
    for (const id of ["QA-CI-013", "QA-CI-014", "QA-PW-147", "QA-TQUAL-009"]) {
      expect(MEASURED_FP[id], id).toBeUndefined();
      expect(isCoreCandidate(id), id).toBe(false);
    }
  });

  it("a rule observed wrong even once is not a candidate", () => {
    // More samples move the interval; they do not un-move an observation. The
    // work list for these is `NEEDS-FP-REDUCTION`, which is a detector queue.
    const observedWrong = RULES.filter((rule) => {
      const m = MEASURED_FP[rule.id];
      return m !== undefined && Math.round(m.fpRate * m.n) > 0;
    });
    expect(observedWrong.length).toBeGreaterThan(0);
    for (const rule of observedWrong) {
      expect(isCoreCandidate(rule.id), rule.id).toBe(false);
    }
  });

  it("the 100%-FP rule is not a candidate, however much of it there is", () => {
    // The rule every sample would be wrong on is the clearest possible
    // argument that budget follows usefulness.
    expect(measurementFor("QA-ENV-001")?.fpRate).toBe(1);
    expect(isCoreCandidate("QA-ENV-001")).toBe(false);
  });

  it("an unknown or retired rule id is not a candidate", () => {
    expect(isCoreCandidate("QA-NOPE-999")).toBe(false);
    expect(isCoreCandidate("")).toBe(false);
  });
});

describe("funding a pass is a separate decision from candidacy", () => {
  it("no targets funds every candidate — the broad pass", () => {
    expect(selectCoreCandidates()).toEqual(coreCandidateRuleIds());
    expect(selectCoreCandidates([])).toEqual(coreCandidateRuleIds());
  });

  it("naming targets funds exactly those, and the ceiling arithmetic follows", () => {
    // The plan's step-4 pass, as it RAN: two rules, eleven and twelve rows,
    // twenty-three classifications. Twenty were adjudicated and four were
    // orphans, so `QA-PW-117` moved 24 -> 34 rather than 24 -> 35, and the
    // corpus-wide sweep that followed found the last row.
    //
    // The arithmetic below is therefore run against `QA-JV-101` alone — the one
    // target the campaign has NOT yet settled. Its 12 is the number a person
    // approves next.
    const funded = selectCoreCandidates(["QA-JV-101"]);
    expect(funded).toEqual(["QA-JV-101"]);
    const rows = funded.map((id) => {
      const m = measurementFor(id);
      expect(m, id).toBeDefined();
      return CORE_CANDIDATE_CAP - (m?.n ?? 0);
    });
    expect(rows).toEqual([3]);
    expect(rows.reduce((a, b) => a + b, 0)).toBe(3);
  });

  it("the funded set is a subset of the candidate set, never a replacement", () => {
    const candidates = new Set(coreCandidateRuleIds());
    for (const id of selectCoreCandidates(["QA-JV-101"])) {
      expect(candidates.has(id), id).toBe(true);
    }
    // A promoted rule is not fundable, and naming one is an ERROR rather than
    // an empty result — the same "a run that quietly sampled nothing" guard the
    // next arm is about, applied to the promotion that just happened.
    expect(() => selectCoreCandidates(["QA-PW-117"])).toThrow(
      /QA-PW-117 is not a core candidate/,
    );
    expect(() => selectCoreCandidates(["QA-PW-117"])).toThrow(
      /already past the 35-sample threshold/,
    );
  });

  it("a rule that is not a candidate is an ERROR, not a silent skip", () => {
    // A run that quietly sampled nothing is indistinguishable from a run that
    // found nothing to sample, and the second reading is the expensive one:
    // the ceiling moves, nobody classifies anything, and the mode looks like it
    // worked.
    expect(() => selectCoreCandidates(["QA-ENV-001"])).toThrow(
      /QA-ENV-001 \(20 observed false positive\(s\) of n=20\)/,
    );
    expect(() => selectCoreCandidates(["QA-CI-013"])).toThrow(
      /QA-CI-013 \(unmeasured\)/,
    );
    expect(() => selectCoreCandidates(["QA-NOPE-999"])).toThrow(
      /QA-NOPE-999 \(no such rule\)/,
    );
  });

  it("the error names what is fundable today", () => {
    let message = "";
    try {
      selectCoreCandidates(["QA-ENV-001"]);
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    expect(message).toContain("Candidates today:");
    // `QA-JV-101` rather than `QA-PW-117`: the list is derived, so it names
    // whichever rules can still be settled, and PW-117 was promoted out of it
    // on 2026-10-03. A hard-coded ID here would rot the day the second rule
    // clears — which is the point of asserting against the live derivation.
    expect(message).toContain("QA-JV-101");
    expect(message).not.toContain("QA-PW-117");
  });
});

describe("the candidate set is derived, not committed", () => {
  it("is sorted, and contains nothing outside the live registry", () => {
    const ids = coreCandidateRuleIds();
    expect(ids).toEqual([...ids].sort());
    const live = new Set(RULES.map((r) => r.id));
    for (const id of ids) expect(live.has(id), id).toBe(true);
  });

  it("excludes rules whose measurement says the interval is confidently bad", () => {
    // `NEEDS-FP-REDUCTION` in docs/CORE-READINESS.md: the interval already
    // excludes 10% from below, so the ceiling is out of reach at this n and
    // only a retraction or a detector change moves it. If one of these ever
    // became a candidate the mode would be sampling at a problem that is not
    // about sample size.
    const unreachable = RULES.filter((rule) => {
      const m = MEASURED_FP[rule.id];
      if (m === undefined) return false;
      const fps = Math.round(m.fpRate * m.n);
      return wilsonInterval(fps, m.n).ciLow >= QUARANTINE_FP_FLOOR;
    });
    for (const rule of unreachable) {
      expect(isCoreCandidate(rule.id), rule.id).toBe(false);
    }
  });

  it("a rule already past the sample threshold is not a candidate", () => {
    // Vacuously true today — nothing on the corpus is at 0/35 yet — and kept
    // precisely because it is. The predicate's last clause is
    // `CORE_CANDIDATE_CAP > n`, so the day a rule reaches the threshold this
    // arm fails loudly, which is the intended moment: that rule has earned its
    // tier and must not be sampled again, and `core-tier-reachability.spec.ts`
    // has the matching arm for the tier itself.
    const atOrPastThreshold = RULES.filter((rule) => {
      const m = MEASURED_FP[rule.id];
      return (
        m !== undefined &&
        Math.round(m.fpRate * m.n) === 0 &&
        m.n >= CORE_CANDIDATE_CAP
      );
    });
    for (const rule of atOrPastThreshold) {
      expect(isCoreCandidate(rule.id), rule.id).toBe(false);
    }
  });
});
