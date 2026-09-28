/**
 * QA-PY-001 — Focused test committed.
 * Severity: error · Confidence: high · deterministic-defect
 * `-k` hardcoded in pytest.main, or @pytest.mark.only — a subset of the
 * suite runs while CI reports green.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const pyFocusedTest = defineRule({
  id: "QA-PY-001",
  category: "QA-TEST",
  title: "Focused test committed",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "python",
  // Trust Metadata
  languages: ["python"],
  frameworks: ["pytest"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "LEXICAL",
  strategyJustification: {
    reasonCode: "runner-semantic",
    detail:
      "pytest.skip/xfail/parametrize marks are runner decorators and " +
      "module-level calls; the detector matches those exact tokens on the " +
      "code-only text — the semantics are runner skip state",
  },
  introduced: "0.3.0",
  // Measured 2026-09-02 (corpus wave 5): FP ≤ 10% but n < 20 — measured-extended until the core DoD n ≥ 20 is met (plan §23).
  // 6.0: was "core". Demoted because the measurement does not support the
  // claim — 0% observed over n=10..25 is a 95% Wilson interval of
  // [0, 13.8%] to [0, 40.4%], which does not clear the 10% core ceiling. Only
  // `quarantine` is enforced, so this is behaviour-neutral: the rule still
  // runs on every scan. A re-sample at the raised MAX_SAMPLES_PER_RULE can
  // earn it back; src/rules/tier-evidence.ts ratchets that.
  tier: "extended",
  // A committed -k filter or ::node selection runs a subset; everything else
  // is unverified while CI stays green. See RuleMeta.suiteInvalidating.
  suiteInvalidating: true,

  run(ctx) {
    const text = ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;

    const patterns: RegExp[] = [
      // pytest.main([... "-k", ...]) — hardcoded subset selection.
      /pytest\.main\s*\(\s*\[[^\]]*['"]-k['"]/g,
      // Hardcoded node selection: pytest.main(["tests/test_x.py::test_y"]).
      // FW-RX-04: colon-exclusive segments — `seg(::seg)+` — so the two
      // quantifiers can never exchange colon runs (class-level node ids
      // like file.py::Class::test still match).
      // eslint-disable-next-line security/detect-unsafe-regex -- bounded literal pattern (no quantifier exchange surface) — ReDoS is authoritatively gated by regexp/no-super-linear-backtracking (error in the ratchet) + tests/rules/redos-gate.spec.ts
      /pytest\.main\s*\(\s*\[[^\]]*['"][^'":]+(?:::[^'":]+)+['"]/g,
      // @pytest.mark.only — not built into pytest but common via plugins.
      /@pytest\.mark\.only\b/g,
    ];

    for (const re of patterns) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        findings.push({
          severity: "error",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "FALSE-GREEN",
          file: ctx.path,
          line: lineAt(text, m.index),
          column: colAt(text, m.index),
          message: `Focused-test selection committed: \`${m[0].trim()}\`.`,
          why: "A hardcoded -k filter or ::node selection runs only a subset of the suite — everything else is unverified while CI stays green.",
          fix: "Remove the -k/:: selection from committed code; pass it on the command line locally instead.",
        });
      }
    }
    return findings;
  },
});
