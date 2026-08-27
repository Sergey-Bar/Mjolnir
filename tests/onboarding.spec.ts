/**
 * Tests for handover (#28), init (#10), and pw-report (#9) commands.
 */

import { describe, expect, it } from "vitest";
import { buildHandover, renderHandover } from "../src/commands/handover.js";
import {
  renderInit,
  runInit,
  tryReadPackageJson,
} from "../src/commands/init.js";
import {
  renderPwRunSummary,
  summarizePwRun,
} from "../src/commands/pw-report.js";
import type { ScanResult } from "../src/types.js";
import type { ForensicsReport, TestVerdict } from "../src/forensics/types.js";

function scan(
  findings: Array<Partial<ScanResult["findings"][number]>> = [],
): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 80,
    frameworks: [],
    frameworkDetectionUnknown: false,
    dimensions: [],
    findings: findings.map((f) => ({
      ruleId: "QA-TEST-003",
      category: "QA-TEST",
      severity: "error",
      confidence: "high",
      findingType: "deterministic-defect",
      qaImpact: "FALSE-GREEN",
      file: "a.spec.ts",
      line: 1,
      column: 1,
      message: "m",
      why: "w",
      fix: "f",
      ...f,
    })),
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 1,
    },
  };
}

function verdict(p: Partial<TestVerdict>): TestVerdict {
  return {
    file: "a.spec.ts",
    title: "t",
    attempts: 1,
    finalStatus: "passed",
    totalDurationMs: 100,
    passedOnRetry: false,
    everFailed: false,
    skipped: false,
    ...p,
  };
}

describe("handover", () => {
  it("groups fake-green, flaky and CI-trust into sections", () => {
    const map = buildHandover(
      scan([
        { ruleId: "QA-TEST-003", file: "auth/login.spec.ts" },
        { ruleId: "QA-TEST-004", file: "pay/checkout.spec.ts" },
        { ruleId: "QA-CI-001", file: ".github/workflows/ci.yml" },
      ]),
      null,
    );
    const headings = map.sections.map((s) => s.heading).join("\n");
    expect(headings).toContain("Fake-green");
    expect(headings).toContain("flaky");
    expect(headings).toContain("CI trust");
  });

  it("uses real run data for the flaky section when provided", () => {
    const forensics: ForensicsReport = {
      source: "junit-xml",
      totalTests: 2,
      failed: 0,
      skipped: 0,
      retriedTests: 1,
      flakyTests: 1,
      totalDurationMs: 500,
      verdicts: [
        verdict({
          title: "lucky",
          attempts: 2,
          passedOnRetry: true,
          everFailed: true,
        }),
        verdict({ title: "solid" }),
      ],
    };
    const map = buildHandover(scan(), forensics);
    const flakySection = map.sections.find((s) => s.heading.includes("flaky"));
    expect(flakySection?.items.some((i) => i.includes("lucky"))).toBe(true);
  });

  it("welcomes a clean suite without shaming", () => {
    const map = buildHandover(scan(), null);
    expect(map.summaryLine).toContain("good shape");
    expect(renderHandover(map)).toContain("Solid foundation");
  });

  it("summary counts issues with progress framing", () => {
    const map = buildHandover(
      scan([{ ruleId: "QA-TEST-003" }, { ruleId: "QA-TEST-004" }]),
      null,
    );
    expect(map.summaryLine).toContain("2 things to know");
  });
});

describe("init", () => {
  it("is idempotent — never overwrites existing files", () => {
    // runInit only reports; it must not create CI workflow itself.
    const result = runInit("/nonexistent-root", null, {});
    const wfStep = result.steps.find((s) => s.name === "ci-workflow");
    expect(wfStep?.status).toBe("created");
    expect(wfStep?.detail).toContain("ci install");
    // And it must not have written anything to the (nonexistent) root.
    expect(result.nextCommands).toContain("mjolnir ci install");
  });

  it("reports unknown frameworks honestly", () => {
    const result = runInit("/nonexistent-root", null, {});
    const fw = result.steps.find((s) => s.name === "framework-detection");
    expect(fw?.status).toBe("skipped");
    expect(result.detectionUnknown).toBe(true);
  });

  it("renders next commands when files are missing", () => {
    const text = renderInit(runInit("/nonexistent-root", null, {}));
    expect(text).toContain("$ mjolnir ci install");
    expect(text).toContain("safe to re-run");
  });

  it("tryReadPackageJson returns null on missing/broken file", () => {
    expect(tryReadPackageJson("/definitely/not/here")).toBeNull();
  });
});

describe("pw-report", () => {
  it("summarizes a run with retries and flakes", () => {
    const report: ForensicsReport = {
      source: "playwright-json",
      totalTests: 3,
      failed: 1,
      skipped: 0,
      retriedTests: 1,
      flakyTests: 1,
      totalDurationMs: 5000,
      verdicts: [
        verdict({
          title: "lucky",
          attempts: 2,
          passedOnRetry: true,
          everFailed: true,
        }),
        verdict({ title: "dead", finalStatus: "failed", everFailed: true }),
        verdict({ title: "ok" }),
      ],
    };
    const s = summarizePwRun(report);
    expect(s.total).toBe(3);
    expect(s.trueFlakes).toBe(1);
    expect(s.slowest.length).toBeGreaterThan(0);
    const text = renderPwRunSummary(s);
    expect(text).toContain("TRUE-FLAKE");
    expect(text).toContain("Slowest:");
  });

  it("clean run omits retry line entirely", () => {
    const s = summarizePwRun({
      source: "junit-xml",
      totalTests: 1,
      failed: 0,
      skipped: 0,
      retriedTests: 0,
      flakyTests: 0,
      totalDurationMs: 100,
      verdicts: [verdict({})],
    });
    expect(renderPwRunSummary(s)).not.toContain("retried");
  });
});
