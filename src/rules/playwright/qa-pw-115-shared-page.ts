/**
 * QA-PW-115 — Shared `page` across parallel tests without isolation.
 * Severity: warning · Confidence: medium · heuristic-risk
 * A module-level `page` (or one captured outside test scope) is shared
 * across workers — navigation in one test breaks another mid-run.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const pwSharedPage = defineRule({
  id: "QA-PW-115",
  category: "QA-PW",
  title: "Shared page object across tests",
  severity: "warning",
  confidence: "medium",
  findingType: "heuristic-risk",
  qaImpact: "FLAKY-RISK",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "LEXICAL",
  introduced: "0.3.0",

  // Measured 2026-09-02 (corpus wave 5): tier set from the measured envelope (plan §11.2).
  tier: "quarantine",
  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!/\.(?:spec|test)\.[tj]sx?$/.test(ctx.path)) return findings;

    // Module-level declaration of page/browser/context — Playwright's
    // fixture-injected `page` is a test parameter; a module-level one is
    // shared mutable state across parallel workers.
    const re =
      // eslint-disable-next-line security/detect-unsafe-regex -- bounded literal pattern (no quantifier exchange surface) — ReDoS is authoritatively gated by regexp/no-super-linear-backtracking (error in the ratchet) + tests/redos-audit.spec.ts
      /^(?:export\s+)?(?:let|var|const)\s+(?:page|browser|context|browserContext)\b/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      findings.push({
        severity: "warning",
        confidence: "medium",
        findingType: "heuristic-risk",
        qaImpact: "FLAKY-RISK",
        file: ctx.path,
        line: lineAt(text, m.index),
        column: colAt(text, m.index),
        message: `Module-level \`${m[0].trim()}\` — browser state shared across tests.`,
        why: "Parallel workers share module scope: one test navigating or closing the page corrupts every other test's session, producing order-dependent flakes.",
        fix: "Take `page` as a test function parameter (Playwright creates an isolated one per test), or use fixtures.",
      });
    }
    return findings;
  },
});
