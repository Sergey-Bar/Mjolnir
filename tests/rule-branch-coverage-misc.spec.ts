/**
 * Miscellaneous rule branch coverage (Test Hardening Plan — coverage-gap
 * closure across several small rule files: paren/brace matching bail-
 * out paths, path-suffix guards, and skip-convention branches that the
 * fixture pairs didn't happen to exercise).
 */

import { describe, expect, it } from "vitest";
import { qaPw140 } from "../src/rules/playwright/qa-pw-140.js";
import { evaluateBusinessLogic } from "../src/rules/playwright/qa-pw-005-evaluate-logic.js";
import { pwNoProjectSplit } from "../src/rules/playwright/qa-pw-124-project-split.js";
import { pyBareTruthinessAssert } from "../src/rules/python/qa-py-004-bare-truthiness.js";

describe("QA-PW-140: unbalanced parens bail out rather than guess", () => {
  it("does not throw when toHaveScreenshot( is never closed anywhere in the file", () => {
    const text = `await page.toHaveScreenshot(`;
    expect(() => qaPw140.run({ path: "x.spec.ts", text })).not.toThrow();
    expect(qaPw140.run({ path: "x.spec.ts", text })).toHaveLength(0);
  });

  it("brace matcher handles an escaped quote inside a screenshot name argument", () => {
    const text = `await expect(page).toHaveScreenshot("a\\"b.png");\n`;
    const findings = qaPw140.run({ path: "x.spec.ts", text });
    expect(findings.length).toBeGreaterThan(0);
  });
});

describe("QA-PW-005: page.evaluate() with no braces at all", () => {
  it("does not throw on an arrow-expression body (no opening brace to find)", () => {
    const text = `test("x", async ({ page }) => {\n  await page.evaluate(() => document.title);\n});\n`;
    expect(() =>
      evaluateBusinessLogic.run({ path: "x.spec.ts", text }),
    ).not.toThrow();
  });

  it("does not fire for a trivial evaluate body with no branching logic", () => {
    const text = `test("x", async ({ page }) => {\n  await page.evaluate(() => { return document.title; });\n});\n`;
    expect(evaluateBusinessLogic.run({ path: "x.spec.ts", text })).toHaveLength(
      0,
    );
  });

  it("does not throw when the evaluate() block is never closed", () => {
    const text = `page.evaluate(() => {\n  if (x) { do(); }`;
    expect(() =>
      evaluateBusinessLogic.run({ path: "x.spec.ts", text }),
    ).not.toThrow();
  });

  it("brace matcher handles an escaped quote inside the evaluate body", () => {
    const text = `page.evaluate(() => {\n  if (x) { console.log("a\\"b"); }\n});\n`;
    const findings = evaluateBusinessLogic.run({ path: "x.spec.ts", text });
    expect(findings.length).toBeGreaterThan(0);
  });
});

describe("QA-PW-124: only applies to playwright.config.*, ignores everything else", () => {
  it("does not fire when the file isn't a playwright config at all", () => {
    const text = `export default { projects: [{ name: "chromium" }] };\n`;
    const findings = pwNoProjectSplit.run({ path: "src/other-file.ts", text });
    expect(findings).toHaveLength(0);
  });

  it("still fires correctly for the real config filename (regression check)", () => {
    const text = `export default defineConfig({ projects: [{ name: "chromium" }] });\n`;
    const findings = pwNoProjectSplit.run({
      path: "playwright.config.ts",
      text,
    });
    expect(findings.length).toBeGreaterThan(0);
  });

  it("does not fire on a real config file that has no `projects` array at all", () => {
    const text = `export default defineConfig({ testDir: "./e2e" });\n`;
    const findings = pwNoProjectSplit.run({
      path: "playwright.config.ts",
      text,
    });
    expect(findings).toHaveLength(0);
  });
});

describe("QA-PY-004: is_/has_/can_/should_/was_/were_ boolean-name convention is skipped", () => {
  for (const prefix of ["is", "has", "can", "should", "was", "were"]) {
    it(`does not fire for a bare "${prefix}_..." assert`, () => {
      const text = `def test_x():\n    ${prefix}_ready = check()\n    assert ${prefix}_ready\n`;
      const findings = pyBareTruthinessAssert.run({
        path: "test_x.py",
        text,
      });
      expect(findings).toHaveLength(0);
    });
  }
});
