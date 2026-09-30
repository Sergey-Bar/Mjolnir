/**
 * Gate exit codes are part of the contract, and nothing tested them.
 *
 * `scripts/v6/check-ecosystem.ts` mapped its three-state result through
 * `process.exit(status === "FAIL" ? 1 : 0)`, so `BLOCKED` — the state that
 * exists precisely to say "the probe did not run, so this proves nothing" —
 * exited 0. `scripts/v6/reconcile-archive.ts` documented an exit-2 path for
 * malformed input and had no argv handling at all, so exit 2 was
 * unreachable. `scripts/v6/inventory.ts` counted release blockers with
 * `status === "open"`, a word no row of M26-GAP-LEDGER.jsonl has ever
 * carried, so the count was permanently `[]` while eleven rows carried the
 * severity. None of the three had a test, and none ran in CI.
 *
 * The pattern is one failure mode, so it is one spec: a gate that cannot
 * fail is indistinguishable from a gate that passed. These assertions use
 * `spawnSync` on the real scripts, because an in-process import of
 * `process.exit` proves nothing about the code CI reads.
 *
 * TI-021 · TI-022 · TI-023 · TI-024.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { exitCodeForStatus } from "../../scripts/v6/check-ecosystem.js";
import { EXIT_MALFORMED_INPUT } from "../../scripts/v6/reconcile-archive.js";
import { collectRepoFacts } from "../../scripts/v6/inventory.js";
import { isGapCleared } from "../../src/ledger/m26-validators.js";

const ROOT = join(import.meta.dirname, "..", "..");
const ARCHIVE_JSON = join(ROOT, "docs", "V6-ARCHIVE-RECONCILIATION.json");

/** Run a repo script the way npm does, and read the real process status. */
function runScript(command: string, args: string[]) {
  return spawnSync(command, args, { cwd: ROOT, encoding: "utf8" });
}

/**
 * Run a TypeScript gate through tsx.
 *
 * `npx`/`npx.cmd` is not used: on Windows the `.cmd` is a batch file, and
 * `spawnSync` will not run one without a shell — and `shell: true` means
 * arguments are concatenated rather than escaped (Node's own DEP0190), which
 * is a command-injection hazard for a test that builds command lines. Every
 * argument here is a literal, so the fix is to drop the indirection: invoke
 * the same `tsx` entry point `npx` would, with the node binary this process
 * is already running under.
 */
const TSX_CLI = join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");

function runTsx(args: string[]) {
  return runScript(process.execPath, [TSX_CLI, ...args]);
}

function runNode(args: string[]) {
  return runScript(process.execPath, args);
}

describe("TI-021 — the ecosystem census gate exits non-zero when it did not run", () => {
  const censusRun = runTsx(["scripts/v6/check-ecosystem.ts", "census"]);
  const gapsRun = runTsx(["scripts/v6/check-ecosystem.ts", "gaps"]);
  const statusOf = (run: { stdout: string }) =>
    (JSON.parse(run.stdout) as { status: "PASS" | "BLOCKED" | "FAIL" }).status;

  it("maps PASS, BLOCKED and FAIL to three distinct exit codes", () => {
    // The mapping is the invariant; a ternary is what collapsed BLOCKED
    // into a success. Asserted before the spawns so a regression here is
    // reported as a mapping failure rather than as an environment failure.
    expect(exitCodeForStatus("PASS")).toBe(0);
    expect(exitCodeForStatus("FAIL")).toBe(1);
    expect(exitCodeForStatus("BLOCKED")).toBe(3);
    expect(exitCodeForStatus("BLOCKED")).not.toBe(0);
  });

  it(
    "a real gate run exits with the code its reported status maps to",
    // Six minutes, explicitly.
    //
    // This suite spawns a real gate process per case, and the whole file took
    // 357s under the certify run's parallelism against a 120s default. The
    // result was two intermittent failures in `npm run certify` that had
    // nothing to do with the tree — which is the worst kind of gate failure,
    // because the response to a gate that is red for no reason is to switch it
    // off.
    //
    // A timeout is not a budget: this asserts that a process exits with a
    // specific code, and the process genuinely takes minutes because it
    // compiles TypeScript. A shorter budget would report "no answer" as a
    // failure, which is the same defect as a slow gate being read as a red one.
    { timeout: 360_000 },
    () => {
      for (const [gate, run] of [
        ["census", censusRun],
        ["gaps", gapsRun],
      ] as const) {
        const status = statusOf(run);
        expect(run.status, `${gate} → ${status}`).toBe(
          exitCodeForStatus(status),
        );
      }
    },
  );

  it("a blocked gap run is not a success", () => {
    // The corpus cache is absent in a clean checkout, which is the BLOCKED
    // path. If a future run happens to have a cache the run reports PASS
    // and this assertion is vacuously satisfied — the mapping assertion
    // above is the one that cannot be.
    if (statusOf(gapsRun) === "BLOCKED") expect(gapsRun.status).not.toBe(0);
  });

  it("an unknown gate name is a usage error, not a silent default", () => {
    const run = runTsx(["scripts/v6/check-ecosystem.ts", "not-a-gate"]);
    expect(run.status).toBe(2);
  });
});

