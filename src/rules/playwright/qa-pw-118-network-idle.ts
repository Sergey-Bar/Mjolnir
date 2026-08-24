/**
 * QA-PW-118 — waitForLoadState('networkidle') — flaky by design.
 * Severity: warning · Confidence: high · deterministic-defect
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const networkIdleWait = defineRule({
  id: "QA-PW-118",
  category: "QA-PW",
  title: "Network idle wait (flaky by design)",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FLAKY-RISK",
  appliesTo: "test-files",
  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    const re = /waitForLoadState\s*\(\s*['"`]networkidle['"`]\s*\)/g;
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
        message: "`waitForLoadState('networkidle')` used.",
        why: "Network idle is unreliable — background requests, analytics, and websockets make it never fire or fire randomly.",
        fix: "Wait for a specific element or response: `page.waitForResponse()` or `expect(locator).toBeVisible()`.",
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
