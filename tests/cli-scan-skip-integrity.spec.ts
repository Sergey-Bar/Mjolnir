/**
 * Scan skip honesty under simulated I/O failure: a file whose stat fails
 * during discovery and a file whose read fails after discovery must both
 * be counted as skipped — never silently dropped — and the scan must
 * report `partial: true` with the frozen partial exit code 2.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const statSync = ((path: string, ...rest: unknown[]) => {
    if (String(path).endsWith("ghost.spec.ts")) {
      throw new Error("stat failed (simulated)");
    }
    return (actual.statSync as unknown as (...a: unknown[]) => unknown)(
      path,
      ...rest,
    );
  }) as typeof actual.statSync;
  const readFileSync = ((path: string, ...rest: unknown[]) => {
    if (String(path).endsWith("locked.spec.ts")) {
      throw new Error("read failed (simulated)");
    }
    return (actual.readFileSync as unknown as (...a: unknown[]) => unknown)(
      path,
      ...rest,
    );
  }) as typeof actual.readFileSync;
  return { ...actual, statSync, readFileSync };
});

import { runScanCommand } from "../src/cli.js";

let dir: string;
let origCwd: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-cli-skip-"));
  origCwd = process.cwd();
});
afterEach(() => {
  process.chdir(origCwd);
  rmSync(dir, { recursive: true, force: true });
});

describe("skip accounting under I/O failure", () => {
  it("counts stat-failed and read-failed files as skipped and exits 2 (partial)", async () => {
    mkdirSync(join(dir, "e2e"), { recursive: true });
    writeFileSync(
      join(dir, "e2e", "ghost.spec.ts"),
      "it('ghost', () => {});\n",
    );
    writeFileSync(
      join(dir, "e2e", "locked.spec.ts"),
      "it('locked', () => {});\n",
    );
    writeFileSync(
      join(dir, "e2e", "real.spec.ts"),
      "it('real', () => { expect(1).toBe(1); });\n",
    );
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
    };
    expect(result.partial).toBe(true);
    expect(result.analysisStatus.discovery).toBe("complete");
    expect(result.analysisStatus.rules).toBe("complete");
    expect(result.analysisStatus.skippedFiles).toBe(2);
    expect(result.analysisStatus.truncationReasons).toBeUndefined();
  });
});
