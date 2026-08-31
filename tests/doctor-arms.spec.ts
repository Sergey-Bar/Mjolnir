/**
 * Phase 1 coverage: commands/doctor.ts residual arms — evidence-honesty
 * pass case, verdict-fallback path, anti-creep overflow rendering, and
 * the quarantine-cap audit's loud failure (via a deliberately broken cap
 * injected through the tier-policy mock — if capForTier ever drifts from
 * severity=info/E0, doctor must fail loudly).
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/engine/tier-policy.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../src/engine/tier-policy.js")>();
  return {
    ...actual,
    capForTier: vi.fn((tier?: string) =>
      tier === "quarantine"
        ? { severity: "error" as const, evidenceLevel: "E2" as const }
        : actual.capForTier(tier as never),
    ),
  };
});

import {
  checkAntiCreep,
  checkEvidenceHonesty,
  checkQuarantineEnforcement,
  checkTierEnforcement,
} from "../src/commands/doctor.js";
import type { QADoctorRule } from "../src/rules/rule.js";

function minimalRule(overrides: Partial<QADoctorRule>): QADoctorRule {
  return {
    id: "QA-TEST-900",
    category: "QA-TEST",
    title: "Probe rule",
    severity: "warning",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "HYGIENE",
    appliesTo: "test-files",
    run: () => [],
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("checkEvidenceHonesty", () => {
  it("passes a rule whose declared evidence matches the derivation", () => {
    const honest = minimalRule({
      id: "QA-TEST-901",
      evidenceLevel: "E2",
      findingType: "deterministic-defect",
      confidence: "high",
    });
    const result = checkEvidenceHonesty([honest]);
    expect(result.ok).toBe(true);
    expect(result.details).toEqual([]);
  });
});

describe("checkTierEnforcement", () => {
  it("falls back to the shipped MEASURED_FP when live verdicts yield nothing", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-doctor-verdicts-"));
    try {
      // A .jsonl with only malformed lines: the live reader stays empty,
      // so the ratchet must fall back to the baked-in baseline.
      writeFileSync(join(dir, "verdicts.jsonl"), "{ not json\n\n[]\n");
      const result = checkTierEnforcement(dir);
      expect(result.name).toBe("tier-enforcement");
      expect(result.details[0]).toContain("Ratchet (Law #3)");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("checkAntiCreep", () => {
  it("lists overflow rules without the 'and N more' line when overflow is small", () => {
    const rules: QADoctorRule[] = [];
    for (let i = 0; i < 66; i++) {
      rules.push(
        minimalRule({ id: `QA-TEST-${String(800 + i).padStart(3, "0")}` }),
      );
    }
    const result = checkAntiCreep(rules);
    expect(result.ok).toBe(false);
    const text = result.details.join("\n");
    expect(text).toContain("exceeds cap of 65");
    expect(text).toContain("overflow: QA-TEST-865");
    expect(text).not.toContain("… and");
  });
});

describe("checkQuarantineEnforcement", () => {
  it("fails loudly when the quarantine cap drifts from info/E0", () => {
    const quarantine = minimalRule({
      id: "QA-TEST-902",
      tier: "quarantine",
    });
    const result = checkQuarantineEnforcement([quarantine]);
    expect(result.ok).toBe(false);
    expect(result.details.join("\n")).toContain("could gate CI");
  });
});
