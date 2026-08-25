/**
 * QA-TEST-002 — Skipped test (`it.skip`, `xit`, `test.skip`, `describe.skip`).
 * Severity: warning · Confidence: high · deterministic-defect
 */

import { defineRule } from "../rule.js";

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
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.1.0",
  run(ctx) {
    const findings: Omit<
      import("../../types.js").Finding,
      "ruleId" | "category"
    >[] = [];

    const patterns = [
      /(?:^|[^\w$.])(?:xit|xdescribe)\s*\(/g,
      /\b(?:it|test|describe|bench)\.skip\s*\(/g,
      /\b(?:it|test)\.todo\s*\(/g, // todo is intentional — reported as info? No:
    ];

    // it.todo is an intentional placeholder; treat separately at info level.
    const skipPatterns = patterns.slice(0, 2);
    for (const re of skipPatterns) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(ctx.text)) !== null) {
        // Justification context: an issue reference (#123 / JIRA-42) or a
        // reason comment on the same line or the line above makes the skip
        // deliberate — downgrade stays a warning. A bare skip escalates.
        const lineStart = ctx.text.lastIndexOf("\n", m.index) + 1;
        const prevLineStart = ctx.text.lastIndexOf("\n", lineStart - 2) + 1;
        const context =
          ctx.text.slice(lineStart, m.index + 120) +
          "\n" +
          ctx.text.slice(prevLineStart, lineStart);
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
          line: lineAt(ctx.text, m.index),
          column: colAt(ctx.text, m.index),
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

function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text[i] === "\n") line++;
  return line;
}

function colAt(text: string, index: number): number {
  const lastBreak = text.lastIndexOf("\n", index - 1);
  return index - lastBreak;
}
