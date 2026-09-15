import { describe, expect, it } from "vitest";
import { countTestDeclarations } from "../../../src/scorer/scorer.js";
import { getCodeTextForCounting } from "../../../src/engine/code-text.js";

describe("countTestDeclarations — code-only view excludes comments/strings", () => {
  function countTs(raw: string): number {
    const codeView = getCodeTextForCounting(raw, "typescript");
    return countTestDeclarations(raw, codeView);
  }

  it("real declaration counted", () => {
    expect(countTs('it("a", fn)')).toBe(1);
  });

  it("line comment excluded", () => {
    expect(countTs('// it("a", fn)')).toBe(0);
  });

  it("block comment excluded", () => {
    expect(countTs('/* it("a", fn) */')).toBe(0);
  });

  it("string literal excluded", () => {
    expect(countTs("const x = \"it('a')\"")).toBe(0);
  });

  it("template literal excluded", () => {
    expect(countTs('const x = `it("a")`')).toBe(0);
  });

  it("URL-like string excluded", () => {
    expect(countTs('const url = "http://x.com/it()"')).toBe(0);
  });

  it("block comment inside string excluded", () => {
    expect(countTs('const x = "/* it() */"')).toBe(0);
  });

  it("parameterized test counted", () => {
    expect(countTs('it.each([1,2])("t %s", fn)')).toBe(1);
  });

  it("skipped test counted", () => {
    expect(countTs('test.skip("t", fn)')).toBe(1);
  });

  it("describe excluded", () => {
    expect(countTs('describe("s", () => {})')).toBe(0);
  });

  it("mixed real + commented — only real counted", () => {
    expect(countTs('it("a", fn)\n// it("b", fn)')).toBe(1);
  });
});

describe("countTestDeclarations — language-specific patterns", () => {
  it("Python def test_ counted", () => {
    const raw = "def test_foo():\n    pass";
    const codeView = getCodeTextForCounting(raw, "python");
    expect(countTestDeclarations(raw, codeView)).toBe(1);
  });

  it("Java @Test counted", () => {
    const raw = "@Test\nvoid t() {}";
    const codeView = getCodeTextForCounting(raw, "java");
    expect(countTestDeclarations(raw, codeView)).toBe(1);
  });

  it("C# [Fact] counted", () => {
    const raw = "[Fact]\nvoid T() {}";
    const codeView = getCodeTextForCounting(raw, "csharp");
    expect(countTestDeclarations(raw, codeView)).toBe(1);
  });
});

describe("countTestDeclarations — invariants", () => {
  it("count(raw) >= count(raw, stripped)", () => {
    const raw = 'it("a", fn)\n// it("b", fn)\nconst x = "it(\'c\')"';
    const rawCount = countTestDeclarations(raw);
    const codeView = getCodeTextForCounting(raw, "typescript");
    const strippedCount = countTestDeclarations(raw, codeView);
    expect(rawCount).toBeGreaterThanOrEqual(strippedCount);
  });
});

describe("maskTypeScriptBasic — template interpolation correctness", () => {
  it("handles template literals with ${} interpolation", () => {
    const raw = "const x = `${it()}`";
    const codeView = getCodeTextForCounting(raw, "typescript");
    // The `it()` inside ${} is live code — should be counted
    expect(countTestDeclarations(raw, codeView)).toBe(1);
  });

  it("handles block comment inside template literal", () => {
    const raw = "const x = `/* not a comment */`;\nit('a', fn)";
    const codeView = getCodeTextForCounting(raw, "typescript");
    expect(countTestDeclarations(raw, codeView)).toBe(1);
  });
});
