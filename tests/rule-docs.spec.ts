/**
 * Rule documentation generator (Master-Stabilization-Plan Sprint 7,
 * Task 27).
 *
 * The plan's own bar: the generator covers 100% of registered rules —
 * CI fails if any rule lacks a page — and every example on a page comes
 * from a real fixture, not hand-written prose that could drift from
 * actual behavior.
 */

import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  collectRuleDocData,
  generateAllRuleDocs,
  renderRuleDocMd,
  renderRuleDocsIndexMd,
  type CorpusBaseline,
} from "../src/commands/rule-docs.js";
import {
  getAntiPatternContent,
  hasAntiPatternContent,
} from "../src/commands/anti-pattern-catalog.js";
import { RULES } from "../src/rules/index.js";

const FIXTURES_ROOT = join(import.meta.dirname, "fixtures");

describe("generateAllRuleDocs — 100% of registered rules", () => {
  const pages = generateAllRuleDocs(FIXTURES_ROOT);

  it("produces exactly one page per registered rule — none missing, none extra", () => {
    expect(pages.size).toBe(RULES.length);
    for (const rule of RULES) {
      expect(pages.has(rule.id), `missing generated page for ${rule.id}`).toBe(
        true,
      );
    }
  });

  it.each(RULES.map((r) => r.id))(
    "%s's page contains a real example traceable to its own must-fire fixture, not hand-written prose",
    (id) => {
      const rule = RULES.find((r) => r.id === id);
      if (!rule) throw new Error(`unreachable — ${id} came from RULES itself`);
      const data = collectRuleDocData(rule, FIXTURES_ROOT);
      expect(
        data.mustFire.finding,
        `${id} produced no example — either its must-fire fixture is ` +
          `missing/empty, or the rule doesn't fire on its own fixture ` +
          `(a fixture-firewall violation, same class explain.spec.ts checks)`,
      ).toBeDefined();
      expect(data.mustFire.fixturePath).toContain(id);
      if (!data.mustFire.finding) throw new Error("checked above");

      const md = renderRuleDocMd(data);
      // The message and fix shown must be the literal strings the rule
      // itself produced — not a paraphrase written by hand.
      expect(md).toContain(data.mustFire.finding.message);
      expect(md).toContain(data.mustFire.finding.fix);
      // "Why this fails in production" shows the rule's own `why` UNLESS
      // Task 30's anti-pattern catalog has a richer, still fully-real
      // explanation for this specific rule (never both — the catalog
      // entry supersedes, it doesn't duplicate) — verified separately
      // and in depth by tests/anti-pattern-catalog.spec.ts.
      const richContent = getAntiPatternContent(id);
      if (richContent) {
        expect(md).toContain(richContent);
      } else {
        expect(md).toContain(data.mustFire.finding.why);
      }
    },
  );

  it.each(RULES.map((r) => r.id))(
    "%s's page confirms its must-not-fire fixture correctly does not fire",
    (id) => {
      const rule = RULES.find((r) => r.id === id);
      if (!rule) throw new Error(`unreachable — ${id} came from RULES itself`);
      const data = collectRuleDocData(rule, FIXTURES_ROOT);
      expect(
        data.mustNotFire.fixturePath,
        `${id} has no must-not-fire fixture on disk`,
      ).toBeDefined();
      expect(
        data.mustNotFire.fired,
        `${id}'s must-not-fire fixture actually fires — a real fixture-` +
          `firewall violation the doc page surfaces rather than hiding`,
      ).toBe(false);
    },
  );
});

describe("collectRuleDocData — honest degradation", () => {
  it("returns no mustFire.finding, not a fabricated one, for an unknown fixtures root", () => {
    const rule = RULES[0];
    if (!rule) throw new Error("expected at least one registered rule");
    const data = collectRuleDocData(
      rule,
      join(FIXTURES_ROOT, "does-not-exist"),
    );
    expect(data.mustFire.finding).toBeUndefined();
    expect(data.mustFire.fixturePath).toBeUndefined();
  });

  it("attaches real corpus occurrence counts only for rules present in a baseline", () => {
    const rule = RULES.find((r) => r.id === "QA-TEST-004");
    if (!rule) throw new Error("expected QA-TEST-004 to be registered");
    const baselines: CorpusBaseline[] = [
      {
        name: "some-repo",
        countsByRule: { "QA-TEST-004": 14, "QA-PW-101": 3 },
      },
      { name: "other-repo", countsByRule: { "QA-PY-003": 5 } },
    ];
    const data = collectRuleDocData(rule, FIXTURES_ROOT, baselines);
    expect(data.corpusOccurrences).toEqual({ "some-repo": 14 });
  });

  it("reports zero corpus occurrences (not an error) when no baseline mentions this rule", () => {
    const rule = RULES[0];
    if (!rule) throw new Error("expected at least one registered rule");
    const data = collectRuleDocData(rule, FIXTURES_ROOT, [
      { name: "some-repo", countsByRule: { "QA-DOES-NOT-EXIST": 1 } },
    ]);
    expect(data.corpusOccurrences).toEqual({});
  });

  it("degrades honestly (no example, no crash) when a rule's own run() throws against its fixture", () => {
    const rule = RULES[0];
    if (!rule) throw new Error("expected at least one registered rule");
    const throwingRule = {
      ...rule,
      run: () => {
        throw new Error("boom");
      },
    };
    expect(() => collectRuleDocData(throwingRule, FIXTURES_ROOT)).not.toThrow();
    const data = collectRuleDocData(throwingRule, FIXTURES_ROOT);
    expect(data.mustFire.finding).toBeUndefined();
  });
});

