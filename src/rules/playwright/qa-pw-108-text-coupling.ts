/**
 * QA-PW-108 — textContent assertions where role/text locators belong.
 * Severity: info · Confidence: low · heuristic-risk
 * Asserting raw textContent couples tests to markup; accessible name is
 * what the user experiences.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const pwTextContentCoupling = defineRule({
  id: "QA-PW-108",
  category: "QA-PW",
  title: "textContent assertion instead of accessible name",
  severity: "info",
  confidence: "low",
  findingType: "heuristic-risk",
  qaImpact: "HYGIENE",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "high",
  autofix: false,
  detectionStrategy: "LEXICAL",
  introduced: "0.3.0",
  tier: "quarantine",

  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    const re = /expect\(([^()]*(?:\([^()]*\)[^()]*)*)\)\.toHaveText\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      findings.push({
        severity: "info",
        confidence: "low",
        findingType: "heuristic-risk",
        qaImpact: "HYGIENE",
        file: ctx.path,
        line: lineAt(text, m.index),
        column: colAt(text, m.index),
        message: "`toHaveText` couples the test to exact markup text.",
        why: "Whitespace, nested spans, or i18n variants break exact-text matches even when the UI is correct for the user.",
        fix: "Prefer `getByRole(..., { name })` + `toBeVisible`, or assert a normalized substring with `toContainText`.",
      });
    }
    return findings;
  },
});
