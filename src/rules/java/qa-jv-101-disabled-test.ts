/**
 * QA-JV-101 — @Disabled test without justification.
 * Severity: warning · Confidence: high · deterministic-defect
 * Disabled JUnit tests hide broken behavior behind a green run.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const jvDisabledTest = defineRule({
  id: "QA-JV-101",
  category: "QA-PW",
  title: "Disabled test",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "java",
  // Trust Metadata
  languages: ["java"],
  frameworks: ["junit", "testng"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.3.8",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".java")) return findings;

    const patterns = [
      { re: /@Disabled\b/g, label: "@Disabled" },
      { re: /@Ignore\b/g, label: "@Ignore (TestNG/JUnit4)" },
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
          message: `Disabled test detected: \`${label}\`.`,
          why: "Disabled tests hide broken or unimplemented behavior behind a green build.",
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
