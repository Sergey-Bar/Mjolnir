/**
 * QA-JV-105 — waitForTimeout / hardcoded navigation waits.
 * Severity: warning · Confidence: high · deterministic-defect
 * Playwright-Java's page.waitForTimeout is a hard sleep.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

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
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".java")) return findings;

    const re = /\.waitForTimeout\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      findings.push({
        severity: "warning",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "FLAKY-RISK",
        file: ctx.path,
        line: lineAt(text, m.index),
        column: colAt(text, m.index),
        message: "`waitForTimeout()` hard sleep.",
        why: "Fixed waits encode hope, not synchronization — too short flakes under load, too long slows every run.",
        fix: "Use `page.locator(...).waitFor()` or `assertThat(locator).isVisible()` with auto-waiting.",
      });
    }
    return findings;
  },
});
