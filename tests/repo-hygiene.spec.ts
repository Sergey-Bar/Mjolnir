/**
 * Repo hygiene guards (Master-Stabilization-Plan.md, Sprint 0).
 *
 * Two concrete failures found by direct source inspection:
 *  - `.gitignore` accidentally ignored CHANGELOG.md (and itself, twice),
 *    so the changelog required by Upgrade-Plan-v3 critical item #3
 *    existed on disk but was never tracked by git.
 *  - `.planning/STATE.md` cites several files as "source plans", but a
 *    fresh clone previously received none of them (see the outer
 *    `.gitignore` finding in Master-Stabilization-Plan.md §1 #4).
 *
 * These tests read the actual `.gitignore` and `git ls-files` output so
 * this class of drift fails CI instead of sitting undetected.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "..");

function gitLsFiles(pattern: string): string[] {
  try {
    return execFileSync("git", ["ls-files", pattern], {
      cwd: ROOT,
      encoding: "utf8",
    })
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

function isGitRepo(): boolean {
  try {
    execFileSync("git", ["rev-parse", "--git-dir"], { cwd: ROOT });
    return true;
  } catch {
    return false;
  }
}

describe(".gitignore hygiene", () => {
  const gitignore = readFileSync(join(ROOT, ".gitignore"), "utf8");
  const lines = gitignore
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  it("does not list itself", () => {
    expect(
      lines,
      ".gitignore must never ignore itself — it silently untracks the " +
        "file that governs what git tracks, which is how CHANGELOG.md " +
        "went untracked previously.",
    ).not.toContain(".gitignore");
  });

  it("does not ignore CHANGELOG.md", () => {
    expect(
      lines,
      "CHANGELOG.md is required (Upgrade-Plan-v3 critical item #3) and " +
        "must be trackable, not silently excluded.",
    ).not.toContain("CHANGELOG.md");
  });

  it("has no duplicate entries", () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const line of lines) {
      if (seen.has(line)) dupes.push(line);
      seen.add(line);
    }
    expect(
      dupes,
      `duplicate .gitignore entries look like accidental appends: ${dupes.join(", ")}`,
    ).toEqual([]);
  });
});

describe.skipIf(!isGitRepo())("CHANGELOG.md is tracked", () => {
  it("is tracked by git, not just present on disk", () => {
    const tracked = gitLsFiles("CHANGELOG.md");
    expect(
      tracked.length,
      "CHANGELOG.md exists on disk but git does not track it — a fresh " +
        "clone would never receive it.",
    ).toBeGreaterThan(0);
  });

  it("package.json 'files' includes CHANGELOG.md so npm publishes it", () => {
    const pkg = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as {
      files?: string[];
    };
    expect(
      pkg.files,
      "package.json 'files' must list CHANGELOG.md so upgraders receive " +
        "it via npm, not just via git.",
    ).toContain("CHANGELOG.md");
  });
});

// .planning/ is machine-local agent-session state (untracked, see
// .gitignore) — present on dev machines, absent on CI checkouts. When
// STATE.md exists locally, its cited source plans must exist too; on CI
// the whole describe block is skipped.
describe("source plans referenced by .planning/STATE.md exist and are tracked", () => {
  const statePath = join(ROOT, ".planning", "STATE.md");
  const stateExists = existsSync(statePath);

  it.skipIf(!stateExists)(
    "STATE.md exists where present (dev machines)",
    () => {
      expect(stateExists).toBe(true);
    },
  );

  // Every plan file STATE.md's "Source plans" section names, resolved
  // relative to this package root (docs/archive/plans/**).
  const referencedPlans = [
    "docs/archive/plans/Product.txt",
    "docs/archive/plans/Product-MVP.txt",
    "docs/archive/plans/Sprint-Plan.txt",
    "docs/archive/plans/Upgrade-Plan-v2.txt",
    "docs/archive/plans/Upgrade-Plan-v3.txt",
  ];

  it.each(referencedPlans)("%s exists on disk", (relPath) => {
    expect(
      existsSync(join(ROOT, relPath)),
      `"${relPath}" (cited by .planning/STATE.md as a source of truth) ` +
        `does not exist at that path relative to the package root.`,
    ).toBe(true);
  });
});
