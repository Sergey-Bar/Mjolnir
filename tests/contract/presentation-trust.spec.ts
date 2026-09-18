/**
 * TI-019 — Presentation output cannot affect verification trust.
 *
 * Trust calculation and presentation rendering are completely
 * independent. Rewording a finding's message, changing report
 * formatting, or altering display thresholds MUST NOT change
 * the verification trust score or finding classifications.
 */

import { describe, expect, it } from "vitest";

import { correlateFindings } from "../../src/engine/correlation-engine.js";
import { deriveTrustLevel } from "../../src/engine/runtime-corroboration.js";
import type { Finding } from "../../src/types.js";

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    ruleId: "QA-TEST-001",
    file: "test.spec.ts",
    line: 10,
    column: 0,
    severity: "warning",
    message: "Original message",
    findingType: "heuristic-risk",
    confidence: "medium",
    evidenceLevel: "E1",
    ...overrides,
  } as Finding;
}

describe("TI-019: presentation cannot affect trust", () => {
  it("changing message does not affect trust level", () => {
    const a = makeFinding({ message: "Short msg" });
    const b = makeFinding({
      message: "Completely different and longer message",
    });

    const trustA = deriveTrustLevel(a);
    const trustB = deriveTrustLevel(b);
    expect(trustA).toBe(trustB);
  });

  it("changing message does not affect correlation conclusions", () => {
    const findingsA = [
      makeFinding({
        findingId: "f1",
        rootCauseId: "shared",
        message: "Version A",
      }),
      makeFinding({
        findingId: "f2",
        rootCauseId: "shared",
        message: "Version A",
      }),
    ];
    const findingsB = [
      makeFinding({
        findingId: "f1",
        rootCauseId: "shared",
        message: "Version B",
      }),
      makeFinding({
        findingId: "f2",
        rootCauseId: "shared",
        message: "Version B",
      }),
    ];

    const corrA = correlateFindings(findingsA);
    const corrB = correlateFindings(findingsB);
    expect(corrA).toEqual(corrB);
  });

  it("changing why does not affect trust level", () => {
    const a = makeFinding({ why: "Original why" });
    const b = makeFinding({ why: "Different why" });

    const trustA = deriveTrustLevel(a);
    const trustB = deriveTrustLevel(b);
    expect(trustA).toBe(trustB);
  });

  it("evidence level, not presentation, determines trust", () => {
    const e0 = makeFinding({
      evidenceLevel: "E0",
      findingType: "observation",
      confidence: "low",
      message: "Cosmetic detail",
    });
    const e2 = makeFinding({
      evidenceLevel: "E2",
      findingType: "deterministic-defect",
      confidence: "high",
      message: "Cosmetic detail",
    });

    expect(deriveTrustLevel(e0)).toBe("L0");
    expect(deriveTrustLevel(e2)).toBe("L2");
  });

  it("severity is independent of evidence level (LAW-T08)", () => {
    const criticalLowConfidence = makeFinding({
      severity: "error",
      evidenceLevel: "E1",
      confidence: "low",
    });
    const infoLowConfidence = makeFinding({
      severity: "info",
      evidenceLevel: "E1",
      confidence: "low",
    });

    expect(deriveTrustLevel(criticalLowConfidence)).toBe(
      deriveTrustLevel(infoLowConfidence),
    );
    expect(criticalLowConfidence.severity).not.toBe(infoLowConfidence.severity);
    expect(criticalLowConfidence.evidenceLevel).toBe(
      infoLowConfidence.evidenceLevel,
    );
  });
});
