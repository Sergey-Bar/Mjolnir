/**
 * QA-PW-102 — waitForEvent('load') / waitForLoadState('load') instead of
 * web-first assertions.
 * Severity: warning · Confidence: high · deterministic-defect
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

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
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    const re =
      /(?:waitForEvent\s*\(\s*['"]load['"]|waitForLoadState\s*\(\s*['"]load['"])/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.text)) !== null) {
      findings.push({
        severity: "warning",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "HYGIENE",
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: `\`${m[0]}\` instead of a web-first assertion.`,
        why: "'load' fires when the page loads, not when YOUR element is ready — the test can still race the app and fail intermittently.",
        fix: "Assert on the element you actually care about: `await expect(page.getByRole('heading')).toBeVisible()`.",
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
