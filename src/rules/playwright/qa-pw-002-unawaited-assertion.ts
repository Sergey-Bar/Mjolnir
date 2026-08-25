/**
 * QA-PW-002 — Missing `await` on a Playwright locator assertion.
 * Severity: error · Confidence: high · deterministic-defect
 * An unawaited expect(locator) returns an unfulfilled promise — the
 * assertion never actually runs and the test passes vacuously.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const unawaitedLocatorAssertion = defineRule({
  id: "QA-PW-002",
  category: "QA-PW",
  title: "Unawaited Playwright assertion",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.1.0",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    // `expect(page...` or `expect(locator...)` NOT preceded by await.
    // Negative lookbehind for "await " (variable whitespace).
    const re =
      /(?<!await\s{0,10})expect\s*\(\s*(?:page|locator|this\.page)[.(]/g;

    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.text)) !== null) {
      findings.push({
        severity: "error",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "FALSE-GREEN",
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: "Playwright locator assertion is not awaited.",
        why: "Without `await`, the assertion promise is never resolved — the check silently never runs and the test passes vacuously.",
        fix: "Add `await`: `await expect(locator).toBeVisible()`.",
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
