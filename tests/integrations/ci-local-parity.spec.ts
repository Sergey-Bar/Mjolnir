import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..", "..");

describe("CI local parity", () => {
  it("keeps pre-push on the permitted fast gate", () => {
    const hook = readFileSync(join(root, ".husky", "pre-push"), "utf8");

    expect(hook).not.toMatch(/^npm run ci-local$/m);
    expect(hook).not.toContain("--no-verify");
    expect(hook).toMatch(/^set -e$/m);
    for (const command of [
      "npm run typecheck",
      "npm run lint",
      "npm run ci-local:parity",
    ]) {
      expect(hook).toContain(command);
    }
  });

  it("keeps package, pre-push, CI, and merge verification aligned", () => {
    const result = spawnSync(
      process.execPath,
      [join(root, "scripts", "check-ci-local-parity.mjs")],
      { cwd: root, encoding: "utf8" },
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("parity: OK");
  });
});