describe("renderRuleDocMd — content contract", () => {
  it("renders UNKNOWN, not a fabricated zero, when no corpus data exists for a rule", () => {
    const rule = RULES[0];
    if (!rule) throw new Error("expected at least one registered rule");
    const data = collectRuleDocData(rule, FIXTURES_ROOT, []);
    const md = renderRuleDocMd(data);
    expect(md).toContain("UNKNOWN");
  });

  it("renders a real corpus occurrence table when baseline data exists", () => {
    const rule = RULES.find((r) => r.id === "QA-TEST-004");
    if (!rule) throw new Error("expected QA-TEST-004 to be registered");
    const data = collectRuleDocData(rule, FIXTURES_ROOT, [
      { name: "pytest-dev-pytest", countsByRule: { "QA-TEST-004": 14 } },
    ]);
    const md = renderRuleDocMd(data);
    expect(md).toContain("pytest-dev-pytest");
    expect(md).toContain("14");
  });

  it("flags, rather than silently hides, a must-not-fire fixture that actually fires", () => {
    const rule = RULES[0];
    if (!rule) throw new Error("expected at least one registered rule");
    const data = {
      rule,
      mustFire: {},
      mustNotFire: {
        fixturePath: "tests/fixtures/FAKE/must-not-fire/x.ts",
        fired: true,
      },
      corpusOccurrences: {},
    };
    const md = renderRuleDocMd(data);
    expect(md).toContain("real fixture-firewall violation");
  });

  it("renders the no-example fallback text when a rule has neither a must-fire finding nor rich anti-pattern content", () => {
    const rule = RULES.find((r) => !hasAntiPatternContent(r.id));
    if (!rule)
      throw new Error("expected at least one rule without catalog content");
    const data = {
      rule,
      mustFire: {},
      mustNotFire: { fired: false },
      corpusOccurrences: {},
    };
    const md = renderRuleDocMd(data);
    expect(md).toContain("No example available");
  });

  it("renders a sorted multi-repo occurrence table", () => {
    const rule = RULES.find((r) => r.id === "QA-TEST-004");
    if (!rule) throw new Error("expected QA-TEST-004 to be registered");
    const data = collectRuleDocData(rule, FIXTURES_ROOT, [
      { name: "zzz-repo", countsByRule: { "QA-TEST-004": 1 } },
      { name: "aaa-repo", countsByRule: { "QA-TEST-004": 2 } },
    ]);
    const md = renderRuleDocMd(data);
    const aaaIdx = md.indexOf("aaa-repo");
    const zzzIdx = md.indexOf("zzz-repo");
    expect(aaaIdx).toBeGreaterThan(-1);
    expect(zzzIdx).toBeGreaterThan(aaaIdx);
  });

  it("renders the 'no must-not-fire fixture on disk' fallback when none is provided", () => {
    const rule = RULES[0];
    if (!rule) throw new Error("expected at least one registered rule");
    const data = {
      rule,
      mustFire: {},
      mustNotFire: { fired: false },
      corpusOccurrences: {},
    };
    const md = renderRuleDocMd(data);
    expect(md).toContain("No must-not-fire fixture on disk");
  });

  it("includes a link back to the live explain command and the full catalog", () => {
    const rule = RULES[0];
    if (!rule) throw new Error("expected at least one registered rule");
    const data = collectRuleDocData(rule, FIXTURES_ROOT);
    const md = renderRuleDocMd(data);
    expect(md).toContain(`mjolnir explain ${rule.id}`);
    expect(md).toContain("mjolnir rules --md");
  });
});

describe("renderRuleDocsIndexMd", () => {
  it("links every registered rule, sorted by ID", () => {
    const md = renderRuleDocsIndexMd(RULES);
    for (const rule of RULES) {
      expect(md).toContain(`[${rule.id}](./${rule.id}.md)`);
    }
    const ids = [...md.matchAll(/\[(QA-[A-Z]+-\d+)\]/g)].map((m) => m[1]);
    const sorted = [...ids].sort((a, b) => (a ?? "").localeCompare(b ?? ""));
    expect(ids).toEqual(sorted);
  });

  it("escapes a pipe character in a title so it can't break the table (QA-CI-002's real title contains '||')", () => {
    const ci002 = RULES.find((r) => r.id === "QA-CI-002");
    expect(ci002?.title.includes("|")).toBe(true);
    const md = renderRuleDocsIndexMd(RULES);
    const line = md.split("\n").find((l) => l.includes("QA-CI-002"));
    expect(line).toContain("\\|\\|");
  });
});
