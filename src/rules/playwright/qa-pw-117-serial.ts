/**
 * QA-PW-117 — test.describe.serial without justification comment.
 * Severity: warning · Confidence: high · deterministic-defect
 * Serial mode couples tests into one failure cascade; it must be a
 * documented decision, not a default.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const pwSerialNoJustification = defineRule({
  id: "QA-PW-117",
  category: "QA-PW",
  title: "describe.serial without justification",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "HYGIENE",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.3.0",

  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    const re = /test\.describe\.serial\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      // Look at the comment on the same line or the one above.
      // Use raw text for justification check — comments ARE the signal.
      const lineStart = ctx.text.lastIndexOf("\n", m.index) + 1;
      const prevLineStart = ctx.text.lastIndexOf("\n", lineStart - 2) + 1 || 0;
      const contextWindow = ctx.text.slice(
        Math.max(prevLineStart - 200, 0),
        lineStart,
      );
      const justified =
        /(?:\/\/|\/\*|#)\s*(?:justified|serial|order\s*matters|stateful)/i.test(
          contextWindow,
        );
      if (!justified) {
        findings.push({
          severity: "warning",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "HYGIENE",
          file: ctx.path,
          line: lineAt(text, m.index),
          column: colAt(text, m.index),
          message: "`test.describe.serial` without a justification comment.",
          why: "Serial mode turns any single failure into a cascade for everything after it — it should be an explicit, documented trade-off.",
          fix: "Add a comment explaining why order matters, or refactor tests to be independent.",
        });
      }
    }
    return findings;
  },
});
