/**
 * QA-TEST-010 — Empty test body.
 * Severity: error · Confidence: high · deterministic-defect
 * A test that executes nothing can never fail — the purest false proof.
 */

import { defineRule } from "../rule.js";
import { lineAt, colAt } from "../shared/positions.js";
import { isInsideEmbeddedCode } from "../shared/masking.js";

export const emptyTestBody = defineRule({
  id: "QA-TEST-010",
  category: "QA-TEST",
  title: "Empty test body",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["jest", "vitest", "playwright", "mocha"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.1.0",

  run(ctx) {
    const text = ctx.text;
    const findings: Omit<
      import("../../types.js").Finding,
      "ruleId" | "category"
    >[] = [];

    // Matches it/test/describe-with-it whose callback is empty or comment-only:
    // `it('x', () => {})` / `it('x', () => { /* nothing */ })`
    const re =
      /\b(?:it|test)\s*\(\s*['"`][^'"`]*['"`]\s*,\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{\s*(?:\/\*[\s\S]*?\*\/|\/\/[^\n]*)?\s*\}\s*\)/g;

    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      // Skip matches inside string literals containing embedded code (test data)
      if (isInsideEmbeddedCode(ctx, m.index)) continue;

      findings.push({
        severity: "error",
        confidence: "high",
        findingType: "deterministic-defect",
        file: ctx.path,
        line: lineAt(text, m.index),
        column: colAt(text, m.index),
        message: "Test has an empty body — it can never fail.",
        why: "An empty test inflates pass counts and proves nothing about behavior.",
        fix: "Implement the test or remove it.",
        qaImpact: "FALSE-GREEN",
      });
    }
    return findings;
  },
});
