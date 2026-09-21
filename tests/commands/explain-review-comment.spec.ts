import { describe, expect, it } from "vitest";
import { explainRule, renderExplain } from "../../src/commands/explain.js";
import type { QADoctorRule } from "../../src/rules/rule.js";
import { RULES } from "../../src/rules/index.js";
import { effectiveTier } from "../../src/rules/measurement.js";
import { MEASURED_FP } from "../../src/rules/measured-fp.generated.js";

const FIXTURES_ROOT = "tests/fixtures";

/** Extracts the COPY-READY REVIEW COMMENT block from a rendered explain. */
function reviewBlock(text: string): string {
  const start = text.indexOf("COPY-READY REVIEW COMMENT");
  const end = text.indexOf("\n\nWHAT WAS FOUND", start);
  if (start < 0) throw new Error("missing review comment block");
  return text.slice(start, end < 0 ? undefined : end);
}

/** Returns the first registered rule matching the predicate, or throws. */
function firstRuleWhere(
  predicate: (rule: QADoctorRule) => boolean,
): QADoctorRule {
  const rule = RULES.find(predicate);
  if (rule === undefined) throw new Error("missing rule fixture for test");
  return rule;
}

/** Renders a rule's explain output at width 100 from the repo fixtures. */
function renderRule(rule: QADoctorRule): string {
  return renderExplain(explainRule(rule.id, FIXTURES_ROOT), 100);
}

describe("explain review-comment language", () => {
  it("renders a copy-ready review comment for a core measured rule", () => {
    const rule = firstRuleWhere(
      (r) => effectiveTier(r) === "core" && MEASURED_FP[r.id] !== undefined,
    );
    expect(reviewBlock(renderRule(rule))).toMatchInlineSnapshot(`
      "COPY-READY REVIEW COMMENT
        Please fix this before merging: Playwright locator assertion is not awaited.
        Why it weakens verification: Without \`await\`, the assertion promise is never resolved — the check
        silently never runs and the test passes vacuously.
        Confidence: high, evidence E2, tier core; measured FP 0% (20 verdicts).
        Suggested fix: Add \`await\`: \`await expect(locator).toBeVisible()\`.
        Verify with: mjolnir --scope changed, then mjolnir explain QA-PW-002 if the finding still appears."
    `);
  });

  it("renders review language for an extended rule without changing machine contracts", () => {
    const rule = firstRuleWhere((r) => effectiveTier(r) === "extended");
    const text = renderRule(rule);
    const block = reviewBlock(text);
    expect(block).toContain("COPY-READY REVIEW COMMENT");
    expect(block).toContain("Why it weakens verification:");
    expect(block).toContain("Verify with: mjolnir --scope changed");
    expect(block).toContain(`mjolnir explain ${rule.id}`);
  });

  it("renders review language for quarantine rules and names the tier", () => {
    const rule = firstRuleWhere((r) => effectiveTier(r) === "quarantine");
    const block = reviewBlock(renderRule(rule));
    expect(block).toContain("tier quarantine");
    expect(block).toContain("Confidence:");
    expect(block).toContain("Suggested fix:");
    // Quarantine findings are advisory (E0, never gate CI) — the
    // copy-ready lead-in must not read as a merge blocker.
    expect(block).toContain("Advisory finding");
    expect(block).not.toContain("Please fix this before merging");
  });

  it("does not fabricate measured-FP text for an unmeasured synthetic rule", () => {
    const rule: QADoctorRule = {
      id: "QA-TEST-999",
      category: "QA-TEST",
      title: "Synthetic unmeasured rule",
      severity: "warning",
      confidence: "medium",
      findingType: "heuristic-risk",
      qaImpact: "HYGIENE",
      appliesTo: "test-files",
      run: () => [],
    };
    const text = renderExplain({
      ok: true,
      rule,
      exampleFinding: {
        severity: "warning",
        confidence: "medium",
        findingType: "heuristic-risk",
        qaImpact: "HYGIENE",
        file: "test.spec.ts",
        line: 1,
        column: 1,
        message: "Synthetic finding.",
        why: "It weakens the signal.",
        fix: "Use a stronger assertion.",
      },
      exampleFixtureRelPath: "QA-TEST-999/must-fire/test.spec.ts",
    });
    const block = reviewBlock(text);
    expect(block).toMatch(/measured FP not\s+available yet/);
    expect(block).not.toMatch(/measured FP \d+%/);
  });

  it("advises rather than blocks for a quarantine rule with an example", () => {
    const rule = firstRuleWhere(
      (r) =>
        effectiveTier(r) === "quarantine" && MEASURED_FP[r.id] === undefined,
    );
    const block = reviewBlock(renderRule(rule));
    expect(block).toContain("Advisory finding");
    expect(block).not.toContain("Please fix this before merging");
  });

  it("states fixture-derived guidance is unavailable when no example finding exists", () => {
    const rule = firstRuleWhere(
      (r) => effectiveTier(r) === "core" && MEASURED_FP[r.id] !== undefined,
    );
    // Render the same rule with no example: the review comment must not
    // claim guidance appears above, and must point at the catalog.
    const text = renderExplain({ ok: true, rule });
    const block = reviewBlock(text);
    expect(block).toContain("COPY-READY REVIEW COMMENT");
    expect(block).toContain("fixture-derived guidance is unavailable");
    expect(block).toContain("mjolnir rules --md");
    expect(block).not.toContain("apply the rule guidance above");
  });
});
