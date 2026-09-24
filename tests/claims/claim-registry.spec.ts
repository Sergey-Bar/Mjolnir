import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..", "..");
const script = join(root, "scripts", "check-claim-registry.mjs");

describe("claim registry", () => {
  it("validates the current release envelope and generated sources", () => {
    const output = execFileSync(process.execPath, [script, root], {
      encoding: "utf8",
    });
    expect(output).toContain('"status":"PASS"');
  });

  it("keeps historical certification sources separate from current claims", () => {
    const output = execFileSync(process.execPath, [script, root], {
      encoding: "utf8",
    });
    expect(output).toContain('"historical":2');
  });
});
