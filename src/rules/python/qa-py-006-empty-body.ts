/**
 * QA-PY-006 — Empty test body (`pass` only).
 * Severity: error · Confidence: high · deterministic-defect
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const pyEmptyBody = defineRule({
  id: "QA-PY-006",
  category: "QA-TEST",
  title: "Empty test body (pass)",
  severity: "info",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "python",
  // Trust Metadata
  languages: ["python"],
  frameworks: ["pytest"],
  falsePositiveRisk: "high",
  autofix: false,
  detectionStrategy: "LEXICAL",
  introduced: "0.3.0",
  // RETIRED (docs/RULE-LIFECYCLE.md — Phase 2 quarantine-cluster triage):
  // measured 100% FP (n=20, docs/FP-AUDIT.md) with zero TPs — the rule's
  // premise is wrong on real code, not its tuning. Severity downgraded to
  // info (non-blocking everywhere); code + fixtures stay, the frozen ID
  // is never reused. Successor ideas ship under NEW rule IDs (lifecycle §2).
  tier: "quarantine",

  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;

    // FW-RX-05: newline-disjoint classes — `[ \t]*` where only indent
    // whitespace is legal, explicit \n at line ends — removes the \s*/\s+
    // exchange while keeping the same line shapes.
    const re =
      // eslint-disable-next-line security/detect-unsafe-regex -- bounded literal pattern (no quantifier exchange surface) — ReDoS is authoritatively gated by regexp/no-super-linear-backtracking (error in the ratchet) + tests/redos-audit.spec.ts
      /^( *)def[ \t]+(test_\w+)[ \t]*\([^)\n]*\):[ \t]*\r?\n(?:\1[ \t]+#[^\r\n]*\r?\n)?\1 {4}pass[ \t]*\r?$/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      findings.push({
        severity: "info",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "FALSE-GREEN",
        file: ctx.path,
        line: lineAt(text, m.index),
        column: colAt(text, m.index),
        message: `Test \`${m[2]}\` has an empty body (pass only).`,
        why: "An empty test inflates pass counts and proves nothing about behavior.",
        fix: "Implement the test or remove it.",
      });
    }
    return findings;
  },
});
