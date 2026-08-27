/**
 * QA-PY-011 — Mutable fixture shared across tests.
 * Severity: warning · Confidence: medium · heuristic-risk
 * A module-scoped mutable fixture (list/dict/set literal) creates hidden
 * order dependency: tests mutate what other tests read.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const pyMutableFixture = defineRule({
  id: "QA-PY-011",
  category: "QA-TQUAL",
  title: "Mutable fixture shared across tests",
  severity: "warning",
  confidence: "medium",
  findingType: "heuristic-risk",
  qaImpact: "FLAKY-RISK",
  appliesTo: "python",
  // Trust Metadata
  languages: ["python"],
  frameworks: ["pytest"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.3.0",

  run(ctx) {
    const text = ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;

    // @pytest.fixture(scope="session"/"module"/"package") whose body returns
    // a mutable literal (list/dict/set) — shared across tests AND mutable.
    const re =
      /@pytest\.fixture\s*\([^)]*scope\s*=\s*["'](session|module|package)["'][^)]*\)\s*\ndef\s+(\w+)\s*\([^)]*\)\s*:\s*\n([\s\S]*?)(?=\n\S|\n*$)/g;

    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const body = m[3] ?? "";
      if (/return\s+(\[\s*\]|\{\s*\}|\{\s*[^}:]+:|set\()/.test(body)) {
        findings.push({
          severity: "warning",
          confidence: "medium",
          findingType: "heuristic-risk",
          qaImpact: "FLAKY-RISK",
          file: ctx.path,
          line: lineAt(text, m.index),
          column: colAt(text, m.index),
          message: `Fixture \`${m[2]}\` is ${m[1] ?? "shared"}-scoped and returns a mutable collection.`,
          why: "Tests that mutate a shared module/session fixture create hidden execution-order dependency — the suite passes in one order and fails in another.",
          fix: "Use function scope (default), or return an immutable copy / factory so each test gets fresh state.",
        });
      }
    }
    return findings;
  },
});
