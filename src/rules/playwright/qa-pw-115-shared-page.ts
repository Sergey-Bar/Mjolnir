/**
 * QA-PW-115 — Shared `page` across parallel tests without isolation.
 * Severity: warning · Confidence: medium · heuristic-risk
 * A module-level `page` (or one captured outside test scope) is shared
 * across workers — navigation in one test breaks another mid-run.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

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
  detectionStrategy: "regex pattern",
  introduced: "0.3.0",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!/\.(spec|test)\.[tj]sx?$/.test(ctx.path)) return findings;

    // Module-level declaration of page/browser/context — Playwright's
    // fixture-injected `page` is a test parameter; a module-level one is
    // shared mutable state across parallel workers.
    const re =
      /^(?:export\s+)?(?:let|var|const)\s+(?:page|browser|context|browserContext)\b/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.text)) !== null) {
      findings.push({
        severity: "warning",
        confidence: "medium",
        findingType: "heuristic-risk",
        qaImpact: "FLAKY-RISK",
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: `Module-level \`${m[0].trim()}\` — browser state shared across tests.`,
        why: "Parallel workers share module scope: one test navigating or closing the page corrupts every other test's session, producing order-dependent flakes.",
        fix: "Take `page` as a test function parameter (Playwright creates an isolated one per test), or use fixtures.",
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
