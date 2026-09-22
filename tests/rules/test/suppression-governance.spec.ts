/**
 * QA-TEST-011 suppression governance gate tests.
 */

import { describe, expect, it } from "vitest";
import { suppressionComment } from "src/rules/test/qa-test-011-suppression.ts";

describe("QA-TEST-011: suppression comment detection", () => {
  it("detects eslint-disable comments", () => {
    const text = `// eslint-disable-next-line no-unused-vars\nconst x = 1;\n`;
    const findings = suppressionComment.run({ path: "x.test.ts", text });
    expect(findings.some((f) => f.message.includes("eslint-disable"))).toBe(
      true,
    );
  });

  it("detects eslint-disable-line comments", () => {
    const text = `const x = 1; // eslint-disable-line no-unused-vars\n`;
    const findings = suppressionComment.run({ path: "x.test.ts", text });
    expect(
      findings.some((f) => f.message.includes("eslint-disable-line")),
    ).toBe(true);
  });

  it("detects noqa comments", () => {
    const text = `# noqa\n`;
    const findings = suppressionComment.run({ path: "x.test.py", text });
    expect(findings.some((f) => f.message.includes("noqa"))).toBe(true);
  });

  it("detects nolint comments", () => {
    const text = `// nolint\n`;
    const findings = suppressionComment.run({ path: "x.test.ts", text });
    expect(findings.some((f) => f.message.includes("nolint"))).toBe(true);
  });

  it("detects noinspection comments", () => {
    const text = `// noinspection JSUnresolvedVariable\n`;
    const findings = suppressionComment.run({ path: "x.test.ts", text });
    expect(findings.some((f) => f.message.includes("noinspection"))).toBe(true);
  });

  it("returns no findings for clean test files", () => {
    const text = `it("should work", () => { expect(1).toBe(1); });\n`;
    const findings = suppressionComment.run({ path: "x.test.ts", text });
    expect(findings).toHaveLength(0);
  });

  it("reports correct line numbers", () => {
    const text = `it("test", () => {});\n// eslint-disable\n`;
    const findings = suppressionComment.run({ path: "x.test.ts", text });
    expect(findings[0]?.line).toBe(2);
  });
});
