/**
 * QA-PW-118 — waitForLoadState('networkidle') — flaky by design.
 * Severity: warning · Confidence: high · deterministic-defect
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const networkIdleWait = defineRule({
  id: "QA-PW-118",
  category: "QA-PW",
  title: "Network idle wait (flaky by design)",
  severity: "info",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FLAKY-RISK",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "high",
  autofix: false,
  detectionStrategy: "LEXICAL",
  introduced: "0.3.0",
  // Measured FP 100% (n=20, docs/FP-AUDIT.md 2026-08-31): real-world
  // networkidle waits are deliberate preload/settle synchronization in
  // controlled fixture apps with no background traffic - the cited flake
  // source (analytics/websockets) never materializes. North-star law.
  // RETIRED (docs/RULE-LIFECYCLE.md — Phase 2 quarantine-cluster triage):
  // measured 100% FP (n=20, docs/FP-AUDIT.md) with zero TPs — the rule's
  // premise is wrong on real code, not its tuning. Severity downgraded to
  // info (non-blocking everywhere); code + fixtures stay, the frozen ID
  // is never reused. Successor ideas ship under NEW rule IDs (lifecycle §2).
  tier: "quarantine",

  run(ctx) {
    const text = ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    const re = /waitForLoadState\s*\(\s*['"`]networkidle['"`]\s*\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      findings.push({
        severity: "info",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "FLAKY-RISK",
        file: ctx.path,
        line: lineAt(text, m.index),
        column: colAt(text, m.index),
        message: "`waitForLoadState('networkidle')` used.",
        why: "Network idle is unreliable — background requests, analytics, and websockets make it never fire or fire randomly.",
        fix: "Wait for a specific element or response: `page.waitForResponse()` or `expect(locator).toBeVisible()`.",
      });
    }
    return findings;
  },
});
