/**
 * Language-adapter discovery-loop internals (Test Hardening Plan —
 * coverage-gap closure). Calls `discoverTestFiles` directly against a
 * hand-built `ScanContext` to reach guards that are impractical to
 * force through a full `runScan` (a real 10,001-file directory, a
 * genuinely-expired deadline at the exact right instant, a file that
 * disappears between `readdirSync` and `statSync`).
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

import { pythonAdapter } from "../src/adapters/python.js";
import { typescriptAdapter } from "../src/adapters/typescript.js";
import { githubActionsAdapter } from "../src/adapters/github-actions.js";
import type { ScanContext } from "../src/engine/adapter.js";
import type { Workspace } from "../src/discovery/workspace.js";
import { createIgnoreMatcher, LIMITS } from "../src/discovery/ignores.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-adapter-deep-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function workspaceFor(root: string): Workspace {
  return { root, name: "fixture", packageJson: {}, workspaceGlobs: [] };
}

function ctxFor(
  root: string,
  overrides: Partial<ScanContext> = {},
): ScanContext {
  return {
    workspace: workspaceFor(root),
    testFiles: [],
    deadline: Date.now() + 60_000,
    maxFiles: LIMITS.maxFilesPerAdapter,
    ignoreMatcher: createIgnoreMatcher(dir),
    onSkippedFile: () => {},
    onDiscoveryTruncated: () => {},
    ...overrides,
  };
}

describe("Python adapter: discovery guards", () => {
  it("an already-expired deadline stops discovery immediately (no files found)", () => {
    mkdirSync(join(dir, "tests"), { recursive: true });
    writeFileSync(join(dir, "tests", "test_x.py"), "def test_x():\n    pass\n");
    const ctx = ctxFor(dir, { deadline: Date.now() - 1000 });
    expect(() => pythonAdapter.discoverTestFiles(ctx)).not.toThrow();
    expect(ctx.testFiles).toHaveLength(0);
  });

  it("the 10,000-file cap stops discovery even with room left in the directory", () => {
    mkdirSync(join(dir, "tests"), { recursive: true });
    writeFileSync(join(dir, "tests", "test_x.py"), "def test_x():\n    pass\n");
    const preloaded = Array.from({ length: 10_001 }, (_, i) => `fake-${i}.py`);
    const ctx = ctxFor(dir, { testFiles: preloaded });
    expect(() => pythonAdapter.discoverTestFiles(ctx)).not.toThrow();
    // Cap check happens before scanning this dir — real file never added.
    expect(ctx.testFiles).toHaveLength(10_001);
  });

  it("an unreadable subdirectory is skipped, not fatal to the whole walk", () => {
    const locked = join(dir, "tests", "locked");
    mkdirSync(locked, { recursive: true });
    writeFileSync(join(locked, "test_a.py"), "def test_a():\n    pass\n");
    mkdirSync(join(dir, "tests", "open"), { recursive: true });
    writeFileSync(
      join(dir, "tests", "open", "test_b.py"),
      "def test_b():\n    pass\n",
    );
    let revoked = false;
    try {
      chmodSync(locked, 0o000);
      revoked = true;
    } catch {
      /* unsupported here */
    }
    try {
      const ctx = ctxFor(dir);
      expect(() => pythonAdapter.discoverTestFiles(ctx)).not.toThrow();
      if (revoked) {
        expect(ctx.testFiles.some((f) => f.includes("test_b"))).toBe(true);
      }
    } finally {
      if (revoked) chmodSync(locked, 0o755);
    }
  });

  it("a broken symlink does not crash discovery (dirent.isFile() filters it before stat, so onSkippedFile isn't necessarily called)", () => {
    // Unlike the GitHub Actions adapter (which statSync()s every readdir
    // entry unconditionally), this adapter checks `entry.isFile()` on the
    // withFileTypes dirent first — a broken symlink's dirent reports
    // isFile() === false here, so it's filtered out before ever reaching
    // the statSync race this test originally targeted. The real,
    // still-valuable assertion is that this never throws.
    mkdirSync(join(dir, "tests"), { recursive: true });
    let created = false;
    try {
      symlinkSync(
        join(dir, "tests", "does-not-exist-target.py"),
        join(dir, "tests", "test_ghost.py"),
      );
      created = true;
    } catch {
      /* symlink creation needs elevated privileges on some Windows setups */
    }
    if (!created) return;

    const ctx = ctxFor(dir);
    expect(() => pythonAdapter.discoverTestFiles(ctx)).not.toThrow();
  });
});

describe("TypeScript adapter: detectFrameworks with a malformed package.json", () => {
  it("degrades to unknown frameworks instead of throwing on invalid JSON", () => {
    writeFileSync(join(dir, "package.json"), "{ this is not valid json");
    expect(() => typescriptAdapter.detectFrameworks(dir)).not.toThrow();
    const result = typescriptAdapter.detectFrameworks(dir);
    expect(result.unknown).toBe(true);
    expect(result.frameworks).toEqual([]);
  });
});

