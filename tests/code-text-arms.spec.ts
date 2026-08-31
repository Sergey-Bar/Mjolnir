/**
 * Phase 1 coverage: engine/code-text.ts masker edges — every language's
 * comment/string/char/escape shapes that the fixture corpus never hits.
 * Each case asserts the exact masked output: string and comment content
 * is blanked, code is untouched, and length/newlines are preserved
 * (the offset-preservation invariant the rules rely on).
 */

import { describe, expect, it } from "vitest";

import { computeCodeText } from "../src/engine/code-text.js";

type Lang = "typescript" | "python" | "java" | "csharp";

function mask(text: string, lang: Lang): string {
  return computeCodeText({ path: "probe", text, ast: undefined }, lang);
}

/** Expects every non-newline char of `maskedPart` to be blanked. */
function expectBlanked(
  text: string,
  masked: string,
  from: number,
  to: number,
): void {
  expect(masked).toHaveLength(text.length);
  for (let i = from; i < to; i++) {
    if (text[i] !== "\n" && text[i] !== "\r") {
      expect(masked[i]).toBe(" ");
    }
  }
}

describe("python masker edges", () => {
  it("masks triple-single-quoted strings with embedded quotes", () => {
    const text = "x = '''it('a')'''\ny = 1\n";
    const m = mask(text, "python");
    expectBlanked(text, m, 4, 4 + "'''it('a')'''".length);
    expect(m.endsWith("y = 1\n")).toBe(true);
  });

  it("masks escaped characters inside triple-quoted strings", () => {
    const text = "s = '''a\\nb'''\nt = 2\n";
    const m = mask(text, "python");
    expect(m).not.toContain("a\\nb");
    expect(m.endsWith("t = 2\n")).toBe(true);
  });

  it("masks escaped quotes inside single-quoted strings", () => {
    const text = "s = 'it\\'s fine'\nt = 2\n";
    const m = mask(text, "python");
    expect(m).not.toContain("it\\'s");
    expect(m.endsWith("t = 2\n")).toBe(true);
  });

  it("masks f-strings with prefix consumption", () => {
    const text = "s = f'{x !> 3}'\nt = 2\n";
    const m = mask(text, "python");
    expect(m).not.toContain("{x");
    expect(m.slice(0, 4)).toBe("s = ");
  });

  it("masks line comments", () => {
    const text = "a = 1  # hard sleep here\nb = 2\n";
    const m = mask(text, "python");
    expect(m).not.toContain("hard sleep");
    expect(m).toContain("a = 1");
  });

  it("leaves a bare identifier that only looks like a prefix untouched", () => {
    const text = "for_ = bbb\nfresh = r\n";
    const m = mask(text, "python");
    expect(m).toBe(text);
  });
});

describe("java masker edges", () => {
  it("masks text blocks with escaped characters inside", () => {
    const text = 'String s = """\nline \\\\ keep\n""";\nint x = 1;\n';
    const m = mask(text, "java");
    expect(m).not.toContain("keep");
    expect(m).toContain("int x = 1;");
    expect(m.split("\n")).toHaveLength(text.split("\n").length);
  });

  it("masks regular char literals", () => {
    const text = "char c = 'a';\nint x = 1;\n";
    const m = mask(text, "java");
    expectBlanked(text, m, 9, 12);
    expect(m).toContain("int x = 1;");
  });

  it("survives an empty char literal without over-consuming", () => {
    const text = "char c = '';\nint x = 1;\n";
    const m = mask(text, "java");
    expect(m).toContain("int x = 1;");
    expect(m.indexOf("int")).toBeGreaterThan(0);
  });

  it("survives an unterminated char literal at EOF", () => {
    const text = "char c = 'a";
    const m = mask(text, "java");
    expect(m).toHaveLength(text.length);
  });

  it("survives a char literal that never closes before EOF", () => {
    const text = "char c = 'a;";
    const m = mask(text, "java");
    expect(m).toHaveLength(text.length);
    expect(m).not.toContain("'a;");
  });
});

