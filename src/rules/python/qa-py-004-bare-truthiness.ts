/**
 * QA-PY-004 — Bare truthiness assert on complex object.
 * Severity: warning · Confidence: medium · heuristic-risk
 * `assert result` passes for ANY truthy value — including a wrong one.
 * It verifies almost nothing about behavior.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const pyBareTruthinessAssert = defineRule({
  id: "QA-PY-004",
  category: "QA-TQUAL",
  title: "Bare truthiness assert on complex object",
  severity: "warning",
  confidence: "medium",
  findingType: "heuristic-risk",
  qaImpact: "FALSE-GREEN",
  appliesTo: "python",
  // Trust Metadata
  languages: ["python"],
  frameworks: ["pytest"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "LEXICAL",
  introduced: "0.3.0",
  tier: "quarantine",
  // Phase 2 retune (EVIDENCE-BACKED, detectorRevision 2 — §07): the
  // measured FP cohort (docs/FP-AUDIT.md, 45% FP n=20) splits into two
  // clusters, both predicate calls the bare-truthiness diagnosis never
  // applied to: `assert isinstance(x, T)` type checks (the bool IS the
  // assertion) and `assert s.startswith(...)`-style string/content
  // predicates. Both are now skipped. The bare-identifier/attribute
  // shapes the TPs cite (exception objects, results) still fire.
  detectorRevision: 2,

  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;

    // `assert <identifier-or-call>` with no comparison/boolean operator.
    const re = /^[ \t]*assert\s+([A-Za-z_][\w.]*(?:\([^()]*\))?)[ \t]*$/gm;

    // Calls whose return value is a meaningful boolean predicate — the
    // truthiness IS the check, so flagging them as "bare" is wrong.
    const predicateRe =
      /^(?:isinstance\s*\(|[\w.]*\.(?:startswith|endswith|isdigit|isalpha|isalnum|isnumeric|isdecimal|isspace|islower|isupper|istitle|isidentifier|isprintable|isascii)\s*\()/;

    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const target = m[1] as string;
      // Skip obviously-boolean names (is_/has_/can_ conventions).
      if (/^(?:is|has|can|should|was|were)_/.test(target)) continue;
      // Skip boolean-predicate calls (Phase 2: the measured FP clusters).
      if (predicateRe.test(target)) continue;
      findings.push({
        severity: "warning",
        confidence: "medium",
        findingType: "heuristic-risk",
        qaImpact: "FALSE-GREEN",
        file: ctx.path,
        line: lineAt(text, m.index),
        column: colAt(text, m.index),
        message: `Bare truthiness assert: \`assert ${target}\`.`,
        why: "This passes for any truthy value — a wrong object, wrong count, or partially-built result all slip through. It verifies existence, not correctness.",
        fix: "Assert the specific expected value or property: `assert result.id == expected`, `assert len(items) == 3`.",
      });
    }
    return findings;
  },
});
