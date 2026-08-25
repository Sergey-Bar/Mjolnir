/**
 * QA-PY-009 — Commented-out tests.
 * Severity: warning · Confidence: high · deterministic-defect
 * `# def test_...` / `#     test_something(` — disabled checks rot silently.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

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

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;

    // Commented test definitions or commented pytest invocations.
    const re = /#\s*(?:def\s+test_\w+|(?:pytest\.)?(?:main|test_\w+)\s*\()/g;

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

function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text[i] === "\n") line++;
  return line;
}

function colAt(text: string, index: number): number {
  const lastBreak = text.lastIndexOf("\n", index - 1);
  return index - lastBreak;
}
