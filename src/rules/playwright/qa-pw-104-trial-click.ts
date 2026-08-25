/**
 * QA-PW-104 — `{ trial: true }` misuse — check-then-act race.
 * Severity: warning · Confidence: medium · heuristic-risk
 * A trial click performs no action; code after it assumes the act happened.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const pwTrialMisuse = defineRule({
  id: "QA-PW-104",
  category: "QA-PW",
  title: "trial:true click without follow-up assertion",
  severity: "warning",
  confidence: "medium",
  findingType: "heuristic-risk",
  qaImpact: "FALSE-GREEN",
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

    const re = /\.click\s*\(\s*\{[^}]*trial\s*:\s*true[^}]*\}\s*\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.text)) !== null) {
      findings.push({
        severity: "warning",
        confidence: "medium",
        findingType: "heuristic-risk",
        qaImpact: "FALSE-GREEN",
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: "`click({ trial: true })` — a dry-run that clicks nothing.",
        why: "Trial clicks only check actionability; any test logic assuming the click happened is verifying nothing while staying green.",
        fix: "Use a real `click()` and assert the resulting state, or keep trial only as an explicit actionability probe with a comment.",
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
