/**
 * QA-PW-145 — UI assertion suite with no accessibility assertions.
 * Severity: info · Confidence: low · heuristic-risk
 * Upgrade-Plan-v3 Phase 1 layer 5 (accessibility coverage). Absence-based
 * rule — deliberately low-severity/low-confidence and declared
 * falsePositiveRisk: high per RuleMeta honesty contract: a suite may do
 * a11y checks outside spec files (CI job, separate tooling).
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const pwNoA11yAssertions = defineRule({
  id: "QA-PW-145",
  category: "QA-PW",
  title: "UI suite without accessibility assertions",
  severity: "info",
  confidence: "low",
  findingType: "heuristic-risk",
  qaImpact: "HYGIENE",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "high",
  autofix: false,
  detectionStrategy: "absence heuristic over suite directory",
  introduced: "0.3.8",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!/\.(spec|test)\.[tj]sx?$/.test(ctx.path)) return findings;

    // Only meaningful for suites doing real UI interaction.
    const doesUiInteraction = /(?:page\.goto|page\.click|\.fill\()/i.test(
      ctx.text,
    );
    if (!doesUiInteraction) return findings;

    // Any a11y signal anywhere in the file counts as covered.
    const hasA11y =
      /toHaveNoViolations|@axe-core\/playwright|axe\s*\(|ariaSnapshot|toMatchAriaSnapshot/i.test(
        ctx.text,
      );
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
          "UI-interacting spec file contains no accessibility assertions.",
        why: "Suites that drive the UI but never assert accessibility let WCAG regressions through every PR; catching them at the point of interaction is far cheaper than a retrofit audit.",
        fix: "Add `@axe-core/playwright` with `expect(await new AxeBuilder({ page }).analyze()).toHaveNoViolations()` on key pages, or snapshot aria snapshots.",
      });
    }
    return findings;
  },
});
