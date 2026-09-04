/**
 * QA-CYP-002 — Focused test (`.only`).
 * Severity: error · Confidence: high · deterministic-defect
 *
 * `it.only`/`describe.only`/`context.only` silently de-schedules every
 * other test in the suite; committed focus filters shrink the executed
 * suite to whatever was being debugged (the Cypress counterpart of
 * QA-TEST-001's `fit`/`fdescribe` and QA-PW-003's `test.only`).
 *
 * Trust Metadata: BORN QUARANTINE (plan §15.5) — Phase-5 rules ship
 * provisional until measured.
 *
 * Framework dimension (§15.1): `frameworks: ["cypress"]` — enforced by
 * the TS adapter's per-file tags; untagged files stay analyzed.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { isCypressFile } from "./qa-cyp-001-cy-wait.js";
import { lineAt, colAt } from "../shared/positions.js";

/** it.only / describe.only / context.only (Cypress test interface). */
const FOCUS_RE = /\b(?:it|describe|context|spec)\.only\s*\(/g;

const WHY =
  "A committed .only filter de-schedules every other test in the suite — CI runs a fraction of it while the report claims full coverage.";
const FIX =
  "Remove `.only` before committing; focus locally, never in the shared suite.";

export const cypFocusedTest = defineRule({
  id: "QA-CYP-002",
  category: "QA-PW",
  title: "Focused test (.only)",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["cypress"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "LEXICAL",
  detectionNotes:
    "it/describe/context .only member-call shape on the code-only text view",
  introduced: "0.6.0",
  tier: "quarantine",
  detectorRevision: 1,

  run(ctx) {
    if (!isCypressFile(ctx)) return [];
    // codeText is optional in the rule contract — when the engine has
    // not computed it, the raw text is the honest view.
    const text = ctx.codeText !== undefined ? ctx.codeText : ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    const re = new RegExp(FOCUS_RE.source, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      findings.push({
        severity: "error",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "FALSE-GREEN",
        file: ctx.path,
        line: lineAt(text, m.index),
        column: colAt(text, m.index),
        message: `\`${m[0].replace(/\s*\($/, "")}\` focuses a single test — everything else is de-scheduled.`,
        why: WHY,
        fix: FIX,
      });
    }
    return findings;
  },
});
