/**
 * QA-PW-103 — Missing timeout override without reason (magic defaults).
 * Severity: info · Confidence: low · heuristic-risk
 * A bare `waitForURL`/`goto` with no timeout relies on magic defaults;
 * slow pages fail opaquely and fast budgets are never declared.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

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
  detectionStrategy: "regex pattern",
  introduced: "0.3.0",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    // goto/waitForURL/waitForSelector called with a single string arg and
    // no options object — the caller never declared a time budget.
    const re =
      /(?:goto|waitForURL|waitForSelector)\s*\(\s*['"`][^'"`]+['"`]\s*\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.text)) !== null) {
      findings.push({
        severity: "info",
        confidence: "low",
        findingType: "heuristic-risk",
        qaImpact: "HYGIENE",
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: `\`${m[0].slice(0, 50)}\` without an explicit timeout.`,
        why: "Magic-default timeouts make failures opaque (was it slow, or broken?) and never encode the product's actual performance budget.",
        fix: "Pass `{ timeout: <budget-ms> }` matching your performance SLO, or set actionTimeout/navigationTimeout deliberately in config.",
      });
    }
    return findings;
  },
});

function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text[i] === "\n") line++;
  return line;
}

function colAt(text: string, index: number): number {
  const lastBreak = text.lastIndexOf("\n", index - 1);
  return index - lastBreak;
}
