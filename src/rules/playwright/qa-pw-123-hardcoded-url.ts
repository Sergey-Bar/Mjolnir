/**
 * QA-PW-123 — Hardcoded baseURL in specs.
 * Severity: warning · Confidence: high · deterministic-defect
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";
import { isInsideEmbeddedCode } from "../shared/masking.js";

export const hardcodedBaseUrl = defineRule({
  id: "QA-PW-123",
  category: "QA-PW",
  title: "Hardcoded environment URL in spec",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "HYGIENE",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "LEXICAL",
  introduced: "0.3.0",

  // Measured 2026-09-02 (corpus wave 5): tier set from the measured envelope (plan §11.2).
  tier: "quarantine",
  run(ctx) {
    const text = ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    const re =
      /(?:goto|request)\s*\(\s*['"`]https?:\/\/(?!localhost)[^'"`]+['"`]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      // Reads raw text because the URL is string content. Skip when the whole
      // expression is itself inside a string literal — that is a code sample
      // passed to the function under test, not a live navigation.
      if (isInsideEmbeddedCode(ctx, m.index)) continue;
      findings.push({
        severity: "warning",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "HYGIENE",
        file: ctx.path,
        line: lineAt(text, m.index),
        column: colAt(text, m.index),
        message: `Hardcoded URL: \`${m[0].slice(0, 60)}\`.`,
        why: "Specs pointing at absolute URLs break when environments change and can hit production by accident.",
        fix: "Use relative paths with baseURL from playwright.config, or an env variable.",
      });
    }
    return findings;
  },
});