describe("csharp masker edges", () => {
  it("masks single-line comments", () => {
    const text = "// a csharp comment\nint x = 1;\n";
    const m = mask(text, "csharp");
    expect(m).not.toContain("csharp comment");
    expect(m).toContain("int x = 1;");
  });

  it("masks closed multi-line comments", () => {
    const text = "int a = 1; /* block\ncomment */ int b = 2;\n";
    const m = mask(text, "csharp");
    expect(m).not.toContain("block");
    expect(m).toContain("int b = 2;");
    expect(m.split("\n")).toHaveLength(text.split("\n").length);
  });

  it("blanks unclosed multi-line comments to EOF", () => {
    const text = "int a = 1; /* never closed\nint b = 2;\n";
    const m = mask(text, "csharp");
    expect(m).not.toContain("never closed");
    expect(m).not.toContain("int b");
  });

  it("blanks an unclosed comment whose last char is a stray asterisk", () => {
    const text = "int a = 1; /* trailing star *\nint b = 2;\n";
    const m = mask(text, "csharp");
    expect(m).not.toContain("trailing star");
    expect(m).not.toContain("int b");
  });

  it("blanks an unterminated comment that ends exactly at EOF", () => {
    const text = "int a = 1; /* to the very end";
    const m = mask(text, "csharp");
    expect(m).toHaveLength(text.length);
    expect(m).not.toContain("to the very end");
  });

  it("blanks an unterminated comment whose final two chars are **", () => {
    const text = "int a = 1; /* never closed **";
    const m = mask(text, "csharp");
    expect(m).toHaveLength(text.length);
    expect(m).not.toContain("never closed");
  });

  it("blanks an unterminated comment whose final two chars are **", () => {
    const text = "int a = 1; /* never closed **";
    const m = mask(text, "csharp");
    expect(m).toHaveLength(text.length);
    expect(m).not.toContain("never closed");
  });

  it("masks verbatim strings including doubled-quote escapes", () => {
    const text = 'var p = @"C:\\\\dir";\nvar q = @"say ""hi""";\nint x = 1;\n';
    const m = mask(text, "csharp");
    expect(m).not.toContain("dir");
    expect(m).not.toContain('say "');
    expect(m).toContain("int x = 1;");
  });

  it("masks interpolated strings with backslash escapes and unterminated tails", () => {
    const text = 'var s = $"a\\\\b {x}";\nvar t = $"unterminated\nint x = 1;\n';
    const m = mask(text, "csharp");
    expect(m).not.toContain("{x}");
    expect(m).not.toContain("unterminated");
    expect(m).toContain("int x = 1;");
  });

  it("masks interpolated-verbatim strings in both prefix orders", () => {
    const text = 'var a = $@"v {x}";\nvar b = @$"w {y}";\nint x = 1;\n';
    const m = mask(text, "csharp");
    expect(m).not.toContain("{x}");
    expect(m).not.toContain("{y}");
    expect(m).toContain("int x = 1;");
  });

  it("resets the prefix when @ or $ is not followed by a quote", () => {
    const text = "var at = a @ b;\nvar dollar = $x;\nint y = 1;\n";
    const m = mask(text, "csharp");
    expect(m).toContain("@ b;");
    expect(m).toContain("$x;");
    expect(m).toContain("int y = 1;");
  });

  it("masks raw string literals and char literals with escapes", () => {
    const text =
      'var r = """\nraw body\n""";\nvar c = \'x\';\nvar e = \'\\n\';\n';
    const m = mask(text, "csharp");
    expect(m).not.toContain("raw body");
    expect(m).not.toContain("'x'");
    expect(m).not.toContain("'\\n'");
  });

  it("survives an unterminated char literal at EOF and a plain backslash string", () => {
    const text = "var c = 'x";
    const m = mask(text, "csharp");
    expect(m).toHaveLength(text.length);
  });

  it("survives an empty char literal in csharp", () => {
    const text = "var c = '';\nint x = 1;\n";
    const m = mask(text, "csharp");
    expect(m).toContain("int x = 1;");
    expect(m.length).toBe(text.length);
  });

  it("masks backslash escapes inside plain strings", () => {
    const text = 'var s = "a\\\\b";\nint x = 1;\n';
    const m = mask(text, "csharp");
    expect(m).not.toContain("a\\\\b");
    expect(m).toContain("int x = 1;");
  });
});
