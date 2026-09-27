import { describe, expect, it } from "vitest";
import {
  createDiagnostics,
  mergeDiagnostics,
} from "../../src/engine/pipeline-stages.js";

describe("pipeline stages (ENGINE-010)", () => {
  describe("createDiagnostics", () => {
    it("creates diagnostics with all stages", () => {
      const d = createDiagnostics();
      expect(d.stages.discovery).toBeDefined();
      expect(d.stages.parse).toBeDefined();
      expect(d.stages.rules).toBeDefined();
      expect(d.stages.correlation).toBeDefined();
      expect(d.stages.postProcess).toBeDefined();
      expect(d.stages.score).toBeDefined();
    });

    it("initializes all stages to complete status", () => {
      const d = createDiagnostics();
      expect(d.stages.discovery.status).toBe("complete");
      expect(d.stages.parse.status).toBe("complete");
      expect(d.stages.rules.status).toBe("complete");
      expect(d.stages.correlation.status).toBe("complete");
      expect(d.stages.postProcess.status).toBe("complete");
      expect(d.stages.score.status).toBe("complete");
    });

    it("initializes fileCount to 0", () => {
      const d = createDiagnostics();
      expect(d.stages.discovery.fileCount).toBe(0);
    });

    it("initializes findings and crashed to 0", () => {
      const d = createDiagnostics();
      expect(d.stages.rules.findings).toBe(0);
      expect(d.stages.rules.crashed).toBe(0);
    });

    it("initializes score to null", () => {
      const d = createDiagnostics();
      expect(d.stages.score.score).toBeNull();
    });

    it("initializes all durations to 0", () => {
      const d = createDiagnostics();
      expect(d.stages.discovery.durationMs).toBe(0);
      expect(d.stages.parse.durationMs).toBe(0);
      expect(d.stages.rules.durationMs).toBe(0);
      expect(d.stages.correlation.durationMs).toBe(0);
      expect(d.stages.postProcess.durationMs).toBe(0);
      expect(d.stages.score.durationMs).toBe(0);
    });

    it("initializes totalDurationMs to 0", () => {
      const d = createDiagnostics();
      expect(d.totalDurationMs).toBe(0);
    });

    it("initializes parse stats to 0", () => {
      const d = createDiagnostics();
      expect(d.stages.parse.parsed).toBe(0);
      expect(d.stages.parse.failed).toBe(0);
    });
  });

  describe("mergeDiagnostics", () => {
    it("updates the specified stage", () => {
      const d = createDiagnostics();
      const updated = mergeDiagnostics(d, {
        stage: "discovery",
        fileCount: 42,
        durationMs: 100,
      });
      expect(updated.stages.discovery.fileCount).toBe(42);
      expect(updated.stages.discovery.durationMs).toBe(100);
    });

    it("preserves other stages", () => {
      const d = createDiagnostics();
      const updated = mergeDiagnostics(d, {
        stage: "parse",
        parsed: 10,
      });
      expect(updated.stages.discovery.fileCount).toBe(0);
      expect(updated.stages.rules.findings).toBe(0);
    });

    it("can update stage status", () => {
      const d = createDiagnostics();
      const updated = mergeDiagnostics(d, {
        stage: "rules",
        status: "partial",
      });
      expect(updated.stages.rules.status).toBe("partial");
    });

    it("can update rules findings count", () => {
      const d = createDiagnostics();
      const updated = mergeDiagnostics(d, {
        stage: "rules",
        findings: 15,
        crashed: 2,
      });
      expect(updated.stages.rules.findings).toBe(15);
      expect(updated.stages.rules.crashed).toBe(2);
    });

    it("can update score", () => {
      const d = createDiagnostics();
      const updated = mergeDiagnostics(d, {
        stage: "score",
        score: 85,
      });
      expect(updated.stages.score.score).toBe(85);
    });

    it("can update parse stats", () => {
      const d = createDiagnostics();
      const updated = mergeDiagnostics(d, {
        stage: "parse",
        parsed: 100,
        failed: 3,
        durationMs: 500,
      });
      expect(updated.stages.parse.parsed).toBe(100);
      expect(updated.stages.parse.failed).toBe(3);
      expect(updated.stages.parse.durationMs).toBe(500);
    });

    it("handles multiple merges sequentially", () => {
      let d = createDiagnostics();
      d = mergeDiagnostics(d, { stage: "discovery", fileCount: 50 });
      d = mergeDiagnostics(d, { stage: "parse", parsed: 50 });
      d = mergeDiagnostics(d, { stage: "rules", findings: 5 });
      d = mergeDiagnostics(d, { stage: "score", score: 90 });
      expect(d.stages.discovery.fileCount).toBe(50);
      expect(d.stages.parse.parsed).toBe(50);
      expect(d.stages.rules.findings).toBe(5);
      expect(d.stages.score.score).toBe(90);
    });
  });
});
