/**
 * Declared-core rules whose measurement does not support the claim.
 *
 * 6.0, after B3 moved the tier criterion from a point estimate to a Wilson
 * interval.
 *
 * The state of the registry at the time of writing, and the reason this file
 * exists rather than a test that simply asserts nothing:
 *
 *   19 rules DECLARE `tier: "core"`. Every one of them clears the old
 *   point-estimate criterion (`fpRate <= 0.10 && n >= 10`) and NOT ONE clears
 *   the interval criterion (`ciHigh <= 0.10`). Their intervals reach 13.8% to
 *   40.4%. A rule at n=10 observing zero false positives has an interval of
 *   [0, 27.8%] — the data is consistent with it being wrong more than a
 *   quarter of the time.
 *
 *   ZERO rules earn `core` on measurement alone. Five undeclared rules
 *   straddle, and none resolves to core.
 *
 * So "core" in this registry today is a HUMAN ASSERTION, not a measurement
 * result. That may well be right — a maintainer who has read the code and
 * reasoned about the premise has information no sample of ten findings
 * contains. But it is an assertion, and until now nothing in the repository
 * said so: the matrix rendered `tier: "core"`, `measured: true` and
 * `fpRate: 0`, which reads as a measured result.
 *
 * The decision NOT taken here is to demote those 19 rules. `effectiveTier`
 * stays one-directional on purpose: a declared tier is a reviewed human
 * decision, and a 20-sample corpus does not overrule it. Demotion is a
 * product decision about what "core" means, not a code cleanup, and this
 * file exists so that decision can be taken with the list in front of
 * someone.
 *
 * Why the list is COMMITTED rather than computed in the test: a test that
 * computes the set and asserts it is non-empty asserts only that the problem
 * still exists. A test that compares the committed list to the computed one
 * forces an explicit, reviewed edit whenever the set changes — a new
 * declared-core rule with a wide interval fails CI until someone decides
 * whether it belongs on the list.
 */

import type { QADoctorRule } from "./rule.js";
import { MEASURED_FP } from "./measured-fp.generated.js";
import { CORE_FP_CEILING, measurementInterval } from "./measurement.js";
import { wilsonInterval } from "../lib/wilson.js";

export interface DeclaredCoreClaim {
  ruleId: string;
  n: number;
  observedFpRate: number;
  ciHigh: number;
}

/**
 * Rules demoted from `core` because their measurement did not support it.
 *
 * 6.0. Before this list existed, nineteen rules declared `tier: "core"` and
 * every one cleared the OLD criterion — `fpRate <= 0.10 && n >= 10` — while
 * none cleared the interval criterion. Their 95% Wilson upper bounds run
 * from 13.8% to 40.4%. Two carried the old claim in their own trailing
 * comments ("measured 2026-09-02: 0% FP at n=20", "10% FP at n=20 (band
 * edge, ≤ 10%)"), which is the clearest possible statement that the tier was
 * decided by reading a point estimate.
 *
 * `core` was a HUMAN ASSERTION rendered with a measurement's appearance: the
 * capability matrix showed `tier: "core"`, `measured: true`,
 * `fpRate: 0`. The maintainer chose demotion over keeping the assertion, on
 * 2026-09-28. The choice is BEHAVIOUR-NEUTRAL — only `quarantine` is
 * enforced, so all nineteen still run on every scan. What changed is what the
 * repository SAYS about them.
 *
 * This is a RATCHET, not an archive. `declaredCoreWithoutEvidence` now
 * returns nothing, and the ratchet fails if any of these nineteen is
 * promoted back to `core` without a re-sample. A re-sample at the raised
 * MAX_SAMPLES_PER_RULE can legitimately earn it back; that should be a
 * deliberate edit to the rule and to this file, and a visible one.
 */
export interface DemotedCoreClaim {
  ruleId: string;
  /**
   * The 95% Wilson upper bound that failed to clear the core ceiling.
   *
   * NOT hand-written. It used to be, and **eighteen of nineteen were wrong**:
   * the committed values were transcribed once at the demotion and never
   * re-derived, so a re-sample moved the real interval and left the number
   * beside it describing a measurement that no longer exists. QA-PY-002
   * recorded 0.152 while the interval was 0.2996 — the row said "the largest
   * sample on an observed-nonzero Python rule here, and still short of the
   * ceiling" about a rule that was twice as far from the ceiling as recorded.
   *
   * The ratchet that was supposed to catch this did not, because it only
   * asserted `ciHigh > CORE_FP_CEILING`, which every stale value also
   * satisfied. A check on a hand-maintained number that only tests its sign
   * is a check that cannot fail.
   *
   * So the number is computed from `MEASURED_FP` at load, using the same
   * expression `measurementInterval` uses. The hand-written part of a row is
   * now exactly the part that is judgement — `ruleId` and `justification` —
   * and the part that is arithmetic is arithmetic.
   */
  readonly ciHigh: number;
  /** Why `extended` is the right word rather than `quarantine`. */
  justification: string;
}

/**
 * The Wilson upper bound for a rule id, or `null` when it has no measurement.
 *
 * `MEASURED_FP` records a rate and a sample count rather than an integer count
 * of false positives, so `fpRate * n` is generally fractional (10.5% of 19 is
 * 1.995) and `wilsonInterval` rounds internally. Round here exactly as
 * `measurementInterval` does — see its docstring for why the two are one fact
 * rather than two.
 */
