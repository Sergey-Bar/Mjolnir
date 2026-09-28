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
  it("renders a copy-ready review comment that names the rule's tier and evidence", () => {
    // Was "for a core measured rule". 6.0 demoted the nineteen rules whose
    // declared core their measurement did not support, and that left the
    // registry with ZERO core rules — so the fixture this asked for no longer
    // existed, and the test failed with "missing rule fixture for test".
    //
    // The test is about the RENDERING, not about which tier a rule is in, so
    // it now takes any measured rule. Asking for `core` also made it
    // redundant with the tier ratchet, which is where "which rules are core"
    // is actually decided.
    const rule = firstRuleWhere((r) => MEASURED_FP[r.id] !== undefined);
    // The snapshot names the tier, so it changes with the registry. The
    // assertion that matters is that the line EXISTS and carries the
    // measurement's provenance — that the reader can see both the tier and
    // the n behind it.
    const block = reviewBlock(renderRule(rule));
    expect(block).toContain("COPY-READY REVIEW COMMENT");
    expect(block).toMatch(/Confidence: \w+, evidence E\d, tier \w+/);
    expect(block).toMatch(/measured FP \d+(?:\.\d+)?% \(\d+ verdicts\)/);
    expect(block).toContain(`Verify with: mjolnir --scope changed`);
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
    // Was `effectiveTier(r) === "core" && MEASURED_FP[r.id] !== undefined`.
    // The registry has no core rules since the 6.0 demotion, so this asked
    // for a fixture that no longer exists. The tier is irrelevant to what this
    // asserts — it is about what the block says when there is no example
    // finding — so it takes any measured rule.
    const rule = firstRuleWhere((r) => MEASURED_FP[r.id] !== undefined);
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
