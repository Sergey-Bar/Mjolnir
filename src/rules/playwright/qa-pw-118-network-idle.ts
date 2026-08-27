/**
 * QA-PW-118 — waitForLoadState('networkidle') — flaky by design.
 * Severity: warning · Confidence: high · deterministic-defect
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const networkIdleWait = defineRule({
  id: "QA-PW-118",
  category: "QA-PW",
  title: "Network idle wait (flaky by design)",
  severity: "warning",
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
    const text = ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    const re = /waitForLoadState\s*\(\s*['"`]networkidle['"`]\s*\)/g;
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
        message: "`waitForLoadState('networkidle')` used.",
        why: "Network idle is unreliable — background requests, analytics, and websockets make it never fire or fire randomly.",
        fix: "Wait for a specific element or response: `page.waitForResponse()` or `expect(locator).toBeVisible()`.",
      });
    }
    return findings;
  },
});
