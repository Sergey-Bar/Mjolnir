/**
 * QA-TEST-006 — Retry abuse in test config.
 * Severity: warning · Confidence: high · deterministic-defect
 *
 * `retries: N` (Playwright) or `jest.retryTimes(N)` configured broadly
 * hides flakiness at the suite level.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const retryAbuse = defineRule({
  id: "QA-TEST-006",
  category: "QA-TEST",
  title: "Retry abuse hiding flakiness",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FLAKY-RISK",
  appliesTo: "test-files",
  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    // jest.retryTimes(N) — global flakiness mask
    const retryTimes = /jest\.retryTimes\s*\(\s*(\d+)\s*/g;
    let m: RegExpExecArray | null;
    while ((m = retryTimes.exec(ctx.text)) !== null) {
      findings.push({
        severity: "warning",
        confidence: "high",
        findingType: "deterministic-defect",
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: `\`jest.retryTimes(${m[1]})\` enabled.`,
        why: "Global retries re-run every failing test until it passes — intermittent failures become invisible.",
        fix: "Remove the global retry; fix the underlying nondeterminism instead.",
        qaImpact: "FLAKY-RISK",
      });
    }

    // Playwright retries: N with N >= 2 in test files (config-level is W4 scope)
    const pwRetries = /\bretries\s*:\s*([2-9]\d*)/g;
    while ((m = pwRetries.exec(ctx.text)) !== null) {
      findings.push({
        severity: "warning",
        confidence: "medium",
        findingType: "heuristic-risk",
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: `\`retries: ${m[1]}\` configured.`,
        why: "Multiple retries can turn a genuinely broken test into a green one on a lucky run.",
        fix: "Keep retries ≤ 1 and track which tests actually needed them.",
        qaImpact: "FLAKY-RISK",
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
