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
  introduced: "0.3.0",
  // Measured 2026-09-02 (corpus wave 5): FP ≤ 10% but n < 20 — measured-extended until the core DoD n ≥ 20 is met (plan §23).
  tier: "core",
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
      /pytest\.main\s*\(\s*\[[^\]]*['"][^'"]+::[^'"]+['"]/g,
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
