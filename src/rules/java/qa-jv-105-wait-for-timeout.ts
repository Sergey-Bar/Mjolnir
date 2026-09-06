/**
 * QA-JV-105 — waitForTimeout / hardcoded navigation waits.
 * Severity: warning · Confidence: high · deterministic-defect
 * Playwright-Java's page.waitForTimeout is a hard sleep.
 *
 * Lane A migration dossier (blueprint §10, hard-sleep JV/CS family —
 * the plan's suggested first family):
 * 1. BASELINE (rev 1, LEXICAL): regex over codeText; FP 0.10 (n=20).
 * 2. IMPLEMENTATION (rev 2, QA_MODEL): a finding requires a real
 *    method_invocation node with callee `waitForTimeout` — string/
 *    comment/declaration containment structurally cannot fire.
 * 3. RE-MEASUREMENT: sidecar regenerated at rev 2 in this change.
 * 4. FN check: parity tests over committed must-fire fixtures prove
 *    finding-identical results; must-not-fire fixtures pin precision.
 * 5. PERFORMANCE: model extraction walks the existing parse tree —
 *    no additional parse.
 * 6. ADR: QA-model adopted (grammar precision > lexical simplicity;
 *    the tree is already available at rule time). Legacy lexical
 *    fallback retained ONLY for AST-less contexts (parse declined /
 *    unit tests).
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";
import { getTreeSitterTree } from "../../engine/jv-cs-ast.js";
import { extractQaModel, type QaSemanticModel } from "../../engine/qa-model.js";

export const jvWaitForTimeout = defineRule({
  id: "QA-JV-105",
  tier: "core",
  category: "QA-PW",
  title: "waitForTimeout hard sleep",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FLAKY-RISK",
  appliesTo: "java",
  // Trust Metadata
  languages: ["java"],
  frameworks: ["junit", "testng", "playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  // Lane A: QA-model substrate (was LEXICAL) — see the dossier above.
  detectionStrategy: "QA_MODEL",
  introduced: "0.3.8",
  // Lane A migration: grammar-precision re-expression bumps the
  // detector revision in the same PR (§10 dossier requirement).
  detectorRevision: 2,

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".java")) return findings;

    // QA-model path (the pipeline provides the parsed tree at rule
    // time — the §10 substrate shape: adapter → optional model → rule).
    // extractQaModel cannot return undefined here: the path is .java
    // (guarded above) and the tree passed getTreeSitterTree's narrowing,
    // which is exactly extractJavaModel's own entry condition.
    const tree = getTreeSitterTree(ctx.ast);
    if (tree) {
      const model = extractQaModel({
        path: ctx.path,
        text: ctx.text,
        ast: tree,
      }) as QaSemanticModel;
      // Detection surface IDENTICAL to rev 1's measured vocabulary:
      // callee `waitForTimeout` only (Thread.sleep is QA-JV-102's).
      for (const node of model.nodes) {
        if (node.concept === "wait" && node.callee === "waitForTimeout") {
          findings.push({
            severity: "warning",
            confidence: "high",
            findingType: "deterministic-defect",
            qaImpact: "FLAKY-RISK",
            file: ctx.path,
            line: node.start.line,
            column: node.start.column,
            message: "`waitForTimeout()` hard sleep.",
            why: "Fixed waits encode hope, not synchronization — too short flakes under load, too long slows every run.",
            fix: "Use `page.locator(...).waitFor()` or `assertThat(locator).isVisible()` with auto-waiting.",
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
    const re = /\.waitForTimeout\s*\(/g;
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
        message: "`waitForTimeout()` hard sleep.",
        why: "Fixed waits encode hope, not synchronization — too short flakes under load, too long slows every run.",
        fix: "Use `page.locator(...).waitFor()` or `assertThat(locator).isVisible()` with auto-waiting.",
      });
    }
    return findings;
  },
});
