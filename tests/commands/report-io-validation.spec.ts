import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  loadSavedReport,
  validateReportJson,
} from "../../src/commands/report-io.js";

type RecordValue = Record<string, unknown>;

function validReport(): RecordValue {
  return {
    schemaVersion: 1,
    partial: false,
    score: 100,
    frameworks: ["playwright"],
    frameworkDetectionUnknown: false,
    dimensions: [
      { category: "QA-TEST", score: 100, errors: 0, warnings: 0, infos: 0 },
    ],
    findings: [
      {
        ruleId: "QA-TEST-001",
        category: "QA-TEST",
        severity: "warning",
        confidence: "medium",
        findingType: "heuristic-risk",
        qaImpact: "HYGIENE",
        file: "a.spec.ts",
        line: 1,
        column: 1,
        message: "message",
        why: "why",
        fix: "fix",
      },
    ],
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 1,
    },
  };
}

function invalid(mutator: (report: RecordValue) => void): void {
  const report = validReport();
  mutator(report);
  expect(() => validateReportJson(JSON.stringify(report))).toThrow();
}

describe("report schema branch matrix", () => {
  it("accepts a complete nested report", () => {
    expect(validateReportJson(JSON.stringify(validReport()))).toMatchObject({
      schemaVersion: 1,
      partial: false,
    });
  });

  it("rejects invalid report-level fields", () => {
    invalid((r) => (r["schemaVersion"] = 2));
    invalid((r) => (r["partial"] = "false"));
    invalid((r) => (r["score"] = 101));
    invalid((r) => (r["reason"] = "wrong"));
    invalid((r) => delete r["frameworks"]);
    invalid((r) => (r["frameworks"] = [1]));
    invalid((r) => (r["frameworkDetectionUnknown"] = "no"));
    invalid((r) => (r["findings"] = {}));
    invalid((r) => (r["analysisStatus"] = {}));
  });

  it("rejects malformed dimensions", () => {
    invalid(
      (r) =>
        (r["dimensions"] = [
          { category: "bad", score: 1, errors: 0, warnings: 0, infos: 0 },
        ]),
    );
    invalid(
      (r) =>
        (r["dimensions"] = [
          { category: "QA-TEST", score: 101, errors: 0, warnings: 0, infos: 0 },
        ]),
    );
    invalid(
      (r) =>
        (r["dimensions"] = [
          { category: "QA-TEST", score: 1, errors: -1, warnings: 0, infos: 0 },
        ]),
    );
    invalid(
      (r) =>
        (r["dimensions"] = [
          { category: "QA-TEST", score: 1, errors: 0.1, warnings: 0, infos: 0 },
        ]),
    );
  });

  it("rejects malformed finding fields", () => {
    for (const [field, value] of [
      ["ruleId", ""],
      ["category", "bad"],
      ["severity", "fatal"],
      ["confidence", "certain"],
      ["findingType", "guess"],
      ["qaImpact", "unknown"],
      ["file", ""],
      ["line", 0],
      ["column", 0],
      ["message", ""],
      ["why", ""],
      ["fix", ""],
      ["evidenceLevel", "E9"],
      ["trustLevel", "L9"],
      ["detectorRevision", 0],
      ["measuredFpRate", 2],
    ] as const) {
      invalid((r) => {
        const finding = (r["findings"] as RecordValue[])[0];
        if (finding) finding[field] = value;
      });
    }
  });

  it("rejects malformed completion and scope fields", () => {
    invalid(
      (r) => ((r["analysisStatus"] as RecordValue)["discovery"] = "unknown"),
    );
    invalid((r) => ((r["analysisStatus"] as RecordValue)["rules"] = "unknown"));
    invalid(
      (r) => ((r["analysisStatus"] as RecordValue)["durationMs"] = Number.NaN),
    );
    invalid((r) => ((r["analysisStatus"] as RecordValue)["rulesCrashed"] = -1));
    invalid(
      (r) => ((r["analysisStatus"] as RecordValue)["parseFallbacks"] = -1),
    );
    invalid(
      (r) => ((r["analysisStatus"] as RecordValue)["truncationReasons"] = [1]),
    );
    invalid(
      (r) => ((r["analysisStatus"] as RecordValue)["truncationReasons"] = {}),
    );
    invalid((r) => ((r["analysisStatus"] as RecordValue)["reasons"] = [1]));
    invalid((r) => ((r["analysisStatus"] as RecordValue)["reasons"] = {}));
    invalid(
      (r) =>
        (r["scopeIntegrity"] = {
          discovered: 1,
          analyzed: 1,
          ignored: 0,
          unrecognized: 0,
          parseFailed: 0,
          truncated: 0,
          scopeVerdict: "unknown",
        }),
    );
    invalid(
      (r) =>
        (r["scopeIntegrity"] = {
          discovered: -1,
          analyzed: 1,
          ignored: 0,
          unrecognized: 0,
          parseFailed: 0,
          truncated: 0,
          scopeVerdict: "PROVEN",
        }),
    );
    invalid(
      (r) =>
        (r["scopeIntegrity"] = {
          discovered: 1,
          analyzed: 1,
          ignored: 0,
          unrecognized: 0,
          parseFailed: 0,
          truncated: 0,
          scopeVerdict: "PARTIAL",
          reasons: [1],
        }),
    );
    invalid(
      (r) =>
        (r["scopeIntegrity"] = {
          discovered: 1,
          analyzed: 1,
          ignored: 0,
          unrecognized: 0,
          parseFailed: 0,
          truncated: 0,
          scopeVerdict: "PARTIAL",
          reasons: {},
        }),
    );
  });

  it("rejects contradictory completion states", () => {
    invalid((r) => {
      r["partial"] = false;
      (r["analysisStatus"] as RecordValue)["discovery"] = "partial";
    });
    invalid((r) => (r["partial"] = true));
    invalid((r) => (r["partial"] = true));
    const report = validReport();
    report["partial"] = true;
    report["score"] = 100;
    expect(() => validateReportJson(JSON.stringify(report))).toThrow();
  });

  it("rejects oversized text and findings", () => {
    expect(() => validateReportJson("x".repeat(32 * 1024 * 1024))).toThrow();
    const report = validReport();
    report["findings"] = Array.from({ length: 10_001 }, () => ({
      ruleId: "QA-TEST-001",
      category: "QA-TEST",
      severity: "warning",
      confidence: "medium",
      findingType: "heuristic-risk",
      qaImpact: "HYGIENE",
      file: "a",
      line: 1,
      column: 1,
      message: "m",
      why: "w",
      fix: "f",
    }));
    expect(() => validateReportJson(JSON.stringify(report))).toThrow();
  });

  it("rejects a complete flag with a partial scope verdict", () => {
    const report = validReport();
    report["scopeIntegrity"] = {
      discovered: 1,
      analyzed: 1,
      ignored: 0,
      unrecognized: 0,
      parseFailed: 0,
      truncated: 0,
      scopeVerdict: "PARTIAL",
      reasons: ["unrecognized"],
    };
    expect(() => validateReportJson(JSON.stringify(report))).toThrow();
  });

  it("rejects malformed saved files and follows symlink boundaries", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-report-io-"));
    try {
      const file = join(dir, "report.json");
      writeFileSync(file, JSON.stringify(validReport()), "utf8");
      expect(loadSavedReport(file)).toMatchObject({ schemaVersion: 1 });
      const link = join(dir, "linked.json");
      try {
        symlinkSync(file, link, "file");
        expect(() => loadSavedReport(link)).toThrow();
      } catch {
        return;
      }
      writeFileSync(join(dir, "placeholder"), "", "utf8");
      const directory = join(dir, "directory");
      expect(() => loadSavedReport(directory)).toThrow();
      const oversized = join(dir, "oversized.json");
      writeFileSync(oversized, "x".repeat(32 * 1024 * 1024 + 1), "utf8");
      expect(() => loadSavedReport(oversized)).toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
