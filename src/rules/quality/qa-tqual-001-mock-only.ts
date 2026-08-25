/**
 * QA-TQUAL-001 — Mock-only verification.
 * Severity: warning · Confidence: medium · heuristic-risk
 *
 * The test asserts that a mock was called — not that the system did the
 * right thing. `expect(mockSave).toHaveBeenCalled()` passes even when
 * the real saving logic is broken. This is the exact "TEST EXISTS ≠
 * BEHAVIOR VERIFIED" gap from Product.txt §6.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const mockOnlyVerification = defineRule({
  id: "QA-TQUAL-001",
  category: "QA-TQUAL",
  title: "Mock-only verification",
  severity: "warning",
  confidence: "medium",
  findingType: "heuristic-risk",
  qaImpact: "HYGIENE",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["jest", "vitest", "playwright"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "regex heuristic",
  introduced: "0.1.0",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    // A test whose ONLY assertions are mock-call checks.
    const testRe =
      /\b(?:it|test)\s*\(\s*['"`][^'"`]*['"`]\s*,\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{/g;
    let m: RegExpExecArray | null;
    while ((m = testRe.exec(ctx.text)) !== null) {
      const openBrace = m.index + m[0].length - 1;
      const closeBrace = matchBrace(ctx.text, openBrace);
      if (closeBrace === -1) continue;
      const body = ctx.text.slice(openBrace, closeBrace + 1);

      const hasExpect = /expect\s*\(/.test(body);
      if (!hasExpect) continue;

      const mockAssertions = (
        body.match(
          /expect\s*\(\s*[\w.$]+\s*\)\s*\.\s*(?:not\.)?to[Hh]aveBeenCalled(?:With)?\s*\(/g,
        ) ?? []
      ).length;
      const totalAssertions = (body.match(/expect\s*\(/g) ?? []).length;

      if (totalAssertions > 0 && mockAssertions === totalAssertions) {
        findings.push({
          severity: "warning",
          confidence: "medium",
          findingType: "heuristic-risk",
          qaImpact: "HYGIENE",
          file: ctx.path,
          line: lineAt(ctx.text, m.index),
          column: colAt(ctx.text, m.index),
          message: "All assertions in this test verify mock calls only.",
          why: "Asserting that a mock was called proves wiring, not behavior. The real logic behind the mock can be broken and this test stays green.",
          fix: "Add at least one assertion on actual output or state, not just on how collaborators were invoked.",
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
