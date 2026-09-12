/**
 * Tests for `create-rule` scaffold (Tier 6 #34).
 */

import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createRuleScaffold,
  renderScaffoldReport,
} from "../../src/commands/create-rule.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "qa-create-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("createRuleScaffold", () => {
  it("creates rule file + both fixture dirs", () => {
    const result = createRuleScaffold(
      { id: "QA-PW-130", title: "Detached node assertion" },
      dir,
    );
    expect(result.ok).toBe(true);
    expect(result.files).toHaveLength(3);
    for (const f of result.files) {
      expect(existsSync(join(dir, f))).toBe(true);
    }
    expect(existsSync(join(dir, "src", "rules", "playwright"))).toBe(true);
  });

  it("generated rule compiles conceptually: correct id/category/export", () => {
    createRuleScaffold(
      { id: "QA-TQUAL-020", title: "Weak truthiness assertion" },
      dir,
    );
    const src = readFileSync(
      join(dir, "src", "rules", "quality", "qa-tqual-020.ts"),
      "utf8",
    );
    expect(src).toContain('id: "QA-TQUAL-020"');
    expect(src).toContain('category: "QA-TQUAL"');
    expect(src).toContain("export const qaTqual020");
  });

  it("python family maps to python rules dir and .py fixtures", () => {
    const result = createRuleScaffold(
      { id: "QA-PY-013", title: "Fixture abuse" },
      dir,
    );
    expect(result.ok).toBe(true);
    expect(
      result.files.some((f) => f.includes("must-fire") && f.endsWith(".py")),
    ).toBe(true);
  });

  it("refuses duplicate rule files", () => {
    createRuleScaffold({ id: "QA-CI-010", title: "A" }, dir);
    const again = createRuleScaffold({ id: "QA-CI-010", title: "B" }, dir);
    expect(again.ok).toBe(false);
    expect(again.error).toContain("already exists");
  });

  it("rejects invalid IDs", () => {
    const bad = createRuleScaffold({ id: "NOPE-1", title: "x" }, dir);
    expect(bad.ok).toBe(false);
    expect(bad.error).toContain("Invalid rule ID");
  });

  it("rejects missing title", () => {
    const bad = createRuleScaffold({ id: "QA-TEST-050", title: "" }, dir);
    expect(bad.ok).toBe(false);
    expect(bad.error).toContain("--title");
  });

  it("registry edit names the right import path and export", () => {
    const result = createRuleScaffold(
      { id: "QA-PW-131", title: "Frame piercing depth" },
      dir,
    );
    expect(result.registryEdit).toContain('from "./playwright/qa-pw-131.js"');
    expect(result.registryEdit).toContain("qaPw131");
  });
});

describe("renderScaffoldReport", () => {
  it("renders failure honestly", () => {
    const text = renderScaffoldReport({
      ok: false,
      error: "Invalid rule ID.",
      files: [],
      registryEdit: "",
    });
    expect(text).toContain("failed");
    expect(text).toContain("Invalid rule ID.");
  });

  it("renders next steps including the anti-creep law", () => {
    const text = renderScaffoldReport({
      ok: true,
      files: ["a.ts"],
      registryEdit: "import { x }",
    });
    expect(text).toContain("CANNOT ship");
    expect(text).toContain("npm test");
  });
});
