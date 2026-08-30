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
import { describe, expect, it } from "vitest";

import {
  DEFAULT_IGNORES,
  createIgnoreMatcher,
  globToRegExp,
  isDefaultIgnored,
  isLintFixtureDir,
} from "../src/discovery/ignores.js";

describe("globToRegExp (anchored primitive)", () => {
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

describe("createIgnoreMatcher — defaults", () => {
  it("matches the built-in defaults with no extra config", () => {
    const matcher = createIgnoreMatcher("/definitely/not/a/root");
    expect(matcher.isIgnored("node_modules/foo/index.js")).toBe(true);
    expect(matcher.isIgnored("src/app.ts")).toBe(false);
  });

  it("normalizes Windows separators before matching", () => {
    const matcher = createIgnoreMatcher("/definitely/not/a/root");
    expect(matcher.isIgnored("node_modules\\foo\\index.js")).toBe(true);
  });

  it("matches a bare-name default (package-lock.json) at any depth", () => {
    const matcher = createIgnoreMatcher("/definitely/not/a/root");
    expect(matcher.isIgnored("package-lock.json")).toBe(true);
    expect(matcher.isIgnored("packages/app/package-lock.json")).toBe(true);
  });
});

describe("createIgnoreMatcher — .mjolnirignore and config exclude", () => {
  it("honors .mjolnirignore patterns, ignoring blanks and # comments", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-ignores-"));
    try {
      writeFileSync(
        join(dir, ".mjolnirignore"),
        "# a comment\n\n   \nlegacy/**\n",
      );
      const matcher = createIgnoreMatcher(dir);
      expect(matcher.isIgnored("legacy/old.spec.ts")).toBe(true);
      expect(matcher.isIgnored("modern/new.spec.ts")).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("honors mjolnir.config.json `exclude` patterns", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-ignores-"));
    try {
      writeFileSync(
        join(dir, "mjolnir.config.json"),
        JSON.stringify({ exclude: ["examples/**"] }),
      );
      const matcher = createIgnoreMatcher(dir);
      expect(matcher.isIgnored("examples/demo/x.spec.ts")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("survives a malformed config without throwing and keeps the defaults", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-ignores-"));
    try {
      writeFileSync(join(dir, "mjolnir.config.json"), "{ not valid json");
      const matcher = createIgnoreMatcher(dir);
      expect(matcher.isIgnored("node_modules/x.js")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("ignores a non-array `exclude` value", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-ignores-"));
    try {
      writeFileSync(
        join(dir, "mjolnir.config.json"),
        JSON.stringify({ exclude: "examples/**" }),
      );
      const matcher = createIgnoreMatcher(dir);
      expect(matcher.isIgnored("examples/demo/x.spec.ts")).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("re-resolves on every call — no cross-root state leakage (audit R-8)", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-ignores-"));
    const other = mkdtempSync(join(tmpdir(), "mjolnir-ignores-"));
    try {
      writeFileSync(join(dir, ".mjolnirignore"), "first/**\n");
      const first = createIgnoreMatcher(dir);
      const second = createIgnoreMatcher(other);
      expect(first.isIgnored("first/x.ts")).toBe(true);
      // The other root has no .mjolnirignore — the first root's patterns
      // must not leak into it (the old module-global cache did exactly that).
      expect(second.isIgnored("first/x.ts")).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(other, { recursive: true, force: true });
    }
  });
});

describe("gitignore behaviors (audit R-10)", () => {
  const dir = () => mkdtempSync(join(tmpdir(), "mjolnir-ignores-git-"));

  it("a bare name matches at any depth, like gitignore", () => {
    const d = dir();
    try {
      writeFileSync(join(d, ".mjolnirignore"), "node_modules\n");
      const matcher = createIgnoreMatcher(d);
      expect(matcher.isIgnored("node_modules")).toBe(true);
      expect(matcher.isIgnored("node_modules/foo/index.js")).toBe(true);
      expect(matcher.isIgnored("a/b/node_modules/c.js")).toBe(true);
      expect(matcher.isIgnored("a/node_modules.js")).toBe(false);
      expect(matcher.isIgnored("a/mynode_modules/x.js")).toBe(false);
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
  });

  it("`!pattern` negates, and the LAST matching pattern wins", () => {
    const d = dir();
    try {
      writeFileSync(
        join(d, ".mjolnirignore"),
        "vendor/**\n!vendor/keep/**\nvendor/keep/drop/**\n",
      );
      const matcher = createIgnoreMatcher(d);
      expect(matcher.isIgnored("vendor/x.js")).toBe(true);
      expect(matcher.isIgnored("vendor/keep/a.spec.ts")).toBe(false);
      // Later pattern re-ignores inside the negated subtree.
      expect(matcher.isIgnored("vendor/keep/drop/b.spec.ts")).toBe(true);
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
  });

  it("a negated pattern can un-ignore a built-in default", () => {
    const d = dir();
    try {
      writeFileSync(join(d, ".mjolnirignore"), "!coverage/**\n");
      const matcher = createIgnoreMatcher(d);
      expect(matcher.isIgnored("coverage/lcov.info")).toBe(false);
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
  });

  it("DEFAULT_IGNORES keeps its anchored patterns working unchanged", () => {
    const matcher = createIgnoreMatcher("/definitely/not/a/root");
    for (const pat of DEFAULT_IGNORES) {
      expect(typeof pat).toBe("string");
    }
    expect(matcher.isIgnored("coverage/lcov.info")).toBe(true);
    expect(matcher.isIgnored("**/__fixtures__/nested/a.ts")).toBe(true);
  });
});

describe("isDefaultIgnored (defaults-only convenience)", () => {
  it("matches defaults without any per-root resolution", () => {
    expect(isDefaultIgnored("node_modules/foo/index.js")).toBe(true);
    expect(isDefaultIgnored("src/app.ts")).toBe(false);
  });
});

describe("isLintFixtureDir", () => {
  it("is true for a directory holding both must-fire/ and must-not-fire/", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-ignores-fixture-"));
    try {
      mkdirSync(join(dir, "QA-XX-001", "must-fire"), { recursive: true });
      mkdirSync(join(dir, "QA-XX-001", "must-not-fire"), { recursive: true });
      expect(isLintFixtureDir(join(dir, "QA-XX-001"))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("is false when only one of the two sibling dirs is present", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-ignores-fixture-"));
    try {
      mkdirSync(join(dir, "half", "must-fire"), { recursive: true });
      expect(isLintFixtureDir(join(dir, "half"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("is false (never throws) for a path that does not exist", () => {
    expect(isLintFixtureDir(join(tmpdir(), "nope", "nope"))).toBe(false);
  });
});
