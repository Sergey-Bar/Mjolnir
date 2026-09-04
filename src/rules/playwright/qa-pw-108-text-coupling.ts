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
  // RETIRED (docs/RULE-LIFECYCLE.md — Phase 2 quarantine-cluster triage):
  // measured 100% FP (n=20, docs/FP-AUDIT.md) with zero TPs — the rule's
  // premise is wrong on real code, not its tuning. Severity downgraded to
  // info (non-blocking everywhere); code + fixtures stay, the frozen ID
  // is never reused. Successor ideas ship under NEW rule IDs (lifecycle §2).
  tier: "quarantine",

  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    // eslint-disable-next-line security/detect-unsafe-regex -- bounded literal pattern (no quantifier exchange surface) — ReDoS is authoritatively gated by regexp/no-super-linear-backtracking (error in the ratchet) + tests/redos-audit.spec.ts
    const re = /expect\([^()]*(?:\([^()]*\)[^()]*)*\)\.toHaveText\(/g;
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
