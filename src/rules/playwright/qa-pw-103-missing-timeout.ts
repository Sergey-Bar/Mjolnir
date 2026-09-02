/**
 * QA-PW-103 — Missing timeout override without reason (magic defaults).
 * Severity: info · Confidence: low · heuristic-risk
 * A bare `waitForURL`/`goto` with no timeout relies on magic defaults;
 * slow pages fail opaquely and fast budgets are never declared.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";
import { isInsideEmbeddedCode } from "../shared/masking.js";

export const pwMissingTimeout = defineRule({
  id: "QA-PW-103",
  category: "QA-PW",
  title: "Navigation wait without explicit timeout budget",
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
  tier: "quarantine",

  run(ctx) {
    // Raw text on purpose — the rule matches on the string-literal
    // argument, so codeText would blank the quotes it keys off. That
    // exposes it to code written as test DATA: playwright-mcp's own
    // tests assert on strings like `code: "await page.goto('/x');"`.
    // `isInsideEmbeddedCode` is the discriminator (same pattern as
    // QA-PW-004 / QA-PW-123 / QA-ENV-001).
    const text = ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    // goto/waitForURL/waitForSelector called with a single string arg and
    // no options object — the caller never declared a time budget.
    const re =
      /(?:goto|waitForURL|waitForSelector)\s*\(\s*['"`][^'"`]+['"`]\s*\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (isInsideEmbeddedCode(ctx, m.index)) continue;
      findings.push({
        severity: "info",
        confidence: "low",
        findingType: "heuristic-risk",
        qaImpact: "HYGIENE",
        file: ctx.path,
        line: lineAt(text, m.index),
        column: colAt(text, m.index),
        message: `\`${m[0].slice(0, 50)}\` without an explicit timeout.`,
        why: "Magic-default timeouts make failures opaque (was it slow, or broken?) and never encode the product's actual performance budget.",
        fix: "Pass `{ timeout: <budget-ms> }` matching your performance SLO, or set actionTimeout/navigationTimeout deliberately in config.",
      });
    }
    return findings;
  },
});
