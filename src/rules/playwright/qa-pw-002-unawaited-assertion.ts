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
import { lineAt, colAt } from "../shared/positions.js";

/**
 * Playwright's web-first assertion matchers — the ones that return a
 * promise and auto-retry until the condition holds or times out. Only
 * these need `await`. Jest/Vitest's synchronous matchers (`toBe`,
 * `toEqual`, `toHaveLength`, `toContain`, `toMatchObject`, …) must NOT
 * be awaited — flagging `expect(res.status()).toBe(200)` because the
 * variable is called `page` is a false positive.
 * Source: https://playwright.dev/docs/test-assertions
 */
const ASYNC_PW_MATCHERS = new Set([
  "toBeAttached",
  "toBeChecked",
  "toBeDisabled",
  "toBeEditable",
  "toBeEmpty",
  "toBeEnabled",
  "toBeFocused",
  "toBeHidden",
  "toBeInViewport",
  "toBeVisible",
  "toContainClass",
  "toContainText",
  "toHaveAccessibleDescription",
  "toHaveAccessibleErrorMessage",
  "toHaveAccessibleName",
  "toHaveAttribute",
  "toHaveClass",
  "toHaveCount",
  "toHaveCSS",
  "toHaveId",
  "toHaveJSProperty",
  "toHaveRole",
  "toHaveScreenshot",
  "toHaveText",
  "toHaveTitle",
  "toHaveURL",
  "toHaveValue",
  "toHaveValues",
  "toMatchAriaSnapshot",
  "toPass",
]);

export const unawaitedLocatorAssertion = defineRule({
  id: "QA-PW-002",
  tier: "core",
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
  detectionStrategy: "AST",
  detectionNotes: "ts-morph call-graph check",
  introduced: "0.1.0",

  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const sourceFile = getTsSourceFile(ctx.ast);
    if (!sourceFile) return runRegexFallback(text, ctx.path);

    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    for (const call of sourceFile.getDescendantsOfKind(
      ts.SyntaxKind.CallExpression,
    )) {
      const expr = call.getExpression();
      if (expr.getKindName() !== "Identifier") continue;
      if (expr.getText() !== "expect") continue;

      const args = call.getArguments();
      if (args.length === 0) continue;
      const argText = args[0]?.getText() as string;
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
        // Bug-audit M0 #7: `return expect(locator).toBeVisible()` is a
        // legitimate, runner-awaited pattern (the same family's
        // QA-TQUAL-009 documents "awaited or returned") — it used to be
        // reported as unawaited because only AwaitExpression counted.
        if (kind === "ReturnStatement") {
          isAwaited = true;
          break;
        }
        if (kind === "PropertyAccessExpression") {
          const name = (
            node as import("ts-morph").PropertyAccessExpression
          ).getName();
          if (ASYNC_PW_MATCHERS.has(name)) isAssertionChain = true;
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
  // `expect(<locator-ish>)` NOT preceded by await, chained to one of
  // Playwright's async web-first matchers. The matcher check is what
  // keeps `expect(response.status()).toBe(200)` from being flagged just
  // because a variable is named `page`.
  const matchers = [...ASYNC_PW_MATCHERS].join("|");
  // Bug-audit M0 #7: `return expect(...)` is runner-awaited — excluded.
  const re = new RegExp(
    `(?<!await\\s{0,10})(?<!return\\s{0,10})expect\\s*\\(\\s*(?:page|locator|this\\.page)[^;]{0,300}?\\)\\s*\\.\\s*(?:${matchers})\\b`,
    "g",
  );
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
