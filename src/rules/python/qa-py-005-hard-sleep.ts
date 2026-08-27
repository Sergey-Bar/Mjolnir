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
