/**
 * QA-PW-101 — waitForTimeout() anywhere.
 * Severity: error · Confidence: high · deterministic-defect
 * Hard sleeps are the #1 source of slow, flaky Playwright suites.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const pwWaitForTimeout = defineRule({
  id: "QA-PW-101",
  // Measured core (Verification Trust corpus, 2026-09-01): 20/20
  // adjudicated TP across next-auth and sveltejs/kit — every sampled
  // call is a load-bearing, false-pass-prone hard sleep (plan §11.5
  // UNSURE adjudication; was the D5 "parked on 20 UNSURE" defect).
  // 6.0: was "core". Demoted because the measurement does not support the
  // claim — 0% observed over n=10..25 is a 95% Wilson interval of
  // [0, 13.8%] to [0, 40.4%], which does not clear the 10% core ceiling. Only
  // `quarantine` is enforced, so this is behaviour-neutral: the rule still
  // runs on every scan. A re-sample at the raised MAX_SAMPLES_PER_RULE can
  // earn it back; src/rules/tier-evidence.ts ratchets that.
  tier: "extended",
  category: "QA-PW",
  title: "Hard sleep via waitForTimeout",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FLAKY-RISK",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "LEXICAL",
  strategyJustification: {
    reasonCode: "family-fallback-lockstep",
    detail:
      "the hard-sleep family's §13.2 structural path (AST hook) carries " +
      "the depth where a tree is available; this lexical path is the " +
      "mandatory deterministic fallback kept in lockstep — the family's " +
      "depth is real, the regex is its degraded mode",
  },
  introduced: "0.3.0",
  // R6 (Bug Map M-02): QA-TEST-004 (extended, warning) matches
  // `await page.waitForTimeout(` via its own patterns — co-fire proven
  // on one line in examples/demo-repo/e2e/checkout.spec.ts:6 and in the
  // QA-PW-101/QA-TEST-004 must-fire fixtures. The measured, error-tier
  // Playwright-specific diagnosis survives; the generic one is deduped.
  // Verified negative: QA-PW-102/QA-PW-118 do NOT co-fire (disjoint
  // 'load'/'networkidle' args) — see engine/overlap-dedup.ts.
  overlapWith: ["QA-TEST-004"],
  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    const re = /waitForTimeout\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      findings.push({
        severity: "error",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "FLAKY-RISK",
        file: ctx.path,
        line: lineAt(text, m.index),
        column: colAt(text, m.index),
        message: "`waitForTimeout()` hard sleep.",
        why: "Fixed waits either wait too long (slow suite) or too little (flaky on slow machines). They encode hope, not synchronization.",
        fix: "Replace with a web-first assertion (`await expect(locator).toBeVisible()`) or `locator.waitFor()`.",
      });
    }
    return findings;
  },
});
