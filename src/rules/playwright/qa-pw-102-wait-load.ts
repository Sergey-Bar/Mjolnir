/**
 * QA-PW-102 — waitForEvent('load') / waitForLoadState('load') instead of
 * web-first assertions.
 * Severity: warning · Confidence: high · deterministic-defect
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const pwWaitForLoadEvent = defineRule({
  id: "QA-PW-102",
  category: "QA-PW",
  title: "Load-event wait instead of web-first assertion",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "HYGIENE",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.3.0",

  run(ctx) {
    // Raw text on purpose: the signal is the string argument `'load'`, which
    // `codeText` would blank to spaces. (Same reason the network-idle family
    // sets `useCodeText: false`.)
    const text = ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    const re =
      /waitForEvent\s*\(\s*['"]load['"]|waitForLoadState\s*\(\s*['"]load['"]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      findings.push({
        severity: "warning",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "HYGIENE",
        file: ctx.path,
        line: lineAt(text, m.index),
        column: colAt(text, m.index),
        message: `\`${m[0]}\` instead of a web-first assertion.`,
        why: "'load' fires when the page loads, not when YOUR element is ready — the test can still race the app and fail intermittently.",
        fix: "Assert on the element you actually care about: `await expect(page.getByRole('heading')).toBeVisible()`.",
      });
    }
    return findings;
  },
});
