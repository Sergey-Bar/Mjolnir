/**
 * QA-TEST-011 — Suppression comment in test file.
 * Severity: warning · Confidence: high · deterministic-defect
 *
 * A suppression comment (eslint-disable, noqa, nolint, noinspection)
 * inside a test file can mask legitimate findings and produce a
 * false-green signal. Per anti-gaming corpus AG-004, suppressions
 * are recorded and the score is capped at the last unsuppressed level.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

const SUPPRESSION_PATTERNS = [
  /\/\/ eslint-disable\b/g,
  /\/\* eslint-disable\b/g,
  /\/\/ eslint-disable-line\b/g,
  /\/\/ eslint-disable-next-line\b/g,
  /#\s*noqa\b/g,
  /\/\/ nolint\b/g,
  /\/\* nolint \*\//g,
  /\/\/ noinspection\b/g,
  /\/\* noinspection \*\//g,
] as const;

export const suppressionComment = defineRule({
  id: "QA-TEST-011",
  category: "QA-TEST",
  title: "Suppression comment in test file",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "test-files",
  languages: ["typescript", "javascript", "python"],
  frameworks: ["jest", "vitest", "playwright", "mocha"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "LEXICAL",
  strategyJustification: {
    reasonCode: "lexical-artifact",
    detail:
      "Suppression comments are lexical artifacts — the comment text itself is the finding. " +
      "The detector matches known suppression comment patterns on the code-only text, " +
      "which is the honest shipped detector; the §13.2 fallback keeps parity",
  },
  introduced: "2.0.0",
  tier: "quarantine",

  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    for (const pattern of SUPPRESSION_PATTERNS) {
      let m: RegExpExecArray | null;
      const re = new RegExp(pattern.source, pattern.flags);
      while ((m = re.exec(text)) !== null) {
        findings.push({
          severity: "warning",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "FALSE-GREEN",
          file: ctx.path,
          line: lineAt(text, m.index),
          column: colAt(text, m.index),
          message: `Suppression comment detected: \`${m[0].trim()}\`. Suppressions can mask legitimate findings and produce a false-green signal.`,
          why: "Suppression comments silence rules that may have legitimate findings, making the suite appear clean when it is not.",
          fix: "Remove the suppression comment or replace it with a justified override that documents the exception.",
        });
      }
    }

    return findings;
  },
});
