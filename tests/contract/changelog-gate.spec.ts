/**
 * CHANGELOG integrity gate drift fixtures (Mega MVP Master Plan v3.1
 * §26 WI-12A): the gate MUST fail on every drift class — missing entry,
 * mismatched version, invalid ordering, duplicate heading, undated
 * heading, empty decorative section, undocumented rule changes — and
 * MUST pass the real v0.5.34 baseline (historical entries preserved,
 * never rewritten).
 */

import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// Resolved from THIS package's node_modules — the gate runs with cwd set
// to a temp fixture dir, so bare-specifier resolution would fail there.
const TSX_CLI = require.resolve("tsx/cli");
const GATE = join(
  import.meta.dirname,
  "..",
  "..",
  "scripts",
  "check-changelog.ts",
);
const BASELINE = readFileSync(
  join(import.meta.dirname, "..", "..", "CHANGELOG.md"),
  "utf8",
);

function runGate(
  changelog: string,
  args: string[] = ["--expect-version", "0.6.0"],
): { code: number; out: string } {
  const dir = mkdtempSync(join(tmpdir(), "mjolnir-changelog-gate-"));
  try {
    writeFileSync(join(dir, "CHANGELOG.md"), changelog);
    const r = spawnSync(process.execPath, [TSX_CLI, GATE, ...args], {
      cwd: dir,
      encoding: "utf8",
    });
    return { code: r.status ?? 1, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Minimal synthetic changelog: header + one dated gate-era section. */
function synthetic(body: string, version = "0.6.0"): string {
  return [
    "# Changelog",
    "",
    "All notable changes documented per Keep a Changelog.",
    "",
    `## [${version}] — 2026-09-09`,
    "",
    body,
    "",
    "## [0.5.34] — 2026-09-08",
    "",
    "### Added",
    "",
    "- earlier work",
    "",
  ].join("\n");
}

describe("CHANGELOG integrity gate (WI-12A)", () => {
  it("green on the real baseline (0.5.34) — history preserved, not rewritten", () => {
    const r = runGate(BASELINE, ["--expect-version", "0.5.34"]);
    expect(r.code).toBe(0);
    expect(r.out).toContain("CHANGELOG GATE: OK");
  });

  it("fails on a missing version entry", () => {
    const r = runGate(BASELINE, ["--expect-version", "9.9.9"]);
    expect(r.code).toBe(1);
    expect(r.out).toContain("no heading for version");
  });

  it("fails on gate-era misordering", () => {
    const drifted = BASELINE.replace(
      "## [Unreleased]",
      [
        "## [Unreleased]",
        "",
        "## [0.6.0] — 2026-09-09",
        "",
        "### Added",
        "",
        "- x",
        "",
        "## [0.6.1] — 2026-09-09",
        "",
        "### Added",
        "",
        "- y",
        "",
      ].join("\n"),
    );
    const r = runGate(drifted, ["--expect-version", "0.6.0"]);
    expect(r.code).toBe(1);
    expect(r.out).toContain("heading order violated");
  });

  it("fails on a duplicate heading", () => {
    const drifted = BASELINE.replace(
      "## [Unreleased]",
      [
        "## [Unreleased]",
        "",
        "## [0.6.0] — 2026-09-09",
        "",
        "### Added",
        "",
        "- x",
        "",
        "## [0.6.0] — 2026-09-09",
        "",
        "### Fixed",
        "",
        "- y",
        "",
      ].join("\n"),
    );
    const r = runGate(drifted, ["--expect-version", "0.6.0"]);
    expect(r.code).toBe(1);
    expect(r.out).toContain("duplicate version heading");
  });

  it("fails on an undated heading (invisible to the gate = missing entry)", () => {
    const r = runGate(synthetic("### Added\n\n- x", "[0.6.0]"), [
      "--expect-version",
      "0.6.0",
    ]);
    expect(r.code).toBe(1);
    expect(r.out).toContain("no heading for version 0.6.0");
  });

  it("fails on an empty decorative section", () => {
    const r = runGate(
      synthetic("### Added\n\n- something real\n\n### Deprecated\n"),
    );
    expect(r.code).toBe(1);
    expect(r.out).toContain("empty section");
  });

  it("fails when rules changed but the section documents no rule ID", () => {
    const r = runGate(synthetic("### Added\n\n- entirely non-rule work"), [
      "--expect-version",
      "0.6.0",
      "--rules-touched",
    ]);
    expect(r.code).toBe(1);
    expect(r.out).toContain("documents no rule ID");
  });

  it("passes rules-touched when a rule ID IS documented", () => {
    const r = runGate(
      synthetic("### Added\n\n- new rule QA-PW-147 joins the registry"),
      ["--expect-version", "0.6.0", "--rules-touched"],
    );
    expect(r.code).toBe(0);
  });

  it("usage error without --expect-version (exit 2)", () => {
    const r = runGate(BASELINE, []);
    expect(r.code).toBe(2);
  });
});
