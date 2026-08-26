/**
 * Link integrity guard (Master-Stabilization-Plan.md, Sprint 0, finding #2).
 *
 * `package.json` repository/bugs/homepage previously pointed at
 * `github.com/qa-doctor/qa-doctor` (a 404 — that org/repo does not host
 * this project) instead of the real remote, and several source/doc files
 * hardcoded the old typo'd repo path `QA-Dodctor` instead of the correct
 * `QA-Doctor`. This test greps tracked source/config/doc files for both
 * dead patterns so the drift can't silently return.
 *
 * Deliberately excludes docs/plans/**, docs/tiers/**, and
 * .planning/STATE.md: these files document the finding itself (by name)
 * or describe possible future CTA strings referencing the parked
 * npm-scope decision — they are not live links a user could click.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "..");

function isGitRepo(): boolean {
  try {
    execFileSync("git", ["rev-parse", "--git-dir"], { cwd: ROOT });
    return true;
  } catch {
    return false;
  }
}

function trackedFiles(): string[] {
  return execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .filter((f) => !f.startsWith("docs/plans/")) // planning prose, not live links
    .filter((f) => !f.startsWith("docs/tiers/")) // roadmap prose, not live links
    .filter((f) => f !== ".planning/STATE.md") // status prose documents the finding by name
    .filter((f) => !f.startsWith("node_modules/"))
    .filter((f) => !f.endsWith("package-lock.json")) // dependency metadata, not our links
    .filter((f) => f !== "tests/link-integrity.spec.ts"); // this file documents the dead patterns by name
}

const DEAD_PATTERNS: RegExp[] = [
  /qa-doctor\/qa-doctor/, // wrong GitHub org/repo — 404s
  /QA-Dodctor/, // typo'd repo name
];

describe.skipIf(!isGitRepo())(
  "no tracked file references dead repo URLs",
  () => {
    const files = trackedFiles();

    it("found at least one tracked file to check (sanity)", () => {
      expect(files.length).toBeGreaterThan(0);
    });

    it.each(files)("%s has no dead-link pattern", (file) => {
      let content: string;
      try {
        content = readFileSync(resolve(ROOT, file), "utf8");
      } catch {
        return; // binary or unreadable — not a text link source
      }
      for (const pattern of DEAD_PATTERNS) {
        expect(
          pattern.test(content),
          `${file} matches dead-link pattern ${pattern} — repository/bugs/` +
            `homepage and all hardcoded GitHub URLs must point at ` +
            `github.com/Sergey-Bar/QA-Doctor.`,
        ).toBe(false);
      }
    });
  },
);

describe("package.json identity fields", () => {
  const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));

  it("repository.url points at the real remote", () => {
    expect(pkg.repository?.url).toMatch(/github\.com\/Sergey-Bar\/QA-Doctor/);
  });

  it("bugs.url points at the real remote", () => {
    expect(pkg.bugs?.url).toMatch(/github\.com\/Sergey-Bar\/QA-Doctor/);
  });

  it("homepage points at the real remote", () => {
    expect(pkg.homepage).toMatch(/github\.com\/Sergey-Bar\/QA-Doctor/);
  });
});
