/**
 * QA-PW-143 — No screenshot/video artifact capture on failure.
 * Severity: info · Confidence: high · deterministic-defect
 * Upgrade-Plan-v3 Phase 1 layer 3 (trace/artifact hygiene). Same shape as
 * QA-PW-122 (trace), but for screenshots/video: a CI failure with no
 * visual evidence is uninvestigable after the runner is torn down.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const pwNoFailureArtifacts = defineRule({
  id: "QA-PW-143",
  category: "QA-PW",
  title: "No screenshot/video capture on failure",
  severity: "info",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "HYGIENE",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex heuristic",
  introduced: "0.3.8",

  run(ctx) {
    const text = ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    const base = ctx.path.split("/").pop() ?? "";
    if (!/^playwright\.config\.(ts|js|mjs|cts)$/.test(base)) return findings;

    const hasScreenshot =
      /screenshot\s*:\s*['"](?:on|only-on-failure)['"]/.test(text);
    const hasVideo = /video\s*:\s*['"](?:on|retain-on-failure)['"]/.test(text);
    if (!hasScreenshot && !hasVideo) {
      findings.push({
        severity: "info",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "HYGIENE",
        file: ctx.path,
        line: 1,
        column: 1,
        message:
          "playwright.config captures neither screenshots nor video on failure.",
        why: "Once the CI runner is gone, a failed UI test is just a stack trace. Screenshots/video on failure turn 'cannot reproduce' into a five-second diagnosis.",
        fix: "Add `use: { screenshot: 'only-on-failure', video: 'retain-on-failure' }` to the config.",
      });
    }
    return findings;
  },
});
