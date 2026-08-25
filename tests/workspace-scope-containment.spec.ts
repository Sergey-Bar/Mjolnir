/**
 * Scan-scope containment in npm/yarn/pnpm workspaces (Test Hardening
 * Plan — a real, concrete boundary violation found by digging into
 * `src/discovery/workspace.ts`).
 *
 * `findProjectRoot()` walks UPWARD from the scan target looking for the
 * nearest `package.json`. That's correct for finding config — but when
 * the target directory has no `package.json` of its own (a common shape
 * inside a monorepo package, e.g. `packages/pkg-a/`), discovery lands on
 * the MONOREPO ROOT's package.json. If that root declares
 * `workspaces: ["packages/*"]`, the scan then covers every sibling
 * package too — not just the directory the user actually pointed
 * qa-doctor at.
 *
 * Concretely: `qa-doctor packages/pkg-a` returns findings from
 * `packages/pkg-b` as well. In CI, a job scoped to one package's PR
 * would see findings — and gate failures — attributed to a completely
 * unrelated sibling package the PR never touched.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runScan } from "../src/cli.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "qa-doctor-workspace-scope-"));
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "root", workspaces: ["packages/*"] }),
  );
  mkdirSync(join(dir, "packages", "pkg-a", "e2e"), { recursive: true });
  mkdirSync(join(dir, "packages", "pkg-b", "e2e"), { recursive: true });
  writeFileSync(
    join(dir, "packages", "pkg-a", "e2e", "a.spec.ts"),
    "it.only('a', () => { expect(true).toBe(true); });\n",
  );
  writeFileSync(
    join(dir, "packages", "pkg-b", "e2e", "b.spec.ts"),
    "it.only('b', () => { expect(true).toBe(true); });\n",
  );
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("targeting one workspace package directly", () => {
  it("does not include findings from a sibling package the user never pointed at", () => {
    const result = runScan({
      target: join(dir, "packages", "pkg-a"),
      json: true,
      verbose: true,
      maxDurationMs: 10_000,
      scopeChanged: false,
      format: "json",
    });

    const files = result.findings.map((f) => f.file);
    const touchedPkgB = files.some((f) => f.includes("pkg-b"));

    expect(
      touchedPkgB,
      `scanning "packages/pkg-a" returned findings from pkg-b too: ` +
        `${JSON.stringify(files)}. findProjectRoot() walks up to the ` +
        `monorepo root's package.json (since pkg-a has none of its own), ` +
        `picks up its "workspaces" glob, and scans every sibling package ` +
        `— not just the directory the caller actually targeted.`,
    ).toBe(false);
  });

  it("baseline sanity: scanning the whole monorepo root DOES find both packages", () => {
    // Confirms the workspace-glob discovery mechanism itself works and
    // this isn't a fixture-setup mistake — it's specifically that a
    // sub-target should be a boundary, and today it isn't one.
    const result = runScan({
      target: dir,
      json: true,
      verbose: true,
      maxDurationMs: 10_000,
      scopeChanged: false,
      format: "json",
    });
    const files = result.findings.map((f) => f.file);
    expect(files.some((f) => f.includes("pkg-a"))).toBe(true);
    expect(files.some((f) => f.includes("pkg-b"))).toBe(true);
  });
});
