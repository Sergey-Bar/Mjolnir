/**
 * `qa-doctor rules` catalog — registry-derived docs can never drift.
 */

import { describe, expect, it } from "vitest";

import {
  buildCatalog,
  renderCatalogMd,
} from "../src/commands/rules-catalog.js";
import { RULES } from "../src/rules/index.js";
import { runRulesCommand } from "../src/cli.js";

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

    const md = renderCatalogMd(entries);
    expect(md).toContain("| QA-MIN-001 | Minimal rule | info | low |");
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
      detectionStrategy: "regex pattern",
      introduced: "9.9.9",
    };
    const entries = buildCatalog([full]);
    expect(entries[0]?.autofix).toBe(true);
    const md = renderCatalogMd(entries);
    expect(md).toContain("| low | yes | 9.9.9 |");
  });

  it("CLI handler exits 0 and emits JSON by default", () => {
    let out = "";
    const code = runRulesCommand([], { out: (s) => (out += s), err: () => {} });
    expect(code).toBe(0);
    const parsed: unknown = JSON.parse(out);
    expect(Array.isArray(parsed)).toBe(true);
  });
});
