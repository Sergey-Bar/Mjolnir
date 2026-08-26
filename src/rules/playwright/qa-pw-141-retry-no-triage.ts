/**
 * QA-PW-141 — playwright.config retries set high enough to mask flakes.
 * Severity: warning · Confidence: high · deterministic-defect
 * Upgrade-Plan-v3 Phase 1 layer 1 (retry/flake masking). Complements
 * QA-PW-121 by catching the "retries: N with no forensics loop" pattern:
 * retries alone aren't the problem — retries without triage are, because
 * flaky passes never get investigated and real bugs ship green.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const pwRetryMaskingNoForensics = defineRule({
  id: "QA-PW-141",
  category: "QA-PW",
  title: "Retries configured without a flake-triage loop",
  severity: "warning",
  confidence: "high",
  findingType: "heuristic-risk",
  qaImpact: "FALSE-GREEN",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex heuristic",
  introduced: "0.3.8",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    const base = ctx.path.split("/").pop() ?? "";
    if (!/^playwright\.config\.(ts|js|mjs|cts)$/.test(base)) return findings;

    const retriesRe = /retries\s*:\s*(\d+)/g;
    let m: RegExpExecArray | null;
    while ((m = retriesRe.exec(ctx.text)) !== null) {
      if (Number(m[1]) < 1) continue; // retries disabled — nothing to mask
      // A triage loop exists if the repo wires retry evidence somewhere:
      // a reporter that emits machine-readable results, or an explicit
      // reference to flake handling in config comments/setup.
      const hasTriageLoop =
        /reporter\s*:/.test(ctx.text) ||
        /(?:forensics|triage|flaky)/i.test(ctx.text);
      if (!hasTriageLoop) {
        findings.push({
          severity: "warning",
          confidence: "high",
          findingType: "heuristic-risk",
          qaImpact: "FALSE-GREEN",
          file: ctx.path,
          line: lineAt(ctx.text, m.index),
          column: colAt(ctx.text, m.index),
          message: `retries: ${m[1]} with no visible flake-triage loop.`,
          why: "Retries convert intermittent failures into silent passes. Without a forensics/triage step consuming retry data, flaky tests pass forever and real regressions hide behind lucky reruns.",
          fix: "Keep retries <= 2 and feed retry outcomes into `qa-doctor forensics`/`triage`, or add a reporter so flaky passes are reviewed.",
        });
      }
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
