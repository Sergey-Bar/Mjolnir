/**
 * QA-CS-102 — Task.Delay / Thread.Sleep in tests.
 * Severity: warning · Confidence: high · deterministic-defect
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const csHardSleep = defineRule({
  id: "QA-CS-102",
  category: "QA-PW",
  title: "Hard sleep in test",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FLAKY-RISK",
  appliesTo: "csharp",
  // Trust Metadata
  languages: ["csharp"],
  frameworks: ["nunit", "xunit", "mstest", "playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.3.8",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".cs")) return findings;

    const re = /\b(?:Thread\.Sleep|Task\.Delay)\s*\(/g;
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
        message: `\`${m[0]}\` used to wait for state.`,
        why: "Fixed sleeps are flaky under load and slow everywhere; Playwright locators auto-wait for actionability.",
        fix: "Use `await Assertions.Expect(locator).ToBeVisibleAsync()` or locator.WaitForAsync().",
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
