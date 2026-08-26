/**
 * QA-PY-107 — Playwright-Python: networkidle waits.
 * Severity: warning · Confidence: high · deterministic-defect
 * wait_for_load_state("networkidle") is flaky by design — same meaning
 * as QA-PW-118, translated to the Python API.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const pyPwNetworkIdle = defineRule({
  id: "QA-PY-107",
  category: "QA-PW",
  title: "networkidle wait (flaky by design)",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FLAKY-RISK",
  appliesTo: "python",
  // Trust Metadata
  languages: ["python"],
  frameworks: ["pytest-playwright", "playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.3.8",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;

    const re = /wait_for_load_state\s*\(\s*["']networkidle["']\s*\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.text)) !== null) {
      findings.push({
        severity: "warning",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "FLAKY-RISK",
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: "`wait_for_load_state('networkidle')` used.",
        why: "Analytics, websockets, and polling make network idle never fire or fire randomly — a documented source of Playwright flakes.",
        fix: "Wait for the specific response: `with page.expect_response('**/api/data'):` or assert on the rendered element.",
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
