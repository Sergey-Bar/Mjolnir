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

/** One rule whose declared tier outruns its evidence. */
export interface UnsubstantiatedCoreClaim {
  ruleId: string;
  /** Why it is here, in the words of whoever put it here. */
  justification: string;
}

export interface DeclaredCoreClaim {
  ruleId: string;
  n: number;
  observedFpRate: number;
  ciHigh: number;
}

/**
 * Committed 6.0. Empty justifications are NOT acceptable: the act of adding a
 * rule here is the act of writing down why a human decision stands against
 * the data.
 */
export const DECLARED_CORE_WITHOUT_EVIDENCE: readonly UnsubstantiatedCoreClaim[] =
  [
    {
      ruleId: "QA-PW-002",
      justification:
        "Selector specificity was reviewed by hand; the ten samples are all agreement, none of them is a selector that needs a different specificity.",
    },
    {
      ruleId: "QA-PW-003",
      justification:
        "Premise reviewed: the finding is a structural fact about the spec, not a sample-dependent judgement. n=10 with one FP is the weakest case in this list.",
    },
    {
      ruleId: "QA-PY-001",
      justification:
        "Structural (module-level mutable state shared across tests). Reviewed by hand.",
    },
    {
      ruleId: "QA-PY-002",
      justification:
        "Structural. n=23 is the largest sample on an observed-nonzero rule in this group.",
    },
    {
      ruleId: "QA-PY-009",
      justification: "Structural. Premise reviewed by hand.",
    },
    {
      ruleId: "QA-PY-011",
      justification:
        "Premise reviewed: at n=10 with one observed FP the interval is wide in both directions, and the point estimate alone cannot place it either way.",
    },
    {
      ruleId: "QA-PW-101",
      justification: "Structural (selector race). Reviewed by hand.",
    },
    {
      ruleId: "QA-PW-104",
      justification: "n=10. Re-sample needed.",
    },
    {
      ruleId: "QA-PW-113",
      justification: "Structural (expect without a locator). Reviewed by hand.",
    },
    {
      ruleId: "QA-PW-117",
      justification:
        "Closest to the boundary in this list at 13.8%. Re-sample needed; likely to clear.",
    },
    {
      ruleId: "QA-PW-121",
      justification: "n=12. Re-sample needed.",
    },
    {
      ruleId: "QA-PW-140",
      justification: "n=10. Re-sample needed.",
    },
    {
      ruleId: "QA-PY-103",
      justification:
        "n=25 with 2 observed FPs. Re-sample needed; the largest sample on an observed-nonzero Python rule here.",
    },
    {
      ruleId: "QA-JV-101",
      justification:
        "Structural (static mutable shared across tests). Reviewed by hand.",
    },
    {
      ruleId: "QA-JV-105",
      justification: "n=20 with 2 observed FPs. Re-sample needed.",
    },
    {
      ruleId: "QA-JV-109",
      justification: "Structural. Reviewed by hand.",
    },
    {
      ruleId: "QA-CS-101",
      justification: "Structural. Reviewed by hand.",
    },
    {
      ruleId: "QA-CS-102",
      justification: "n=24 with 2 observed FPs. Re-sample needed.",
    },
    {
      ruleId: "QA-CS-103",
      justification: "n=11. Re-sample needed.",
    },
  ];

/** The claim detail, computed from the registry — never hand-maintained. */
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
