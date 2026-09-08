/**
 * The scan-half catch of `runMutationCommand` (master plan P5): when
 * `runScan` itself rejects, the reader surfaces the internal-error path
 * (exit 20) — never a crash, never a gate. Isolated in its own file so
 * the module mock cannot leak into the other mutation specs.
 *
 * The mock is partial: every other pipeline export stays REAL (cli.ts
 * destructures many of them at import time).
 */

import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/engine/scan-pipeline.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/engine/scan-pipeline.js")>();
  return {
    ...actual,
    runScan: () => Promise.reject(new Error("injected scan failure")),
  };
});

import { runMutationCommand } from "../../src/cli.js";

const STRYKER = {
  files: {
    "src/auth.spec.ts": {
      mutants: [
        {
          id: "1",
          mutatorName: "ConditionalExpression",
          status: "Survived",
          location: {
            start: { line: 0, column: 1 },
            end: { line: 0, column: 9 },
          },
        },
      ],
    },
  },
};

let dir: string;
let origCwd: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-mutation-catch-"));
  origCwd = process.cwd();
  process.chdir(dir);
});

afterEach(() => {
  process.chdir(origCwd);
  rmSync(dir, { recursive: true, force: true });
});

describe("runMutationCommand's scan-half catch", () => {
  it("a rejecting runScan surfaces exit 20 via internalErrorMessage", async () => {
    mkdirSync(join(dir, "scannable"), { recursive: true });
    writeFileSync(join(dir, "m.json"), JSON.stringify(STRYKER));
    const out: string[] = [];
    const errs: string[] = [];
    const code = await runMutationCommand(
      [join(dir, "m.json"), "--scan", join(dir, "scannable")],
      {
        out: (...a: unknown[]) => out.push(a.map(String).join(" ")),
        err: (...a: unknown[]) => errs.push(a.map(String).join(" ")),
      },
    );
    expect(code).toBe(20);
    expect(errs.join("\n")).toContain("injected scan failure");
    // The leaderboard already rendered BEFORE the scan half failed —
    // the report half of the command is unaffected.
    expect(out.join("\n")).toContain("MUTATION EVIDENCE — stryker");
  });
});
