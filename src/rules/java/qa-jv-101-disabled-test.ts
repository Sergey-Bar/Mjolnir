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
  tier: "extended",

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
