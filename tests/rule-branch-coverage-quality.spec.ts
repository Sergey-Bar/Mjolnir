/**
 * Quality/test-family rule branch coverage (Test Hardening Plan —
 * coverage-gap closure).
 */

import { describe, expect, it } from "vitest";
import { mockOnlyVerification } from "../src/rules/quality/qa-tqual-001-mock-only.js";
import { unawaitedPromiseAssertion } from "../src/rules/quality/qa-tqual-009-promise-assertion.js";

describe("QA-TQUAL-001: brace matcher handles escaped characters inside strings", () => {
  it("does not miscount braces when a string argument contains an escaped backslash/quote", () => {
    const text = `it("x", () => {\n  expect(mock).toHaveBeenCalledWith("a\\\\b\\"c");\n});\n`;
    expect(() =>
      mockOnlyVerification.run({ path: "x.spec.ts", text }),
    ).not.toThrow();
    const findings = mockOnlyVerification.run({ path: "x.spec.ts", text });
    expect(findings.length).toBeGreaterThan(0);
  });

  it("does not throw on an unterminated test body (unbalanced braces)", () => {
    const text = `it("x", () => {\n  expect(mock).toHaveBeenCalled();\n`;
    expect(() =>
      mockOnlyVerification.run({ path: "x.spec.ts", text }),
    ).not.toThrow();
  });
});

describe("QA-TQUAL-009: promise-chain assertion detection edge shapes", () => {
  it("does not throw on .then( with an arrow-expression body (no braces)", () => {
    const text = `it("x", () => {\n  fetchThing().then(r => expect(r.ok).toBe(true));\n});\n`;
    expect(() =>
      unawaitedPromiseAssertion.run({ path: "x.spec.ts", text }),
    ).not.toThrow();
  });

  it("does not throw on an unterminated .then(function() { block", () => {
    const text = `it("x", () => {\n  fetchThing().then(function() {\n    expect(1).toBe(1);\n`;
    expect(() =>
      unawaitedPromiseAssertion.run({ path: "x.spec.ts", text }),
    ).not.toThrow();
  });

  it("does not fire when the chain head is awaited, even across multiple chained lines", () => {
    const text =
      `it("x", async () => {\n` +
      `  await fetchThing()\n` +
      `    .then(r => expect(r.ok).toBe(true));\n` +
      `});\n`;
    const findings = unawaitedPromiseAssertion.run({
      path: "x.spec.ts",
      text,
    });
    expect(findings).toHaveLength(0);
  });

  it("fires when .then( is the very first thing on its statement (no chain-continuation prefix line)", () => {
    const text =
      `it("x", () => {\n` +
      `  fetchThing().then(r => {\n` +
      `    expect(r.ok).toBe(true);\n` +
      `  });\n` +
      `});\n`;
    const findings = unawaitedPromiseAssertion.run({
      path: "x.spec.ts",
      text,
    });
    expect(findings.length).toBeGreaterThan(0);
  });
});
