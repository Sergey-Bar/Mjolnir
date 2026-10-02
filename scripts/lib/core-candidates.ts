/**
 * `--core-candidates`: which rules a TARGETED sampling run may spend adjudication
 * budget on, and the cap each of them may spend it up to.
 *
 * WHY THIS IS A MODE AND NOT A HIGHER CAP
 *
 * `scripts/corpus-sample.ts` raised its global cap 20 → 60 and reverted the raise
 * the same day. The re-sample produced **1,121 unadjudicated rows across 42
 * rules**, and `tests/corpus/verdicts/unclassified-ceiling.json` refused them
 * outright:
 *
 *     FAIL: 1121 unclassified verdict row(s) exceed the committed ceiling of 31
 *
 * That refusal was the gate working, and the reasoning behind it still holds: a
 * sample is not a verdict, every verdict is a human judgement with the code in
 * front of it, and blank rows are DROPPED rather than counted — so a mostly-blank
 * corpus reports a rate measured on whatever subset happened to be adjudicated,
 * which is a much more flattering number than the corpus supports.
 *
 * What the revert did NOT establish is that 20 is the right cap for every rule.
 * The arithmetic that motivated the raise is about ONE rule shape: for a rule
 * observing ZERO false positives, `wilson(0, n).ciHigh = z²/(n + z²)`, so the
 * 10% core ceiling is cleared at n ≥ 35 and NOT at the 20 the cap allowed
 * (`src/rules/measurement.ts::samplesForZeroFp`, which derives it). A global
 * raise spends 35+ samples on rules that CANNOT spend them — a rule already at
 * 100% observed FP, or one whose interval already excludes 10% from below, gets
 * the same budget and buys nothing with it, while the adjudication budget is
 * finite and human.
 *
 * So the raise is kept and the ALLOCATION is what changes: a rule is a candidate
 * only when it can actually earn a tier, and only a candidate may exceed 20.
 *
 * THE PREDICATE, and why it has two halves
 *
 *   1. **Zero observed false positives.** A rule that has been observed wrong
 *      cannot clear a ceiling by collecting more of the same evidence — more
 *      samples move its interval, and the interval is already on the wrong side.
 *   2. **`straddleDetail` returns the "About N clean samples would settle it"
 *      branch.** Read structurally rather than by matching the sentence: the
 *      branch is taken exactly when `samplesForZeroFp(ceiling) > n`, so that is
 *      what is tested. A rule at 0/35 already clears the ceiling and
 *      `straddleDetail` returns `undefined` — it has nothing left to earn, and
 *      sampling it again would be pure cost. A rule with a NON-ZERO observed FP
 *      count can reach the same arithmetic and still be excluded by half 1,
 *      which is why the two halves are separate.
 *
 * A rule that fails the candidate test is not "less important"; it is one whose
 * next move is a detector change or a retraction, and `straddleDetail`'s own
 * sentence says so. `docs/CORE-READINESS.md` is the work list, and its
 * `NEEDS-FP-REDUCTION` column is this predicate's exclusion set.
 *
 * THE PREDICATE IS DERIVED; THE BUDGET IS NAMED
 *
 * There is no constant naming the rules this run is FOR. The candidate set is
 * computed from the live registry and the live measurement map on every run, so
 * a rule that crosses the line stops being sampled without an edit and a rule
 * that falls out of it stops being sampled without an edit either.
 *
 * What a run does take from the command line is which of them get FUNDED this
 * pass — `--core-target`, repeatable. Those are different questions and the
 * difference is worth hundreds of rows: the predicate is worth 26 rules today,
 * every rule on the corpus at zero observed false positives below n=35, while
 * the nearest two (QA-PW-117 at n=24, QA-JV-101 at n=23) are the pass that
 * earns the first core rule for 11 and 12 classifications. A mode that silently
 * meant "all 26" would make the committed ceiling move by an amount nobody
 * decided before anybody was asked to do the work.
 *
 * So the plan's contingency — "if the corpus cannot supply 35 findings for a
 * target, fall back to the next-best candidates" — is not a code change at all.
 * It is the same command with different names on it, which is the property that
 * makes it affordable.
 */

import { MEASURED_FP } from "../../src/rules/measured-fp.generated.js";
import {
  CORE_FP_CEILING,
  samplesForZeroFp,
  straddleDetail,
} from "../../src/rules/measurement.js";
import { RULES } from "../../src/rules/index.js";

/**
 * The per-rule cap a CANDIDATE gets.
 *
 * Derived, not written as 35: it is `samplesForZeroFp(CORE_FP_CEILING)`, which is
 * the same number `straddleDetail` prints in its "About N clean samples would
 * settle it" sentence and the same number `tests/rules/registry-ratchet.spec.ts`
 * asserts against `wilsonInterval`. A cap written as a literal here would be a
 * fourth copy of one number, and the repository has already paid for that shape
 * — `src/rules/tier-evidence.ts` carried 18 hand-written `ciHigh` values that
 * were wrong.
 *
 * A literal 35 does NOT mean the cap is a magic number that reached 35: it means
 * the value follows the ceiling, so moving `CORE_FP_CEILING` moves the budget
 * with it and nothing has to be edited twice.
 */
