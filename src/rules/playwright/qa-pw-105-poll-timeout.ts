/**
 * QA-PW-105 — expect.poll without timeout bound.
 * Severity: warning · Confidence: medium · heuristic-risk
 * Default poll timeout hides slow convergence; bound it explicitly.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const pwPollNoTimeout = defineRule({
  id: "QA-PW-105",
  category: "QA-PW",
  title: "expect.poll without timeout bound",
  severity: "warning",
  confidence: "medium",
  findingType: "heuristic-risk",
  qaImpact: "HYGIENE",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.3.0",
  // Measured FP 100% (n=20, docs/FP-AUDIT.md 2026-08-31): the bounded
  // default poll timeout fails visibly, so the claimed masking harm never
  // materializes on real consumer code. North-star law.
  tier: "quarantine",

  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    // Whitespace-tolerant: `await expect\n  .poll(...)` is idiomatic
    // formatting and must be caught too.
    const re = /expect\s*\.\s*poll\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const openParen = m.index + m[0].length - 1;
      const closeParen = matchParen(text, openParen);
      if (closeParen === -1) continue;
      const args = text.slice(openParen + 1, closeParen);
      if (!/timeout\s*:/.test(args)) {
        findings.push({
          severity: "warning",
          confidence: "medium",
          findingType: "heuristic-risk",
          qaImpact: "HYGIENE",
          file: ctx.path,
          line: lineAt(text, m.index),
          column: colAt(text, m.index),
          message: "`expect.poll` without an explicit `timeout`.",
          why: "The default poll timeout masks how long the condition actually takes to converge — a regression to minutes-long polling stays invisible.",
          fix: "Pass `{ timeout: 10_000 }` (or your budget) and `{ intervals: [...] }` if pacing matters.",
        });
      }
    }
    return findings;
  },
});

function matchParen(text: string, open: number): number {
  let depth = 0;
  let inStr: string | null = null;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (ch === "\\") i++;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") inStr = ch;
    else if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
