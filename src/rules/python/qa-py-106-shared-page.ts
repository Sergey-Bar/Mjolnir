/**
 * QA-PY-106 — Playwright-Python: shared browser state across tests.
 * Severity: warning · Confidence: medium · heuristic-risk
 * Module-level page/context in pytest-playwright defeats per-test
 * isolation and creates order-dependent runs.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const pyPwSharedPage = defineRule({
  id: "QA-PY-106",
  category: "QA-PW",
  title: "Shared page/context across tests",
  severity: "warning",
  confidence: "medium",
  findingType: "heuristic-risk",
  qaImpact: "FLAKY-RISK",
  appliesTo: "python",
  // Trust Metadata
  languages: ["python"],
  frameworks: ["pytest-playwright", "playwright"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.3.8",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;

    // Module-level (column 0) mutable browser state.
    const re = /^(?:page|context|browser_context|browser)\s*=\s*(?!None)/gm;
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
        message: `Module-level \`${(m[0] ?? "").split("=")[0]?.trim()}\` — browser state shared across tests.`,
        why: "pytest-playwright creates an isolated page per test; a module-level one is shared mutable state, so tests leak cookies/storage/navigation into each other and become order-dependent.",
        fix: "Take the injected `page` fixture parameter in each test instead of creating module-level state.",
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
