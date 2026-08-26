/**
 * QA-CS-101 — [Ignore]/[Skip] test without justification.
 * Severity: warning · Confidence: high · deterministic-defect
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const csSkippedTest = defineRule({
  id: "QA-CS-101",
  category: "QA-PW",
  title: "Skipped test",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "csharp",
  // Trust Metadata
  languages: ["csharp"],
  frameworks: ["nunit", "xunit", "mstest"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.3.8",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".cs")) return findings;

    const patterns = [
      { re: /\[Ignore(?:\([^)]*\))?\]/g, label: "[Ignore]" },
      { re: /\[Skip\b[^\]]*\]/g, label: "[Skip]" },
      { re: /\[Fact\s*\(\s*Skip\s*=/g, label: "Fact(Skip=...)" },
    ];
    for (const { re, label } of patterns) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(ctx.text)) !== null) {
        findings.push({
          severity: "warning",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "FALSE-GREEN",
          file: ctx.path,
          line: lineAt(ctx.text, m.index),
          column: colAt(ctx.text, m.index),
          message: `Skipped test detected: \`${label}\`.`,
          why: "Skipped tests hide broken or unimplemented behavior behind a green build.",
          fix: "Fix and re-enable the test, or delete it with a tracked issue reference.",
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
