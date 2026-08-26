/**
 * QA-JV-102 — Thread.sleep() in tests.
 * Severity: warning · Confidence: high · deterministic-defect
 * Fixed sleeps guess at timing — the #1 Java UI-test flake source.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const jvHardSleep = defineRule({
  id: "QA-JV-102",
  category: "QA-PW",
  title: "Thread.sleep() in test",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FLAKY-RISK",
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

    const re = /\bThread\.sleep\s*\(/g;
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
        message: "`Thread.sleep()` used to wait for state.",
        why: "Fixed sleeps are flaky under load and slow everywhere; Playwright locators auto-wait for actionability.",
        fix: "Wait on a condition: `page.locator(...).waitFor()`, `assertThat(locator).isVisible()`.",
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
