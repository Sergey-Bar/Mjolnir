/**
 * QA-JV-101 — @Disabled test without justification.
 * Severity: warning · Confidence: high · deterministic-defect
 * Disabled JUnit tests hide broken behavior behind a green run.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const jvDisabledTest = defineRule({
  id: "QA-JV-101",
  category: "QA-PW",
  title: "Disabled test",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "java",
  // Trust Metadata
  languages: ["java"],
  frameworks: ["junit", "testng"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "LEXICAL",
  strategyJustification: {
    reasonCode: "exact-key-match",
    detail:
      "@Disabled/@Ignore are exact JUnit/TestNG annotation tokens; the " +
      "detector matches the annotation identifier — annotation shapes are " +
      "closed token sets where lexical and structural match coincide",
  },
  introduced: "0.3.8",
  // 6.0: was "core". Demoted because the measurement does not support the
  // claim — 0% observed over n=10..25 is a 95% Wilson interval of
  // [0, 13.8%] to [0, 40.4%], which does not clear the 10% core ceiling. Only
  // `quarantine` is enforced, so this is behaviour-neutral: the rule still
  // runs on every scan. A re-sample at the raised MAX_SAMPLES_PER_RULE can
  // earn it back; src/rules/tier-evidence.ts ratchets that.
  // 6.0: was "core", demoted to "extended" because 0% observed over n=10..23 is
  // a Wilson interval of [0, 27.8%] to [0, 14.3%], which clears nothing.
  // `src/rules/tier-evidence.ts` ratcheted that.
  //
  // It cleared on 2026-10-03, the same day and by the same route as
  // QA-PW-117: a `--core-candidates` sweep over all 37 corpus repositories,
  // twenty rows adjudicated TP against pinned source, and the orphans removed
  // rather than judged. n = 35, zero observed false positives, Wilson upper
  // bound 9.89% against the 10% ceiling. `measurementTier` returns "core" on
  // its own evidence and `declaredCoreWithoutEvidence` is null, so this
  // declaration records a decision the measurement had already reached.
  //
  // Not behaviour-neutral: ADR 0014 gives core an evidence floor, so a finding
  // from this rule is stamped at least E1 and deducts `floor(base/2)` instead
  // of nothing.
  tier: "core",

  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".java")) return findings;

    const patterns = [
      { re: /@Disabled\b/g, label: "@Disabled" },
      { re: /@Ignore\b/g, label: "@Ignore (TestNG/JUnit4)" },
    ];
    for (const { re, label } of patterns) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        findings.push({
          severity: "warning",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "FALSE-GREEN",
          file: ctx.path,
          line: lineAt(text, m.index),
          column: colAt(text, m.index),
          message: `Disabled test detected: \`${label}\`.`,
          why: "Disabled tests hide broken or unimplemented behavior behind a green build.",
          fix: "Fix and re-enable the test, or delete it with a tracked issue reference.",
        });
      }
    }
    return findings;
  },
});
