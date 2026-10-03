/**
 * The scoring-model version is a promise, and this is the check that keeps it
 * one.
 *
 * `src/engine/contract-versions.ts` records `semver + ADR required` as the
 * compatibility policy for `scoringModelVersion`. Two halves, and this file
 * enforces both: a behaviour change to deduction must MOVE the major, and the
 * move must be accompanied by a numbered ADR. Without the second half a
 * version bump is just a number, and the "ADR required" half of the policy
 * would be the part nobody reads.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  CONTRACT_REGISTRY,
  SCORING_MODEL_VERSION,
  TRUST_MODEL_VERSION,
} from "../../src/engine/contract-versions.js";

const ROOT = join(import.meta.dirname, "..", "..");
const ADR_DIR = join(ROOT, "docs", "adr");

function adrNumbers(): number[] {
  return readdirSync(ADR_DIR)
    .map((name) => /^(\d{4})-/.exec(name)?.[1])
    .filter((n): n is string => n !== undefined)
    .map(Number)
    .sort((a, b) => a - b);
}

describe("scoring model version (ADR 0014)", () => {
  it("is a major version, because the core floor changes what a finding costs", () => {
    expect(SCORING_MODEL_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    // 1.x -> 2.x is the bump the floor earns. A consumer that pins on the
    // minor has to be told.
    expect(SCORING_MODEL_VERSION.split(".")[0]).toBe("2");
  });

  it("carries the 'semver + ADR required' policy it is held to", () => {
    const entry = CONTRACT_REGISTRY.find(
      (c) => c.identifier === "scoringModelVersion",
    );
    expect(entry?.compatibilityPolicy).toBe("semver + ADR required");
  });

  it("has a numbered ADR on file, and that ADR is 0014", () => {
    const adr = join(ADR_DIR, "0014-the-core-tier-carries-a-floor.md");
    expect(existsSync(adr), `missing ${adr}`).toBe(true);
    const text = readFileSync(adr, "utf8");
    expect(text).toMatch(/\*\*Status:\*\*\s*accepted/);
    // The ADR has to say which version it is for, or it is a design note.
    expect(text).toContain(SCORING_MODEL_VERSION);
  });

  it("is the highest-numbered ADR, so it is the current decision", () => {
    // A later ADR superseding this one is legitimate; a later ADR on an
    // unrelated subject is not a reason for this one to look current. The
    // assertion is that 0014 exists and is recorded, not that it is last —
    // 0015 and 0016 are reserved by the plan and will outrank it.
    expect(adrNumbers()).toContain(14);
  });
});

describe("trust model version (ADR 0014, explicitly NOT bumped)", () => {
  it("stays at 1.0.0 because the E-to-L mapping is unchanged", () => {
    // Recorded here rather than left implicit, because the plan's condition for
    // considering the bump ("does L0-L5 derivation consume evidenceLevel?") is
    // genuinely met — `deriveTrustLevel` does read the field. What did not
    // change is the FUNCTION. Bumping a version a consumer uses to detect a
    // changed mapping, for a changed input distribution, teaches consumers the
    // version means "something moved", which is how a version stops meaning
    // anything. The reasoning is in ADR 0014; this assertion exists so the
    // decision cannot be quietly reversed without someone noticing a test.
    expect(TRUST_MODEL_VERSION).toBe("1.0.0");
  });

  it("records the reasoning where a reviewer will look for it", () => {
    const text = readFileSync(
      join(ADR_DIR, "0014-the-core-tier-carries-a-floor.md"),
      "utf8",
    );
    expect(text).toContain("TRUST_MODEL_VERSION");
    // The rejected alternative is what makes this a decision rather than an
    // omission: "bump both" is named and refused.
    expect(text).toMatch(/Rejected alternatives/i);
    expect(text).toMatch(/\*\*4\. Bump both version constants\.\*\*/);
  });
});
