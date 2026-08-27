/**
 * QA-PW-114 — Legacy page.$ / page.$$ usage.
 * Severity: warning · Confidence: high · deterministic-defect
 * These return elements at call time (no auto-waiting) — should be locators.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const legacyElementHandles = defineRule({
  id: "QA-PW-114",
  category: "QA-PW",
  title: "Legacy element handle API (page.$)",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FLAKY-RISK",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.3.0",

  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    const re = /\bpage\.\$\$?\s*\(/g;
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
        message: `\`${m[0]}\` returns a stale-prone element handle.`,
        why: "Element handles don't auto-wait — the element may not exist yet, causing intermittent failures.",
        fix: "Use locators: `page.locator('...')` — they wait for the element automatically.",
      });
    }
    return findings;
  },
});
