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
import { lineAt, colAt } from "../shared/positions.js";

export const pwRetryMaskingNoForensics = defineRule({
  id: "QA-PW-141",
  category: "QA-PW",
  title: "Retries configured without a flake-triage loop",
  severity: "warning",
  confidence: "high",
  findingType: "heuristic-risk",
  qaImpact: "FALSE-GREEN",
  appliesTo: "test-files",
  configRule: true,
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex heuristic",
  introduced: "0.3.8",

  // Measured 2026-09-02 (corpus wave 5): tier set from the measured envelope (plan §11.2).
  tier: "extended",
  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    const base = ctx.path.split("/").pop() as string;
    if (!/^playwright\.config\.(ts|js|mjs|cts)$/.test(base)) return findings;

    const retriesRe =
      /retries\s*:\s*(?:process\.env\.[A-Za-z_]+\s*\?\s*(\d+)\s*:\s*\d+|(\d+))/g;
    let m: RegExpExecArray | null;
    while ((m = retriesRe.exec(text)) !== null) {
      const retries = Number(m[1] ?? m[2]);
      if (retries < 1) continue; // retries disabled — nothing to mask
      // A triage loop exists if the repo wires retry evidence somewhere:
      // a MACHINE-READABLE reporter (json/junit/blob/markdown feed flake
      // dashboards — an html-only reporter produces no triage data), or
      // an explicit reference to flake handling in config comments/setup.
      // Check code-structure signals in codeText, but check comment-based
      // signals in raw text (comments ARE the evidence here).
      const hasTriageLoop =
        /reporter\s*:[^\n]*(?:['"]json['"]|['"]junit['"]|['"]blob['"]|['"]markdown['"])/.test(
          text,
        ) || /forensics|triage|flaky/i.test(ctx.text);
      if (!hasTriageLoop) {
        findings.push({
          severity: "warning",
          confidence: "high",
          findingType: "heuristic-risk",
          qaImpact: "FALSE-GREEN",
          file: ctx.path,
          line: lineAt(text, m.index),
          column: colAt(text, m.index),
          message: `retries: ${m[1]} with no visible flake-triage loop.`,
          why: "Retries convert intermittent failures into silent passes. Without a forensics/triage step consuming retry data, flaky tests pass forever and real regressions hide behind lucky reruns.",
          fix: "Keep retries <= 2 and feed retry outcomes into `mjolnir forensics`/`triage`, or add a reporter so flaky passes are reviewed.",
        });
      }
    }
    return findings;
  },
});