function ciHighFor(ruleId: string): number | null {
  const m = MEASURED_FP[ruleId];
  if (m === undefined) return null;
  return wilsonInterval(Math.round(m.fpRate * m.n), m.n).ciHigh;
}

/**
 * Demoted rules, with the interval that failed re-derived on every load.
 *
 * `ciHigh` is written as a computed property rather than a literal so the
 * committed source holds no number that can go stale. A rule whose measurement
 * has since been withdrawn gets `Number.NaN`, which the ratchet rejects — an
 * unmeasurable row cannot be evidence for anything, and `NaN > 0.1` is false,
 * so it fails the check rather than passing it.
 */
const DEMOTED_ROWS: ReadonlyArray<{
  ruleId: string;
  justification: string;
}> = [
  {
    ruleId: "QA-PW-002",
    justification:
      "n=10, 0% observed. Selector specificity was reasoned about by hand; the sample is too thin to call it core and too clean to quarantine.",
  },
  {
    ruleId: "QA-PW-003",
    justification:
      "n=10 with 1 observed FP — the widest interval in the registry. The premise was reviewed, but 40.4% is not a 10% ceiling.",
  },
  {
    ruleId: "QA-PY-001",
    justification:
      "n=20, 0% observed. Module-level mutable state is structural; the sample does not establish the rate.",
  },
  {
    ruleId: "QA-PY-002",
    justification:
      "n=23, 2 observed FPs. The largest sample on an observed-nonzero Python rule here, and still short of the ceiling.",
  },
  {
    ruleId: "QA-PY-009",
    justification:
      "n=20, 0% observed. The premise was reviewed by hand and holds; twenty clean samples still do not establish the rate, and nothing argues the rule down either.",
  },
  {
    ruleId: "QA-PY-011",
    justification:
      "n=10, 1 observed FP. Neither the point estimate nor the interval could place it in either direction.",
  },
  {
    ruleId: "QA-PW-101",
    justification:
      "n=20, 0% observed. A selector race is structural; the measurement is thin.",
  },
  {
    ruleId: "QA-PW-113",
    justification:
      "n=24, 2 observed FPs. Expect-without-locator is structural; the rate is not established.",
  },
  {
    ruleId: "QA-PW-121",
    justification:
      "n=12, 0% observed. A thin sample: the rate is not established, and nothing about the rule argues it down.",
  },
  {
    ruleId: "QA-PW-104",
    justification:
      "n=20, 0% observed. A clean run of twenty is not a 10% ceiling, and the rule has no argument of its own either way.",
  },
  {
    ruleId: "QA-PW-140",
    justification:
      "n=20, 0% observed. Same shape as QA-PW-104: twenty clean samples, no ceiling established, nothing arguing the other way.",
  },
  {
    ruleId: "QA-PY-103",
    justification:
      "n=25, 2 observed FPs. Wait-for-timeout is structural; the rate is not established.",
  },
  {
    ruleId: "QA-CS-102",
    justification:
      "n=24, 2 observed FPs — the largest C# sample in this group, and 15.0% is still above a 10% ceiling.",
  },
  {
    ruleId: "QA-JV-105",
    justification:
      "n=20, 2 observed FPs. Ten percent of twenty is two findings; the interval cannot distinguish that from anything better.",
  },
  {
    ruleId: "QA-JV-109",
    justification:
      "n=20, 0% observed. Retry-masks-test-failures is structural; the rate is not established.",
  },
  {
    ruleId: "QA-CS-101",
    justification:
      "n=20, 0% observed. The C# skipped-test rule mirrors the Java one; twenty clean samples do not establish its rate.",
  },
  {
    ruleId: "QA-CS-103",
    justification:
      "n=12, 0% observed. A thin sample, and the C# no-assertions rule has no argument of its own either way.",
  },
];

/**
 * The demotion list, with each row's interval re-derived from the live
 * measurement on load.
 *
 * See `DemotedCoreClaim.ciHigh` for why the number is not committed.
 */
export const DEMOTED_FOR_UNSUBSTANTIATED_CORE: readonly DemotedCoreClaim[] =
  DEMOTED_ROWS.map((row) => ({
    ruleId: row.ruleId,
    ciHigh: ciHighFor(row.ruleId) ?? Number.NaN,
    justification: row.justification,
  }));

/**
 * A rule whose declared `core` is not backed by a confidence interval.
 *
 * Empty since 6.0: the nineteen were demoted. Kept because the property is
 * worth a live assertion rather than a comment — a NEW rule declared `core`
 * on a thin measurement should fail the next run, and this is what it fails.
 */
export function declaredCoreWithoutEvidence(
  rule: QADoctorRule,
): DeclaredCoreClaim | null {
  if (rule.tier !== "core") return null;
  const interval = measurementInterval(rule);
  // No interval means no valid measurement at all, which is a different
  // failure (and one the ratchet already reports) rather than a wide
  // interval — reporting it here would double-count one rule into two lists.
  if (interval === undefined || interval.ciHigh <= CORE_FP_CEILING) {
    return null;
  }
  const m = MEASURED_FP[rule.id];
  return {
    ruleId: rule.id,
    n: m?.n ?? 0,
    observedFpRate: m?.fpRate ?? 0,
    ciHigh: interval.ciHigh,
  };
}
