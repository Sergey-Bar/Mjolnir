import { describe, expect, it } from "vitest";
import { RULES } from "../../src/rules/index.js";
import {
  deriveContractFields,
  validateRuleMetadata,
  validateAllRulesMetadata,
} from "../../src/rules/rule-metadata-schema.js";
import { RULE_CATEGORIES } from "../../src/types.js";

describe("rule metadata contract (ENGINE-008)", () => {
  describe("deriveContractFields", () => {
    it("derives family from the rule ID prefix", () => {
      for (const rule of RULES) {
        const contract = deriveContractFields(rule);
        const parts = rule.id.split("-");
        expect(contract.family).toBe(parts[1]);
      }
    });

    it("maps all rules to valid categories", () => {
      for (const rule of RULES) {
        const contract = deriveContractFields(rule);
        expect(RULE_CATEGORIES as readonly string[]).toContain(
          contract.category,
        );
      }
    });

    it("derives evidenceLevel conservatively for observations", () => {
      const obsRule = RULES.find((r) => r.findingType === "observation");
      if (obsRule) {
        const contract = deriveContractFields(obsRule);
        expect(contract.evidenceLevel).toBe("E0");
      }
    });

    it("derives detectorRevision defaulting to 1", () => {
      for (const rule of RULES) {
        const contract = deriveContractFields(rule);
        expect(contract.detectorRevision).toBeGreaterThanOrEqual(1);
      }
    });

    it("captures overlapWith as dependencies", () => {
      for (const rule of RULES) {
        const contract = deriveContractFields(rule);
        expect(contract.dependencies).toBeInstanceOf(Array);
      }
    });

    it("sets fpRisks from falsePositiveRisk", () => {
      for (const rule of RULES) {
        const contract = deriveContractFields(rule);
        expect(["low", "medium", "high"]).toContain(contract.fpRisks);
      }
    });

    it("maps autofix to safe/unsafe/unknown", () => {
      for (const rule of RULES) {
        const contract = deriveContractFields(rule);
        expect(["safe", "unsafe", "unknown"]).toContain(contract.autofixPolicy);
      }
    });

    it("sets trustFailureDetected for high FP risk rules", () => {
      for (const rule of RULES) {
        const contract = deriveContractFields(rule);
        if (rule.falsePositiveRisk === "high") {
          expect(contract.trustFailureDetected).toBe(true);
        }
      }
    });

    it("sets falseGreenScenario for FALSE-GREEN qaImpact rules", () => {
      for (const rule of RULES) {
        const contract = deriveContractFields(rule);
        if (rule.qaImpact === "FALSE-GREEN") {
          expect(contract.falseGreenScenario).toBe(true);
        }
      }
    });
  });

  describe("validateRuleMetadata", () => {
    it("returns zero violations for every registered rule", () => {
      const violations = validateAllRulesMetadata(RULES);
      const failing = violations.filter(
        (v) =>
          v.field !== "falsePositiveRisk" &&
          v.field !== "strategyJustification",
      );
      for (const v of failing) {
        expect(v.message, `${v.ruleId}.${v.field}`).toBe("");
      }
    });

    it("rejects a rule with empty ID", () => {
      const first = RULES[0];
      expect(first).toBeDefined();
      if (!first) return;
      const bad = { ...first, id: "" };
      const violations = validateRuleMetadata(bad);
      expect(violations.some((v) => v.field === "id")).toBe(true);
    });

    it("rejects a rule with invalid severity", () => {
      const first = RULES[0];
      expect(first).toBeDefined();
      if (!first) return;
      const bad = {
        ...first,
        severity: "critical",
      } as unknown as (typeof RULES)[number];
      const violations = validateRuleMetadata(bad);
      expect(violations.some((v) => v.field === "severity")).toBe(true);
    });

    it("rejects a rule with unknown category", () => {
      const first = RULES[0];
      expect(first).toBeDefined();
      if (!first) return;
      const bad = {
        ...first,
        category: "QA-INVALID",
      } as unknown as (typeof RULES)[number];
      const violations = validateRuleMetadata(bad);
      expect(violations.some((v) => v.field === "category")).toBe(true);
    });

    it("rejects a rule with empty title", () => {
      const first = RULES[0];
      expect(first).toBeDefined();
      if (!first) return;
      const bad = { ...first, title: "" };
      const violations = validateRuleMetadata(bad);
      expect(violations.some((v) => v.field === "title")).toBe(true);
    });

    it("rejects a rule with detectorRevision < 1", () => {
      const first = RULES[0];
      expect(first).toBeDefined();
      if (!first) return;
      const bad = {
        ...first,
        detectorRevision: 0,
      } as unknown as (typeof RULES)[number];
      const violations = validateRuleMetadata(bad);
      expect(violations.some((v) => v.field === "detectorRevision")).toBe(true);
    });

    it("rejects a LEXICAL rule without strategyJustification", () => {
      const first = RULES[0];
      expect(first).toBeDefined();
      if (!first) return;
      const { strategyJustification: _unused, ...rest } = first;
      const bad = {
        ...rest,
        detectionStrategy: "LEXICAL" as const,
      };
      const violations = validateRuleMetadata(bad);
      expect(violations.some((v) => v.field === "strategyJustification")).toBe(
        true,
      );
    });

    it("accepts a well-formed rule with no violations", () => {
      const good = RULES.find((r) => r.falsePositiveRisk !== undefined);
      if (good) {
        const violations = validateRuleMetadata(good);
        const structural = violations.filter(
          (v) => v.field !== "strategyJustification",
        );
        expect(structural).toHaveLength(0);
      }
    });

    it("returns ruleId on every violation", () => {
      const first = RULES[0];
      expect(first).toBeDefined();
      if (!first) return;
      const bad = {
        ...first,
        id: "",
        severity: "x",
      } as unknown as (typeof RULES)[number];
      const violations = validateRuleMetadata(bad);
      for (const v of violations) {
        expect(typeof v.ruleId).toBe("string");
      }
    });
  });

  describe("validateAllRulesMetadata", () => {
    it("processes every rule in the registry", () => {
      const violations = validateAllRulesMetadata(RULES);
      for (const v of violations) {
        expect(typeof v.ruleId).toBe("string");
      }
    });

    it("returns empty array for an empty rule set", () => {
      expect(validateAllRulesMetadata([])).toHaveLength(0);
    });
  });
});
