import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..", "..");

describe("CI local parity", () => {
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
