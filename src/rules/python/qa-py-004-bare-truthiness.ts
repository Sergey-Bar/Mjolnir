/**
 * QA-PY-004 — Bare truthiness assert on complex object.
 * Severity: warning · Confidence: medium · heuristic-risk
 * `assert result` passes for ANY truthy value — including a wrong one.
 * It verifies almost nothing about behavior.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const pyBareTruthinessAssert = defineRule({
  id: "QA-PY-004",
  category: "QA-TQUAL",
  title: "Bare truthiness assert on complex object",
  severity: "warning",
  confidence: "medium",
  findingType: "heuristic-risk",
  qaImpact: "FALSE-GREEN",
  appliesTo: "python",
  // Trust Metadata
  languages: ["python"],
  frameworks: ["pytest"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.3.0",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;

    // `assert <identifier-or-call>` with no comparison/boolean operator.
    const re = /^[ \t]*assert\s+([A-Za-z_][\w.]*(?:\([^()]*\))?)[ \t]*$/gm;

    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.text)) !== null) {
      const target = m[1] ?? "";
      // Skip obviously-boolean names (is_/has_/can_ conventions).
      if (/^(?:is|has|can|should|was|were)_/.test(target)) continue;
      findings.push({
        severity: "warning",
        confidence: "medium",
        findingType: "heuristic-risk",
        qaImpact: "FALSE-GREEN",
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: `Bare truthiness assert: \`assert ${target}\`.`,
        why: "This passes for any truthy value — a wrong object, wrong count, or partially-built result all slip through. It verifies existence, not correctness.",
        fix: "Assert the specific expected value or property: `assert result.id == expected`, `assert len(items) == 3`.",
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
