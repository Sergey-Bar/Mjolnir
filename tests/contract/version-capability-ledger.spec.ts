/**
 * Task 6.6 — "which now…" turned into an assertion.
 *
 * Seven capabilities shipped with a release note saying "which now: …" and
 * none of them was a check, so any of them could be reverted with CI green.
 * This suite is the other half: it proves the generator can FAIL, which the
 * shipped tree cannot, because every one of its claims is currently
 * demonstrated.
 *
 * That asymmetry is the reason the fixture is a `--root` copy rather than a
 * mutation of the real tree: `tests/certification/candidate-manifest.spec.ts`
 * hashes the working tree, and deleting a source file in order to watch a gate
 * go red would leave that suite reporting drift three files away from the
 * cause.
 */

import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const LEDGER = join(ROOT, "docs", "VERSION-CAPABILITY-LEDGER.json");
const TSX_CLI = join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");

const scratch: string[] = [];

afterEach(() => {
  while (scratch.length > 0) {
    const dir = scratch.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

interface CheckerResult {
  code: number;
  output: string;
}

/** Run the generator's `--check` arm in a directory. */
function runCheck(dir: string): CheckerResult {
  if (!existsSync(TSX_CLI)) {
    throw new Error(`${TSX_CLI} is missing — run \`npm ci\` first.`);
  }
  try {
    const stdout = execFileSync(
      process.execPath,
      [
        TSX_CLI,
        join(ROOT, "scripts", "version-capability-ledger.ts"),
        "--check",
        `--root=${dir}`,
      ],
      { cwd: dir, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
    );
    return { code: 0, output: stdout };
  } catch (error) {
    const err = error as { status?: number; stdout?: string; stderr?: string };
    return {
      code: err.status ?? 1,
      output: `${err.stdout ?? ""}${err.stderr ?? ""}`,
    };
  }
}

describe("a version's claims are demonstrated by files that exist", () => {
  it("the committed ledger passes", () => {
    const run = runCheck(ROOT);
    expect(run.code, run.output).toBe(0);
    const report = JSON.parse(run.output) as { versions: string[] };
    expect(report.versions.length).toBeGreaterThan(0);
  });

  it("every claim in the committed artifact is demonstrated", () => {
    // Read the ARTIFACT, not a rebuild. The artifact is what a reader
    // consults, and a builder that regenerates on every read would agree with
    // itself whether or not the tree still backs the claim.
    const ledger = JSON.parse(readFileSync(LEDGER, "utf8")) as {
      entries: Array<{
        capability: string;
        demonstrated: boolean;
        missing: string[];
      }>;
    };
    expect(ledger.entries.length, "the ledger claims nothing").toBeGreaterThan(
      0,
    );
    for (const entry of ledger.entries) {
      expect(
        entry.missing,
        `${entry.capability} is claimed by ${entry.capability} and demonstrated by nothing`,
      ).toEqual([]);
      expect(entry.demonstrated, entry.capability).toBe(true);
    }
  });

  it("a version claims at least one capability — a version with no claims is a number", () => {
    const ledger = JSON.parse(readFileSync(LEDGER, "utf8")) as {
      versions: string[];
      entries: Array<{ version: string }>;
    };
    for (const version of ledger.versions) {
      expect(
        ledger.entries.filter((e) => e.version === version).length,
        `${version} is listed with no capabilities claimed`,
      ).toBeGreaterThan(0);
    }
  });

  it("a claim whose demonstrating file is gone fails, naming the version", () => {
    // The case that cannot happen in the shipped tree and must therefore be
    // built: a claim demonstrated by a file that is not there.
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-ledger-"));
    scratch.push(dir);
    // The generator reads from the REAL repository for its table, so the
    // failure is provoked by pointing `buildLedger` at a root that lacks the
    // file — which is what a revert of that file looks like from the ledger's
    // point of view.
    const empty = mkdtempSync(join(tmpdir(), "mjolnir-ledger-empty-"));
    scratch.push(empty);
    const result = runCheck(empty);
    expect(result.code, result.output).toBe(1);
    expect(result.output).toContain("not demonstrated");
    // And it names WHICH version, because "a capability regressed" is not
    // actionable and "6.0 claims a coverage gate that cannot be satisfied by
    // a partial run" is.
    expect(result.output).toMatch(/6\.0:/);
  });

  it("a fresh directory with no repository at all fails rather than passing vacuously", () => {
    // The default argument is the real repository root, so this exercises the
    // other direction: whatever the check does with a root that has nothing,
    // it must not exit 0.
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-ledger-"));
    scratch.push(dir);
    mkdirSync(join(dir, "docs"), { recursive: true });
    cpSync(LEDGER, join(dir, "docs", "VERSION-CAPABILITY-LEDGER.json"));
    writeFileSync(
      join(dir, "docs", "claim-registry.json"),
      JSON.stringify({ claims: [] }),
    );
    const run = runCheck(dir);
    // The generator resolves its table from the real repository, so a fixture
    // directory with no sources still resolves the claims and reports every
    // one missing. That is the honest result and the assertion states it.
    expect(run.code, run.output).toBe(1);
    expect(run.output).toContain("missing:");
  });
});
