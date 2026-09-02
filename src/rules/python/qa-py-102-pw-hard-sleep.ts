/**
 * QA-PY-102 — Playwright-Python: time.sleep() instead of auto-waiting.
 * Severity: warning · Confidence: high · deterministic-defect
 * The #1 Python-Playwright flake source: sleeping "until the page is
 * ready" instead of waiting on a locator condition.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

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
  detectionStrategy: "LEXICAL",
  introduced: "0.3.8",
  // Bug Map M-06: unmeasured (n < 10 classified verdicts) yet shipping in
  // core by default — a north-star law #3 violation. Also the weaker,
  // now-deduped duplicate of measured QA-PY-005 (R6, overlapWith).
  tier: "quarantine",

  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;
    if (!/playwright/i.test(text)) return findings;

    const re = /\btime\.sleep\s*\(/g;
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
        message: "`time.sleep()` used to wait for UI state.",
        why: "Fixed sleeps guess at timing: too short → flaky failures under load, too long → slow suite. Playwright locators already auto-wait for the element to be actionable.",
        fix: "Replace with `expect(page.get_by_text(...)).to_be_visible()` or `page.wait_for_selector`.",
      });
    }
    return findings;
  },
});
