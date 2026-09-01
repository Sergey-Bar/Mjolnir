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
    expect(matcher.isIgnored("__fixtures__/nested/a.ts")).toBe(true);
  });

  // Bug Map M-01: DEFAULT_IGNORES uses bare names, so the classic
  // build/dependency directory names are ignored at ANY depth — not just
  // at the scan root (the old anchored `X/**` forms missed
  // `packages/app/node_modules` etc. in monorepos).
  describe("M-01 bare-name defaults — nested depth", () => {
    it("ignores monorepo-nested node_modules/dist/build at any depth", () => {
      const matcher = createIgnoreMatcher("/definitely/not/a/root");
      expect(matcher.isIgnored("packages/app/node_modules/x.spec.ts")).toBe(
        true,
      );
      expect(matcher.isIgnored("packages/app/dist/a.js")).toBe(true);
      expect(matcher.isIgnored("services/api/build/x.py")).toBe(true);
      expect(matcher.isIgnored("packages/app/__fixtures__/a.ts")).toBe(true);
      expect(matcher.isIgnored("packages/app/testdata/data.json")).toBe(true);
    });

    it("ignores the bare directory itself, at any depth", () => {
      const matcher = createIgnoreMatcher("/definitely/not/a/root");
      expect(matcher.isIgnored("packages/app/node_modules")).toBe(true);
      expect(matcher.isIgnored("packages/app/dist")).toBe(true);
    });

    it("a `.cache`-prefixed SIBLING name is not the bare name (boundary)", () => {
      const matcher = createIgnoreMatcher("/definitely/not/a/root");
      // `*` wildcards cannot appear in a bare name; `.cache` matches only
      // the exact segment, so `.cachex` is a different name.
      expect(matcher.isIgnored("a/.cachex/x.ts")).toBe(false);
    });
  });

  // The bare-name matcher compiles to `(?:^|/)name(?:/|$)` — segment-
  // anchored, so a FILENAME lookalike (`src/out.ts`) must never match the
  // `out` directory pattern. Pin it: the matcher is hand-rolled.
  describe("M-01 bare-name defaults — segment-vs-filename boundary", () => {
    it("does not ignore files whose basename equals a bare name", () => {
      const matcher = createIgnoreMatcher("/definitely/not/a/root");
      expect(matcher.isIgnored("src/out.ts")).toBe(false);
      expect(matcher.isIgnored("src/build.ts")).toBe(false);
      expect(matcher.isIgnored("src/coverage.ts")).toBe(false);
      expect(matcher.isIgnored("foo/node_modules.ts")).toBe(false);
      expect(matcher.isIgnored("vendor.ts")).toBe(false);
    });
  });

  // Bug Map M-04: the dogfood-corpus guard in DEFAULT_IGNORES.
  describe("M-04 corpus cache guard in DEFAULT_IGNORES", () => {
    it("ignores every tests/corpus/.cache* clone dir shape", () => {
      const matcher = createIgnoreMatcher("/definitely/not/a/root");
      // `-kit` suffix: `[^/]*` covers it, and `**` matches the file path.
      expect(matcher.isIgnored("tests/corpus/.cache-kit/x.spec.ts")).toBe(true);
      // `*` matches zero+ chars within one segment: `.cachex` too.
      expect(matcher.isIgnored("tests/corpus/.cachex/x.ts")).toBe(true);
      expect(matcher.isIgnored("tests/corpus/.cache/repo/file.js")).toBe(true);
    });

    it("the `[^/]*` in `.cache*` cannot cross a path-segment boundary", () => {
      const matcher = createIgnoreMatcher("/definitely/not/a/root");
      // A deeper segment starting with `.cache` is NOT covered — the
      // wildcard stops at the `/` it sits next to.
      expect(matcher.isIgnored("tests/corpus/sub/.cache-kit/x.ts")).toBe(false);
    });

    it("does not ignore same-shaped paths without the leading dot", () => {
      const matcher = createIgnoreMatcher("/definitely/not/a/root");
      expect(matcher.isIgnored("tests/corpus/cache-kit/x.ts")).toBe(false);
      expect(matcher.isIgnored("src/app.ts")).toBe(false);
    });
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
