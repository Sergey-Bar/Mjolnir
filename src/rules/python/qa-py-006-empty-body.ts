/**
 * QA-PY-006 — Empty test body (`pass` only).
 * Severity: error · Confidence: high · deterministic-defect
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const pyEmptyBody = defineRule({
  id: "QA-PY-006",
  category: "QA-TEST",
  title: "Empty test body (pass)",
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
  tier: "quarantine",

  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;

    const re =
      /^( *)def\s+(test_\w+)\s*\([^)]*\):\s*\n(?:\1\s+#.*\n)?\1 {4}pass\s*$/gm;
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
        message: `Test \`${m[2]}\` has an empty body (pass only).`,
        why: "An empty test inflates pass counts and proves nothing about behavior.",
        fix: "Implement the test or remove it.",
      });
    }
    return findings;
  },
});
