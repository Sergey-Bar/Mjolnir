/**
 * QA-CS-110 — UI assertion suite with no accessibility assertions.
 * Severity: info · Confidence: low · heuristic-risk
 * Sprint 8 Task 35 (Master-Stabilization-Plan.md). Same meaning and same
 * honesty-conservative treatment as QA-PW-145/QA-JV-110. Ported to the
 * real, verified Playwright-.NET a11y integration
 * (Deque.AxeCore.Playwright NuGet package's `page.RunAxe()` extension
 * method, confirmed against the official README during Sprint 8's
 * research, not assumed from the JS package name).
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const csNoA11yAssertions = defineRule({
  id: "QA-CS-110",
  category: "QA-PW",
  title: "UI suite without accessibility assertions",
  severity: "info",
  confidence: "low",
  findingType: "heuristic-risk",
  qaImpact: "HYGIENE",
  appliesTo: "csharp",
  // Trust Metadata
  languages: ["csharp"],
  frameworks: ["nunit", "xunit", "mstest", "playwright"],
  falsePositiveRisk: "high",
  autofix: false,
  detectionStrategy: "absence heuristic over test file",
  introduced: "0.4.0",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".cs")) return findings;

    const doesUiInteraction =
      /(?:\.GotoAsync\s*\(|\.ClickAsync\s*\(|\.FillAsync\s*\()/i.test(ctx.text);
    if (!doesUiInteraction) return findings;

    const hasA11y = /\.RunAxe\s*\(|AxeResult/i.test(ctx.text);
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
        fix: "Add the `Deque.AxeCore.Playwright` NuGet package with `await page.RunAxe()` and assert on the result's violations.",
      });
    }
    return findings;
  },
});
