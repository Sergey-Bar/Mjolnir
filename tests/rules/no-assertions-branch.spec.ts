import { describe, expect, it } from "vitest";

import { jvNoAssertions } from "../../src/rules/java/qa-jv-103-no-assertions.js";
import { csNoAssertions } from "../../src/rules/csharp/qa-cs-103-no-assertions.js";
import { pyNoAssertions } from "../../src/rules/python/qa-py-003-no-assertions.js";

describe("QA-JV-103 matchBrace comment branches (lines 228-230, 233-235)", () => {
  it("skips line comments containing apostrophes (// don't) in the method body", () => {
    const text =
      `@Test\npublic void withComment() {\n` +
      `  // don't set inStr here\n` +
      `  int x = 1;\n` +
      `}\n`;
    const findings = jvNoAssertions.run({ path: "T.java", text });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("withComment");
  });

  it("skips block comments containing apostrophes (/* don't */) in the method body", () => {
    const text =
      `@Test\npublic void withBlockComment() {\n` +
      `  /* don't count this ' */\n` +
      `  int x = 1;\n` +
      `}\n`;
    const findings = jvNoAssertions.run({ path: "T.java", text });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("withBlockComment");
  });

  it("handles unterminated line comment (no newline — EOF branch)", () => {
    const text =
      `@Test\npublic void withEOFComment() {\n` +
      `  int x = 1; // end of file comment`;
    const findings = jvNoAssertions.run({ path: "T.java", text });
    // matchBrace returns -1 (unterminated), so no finding
    expect(findings).toEqual([]);
  });

  it("handles unterminated block comment (no closing */ — EOF branch)", () => {
    const text =
      `@Test\npublic void withEOFBlock() {\n` + `  int x = 1; /* unterminated`;
    const findings = jvNoAssertions.run({ path: "T.java", text });
    expect(findings).toEqual([]);
  });

  it("handles line comment at end of file with no newline", () => {
    const text = `@Test\npublic void endComment() {\n  // comment`;
    expect(jvNoAssertions.run({ path: "T.java", text })).toEqual([]);
  });

  it("handles block comment ending at EOF with no closing */", () => {
    const text = `@Test\npublic void endBlock() {\n  /* comment`;
    expect(jvNoAssertions.run({ path: "T.java", text })).toEqual([]);
  });
});

describe("QA-CS-103 matchBrace comment branches (lines 297-299, 303-305)", () => {
  it("skips line comments containing apostrophes in the method body", () => {
    const text =
      `[Test]\npublic void WithComment() {\n` +
      `  // don't set inStr here\n` +
      `  var x = 1;\n` +
      `}\n`;
    const findings = csNoAssertions.run({ path: "T.cs", text });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("WithComment");
  });

  it("skips block comments containing apostrophes in the method body", () => {
    const text =
      `[Test]\npublic void WithBlockComment() {\n` +
      `  /* don't count this ' */\n` +
      `  var x = 1;\n` +
      `}\n`;
    const findings = csNoAssertions.run({ path: "T.cs", text });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("WithBlockComment");
  });

  it("handles unterminated line comment (no newline — EOF branch)", () => {
    const text =
      `[Test]\npublic void WithEOFComment() {\n` +
      `  var x = 1; // end of file comment`;
    expect(csNoAssertions.run({ path: "T.cs", text })).toEqual([]);
  });

  it("handles unterminated block comment (no closing */ — EOF branch)", () => {
    const text =
      `[Test]\npublic void WithEOFBlock() {\n` + `  var x = 1; /* unterminated`;
    expect(csNoAssertions.run({ path: "T.cs", text })).toEqual([]);
  });
});

describe("QA-PY-003 branch coverage gaps (lines 170, 178)", () => {
  it("isCollectedTestMethod: class Test* with __init__ is NOT collected (line 170)", () => {
    const text =
      `class TestSomething:\n` +
      `    def __init__(self):\n` +
      `        pass\n` +
      `    def test_method(self):\n` +
      `        x = 1\n`;
    const findings = pyNoAssertions.run({ path: "test_x.py", text });
    // __init__ means the class is not collected — method is skipped
    expect(findings).toEqual([]);
  });

  it("isCollectedTestMethod: non-Test class encloses the def (line 176)", () => {
    const text =
      `class Helper:\n` + `    def test_callback(self):\n` + `        x = 1\n`;
    const findings = pyNoAssertions.run({ path: "test_x.py", text });
    // Non-Test class — not collected
    expect(findings).toEqual([]);
  });

  it("isCollectedTestMethod: def nested inside another def (line 176-178)", () => {
    const text =
      `def outer():\n` + `    def test_nested():\n` + `        x = 1\n`;
    const findings = pyNoAssertions.run({ path: "test_x.py", text });
    // Nested def — not collected
    expect(findings).toEqual([]);
  });

  it("isCollectedTestMethod: module-level def IS collected", () => {
    const text = `def test_top():\n    x = 1\n`;
    const findings = pyNoAssertions.run({ path: "test_x.py", text });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("test_top");
  });

  it("isCollectedTestMethod: method of Test* class without __init__ IS collected", () => {
    const text =
      `class TestSomething:\n` +
      `    def test_method(self):\n` +
      `        x = 1\n`;
    const findings = pyNoAssertions.run({ path: "test_x.py", text });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("test_method");
  });

  it("data-shape skip: function name referenced elsewhere is test data", () => {
    const text = `def test_data():\n` + `    x = 1\n` + `run(test_data)\n`;
    const findings = pyNoAssertions.run({ path: "test_x.py", text });
    // Referenced twice (def + run call) → skipped
    expect(findings).toEqual([]);
  });
});
