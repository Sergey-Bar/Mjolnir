/**
 * Unit tests for the code-text masking layer (Phase 1 — Tempering Plan).
 *
 * Proves that string/comment masking preserves code structure and does
 * not over-blank when template literals contain quote characters.
 */

import { describe, expect, it } from "vitest";
import { getCodeOnlyText } from "../../../src/engine/ts-ast.js";
import { computeCodeText } from "../../../src/engine/code-text.js";

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

// ─── Branch-coverage completion for the hand-written maskers ──────────
//
// The blocks above cover the common paths; these exercise the prefix
// handling, unterminated-literal recovery, and language-specific literal
// forms (Java text blocks, C# raw/verbatim/interpolated combinations)
// that were previously only reached indirectly through rule fixtures.

describe("computeCodeText — language dispatch and fallback", () => {
  it("handles a non-code file for every declared language", () => {
    // The language parameter is a closed union: there is no unknown-language
    // runtime path. Each declared language must accept non-code input and
    // degrade to a same-length view.
    const text = "just prose, no code\n";
    for (const lang of ["typescript", "python", "java", "csharp"] as const) {
      const out = computeCodeText({ path: "f.txt", text }, lang);
      expect(out).toHaveLength(text.length);
    }
  });

  it("never throws on malformed input — degrades to raw text or a masked view", () => {
    for (const lang of ["python", "java", "csharp"] as const) {
      expect(() =>
        computeCodeText({ path: `f.${lang}`, text: '"\\' }, lang),
      ).not.toThrow();
    }
  });

  it("preserves total length (masking only substitutes, never deletes)", () => {
    const code = 'a = "one" # two\nb = 3';
    const out = computeCodeText({ path: "t_x.py", text: code }, "python");
    expect(out).toHaveLength(code.length);
  });
});

describe("computeCodeText (Python) — prefixes and edge cases", () => {
  const mask = (c: string) =>
    computeCodeText({ path: "test_x.py", text: c }, "python");

  it("blanks f-string / r-string / b-string bodies but keeps the code around them", () => {
    const out = mask('v = f"value {x}"\nw = r"raw\\path"\nq = b"bytes"\nz = 9');
    expect(out).not.toContain("value");
    expect(out).not.toContain("raw");
    expect(out).not.toContain("bytes");
    expect(out).toContain("z = 9");
  });

  it("does not treat a bare identifier starting with f/r/b as a string prefix", () => {
    const out = mask("format = 1\nregister(from_thing)\nb = 2");
    expect(out).toContain("format = 1");
    expect(out).toContain("register(from_thing)");
    expect(out).toContain("b = 2");
  });

  it("handles an unterminated single-quoted string without hanging", () => {
    const out = mask('x = "no end\ny = 1');
    expect(out.split("\n")).toHaveLength(2);
    expect(out).toContain("y = 1");
  });

  it("handles an unterminated triple-quoted string (blanks to EOF)", () => {
    const out = mask('x = """still open\nmore\n');
    expect(out).not.toContain("still open");
    expect(out).not.toContain("more");
  });

  it("keeps escaped quotes inside a string from ending it early", () => {
    const out = mask('x = "a \\" b"\ny = 1');
    expect(out).toContain("y = 1");
    expect(out).not.toContain("a ");
  });
});

describe("computeCodeText (Java) — text blocks, char literals, unclosed comments", () => {
  const mask = (c: string) =>
    computeCodeText({ path: "FooTest.java", text: c }, "java");

  it("blanks a Java text block but preserves its newlines and trailing code", () => {
    const code = 'String s = """\nline one\nline two\n""";\nint z = 1;';
    const out = mask(code);
    expect(out).not.toContain("line one");
    expect(out).toContain("int z = 1;");
    expect(out.split("\n")).toHaveLength(code.split("\n").length);
  });

  it("blanks char literals, including escaped ones", () => {
    const out = mask("char a = 'x'; char b = '\\n'; int z = 1;");
    expect(out).toContain("char a =");
    expect(out).toContain("int z = 1;");
  });

  it("blanks an unclosed block comment to end of file", () => {
    const out = mask("int x = 1; /* never closed\nstill comment");
    expect(out).toContain("int x = 1;");
    expect(out).not.toContain("still comment");
  });

  it("keeps escaped quote inside a string literal from ending it early", () => {
    const out = mask('String s = "a \\" b"; int z = 1;');
    expect(out).toContain("int z = 1;");
  });
});

describe("computeCodeText (C#) — verbatim, interpolated, raw, combined prefixes", () => {
  const mask = (c: string) =>
    computeCodeText({ path: "FooTests.cs", text: c }, "csharp");

  it("blanks $@ and @$ interpolated-verbatim strings", () => {
    const out = mask(
      'var a = $@"c:\\{x}\\path";\nvar b = @$"{y}\\z";\nint z = 1;',
    );
    expect(out).not.toContain("path");
    expect(out).toContain("int z = 1;");
  });

  it("blanks a verbatim string containing a doubled-quote escape", () => {
    const out = mask('var s = @"he said ""hi""";\nint z = 1;');
    expect(out).not.toContain("he said");
    expect(out).toContain("int z = 1;");
  });

  it("blanks a C# 11 raw string literal", () => {
    const out = mask('var s = """\nraw {notInterpolated}\n""";\nint z = 1;');
    expect(out).not.toContain("raw {");
    expect(out).toContain("int z = 1;");
  });

  it("does not treat a lone @ or $ without a following quote as a string", () => {
    const out = mask("var @class = 1;\nvar total = a $ b;\nint z = 1;");
    expect(out).toContain("var @class = 1;");
    expect(out).toContain("int z = 1;");
  });

  it("blanks char literals and unclosed block comments", () => {
    expect(mask("char c = 'x'; int z = 1;")).toContain("int z = 1;");
    expect(mask("int x = 1; /* unclosed")).toContain("int x = 1;");
  });
});
