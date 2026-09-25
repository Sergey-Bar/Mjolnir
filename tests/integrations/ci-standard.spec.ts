import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..", "..");

describe("CI standard", () => {
  it("keeps the canonical PR, coverage, parity, and permission layers", () => {
    const result = spawnSync(
      process.execPath,
      [join(root, "scripts", "check-ci-standard.mjs"), root],
      { encoding: "utf8" },
    );
    expect(result.status, result.stdout).toBe(0);
  });
});
