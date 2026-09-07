/** Minimal synthetic rule fixtures shared by engine specs. */
import type { QADoctorRule } from "../../src/rules/rule.js";

function one(overrides: Partial<QADoctorRule> = {}): QADoctorRule {
  return {
    id: "QA-T-900",
    category: "QA-TEST",
    title: "Synthetic probe rule",
    severity: "info",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "HYGIENE",
    appliesTo: "test-files",
    run: () => [],
    ...overrides,
  };
}

export const minimalRules = {
  one,
};
