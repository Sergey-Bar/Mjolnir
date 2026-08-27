/**
 * QA-TQUAL-009 — Unawaited assertion inside a promise chain.
 * Severity: error · Confidence: high · deterministic-defect
 *
 * `fetch().then(r => expect(r.ok).toBe(true))` — the expect runs, but
 * nothing awaits the chain, so a rejection (or the assertion itself)
 * never influences the test result. eslint-plugin-jest calls this
 * `valid-expect-in-promise`; it is one of the most-loved rules because
 * it catches tests that pass while their checks silently vanish.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const unawaitedPromiseAssertion = defineRule({
  id: "QA-TQUAL-009",
  category: "QA-TQUAL",
  title: "Assertion in promise chain that is never awaited",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["jest", "vitest", "playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.2.0",

  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    // Find `.then(...)` callbacks containing expect(...) where the chain
    // head is not awaited/returned.
    const thenRe = /\.then\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = thenRe.exec(text)) !== null) {
      // Walk backwards over chained lines (`.method(...)` continuations)
      // to find the statement head, then check for await/return.
      let stmtStart = m.index;
      while (stmtStart > 0) {
        const lineStart = text.lastIndexOf("\n", stmtStart - 1) + 1;
        const prevLine = text.slice(lineStart, stmtStart).trimEnd();
        // Previous line ends with an operator or opening — chain continues upward.
        if (
          /(?:\.|\(|\[|,|:|=)$/.test(prevLine) ||
          /^\s*\.\w/.test(
            text.slice(stmtStart - (stmtStart - lineStart), stmtStart),
          )
        ) {
          stmtStart = lineStart;
          // If that line itself starts with await/return, stop early.
          if (/^\s*(?:await|return)\b/.test(prevLine)) break;
          continue;
        }
        stmtStart = lineStart;
        break;
      }
      const head = text.slice(stmtStart, m.index);
      const awaited =
        /(?:^|[^\w.])(?:await|return)\s/.test(head) ||
        /^\s*(?:await|return)\b/.test(head);

      // Find the callback body braces.
      const openBrace = text.indexOf("{", m.index);
      if (openBrace === -1) continue;
      const closeBrace = matchBrace(text, openBrace);
      if (closeBrace === -1) continue;

      const body = text.slice(openBrace, closeBrace + 1);
      if (/expect\s*\(/.test(body) && !awaited) {
        findings.push({
          severity: "error",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "FALSE-GREEN",
          file: ctx.path,
          line: lineAt(text, m.index),
          column: colAt(text, m.index),
          message:
            "Assertion inside a `.then()` whose promise is never awaited or returned.",
          why: "The assertion executes but its result — including failures — is discarded. The test passes even when the check would fail.",
          fix: "Await the promise (`await ...`), return it from the test, or convert to async/await with a top-level expect.",
        });
        // One finding per file keeps noise down; position at first offender.
        break;
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
