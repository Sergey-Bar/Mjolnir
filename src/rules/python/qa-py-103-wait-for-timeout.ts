/**
 * QA-PY-103 — Playwright-Python: wait_for_timeout() as synchronization.
 * Severity: warning · Confidence: high · deterministic-defect
 * page.wait_for_timeout is a hard sleep wearing a Playwright costume.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const pyPwWaitForTimeout = defineRule({
  id: "QA-PY-103",
  category: "QA-PW",
  title: "wait_for_timeout() as sync",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FLAKY-RISK",
  appliesTo: "python",
  // Trust Metadata
  languages: ["python"],
  frameworks: ["pytest-playwright", "playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.3.8",

  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;

    const re = /\.wait_for_timeout\s*\(/g;
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
        message: "`wait_for_timeout()` used for synchronization.",
        why: "It is a fixed sleep: it neither guarantees readiness nor fails when the app is broken — it just burns wall-time and flakes under load.",
        fix: "Wait for a condition: `expect(locator).to_be_visible()`, `page.wait_for_url(...)`, or `page.expect_response(...)`.",
      });
    }
    return findings;
  },
});
