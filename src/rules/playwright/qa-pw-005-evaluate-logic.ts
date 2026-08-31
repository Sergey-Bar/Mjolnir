/**
 * QA-PW-005 — Business logic inside page.evaluate().
 * Severity: warning · Confidence: medium · heuristic-risk
 *
 * Code inside evaluate() runs in the browser context — invisible to
 * coverage, untestable at unit level, and untyped.
 *
 * Phase 3 AST migration: finds `.evaluate(...)` call expressions on the
 * real syntax tree and inspects the function body for branching. Falls
 * back to the legacy regex path when no AST is present (fixture harness).
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { getTsSourceFile } from "../../engine/ts-ast.js";
import * as ts from "ts-morph";
import { lineAt, colAt } from "../shared/positions.js";

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
  // Upgraded from regex to AST per Upgrade-Plan-v3 Phase 3.
  detectionStrategy: "AST (ts-morph) function-body inspection",
  introduced: "0.1.0",

  // Measured FP 100% (n=17): page.evaluate branching is browser-only test instrumentation in every real consumer suite.

  tier: "quarantine",

  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const sourceFile = getTsSourceFile(ctx.ast);
    if (!sourceFile) return runRegexFallback(text, ctx.path);

    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    for (const call of sourceFile.getDescendantsOfKind(
      ts.SyntaxKind.CallExpression,
    )) {
      const expr = call.getExpression();
      const isEvaluateCall =
        expr.asKind(ts.SyntaxKind.PropertyAccessExpression)?.getName() ===
          "evaluate" ||
        expr.asKind(ts.SyntaxKind.Identifier)?.getText() === "evaluate";
      if (!isEvaluateCall) continue;

      const firstArg = call.getArguments()[0];
      if (!firstArg) continue;
      const fnNode =
        firstArg.asKind(ts.SyntaxKind.ArrowFunction) ??
        firstArg.asKind(ts.SyntaxKind.FunctionExpression);
      if (!fnNode) continue;
      // A function node's body is never absent.
      const bodyText = fnNode.getBody()?.getText();

      if (/\b(if|for|while|switch)\b/.test(bodyText)) {
        findings.push({
          severity: "warning",
          confidence: "medium",
          findingType: "heuristic-risk",
          qaImpact: "HYGIENE",
          file: ctx.path,
          line: call.getStartLineNumber(),
          column: call.getStart() - call.getStartLinePos() + 1,
          message: "Branching logic inside page.evaluate().",
          why: "Code in the browser context is invisible to coverage and type-checking — logic here cannot be unit-tested or safely refactored.",
          fix: "Move the logic into application code or a shared utility; keep evaluate() for trivial reads only.",
        });
      }
    }
    return findings;
  },
});

/** Legacy regex path — fallback when the AST seam is absent. */
function runRegexFallback(
  text: string,
  path: string,
): Array<Omit<Finding, "ruleId" | "category">> {
  const findings: Array<Omit<Finding, "ruleId" | "category">> = [];
  const re = /(?:page\.)?evaluate\s*\(\s*(?:async\s*)?\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const openBrace = text.indexOf("{", m.index);
    if (openBrace === -1) continue;
    const closeBrace = matchBrace(text, openBrace);
    if (closeBrace === -1) continue;
    const body = text.slice(openBrace + 1, closeBrace);
    if (/\b(if|for|while|switch)\b/.test(body)) {
      findings.push({
        severity: "warning",
        confidence: "medium",
        findingType: "heuristic-risk",
        qaImpact: "HYGIENE",
        file: path,
        line: lineAt(text, m.index),
        column: colAt(text, m.index),
        message: "Branching logic inside page.evaluate().",
        why: "Code in the browser context is invisible to coverage and type-checking — logic here cannot be unit-tested or safely refactored.",
        fix: "Move the logic into application code or a shared utility; keep evaluate() for trivial reads only.",
      });
    }
  }
  return findings;
}

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
