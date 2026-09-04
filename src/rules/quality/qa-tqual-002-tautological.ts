/**
 * QA-TQUAL-002 — Tautological assertion.
 * Severity: error · Confidence: high · deterministic-defect
 * `expect(true).toBe(true)` proves the runtime exists, nothing more.
 */

import { defineRule } from "../rule.js";
import { getCodeOnlyText } from "../../engine/ts-ast.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const tautologicalAssertion = defineRule({
  id: "QA-TQUAL-002",
  category: "QA-TQUAL",
  title: "Tautological assertion",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["jest", "vitest", "playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "LEXICAL",
  detectionNotes: "AST-stripped text pattern",
  introduced: "0.1.0",

  // Measured 2026-09-02 (corpus wave 5): tier set from the measured envelope (plan §11.2).
  tier: "quarantine",
  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    // expect(<literal>).<matcher>(<same-or-any-literal>)
    // Runs on the comment/string-free view: a tautology inside a prose
    // comment or a doc-example string is documentation, not a defect.
    const text = ctx.codeText ?? getCodeOnlyText(ctx);
    const re =
      // eslint-disable-next-line security/detect-unsafe-regex -- bounded literal pattern (no quantifier exchange surface) — ReDoS is authoritatively gated by regexp/no-super-linear-backtracking (error in the ratchet) + tests/redos-audit.spec.ts
      /expect\s*\(\s*(?:true|false|null|undefined|\d+)\s*\)\s*\.\s*toBe(?:True|False)?\s*\(\s*(?:(?:true|false|null|undefined|\d+)\s*)?\)/g;

    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      findings.push({
        severity: "error",
        confidence: "high",
        findingType: "deterministic-defect",
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: `Tautological assertion: \`${m[0].slice(0, 60)}\`.`,
        why: "Asserting a literal against a literal can never fail — it verifies no system behavior.",
        fix: "Assert on actual output of the code under test.",
        qaImpact: "FALSE-GREEN",
      });
    }

    // Bug-audit M0 #3: string-literal tautologies (`expect('a').toBe('a')`)
    // could never match the view above — getCodeOnlyText blanks string
    // literals INCLUDING their quotes, so the old quoted alternation was
    // dead code and the whole false-negative class invisible. The quoted
    // form is detected on the raw text instead, but only when the
    // `expect(` head itself is real code: it must survive masking
    // unchanged (inside a comment or a string, masking blanks it).
    const rawRe =
      // eslint-disable-next-line security/detect-unsafe-regex -- bounded literal pattern (no quantifier exchange surface) — ReDoS is authoritatively gated by regexp/no-super-linear-backtracking (error in the ratchet) + tests/redos-audit.spec.ts
      /expect\s*\(\s*(['"`])([^'"`]*)\1\s*\)\s*\.\s*toBe(?:True|False)?\s*\(\s*(?:(['"`])([^'"`]*)\3\s*)?\)/g;
    const codeText = ctx.codeText ?? getCodeOnlyText(ctx);
    while ((m = rawRe.exec(ctx.text)) !== null) {
      let headIsCode = true;
      for (let i = m.index; i < m.index + "expect".length; i++) {
        if (ctx.text[i] !== codeText[i]) {
          headIsCode = false;
          break;
        }
      }
      if (!headIsCode) continue;
      // Tautology requires the compared literal to equal the expect
      // argument (toBe('x') where 'x' === the argument), or a bare
      // truthiness matcher (toBeTrue) on a non-empty literal.
      // Group 2 always participates (the quantifier allows empty), so the
      // expect-argument string is always captured.
      const arg = m[2] as string;
      const compared = m[4];
      const matcher = /toBe(True|False)?\s*\(/.exec(m[0])?.[1];
      const isTautology =
        compared !== undefined
          ? compared === arg
          : matcher === "True"
            ? arg.length > 0
            : false;
      if (!isTautology) continue;
      findings.push({
        severity: "error",
        confidence: "high",
        findingType: "deterministic-defect",
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: `Tautological assertion: \`${m[0].slice(0, 60)}\`.`,
        why: "Asserting a literal against a literal can never fail — it verifies no system behavior.",
        fix: "Assert on actual output of the code under test.",
        qaImpact: "FALSE-GREEN",
      });
    }
    return findings;
  },
});