export const CORE_CANDIDATE_CAP = samplesForZeroFp(CORE_FP_CEILING);

const RULE_BY_ID: ReadonlyMap<string, (typeof RULES)[number]> = new Map(
  RULES.map((rule) => [rule.id, rule]),
);

/**
 * The integer false-positive count behind a rule's recorded rate.
 *
 * `MEASURED_FP` stores a RATE and a sample count, not an integer count, so
 * `fpRate * n` is generally fractional (10.5% of 19 is 1.995) and
 * `wilsonInterval` rounds internally. `measurementInterval` and
 * `scripts/core-readiness.ts` both round the same way, and every caller has to
 * agree — see `measurementInterval`'s docstring for what happens when two of them
 * do not.
 */
function observedFalsePositives(ruleId: string): number | undefined {
  const m = MEASURED_FP[ruleId];
  if (m === undefined) return undefined;
  return Math.round(m.fpRate * m.n);
}

/**
 * May this rule spend the candidate budget?
 *
 * False for every rule that is not live, unmeasured, already at or above the
 * threshold, or observed wrong even once — which is why the answer is derived
 * rather than looked up.
 */
export function isCoreCandidate(ruleId: string): boolean {
  const rule = RULE_BY_ID.get(ruleId);
  if (rule === undefined) return false;
  const m = MEASURED_FP[ruleId];
  if (m === undefined) return false;
  // Half 1: it has been observed wrong, so its ceiling is a detector problem.
  if (observedFalsePositives(ruleId) !== 0) return false;
  // Half 2: it is straddling AND more clean samples would settle it. The second
  // clause is the "About N clean samples" branch of `straddleDetail`, tested as
  // the arithmetic it is rather than as the sentence it prints — a test that
  // matches prose breaks the day the prose is reworded, and reports it as an
  // arithmetic change.
  if (straddleDetail(rule) === undefined) return false;
  return CORE_CANDIDATE_CAP > m.n;
}

/** Every live rule that can earn a tier by sampling more, sorted. */
export function coreCandidateRuleIds(): string[] {
  return RULES.map((rule) => rule.id)
    .filter(isCoreCandidate)
    .sort();
}

/**
 * The rules a run will actually spend budget on.
 *
 * `targets` is the second half of a decision the predicate cannot make for
 * itself, and the split is the whole reason this function exists:
 *
 *   - `isCoreCandidate` answers **who CAN earn a tier by sampling more**. That is
 *     26 rules today, every rule on the corpus sitting at zero observed false
 *     positives below n=35. It is a property of the registry and the
 *     measurements, and it changes on its own as verdicts land.
 *   - `targets` answers **who gets FUNDED in this pass**. That is a budget
 *     decision, and it is a person's: `tests/corpus/verdicts/README.md` is
 *     explicit that a verdict is a human judgement with the code in front of it.
 *
 * Running the broad set by accident is the 6.0 failure with a different number.
 * The global raise produced 1,121 unadjudicated rows across 42 rules and the
 * committed ceiling refused them; a `--core-candidates` run with no target would
 * produce a row per candidate the corpus can supply — up to
 * `CORE_CANDIDATE_CAP - n` for each of 26 rules — and the ceiling would have to
 * move by hundreds for a pass nobody scoped. The two nearest candidates
 * (QA-PW-117 at n=24, QA-JV-101 at n=23) are 11 and 12 rows from the ceiling;
 * the rest are 15 to 35 each. Naming the targets keeps that arithmetic
 * knowable BEFORE the run, which is the property the ceiling bump depends on.
 *
 * A named rule that is not a candidate is an ERROR rather than a silent skip:
 * it means the run was aimed at a rule whose interval moved, the registry
 * retired it, or the name is a typo — and a run that quietly sampled nothing
 * looks exactly like a run that found nothing to sample.
 */
export function selectCoreCandidates(targets?: readonly string[]): string[] {
  const candidates = new Set(coreCandidateRuleIds());
  if (targets === undefined || targets.length === 0) return [...candidates];
  const unknown = targets.filter((id) => !candidates.has(id));
  if (unknown.length > 0) {
    throw new Error(
      `--core-target ${unknown.join(", ")} ` +
        `${unknown.length === 1 ? "is not a" : "are not"} core candidate` +
        `${unknown.length === 1 ? "" : "s"}: ` +
        `${unknown
          .map((id) => {
            const known = RULE_BY_ID.get(id);
            if (known === undefined) return `${id} (no such rule)`;
            const m = MEASURED_FP[id];
            if (m === undefined) return `${id} (unmeasured)`;
            const fps = observedFalsePositives(id);
            return fps === 0
              ? `${id} (n=${m.n}, already past the ${CORE_CANDIDATE_CAP}-sample threshold)`
              : `${id} (${fps} observed false positive(s) of n=${m.n})`;
          })
          .join(
            "; ",
          )}. Candidates today: ${[...candidates].join(", ") || "(none)"}`,
    );
  }
  return targets.filter((id) => candidates.has(id)).sort();
}
