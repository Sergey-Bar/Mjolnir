/**
 * QA-PY-009 — Commented-out tests.
 * Severity: warning · Confidence: high · deterministic-defect
 * `# def test_...` / `#     test_something(` — disabled checks rot silently.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const pyCommentedOutTest = defineRule({
  id: "QA-PY-009",
  category: "QA-TQUAL",
  title: "Commented-out test",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "HYGIENE",
  appliesTo: "python",
  // Trust Metadata
  languages: ["python"],
  frameworks: ["pytest"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "regex heuristic",
  introduced: "0.3.0",

  // Measured 2026-09-02 (corpus wave 5): FP ≤ 10% but n < 20 — measured-extended until the core DoD n ≥ 20 is met (plan §23).
  tier: "core",
  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;

    // Commented test definitions or commented pytest invocations.
    // `pytest.main(` must keep its namespace — a bare `# main()` is ordinary
    // prose ("call main() here"), not a disabled test.
    const re = /#\s*(?:def\s+test_\w+|pytest\.main\s*\(|test_\w+\s*\()/g;

    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.text)) !== null) {
      findings.push({
        severity: "warning",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "HYGIENE",
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: "Commented-out test detected.",
        why: "Disabled tests hide known-unverified behavior behind a green checkmark and rot silently.",
        fix: "Re-enable the test, or delete it with a tracked issue referencing what it covered.",
      });
    }
    return findings;
  },
});
