/**
 * QA-PY-006 — Empty test body (`pass` only).
 * Severity: error · Confidence: high · deterministic-defect
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const pyEmptyBody = defineRule({
  id: "QA-PY-006",
  category: "QA-TEST",
  title: "Empty test body (pass)",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "python" as unknown as "test-files",
  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;

    const re =
      /^( *)def\s+(test_\w+)\s*\([^)]*\):\s*\n(?:\1\s+#.*\n)?\1 {4}pass\s*$/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.text)) !== null) {
      findings.push({
        severity: "error",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "FALSE-GREEN",
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: `Test \`${m[2]}\` has an empty body (pass only).`,
        why: "An empty test inflates pass counts and proves nothing about behavior.",
        fix: "Implement the test or remove it.",
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
