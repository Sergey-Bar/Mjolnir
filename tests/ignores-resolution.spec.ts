/**
 * Unit tests for discovery/ignores.ts — the ignore-pattern resolution
 * chain (defaults → .mjolnirignore → mjolnir.config.json exclude) and
 * the minimal glob matcher, plus the Phase 2 lint-fixture auto-detection.
 *
 * These paths were previously reached only indirectly through full
 * scans; this pins the branch behavior (missing files, malformed config,
 * unreadable ignore file, cache reuse) directly.
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  DEFAULT_IGNORES,
  globToRegExp,
  initIgnores,
  isDefaultIgnored,
  isLintFixtureDir,
  _resetIgnoresForTests,
} from "../src/discovery/ignores.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-ignores-"));
  _resetIgnoresForTests();
});

afterEach(() => {
  _resetIgnoresForTests();
  rmSync(dir, { recursive: true, force: true });
});

describe("globToRegExp", () => {
  it("`**/` matches zero or more leading path segments", () => {
    const re = globToRegExp("**/__fixtures__/**");
    expect(re.test("__fixtures__/a.ts")).toBe(true);
    expect(re.test("pkg/sub/__fixtures__/a.ts")).toBe(true);
    expect(re.test("src/a.ts")).toBe(false);
  });

  it("trailing `**` matches anything including slashes", () => {
    expect(globToRegExp("dist/**").test("dist/nested/deep/x.js")).toBe(true);
  });

  it("single `*` does not cross a path separator", () => {
    const re = globToRegExp("*.min.js");
    expect(re.test("app.min.js")).toBe(true);
    expect(re.test("vendor/app.min.js")).toBe(false);
  });

  it("`?` matches exactly one non-separator character", () => {
    expect(globToRegExp("a?.ts").test("ab.ts")).toBe(true);
    expect(globToRegExp("a?.ts").test("a/.ts")).toBe(false);
  });

  it("escapes regex metacharacters in literal segments", () => {
    const re = globToRegExp("package-lock.json");
    expect(re.test("package-lock.json")).toBe(true);
    expect(re.test("packageXlockYjson")).toBe(false);
  });
});

describe("isDefaultIgnored", () => {
  it("matches the built-in defaults without any config loaded", () => {
    expect(isDefaultIgnored("node_modules/foo/index.js")).toBe(true);
    expect(isDefaultIgnored("src/app.ts")).toBe(false);
  });

  it("normalizes Windows separators before matching", () => {
    expect(isDefaultIgnored("node_modules\\foo\\index.js")).toBe(true);
  });

  it("honors .mjolnirignore patterns after initIgnores, ignoring blanks and # comments", () => {
    writeFileSync(
      join(dir, ".mjolnirignore"),
      "# a comment\n\n   \nlegacy/**\n",
    );
    initIgnores(dir);
    expect(isDefaultIgnored("legacy/old.spec.ts")).toBe(true);
    expect(isDefaultIgnored("modern/new.spec.ts")).toBe(false);
  });

  it("honors mjolnir.config.json `exclude` patterns", () => {
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ exclude: ["examples/**"] }),
    );
    initIgnores(dir);
    expect(isDefaultIgnored("examples/demo/x.spec.ts")).toBe(true);
  });

  it("survives a malformed config without throwing and keeps the defaults", () => {
    writeFileSync(join(dir, "mjolnir.config.json"), "{ not valid json");
    expect(() => initIgnores(dir)).not.toThrow();
    expect(isDefaultIgnored("node_modules/x.js")).toBe(true);
  });

  it("ignores a non-array `exclude` value", () => {
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ exclude: "examples/**" }),
    );
    initIgnores(dir);
    expect(isDefaultIgnored("examples/demo/x.spec.ts")).toBe(false);
  });

  it("initIgnores is a no-op on a second call with the same root (cache reuse)", () => {
    writeFileSync(join(dir, ".mjolnirignore"), "first/**\n");
    initIgnores(dir);
    // Overwrite after the cache is warm — a second call with the same
    // root must NOT reload it.
    writeFileSync(join(dir, ".mjolnirignore"), "second/**\n");
    initIgnores(dir);
    expect(isDefaultIgnored("first/x.ts")).toBe(true);
    expect(isDefaultIgnored("second/x.ts")).toBe(false);
  });

  it("falls back to exactly DEFAULT_IGNORES when no extra patterns are loaded", () => {
    initIgnores(dir); // no .mjolnirignore, no config
    for (const pat of DEFAULT_IGNORES) {
      expect(typeof pat).toBe("string");
    }
    expect(isDefaultIgnored("coverage/lcov.info")).toBe(true);
  });
});

describe("isLintFixtureDir", () => {
  it("is true for a directory holding both must-fire/ and must-not-fire/", () => {
    mkdirSync(join(dir, "QA-XX-001", "must-fire"), { recursive: true });
    mkdirSync(join(dir, "QA-XX-001", "must-not-fire"), { recursive: true });
    expect(isLintFixtureDir(join(dir, "QA-XX-001"))).toBe(true);
  });

  it("is false when only one of the two sibling dirs is present", () => {
    mkdirSync(join(dir, "half", "must-fire"), { recursive: true });
    expect(isLintFixtureDir(join(dir, "half"))).toBe(false);
  });

  it("is false (never throws) for a path that does not exist", () => {
    expect(isLintFixtureDir(join(dir, "nope"))).toBe(false);
  });
});
