/**
 * QA-PY-008 — Mock-only verification.
 * Severity: warning · Confidence: medium · heuristic-risk
 * A pytest test whose only assertions are Mock.assert_called_* checks
 * proves wiring, not behavior.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const pyMockOnly = defineRule({
  id: "QA-PY-008",
  category: "QA-TQUAL",
  title: "Mock-only verification",
  severity: "warning",
  confidence: "medium",
  findingType: "heuristic-risk",
  qaImpact: "HYGIENE",
  appliesTo: "python",
  // Trust Metadata
  languages: ["python"],
  frameworks: ["pytest"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "regex heuristic",
  introduced: "0.3.0",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;

    const fnRe = /^(\s*)def\s+(test_\w+)\s*\([^)]*\)\s*:/gm;
    let m: RegExpExecArray | null;
    while ((m = fnRe.exec(ctx.text)) !== null) {
      const body = extractBlock(ctx.text, m.index + m[0].length);
      if (body === null) continue;

      // Count real assert statements line-by-line (a statement starts the
      // line; `assert_...` method calls don't count as statements).
      const lines = body.split("\n");
      const assertStmts = lines.filter((l) => {
        const t = l.trimStart();
        return t.startsWith("assert") && !t.startsWith("assert_");
      }).length;
      if (assertStmts > 0) continue; // has real assertions — not mock-only

      // Mock bookkeeping appears as method CALLS: mock.save.assert_called_once(...)
      const mockAssertions = (
        body.match(
          /[\w.[\]]+\.assert_(?:called(?:_once|_twice)?(?:_with)?|not_called|any_call|has_calls|not_called_with)\s*\(/g,
        ) ?? []
      ).length;

      if (mockAssertions > 0) {
        findings.push({
          severity: "warning",
          confidence: "medium",
          findingType: "heuristic-risk",
          qaImpact: "HYGIENE",
          file: ctx.path,
          line: lineAt(ctx.text, m.index),
          column: colAt(ctx.text, m.index),
          message: `Test \`${m[2]}\` asserts only on mock call bookkeeping.`,
          why: "Mock.assert_called_* proves collaborators were invoked, not that the system produced the right result — the real logic can be broken while the test stays green.",
          fix: "Add at least one assertion on the actual return value or observable state.",
        });
      }
    }
    return findings;
  },
});

/** Extract an indented block starting after a `:` line; returns null if empty. */
function extractBlock(text: string, afterColon: number): string | null {
  const rest = text.slice(afterColon).replace(/\r\n/g, "\n");
  const firstContent = /(\S)/.exec(rest);
  if (!firstContent || firstContent.index === undefined) return null;
  const before = rest.slice(0, firstContent.index);
  if (before.includes("\n")) {
    const lines = rest.split("\n").slice(1);
    const indentMatch = /^[ \t]*/.exec(
      lines.find((l) => l.trim() !== "") ?? "",
    );
    const indent = indentMatch ? indentMatch[0] : "";
    if (!indent) return null;
    const collected: string[] = [];
    for (const line of lines) {
      if (line.trim() === "") {
        collected.push(line);
        continue;
      }
      if (line.startsWith(indent)) collected.push(line);
      else break;
    }
    return collected.join("\n");
  }
  const lineEnd = rest.indexOf("\n", firstContent.index);
  return rest.slice(0, lineEnd === -1 ? undefined : lineEnd);
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
