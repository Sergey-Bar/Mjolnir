/**
 * QA-TEST-003 — Test with no assertions.
 * Severity: error · Confidence: high · deterministic-defect
 * A test that never asserts can only fail by crashing — it verifies nothing.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";
import { isInsideEmbeddedCode } from "../shared/masking.js";

export const noAssertions = defineRule({
  id: "QA-TEST-003",
  category: "QA-TEST",
  title: "Test with no assertions",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["jest", "vitest", "playwright", "mocha"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.1.0",

  run(ctx) {
    const text = ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    // Find each it/test(...) callback body and check for expect/assert inside.
    // Textual heuristic (AST refinement lands with the ts-morph runner):
    // capture `it('...', ...)` up to its matching closing of the arrow body.
    // Bug-audit M0 #4: the old pattern required an arrow, so
    // `it("x", function () { … })` bodies were never scanned at all.
    // Bug-audit QA-2026-08-30 QA-1: the M0 rewrite tightened
    // `(?:async\s*)?` to `(?:async\s+)?`, so `async()=>{` (no space) —
    // common in real code — silently stopped matching. `\s*` restores
    // spaceless arrows without reopening the bare-`return` exemption.
    const testRe =
      /\b(?:it|test)\s*\(\s*['"`][^'"`]*['"`]\s*,\s*(?:(?:async\s*)?\([^)]*\)\s*=>\s*\{|\bfunction\b[^{]*\{)/g;
    let m: RegExpExecArray | null;
    while ((m = testRe.exec(text)) !== null) {
      // Skip matches inside string literals containing embedded code (test data)
      if (isInsideEmbeddedCode(ctx, m.index)) continue;

      const bodyStart = m.index + m[0].length - 1; // position of '{'
      const bodyEnd = matchBrace(text, bodyStart);
      if (bodyEnd === -1) continue;
      const body = text.slice(bodyStart, bodyEnd + 1);
      const hasAssertion =
        /\bexpect\s*\(/.test(body) ||
        /\b(?:assert|should)\b/.test(body) ||
        /\.\s*(?:to|rejects\.to|resolves\.to)(?:Throw|Reject|Resolves)\b/.test(
          body,
        ) ||
        /\.\s*(?:rejects|resolves)\s*\.\s*(?:toThrow|toMatchObject|toEqual|toBe)\b/.test(
          body,
        ) ||
        /\b(?:toBe|toEqual|toBeTruthy|toBeFalsy|toContain|toMatch|toBeDefined|toBeNull|toBeUndefined|toBeGreaterThan|toBeLessThan|toHaveBeenCalled)\s*\(/.test(
          body,
        );
      // Bug-audit M0 #4: the exemption used to fire on ANY `return` — a
      // bare `return;` let an assertion-free test pass as "verified". The
      // exemption exists for chai-as-promised style `return expect(…)`
      // (already covered by the expect branch, but also spelled
      // `return assert…`); keep it that narrow.
      if (!hasAssertion && !/\breturn\s+(?:expect|assert)\b/.test(body)) {
        findings.push({
          severity: "error",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "FALSE-GREEN",
          file: ctx.path,
          line: lineAt(text, m.index),
          column: colAt(text, m.index),
          message: "Test contains no assertions.",
          why: "Without an assertion the test can only fail by crashing — it cannot detect behavioral regressions.",
          fix: "Add an assertion on the expected outcome, or remove the test.",
        });
      }
    }
    return findings;
  },
});

/** Index of the '}' matching the '{' at open, or -1. */
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
    if (ch === '"' || ch === "'" || ch === "`") {
      inStr = ch;
    } else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
