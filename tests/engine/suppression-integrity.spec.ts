/**
 * ENGINE-006 — Suppression Integrity: mass-suppression detection,
 * unknown rule detection, expired suppression detection, and
 * fingerprint stability.
 */

import { describe, expect, it } from "vitest";

import {
  suppressionFingerprint,
  detectMassSuppression,
  detectUnknownRuleSuppressions,
  detectExpiredSuppressions,
  computeSuppressionIntegrity,
  type SuppressionEntry,
} from "../../src/engine/suppression-integrity.js";

function entry(overrides: Partial<SuppressionEntry> = {}): SuppressionEntry {
  return {
    ruleId: "QA-TEST-001",
    files: ["tests/shop.spec.ts"],
    reason: "known flake under investigation",
    ...overrides,
  };
}

describe("suppressionFingerprint", () => {
  it("produces a 64-char hex string", () => {
    const fp = suppressionFingerprint([entry()]);
    expect(fp).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic (same input → same output)", () => {
    const s = [entry(), entry({ ruleId: "QA-PW-102" })];
    const first = suppressionFingerprint(s);
    for (let i = 0; i < 50; i++) {
      expect(suppressionFingerprint(s)).toBe(first);
    }
  });

  it("is order-independent (sorted canonical JSON)", () => {
    const a = [entry({ ruleId: "B" }), entry({ ruleId: "A" })];
    const b = [entry({ ruleId: "A" }), entry({ ruleId: "B" })];
    expect(suppressionFingerprint(a)).toBe(suppressionFingerprint(b));
  });

  it("changes when entries differ", () => {
    const a = [entry({ reason: "reason A" })];
    const b = [entry({ reason: "reason B" })];
    expect(suppressionFingerprint(a)).not.toBe(suppressionFingerprint(b));
  });

  it("empty set has a stable fingerprint", () => {
    const fp = suppressionFingerprint([]);
    expect(fp).toMatch(/^[0-9a-f]{64}$/);
    expect(suppressionFingerprint([])).toBe(fp);
  });
});

describe("detectMassSuppression", () => {
  it("counts matched findings rather than configured glob entries", () => {
    const entries = [
      entry({
        files: [
          "tests/**/*.spec.ts",
          "e2e/**/*.spec.ts",
          "packages/*/tests/**/*.spec.ts",
        ],
      }),
    ];
    const findings = [
      { ruleId: "QA-TEST-001", file: "tests/a.spec.ts" },
      { ruleId: "QA-TEST-001", file: "tests/nested/b.spec.ts" },
    ];

    const result = detectMassSuppression(entries, findings);

    expect(result.suppressedCount).toBe(2);
    expect(result.totalFindings).toBe(2);
    expect(result.ratio).toBe(1);
  });

  it("returns false when below threshold", () => {
    const findings = [
      { ruleId: "QA-TEST-001", file: "tests/shop.spec.ts" },
      ...Array.from({ length: 99 }, (_, i) => ({
        ruleId: "OTHER",
        file: `tests/other-${i}.spec.ts`,
      })),
    ];
    const result = detectMassSuppression([entry()], findings);
    expect(result.isMassSuppression).toBe(false);
    expect(result.ratio).toBeLessThan(result.threshold);
  });

  it("returns true when at or above threshold", () => {
    const entries = Array.from({ length: 50 }, (_, i) =>
      entry({ ruleId: `R-${i}`, files: [`f-${i}.ts`] }),
    );
    const findings = [
      ...entries.map((suppression) => ({
        ruleId: suppression.ruleId,
        file: suppression.files?.[0] ?? "",
      })),
      ...Array.from({ length: 50 }, (_, i) => ({
        ruleId: "OTHER",
        file: `other-${i}.ts`,
      })),
    ];
    const result = detectMassSuppression(entries, findings);
    expect(result.isMassSuppression).toBe(true);
    expect(result.ratio).toBeGreaterThanOrEqual(result.threshold);
  });

  it("respects custom threshold", () => {
    const entries = [entry({ files: ["a.ts", "b.ts", "c.ts"] })];
    const findings = [
      { ruleId: "QA-TEST-001", file: "a.ts" },
      { ruleId: "QA-TEST-001", file: "b.ts" },
      { ruleId: "QA-TEST-001", file: "c.ts" },
      ...Array.from({ length: 7 }, (_, i) => ({
        ruleId: "OTHER",
        file: `other-${i}.ts`,
      })),
    ];
    const result = detectMassSuppression(entries, findings, 0.2);
    expect(result.isMassSuppression).toBe(true);
  });

  it("handles zero findings", () => {
    const result = detectMassSuppression([entry()], []);
    expect(result.ratio).toBe(0);
    expect(result.isMassSuppression).toBe(false);
  });
});

