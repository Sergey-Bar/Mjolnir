import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..", "..");

describe("candidate trust manifest", () => {
  it("keeps pre-authorization identity and evidence states separate", () => {
    const output = execFileSync(
      process.execPath,
      [join(root, "scripts", "check-candidate-manifest.mjs"), root],
      { encoding: "utf8" },
    );
    expect(output).toContain('"state":"WORKING_CANDIDATE"');
    expect(output).toContain('"engineeringCertificationState":"NOT_CERTIFIED"');
    expect(output).toContain('"releaseAuthorizationState":"NOT_AUTHORIZED"');
  });

  it("reports readiness blockers without promoting the candidate", () => {
    const result = spawnSync(
      process.execPath,
      [join(root, "scripts", "check-candidate-readiness.mjs"), root],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('"status":"BLOCKED"');
    expect(result.stdout).toContain("candidate SHA not authorized");
  });
});
