/**
 * QA-CS-104 — Static/shared Playwright page across tests.
 * Severity: warning · Confidence: medium · heuristic-risk
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const csSharedPage = defineRule({
  id: "QA-CS-104",
  category: "QA-PW",
  title: "Static/shared Playwright page across tests",
  severity: "warning",
  confidence: "medium",
  findingType: "heuristic-risk",
  qaImpact: "FLAKY-RISK",
  appliesTo: "csharp",
  // Trust Metadata
  languages: ["csharp"],
  frameworks: ["nunit", "xunit", "mstest", "playwright"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.3.8",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".cs")) return findings;

    const re =
      /^\s*(?:public|private|protected|internal)?\s*static\s+(?:readonly\s+)?IPage\b/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.text)) !== null) {
      findings.push({
        severity: "warning",
        confidence: "medium",
        findingType: "heuristic-risk",
        qaImpact: "FLAKY-RISK",
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: "`static IPage` — browser state shared across tests.",
        why: "Parallel test execution shares statics: one test navigating or closing the page corrupts every other test's session.",
        fix: "Create the page per test in setup, or use Playwright.NET's per-test fixtures.",
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
