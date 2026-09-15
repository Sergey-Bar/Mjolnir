import { describe, expect, it } from "vitest";
import { runRulesShared } from "../../src/engine/shared-run-rules.js";
import type { UniversalRule, ParsedFile } from "../../src/engine/adapter.js";

function makeRule(overrides: Partial<UniversalRule> = {}): UniversalRule {
  return {
    id: "TEST-001",
    category: "QA-TEST",
    appliesTo: ["typescript"],
    run: () => [],
    ...overrides,
  };
}

function makeFile(overrides: Partial<ParsedFile> = {}): ParsedFile {
  return {
    path: "test.spec.ts",
    text: "test('x', () => {});",
    ...overrides,
  };
}

describe("shared-run-rules (ENGINE-004)", () => {
  describe("basic execution", () => {
    it("evaluates all rules and returns count", () => {
      const rules = [makeRule(), makeRule({ id: "TEST-002" })];
      const result = runRulesShared({
        rules,
        file: makeFile(),
        emit: () => {},
      });
      expect(result.rulesEvaluated).toBe(2);
    });

    it("emits findings from rules that fire", () => {
      const rule = makeRule({
        run: () => [
          {
            severity: "error" as const,
            confidence: "high" as const,
            findingType: "deterministic-defect" as const,
            qaImpact: "BLOCKS-RELEASE" as const,
            file: "test.spec.ts",
            line: 1,
            column: 1,
            message: "found it",
            why: "because",
            fix: "fix it",
          },
        ],
      });
      const emitted: Array<{ ruleId: string; category: string }> = [];
      const result = runRulesShared({
        rules: [rule],
        file: makeFile(),
        emit: (_f, ruleId, category) => {
          emitted.push({ ruleId, category });
        },
      });
      expect(result.findingsEmitted).toBe(1);
      expect(emitted).toHaveLength(1);
      expect(emitted[0]?.ruleId).toBe("TEST-001");
    });

    it("returns zero findings when no rules fire", () => {
      const result = runRulesShared({
        rules: [makeRule()],
        file: makeFile(),
        emit: () => {},
      });
      expect(result.findingsEmitted).toBe(0);
    });
  });

  describe("crash isolation", () => {
    it("continues after a rule throws", () => {
      const crashing = makeRule({
        id: "CRASH-001",
        run: () => {
          throw new Error("boom");
        },
      });
      const good = makeRule({
        id: "GOOD-001",
        run: () => [
          {
            severity: "warning" as const,
            confidence: "medium" as const,
            findingType: "heuristic-risk" as const,
            qaImpact: "HYGIENE" as const,
            file: "test.spec.ts",
            line: 1,
            column: 1,
            message: "ok",
            why: "because",
            fix: "fix",
          },
        ],
      });
      const result = runRulesShared({
        rules: [crashing, good],
        file: makeFile(),
        emit: () => {},
      });
      expect(result.rulesCrashed).toEqual(["CRASH-001"]);
      expect(result.rulesEvaluated).toBe(2);
      expect(result.findingsEmitted).toBe(1);
    });

    it("invokes onCrash callback for each crashed rule", () => {
      const crashing = makeRule({
        id: "CRASH-002",
        run: () => {
          throw new Error("fail");
        },
      });
      const crashes: string[] = [];
      runRulesShared({
        rules: [crashing],
        file: makeFile(),
        emit: () => {},
        onCrash: (ruleId) => crashes.push(ruleId),
      });
      expect(crashes).toEqual(["CRASH-002"]);
    });
  });

  describe("framework filtering", () => {
    it("skips rules whose frameworks don't match file tags", () => {
      const rule = makeRule({
        id: "PW-001",
        frameworks: ["playwright"],
        run: () => [
          {
            severity: "warning" as const,
            confidence: "high" as const,
            findingType: "deterministic-defect" as const,
            qaImpact: "HYGIENE" as const,
            file: "test.spec.ts",
            line: 1,
            column: 1,
            message: "found",
            why: "why",
            fix: "fix",
          },
        ],
      });
      const result = runRulesShared({
        rules: [rule],
        file: makeFile({ frameworkTags: ["jest"] }),
        emit: () => {},
      });
      expect(result.rulesEvaluated).toBe(0);
      expect(result.findingsEmitted).toBe(0);
    });

    it("runs rules whose frameworks match file tags", () => {
      const rule = makeRule({
        id: "PW-002",
        frameworks: ["playwright"],
        run: () => [
          {
            severity: "warning" as const,
            confidence: "high" as const,
            findingType: "deterministic-defect" as const,
            qaImpact: "HYGIENE" as const,
            file: "test.spec.ts",
            line: 1,
            column: 1,
            message: "found",
            why: "why",
            fix: "fix",
          },
        ],
      });
      const result = runRulesShared({
        rules: [rule],
        file: makeFile({ frameworkTags: ["playwright"] }),
        emit: () => {},
      });
      expect(result.rulesEvaluated).toBe(1);
      expect(result.findingsEmitted).toBe(1);
    });

    it("runs all rules when file has no framework tags", () => {
      const rule = makeRule({
        frameworks: ["playwright"],
        run: () => [
          {
            severity: "info" as const,
            confidence: "low" as const,
            findingType: "observation" as const,
            qaImpact: "HYGIENE" as const,
            file: "test.spec.ts",
            line: 1,
            column: 1,
            message: "found",
            why: "why",
            fix: "fix",
          },
        ],
      });
      const file: ParsedFile = {
        path: "test.spec.ts",
        text: "test('x', () => {});",
      };
      const result = runRulesShared({
        rules: [rule],
        file,
        emit: () => {},
      });
      expect(result.rulesEvaluated).toBe(1);
    });
  });

  describe("budget enforcement", () => {
    it("stops evaluating rules when deadline exceeded", () => {
      const rules = [
        makeRule({ id: "A-001" }),
        makeRule({ id: "A-002" }),
        makeRule({ id: "A-003" }),
      ];
      let exceeded = false;
      const result = runRulesShared({
        rules,
        file: makeFile(),
        emit: () => {},
        budget: {
          deadline: Date.now() - 1000,
          onExceeded: () => {
            exceeded = true;
          },
        },
      });
      expect(result.rulesSkippedByBudget).toBeGreaterThan(0);
      expect(exceeded).toBe(true);
    });
  });

  describe("custom ruleFilter", () => {
    it("uses the provided filter predicate", () => {
      const rules = [
        makeRule({ id: "KEEP-001" }),
        makeRule({ id: "SKIP-001" }),
      ];
      const result = runRulesShared({
        rules,
        file: makeFile(),
        emit: () => {},
        ruleFilter: (rule) => rule.id.startsWith("KEEP"),
      });
      expect(result.rulesEvaluated).toBe(1);
    });
  });

  describe("edge cases", () => {
    it("handles empty rules array", () => {
      const result = runRulesShared({
        rules: [],
        file: makeFile(),
        emit: () => {},
      });
      expect(result.rulesEvaluated).toBe(0);
      expect(result.findingsEmitted).toBe(0);
      expect(result.rulesCrashed).toHaveLength(0);
    });

    it("handles rule producing multiple findings", () => {
      const rule = makeRule({
        run: () => [
          {
            severity: "warning" as const,
            confidence: "high" as const,
            findingType: "deterministic-defect" as const,
            qaImpact: "HYGIENE" as const,
            file: "test.spec.ts",
            line: 1,
            column: 1,
            message: "a",
            why: "a",
            fix: "a",
          },
          {
            severity: "error" as const,
            confidence: "high" as const,
            findingType: "deterministic-defect" as const,
            qaImpact: "BLOCKS-RELEASE" as const,
            file: "test.spec.ts",
            line: 2,
            column: 1,
            message: "b",
            why: "b",
            fix: "b",
          },
        ],
      });
      const result = runRulesShared({
        rules: [rule],
        file: makeFile(),
        emit: () => {},
      });
      expect(result.findingsEmitted).toBe(2);
    });

    it("returns empty crash list when no rules crash", () => {
      const result = runRulesShared({
        rules: [makeRule()],
        file: makeFile(),
        emit: () => {},
      });
      expect(result.rulesCrashed).toHaveLength(0);
    });
  });
});
