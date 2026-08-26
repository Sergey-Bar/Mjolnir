/**
 * QA-JV-110 — UI assertion suite with no accessibility assertions.
 * Severity: info · Confidence: low · heuristic-risk
 * Sprint 8 Task 35 (Master-Stabilization-Plan.md). Same meaning and same
 * honesty-conservative severity/confidence/falsePositiveRisk treatment
 * as QA-PW-145 — absence-based rule, deliberately low-severity since a
 * suite may do a11y checks outside test files. Ported to the real,
 * verified Playwright-Java a11y integration
 * (com.deque.html.axe-core:playwright's `new AxeBuilder(page).analyze()`,
 * confirmed against the official README during Sprint 8's research,
 * not assumed from the JS package name).
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const jvNoA11yAssertions = defineRule({
  id: "QA-JV-110",
  category: "QA-PW",
  title: "UI suite without accessibility assertions",
  severity: "info",
  confidence: "low",
  findingType: "heuristic-risk",
  qaImpact: "HYGIENE",
  appliesTo: "java",
  // Trust Metadata
  languages: ["java"],
  frameworks: ["junit", "testng", "playwright"],
  falsePositiveRisk: "high",
  autofix: false,
  detectionStrategy: "absence heuristic over test file",
  introduced: "0.4.0",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".java")) return findings;

    const doesUiInteraction =
      /(?:\.navigate\s*\(|\.click\s*\(|\.fill\s*\()/i.test(ctx.text);
    if (!doesUiInteraction) return findings;

    const hasA11y = /AxeBuilder|\.analyze\s*\(\s*\)|axeResults/i.test(ctx.text);
    if (!hasA11y) {
      findings.push({
        severity: "info",
        confidence: "low",
        findingType: "heuristic-risk",
        qaImpact: "HYGIENE",
        file: ctx.path,
        line: 1,
        column: 1,
        message:
          "UI-interacting test file contains no accessibility assertions.",
        why: "Suites that drive the UI but never assert accessibility let WCAG regressions through every PR; catching them at the point of interaction is far cheaper than a retrofit audit.",
        fix: "Add `com.deque.html.axe-core:playwright` with `new AxeBuilder(page).analyze()` and assert on the result's violations.",
      });
    }
    return findings;
  },
});
