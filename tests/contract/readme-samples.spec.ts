/**
 * The README's terminal samples are the generated ones (P2 follow-up).
 *
 * The portfolio release README is intentionally short and does not include
 * the FLAKINESS LEADERBOARD or SELECTOR HEALTH transcripts. Those samples
 * remain drift-locked under assets/readme/ and are validated by the
 * docs:forensics-samples pipeline, not by README containment checks.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const README = readFileSync(join(ROOT, "README.md"), "utf8");

describe("README terminal samples — portfolio release", () => {
  it("portfolio README intentionally omits FLAKINESS LEADERBOARD and SELECTOR HEALTH", () => {
    expect(README).not.toContain("▍ FLAKINESS LEADERBOARD");
    expect(README).not.toContain("▍ SELECTOR HEALTH");
  });

  it("generated samples still exist and are non-empty", () => {
    const forensics = readFileSync(
      join(ROOT, "assets", "readme", "forensics-sample.txt"),
      "utf8",
    );
    const selectorHealth = readFileSync(
      join(ROOT, "assets", "readme", "selector-health-sample.txt"),
      "utf8",
    );
    expect(forensics.length).toBeGreaterThan(100);
    expect(selectorHealth.length).toBeGreaterThan(100);
  });
});
