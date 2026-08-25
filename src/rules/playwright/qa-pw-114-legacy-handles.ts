/**
 * QA-PW-114 — Legacy page.$ / page.$$ usage.
 * Severity: warning · Confidence: high · deterministic-defect
 * These return elements at call time (no auto-waiting) — should be locators.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

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
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    const re = /\bpage\.\$\$?\s*\(/g;
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
        message: `\`${m[0]}\` returns a stale-prone element handle.`,
        why: "Element handles don't auto-wait — the element may not exist yet, causing intermittent failures.",
        fix: "Use locators: `page.locator('...')` — they wait for the element automatically.",
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
