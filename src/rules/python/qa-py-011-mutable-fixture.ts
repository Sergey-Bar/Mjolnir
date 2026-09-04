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
  detectionStrategy: "LEXICAL",
  introduced: "0.3.0",

  // Measured 2026-09-02 (corpus wave 5): tier set from the measured envelope (plan §11.2).
  tier: "core",
  run(ctx) {
    const text = ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;

    // @pytest.fixture(scope="session"/"module"/"package") whose body returns
    // a mutable literal (list/dict/set) — shared across tests AND mutable.
    // FW-RX-06: line-anchored scan — every quantifier is newline-disjoint
    // or literal-anchored, so no \s/\n exchange surface remains. The body
    // capture is a run of blank or INDENTED lines (a top-level def body);
    // it terminates at the first column-0 content line exactly where the
    // original lookahead (?=\n\S|\n*$) terminated.
    const re =
      // eslint-disable-next-line security/detect-unsafe-regex -- bounded literal pattern (no quantifier exchange surface) — ReDoS is authoritatively gated by regexp/no-super-linear-backtracking (error in the ratchet) + tests/redos-audit.spec.ts
      /@pytest\.fixture[ \t]*\([^)\n]*scope[ \t]*=[ \t]*["'](session|module|package)["'][^)\n]*\)[ \t]*\r?\ndef[ \t]+(\w+)[ \t]*\([^)\n]*\)[ \t]*:[ \t]*\r?\n((?:[ \t]*\r?\n|[ \t]+\S[^\r\n]*\r?\n)*(?:[ \t]+\S[^\r\n]*)?)/g;

    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const body = m[3] as string;
      // Bug-audit M0 #11: the old shape list only flagged EMPTY or
      // colon-shaped returns — `return [1, 2]` (the most common mutable
      // return), `return dict(...)`, and `defaultdict(...)` all passed
      // silently. Any collection literal or collection constructor is
      // shared mutable state.
      if (
        /return\s+(?:\[[^\]]*\]|\{[^}]*\}|(?:dict|defaultdict|set)\s*\()/.test(
          body,
        )
      ) {
        findings.push({
          severity: "warning",
          confidence: "medium",
          findingType: "heuristic-risk",
          qaImpact: "FLAKY-RISK",
          file: ctx.path,
          line: lineAt(text, m.index),
          column: colAt(text, m.index),
          message: `Fixture \`${m[2]}\` is ${m[1] as string}-scoped and returns a mutable collection.`,
          why: "Tests that mutate a shared module/session fixture create hidden execution-order dependency — the suite passes in one order and fails in another.",
          fix: "Use function scope (default), or return an immutable copy / factory so each test gets fresh state.",
        });
      }
    }
    return findings;
  },
});
