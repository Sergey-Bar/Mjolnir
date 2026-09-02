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

  // Measured 2026-09-02 (corpus wave 5): tier set from the measured envelope (plan §11.2).
  tier: "quarantine",
  // R6 (Bug Map M-02): QA-PY-003 is the generic no-assertions rule —
  // same root cause on a Playwright-Python test (co-fire proven on one
  // line in tests/fixtures/QA-PY-105/must-fire/test_checkout.py:2).
  // The measured Playwright-specific diagnosis survives; the generic
  // duplicate (quarantine) is deduped in --strict scans.
  overlapWith: ["QA-PY-003"],

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
      // Bug-audit M0 #10: the `page: Page` annotation was tested against
      // the WHOLE FILE — one annotated UI test branded every other test
      // in the file (pure unit tests included) as "drives the UI". The
      // annotation is per-function: check this test's own signature.
      const doesUiAction =
        /page\.(?:goto|click|fill|get_by_|locator)/.test(body) ||
        /page\s*:\s*Page/.test(m[0]);
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
    // firstContent guarantees at least one non-blank line exists.
    // firstContent guarantees at least one non-blank line exists, and the
    // zero-width pattern always matches.
    const indent = (
      /^[ \t]*/.exec(
        lines.find((l) => l.trim() !== "") as string,
      ) as RegExpExecArray
    )[0];
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
  return lineEnd === -1 ? rest : rest.slice(0, lineEnd);
}
