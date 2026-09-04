/**
 * `mjolnir rules` catalog — registry-derived docs can never drift.
 */

import { describe, expect, it } from "vitest";

import {
  buildCatalog,
  renderCatalogMd,
} from "../../src/commands/rules-catalog.js";
import { RULES } from "../../src/rules/index.js";
import { runRulesCommand } from "../../src/cli.js";

describe("rules catalog", () => {
  it("covers every registered rule", () => {
    expect(buildCatalog()).toHaveLength(RULES.length);
  });

  it("includes trust metadata fields", () => {
    const entry = buildCatalog().find((e) => e.id === "QA-TEST-004");
    expect(entry?.languages).toContain("typescript");
    expect(entry?.falsePositiveRisk).toBe("low");
    expect(entry?.introduced).toBe("0.1.0");
  });

  it("renders a markdown table with a row per rule", () => {
    const md = renderCatalogMd(buildCatalog());
    expect(md).toContain("| ID | Title |");
    for (const rule of RULES) expect(md).toContain(rule.id);
  });

  it("omits optional Trust Metadata fields entirely when a rule doesn't declare them", () => {
    const minimal = {
      id: "QA-MIN-001",
      category: "QA-TEST" as const,
      title: "Minimal rule",
      severity: "info" as const,
      confidence: "low" as const,
      findingType: "observation" as const,
      qaImpact: "HYGIENE" as const,
      appliesTo: "test-files" as const,
      run: () => [],
      // languages/frameworks/falsePositiveRisk/autofix/detectionStrategy/
      // introduced all deliberately absent.
    };
    const entries = buildCatalog([minimal]);
    expect(entries).toHaveLength(1);
    const entry = entries[0];
    if (!entry) throw new Error("expected exactly one catalog entry");
    expect(entry.languages).toBeUndefined();
    expect(entry.frameworks).toBeUndefined();
    expect(entry.falsePositiveRisk).toBeUndefined();
    expect(entry.autofix).toBeUndefined();
    expect(entry.detectionStrategy).toBeUndefined();
    expect(entry.introduced).toBeUndefined();
    // QA-MIN-001 has no corpus verdicts, so no measured FP rate.
    expect(entry.measuredFpRate).toBeUndefined();
    expect(entry.measuredFpN).toBeUndefined();

    const md = renderCatalogMd(entries);
    // Tier resolves measurement-dependently (plan §11.2 Step 2): the
    // synthetic rule has no measurement and no declared tier, so it is
    // extended and displayed PROVISIONAL — never an assumed core.
    expect(md).toContain(
      "| QA-MIN-001 | Minimal rule | info | extended (PROVISIONAL) | — | low |",
    );
    // FP Risk column falls back to an em-dash, Autofix to "no", Since to em-dash.
    expect(md).toContain("| — | no | — |");
  });

  it("renders autofix: yes and a declared falsePositiveRisk/introduced when present", () => {
    const full = {
      id: "QA-FULL-001",
      category: "QA-TEST" as const,
      title: "Full rule",
      severity: "error" as const,
      confidence: "high" as const,
      findingType: "deterministic-defect" as const,
      qaImpact: "HYGIENE" as const,
      appliesTo: "test-files" as const,
      run: () => [],
      languages: ["typescript"],
      frameworks: ["vitest"],
      falsePositiveRisk: "low" as const,
      autofix: true,
      detectionStrategy: "LEXICAL" as const,
      introduced: "9.9.9",
    };
    const entries = buildCatalog([full]);
    expect(entries[0]?.autofix).toBe(true);
    const md = renderCatalogMd(entries);
    expect(md).toContain("| low | yes | 9.9.9 |");
  });

  it("escapes a pipe character in a rule title so it can't break the markdown table (real bug: QA-CI-002's title is literally 'Ignored exit code (|| true)')", () => {
    const ci002 = RULES.find((r) => r.id === "QA-CI-002");
    expect(
      ci002?.title.includes("|"),
      "this test assumes QA-CI-002's title contains a literal pipe " +
        "character — if that ever changes, replace this fixture with " +
        "another rule/title that still does",
    ).toBe(true);

    const md = renderCatalogMd(buildCatalog());
    const lines = md.split("\n").filter((l) => l.startsWith("| QA-CI-002"));
    expect(lines).toHaveLength(1);
    // A correctly-escaped row has exactly 11 unescaped `|` table delimiters
    // (10 columns + leading/trailing border = 11 pipe characters total when
    // the title's own pipes are escaped as \|).
    const line = lines[0] ?? "";
    const unescapedPipeCount = (line.match(/(?<!\\)\|/g) ?? []).length;
    expect(unescapedPipeCount).toBe(11);
  });

  it("CLI handler exits 0 and emits JSON by default", async () => {
    let out = "";
    const code = await runRulesCommand([], {
      out: (s) => {
        out += String(s);
      },
      err: () => {},
    });
    expect(code).toBe(0);
    const parsed: unknown = JSON.parse(out);
    expect(Array.isArray(parsed)).toBe(true);
  });
});
