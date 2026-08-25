/**
 * QA-PW-108 — textContent assertions where role/text locators belong.
 * Severity: info · Confidence: low · heuristic-risk
 * Asserting raw textContent couples tests to markup; accessible name is
 * what the user experiences.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

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
  detectionStrategy: "regex pattern",
  introduced: "0.3.0",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    const re = /expect\(([^()]*(?:\([^()]*\)[^()]*)*)\)\.toHaveText\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.text)) !== null) {
      findings.push({
        severity: "info",
        confidence: "low",
        findingType: "heuristic-risk",
        qaImpact: "HYGIENE",
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: "`toHaveText` couples the test to exact markup text.",
        why: "Whitespace, nested spans, or i18n variants break exact-text matches even when the UI is correct for the user.",
        fix: "Prefer `getByRole(..., { name })` + `toBeVisible`, or assert a normalized substring with `toContainText`.",
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