describe("TypeScript adapter: discovery guards", () => {
  it("an already-expired deadline stops discovery immediately", () => {
    mkdirSync(join(dir, "e2e"), { recursive: true });
    writeFileSync(join(dir, "e2e", "a.spec.ts"), "it('a', () => {});\n");
    const ctx = ctxFor(dir, { deadline: Date.now() - 1000 });
    expect(() => typescriptAdapter.discoverTestFiles(ctx)).not.toThrow();
    expect(ctx.testFiles).toHaveLength(0);
  });

  it("the 10,000-file cap stops discovery", () => {
    mkdirSync(join(dir, "e2e"), { recursive: true });
    writeFileSync(join(dir, "e2e", "a.spec.ts"), "it('a', () => {});\n");
    const preloaded = Array.from(
      { length: 10_001 },
      (_, i) => `fake-${i}.spec.ts`,
    );
    const ctx = ctxFor(dir, { testFiles: preloaded });
    expect(() => typescriptAdapter.discoverTestFiles(ctx)).not.toThrow();
    expect(ctx.testFiles).toHaveLength(10_001);
  });

  it("an unreadable subdirectory is skipped, not fatal", () => {
    const locked = join(dir, "e2e", "locked");
    mkdirSync(locked, { recursive: true });
    writeFileSync(join(locked, "a.spec.ts"), "it('a', () => {});\n");
    mkdirSync(join(dir, "e2e", "open"), { recursive: true });
    writeFileSync(
      join(dir, "e2e", "open", "b.spec.ts"),
      "it('b', () => {});\n",
    );
    let revoked = false;
    try {
      chmodSync(locked, 0o000);
      revoked = true;
    } catch {
      /* unsupported */
    }
    try {
      const ctx = ctxFor(dir);
      expect(() => typescriptAdapter.discoverTestFiles(ctx)).not.toThrow();
      if (revoked) {
        expect(ctx.testFiles.some((f) => f.includes("b.spec.ts"))).toBe(true);
      }
    } finally {
      if (revoked) chmodSync(locked, 0o755);
    }
  });

  it("a broken symlink does not crash discovery (same dirent-filtering behavior as the Python adapter)", () => {
    mkdirSync(join(dir, "e2e"), { recursive: true });
    let created = false;
    try {
      symlinkSync(
        join(dir, "e2e", "nowhere.spec.ts"),
        join(dir, "e2e", "ghost.spec.ts"),
      );
      created = true;
    } catch {
      /* unsupported here */
    }
    if (!created) return;
    const ctx = ctxFor(dir);
    expect(() => typescriptAdapter.discoverTestFiles(ctx)).not.toThrow();
  });
});

describe("GitHub Actions adapter: discovery guards", () => {
  it("an unreadable .github/workflows directory does not crash discovery", () => {
    const wf = join(dir, ".github", "workflows");
    mkdirSync(wf, { recursive: true });
    writeFileSync(join(wf, "ci.yml"), "on: push\njobs: {}\n");
    let revoked = false;
    try {
      chmodSync(wf, 0o000);
      revoked = true;
    } catch {
      /* unsupported */
    }
    try {
      const ctx = ctxFor(dir);
      expect(() => githubActionsAdapter.discoverTestFiles(ctx)).not.toThrow();
    } finally {
      if (revoked) chmodSync(wf, 0o755);
    }
  });

  it("non-YAML files inside .github/workflows are ignored", () => {
    const wf = join(dir, ".github", "workflows");
    mkdirSync(wf, { recursive: true });
    writeFileSync(join(wf, "README.md"), "# not a workflow\n");
    writeFileSync(join(wf, "ci.yml"), "on: push\njobs: {}\n");
    const ctx = ctxFor(dir);
    githubActionsAdapter.discoverTestFiles(ctx);
    expect(ctx.testFiles.some((f) => f.endsWith("README.md"))).toBe(false);
    expect(ctx.testFiles.some((f) => f.endsWith("ci.yml"))).toBe(true);
  });

  it("a workflow file that vanishes between listing and stat is skipped via onSkippedFile", () => {
    const wf = join(dir, ".github", "workflows");
    mkdirSync(wf, { recursive: true });
    let created = false;
    try {
      symlinkSync(join(wf, "nowhere.yml"), join(wf, "ghost.yml"));
      created = true;
    } catch {
      /* unsupported here */
    }
    if (!created) return;
    let onSkippedCalled = false;
    const ctx = ctxFor(dir, { onSkippedFile: () => (onSkippedCalled = true) });
    expect(() => githubActionsAdapter.discoverTestFiles(ctx)).not.toThrow();
    expect(onSkippedCalled).toBe(true);
  });
});
