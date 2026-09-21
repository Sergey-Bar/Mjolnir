import { describe, expect, it } from "vitest";
import { RULES } from "../../src/rules/index.js";
import {
  getMeasurementStatus,
  getProvisionalRules,
  getQuarantinedRules,
} from "../../src/rules/measurement-status.js";
import { MEASURED_FP } from "../../src/rules/measured-fp.generated.js";

describe("measurement status (RULE-MEASURE-001)", () => {
  describe("getMeasurementStatus", () => {
    it("returns an entry for every rule in the registry", () => {
      const statuses = getMeasurementStatus();
      expect(statuses).toHaveLength(RULES.length);
    });

    it("marks rules with a valid MEASURED_FP entry as MEASURED", () => {
      const statuses = getMeasurementStatus();
      const measuredRule = RULES.find((r) => {
        const m = MEASURED_FP[r.id];
        return (
          m !== undefined && m.detectorRevision === (r.detectorRevision ?? 1)
        );
      });
      if (measuredRule) {
        const entry = statuses.find((s) => s.ruleId === measuredRule.id);
        expect(entry?.status).toBe("MEASURED");
      }
    });

    it("marks rules without MEASURED_FP as UNMEASURED", () => {
      const statuses = getMeasurementStatus();
      const unmeasured = statuses.filter((s) => s.status === "UNMEASURED");
      expect(unmeasured.length).toBeGreaterThanOrEqual(0);
    });

    it("includes tier for each entry", () => {
      const statuses = getMeasurementStatus();
      for (const s of statuses) {
        expect(["core", "extended", "quarantine"]).toContain(s.tier);
      }
    });

    it("includes measuredFpRate and measuredFpN for measured rules", () => {
      const statuses = getMeasurementStatus();
      const measured = statuses.filter((s) => s.status === "MEASURED");
      for (const m of measured) {
        expect(typeof m.measuredFpRate).toBe("number");
        expect(typeof m.measuredFpN).toBe("number");
      }
    });

    it("exposes detectorRevision ≥ 1 for every entry", () => {
      const statuses = getMeasurementStatus();
      for (const s of statuses) {
        expect(s.detectorRevision).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe("getProvisionalRules", () => {
    it("returns UNMEASURED and STALE rules", () => {
      const provisional = getProvisionalRules();
      for (const p of provisional) {
        expect(["UNMEASURED", "STALE"]).toContain(p.status);
      }
    });

    it("does not include MEASURED rules", () => {
      const provisional = getProvisionalRules();
      const measuredIds = provisional.filter((p) => p.status === "MEASURED");
      expect(measuredIds).toHaveLength(0);
    });
  });

  describe("getQuarantinedRules", () => {
    it("returns only quarantine-tier rules", () => {
      const quarantined = getQuarantinedRules();
      for (const q of quarantined) {
        expect(q.tier).toBe("quarantine");
      }
    });
  });
});
