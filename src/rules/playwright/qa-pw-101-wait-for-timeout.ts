/**
 * QA-PW-101 — waitForTimeout() anywhere.
 * Severity: error · Confidence: high · deterministic-defect
 * Hard sleeps are the #1 source of slow, flaky Playwright suites.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const pwWaitForTimeout = defineRule({
  id: "QA-PW-101",
  category: "QA-PW",
  title: "Hard sleep via waitForTimeout",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FLAKY-RISK",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.3.0",
  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    const re = /waitForTimeout\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.text)) !== null) {
      findings.push({
        severity: "error",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "FLAKY-RISK",
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: "`waitForTimeout()` hard sleep.",
        why: "Fixed waits either wait too long (slow suite) or too little (flaky on slow machines). They encode hope, not synchronization.",
        fix: "Replace with a web-first assertion (`await expect(locator).toBeVisible()`) or `locator.waitFor()`.",
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
