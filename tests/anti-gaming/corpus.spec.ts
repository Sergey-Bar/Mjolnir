import { describe, expect, it } from "vitest";

import {
  ANTI_GAMING_SCENARIOS,
  validateAntiGamingScenario,
  validateAntiGamingCorpus,
} from "../../src/anti-gaming/corpus.js";

describe("ANTI_GAMING_SCENARIOS", () => {
  it("contains exactly 7 scenarios (AG-001 through AG-007)", () => {
    expect(ANTI_GAMING_SCENARIOS).toHaveLength(7);
    const ids = ANTI_GAMING_SCENARIOS.map((s) => s.id);
    expect(ids).toEqual([
      "AG-001",
      "AG-002",
      "AG-003",
      "AG-004",
      "AG-005",
      "AG-006",
      "AG-007",
    ]);
  });

  it("AG-001: meaningless assertions → score unchanged, tautological detected", () => {
    const s = ANTI_GAMING_SCENARIOS.find((x) => x.id === "AG-001");
    expect(s).toBeDefined();
    expect(s?.expectedScoreChange).toBe("UNCHANGED");
    expect(s?.expectedDetection).toBe("tautological_assertion_detected");
  });

  it("AG-002: superficial coverage → coverage observed, trust unchanged", () => {
    const s = ANTI_GAMING_SCENARIOS.find((x) => x.id === "AG-002");
    expect(s).toBeDefined();
    expect(s?.expectedScoreChange).toBe("OBSERVED_ONLY");
    expect(s?.expectedDetection).toBe("coverage_observed_but_trust_unchanged");
  });

  it("AG-003: split findings → root-cause tracked", () => {
    const s = ANTI_GAMING_SCENARIOS.find((x) => x.id === "AG-003");
    expect(s).toBeDefined();
    expect(s?.expectedScoreChange).toBe("UNCHANGED");
    expect(s?.expectedDetection).toBe("root_cause_tracking_active");
  });

  it("AG-004: suppress noisy rules → suppression recorded, score capped", () => {
    const s = ANTI_GAMING_SCENARIOS.find((x) => x.id === "AG-004");
    expect(s).toBeDefined();
    expect(s?.expectedScoreChange).toBe("CAPPED");
    expect(s?.expectedDetection).toBe("suppression_recorded_score_capped");
  });

  it("AG-005: rename tests → structural detection unaffected", () => {
    const s = ANTI_GAMING_SCENARIOS.find((x) => x.id === "AG-005");
    expect(s).toBeDefined();
    expect(s?.expectedScoreChange).toBe("UNCHANGED");
    expect(s?.expectedDetection).toBe("structural_detection_unaffected");
  });

  it("AG-006: empty mocks → mock rules detect meaningless mocking", () => {
    const s = ANTI_GAMING_SCENARIOS.find((x) => x.id === "AG-006");
    expect(s).toBeDefined();
    expect(s?.expectedScoreChange).toBe("UNCHANGED");
    expect(s?.expectedDetection).toBe("meaningless_mocking_detected");
  });

  it("AG-007: manipulate CI structure → CI rules detect non-verification workflows", () => {
    const s = ANTI_GAMING_SCENARIOS.find((x) => x.id === "AG-007");
    expect(s).toBeDefined();
    expect(s?.expectedScoreChange).toBe("UNCHANGED");
    expect(s?.expectedDetection).toBe("non_verification_workflow_detected");
  });
});

describe("validateAntiGamingScenario", () => {
  it("validates a correct scenario as valid", () => {
    const scenario = ANTI_GAMING_SCENARIOS[0];
    expect(scenario).toBeDefined();
    if (!scenario) return;
    const result = validateAntiGamingScenario(scenario);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects scenario with empty id", () => {
    const result = validateAntiGamingScenario({
      id: "",
      description: "test",
      gamingAttempt: "test",
      expectedScoreChange: "UNCHANGED",
      expectedDetection: "test",
      correctedBehavior: "test",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining("scenario.id must be non-empty"),
    );
  });

  it("rejects scenario with invalid expectedScoreChange", () => {
    const result = validateAntiGamingScenario({
      id: "TEST",
      description: "test",
      gamingAttempt: "test",
      expectedScoreChange: "INVALID" as "UNCHANGED",
      expectedDetection: "test",
      correctedBehavior: "test",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining("expectedScoreChange"),
    );
  });
});

describe("validateAntiGamingCorpus", () => {
  it("validates the full corpus as valid", () => {
    const result = validateAntiGamingCorpus(ANTI_GAMING_SCENARIOS);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects corpus with duplicate ids", () => {
    const first = ANTI_GAMING_SCENARIOS[0];
    expect(first).toBeDefined();
    if (!first) return;
    const duplicate = [first, first];
    const result = validateAntiGamingCorpus(duplicate);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining("Duplicate scenario id"),
    );
  });
});
