/**
 * QA-TEST-003 — Test with no assertions.
 * Severity: error · Confidence: high · deterministic-defect
 * A test that never asserts can only fail by crashing — it verifies nothing.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const noAssertions = defineRule({
  id: "QA-TEST-003",
  category: "QA-TEST",
  title: "Test with no assertions",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "test-files",
  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    // Find each it/test(...) callback body and check for expect/assert inside.
    // Textual heuristic (AST refinement lands with the ts-morph runner):
    // capture `it('...', ...)` up to its matching closing of the arrow body.
    const testRe =
      /\b(?:it|test)\s*\(\s*['"`][^'"`]*['"`]\s*,\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{/g;
    let m: RegExpExecArray | null;
    while ((m = testRe.exec(ctx.text)) !== null) {
      const bodyStart = m.index + m[0].length - 1; // position of '{'
      const bodyEnd = matchBrace(ctx.text, bodyStart);
      if (bodyEnd === -1) continue;
      const body = ctx.text.slice(bodyStart, bodyEnd + 1);
      const hasAssertion =
        /\bexpect\s*\(/.test(body) ||
        /\b(?:assert|should)\b/.test(body) ||
        /\.\to(?:Throw|Reject|Resolves)\b/.test(body) ||
        /\b(?:toBe|toEqual|toBeTruthy|toBeFalsy|toContain|toMatch|toBeDefined|toBeNull|toBeUndefined|toBeGreaterThan|toBeLessThan|toHaveBeenCalled)\s*\(/.test(
          body,
        );
      if (!hasAssertion && !/\breturn\b/.test(body)) {
        findings.push({
          severity: "error",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "FALSE-GREEN",
          file: ctx.path,
          line: lineAt(ctx.text, m.index),
          column: colAt(ctx.text, m.index),
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

function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text[i] === "\n") line++;
  return line;
}

function colAt(text: string, index: number): number {
  const lastBreak = text.lastIndexOf("\n", index - 1);
  return index - lastBreak;
}
