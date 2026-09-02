/**
 * QA-PY-002 — Skipped test (`@pytest.mark.skip`, `xfail` non-strict).
 * Severity: warning · Confidence: high · deterministic-defect
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const pySkippedTest = defineRule({
  id: "QA-PY-002",
  tier: "core",
  category: "QA-TEST",
  title: "Skipped test",
  severity: "warning",
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

  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;

    const patterns = [
      { re: /@pytest\.mark\.skip\b/g, label: "@pytest.mark.skip" },
      {
        re: /@pytest\.mark\.skipif\([^)]*reason\s*=\s*None/g,
        label: "skipif without reason",
      },
      {
        re: /@pytest\.mark\.xfail(?![^)]*strict\s*=\s*True)/g,
        label: "non-strict xfail",
      },
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
          message: `Skipped test detected: \`${label}\`.`,
          why: "Skipped tests hide broken or unimplemented behavior behind a green checkmark.",
          fix: "Fix and re-enable the test, or delete it with a tracked issue reference.",
        });
      }
    }
    return findings;
  },
});
