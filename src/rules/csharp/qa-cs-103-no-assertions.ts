/**
 * QA-CS-103 — Test method without assertions.
 * Severity: error · Confidence: high · deterministic-defect
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const csNoAssertions = defineRule({
  id: "QA-CS-103",
  category: "QA-PW",
  title: "Test without assertions",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "csharp",
  // Trust Metadata
  languages: ["csharp"],
  frameworks: ["nunit", "xunit", "mstest"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "regex heuristic",
  introduced: "0.3.8",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".cs")) return findings;

    // [Test]/[Fact]/[TestMethod] methods without assertion calls.
    // Corpus-audit finding (Sprint 8 Task 37, against
    // microsoft/playwright-dotnet): the previous regex
    // `\[(?:Test|Fact|TestMethod)[^\]]*\]` had no boundary after the
    // `Test` alternative, so it also matched `[TestInitialize]` and
    // `[TestCleanup]` (MSTest's setup/teardown attributes, NOT test
    // methods) — `Test` + `Initialize` (absorbed by `[^\]]*`) + `]`.
    // Real false positives: BrowserSetup/ContextSetup/etc. teardown
    // methods were flagged as "tests with no assertions" when they are
    // not tests at all. Fixed by requiring the attribute name to end
    // exactly at `Test`/`Fact`/`TestMethod` (only optional constructor
    // arguments like `[Test(Description = "...")]` may follow).
    const attrRe =
      /\[(?:Test|Fact|TestMethod)(?:\([^)]*\))?\]\s*(?:public\s+)?(?:async\s+)?(?:Task|void)\s+(\w+)\s*\([^)]*\)\s*\{/g;
    let m: RegExpExecArray | null;
    while ((m = attrRe.exec(ctx.text)) !== null) {
      const bodyStart = m.index + m[0].length;
      const bodyEnd = matchBrace(ctx.text, bodyStart - 1);
      if (bodyEnd === -1) continue;
      const body = ctx.text.slice(bodyStart, bodyEnd);

      const hasCheck =
        /Assert\.\w+\s*\(/.test(body) ||
        /Expect\(/.test(body) ||
        /\.Should\(/.test(body) ||
        /Verify(?:All)?\s*\(/.test(body);
      if (!hasCheck) {
        findings.push({
          severity: "error",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "FALSE-GREEN",
          file: ctx.path,
          line: lineAt(ctx.text, m.index),
          column: colAt(ctx.text, m.index),
          message: `Test \`${m[1]}\` contains no assertions.`,
          why: "Without an assertion the test can only fail by throwing — it cannot detect behavioral regressions.",
          fix: "Add an assertion on the expected outcome, or remove the test.",
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

function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text[i] === "\n") line++;
  return line;
}

function colAt(text: string, index: number): number {
  const lastBreak = text.lastIndexOf("\n", index - 1);
  return index - lastBreak;
}
