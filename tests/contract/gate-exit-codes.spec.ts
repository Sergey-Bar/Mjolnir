/**
 * Gate exit codes are part of the contract, and nothing tested them.
 *
 * `scripts/v6/check-ecosystem.ts` mapped its three-state result through
 * `process.exit(status === "FAIL" ? 1 : 0)`, so `BLOCKED` — the state that
 * exists precisely to say "the probe did not run, so this proves nothing" —
 * exited 0. It had no test, and it did not run in CI.
 *
 * The pattern is one failure mode, so it is one spec: a gate that cannot
 * fail is indistinguishable from a gate that passed. These assertions use
 * `spawnSync` on the real scripts, because an in-process import of
 * `process.exit` proves nothing about the code CI reads.
 *
 * TI-021 · TI-024.
 *
 * Two arms used to be here and were removed in 6.0 with their subjects:
 *
 *   - TI-023, "an unverifiable gap never reports as a cleared blocker", read
 *     `docs/M26-GAP-LEDGER.jsonl` through `src/ledger/m26-validators.ts`. Both
 *     are deleted; what is left would be a predicate with no input.
 *   - TI-022, "the archive gate evaluates without writing what it checks",
 *     drove `scripts/v6/reconcile-archive.ts`, which read the deleted
 *     M26-GITHUB-SNAPSHOT. Its output survives as a dated record at
 *     `docs/archive/V6-ARCHIVE-RECONCILIATION.json`.
 *
 * They are named here rather than deleted silently, because "the thing this
 * asserted is gone" is itself a fact a reader needs.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { exitCodeForStatus } from "../../scripts/v6/check-ecosystem.js";
import { collectRepoFacts } from "../../scripts/v6/inventory.js";

const ROOT = join(import.meta.dirname, "..", "..");

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

describe("TI-024 — retired: the translation staleness gate had nothing left to gate", () => {
  // This block used to assert that `check-readme-translations.mjs` is advisory
  // without the quarantine flag and enforcing with it, and that the npm script
  // passes the flag. Both the script and the twenty-two translations it
  // measured are gone: a gate that reports "22 of 22 not fresh" forever is the
  // empty exclusion this carve exists to remove, and a baseline that can only be
  // met by deleting the thing it measures is a baseline that measures nothing.
  //
  // The assertion that replaced it is the one that can fail: the machinery is
  // absent, so it cannot drift back in under a name nobody greps for.
  //
  // (Restored verbatim in 6.0 after an over-wide line-range deletion took this
  // block out along with TI-022's and TI-023's. The trust-invariant registry
  // is what caught it: TI-024 names this exact case title, and its spec asserts
  // the title still exists.)
  it("the translation machinery is absent, not merely unreferenced", () => {
    const pkg = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    const names = Object.keys(pkg.scripts).filter((n) => /translat/i.test(n));
    expect(
      names,
      "a translation script came back — with no translations to measure, its " +
        "only reachable outcome is a permanently-red or permanently-green " +
        "report nobody reads",
    ).toEqual([]);

    for (const file of [
      "scripts/check-readme-translations.mjs",
      "scripts/check-translation-ratchet.mjs",
      "scripts/readme-release-status.mjs",
      "scripts/sync-readme-release-status.mjs",
      "scripts/lib/readme-translation-status.mjs",
      "docs/TRANSLATION-RATCHET.json",
    ]) {
      expect(
        existsSync(join(ROOT, file)),
        `${file} exists. Twenty-two machine-assisted READMEs were the only ` +
          "consumer, and the hardcoded `@v3` they carried is gone with them",
      ).toBe(false);
    }
  });

  it("no gate tier still declares a translation ratchet", () => {
    for (const tier of ["pr", "release", "nightly"]) {
      const text = readFileSync(join(ROOT, "gates", `${tier}.json`), "utf8");
      expect(
        text,
        `gates/${tier}.json declares a translation ratchet whose command no ` +
          "longer exists — a declared gate with no command is a gate that can " +
          "only ever be skipped",
      ).not.toMatch(/translation-ratchet|translations:ratchet/);
    }
  });
});

describe("gate inventory is readable", () => {
  it("collectRepoFacts is a pure read of committed data", () => {
    // Two calls, one file mtime: the gates under test must not mutate
    // anything they read, which is why this file can assert it at all. The
    // ledger it used to timestamp is deleted, so the probe is on
    // `package.json` — the first committed file `collectRepoFacts` opens.
    const before = statSync(join(ROOT, "package.json")).mtimeMs;
    collectRepoFacts(ROOT);
    expect(statSync(join(ROOT, "package.json")).mtimeMs).toBe(before);
  });
});
