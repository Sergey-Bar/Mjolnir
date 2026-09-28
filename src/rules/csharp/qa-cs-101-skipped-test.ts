/**
 * QA-CS-101 — [Ignore]/[Skip] test without justification.
 * Severity: warning · Confidence: high · deterministic-defect
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const csSkippedTest = defineRule({
  id: "QA-CS-101",
  // 6.0: was "core". Demoted because the measurement does not support the
  // claim — 0% observed over n=10..25 is a 95% Wilson interval of
  // [0, 13.8%] to [0, 40.4%], which does not clear the 10% core ceiling. Only
  // `quarantine` is enforced, so this is behaviour-neutral: the rule still
  // runs on every scan. A re-sample at the raised MAX_SAMPLES_PER_RULE can
  // earn it back; src/rules/tier-evidence.ts ratchets that.
  tier: "extended",
  category: "QA-PW",
  title: "Skipped test",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "csharp",
  // Trust Metadata
  languages: ["csharp"],
  frameworks: ["nunit", "xunit", "mstest"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "LEXICAL",
  strategyJustification: {
    reasonCode: "exact-key-match",
    detail:
      "[Ignore]/[Fact(Skip=…)] are exact xUnit/NUnit/MSTest attribute " +
      "tokens; the detector matches the attribute identifiers — closed " +
      "token sets where lexical precision equals structural",
  },
  introduced: "0.3.8",

  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".cs")) return findings;

    const patterns = [
      // eslint-disable-next-line security/detect-unsafe-regex -- bounded literal pattern (no quantifier exchange surface) — ReDoS is authoritatively gated by regexp/no-super-linear-backtracking (error in the ratchet) + tests/rules/redos-gate.spec.ts
      { re: /\[Ignore(?:\([^)]*\))?\]/g, label: "[Ignore]" },
      { re: /\[Skip\b[^\]]*\]/g, label: "[Skip]" },
      { re: /\[Fact\s*\(\s*Skip\s*=/g, label: "Fact(Skip=...)" },
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
          why: "Skipped tests hide broken or unimplemented behavior behind a green build.",
          fix: "Fix and re-enable the test, or delete it with a tracked issue reference.",
        });
      }
    }
    return findings;
  },
});
