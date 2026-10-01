/**
 * P0 fabricated-claim gate (plan V5-001).
 *
 * Mjölnir is a trust product, so its own surface is held to the Trust
 * Constitution: a rendered number must have a provenance, a verdict must come
 * from the one determination function, and an incomplete analysis must never
 * read as clean.
 *
 * These specs are the negative suite for the commands that used to break all
 * three rules. They assert the ABSENCE of fabricated content — hardcoded
 * scores, zero-as-measurement, invented runtime evidence, "updated" messages
 * for state changes that never happened — because a claim that is merely
 * absent is invisible to a coverage number.
 *
 * The `quarantine`, `maturity` and `report` arms lived here too, and were
 * deleted with those verbs in 5.0 rather than being re-pointed elsewhere:
 * a negative suite for a surface that no longer exists has nothing left to
 * assert, and the quarantine LEDGER (src/rules/measurement-status.ts) keeps
 * its own contract.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { decideClaim, unmeasuredClaim } from "../../src/claim-evidence.js";
import {
  EXIT_CLEAN,
  EXIT_FINDINGS,
  EXIT_PARTIAL,
} from "../../src/exit-codes.js";

const out = vi.fn();
const err = vi.fn();
let dir: string;

beforeEach(() => {
  out.mockClear();
  err.mockClear();
  dir = mkdtempSync(join(tmpdir(), "mjolnir-claims-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("decideClaim is the only determination", () => {
  it("a complete clean analysis is READY", () => {
    expect(
      decideClaim({ partial: false, blockingFindings: 0, supported: true }),
    ).toEqual({
      state: "READY",
      exitCode: EXIT_CLEAN,
      reason: "READY: complete analysis, no findings at the configured gate.",
    });
  });

  it("law 11: partial is checked BEFORE the finding gate", () => {
    // Zero findings on a partial scan is the exact case that used to print
    // "clean scan" and exit 0. The order matters: with findings present the
    // answer is the same, so only the ordering proves the check is real.
    const decision = decideClaim({
      partial: true,
      blockingFindings: 0,
      supported: true,
    });
    expect(decision.state).toBe("INCONCLUSIVE");
    expect(decision.exitCode).toBe(EXIT_PARTIAL);
    expect(decision.reason).toContain("PARTIAL");
  });

  it("a partial scan with findings is still inconclusive, not a pass", () => {
    const decision = decideClaim({
      partial: true,
      blockingFindings: 7,
      supported: true,
    });
    expect(decision.state).toBe("INCONCLUSIVE");
    expect(decision.exitCode).toBe(EXIT_PARTIAL);
  });

  it("law 2: an unsupported surface never passes", () => {
    const decision = decideClaim({
      partial: false,
      blockingFindings: 0,
      supported: false,
      unsupportedReason: "no runtime report",
    });
    expect(decision.state).toBe("INCONCLUSIVE");
    expect(decision.reason).toContain("no runtime report");
  });

  it("law 1: a blocked surface reports the finding count it saw", () => {
    const decision = decideClaim({
      partial: false,
      blockingFindings: 3,
      supported: true,
    });
    expect(decision.state).toBe("BLOCKED");
    expect(decision.exitCode).toBe(EXIT_FINDINGS);
    expect(decision.reason).toContain("3 finding(s)");
  });

  it("an unmeasured surface fails closed", () => {
    const decision = unmeasuredClaim("surface", "no measurement exists");
    expect(decision.state).toBe("INCONCLUSIVE");
    expect(decision.exitCode).toBe(EXIT_PARTIAL);
    expect(decision.reason).toContain("UNMEASURED");
  });
});
