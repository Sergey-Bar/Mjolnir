/**
 * QA-PY-102 — Playwright-Python: time.sleep() instead of auto-waiting.
 * Severity: warning · Confidence: high · deterministic-defect
 * The #1 Python-Playwright flake source: sleeping "until the page is
 * ready" instead of waiting on a locator condition.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const pyPwHardSleep = defineRule({
  id: "QA-PY-102",
  category: "QA-PW",
  title: "time.sleep() in Playwright test",
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
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;
    if (!/playwright/i.test(ctx.text)) return findings;

    const re = /\btime\.sleep\s*\(/g;
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
        message: "`time.sleep()` used to wait for UI state.",
        why: "Fixed sleeps guess at timing: too short → flaky failures under load, too long → slow suite. Playwright locators already auto-wait for the element to be actionable.",
        fix: "Replace with `expect(page.get_by_text(...)).to_be_visible()` or `page.wait_for_selector`.",
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