describe("detectUnknownRuleSuppressions", () => {
  it("returns empty when all rules are known", () => {
    const known = new Set(["QA-TEST-001", "QA-PW-102"]);
    const result = detectUnknownRuleSuppressions(
      [entry({ ruleId: "QA-TEST-001" })],
      known,
    );
    expect(result).toEqual([]);
  });

  it("returns unknown ruleIds sorted", () => {
    const known = new Set(["QA-TEST-001"]);
    const result = detectUnknownRuleSuppressions(
      [
        entry({ ruleId: "UNKNOWN-Z" }),
        entry({ ruleId: "UNKNOWN-A" }),
        entry({ ruleId: "QA-TEST-001" }),
      ],
      known,
    );
    expect(result).toEqual(["UNKNOWN-A", "UNKNOWN-Z"]);
  });

  it("deduplicates unknown ruleIds", () => {
    const known = new Set<string>();
    const result = detectUnknownRuleSuppressions(
      [entry({ ruleId: "X" }), entry({ ruleId: "X" })],
      known,
    );
    expect(result).toEqual(["X"]);
  });
});

describe("detectExpiredSuppressions", () => {
  it("returns entries whose expires is in the past", () => {
    const now = new Date("2026-06-15T00:00:00Z");
    const expired = entry({ expires: "2026-01-01T00:00:00Z" });
    const valid = entry({ ruleId: "R-2", expires: "2027-01-01T00:00:00Z" });
    const noExpiry = entry({ ruleId: "R-3" });
    const result = detectExpiredSuppressions([expired, valid, noExpiry], now);
    expect(result).toHaveLength(1);
    expect(result[0]?.ruleId).toBe("QA-TEST-001");
  });

  it("returns empty when no entries have expired", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const result = detectExpiredSuppressions(
      [entry({ expires: "2027-01-01T00:00:00Z" })],
      now,
    );
    expect(result).toEqual([]);
  });

  it("uses the default clock for expired entries", () => {
    const result = detectExpiredSuppressions([
      entry({ expires: "2000-01-01T00:00:00Z" }),
    ]);
    expect(result).toHaveLength(1);
  });

  it("entries without expires are never expired", () => {
    const result = detectExpiredSuppressions([entry()], new Date());
    expect(result).toEqual([]);
  });
});

describe("computeSuppressionIntegrity", () => {
  it("combines all checks into a single report", () => {
    const suppressions = [
      entry({ ruleId: "UNKNOWN", files: ["a.ts"], expires: "2020-01-01" }),
    ];
    const known = new Set<string>();
    const report = computeSuppressionIntegrity(
      suppressions,
      Array.from({ length: 10 }, (_, i) => ({
        ruleId: "KNOWN",
        file: `known-${i}.ts`,
      })),
      known,
      new Date("2026-01-01"),
    );
    expect(report.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(report.massSuppression.isMassSuppression).toBe(false);
    expect(report.unknownRuleSuppressions).toEqual(["UNKNOWN"]);
    expect(report.expiredSuppressions).toHaveLength(1);
  });

  it("uses the default clock for an empty report", () => {
    const report = computeSuppressionIntegrity([], [], new Set());
    expect(report.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(report.massSuppression.totalFindings).toBe(0);
  });
});
