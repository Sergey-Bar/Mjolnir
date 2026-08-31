/**
 * QA-TEST-002 — Skipped test (`it.skip`, `xit`, `test.skip`, `describe.skip`).
 * Severity: warning · Confidence: high · deterministic-defect
 */

import { defineRule } from "../rule.js";
import { lineAt, colAt } from "../shared/positions.js";

export const skippedTest = defineRule({
  id: "QA-TEST-002",
  category: "QA-TEST",
  title: "Skipped test",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["jest", "vitest", "mocha"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.1.0",
  // Measured FP 65% (n=20, docs/FP-AUDIT.md 2026-08-31): conditional
  // capability/environment skips (test.skip(fn), skip(!!process.env.DEV))
  // dominate real-world fire sites - legitimate scoping, not hidden
  // broken tests. North-star law: >30% FP cannot ship by default.
  tier: "quarantine",
  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<
      import("../../types.js").Finding,
      "ruleId" | "category"
    >[] = [];

    // Bug-audit M0 #13: the pattern list used to carry a third entry
    // (`it.todo(`) that was never executed — `patterns.slice(0, 2)` and a
    // comment promising "separate info-level handling" that never shipped.
    // Dead code removed; `it.todo` remains intentionally unreported.
    const skipPatterns = [
      /(?:^|[^\w$.])(?:xit|xdescribe)\s*\(/g,
      /\b(?:it|test|describe|bench)\.skip\s*\(/g,
    ];
    for (const re of skipPatterns) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        // Justification context: an issue reference (#123 / JIRA-42) or a
        // reason comment on the same line or the line above makes the skip
        // deliberate — downgrade stays a warning. A bare skip escalates.
        const lineStart = text.lastIndexOf("\n", m.index) + 1;
        const prevLineStart =
          lineStart <= 1 ? 0 : text.lastIndexOf("\n", lineStart - 2) + 1;
        const context =
          text.slice(lineStart, m.index + 120) +
          "\n" +
          text.slice(prevLineStart, lineStart);
        const justified =
          /#\d+|issues\/\d+|[A-Z][A-Z0-9]+-\d+|(?:\/\/|#)\s*(?:reason|because|until|blocked|flaky)|\/\*\s*(?:reason|because)/i.test(
            context,
          );
        findings.push({
          severity: justified ? "warning" : "error",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "FALSE-GREEN",
          file: ctx.path,
          line: lineAt(text, m.index),
          column: colAt(text, m.index),
          message: justified
            ? `Skipped test detected: \`${m[0].trim()}\`.`
            : `Skipped test without justification: \`${m[0].trim()}\`.`,
          why: "Skipped tests hide broken or unimplemented behavior behind a green checkmark.",
          fix: justified
            ? "Track the skip until it is resolved; remove it once the blocker clears."
            : "Fix and re-enable the test, or delete it with a tracked issue reference.",
        });
      }
    }
    return findings;
  },
});
