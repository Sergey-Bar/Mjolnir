/**
 * One existence check, several callers — and each of the three had a hole.
 *
 * Every artifact claim in this repository is a path inside a file. Three
 * validators read those claims and all three asked the same weak question —
 * "is this field a non-empty string?" — so a citation to a module the carve
 * deleted validated clean. This spec pins the shared check AND each caller,
 * because the class of defect was not "the check was wrong", it was "three
 * checks were written and none of them was strong".
 *
 * One of the three callers — the M26 gap ledger's validator — was deleted in
 * 6.0 along with the ledger. Its arm of this spec went with it, because a
 * spec that asserts a retired validator's diagnostics would have to import a
 * module that no longer exists, and the check the arm protected is now
 * enforced by the two callers that remain.
 */

import { describe, expect, it } from "vitest";
import { join } from "node:path";

import {
  assertPathsExist,
  backtickedPaths,
  findMissingPaths,
} from "../../src/lib/path-existence.js";

/** The repository root, resolved from this file rather than from cwd(). */
const ROOT = join(import.meta.dirname, "..", "..");

describe("the shared check", () => {
  it("reports only the claims whose path does not resolve", () => {
    const missing = findMissingPaths(ROOT, [
      { path: "package.json", citedBy: "real" },
      { path: "src/lib/does-not-exist.ts", citedBy: "planted" },
    ]);
    expect(missing).toEqual([
      { path: "src/lib/does-not-exist.ts", citedBy: "planted" },
    ]);
  });

  it("reports the same path cited by two sources, once per source", () => {
    // Two trains citing one dead module is two separate false claims about
    // that file, and the ROADMAP had exactly that shape.
    const missing = findMissingPaths(ROOT, [
      { path: "src/gone.ts", citedBy: "M33" },
      { path: "src/gone.ts", citedBy: "M34" },
    ]);
    expect(missing).toHaveLength(2);
  });

  it("reports one path once when the same source cites it twice", () => {
    const missing = findMissingPaths(ROOT, [
      { path: "src/gone.ts", citedBy: "M33" },
      { path: "src/gone.ts", citedBy: "M33" },
    ]);
    expect(missing).toHaveLength(1);
  });

  it("calls report per missing path so callers keep their own shape", () => {
    const seen: string[] = [];
    assertPathsExist(ROOT, [{ path: "src/a.ts", citedBy: "x" }], (m) =>
      seen.push(`${m.citedBy}:${m.path}`),
    );
    expect(seen).toEqual(["x:src/a.ts"]);
  });
});

describe("backticked paths in rendered markdown", () => {
  it("finds a repo-relative path", () => {
    expect(
      backtickedPaths("see `src/engine/resolution.ts` for details"),
    ).toEqual(["src/engine/resolution.ts"]);
  });

  it("ignores prose, flags, globs and absolute paths", () => {
    const md = [
      "the `gate` is red",
      "run with `--strict`",
      "matches `tests/**/*.spec.ts`",
      "at `/usr/local/bin`",
      "see https://example.com/x.md",
      "one `null` value",
    ].join("\n");
    expect(backtickedPaths(md)).toEqual([]);
  });

  it("ignores a path with spaces — that is prose in backticks", () => {
    expect(backtickedPaths("`the file does not exist here`")).toEqual([]);
  });
});
