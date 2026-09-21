/**
 * TI-013 — Plugin findings cannot inherit core trust tier.
 *
 * Third-party detections must not inherit CORE trust status.
 * This is enforced by: (1) plugins always load as "extended" or lower,
 * (2) the tier policy caps plugin findings, (3) reserved-prefix
 * rejection prevents core-ID spoofing.
 */

import { describe, expect, it } from "vitest";

import { enforceTierPolicy, type Tier } from "../../src/engine/tier-policy.js";
import { isReservedPrefix } from "../../src/plugins/reserved-prefixes.js";
import type { Finding } from "../../src/types.js";

function makeFinding(ruleId: string): Finding {
  return {
    ruleId,
    file: "test.spec.ts",
    line: 1,
    column: 0,
    severity: "error",
    message: "test",
    findingType: "deterministic-defect",
    confidence: "high",
    evidenceLevel: "E2",
  } as Finding;
}

describe("TI-013: plugin trust isolation", () => {
  describe("tier policy enforcement", () => {
    it("quarantine-tier findings are capped to info/E0", () => {
      const tierMap = new Map<string, Tier>();
      tierMap.set("QA-PLUGIN-001", "quarantine");

      const findings = [makeFinding("QA-PLUGIN-001")];
      enforceTierPolicy(findings, tierMap);

      expect(findings[0]?.severity).toBe("info");
      expect(findings[0]?.evidenceLevel).toBe("E0");
    });

    it("core-tier findings are not capped", () => {
      const tierMap = new Map<string, Tier>();
      tierMap.set("QA-TEST-001", "core");

      const findings = [makeFinding("QA-TEST-001")];
      enforceTierPolicy(findings, tierMap);

      expect(findings[0]?.severity).toBe("error");
      expect(findings[0]?.evidenceLevel).toBe("E2");
    });

    it("extended-tier findings are not capped", () => {
      const tierMap = new Map<string, Tier>();
      tierMap.set("QA-EXT-001", "extended");

      const findings = [makeFinding("QA-EXT-001")];
      enforceTierPolicy(findings, tierMap);

      expect(findings[0]?.severity).toBe("error");
      expect(findings[0]?.evidenceLevel).toBe("E2");
    });

    it("findings with no tier mapping are not capped (default core)", () => {
      const tierMap = new Map<string, Tier>();
      const findings = [makeFinding("QA-UNKNOWN-001")];
      enforceTierPolicy(findings, tierMap);

      expect(findings[0]?.severity).toBe("error");
      expect(findings[0]?.evidenceLevel).toBe("E2");
    });
  });

  describe("reserved-prefix rejection", () => {
    it("core prefixes are reserved and rejected", () => {
      expect(isReservedPrefix("QA-TEST-001")).toBe(true);
      expect(isReservedPrefix("QA-PW-001")).toBe(true);
      expect(isReservedPrefix("QA-CI-001")).toBe(true);
      expect(isReservedPrefix("QA-PY-001")).toBe(true);
    });

    it("non-reserved prefixes are accepted", () => {
      expect(isReservedPrefix("QA-ACME-001")).toBe(false);
      expect(isReservedPrefix("QA-CUSTOM-001")).toBe(false);
    });
  });

  describe("enforcement is idempotent", () => {
    it("applying tier policy twice yields the same result", () => {
      const tierMap = new Map<string, Tier>();
      tierMap.set("QA-PLUGIN-001", "quarantine");

      const findings = [makeFinding("QA-PLUGIN-001")];
      enforceTierPolicy(findings, tierMap);
      const afterFirst = { ...findings[0] };

      enforceTierPolicy(findings, tierMap);
      expect(findings[0]?.severity).toBe(afterFirst.severity);
      expect(findings[0]?.evidenceLevel).toBe(afterFirst.evidenceLevel);
    });
  });
});
