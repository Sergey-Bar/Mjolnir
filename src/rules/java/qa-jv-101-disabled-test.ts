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
  // 6.0: was "core", demoted to "extended" because the measurement did not
  // support the claim — 0% observed over n=10..25 is a 95% Wilson interval of
  // [0, 13.8%] to [0, 40.4%], which does not clear the 10% core ceiling. Only
  // `quarantine` is enforced, so that demotion was behaviour-neutral: the rule
  // still runs on every scan.
  //
  // It earned core back on 2026-10-03, the same day and by the same route as
  // QA-PW-117: a `--core-candidates` sweep over the corpus, every row adjudicated
  // by hand against the PINNED commit, and the orphans retracted rather than
  // judged. The arithmetic, because it arrived in TWO batches and the first
  // batch alone reads as a refusal:
  //
  //   n = 32, ciHigh 10.72%   — short of the 10% ceiling
  //   batch 1 → n = 34, 10.15%  — 2 TP + 1 RETRACT. Still short. This verdict
  //                               is `tests/corpus/verdicts/proposed/jv-101-final.json`
  //                               and on its own reads "NOT promoted".
  //   batch 2 → n = 35,  9.89%  — 1 TP, adjudicated after corpus-sample.ts was
  //                               fixed to clone repo.ref instead of the default
  //                               branch, so the tree scanned and the tree the
  //                               verdict describes are the same tree.
  //                               `tests/corpus/verdicts/proposed/jv-101-core.json`
  //
  // Batch 2 is the one that clears the ceiling, so neither batch file is the
  // whole story and reading only the first concludes the promotion was
  // fabricated. It was not: zero observed false positives at n=35 puts the
  // Wilson upper bound at 9.89%, `measurementTier` returns "core" on that
  // evidence alone, and `declaredCoreWithoutEvidence` is null — so this
  // declaration records a decision the measurement had already reached.
  // `npm run generate-fp-audit-table` reproduces n=35 from the committed
  // verdicts with no diff; the row is derived, not declared.
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
