/**
 * TI-016 — Runtime proximity does not automatically upgrade trust.
 *
 * Trust level is derived from the combination of static evidence +
 * runtime corroboration — never from runtime alone. A static E0
 * observation with runtime corroboration can reach L3/L4, but it
 * must NEVER reach L5 without E1+ static evidence.
 */

import { describe, expect, it } from "vitest";

import {
  deriveTrustLevel,
  stampRuntimeCorroboration,
} from "../../src/engine/runtime-corroboration.js";
import {
  TRUST_ORDER,
  type Finding,
  type RuntimeCorroboration,
} from "../../src/types.js";
import type { ForensicsReport } from "../../src/forensics/types.js";

describe("TI-016: runtime proximity ≠ automatic promotion", () => {
  it.each([
    ["E0", "L4", "test"],
    ["E1", "L5", "defect"],
    ["E2", "L5", "defect"],
  ] as const)(
    "stamps %s with retry evidence as %s and %s corroboration",
    (evidenceLevel, trustLevel, corroborationLevel) => {
      const finding: Finding = {
        ruleId: "QA-PW-101",
        category: "QA-PW",
        severity: "warning",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "FLAKY-RISK",
        evidenceLevel,
        file: "checkout.spec.ts",
        line: 2,
        column: 1,
        message: "hard wait",
        why: "timing dependency",
        fix: "wait for state",
      };
      const report: ForensicsReport = {
        forensicsSchemaVersion: 1,
        source: "playwright-json",
        totalTests: 1,
        failed: 0,
        skipped: 0,
        retriedTests: 1,
        flakyTests: 1,
        totalDurationMs: 20,
        analysisComplete: true,
        skippedReports: 0,
        incompleteReasons: [],
        verdicts: [
          {
            file: finding.file,
            line: finding.line,
            title: "checkout",
            attempts: 2,
            finalStatus: "passed",
            totalDurationMs: 20,
            passedOnRetry: true,
            everFailed: true,
            skipped: false,
          },
        ],
      };
      expect(stampRuntimeCorroboration([finding], report)).toBe(1);
      expect(finding.trustLevel).toBe(trustLevel);
      expect(finding.runtimeCorroboration?.level).toBe(corroborationLevel);
      expect(finding.runtimeCorroboration?.matchedTest?.passedOnRetry).toBe(
        true,
      );
    },
  );

  describe("deriveTrustLevel", () => {
    it("inferred E0 with defect corroboration remains L4", () => {
      expect(
        deriveTrustLevel(
          { findingType: "observation", confidence: "high" },
          { level: "defect", source: "playwright-json", testsExecuted: 1 },
        ),
      ).toBe("L4");
    });

    it("E1 with defect corroboration reaches L5", () => {
      expect(
        deriveTrustLevel(
          {
            evidenceLevel: "E1",
            findingType: "heuristic-risk",
            confidence: "medium",
          },
          { level: "defect", source: "playwright-json", testsExecuted: 1 },
        ),
      ).toBe("L5");
    });
    it("E0 without corroboration → L0", () => {
      const level = deriveTrustLevel({
        evidenceLevel: "E0",
        findingType: "observation",
        confidence: "low",
      });
      expect(level).toBe("L0");
    });

    it("E1 without corroboration → L1", () => {
      const level = deriveTrustLevel({
        evidenceLevel: "E1",
        findingType: "heuristic-risk",
        confidence: "medium",
      });
      expect(level).toBe("L1");
    });

    it("E2 without corroboration → L2", () => {
      const level = deriveTrustLevel({
        evidenceLevel: "E2",
        findingType: "deterministic-defect",
        confidence: "high",
      });
      expect(level).toBe("L2");
    });

    it("E0 with file-level corroboration → L3", () => {
      const corroboration: RuntimeCorroboration = {
        level: "file",
        source: "junit-xml",
        testsExecuted: 5,
      };
      const level = deriveTrustLevel(
        { evidenceLevel: "E0", findingType: "observation", confidence: "low" },
        corroboration,
      );
      expect(level).toBe("L3");
    });

    it("E0 with test-level corroboration → L4", () => {
      const corroboration: RuntimeCorroboration = {
        level: "test",
        source: "playwright-json",
        testsExecuted: 10,
      };
      const level = deriveTrustLevel(
        { evidenceLevel: "E0", findingType: "observation", confidence: "low" },
        corroboration,
      );
      expect(level).toBe("L4");
    });

    it("E0 with defect-level corroboration → L4, never L5", () => {
      const corroboration: RuntimeCorroboration = {
        level: "defect",
        source: "playwright-json",
        testsExecuted: 10,
      };
      const level = deriveTrustLevel(
        { evidenceLevel: "E0", findingType: "observation", confidence: "low" },
        corroboration,
      );
      expect(level).toBe("L4");
    });

    it("E2 with defect-level corroboration → L5", () => {
      const corroboration: RuntimeCorroboration = {
        level: "defect",
        source: "playwright-json",
        testsExecuted: 10,
      };
      const level = deriveTrustLevel(
        {
          evidenceLevel: "E2",
          findingType: "deterministic-defect",
          confidence: "high",
        },
        corroboration,
      );
      expect(level).toBe("L5");
    });

    it("E1 with test-level corroboration → L4", () => {
      const corroboration: RuntimeCorroboration = {
        level: "test",
        source: "jest-json",
        testsExecuted: 3,
      };
      const level = deriveTrustLevel(
        {
          evidenceLevel: "E1",
          findingType: "heuristic-risk",
          confidence: "medium",
        },
        corroboration,
      );
      expect(level).toBe("L4");
    });

    it("L0 < L1 < L2 < L3 < L4 < L5 ordering is respected", () => {
      // The real ladder, not a copy: an ordering assertion against a private
      // list keeps passing after the ladder changes.
      const order = [...TRUST_ORDER];
      const levels = [
        deriveTrustLevel({
          evidenceLevel: "E0",
          findingType: "observation",
          confidence: "low",
        }),
        deriveTrustLevel({
          evidenceLevel: "E1",
          findingType: "heuristic-risk",
          confidence: "medium",
        }),
        deriveTrustLevel({
          evidenceLevel: "E2",
          findingType: "deterministic-defect",
          confidence: "high",
        }),
        deriveTrustLevel(
          {
            evidenceLevel: "E1",
            findingType: "heuristic-risk",
            confidence: "medium",
          },
          { level: "file", source: "junit-xml", testsExecuted: 1 },
        ),
        deriveTrustLevel(
          {
            evidenceLevel: "E1",
            findingType: "heuristic-risk",
            confidence: "medium",
          },
          { level: "test", source: "junit-xml", testsExecuted: 1 },
        ),
        deriveTrustLevel(
          {
            evidenceLevel: "E2",
            findingType: "deterministic-defect",
            confidence: "high",
          },
          { level: "defect", source: "playwright-json", testsExecuted: 1 },
        ),
      ];
      for (let i = 0; i < levels.length; i++) {
        expect(levels[i]).toBe(order[i]);
      }
    });
  });
});
