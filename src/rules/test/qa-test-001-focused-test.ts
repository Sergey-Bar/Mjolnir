/**
 * QA-TEST-001 — Focused test committed (`fit`/`fdescribe`/`.only`).
 * Severity: error · Confidence: high · deterministic-defect
 *
 * A focused suite runs a fraction of the tests while CI shows green.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const focusedTestCommitted = defineRule({
  id: "QA-TEST-001",
  category: "QA-TEST",
  title: "Focused test committed",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["jest", "vitest", "playwright", "mocha"],
  falsePositiveRisk: "low",
  autofix: true,
  detectionStrategy: "regex pattern",
  introduced: "0.1.0",
  // `.only` makes the runner execute this test and skip every other one, so a
  // green run is not evidence about the rest of the suite. Categorical, not a
  // matter of degree — see RuleMeta.suiteInvalidating.
  suiteInvalidating: true,

  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    // Fast textual pre-pass for `.only(` / `fit(`/`fdescribe(` call targets.
    const onlyCall = /(?:^|[^\w$.])(?:fit|fdescribe)\s*\(/g;
    const dotOnly = /\.only\s*\(/g;

    let m: RegExpExecArray | null;
    while ((m = onlyCall.exec(text)) !== null) {
      findings.push({
        severity: "error",
        confidence: "high",
        findingType: "deterministic-defect",
        file: ctx.path,
        line: lineAt(text, m.index),
        column: colAt(text, m.index),
        message: `Focused test committed: \`${m[0].trim()}\` restricts the run to a subset of tests.`,
        why: "CI will show green while the vast majority of the suite never executed.",
        fix: "Remove the focus modifier and commit the full suite.",
        qaImpact: "FALSE-GREEN",
      });
    }
    while ((m = dotOnly.exec(text)) !== null) {
      // Avoid double-reporting fit().only patterns; textual heuristic is
      // refined by AST pass in the rule runner (W2 fixture harness locks it).
      findings.push({
        severity: "error",
        confidence: "high",
        findingType: "deterministic-defect",
        file: ctx.path,
        line: lineAt(text, m.index),
        column: colAt(text, m.index),
        message: "`.only` focus modifier committed.",
        why: "Only the focused subset executes; the rest of the suite is silently skipped in CI.",
        fix: "Remove `.only` before committing.",
        qaImpact: "FALSE-GREEN",
      });
    }
    return findings;
  },
});
