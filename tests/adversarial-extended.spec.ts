/**
 * Extended adversarial coverage (Test Hardening Plan, P1).
 *
 * `fuzz.spec.ts` proves the TypeScript rule functions survive 13 hostile
 * in-memory strings. It never touches: the Python/tree-sitter adapter,
 * the filesystem discovery layer against real hostile files on disk, or
 * non-UTF8 encodings — three gaps this file closes.
 */

import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { RULES } from "../src/rules/index.js";
import { runScan } from "../src/cli.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-adversarial-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const PYTHON_RULES = RULES.filter((r) => r.appliesTo === ("python" as never));

describe("Python adapter: hostile source never crashes a rule", () => {
  const HOSTILE_PY_SNIPPETS: Array<[string, string]> = [
    ["mixed-tabs-spaces", "def test_x():\n\tassert True\n    assert False\n"],
    [
      "inconsistent-indent",
      "def test_x():\n  assert True\n      assert True\n",
    ],
    ["unterminated-string", 'def test_x():\n    assert "never closed\n'],
    [
      "deep-nesting",
      `def test_x():\n${"    if True:\n".repeat(300)}        pass\n`,
    ],
    ["null-bytes", "def test_x():\n\x00\x01\x02\n    assert True\n"],
    ["empty-file", ""],
    ["only-whitespace", "   \n\t\n   "],
    [
      "huge-single-line",
      `def test_x():\n    assert "${"a".repeat(100_000)}" == ""\n`,
    ],
    [
      "unicode-directional-override",
      "def test_x():\n    assert '‮test‭' == ''\n",
    ],
    ["binary-garbage", "\x00\x01\x02\xFF\xFE\xFD def test_x(): assert"],
  ];

  for (const [name, snippet] of HOSTILE_PY_SNIPPETS) {
    it(`survives: ${name}`, () => {
      for (const rule of PYTHON_RULES) {
        expect(
          () => rule.run({ path: "test_evil.py", text: snippet }),
          `${rule.id} on ${name}`,
        ).not.toThrow();
      }
    });
  }
});

describe("filesystem discovery: hostile files on disk", () => {
  it("a zero-byte test file does not crash the scan", () => {
    mkdirSync(join(dir, "e2e"), { recursive: true });
    writeFileSync(join(dir, "e2e", "empty.spec.ts"), "");
    expect(() =>
      runScan({
        target: dir,
        json: true,
        verbose: true,
        maxDurationMs: 10_000,
        scopeChanged: false,
        format: "json",
      }),
    ).not.toThrow();
  });

  it("an unreadable file (permissions revoked) degrades instead of crashing", () => {
    mkdirSync(join(dir, "e2e"), { recursive: true });
    const target = join(dir, "e2e", "locked.spec.ts");
    writeFileSync(target, "it('x', () => { expect(1).toBe(1); });");
    try {
      chmodSync(target, 0o000);
    } catch {
      // chmod semantics differ enough across platforms that failing to
      // revoke permissions isn't itself a finding — skip gracefully.
      return;
    }
    try {
      const result = runScan({
        target: dir,
        json: true,
        verbose: true,
        maxDurationMs: 10_000,
        scopeChanged: false,
        format: "json",
      });
      // Either it was skipped honestly, or the OS let it through anyway
      // (root/Administrator) — both are fine. A thrown exception is not.
      expect(result).toBeDefined();
    } finally {
      chmodSync(target, 0o644);
    }
  });

  it("a directory nested far deeper than any real test suite does not hang", () => {
    let deep = dir;
    for (let i = 0; i < 60; i++) {
      deep = join(deep, `level-${i}`);
    }
    mkdirSync(deep, { recursive: true });
    writeFileSync(
      join(deep, "deep.spec.ts"),
      "it('x', () => { expect(1).toBe(1); });",
    );
    const start = performance.now();
    expect(() =>
      runScan({
        target: dir,
        json: true,
        verbose: true,
        maxDurationMs: 10_000,
        scopeChanged: false,
        format: "json",
      }),
    ).not.toThrow();
    expect(performance.now() - start).toBeLessThan(10_000);
  });

  it("a symlink loop does not hang or crash the scan (skips if unsupported)", () => {
    mkdirSync(join(dir, "e2e"), { recursive: true });
    writeFileSync(
      join(dir, "e2e", "real.spec.ts"),
      "it('x', () => { expect(1).toBe(1); });",
    );
    const loopPath = join(dir, "e2e", "loop");
    try {
      symlinkSync(dir, loopPath, "junction");
    } catch {
      // Symlink/junction creation needs elevated privileges on some
      // Windows configurations — not this test's concern to require.
      return;
    }
    const start = performance.now();
    expect(() =>
      runScan({
        target: dir,
        json: true,
        verbose: true,
        maxDurationMs: 10_000,
        scopeChanged: false,
        format: "json",
      }),
    ).not.toThrow();
    expect(
      performance.now() - start,
      "a self-referential symlink caused unbounded recursion",
    ).toBeLessThan(10_000);
  });
});

describe("encoding hostility: non-UTF8 and mixed line endings never crash", () => {
  it("a UTF-16LE encoded file degrades honestly instead of throwing", () => {
    mkdirSync(join(dir, "e2e"), { recursive: true });
    const text = "it('x', () => { expect(1).toBe(1); });";
    const utf16le = Buffer.from(text, "utf16le");
    const bom = Buffer.from([0xff, 0xfe]);
    writeFileSync(
      join(dir, "e2e", "utf16.spec.ts"),
      Buffer.concat([bom, utf16le]),
    );
    expect(() =>
      runScan({
        target: dir,
        json: true,
        verbose: true,
        maxDurationMs: 10_000,
        scopeChanged: false,
        format: "json",
      }),
    ).not.toThrow();
  });

  it("a UTF-8 BOM-prefixed file scans normally", () => {
    mkdirSync(join(dir, "e2e"), { recursive: true });
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    const body = Buffer.from(
      "it.only('x', () => { expect(true).toBe(true); });",
      "utf8",
    );
    writeFileSync(join(dir, "e2e", "bom.spec.ts"), Buffer.concat([bom, body]));
    expect(() =>
      runScan({
        target: dir,
        json: true,
        verbose: true,
        maxDurationMs: 10_000,
        scopeChanged: false,
        format: "json",
      }),
    ).not.toThrow();
  });

  it("mixed CRLF/LF/CR line endings in one file do not crash any rule", () => {
    const mixed =
      "it.only('x', () => {\r\n" +
      "  expect(true).toBe(true);\n" +
      "  // comment\r" +
      "});\r\n";
    for (const rule of RULES) {
      if (rule.appliesTo !== "test-files") continue;
      expect(
        () => rule.run({ path: "mixed.spec.ts", text: mixed }),
        rule.id,
      ).not.toThrow();
    }
  });
});
