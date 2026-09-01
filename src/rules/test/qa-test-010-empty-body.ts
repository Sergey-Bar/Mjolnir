/**
 * QA-TEST-010 — Empty test body.
 * Severity: error · Confidence: high · deterministic-defect
 * A test that executes nothing can never fail — the purest false proof.
 */

import { defineRule } from "../rule.js";
import { lineAt, colAt } from "../shared/positions.js";
import { isInsideEmbeddedCode } from "../shared/masking.js";

export const emptyTestBody = defineRule({
  id: "QA-TEST-010",
  tier: "core",
  category: "QA-TEST",
  title: "Empty test body",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["jest", "vitest", "playwright", "mocha"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.1.0",

  // R6 (Bug Map M-02): an empty (or comment-only) body trivially has no
  // assertions — QA-TEST-003 (generic, quarantine) co-fires on the same
  // root cause (proven on one line in the QA-TEST-010 must-fire
  // fixture). The more specific diagnosis survives; the generic one is
  // deduped in --strict scans.
  overlapWith: ["QA-TEST-003"],

  run(ctx) {
    const text = ctx.text;
    const findings: Omit<
      import("../../types.js").Finding,
      "ruleId" | "category"
    >[] = [];

    // Matches it/test/describe-with-it whose callback is empty or comment-only:
    // `it('x', () => {})` / `it('x', () => { /* nothing */ })`
    //
    // Bug-audit 2026-08-31 (astro corpus): a body-leading `//` comment whose
    // TEXT ends with `})` used to satisfy the trailing `\}\s*\)` — the
    // comment's content was consumed as code structure, flagging bodies full
    // of real code (`// ...new Response(null, { status: 404 })`). A line
    // comment now must run to end-of-line, so the closing `}` can only match
    // on a later line. Block comments are unaffected (`*/` is a real
    // terminator, so `it('x', () => { /* c */ })` still matches).
    const re =
      /\b(?:it|test)\s*\(\s*['"`][^'"`]*['"`]\s*,\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{\s*(?:(?:\/\*[\s\S]*?\*\/|\/\/[^\n\r]*\r?\n)\s*)?\}\s*\)/g;

    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      // Skip matches inside string literals containing embedded code (test data)
      if (isInsideEmbeddedCode(ctx, m.index)) continue;

      findings.push({
        severity: "error",
        confidence: "high",
        findingType: "deterministic-defect",
        file: ctx.path,
        line: lineAt(text, m.index),
        column: colAt(text, m.index),
        message: "Test has an empty body — it can never fail.",
        why: "An empty test inflates pass counts and proves nothing about behavior.",
        fix: "Implement the test or remove it.",
        qaImpact: "FALSE-GREEN",
      });
    }
    return findings;
  },
});
