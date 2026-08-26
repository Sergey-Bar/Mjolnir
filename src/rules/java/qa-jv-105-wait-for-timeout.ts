/**
 * QA-JV-105 — waitForTimeout / hardcoded navigation waits.
 * Severity: warning · Confidence: high · deterministic-defect
 * Playwright-Java's page.waitForTimeout is a hard sleep.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const jvWaitForTimeout = defineRule({
  id: "QA-JV-105",
  category: "QA-PW",
  title: "waitForTimeout hard sleep",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FLAKY-RISK",
  appliesTo: "java",
  // Trust Metadata
  languages: ["java"],
  frameworks: ["junit", "testng", "playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.3.8",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".java")) return findings;

    const re = /\.waitForTimeout\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.text)) !== null) {
      findings.push({
        severity: "warning",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "FLAKY-RISK",
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: "`waitForTimeout()` hard sleep.",
        why: "Fixed waits encode hope, not synchronization — too short flakes under load, too long slows every run.",
        fix: "Use `page.locator(...).waitFor()` or `assertThat(locator).isVisible()` with auto-waiting.",
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
