/**
 * QA-PW-104 — `{ trial: true }` misuse — check-then-act race.
 * Severity: warning · Confidence: medium · heuristic-risk
 * A trial click performs no action; code after it assumes the act happened.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const pwTrialMisuse = defineRule({
  id: "QA-PW-104",
  category: "QA-PW",
  title: "trial:true click without follow-up assertion",
  severity: "warning",
  confidence: "medium",
  findingType: "heuristic-risk",
  qaImpact: "FALSE-GREEN",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "LEXICAL",
  introduced: "0.3.0",

  // Measured 2026-09-02 (corpus wave 5): FP ≤ 10% but n < 20 — measured-extended until the core DoD n ≥ 20 is met (plan §23).
  tier: "core",
  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    const re = /\.click\s*\(\s*\{[^}]*trial\s*:\s*true[^}]*\}\s*\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      findings.push({
        severity: "warning",
        confidence: "medium",
        findingType: "heuristic-risk",
        qaImpact: "FALSE-GREEN",
        file: ctx.path,
        line: lineAt(text, m.index),
        column: colAt(text, m.index),
        message: "`click({ trial: true })` — a dry-run that clicks nothing.",
        why: "Trial clicks only check actionability; any test logic assuming the click happened is verifying nothing while staying green.",
        fix: "Use a real `click()` and assert the resulting state, or keep trial only as an explicit actionability probe with a comment.",
      });
    }
    return findings;
  },
});
