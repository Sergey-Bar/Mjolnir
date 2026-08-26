/**
 * QA-PW-002 — Missing `await` on a Playwright locator assertion.
 * Severity: error · Confidence: high · deterministic-defect
 * An unawaited expect(locator) returns an unfulfilled promise — the
 * assertion never actually runs and the test passes vacuously.
 *
 * Phase 3 AST migration: detection now walks the real syntax tree —
 * `expect(...)` calls whose result feeds a `.toBeX()`/`.toHaveX()` chain
 * but are not awaited. Removes regex lookbehind fragility and its false
 * negatives on multi-line formatting, with identical semantics. Falls
 * back to the legacy regex path when no AST is present (fixture harness).
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { getTsSourceFile } from "../../engine/ts-ast.js";
import * as ts from "ts-morph";

/** Assertion matchers that return an unfulfilled promise unless awaited. */
const ASSERTION_MATCHER_RE = /^to(?:Be|Have|Contain|Pass|Match)/;

export const unawaitedLocatorAssertion = defineRule({
  id: "QA-PW-002",
  category: "QA-PW",
  title: "Unawaited Playwright assertion",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  // Upgraded from regex to AST per Upgrade-Plan-v3 Phase 3.
  detectionStrategy: "AST (ts-morph) call-graph check",
  introduced: "0.1.0",

  run(ctx) {
    const sourceFile = getTsSourceFile(ctx.ast);
    if (!sourceFile) return runRegexFallback(ctx.text, ctx.path);

    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    for (const call of sourceFile.getDescendantsOfKind(
      ts.SyntaxKind.CallExpression,
    ) as import("ts-morph").CallExpression[]) {
      const expr = call.getExpression();
      if (expr.getKindName() !== "Identifier") continue;
      if (expr.getText() !== "expect") continue;

      const args = call.getArguments();
      if (args.length === 0) continue;
      const argText = args[0]?.getText() ?? "";
      if (!/^(?:page|locator|this\.page)\b/.test(argText)) continue;

      let isAwaited = false;
      let isAssertionChain = false;

      let node: import("ts-morph").Node | undefined = call.getParent();
      while (node) {
        const kind = node.getKindName();
        if (kind === "AwaitExpression") {
          isAwaited = true;
          break;
        }
        if (kind === "PropertyAccessExpression") {
          const name = (
            node as import("ts-morph").PropertyAccessExpression
          ).getName();
          if (ASSERTION_MATCHER_RE.test(name)) isAssertionChain = true;
          node = node.getParent();
          continue;
        }
        if (kind === "CallExpression") {
          node = node.getParent();
          continue;
        }
        break;
      }

      if (isAssertionChain && !isAwaited) {
        findings.push({
          severity: "error",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "FALSE-GREEN",
          file: ctx.path,
          line: call.getStartLineNumber(),
          column: call.getStart() - call.getStartLinePos() + 1,
          message: "Playwright locator assertion is not awaited.",
          why: "Without `await`, the assertion promise is never resolved — the check silently never runs and the test passes vacuously.",
          fix: "Add `await`: `await expect(locator).toBeVisible()`.",
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
  const re = /(?<!await\s{0,10})expect\s*\(\s*(?:page|locator|this\.page)[.(]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    findings.push({
      severity: "error",
      confidence: "high",
      findingType: "deterministic-defect",
      qaImpact: "FALSE-GREEN",
      file: path,
      line: lineAt(text, m.index),
      column: colAt(text, m.index),
      message: "Playwright locator assertion is not awaited.",
      why: "Without `await`, the assertion promise is never resolved — the check silently never runs and the test passes vacuously.",
      fix: "Add `await`: `await expect(locator).toBeVisible()`.",
    });
  }
  return findings;
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
