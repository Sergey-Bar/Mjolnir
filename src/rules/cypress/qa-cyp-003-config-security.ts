/**
 * QA-CYP-003 — Cypress config disables `chromeWebSecurity`.
 * Severity: error · Confidence: high · deterministic-defect
 *
 * `chromeWebSecurity: false` (cypress.config.*) disables the browser's
 * same-origin policy for every test in the run: the suite gains access
 * to cross-origin frames/cookies by weakening the security model of the
 * browser under test. A deterministic config defect — the config is the
 * artifact, there is no heuristic.
 *
 * Plan §15.2: this is the FIRST rule gated by the generalized
 * `configFiles` declaration — `configRule: true` +
 * `configFiles: ["^cypress\\.config\\.(?:js|ts|mjs)$"]` replaces the
 * hard-coded playwright.config.* regex that used to live in the TS
 * adapter and duplicated inside every config rule.
 *
 * Trust Metadata: BORN QUARANTINE (plan §15.5) — Phase-5 rules ship
 * provisional until measured.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

const CYPRESS_CONFIG_RE = /^cypress\.config\.(?:js|ts|mjs)$/;
const CHROME_WEB_SECURITY_FALSE_RE = /chromeWebSecurity\s*:\s*false/;

const WHY =
  "With chromeWebSecurity disabled the browser under test runs without its same-origin policy — cross-origin content is silently accessible and the security boundary the tests should exercise is gone.";
const FIX =
  "Keep chromeWebSecurity enabled (the default); scope the cross-origin work to cy.origin()/cy.session() instead.";

export const cypConfigSecurity = defineRule({
  id: "QA-CYP-003",
  category: "QA-PW",
  title: "Cypress config disables chromeWebSecurity",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "test-files",
  configRule: true,
  configFiles: ["^cypress\\.config\\.(?:js|ts|mjs)$"],
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["cypress"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "LEXICAL",
  detectionNotes:
    "positive match on chromeWebSecurity:false inside cypress.config.* (the config is the artifact — no heuristic)",
  introduced: "0.6.0",
  tier: "quarantine",
  detectorRevision: 1,

  run(ctx) {
    // Belt-and-suspenders for direct harness invocation; the TS adapter
    // enforces the same gate through the declared configFiles.
    const base = ctx.path.replace(/\\/g, "/").split("/").pop() ?? "";
    if (!CYPRESS_CONFIG_RE.test(base)) return [];
    const text = ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    const re = new RegExp(CHROME_WEB_SECURITY_FALSE_RE.source, "g");
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
        message:
          "`chromeWebSecurity: false` disables the browser's same-origin policy for every test.",
        why: WHY,
        fix: FIX,
      });
    }
    return findings;
  },
});
