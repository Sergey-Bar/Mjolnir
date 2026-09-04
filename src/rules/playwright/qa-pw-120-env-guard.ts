/**
 * QA-PW-120 — Missing test.skip conditions for known-flaky environments.
 * Severity: info · Confidence: low · heuristic-risk
 * Tests exercising engine-specific behavior (WebGL, video codecs,
 * platform paths) without an environment guard fail on unmatching CI
 * runners and train the team to ignore red.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const pwNoEnvGuard = defineRule({
  id: "QA-PW-120",
  category: "QA-PW",
  title: "Engine-specific test without environment guard",
  severity: "info",
  confidence: "low",
  findingType: "heuristic-risk",
  qaImpact: "FLAKY-RISK",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "high",
  autofix: false,
  detectionStrategy: "LEXICAL",
  detectionNotes: "regex heuristic",
  introduced: "0.3.0",
  // RETIRED (docs/RULE-LIFECYCLE.md — Phase 2 quarantine-cluster triage):
  // measured 100% FP (n=20, docs/FP-AUDIT.md) with zero TPs — the rule's
  // premise is wrong on real code, not its tuning. Severity downgraded to
  // info (non-blocking everywhere); code + fixtures stay, the frozen ID
  // is never reused. Successor ideas ship under NEW rule IDs (lifecycle §2).
  tier: "quarantine",

  run(ctx) {
    const text = ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!/\.(?:spec|test)\.[tj]sx?$/.test(ctx.path)) return findings;

    // Engine/platform-specific APIs used anywhere in the file.
    const usesEngineSpecific =
      /webgl|getContext\s*\(\s*['"]webgl|video|codecs|webkit|firefox/i.test(
        text,
      );
    if (!usesEngineSpecific) return findings;

    // Guard present? test.skip(...), skip({ browsers }), fixme, or a
    // browserName conditional.
    const hasGuard =
      /test\.skip\(|\.fixme\(|skip\s*\(\s*\{\s*browsers|browserName|browser:\s*['"]/i.test(
        text,
      );
    if (!hasGuard) {
      findings.push({
        severity: "info",
        confidence: "low",
        findingType: "heuristic-risk",
        qaImpact: "FLAKY-RISK",
        file: ctx.path,
        line: 1,
        column: 1,
        message:
          "Engine/platform-specific test with no test.skip / browser guard.",
        why: "Behavior tied to one browser engine or OS fails on every other runner in the matrix — chronic red builds teach the team to ignore failures.",
        fix: "Guard with `test.skip(browserName !== 'chromium', '...')` or scope via project config.",
      });
    }
    return findings;
  },
});
