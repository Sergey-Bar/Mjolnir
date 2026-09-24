import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..", "..");
const vitest = join(root, "node_modules", "vitest", "vitest.mjs");

function files(config: string): string[] {
  const result = spawnSync(
    process.execPath,
    [vitest, "list", "--config", join(root, config), "--filesOnly"],
    { cwd: root, encoding: "utf8" },
  );
  expect(result.status, result.stderr).toBe(0);
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

describe("Vitest suite boundaries", () => {
  it("keeps property and fuzz suites out of default discovery", () => {
    const discovered = files("vitest.config.ts");
    expect(discovered).not.toContain("tests/scope/property-invariants.spec.ts");
    expect(discovered).not.toContain("tests/fuzz/parsers.fuzz.ts");
    expect(discovered).not.toContain("tests/fuzz/utils.fuzz.ts");
  });

  it("discovers exactly the dedicated property suite", () => {
    expect(files("vitest.property.config.ts")).toEqual([
      "tests/scope/property-invariants.spec.ts",
    ]);
  });

  it("discovers exactly the dedicated fuzz suites", () => {
    expect(files("vitest.fuzz.config.ts").sort()).toEqual([
      "tests/fuzz/parsers.fuzz.ts",
      "tests/fuzz/utils.fuzz.ts",
    ]);
  });
});
