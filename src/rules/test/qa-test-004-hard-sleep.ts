/**
 * QA-TEST-004 — Hard sleep (`sleep()`, `waitForTimeout()`, `setTimeout` as wait).
 * Severity: warning · Confidence: high · deterministic-defect
 */

import { defineRule } from "../rule.js";
import { lineAt, colAt } from "../shared/positions.js";

export const hardSleep = defineRule({
  id: "QA-TEST-004",
  category: "QA-TEST",
  title: "Hard sleep in test",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FLAKY-RISK",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["jest", "vitest", "playwright", "mocha"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex pattern + behavioral wait-shape matching",
  introduced: "0.1.0",
  tier: "extended",
  run(ctx) {
    const findings: Omit<
      import("../../types.js").Finding,
      "ruleId" | "category"
    >[] = [];

    // Phase 1 (Tempering): match against the code-only view to avoid
    // firing on patterns inside string literals or comments.
    const text = ctx.codeText ?? ctx.text;

    const patterns = [
      /\bpage\.waitForTimeout\s*\(/g, // Playwright — fix hint: expect(locator).toBeVisible()
      /\bawait\s+new\s+Promise\s*\(\s*\w+\s*=>\s*setTimeout\s*\(\s*\w+\s*,\s*\d+\s*\)\s*\)/g,
      // Behavioral shapes (not just API names): an AWAITED call to a
      // delay/sleep/wait-style helper with a positive numeric literal.
      //
      // `await` is required on purpose. `sleep(10).then(...)` and
      // `queryFn: () => sleep(10)` are how real suites (TanStack Query,
      // MSW handlers) simulate mock latency — the sleep produces a value,
      // it does not pause the test body. `sleep(0)` is a microtask yield,
      // not a wall-clock wait, so it is also excluded.
      /\bawait\s+(?:delay|sleep|wait|pause|timeout)\s*\(\s*[1-9]\d*\s*\)/g,
      // setTimeout wrapped in a Promise (with or without await / type args).
      /\b(?:await\s+)?new\s+Promise\s*(?:<[^>]*>\s*)?\(\s*(?:\(\s*)?\w+\s*(?:\)\s*)?=>\s*setTimeout\s*\(\s*\w+\s*,\s*\d+\s*\)\s*\)/g,
      // setTimeout-as-promise stored in a helper then awaited.
      /\bawait\s+\w*[Dd]elay\w*\s*\(\s*\d+\s*\)/g,
    ];

    // Bug-audit M0 #2: patterns 2 and 4 are strict subsets of pattern 5,
    // and 3 overlaps 6 — the same call produced TWO identical findings,
    // inflating the report and the score. Deduplicate by match position.
    const seen = new Set<number>();
    for (const re of patterns) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        if (seen.has(m.index)) continue;
        seen.add(m.index);
        const isPlaywright = m[0].startsWith("page.waitForTimeout");
        findings.push({
          severity: "warning",
          confidence: "high",
          findingType: "deterministic-defect",
          file: ctx.path,
          line: lineAt(text, m.index),
          column: colAt(text, m.index),
          message: `Hard sleep: \`${m[0]}\`.`,
          why: "Fixed sleeps make tests both slow and flaky — they guess at timing instead of waiting for state.",
          fix: isPlaywright
            ? "Replace with a condition wait: `await expect(locator).toBeVisible()`."
            : "Wait for an explicit condition (element state, promise, or signal) instead of a fixed delay.",
          qaImpact: "FLAKY-RISK",
        });
      }
    }
    return findings;
  },
});
