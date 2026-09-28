/**
 * QA-PY-103 — Playwright-Python: wait_for_timeout() as synchronization.
 * Severity: warning · Confidence: high · deterministic-defect
 * page.wait_for_timeout is a hard sleep wearing a Playwright costume.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const pyPwWaitForTimeout = defineRule({
  id: "QA-PY-103",
  category: "QA-PW",
  title: "wait_for_timeout() as sync",
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
  strategyJustification: {
    reasonCode: "exact-key-match",
    detail:
      "page.waitForTimeout is an exact Playwright token in Python tests; " +
      "the detector matches the call identifier — closed token, same " +
      "predicate the AST would encode",
  },
  introduced: "0.3.8",
  // 6.0: was "core". Demoted because the measurement does not support the
  // claim — 0% observed over n=10..25 is a 95% Wilson interval of
  // [0, 13.8%] to [0, 40.4%], which does not clear the 10% core ceiling. Only
  // `quarantine` is enforced, so this is behaviour-neutral: the rule still
  // runs on every scan. A re-sample at the raised MAX_SAMPLES_PER_RULE can
  // earn it back; src/rules/tier-evidence.ts ratchets that.
  tier: "extended",

  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;

    const re = /\.wait_for_timeout\s*\(/g;
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
        message: "`wait_for_timeout()` used for synchronization.",
        why: "It is a fixed sleep: it neither guarantees readiness nor fails when the app is broken — it just burns wall-time and flakes under load.",
        fix: "Wait for a condition: `expect(locator).to_be_visible()`, `page.wait_for_url(...)`, or `page.expect_response(...)`.",
      });
    }
    return findings;
  },
});
