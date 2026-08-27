/**
 * QA-PY-105 — Playwright-Python: no assertion in Playwright test.
 * Severity: error · Confidence: high · deterministic-defect
 * A Playwright test that only navigates/clicks but never asserts can
 * only fail by crashing — pure theater.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const pyPwNoAssertions = defineRule({
  id: "QA-PY-105",
  category: "QA-PW",
  title: "Playwright test without assertions",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "python",
  // Trust Metadata
  languages: ["python"],
  frameworks: ["pytest-playwright", "playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex heuristic",
  introduced: "0.3.8",

  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;
    if (!/playwright/i.test(text)) return findings;

    const fnRe = /^(\s*)def\s+(test_\w+)\s*\([^)]*\)\s*:/gm;
    let m: RegExpExecArray | null;
    while ((m = fnRe.exec(text)) !== null) {
      const body = extractBlock(text, m.index + m[0].length);
      if (body === null) continue;

      const hasCheck =
        /^\s*assert\b/m.test(body) ||
        /expect\s*\(/.test(body) ||
        /assert_/.test(body);
      const doesUiAction =
        /page\.(?:goto|click|fill|get_by_|locator)/.test(body) ||
        /page\s*:\s*Page/.test(text);
      if (doesUiAction && !hasCheck) {
        findings.push({
          severity: "error",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "FALSE-GREEN",
          file: ctx.path,
          line: lineAt(text, m.index),
          column: colAt(text, m.index),
          message: `Playwright test \`${m[2]}\` drives the UI but asserts nothing.`,
          why: "Clicking through pages without asserting outcomes proves navigation didn't crash — not that the feature works. Any regression short of a JS exception stays green.",
          fix: "Add outcome assertions: `expect(page).to_have_url(...)`, `expect(page.get_by_role('heading')).to_be_visible()`.",
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
