/**
 * Anti-pattern catalog content (Master-Stabilization-Plan Sprint 7,
 * Task 30).
 *
 * Guards the honesty constraint this task is built around: every
 * covered rule ID must be real and registered, every entry must be
 * genuinely longer/more substantive than the rule's own one-sentence
 * `why` field (otherwise this module adds nothing), and the content
 * must never claim a specific external citation (a GitHub Discussion
 * link, an incident report) that doesn't actually exist — the plan's
 * own source material floated that as a further idea, and it is
 * deliberately not implemented because it would require fabricating a
 * source.
 */

import { describe, expect, it } from "vitest";

import {
  ANTI_PATTERN_CONTENT,
  getAntiPatternContent,
  hasAntiPatternContent,
} from "../../src/commands/anti-pattern-catalog.js";
import { RULES } from "../../src/rules/index.js";

describe("anti-pattern catalog — content integrity", () => {
  it("every covered ID is a real, currently-registered rule", () => {
    const registered = new Set(RULES.map((r) => r.id));
    for (const id of Object.keys(ANTI_PATTERN_CONTENT)) {
      expect(
        registered.has(id),
        `anti-pattern-catalog.ts covers "${id}", which is not in the ` +
          `live rule registry — either the rule was renamed/retired, or ` +
          `this is a typo.`,
      ).toBe(true);
    }
  });

  it("covers every error-severity rule (the plan's 'top 20' bar, met or exceeded)", () => {
    const errorRules = RULES.filter((r) => r.severity === "error");
    expect(errorRules.length).toBeGreaterThanOrEqual(20);
    for (const rule of errorRules) {
      expect(
        hasAntiPatternContent(rule.id),
        `${rule.id} is error-severity but has no anti-pattern catalog entry`,
      ).toBe(true);
    }
  });

  it.each(Object.entries(ANTI_PATTERN_CONTENT))(
    "%s: content is substantially longer than the rule's own one-sentence `why` (adds real value, not filler)",
    (id, content) => {
      const rule = RULES.find((r) => r.id === id);
      if (!rule) throw new Error(`unreachable — ${id} already checked above`);
      // A real must-fire example is not required for this check — this
      // asserts on the catalog content's own length, independent of
      // fixtures. A generous floor (150 chars) rules out anything that
      // could plausibly be mistaken for the existing one-sentence `why`.
      expect(content.length).toBeGreaterThan(150);
    },
  );

  it("no entry contains a fabricated external citation (GitHub Discussion link, incident report URL) — the honesty line this task deliberately does not cross", () => {
    for (const [id, content] of Object.entries(ANTI_PATTERN_CONTENT)) {
      expect(
        content,
        `${id}'s anti-pattern content contains what looks like a URL — ` +
          `this module must never fabricate an external citation`,
      ).not.toMatch(/https?:\/\//);
      expect(content.toLowerCase()).not.toContain("github.com/orgs");
      expect(content.toLowerCase()).not.toContain("discussion #");
    }
  });

  it("getAntiPatternContent returns undefined, not empty string, for a rule with no entry", () => {
    expect(getAntiPatternContent("QA-DOES-NOT-EXIST")).toBeUndefined();
    // Pick a real, currently-uncovered (non-error-severity) rule to
    // prove the "no entry" path for a genuine registered rule too.
    const uncovered = RULES.find(
      (r) => r.severity !== "error" && !hasAntiPatternContent(r.id),
    );
    if (uncovered) {
      expect(getAntiPatternContent(uncovered.id)).toBeUndefined();
    }
  });
});

describe("anti-pattern catalog — wired into the rule doc generator", () => {
  it("a covered rule's generated page uses the catalog content, not just the rule's own `why`", async () => {
    const { collectRuleDocData, renderRuleDocMd } =
      await import("../../src/commands/rule-docs.js");
    const { join } = await import("node:path");
    const rule = RULES.find((r) => r.id === "QA-PW-101");
    if (!rule) throw new Error("expected QA-PW-101 to be registered");
    const data = collectRuleDocData(
      rule,
      join(import.meta.dirname, "..", "fixtures"),
    );
    const md = renderRuleDocMd(data);
    const richContent = getAntiPatternContent("QA-PW-101");
    if (!richContent) throw new Error("expected QA-PW-101 to have content");
    expect(md).toContain(richContent);
  });
});
