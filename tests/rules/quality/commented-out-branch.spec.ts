import { describe, expect, it } from "vitest";

import { commentedOutTest } from "../../../src/rules/quality/qa-tqual-011-commented-out.js";

describe("QA-TQUAL-011 branch coverage gap (line 105 — stripCommentMarkers returns matched:false)", () => {
  it("fires on // it(...) line comment (the main happy path)", () => {
    const text = `// it('disabled', () => {\n//   expect(1).toBe(1);\n// });\n`;
    const findings = commentedOutTest.run({ path: "a.spec.ts", text });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("Commented-out test");
  });

  it("fires on // test('disabled') line comment", () => {
    const text = `// test('disabled', () => {\n//   expect(1).toBe(1);\n// });\n`;
    const findings = commentedOutTest.run({ path: "a.spec.ts", text });
    expect(findings).toHaveLength(1);
  });

  it("does not fire on prose mentioning test mid-sentence", () => {
    const text = `// This is a test (for documentation purposes)\n`;
    const findings = commentedOutTest.run({ path: "a.spec.ts", text });
    expect(findings).toEqual([]);
  });

  it("does not fire on non-test lines in comments", () => {
    const text = `// just a comment\nconst x = 1;\n`;
    const findings = commentedOutTest.run({ path: "a.spec.ts", text });
    expect(findings).toEqual([]);
  });

  it("handles the fallback textual scan (no AST) path", () => {
    const text = `// it('disabled test', () => {\n//   expect(1).toBe(1);\n// });\n`;
    const findings = commentedOutTest.run({ path: "a.spec.ts", text });
    expect(findings).toHaveLength(1);
  });

  it("fallback scan: matches // it( at start of comment line", () => {
    const text = `// it('first', () => {});\n// it('second', () => {});\n`;
    const findings = commentedOutTest.run({ path: "a.spec.ts", text });
    expect(findings).toHaveLength(2);
  });

  it("fallback scan: does not match // something else test(", () => {
    const text = `// run this test('x')\n`;
    const findings = commentedOutTest.run({ path: "a.spec.ts", text });
    expect(findings).toEqual([]);
  });
});
