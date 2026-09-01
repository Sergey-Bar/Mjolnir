/**
 * QA-PW-101 — waitForTimeout() anywhere.
 * Severity: error · Confidence: high · deterministic-defect
 * Hard sleeps are the #1 source of slow, flaky Playwright suites.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

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
  // R6 (Bug Map M-02): QA-TEST-004 (extended, warning) matches
  // `await page.waitForTimeout(` via its own patterns — co-fire proven
  // on one line in examples/demo-repo/e2e/checkout.spec.ts:6 and in the
  // QA-PW-101/QA-TEST-004 must-fire fixtures. The measured, error-tier
  // Playwright-specific diagnosis survives; the generic one is deduped.
  // Verified negative: QA-PW-102/QA-PW-118 do NOT co-fire (disjoint
  // 'load'/'networkidle' args) — see engine/overlap-dedup.ts.
  overlapWith: ["QA-TEST-004"],
  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    const re = /waitForTimeout\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      findings.push({
        severity: "error",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "FLAKY-RISK",
        file: ctx.path,
        line: lineAt(text, m.index),
        column: colAt(text, m.index),
        message: "`waitForTimeout()` hard sleep.",
        why: "Fixed waits either wait too long (slow suite) or too little (flaky on slow machines). They encode hope, not synchronization.",
        fix: "Replace with a web-first assertion (`await expect(locator).toBeVisible()`) or `locator.waitFor()`.",
      });
    }
    return findings;
  },
});
