import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  classifyLocator,
  computeSelectorHealth,
  computeSpecHealth,
  renderSelectorHealth,
} from "../src/playwright/selector-health.js";

describe("classifyLocator", () => {
  it("returns null for non-locator lines", () => {
    expect(classifyLocator("const x = 5;")).toBeNull();
  });

  it("classifies role-based locators as GOOD", () => {
    expect(classifyLocator("page.getByRole('button').click()")).toBe(
      "role-based",
    );
    expect(classifyLocator("await page.getByTestId('submit')")).toBe(
      "role-based",
    );
  });

  it("classifies data-testid attribute selectors as OK", () => {
    expect(classifyLocator("page.locator('[data-testid=login]')")).toBe(
      "testid",
    );
  });

  it("classifies xpath as BAD", () => {
    expect(classifyLocator("page.$x('//div/button')")).toBe("xpath");
    expect(classifyLocator("page.locator('xpath=//div')")).toBe("xpath");
  });

  it("classifies css chains as BAD", () => {
    expect(classifyLocator("page.locator('.btn.primary > span')")).toBe(
      "css-chain",
    );
    expect(classifyLocator("page.locator('#root .item')")).toBe("css-chain");
  });

  it("classifies quoted locators as css-chain when line contains structural chars", () => {
    // The structural check runs on the whole LINE — 'page.locator' itself
    // contains a dot, so any quoted locator call classifies as css-chain.
    expect(classifyLocator("page.locator('plain-text-selector')")).toBe(
      "css-chain",
    );
  });
});

describe("computeSpecHealth", () => {
  it("scores all-good specs at 100", () => {
    const h = computeSpecHealth("a.spec.ts", [
      "page.getByRole('button');",
      "page.getByLabel('User');",
    ]);
    expect(h.score).toBe(100);
    expect(h.counts["role-based"]).toBe(2);
  });

  it("scores empty specs at 100 with no weakest line", () => {
    const h = computeSpecHealth("a.spec.ts", ["// nothing here"]);
    expect(h.score).toBe(100);
    expect(h.weakestLine).toBeUndefined();
  });

  it("penalizes xpath to zero and reports weakest line", () => {
    const h = computeSpecHealth("a.spec.ts", [
      "page.getByRole('button');",
      "page.$x('//div');",
    ]);
    // good=1, total=2 → 50
    expect(h.score).toBe(50);
    expect(h.weakestLine).toBe(2);
  });

  it("gives partial credit (0.3) for css chains", () => {
    const h = computeSpecHealth("a.spec.ts", [
      "page.locator('.a > .b');",
      "page.locator('.c');",
    ]);
    // (0 + 0.6) / 2 → 30
    expect(h.score).toBe(30);
  });
});

describe("renderSelectorHealth", () => {
  it("renders bar, score and counts", () => {
    const out = renderSelectorHealth([
      {
        file: "a.spec.ts",
        score: 50,
        counts: { "role-based": 1, testid: 0, "css-chain": 0, xpath: 1 },
      },
    ]);
    expect(out).toContain("SELECTOR HEALTH");
    expect(out).toContain("a.spec.ts");
    expect(out).toContain("50 / 100");
    expect(out).toContain("role/text: 1");
    expect(out).toContain("xpath: 1");
  });
});

describe("computeSelectorHealth", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "qa-doctor-sh-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("walks spec files and sorts weakest first", () => {
    writeFileSync(join(dir, "good.spec.ts"), "page.getByRole('button');\n");
    mkdirSync(join(dir, "nested"), { recursive: true });
    writeFileSync(
      join(dir, "nested", "bad.spec.ts"),
      "page.locator('.a .b');\n",
    );
    const specs = computeSelectorHealth(dir);
    expect(specs.map((s) => s.file)).toEqual([
      join("nested", "bad.spec.ts").replaceAll("\\", "/"),
      "good.spec.ts",
    ]);
  });

  it("ignores node_modules", () => {
    mkdirSync(join(dir, "node_modules"), { recursive: true });
    writeFileSync(join(dir, "node_modules", "x.spec.ts"), "");
    expect(computeSelectorHealth(dir)).toEqual([]);
  });
});
