import { describe, expect, it } from "vitest";
import { RULES } from "../../src/rules/index.js";
import {
  getMeasurementStatus,
  getProvisionalRules,
  getQuarantinedRules,
} from "../../src/rules/measurement-status.js";
import {
  MEASURED_FP,
  MEASURED_FP_RAW,
} from "../../src/rules/measured-fp.generated.js";

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

    it("marks rules without any measurement as UNMEASURED", () => {
      const statuses = getMeasurementStatus();
      // Asserted on the IDENTITY, not on a count. The first version was
      // `expect(unmeasured.length).toBeGreaterThanOrEqual(0)`, which is
      // vacuously true for every number ever produced.
      for (const entry of statuses) {
        if (entry.status !== "UNMEASURED") continue;
        expect(
          MEASURED_FP[entry.ruleId],
          `${entry.ruleId} is UNMEASURED but MEASURED_FP has a row for it`,
        ).toBeUndefined();
        expect(
          MEASURED_FP_RAW[entry.ruleId],
          `${entry.ruleId} is UNMEASURED but MEASURED_FP_RAW has a row for it`,
        ).toBeUndefined();
      }
    });

    it("STALE is reachable: a measurement one revision behind is STALE, not UNMEASURED", () => {
      // `STALE` was a member of the union with no input that could produce it —
      // the generator filtered stale rows out of `MEASURED_FP`, so the rule read
      // `UNMEASURED` and the difference between "nobody sampled this" and
      // "42 verdicts, one revision behind" was destroyed. `MEASURED_FP_RAW`
      // keeps it, and these two rules are the ones it is keeping.
      const statuses = getMeasurementStatus();
      const stale = statuses.filter((s) => s.status === "STALE");
      expect(stale.map((s) => s.ruleId).sort()).toEqual([
        "QA-PY-004",
        "QA-PY-007",
      ]);
      for (const entry of stale) {
        // The measurement EXISTS, and it describes a detector that no longer
        // does. Asserting both halves is what makes this a status rather than
        // a synonym for UNMEASURED.
        expect(MEASURED_FP[entry.ruleId], entry.ruleId).toBeUndefined();
        const raw = MEASURED_FP_RAW[entry.ruleId];
        expect(raw, entry.ruleId).toBeDefined();
        expect(raw?.n, entry.ruleId).toBeGreaterThan(0);
        expect(raw?.detectorRevision, entry.ruleId).toBeLessThan(
          entry.detectorRevision,
        );
      }
    });

    it("every STALE rule is a rule with real corpus work behind it", () => {
      // The failure direction that matters: STALE must never be a way to keep
      // reporting a number for a detector that changed.
      const statuses = getMeasurementStatus();
      for (const entry of statuses) {
        if (entry.status !== "STALE") continue;
        expect(
          MEASURED_FP[entry.ruleId],
          `${entry.ruleId} is STALE but is still shipped in MEASURED_FP — a stale ` +
            "measurement must never be a current one",
        ).toBeUndefined();
      }
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
