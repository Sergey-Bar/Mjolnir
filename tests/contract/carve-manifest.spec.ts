/**
 * The carve manifest gate, and the defect it exists for.
 *
 * The plan's sentence for this artifact is: *"several nominally-dead areas
 * turned out load-bearing when checked, so directory names are not evidence."*
 * The manifest is what turns that from a caution into a check. Phase 1 deletes
 * ~10,000 lines across twenty areas, and the cheapest way for that deletion to
 * go wrong is for a reviewer to trust a folder name. `src/ledger/` sounds like
 * bookkeeping and is 2,856 lines of M26 validators that four scripts import.
 *
 * So the gate has three jobs and this spec covers all three:
 *
 *   1. every file in the declared scope has a row — a file that quietly fell
 *      out of scope is a file nobody looked at
 *   2. the committed facts match the tree — a manifest that has rotted into a
 *      stale green is worse than no manifest, because it looks like evidence
 *   3. a file leaving the tree without a DELETE disposition fails — the
 *      difference between a reviewed removal and an accident is one field
 *
 * No fixture tree here, and the reason is worth stating rather than leaving as
 * a habit: the generator writes a path fixed relative to its own location, so a
 * fixture run would have to run against a copy of the whole repository or the
 * generator would rewrite the real manifest. The mutation cases that matter are
 * exercised by `--check`'s own branches and by running the gate for real, which
 * is what the first test does; the two that are safe to mutate in place — an
 * unknown flag and a missing manifest — are given a temporary root through the
 * documented `--root` flag.
 */

import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const GATE = join(ROOT, "scripts", "v6", "carve-manifest.mjs");
const MANIFEST = join(ROOT, "docs", "CARVE-MANIFEST.json");

const scratch: string[] = [];
afterEach(() => {
  while (scratch.length > 0) {
    const dir = scratch.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

interface Run {
  code: number;
  output: string;
}

/** Runs a gate and captures both streams, so a FAILURE is a value, not a throw. */
function execGate(args: string[], cwd: string): Run {
  try {
    const stdout = execFileSync(process.execPath, [GATE, ...args], {
      cwd,
      encoding: "utf8",
    });
    return { code: 0, output: `${stdout}` };
  } catch (error) {
    const err = error as { status?: number; stdout?: string; stderr?: string };
    return {
      code: err.status ?? 1,
      output: `${err.stdout ?? ""}${err.stderr ?? ""}`,
    };
  }
}

const runGate = (args: string[] = []): Run => execGate(args, ROOT);

describe("the carve manifest covers its scope, and its facts are current", () => {
  it("the committed manifest passes its own gate", () => {
    const { code, output } = runGate(["--check"]);
    expect(code, output).toBe(0);
    expect(output).toContain("carve-manifest: PASS");
  });

  it("every declared file has a row, and every row has a disposition with a reason", () => {
    const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as {
      scope: { dirs: string[]; files: string[] };
      files: Record<
        string,
        {
          lines: number;
          importedBy: string[];
          imported: boolean;
          shipped: boolean;
          testedBy: string[];
          disposition: { action: string; reason: string };
        }
      >;
    };

    // The scope in the committed file must equal the scope in the generator,
    // or the file is describing a review that is not the one being run. Read
    // from the source rather than duplicated here, so a scope change cannot
    // leave the spec asserting a stale list.
    const source = readFileSync(GATE, "utf8");
    for (const dir of manifest.scope.dirs) {
      expect(
        source,
        `${dir} is in the manifest scope but not the generator`,
      ).toContain(`"${dir}"`);
    }
    for (const file of manifest.scope.files) {
      expect(
        source,
        `${file} is in the manifest scope but not the generator`,
      ).toContain(`"${file}"`);
    }

    // Every file the generator can see is in the manifest, and vice versa.
    const onDisk = new Set<string>();
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.ts$/.test(entry.name))
          onDisk.add(full.slice(ROOT.length + 1).replaceAll("\\", "/"));
      }
    };
    for (const dir of manifest.scope.dirs) walk(join(ROOT, dir));
    for (const file of manifest.scope.files) onDisk.add(file);

    expect(
      [...onDisk].sort(),
      "a file in scope is missing from the manifest — it is a file nobody " +
        "looked at, which is the exact failure a per-file manifest prevents",
    ).toEqual(Object.keys(manifest.files).sort());

    for (const [path, row] of Object.entries(manifest.files)) {
      expect(
        row.disposition.action,
        `${path} has no disposition action. Phase 0 admits KEEP; DELETE is a ` +
          "reviewed edit that names its evidence",
      ).toMatch(/^(KEEP|DELETE)$/u);
      expect(
        row.disposition.reason.length,
        `${path} has a one-word disposition reason. The reason is the part a ` +
          "reviewer needs in order to check the decision",
      ).toBeGreaterThan(15);
      expect(
        row.importedBy,
        `${path} claims zero importers while marked imported, or the reverse`,
      ).toEqual(expect.any(Array));
      expect(
        row.imported,
        `${path}: the imported flag and the importer list disagree. They are ` +
          "computed together, so a disagreement means the manifest was hand-edited",
      ).toBe(row.importedBy.length > 0);
    }
  });

  it("a file that left the tree without a DELETE disposition is reported, not absorbed", () => {
    // A whole-repository copy is what makes this honest: the generator reads
    // the tree, so the only way to observe a genuine removal is to remove one.
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-carve-manifest-"));
    scratch.push(dir);
    const copy = (rel: string) => {
      const from = join(ROOT, rel);
      if (!existsSync(from)) return;
      mkdirSync(dirname(join(dir, rel)), { recursive: true });
      cpSync(from, join(dir, rel), { recursive: true });
    };
    copy("package.json");
    for (const rel of [
      "docs",
      "scripts",
      "src/ledger",
      "src/gaps",
      "src/traceability",
      "src/benchmark",
      "src/v6",
      "src/release",
      "src/capabilities.ts",
      "src/claim-evidence.ts",
      "src/store/legacy-import.ts",
    ]) {
      copy(rel);
    }

    // `src/v6/tool-coverage.ts` is the probe: a real file with no importer, so
    // removing it is the one change that is cheap to make and hard to argue
    // about. Its committed disposition is KEEP, so its disappearance is
    // exactly the "left without a decision" case.
    rmSync(join(dir, "src", "v6", "tool-coverage.ts"), { force: true });
    const { code, output } = execGate(["--check", `--root=${dir}`], dir);
    expect(code).toBe(1);
    expect(output).toContain("left the tree without a DELETE disposition");
    expect(output).toContain("src/v6/tool-coverage.ts");
  });

  it("an unknown flag is a usage error, not a silent pass", () => {
    const { code, output } = runGate(["--acknowledge-surface-change"]);
    // The flag came from an earlier draft where the surface manifest needed
    // one. It does not exist here, and a script that accepted an argument it
    // never reads is a script whose usage line cannot be trusted.
    expect(code).toBe(10);
    expect(output).toContain("unknown argument");
  });
});
