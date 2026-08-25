/**
 * QA-PW-005 — Business logic inside page.evaluate().
 * Severity: warning · Confidence: medium · heuristic-risk
 *
 * Code inside evaluate() runs in the browser context — invisible to
 * coverage, untestable at unit level, and untyped.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const evaluateBusinessLogic = defineRule({
  id: "QA-PW-005",
  category: "QA-PW",
  title: "Logic inside page.evaluate()",
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
  detectionStrategy: "regex heuristic",
  introduced: "0.1.0",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    // evaluate with a non-trivial body: more than a single expression.
    // Heuristic: arrow function body containing statements (if/for/let/const).
    const re = /(?:page\.)?evaluate\s*\(\s*(?:async\s*)?\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.text)) !== null) {
      const openBrace = ctx.text.indexOf("{", m.index);
      if (openBrace === -1) continue;
      const closeBrace = matchBrace(ctx.text, openBrace);
      if (closeBrace === -1) continue;
      const body = ctx.text.slice(openBrace + 1, closeBrace);
      if (/\b(if|for|while|switch)\b/.test(body)) {
        findings.push({
          severity: "warning",
          confidence: "medium",
          findingType: "heuristic-risk",
          qaImpact: "HYGIENE",
          file: ctx.path,
          line: lineAt(ctx.text, m.index),
          column: colAt(ctx.text, m.index),
          message: "Branching logic inside page.evaluate().",
          why: "Code in the browser context is invisible to coverage and type-checking — logic here cannot be unit-tested or safely refactored.",
          fix: "Move the logic into application code or a shared utility; keep evaluate() for trivial reads only.",
        });
      }
    }
    return findings;
  },
});

function matchBrace(text: string, open: number): number {
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
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text[i] === "\n") line++;
  return line;
}

function colAt(text: string, index: number): number {
  const lastBreak = text.lastIndexOf("\n", index - 1);
  return index - lastBreak;
}
