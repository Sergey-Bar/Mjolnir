/**
 * QA-PW-123 — Hardcoded baseURL in specs.
 * Severity: warning · Confidence: high · deterministic-defect
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const hardcodedBaseUrl = defineRule({
  id: "QA-PW-123",
  category: "QA-PW",
  title: "Hardcoded environment URL in spec",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "HYGIENE",
  appliesTo: "test-files",
  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    const re =
      /(?:goto|request)\s*\(\s*['"`]https?:\/\/(?!localhost)[^'"`]+['"`]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.text)) !== null) {
      findings.push({
        severity: "warning",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "HYGIENE",
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: `Hardcoded URL: \`${m[0].slice(0, 60)}\`.`,
        why: "Specs pointing at absolute URLs break when environments change and can hit production by accident.",
        fix: "Use relative paths with baseURL from playwright.config, or an env variable.",
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
