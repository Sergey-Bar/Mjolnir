/**
 * QA-PY-003 — Test function with no assertions.
 * Severity: error · Confidence: high · deterministic-defect
 * A pytest test that never asserts can only fail by raising.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const pyNoAssertions = defineRule({
  id: "QA-PY-003",
  category: "QA-TEST",
  title: "Test function with no assertions",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "python",
  // Trust Metadata
  languages: ["python"],
  frameworks: ["pytest"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "LEXICAL",
  introduced: "0.3.0",
  tier: "quarantine",
  // Phase 2 retune wave 2 (EVIDENCE-BACKED, detectorRevision 3 — §07):
  // the rev-2 delta sample (12 FP / 7 TP / 1 UNSURE) splits the FPs:
  // 7 are helper-name verification (`expect_*`, `wait_for_*` — the
  // PY-105 cohort), 1 is a nested def (pytest only collects
  // module-level functions and Test* methods), 3 are pytest doc-example
  // artifacts (accepted residue), 1 is a callback named test_* (covered
  // by the nesting skip). Helper-idiom recognition added and collection
  // scoping narrowed to module-level defs.
  detectorRevision: 3,

  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;

    // Find `def test_*():` bodies and check for assert/pytest.raises.
    // Indent is line-local ([ \t]* — \s would swallow preceding blank
    // lines and mis-anchor the match); the capture is the nesting check.
    const fnRe = /^([ \t]*)def\s+(test_\w+)\s*\([^)]*\)\s*:/gm;
    let m: RegExpExecArray | null;
    while ((m = fnRe.exec(text)) !== null) {
      // Pytest collects module-level functions (and Test* class methods,
      // which carry self.assert* and are recognized by the vocabulary
      // below). Nested defs are callbacks/data, never collected tests —
      // wave-2 delta evidence (a `test_callback` inside call_on_close).
      // The leading-indent capture always participates (possibly "").
      const indent = m[1] as string;
      if (indent.length > 0) continue;
      const body = extractBlock(text, m.index + m[0].length);
      if (body === null) continue;
      const hasCheck =
        // [ \t] not \s — \s crosses lines, matching asserts outside this block.
        /^[ \t]*assert\b/m.test(body) ||
        /pytest\.raises/.test(body) ||
        // Phase 2 vocabulary: pytest's other verification entrances.
        /pytest\.(?:warns|deprecated_call|fail\s*\()/.test(body) ||
        /self\.assert/.test(body) ||
        /\bexpect\b/.test(body) ||
        // Wave 2: verification delegated to helpers whose names assert
        // or wait (the PY-105 cohort — `expect_markdown(app, ...)`,
        // `wait_for_app_run(app)`, `_expect_no_exception(app)`).
        /\b_?(?:assert|expect|verify|check)[_A-Z]\w*\s*\(/.test(body) ||
        /\b_?wait_for_\w+\s*\(/.test(body);
      if (!hasCheck) {
        // Phase 2 data-shape skip: a `test_*` function whose NAME is
        // referenced elsewhere in the file (passed to a runner, stored in
        // a list, awaited as a coroutine) is test DATA — e.g. pytester
        // scripts whose collected assertion lives in the parent test.
        const name = m[2] as string;
        // eslint-disable-next-line security/detect-non-literal-regexp -- name is a test_\w+ identifier captured by fnRe — no regex metacharacters
        const refRe = new RegExp(`\\b${name}\\b`, "g");
        let refs = 0;
        while (refRe.exec(text) !== null) {
          refs++;
          // Two or more occurrences of the name (the def plus any other
          // mention — runner invocation, list membership, forward ref)
          // mark the function as referenced test data.
          if (refs > 1) break;
        }
        if (refs > 1) continue;
        findings.push({
          severity: "error",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "FALSE-GREEN",
          file: ctx.path,
          line: lineAt(text, m.index),
          column: colAt(text, m.index),
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
  const firstContent = /\S/.exec(rest);
  if (!firstContent || firstContent.index === undefined) return null;
  const firstIdx = firstContent.index;
  const before = rest.slice(0, firstIdx);
  if (before.includes("\n")) {
    // Indented block: content is on a following line.
    const lines = rest.split("\n").slice(1);
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
  // True inline body: def test_x(): do_thing()
  const lineEnd = rest.indexOf("\n", firstIdx);
  return lineEnd === -1 ? rest : rest.slice(0, lineEnd);
}
