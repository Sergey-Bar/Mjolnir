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

  it("CLI handler exits 0 and emits JSON by default", () => {
    let out = "";
    const code = runRulesCommand([], { out: (s) => (out += s), err: () => {} });
    expect(code).toBe(0);
    const parsed: unknown = JSON.parse(out);
    expect(Array.isArray(parsed)).toBe(true);
  });
});
