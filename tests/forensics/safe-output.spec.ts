import { describe, expect, it } from "vitest";

import {
  sanitizeUrl,
  sanitizePath,
  safeMarkdownLink,
} from "../../src/forensics/safe-output.js";

describe("sanitizeUrl", () => {
  it("allows https URLs", () => {
    expect(sanitizeUrl("https://example.com")).toBe("https://example.com");
  });

  it("allows http URLs", () => {
    expect(sanitizeUrl("http://example.com")).toBe("http://example.com");
  });

  it("allows mailto URLs", () => {
    expect(sanitizeUrl("mailto:user@example.com")).toBe(
      "mailto:user@example.com",
    );
  });

  it("blocks javascript: protocol", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBe("");
  });

  it("blocks data: protocol", () => {
    expect(sanitizeUrl("data:text/html,<script>alert(1)</script>")).toBe("");
  });

  it("blocks vbscript: protocol", () => {
    expect(sanitizeUrl("vbscript:alert(1)")).toBe("");
  });

  it("blocks file: protocol", () => {
    expect(sanitizeUrl("file:///etc/passwd")).toBe("");
  });

  it("blocks obfuscated javascript: with whitespace", () => {
    expect(sanitizeUrl("java\nscript:alert(1)")).toBe("");
  });

  it("blocks protocol-relative with no scheme", () => {
    expect(sanitizeUrl("//evil.com/xss")).toBe("");
  });

  it("trims whitespace", () => {
    expect(sanitizeUrl("  https://example.com  ")).toBe("https://example.com");
  });
});

describe("sanitizePath", () => {
  it("normalizes forward slashes", () => {
    expect(sanitizePath("src\\foo\\bar.ts")).toBe("src/foo/bar.ts");
  });

  it("removes path traversal", () => {
    expect(sanitizePath("src/../../../etc/passwd")).toBe("src/etc/passwd");
  });

  it("removes current directory references", () => {
    expect(sanitizePath("./src/foo.ts")).toBe("src/foo.ts");
  });

  it("removes empty segments", () => {
    expect(sanitizePath("src//foo.ts")).toBe("src/foo.ts");
  });

  it("handles nested traversal", () => {
    expect(sanitizePath("a/b/../c/../../d")).toBe("a/b/c/d");
  });

  it("preserves normal paths", () => {
    expect(sanitizePath("src/engine/foo.ts")).toBe("src/engine/foo.ts");
  });
});

describe("safeMarkdownLink", () => {
  it("constructs a valid markdown link", () => {
    expect(safeMarkdownLink("Click here", "https://example.com")).toBe(
      "[Click here](https://example.com)",
    );
  });

  it("returns text only for dangerous URLs", () => {
    expect(safeMarkdownLink("Click here", "javascript:alert(1)")).toBe(
      "Click here",
    );
  });

  it("escapes brackets in text", () => {
    expect(safeMarkdownLink("[test]", "https://example.com")).toBe(
      "[\\[test\\]](https://example.com)",
    );
  });

  it("replaces newlines in text", () => {
    expect(safeMarkdownLink("line1\nline2", "https://example.com")).toBe(
      "[line1 line2](https://example.com)",
    );
  });

  it("escapes backslashes in text", () => {
    expect(safeMarkdownLink("foo\\bar", "https://example.com")).toBe(
      "[foo\\\\bar](https://example.com)",
    );
  });

  it("returns text only for non-http URLs", () => {
    expect(safeMarkdownLink("text", "ftp://example.com")).toBe("text");
  });
});
