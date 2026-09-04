/**
 * QA-CYP-001 — Fixed `cy.wait(n)` (hard-coded wait).
 * Severity: warning · Confidence: high · deterministic-defect
 *
 * Cypress's own documented anti-pattern: `cy.wait(<number>)` pauses the
 * test for a fixed duration regardless of the condition it hoped for —
 * the Cypress counterpart of the Playwright hard-sleep family. Alias
 * waits (`cy.wait("@graphql")`) wait for a ROUTED REQUEST and are the
 * legitimate form — the oracle requires a numeric literal argument.
 *
 * Trust Metadata: BORN QUARANTINE (plan §15.5) — every Phase-5 rule
 * ships provisional until measured; promotion follows the §23 tiered
 * DoD (fixture corpora first, then a measured Cypress corpus).
 *
 * Framework dimension (§15.1): `frameworks: ["cypress"]` is enforced —
 * the TS adapter tags files importing `cypress` (or via the
 * `/// <reference types="cypress" />` shim) and this rule runs only on
 * those files; untagged files stay analyzed (open-when-unknown).
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

/** Numeric-literal cy.wait — NOT the alias form (cy.wait("@alias")). */
const CY_WAIT_NUMBER_RE = /\bcy\.wait\s*\(\s*(\d+)\s*\)/g;

const WHY =
  "A fixed cy.wait(n) pauses for the full duration no matter what — it is either too short (flaky) or too long (slow), and it cannot adapt to the app.";
const FIX =
  "Wait on the real condition: `cy.wait('@alias')` for a routed request, `cy.intercept` + assertions on the response, or `cy.contains(...).should(...)` retry semantics.";

export const cypCyWait = defineRule({
  id: "QA-CYP-001",
  category: "QA-PW",
  title: "Fixed cy.wait(n) hard-coded wait",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FLAKY-RISK",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["cypress"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "LEXICAL",
  detectionNotes:
    "cy.wait with a numeric-literal argument only — alias waits (cy.wait('@…')) are the legitimate routed-request form and never fire",
  introduced: "0.6.0",
  // Born quarantine (§15.5) — the initial Cypress measurement
  // (cypress-io-kitchensink, n=15, 20% FP: 12 TP viewport-switch waits,
  // 3 FP doc-example artifacts) moves it into the measured-extended
  // band per the §20 tier ceilings. Promotion history in CHANGELOG.
  tier: "extended",
  detectorRevision: 1,

  run(ctx) {
    if (!isCypressFile(ctx)) return [];
    // codeText is optional in the rule contract — when the engine has
    // not computed it, the raw text is the honest view.
    const text = ctx.codeText !== undefined ? ctx.codeText : ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    // eslint-disable-next-line security/detect-non-literal-regexp -- clone of a compile-time literal's .source for flag control — not scan input
    const re = new RegExp(CY_WAIT_NUMBER_RE.source, "g");
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
        message: `\`cy.wait(${m[1]})\` — fixed hard-coded wait.`,
        why: WHY,
        fix: FIX,
      });
    }
    return findings;
  },
});

/**
 * Cypress-file gate (plan §15.1): a file is Cypress when the framework
 * dimension tagged it (cypress import), the path follows the .cy.*
 * convention, or the file uses the `cy.*` API (the Cypress global —
 * most real suites never import cypress; the first measurement
 * surfaced this against cypress-realworld-app's *.spec.ts layout).
 */
export function isCypressFile(ctx: {
  path: string;
  text: string;
  codeText?: string;
  frameworkTags?: readonly string[];
}): boolean {
  if (ctx.frameworkTags?.includes("cypress")) return true;
  if (/\.cy\.[jt]sx?$/.test(ctx.path)) return true;
  return /\bcy\s*\./.test(ctx.codeText ?? ctx.text);
}
