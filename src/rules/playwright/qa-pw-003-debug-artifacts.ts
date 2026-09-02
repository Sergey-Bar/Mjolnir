/**
 * QA-PW-003 — Committed `page.pause()` or `test.only()` in e2e specs.
 * Severity: error · Confidence: high · deterministic-defect
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const committedDebugArtifacts = defineRule({
  id: "QA-PW-003",
  category: "QA-PW",
  title: "Debug artifact committed to e2e spec",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "low",
  autofix: true,
  detectionStrategy: "LEXICAL",
  introduced: "0.1.0",

  // Measured 2026-09-02 (corpus wave 5): tier set from the measured envelope (plan §11.2).
  tier: "core",
  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    const patterns = [
      { re: /\bpage\.pause\s*\(\s*\)/g, label: "page.pause()" },
      { re: /\btest\.only\s*\(/g, label: "test.only()" },
    ];

    for (const { re, label } of patterns) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        findings.push({
          severity: "error",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "FALSE-GREEN",
          file: ctx.path,
          line: lineAt(text, m.index),
          column: colAt(text, m.index),
          message: `\`${label}\` committed in an e2e spec.`,
          why:
            label === "page.pause()"
              ? "In CI, page.pause() hangs the runner until timeout — the job stalls and may be retried or masked."
              : "test.only() skips every other e2e test while CI reports green.",
          fix:
            label === "page.pause()"
              ? "Remove the pause; use --debug locally instead."
              : "Remove `.only` before committing.",
        });
      }
    }
    return findings;
  },
});
