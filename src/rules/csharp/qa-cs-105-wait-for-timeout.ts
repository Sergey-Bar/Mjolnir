/**
 * QA-CS-105 — Playwright-.NET: WaitForTimeoutAsync hard sleep.
 * Severity: warning · Confidence: high · deterministic-defect
 * Same meaning as QA-PW-101/QA-JV-105/QA-PY-103, translated to the
 * PascalCase Async-suffixed .NET API (verified in
 * docs/JAVA-CSHARP-IDIOM-MAPPING.md — .NET Playwright is async-only,
 * there is no sync WaitForTimeout).
 *
 * Lane A migration dossier (blueprint §10, hard-sleep JV/CS family):
 * 1. BASELINE (rev 1, LEXICAL): regex over codeText; FP 0.25 (n=16) —
 *    adjudicated FP classes were prose mentions in comments/strings.
 * 2. IMPLEMENTATION (rev 2, QA_MODEL): a finding requires a real
 *    invocation_expression node with callee `WaitForTimeoutAsync` —
 *    declarations, comments and strings are invisible to the grammar.
 * 3. RE-MEASUREMENT: sidecar regenerated at rev 2 in this change.
 * 4. FN check: parity tests over committed must-fire fixtures prove
 *    finding-identical results; must-not-fire fixtures pin precision.
 * 5. PERFORMANCE: model extraction walks the existing parse tree —
 *    no additional parse.
 * 6. ADR: QA-model adopted (grammar precision > lexical simplicity).
 *    Legacy lexical fallback retained ONLY for AST-less contexts
 *    (parse declined / unit tests).
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";
import { getTreeSitterTree } from "../../engine/jv-cs-ast.js";
import { extractQaModel, type QaSemanticModel } from "../../engine/qa-model.js";

export const csWaitForTimeout = defineRule({
  id: "QA-CS-105",
  category: "QA-PW",
  title: "WaitForTimeoutAsync hard sleep",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FLAKY-RISK",
  appliesTo: "csharp",
  // Trust Metadata
  languages: ["csharp"],
  frameworks: ["nunit", "xunit", "mstest", "playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  // Lane A: QA-model substrate (was LEXICAL) — see the dossier above.
  detectionStrategy: "QA_MODEL",
  introduced: "0.4.0",
  tier: "extended",
  // Lane A migration: grammar-precision re-expression bumps the
  // detector revision in the same PR (§10 dossier requirement).
  detectorRevision: 2,

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".cs")) return findings;

    // QA-model path (the pipeline provides the parsed tree at rule
    // time — the §10 substrate shape: adapter → optional model → rule).
    // extractQaModel cannot return undefined here: the path is .cs
    // (guarded above) and the tree passed getTreeSitterTree's narrowing,
    // which is exactly extractCSharpModel's own entry condition.
    const tree = getTreeSitterTree(ctx.ast);
    if (tree) {
      const model = extractQaModel({
        path: ctx.path,
        text: ctx.text,
        ast: tree,
      }) as QaSemanticModel;
      // Detection surface IDENTICAL to rev 1's measured vocabulary:
      // callee `WaitForTimeoutAsync` only (Task.Delay is QA-CS-102's).
      // Grammar precision: declarations/comments/strings cannot fire.
      for (const node of model.nodes) {
        if (node.concept === "wait" && node.callee === "WaitForTimeoutAsync") {
          findings.push({
            severity: "warning",
            confidence: "high",
            findingType: "deterministic-defect",
            qaImpact: "FLAKY-RISK",
            file: ctx.path,
            line: node.start.line,
            column: node.start.column,
            message: "`WaitForTimeoutAsync()` hard sleep.",
            why: "Fixed waits encode hope, not synchronization — too short flakes under load, too long slows every run.",
            fix: "Use `await Assertions.Expect(locator).ToBeVisibleAsync()` or `locator.WaitForAsync()` with auto-waiting.",
          });
        }
      }
      return findings;
    }

    // Legacy lexical fallback: only reachable when the parse stage
    // declined (§10 budget) or in unit tests without an AST. Same
    // surface as rev 1 — codeText keeps strings/comments from firing
    // on THIS path too.
    const text = ctx.codeText ?? ctx.text;
    const re = /\.WaitForTimeoutAsync\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      findings.push({
        severity: "warning",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "FLAKY-RISK",
        file: ctx.path,
        line: lineAt(text, m.index),
        column: colAt(text, m.index),
        message: "`WaitForTimeoutAsync()` hard sleep.",
        why: "Fixed waits encode hope, not synchronization — too short flakes under load, too long slows every run.",
        fix: "Use `await Assertions.Expect(locator).ToBeVisibleAsync()` or `locator.WaitForAsync()` with auto-waiting.",
      });
    }
    return findings;
  },
});
