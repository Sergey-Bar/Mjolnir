/**
 * QA-PY-005 — time.sleep() in tests.
 * Severity: warning · Confidence: high · deterministic-defect
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const pyHardSleep = defineRule({
  id: "QA-PY-005",
  category: "QA-TEST",
  title: "time.sleep() in test",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FLAKY-RISK",
  appliesTo: "python",
  // Trust Metadata
  languages: ["python"],
  frameworks: ["pytest"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.3.0",

  // Measured FP 16% (n=19): genuine e2e hard sleeps, but browser-side instrumentation and wall-clock timing subjects are legitimate (16% <= 30% = extended).

  tier: "extended",

  // R6 (Bug Map M-02): QA-PY-102 is the weaker, unmeasured duplicate —
  // same `time.sleep(` root cause (co-fire proven on one line in
  // tests/fixtures/QA-PY-102/must-fire/test_dash.py:8). The measured
  // rule survives; the unmeasured one is deduped (and demoted to
  // quarantine per Bug Map M-06, which makes the tier order agree).
  overlapWith: ["QA-PY-102"],

  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;

    const re = /\btime\.sleep\s*\(\s*\d+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      findings.push({
        severity: "warning",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "FLAKY-RISK",
        file: ctx.path,
        line: lineAt(text, m.index),
        column: colAt(text, m.index),
        message: `Hard sleep: \`${m[0]}…\`.`,
        why: "Fixed sleeps make tests slow and flaky — they guess at timing instead of waiting for state.",
        fix: "Wait for an explicit condition (polling helper, pytest-timeout wait_until, or event).",
      });
    }
    return findings;
  },
});
