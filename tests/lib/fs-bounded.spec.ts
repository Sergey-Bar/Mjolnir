import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readFileBounded } from "../../src/lib/fs-bounded.js";

describe("readFileBounded", () => {
  it("reads a regular file within the byte limit", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-bounded-"));
    try {
      const file = join(dir, "input.txt");
      writeFileSync(file, "hello", "utf8");
      const result = readFileBounded(file, 5);
      expect(result).toEqual({ ok: true, data: Buffer.from("hello") });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects a file exceeding the byte limit without returning data", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-bounded-"));
    try {
      const file = join(dir, "large.txt");
      writeFileSync(file, "too large", "utf8");
      expect(readFileBounded(file, 3)).toEqual({
        ok: false,
        reason: "too-large",
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects a directory or missing path", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-bounded-"));
    try {
      expect(readFileBounded(dir, 100)).toEqual({
        ok: false,
        reason: "unreadable",
      });
      expect(readFileBounded(join(dir, "missing"), 100)).toEqual({
        ok: false,
        reason: "unreadable",
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects a symlink path", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-bounded-"));
    const outside = mkdtempSync(join(tmpdir(), "mjolnir-bounded-outside-"));
    try {
      const target = join(outside, "secret.txt");
      const link = join(dir, "link.txt");
      writeFileSync(target, "secret", "utf8");
      try {
        symlinkSync(target, link, "file");
      } catch {
        return;
      }
      expect(readFileBounded(link, 100)).toEqual({
        ok: false,
        reason: "symlink",
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
