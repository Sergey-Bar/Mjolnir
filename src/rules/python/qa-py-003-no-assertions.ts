/**
 * QA-PY-003 — Test function with no assertions.
 * Severity: error · Confidence: high · deterministic-defect
 * A pytest test that never asserts can only fail by raising.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const pyNoAssertions = defineRule({
  id: "QA-PY-003",
  category: "QA-TEST",
  title: "Test function with no assertions",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "python" as unknown as "test-files",
  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;

    // Find `def test_*():` bodies and check for assert/pytest.raises.
    const fnRe = /^(\s*)def\s+(test_\w+)\s*\([^)]*\)\s*:/gm;
    let m: RegExpExecArray | null;
    while ((m = fnRe.exec(ctx.text)) !== null) {
      const body = extractBlock(ctx.text, m.index + m[0].length);
      if (body === null) continue;
      const hasCheck =
        // [ \t] not \s — \s crosses lines, matching asserts outside this block.
        /^[ \t]*assert\b/m.test(body) ||
        /pytest\.raises/.test(body) ||
        /self\.assert/.test(body) ||
        /\bexpect\b/.test(body);
      if (!hasCheck) {
        findings.push({
          severity: "error",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "FALSE-GREEN",
          file: ctx.path,
          line: lineAt(ctx.text, m.index),
          column: colAt(ctx.text, m.index),
          message: `Test \`${m[2]}\` contains no assertions.`,
          why: "Without an assertion the test can only fail by crashing — it cannot detect behavioral regressions.",
          fix: "Add an `assert` on the expected outcome, or remove the test.",
        });
      }
    }
    return findings;
  },
});

/** Extract an indented block starting after a `:` line; returns null if empty. */
function extractBlock(text: string, afterColon: number): string | null {
  // Normalize CRLF first.
  const rest = text.slice(afterColon).replace(/\r\n/g, "\n");
  const firstContent = /(\S)/.exec(rest);
  if (!firstContent || firstContent.index === undefined) return null;
  const firstIdx = firstContent.index;
  const before = rest.slice(0, firstIdx);
  if (before.includes("\n")) {
    // Indented block: content is on a following line.
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
  // True inline body: def test_x(): do_thing()
  const lineEnd = rest.indexOf("\n", firstIdx);
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
