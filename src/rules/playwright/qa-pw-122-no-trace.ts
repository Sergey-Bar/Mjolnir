/**
 * QA-PW-122 — No trace capture on retry in playwright.config.
 * Severity: warning · Confidence: high · deterministic-defect
 * Without `trace: 'on-first-retry'`, a flaky pass leaves zero evidence.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const pwNoTraceOnRetry = defineRule({
  id: "QA-PW-122",
  category: "QA-PW",
  title: "No trace capture on retry",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "test-files",
  configRule: true,
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex heuristic",
  introduced: "0.3.0",

  // Measured FP 25% (n=20): genuine missing-trace configs dominate, but re-export configs blind the rule (25% <= 30% = extended).

  tier: "extended",

  run(ctx) {
    const text = ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    const base = ctx.path.split("/").pop() as string;
    if (!/^playwright\.config\.(ts|js|mjs|cts)$/.test(base)) return findings;

    if (
      !/trace\s*:\s*['"](?:on-first-retry|retain-on-failure|on)['"]/.test(text)
    ) {
      findings.push({
        severity: "warning",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "FALSE-GREEN",
        file: ctx.path,
        line: 1,
        column: 1,
        message: "playwright.config has no `trace` capture setting.",
        why: "A test that fails once and passes on retry is exactly the case you'll need evidence for later — with no trace, the flake is uninvestigable.",
        fix: "Add `use: { trace: 'on-first-retry' }` to the config.",
      });
    }
    return findings;
  },
});
