/**
 * Coverage arms for the doctor fixture-integrity check (Phase 2.5, G3):
 * orphaned dir, empty dir, allowlist census, and the healthy pass.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { checkFixtureIntegrity } from "../../src/commands/doctor.js";

const createdDirs: string[] = [];
function tmpRoot(prefix: string): string {
  const d = mkdtempSync(join(tmpdir(), `mjolnir-fixint-${prefix}-`));
  createdDirs.push(d);
  return d;
}
afterEach(() => {
  while (createdDirs.length > 0) {
    const d = createdDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

function makeFixtureTree(root: string): void {
  // One well-formed rule fixture pair (must-fire + must-not-fire).
  const fire = join(root, "QA-PW-101", "must-fire");
  const nofire = join(root, "QA-PW-101", "must-not-fire");
  mkdirSync(fire, { recursive: true });
  mkdirSync(nofire, { recursive: true });
  writeFileSync(join(fire, "a.spec.ts"), "test('t', () => {});\n");
  writeFileSync(join(nofire, "b.spec.ts"), "test('t', () => {});\n");
}

describe("doctor checkFixtureIntegrity (Phase 2.5, G3)", () => {
  it("a healthy fixture tree passes with an allowlist census", () => {
    const root = tmpRoot("healthy");
    makeFixtureTree(root);
    const check = checkFixtureIntegrity(root);
    expect(check.ok).toBe(true);
  });

  it("an orphaned fixture dir (no registered rule) blocks the check", () => {
    const root = tmpRoot("orphan");
    makeFixtureTree(root);
    const orphan = join(root, "QA-ZZ-999");
    mkdirSync(join(orphan, "must-fire"), { recursive: true });
    writeFileSync(
      join(orphan, "must-fire", "x.spec.ts"),
      "test('t', () => {});\n",
    );
    const check = checkFixtureIntegrity(root);
    expect(check.ok).toBe(false);
    expect(check.details.join("\n")).toContain("QA-ZZ-999");
  });

  it("an empty fixture dir blocks the check", () => {
    const root = tmpRoot("empty");
    makeFixtureTree(root);
    const emptyDir = join(root, "QA-PW-101", "must-fire");
    rmSync(emptyDir, { recursive: true, force: true });
    mkdirSync(emptyDir, { recursive: true }); // exists but empty
    const check = checkFixtureIntegrity(root);
    expect(check.ok).toBe(false);
    expect(check.details.join("\n")).toContain("QA-PW-101");
  });

  it("the Layer A typecheck allowlist census is reported (covered/uncovered)", () => {
    const root = tmpRoot("allowlist");
    makeFixtureTree(root);
    // A well-formed allowlist file exercises the census arm (the existsSync
    // branch with a valid entries array).
    writeFileSync(
      join(root, "typecheck-allowlist.json"),
      JSON.stringify({ entries: ["tests/fixtures/QA-ZZ-001/broken.ts"] }),
    );
    const check = checkFixtureIntegrity(root);
    expect(
      check.details.some(
        (d) => d.includes("allowlist") && d.includes("1 justified entr"),
      ),
    ).toBe(true);
  });

  it("a malformed allowlist file blocks the check (catch arm)", () => {
    const root = tmpRoot("badallow");
    makeFixtureTree(root);
    writeFileSync(join(root, "typecheck-allowlist.json"), "{ not json");
    const check = checkFixtureIntegrity(root);
    expect(check.ok).toBe(false);
    expect(check.details.join("\n")).toContain("unreadable/malformed");
  });

  it("a non-array entries allowlist blocks the check (shape arm)", () => {
    const root = tmpRoot("badshape");
    makeFixtureTree(root);
    writeFileSync(
      join(root, "typecheck-allowlist.json"),
      JSON.stringify({ entries: "not-an-array" }),
    );
    const check = checkFixtureIntegrity(root);
    expect(check.ok).toBe(false);
    expect(check.details.join("\n")).toContain("entries is not an array");
  });
});
