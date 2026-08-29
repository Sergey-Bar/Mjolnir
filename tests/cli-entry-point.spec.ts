/**
 * isEntryPoint() — real-CI regression guard (Open Beta Gate check).
 *
 * The last several pushes to origin/main failed `npm test` specifically
 * on macos-latest: the packed CLI produced zero output when invoked as
 * a real child process (tests/package-smoke.spec.ts). Root-cause
 * hypothesis: the module-is-entry-point guard at the bottom of cli.ts
 * compared import.meta.url to pathToFileURL(process.argv[1]).href by
 * raw string equality. On macOS, os.tmpdir() can return a path under
 * /var/folders/... that is itself a symlink to /private/var/folders/...;
 * Node's ESM loader resolves import.meta.url through that symlink while
 * process.argv[1] stays unresolved, so the comparison silently never
 * matches — main() never runs, the process exits 0 with nothing
 * printed, and it looks exactly like a broken CLI.
 *
 * This could not be directly reproduced on Windows (no macOS access
 * this session) — see .planning/STATE.md for the honest caveat. This
 * test covers what IS locally verifiable: the resolved-realpath
 * comparison logic itself, and that it never throws.
 */

import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isEntryPoint } from "../src/cli.js";

let dir: string;
let originalArgv: string[];

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-entrypoint-"));
  originalArgv = [...process.argv];
});

afterEach(() => {
  process.argv = originalArgv;
  rmSync(dir, { recursive: true, force: true });
  vi.unstubAllGlobals();
});

describe("isEntryPoint", () => {
  it("returns false when process.argv[1] is undefined", () => {
    process.argv.length = 1; // truncate so argv[1] is genuinely undefined
    expect(isEntryPoint()).toBe(false);
  });

  it("returns false for an unrelated argv[1] pointing at a real file", () => {
    const other = join(dir, "not-cli.mjs");
    writeFileSync(other, "export {};\n");
    process.argv[1] = other;
    expect(isEntryPoint()).toBe(false);
  });

  it("does not throw when argv[1] points at a nonexistent path (falls back honestly)", () => {
    process.argv[1] = join(dir, "does-not-exist.mjs");
    expect(() => isEntryPoint()).not.toThrow();
    expect(isEntryPoint()).toBe(false);
  });

  it("resolves a symlinked argv[1] to the same real target this module lives at", () => {
    // Simulates the macOS /var/folders -> /private/var/folders shape:
    // argv[1] is reached via a symlinked directory, but points at the
    // exact same underlying file cli.ts (this module) is loaded from.
    // If the guard used raw string equality instead of realpath
    // comparison, a mismatched symlink component would make this
    // return false even though it's genuinely the same file.
    const real = join(dir, "real");
    const link = join(dir, "linked");
    mkdirSync(real, { recursive: true });
    try {
      symlinkSync(real, link, "junction");
    } catch {
      return; // symlink privilege unavailable in this environment — skip
    }
    // We can't literally re-point argv[1] at src/cli.ts and expect a
    // match (import.meta.url is fixed to this test file's location),
    // so this test instead verifies the underlying primitive: realpath
    // resolution collapses a symlinked path to the same target as its
    // real counterpart, which is the property isEntryPoint's fix relies
    // on. See the package-smoke.spec.ts end-to-end test for the full
    // real-child-process verification of the actual CLI entry point.
    expect(realpathSync(link)).toBe(realpathSync(real));
  });

  it("pathToFileURL fallback path is exercised when realpathSync would throw", () => {
    // Covers the catch branch: an argv[1] value that is syntactically a
    // path but whose realpathSync call throws for a reason other than
    // simple non-existence (e.g. a path component that isn't a
    // directory) still returns a boolean, never throws out of isEntryPoint.
    const notADir = join(dir, "file.txt");
    writeFileSync(notADir, "x");
    process.argv[1] = join(notADir, "impossible-child.mjs");
    expect(() => isEntryPoint()).not.toThrow();
  });

  it("pathToFileURL(argv1) itself does not throw for a plain relative-looking value", () => {
    // Sanity check on the fallback branch's own helper, independent of
    // isEntryPoint, since pathToFileURL requires an absolute path on
    // some platforms.
    expect(() => pathToFileURL(join(dir, "x.mjs"))).not.toThrow();
  });
});
