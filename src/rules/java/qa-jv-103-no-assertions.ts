/**
 * QA-JV-103 — Test method without assertions.
 * Severity: error · Confidence: high · deterministic-defect
 * A JUnit/TestNG test that never asserts can only fail by throwing.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const jvNoAssertions = defineRule({
  id: "QA-JV-103",
  category: "QA-PW",
  title: "Test without assertions",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "java",
  // Trust Metadata
  languages: ["java"],
  frameworks: ["junit", "testng"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "regex heuristic",
  introduced: "0.3.8",
  tier: "extended",

  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".java")) return findings;

    // Find @Test methods and check their bodies for assertion calls.
    const annRe =
      /@Test\b[^{]*?\n\s*(?:public\s+|protected\s+)?void\s+(\w+)\s*\([^)]*\)\s*\{/g;
    let m: RegExpExecArray | null;
    while ((m = annRe.exec(text)) !== null) {
      const bodyStart = m.index + m[0].length;
      const bodyEnd = matchBrace(text, bodyStart - 1);
      if (bodyEnd === -1) continue;
      const body = text.slice(bodyStart, bodyEnd);

      const hasCheck =
        // assert*(...) — any JUnit/AssertJ/Hamcrest-style assertion
        // method, not just a fixed suffix list. Corpus-audit finding
        // (Sprint 8 Task 37, against microsoft/playwright-java): the
        // previous fixed list (assertThat/True/False/Equals/NotNull/
        // Throws) missed assertArrayEquals, assertNotEquals, assertNull,
        // assertSame, and project-specific helpers like assertJsonEquals
        // — all real assertions this rule was falsely flagging as
        // missing. A generic `assert[A-Z]\w*\(` catches any
        // camelCase-suffixed assert method without hardcoding an
        // incomplete enumeration.
        /\bassert[A-Z]\w*\s*\(/.test(body) ||
        /\bfail\s*\(/.test(body) ||
        /verify\s*\(/.test(body);
      if (!hasCheck) {
        findings.push({
          severity: "error",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "FALSE-GREEN",
          file: ctx.path,
          line: lineAt(text, m.index),
          column: colAt(text, m.index),
          message: `Test \`${m[1]}\` contains no assertions.`,
          why: "Without an assertion the test can only fail by crashing — it cannot detect behavioral regressions.",
          fix: "Add an assertion on the expected outcome (`assertEquals`, `assertThat(locator).isVisible()`), or remove the test.",
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
    if (ch === '"') inStr = ch;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
