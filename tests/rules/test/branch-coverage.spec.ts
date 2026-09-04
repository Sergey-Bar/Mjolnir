/**
 * QA-TEST family rule branch coverage (Test Hardening Plan — coverage-
 * gap closure).
 */

import { describe, expect, it } from "vitest";
import { focusedTestCommitted } from "../../../src/rules/test/qa-test-001-focused-test.js";
import { noAssertions } from "../../../src/rules/test/qa-test-003-no-assertions.js";

describe("QA-TEST-001: fit()/fdescribe() detection (the .only() path is already covered)", () => {
  it("fires for a bare fit(...) call", () => {
    const text = `fit("focused", () => {\n  expect(1).toBe(1);\n});\n`;
    const findings = focusedTestCommitted.run({ path: "x.spec.ts", text });
    expect(findings.some((f) => f.message.includes("fit("))).toBe(true);
  });

  it("fires for a bare fdescribe(...) call", () => {
    const text = `fdescribe("focused suite", () => {\n  it("x", () => { expect(1).toBe(1); });\n});\n`;
    const findings = focusedTestCommitted.run({ path: "x.spec.ts", text });
    expect(findings.some((f) => f.message.includes("fdescribe("))).toBe(true);
  });
});

describe("QA-TEST-003: brace matcher handles escaped characters inside test bodies", () => {
  it("does not miscount braces when a string literal contains an escaped quote/backslash", () => {
    const text = `it("x", () => {\n  const s = "a\\\\b\\"c";\n  expect(s).toBeDefined();\n});\n`;
    expect(() => noAssertions.run({ path: "x.spec.ts", text })).not.toThrow();
    expect(noAssertions.run({ path: "x.spec.ts", text })).toHaveLength(0);
  });
});
