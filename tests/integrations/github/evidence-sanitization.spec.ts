/**
 * Evidence Sanitization (PRUX-008) — test suite.
 *
 * XSS, injection, long strings, RTL overrides, and edge cases.
 */

import { describe, expect, it } from "vitest";

import {
  sanitizeForMarkdown,
  sanitizeTestName,
  sanitizeFilePath,
  sanitizeErrorMessage,
  capFindingsCount,
} from "../../../src/integrations/github/evidence-sanitization.js";

describe("sanitizeForMarkdown", () => {
  it("escapes markdown special characters", () => {
    const result = sanitizeForMarkdown("hello [world] (test)");
    expect(result).toContain("\\[world\\]");
    expect(result).toContain("\\(test\\)");
  });

  it("escapes backticks", () => {
    const result = sanitizeForMarkdown("use `code` here");
    expect(result).toContain("\\`code\\`");
  });

  it("escapes asterisks and underscores", () => {
    const result = sanitizeForMarkdown("*bold* _italic_");
    expect(result).toContain("\\*bold\\*");
    expect(result).toContain("\\_italic\\_");
  });

  it("strips HTML tags", () => {
    const result = sanitizeForMarkdown("<script>alert(1)</script>");
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("</script>");
    // Parentheses are escaped as markdown special chars
    expect(result).toContain("alert");
    expect(result).toContain("1");
  });

  it("strips HTML entities", () => {
    const result = sanitizeForMarkdown("&lt;div&gt; &amp; &#60;");
    expect(result).not.toContain("&lt;");
    expect(result).not.toContain("&gt;");
    expect(result).not.toContain("&amp;");
    expect(result).not.toContain("&#60;");
  });

  it("prevents javascript: link injection", () => {
    const result = sanitizeForMarkdown("[click](javascript:alert(1))");
    // After escaping + neutralization, the link structure is broken
    expect(result).not.toMatch(/\[click\]\(javascript:alert/);
  });

  it("prevents data: link injection", () => {
    const result = sanitizeForMarkdown("[click](data:text/html,<h1>xss</h1>)");
    // After escaping + neutralization, the link structure is broken
    expect(result).not.toMatch(/\[click\]\(data:text\/html/);
  });

  it("strips RTL override characters", () => {
    const result = sanitizeForMarkdown("test\u202ename");
    expect(result).not.toContain("\u202e");
  });

  it("strips numeric and hex HTML entities", () => {
    const result = sanitizeForMarkdown("&#x3c;img&#x3e; &#65;");
    expect(result).not.toContain("&#x");
    expect(result).not.toContain("&#65;");
  });

  it("neutralizes malformed links containing markup", () => {
    const result = sanitizeForMarkdown("[x](<script>)");
    expect(result).not.toMatch(/\]\([^)]*</);
    expect(result).not.toContain("<script>");
  });

  it("strips bidirectional isolation characters", () => {
    const result = sanitizeForMarkdown("test\u2066name\u2069");
    expect(result).not.toContain("\u2066");
    expect(result).not.toContain("\u2069");
  });

  it("truncates long text at 500 characters", () => {
    const longText = "a".repeat(600);
    const result = sanitizeForMarkdown(longText);
    expect(result.length).toBeLessThan(600);
    expect(result).toContain("\\.\\.\\.");
  });

  it("preserves short text unchanged (minus escaping)", () => {
    const result = sanitizeForMarkdown("hello world");
    expect(result).toBe("hello world");
  });

  it("handles empty string", () => {
    expect(sanitizeForMarkdown("")).toBe("");
  });

  it("handles string with only special chars", () => {
    const result = sanitizeForMarkdown("[](){}");
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("\\[");
    expect(result).toContain("\\]");
  });
});

describe("sanitizeTestName", () => {
  it("escapes markdown in test names", () => {
    const result = sanitizeTestName("should handle [brackets]");
    expect(result).toContain("\\[brackets\\]");
  });

  it("strips HTML from test names", () => {
    const result = sanitizeTestName("<b>bold test</b>");
    expect(result).not.toContain("<b>");
  });

  it("truncates long test names at 120 chars", () => {
    const longName = "a".repeat(200);
    const result = sanitizeTestName(longName);
    expect(result.length).toBeLessThan(200);
    expect(result).toContain("\\.\\.\\.");
  });

  it("preserves short test names", () => {
    expect(sanitizeTestName("login flow")).toBe("login flow");
  });
});

describe("sanitizeFilePath", () => {
  it("escapes markdown in paths", () => {
    const result = sanitizeFilePath("src/[module]/file.ts");
    expect(result).toContain("\\[module\\]");
  });

  it("strips HTML from paths", () => {
    const result = sanitizeFilePath("src/<script>.ts");
    expect(result).not.toContain("<script>");
  });

  it("truncates long paths from the beginning", () => {
    const longPath = "a".repeat(300);
    const result = sanitizeFilePath(longPath);
    expect(result.length).toBeLessThan(300);
    expect(result).toContain("\\.\\");
  });

  it("preserves short paths", () => {
    expect(sanitizeFilePath("src/test.ts")).toBe("src/test.ts");
  });
});

describe("sanitizeErrorMessage", () => {
  it("redacts AWS keys", () => {
    const result = sanitizeErrorMessage("key: AKIAIOSFODNN7EXAMPLE");
    expect(result).toContain("REDACTED");
    expect(result).not.toContain("AKIAIOSFODNN7EXAMPLE");
  });

  it("redacts GitHub tokens", () => {
    const result = sanitizeErrorMessage(
      "token: ghp_abcdefghijklmnopqrstuvwxyz0123456789AB",
    );
    expect(result).toContain("REDACTED");
  });

  it("redacts passwords", () => {
    const result = sanitizeErrorMessage("password=supersecret123");
    expect(result).toContain("REDACTED");
  });

  it("escapes markdown special chars", () => {
    const result = sanitizeErrorMessage("error in [module]");
    expect(result).toContain("\\[module\\]");
  });

  it("strips control characters", () => {
    const result = sanitizeErrorMessage("error\x00in\x07text");
    expect(result).not.toContain("\x00");
    expect(result).not.toContain("\x07");
  });
});

describe("capFindingsCount", () => {
  it("returns all findings when under cap", () => {
    const findings = [1, 2, 3];
    expect(capFindingsCount(findings, 5)).toEqual([1, 2, 3]);
  });

  it("truncates findings at cap", () => {
    const findings = Array.from({ length: 100 }, (_, i) => i);
    expect(capFindingsCount(findings, 50)).toHaveLength(50);
  });

  it("uses default cap of 50", () => {
    const findings = Array.from({ length: 60 }, (_, i) => i);
    expect(capFindingsCount(findings)).toHaveLength(50);
  });

  it("returns empty for empty input", () => {
    expect(capFindingsCount([])).toEqual([]);
  });
});