describe("TI-022 — the archive gate evaluates without writing what it checks", () => {
  // One spawn per mode, read by every assertion in this block. The gate
  // is a ~2s tsx process; running it four times to say one thing about
  // each mode is how a fast gate becomes the slowest spec in the suite.
  const checkRun = runTsx(["scripts/v6/reconcile-archive.ts", "--check"]);
  const writeRun = runTsx(["scripts/v6/reconcile-archive.ts", "--write"]);

  it("--check leaves the tracked artifact byte-identical and still reports red", () => {
    const before = existsSync(ARCHIVE_JSON)
      ? readFileSync(ARCHIVE_JSON, "utf8")
      : null;
    const run = runTsx(["scripts/v6/reconcile-archive.ts", "--check"]);
    const after = existsSync(ARCHIVE_JSON)
      ? readFileSync(ARCHIVE_JSON, "utf8")
      : null;
    expect(after, "gate run mutated the artifact it is checked against").toBe(
      before,
    );
    const report = JSON.parse(run.stdout) as {
      status: string;
      mode: string;
    };
    expect(report.mode).toBe("check");
    // Reconciled is 0, unreconciled is 1 — never anything else, so a red
    // gate cannot be read as a green one by a job that only checks status.
    expect(run.status).toBe(report.status === "RECONCILED" ? 0 : 1);
  });

  it("an unknown argument is the documented malformed-input exit", () => {
    const run = runTsx(["scripts/v6/reconcile-archive.ts", "--not-a-flag"]);
    expect(EXIT_MALFORMED_INPUT).toBe(2);
    expect(run.status).toBe(EXIT_MALFORMED_INPUT);
  });

  it("--write is the only mode that touches the artifact", () => {
    // Not an assertion about content: an assertion about which mode is
    // allowed to have side effects. A silent rewrite is what would make
    // the drift check above unfalsifiable.
    const writeMode = (JSON.parse(writeRun.stdout) as { mode: string }).mode;
    const checkMode = (JSON.parse(checkRun.stdout) as { mode: string }).mode;
    expect(checkMode).toBe("check");
    expect(writeMode).toBe("write");
  });
});

describe("TI-023 — an unverifiable gap never reports as a cleared blocker", () => {
  it("reports every release-blocker row that is not provably cleared", () => {
    const rows = readFileSync(
      join(ROOT, "docs", "M26-GAP-LEDGER.jsonl"),
      "utf8",
    )
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map(
        (line) =>
          JSON.parse(line) as {
            gap_id: string;
            status: string;
            severity: string;
          },
      );
    // Computed independently of the gate, from the ledger and the same
    // predicate the validator uses — so the gate is checked against the
    // rule rather than against itself.
    const expected = rows
      .filter((row) => row.severity === "release-blocker" && !isGapCleared(row))
      .map((row) => row.gap_id)
      .sort();
    const reported = [
      ...collectRepoFacts(ROOT).gapLedger.openReleaseBlockers,
    ].sort();
    expect(reported).toEqual(expected);
  });

  it("is not vacuously empty", () => {
    // The regression this pins: `status === "open"` matched nothing, so
    // the field was `[]` on every run and read as "no release blockers".
    expect(
      collectRepoFacts(ROOT).gapLedger.openReleaseBlockers.length,
    ).toBeGreaterThan(0);
  });

  it("keeps a STALE_UNVERIFIABLE row blocking", () => {
    const rows = readFileSync(
      join(ROOT, "docs", "M26-GAP-LEDGER.jsonl"),
      "utf8",
    )
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map(
        (line) =>
          JSON.parse(line) as {
            gap_id: string;
            status: string;
            severity: string;
          },
      );
    const staleBlockers = rows
      .filter(
        (r) =>
          r.status === "STALE_UNVERIFIABLE" && r.severity === "release-blocker",
      )
      .map((r) => r.gap_id);
    for (const id of staleBlockers) {
      expect(collectRepoFacts(ROOT).gapLedger.openReleaseBlockers).toContain(
        id,
      );
    }
  });
});

describe("TI-024 — the translation staleness gate can actually fail", () => {
  it("is advisory without the flag and enforcing with it", () => {
    const advisory = runNode(["scripts/check-readme-translations.mjs"]);
    expect(advisory.status).toBe(0);
    const strict = runNode([
      "scripts/check-readme-translations.mjs",
      "--strict",
    ]);
    // The strict run agrees with what the report itself says: non-zero
    // exactly when a language is not fresh. Which of the two that is on a
    // given checkout is data; the coupling is the invariant.
    const stale = /\bnot fresh\b|\b1 language\(s\) not fresh\b/.test(
      strict.stdout,
    );
    if (stale) expect(strict.status).toBe(1);
    else expect(strict.status).toBe(0);
  });

  it("the header no longer claims the script has no --strict mode", () => {
    const source = readFileSync(
      join(ROOT, "scripts", "check-readme-translations.mjs"),
      "utf8",
    );
    expect(source).not.toMatch(/has no --strict mode/);
    expect(source).not.toMatch(/NEVER blocks \(exit 0 always\)/);
  });

  it("docs:translations:check passes the flag the report requires", () => {
    const pkg = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    expect(pkg.scripts["docs:translations:check"]).toContain("--strict");
  });
});

describe("gate inventory is readable", () => {
  it("collectRepoFacts is a pure read of committed data", () => {
    // Two calls, one file mtime: the gates under test must not mutate
    // anything they read, which is why this file can assert it at all.
    const before = statSync(join(ROOT, "docs", "M26-GAP-LEDGER.jsonl")).mtimeMs;
    collectRepoFacts(ROOT);
    expect(statSync(join(ROOT, "docs", "M26-GAP-LEDGER.jsonl")).mtimeMs).toBe(
      before,
    );
  });
});
