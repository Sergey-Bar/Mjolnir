/**
 * QA-PY-012 — Tautological assertion (`assert True`, `assert x == x`).
 * Severity: error · Confidence: high · deterministic-defect
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const pyTautological = defineRule({
  id: "QA-PY-012",
  category: "QA-TQUAL",
  title: "Tautological assertion",
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
  detectionStrategy: "regex pattern",
  introduced: "0.3.0",

  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;

    const patterns = [
      // [ \t] not \s — \s crosses lines causing duplicate/looping matches.
      /^[ \t]*assert[ \t]+True(?![A-Za-z0-9_])/m,
      /^[ \t]*assert[ \t]+([A-Za-z_][A-Za-z0-9_]*)[ \t]*==[ \t]*\1(?![A-Za-z0-9_])/m,
    ];

    const seenLines = new Set<number>();
    for (const re of patterns) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      let guard = 0;
      while ((m = re.exec(text)) !== null) {
        if (++guard > 1000) break; // safety net against pathological input
        const line = lineAt(text, m.index);
        if (seenLines.has(line)) {
          // Zero-width progress at same position — advance manually.
          re.lastIndex = text.indexOf("\n", m.index) + 1;
          if (re.lastIndex === 0) break;
          continue;
        }
        seenLines.add(line);
        findings.push({
          severity: "error",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "FALSE-GREEN",
          file: ctx.path,
          line: lineAt(text, m.index),
          column: colAt(text, m.index),
          message: `Tautological assertion: \`${m[0].trim()}\`.`,
          why: "Asserting a literal against itself can never fail — it verifies no system behavior.",
          fix: "Assert on actual output of the code under test.",
        });
      }
    }
    return findings;
  },
});
