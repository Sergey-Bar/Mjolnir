/**
 * Unit tests for the code-text masking layer (Phase 1 — Tempering Plan).
 *
 * Proves that string/comment masking preserves code structure and does
 * not over-blank when template literals contain quote characters.
 */

import { describe, expect, it } from "vitest";
import { getCodeOnlyText } from "../src/engine/ts-ast.js";
import { computeCodeText } from "../src/engine/code-text.js";

describe("getCodeOnlyText (TypeScript)", () => {
  function mask(code: string): string {
    return getCodeOnlyText({ path: "test.spec.ts", text: code });
  }

  it("blanks regular string literals", () => {
    const result = mask(`const x = "hello world";`);
    expect(result).not.toContain("hello world");
    expect(result).toContain("const x =");
  });

  it("blanks single-quoted strings", () => {
    const result = mask(`const x = 'foo bar';`);
    expect(result).not.toContain("foo bar");
    expect(result).toContain("const x =");
  });

  it("blanks template literals without substitutions", () => {
    const result = mask("const x = `template content`;");
    expect(result).not.toContain("template content");
    expect(result).toContain("const x =");
  });

  it("blanks single-line comments", () => {
    const result = mask(`const x = 1; // this is a comment`);
    expect(result).not.toContain("this is a comment");
    expect(result).toContain("const x = 1;");
  });

  it("blanks multi-line comments", () => {
    const result = mask(`const x = 1; /* block comment */`);
    expect(result).not.toContain("block comment");
    expect(result).toContain("const x = 1;");
  });

  it("preserves code after a template literal with quotes inside", () => {
    // THIS IS THE BUG: the scanner emits a phantom StringLiteral starting
    // at the " inside the template, which extends past the template's end
    // and blanks real code that follows.
    const code = 'f(`a "${w}" b`, { k: 1 });';
    const result = mask(code);
    // The { k: 1 } is real code — it MUST survive masking
    expect(result).toContain("{ k: 1 }");
    // The function call structure must survive
    expect(result).toContain("f(");
  });

  it("preserves code after complex template with embedded quotes", () => {
    const code = `const cmd = \`echo "\${name}" done\`;\nconst next = doSomething();`;
    const result = mask(code);
    // The second line is real code — must survive
    expect(result).toContain("const next = doSomething();");
  });

  it("preserves code after template with single quotes inside", () => {
    const code = "const s = `it's a ${thing}`;\nconst y = 42;";
    const result = mask(code);
    expect(result).toContain("const y = 42;");
  });

  it("preserves line structure (newlines never blanked)", () => {
    const code = `const a = "line1";\nconst b = "line2";`;
    const result = mask(code);
    const lines = result.split("\n");
    expect(lines).toHaveLength(2);
  });

  it("handles beforeAll with template containing quotes (registry-install pattern)", () => {
    const code = [
      "beforeAll(() => {",
      '  const out = execSync(`npm pack --json "${ROOT}"`);',
      "  const result = JSON.parse(out);",
      "  entryPath = join(dir, result.bin);",
      "});",
    ].join("\n");
    const result = mask(code);
    // All code lines must be preserved — the template only blanks its own content
    expect(result).toContain("beforeAll");
    expect(result).toContain("const result = JSON.parse(out);");
    expect(result).toContain("entryPath = join(dir, result.bin);");
    expect(result).toContain("});");
  });
});

describe("computeCodeText (Python)", () => {
  function mask(code: string): string {
    return computeCodeText({ path: "test_foo.py", text: code }, "python");
  }

  it("blanks single-line strings", () => {
    const result = mask(`x = "hello world"`);
    expect(result).not.toContain("hello world");
    expect(result).toContain("x =");
  });

  it("blanks comments", () => {
    const result = mask(`x = 1  # a comment`);
    expect(result).not.toContain("a comment");
    expect(result).toContain("x = 1");
  });

  it("blanks triple-quoted strings", () => {
    const result = mask(`x = """triple\nquoted"""\ny = 1`);
    expect(result).not.toContain("triple");
    expect(result).toContain("y = 1");
  });

  it("preserves newlines inside triple-quoted strings", () => {
    const code = `x = """line1\nline2\nline3"""\ny = 1`;
    const result = mask(code);
    // newlines inside the triple-quote are preserved
    expect(result.split("\n")).toHaveLength(code.split("\n").length);
  });
});

describe("computeCodeText (Java)", () => {
  function mask(code: string): string {
    return computeCodeText({ path: "FooTest.java", text: code }, "java");
  }

  it("blanks string literals", () => {
    const result = mask(`String x = "hello";`);
    expect(result).not.toContain("hello");
    expect(result).toContain("String x =");
  });

  it("blanks single-line comments", () => {
    const result = mask(`int x = 1; // comment`);
    expect(result).not.toContain("comment");
    expect(result).toContain("int x = 1;");
  });

  it("blanks block comments", () => {
    const result = mask(`int x = 1; /* block */`);
    expect(result).not.toContain("block");
    expect(result).toContain("int x = 1;");
  });
});

describe("computeCodeText (C#)", () => {
  function mask(code: string): string {
    return computeCodeText({ path: "FooTests.cs", text: code }, "csharp");
  }

  it("blanks regular strings", () => {
    const result = mask(`string x = "hello";`);
    expect(result).not.toContain("hello");
  });

  it("blanks verbatim strings", () => {
    const result = mask(`string x = @"hello world";`);
    expect(result).not.toContain("hello world");
  });

  it("blanks interpolated strings", () => {
    const result = mask(`string x = $"hi {name}";`);
    expect(result).not.toContain("hi");
  });
});
