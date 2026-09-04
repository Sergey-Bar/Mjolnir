/**
 * Discovery file-cap honesty: when an adapter hits its discovery budget
 * the truncation must be counted, named, and reported as partial — with
 * duplicate reasons deduplicated but every skipped file still counted.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/discovery/ignores.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/discovery/ignores.js")>();
  return {
    ...actual,
    LIMITS: { ...actual.LIMITS, maxFilesPerAdapter: 1 },
  };
});

import { runScanCommand } from "../../src/cli.js";

let dir: string;
let origCwd: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-cli-cap-"));
  origCwd = process.cwd();
});
afterEach(() => {
  process.chdir(origCwd);
  rmSync(dir, { recursive: true, force: true });
});

const CLEAN = "it('a', () => { expect(1 + 1).toBe(2); });\n";
const CLEAN_PY = "def test_one():\n    assert 1 + 1 == 2\n";

describe("discovery file-cap truncation", () => {
  it("names the capped adapter and the walk-level cap, exits 2 (partial)", async () => {
    // Every language bucket must reach the cap (1) before the walk-level
    // `isFull` check can fire in the subdirectories.
    writeFileSync(join(dir, "a.spec.ts"), CLEAN);
    writeFileSync(join(dir, "b.spec.ts"), CLEAN);
    writeFileSync(join(dir, "c.spec.ts"), CLEAN);
    writeFileSync(join(dir, "test_one.py"), CLEAN_PY);
    writeFileSync(join(dir, "OneTest.java"), "public class OneTest {}\n");
    writeFileSync(join(dir, "OneTests.cs"), "public class OneTests {}\n");
    mkdirSync(join(dir, "xdir"), { recursive: true });
    writeFileSync(join(dir, "xdir", "two.spec.ts"), CLEAN);
    mkdirSync(join(dir, "zdir"), { recursive: true });
    writeFileSync(join(dir, "zdir", "three.spec.ts"), CLEAN);

    const out: string[] = [];
    const err: string[] = [];
    const code = await runScanCommand([dir, "--json"], {
      out: (...p: unknown[]) => out.push(p.map(String).join(" ")),
      err: (...p: unknown[]) => err.push(p.map(String).join(" ")),
    });
    expect(code).toBe(2);
    const result = JSON.parse(out.join("\n")) as {
      partial: boolean;
      analysisStatus: {
        discovery: string;
        rules: string;
        skippedFiles: number;
        truncationReasons?: string[];
      };
      testFileCount: number;
    };
    expect(result.partial).toBe(true);
    expect(result.analysisStatus.discovery).toBe("partial");
    // b.spec.ts and c.spec.ts trip the adapter cap (named per adapter);
    // xdir trips the walk-level cap; zdir's hit is deduplicated by
    // reason but the directories are still traversed honestly.
    expect(result.analysisStatus.truncationReasons).toEqual([
      "file-cap",
      "file-cap:typescript",
    ]);
    // b via the adapter cap, xdir via the walk cap; c and zdir are
    // deduplicated by reason and do not double-count.
    expect(result.analysisStatus.skippedFiles).toBe(2);
    // a.spec.ts plus one file per other language.
    expect(result.testFileCount).toBe(4);
  });
});
