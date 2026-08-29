/**
 * Tests for Tier-2/5 commands added post-0.2: handover, init, pw-report,
 * and the QA-PW-140 placeholder rule.
 */

import {
  mkdtempSync,
  mkdirSync,
  existsSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
import { qaPw140 } from "../src/rules/playwright/qa-pw-140.js";
import type { Finding, ScanResult } from "../src/types.js";
import type { ForensicsReport, TestVerdict } from "../src/forensics/types.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-new-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function finding(ruleId: string, file = "a.spec.ts", line = 1): Finding {
  return {
    ruleId,
    category: "QA-TEST",
    severity: "warning",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "FALSE-GREEN",
    file,
    line,
    column: 1,
    message: `msg ${ruleId}`,
    why: "why",
    fix: "fix",
  };
}

function scan(findings: Finding[], score: number | null = 80): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score,
    frameworks: [],
    frameworkDetectionUnknown: true,
    dimensions: [],
    findings,
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 1,
    },
  };
}

function verdict(partial: Partial<TestVerdict> = {}): TestVerdict {
  return {
    file: "a.spec.ts",
    title: "t",
    attempts: 1,
    finalStatus: "passed",
    totalDurationMs: 100,
    passedOnRetry: false,
    everFailed: false,
    skipped: false,
    ...partial,
  };
}

function report(verdicts: TestVerdict[]): ForensicsReport {
  return {
    source: "junit-xml",
    totalTests: verdicts.length,
    failed: verdicts.filter((v) => v.everFailed && !v.passedOnRetry).length,
    skipped: 0,
    retriedTests: verdicts.filter((v) => v.attempts >= 2).length,
    flakyTests: verdicts.filter((v) => v.passedOnRetry).length,
    totalDurationMs: verdicts.reduce((s, v) => s + v.totalDurationMs, 0),
    verdicts,
  };
}

describe("buildHandover", () => {
  it("groups findings into fake-green / flaky / CI-trust sections", () => {
    const map = buildHandover(
      scan([
        finding("QA-TEST-003", "x/a.spec.ts"),
        finding("QA-TEST-004", "y/b.spec.ts", 5),
        finding("QA-CI-001", ".github/workflows/ci.yml", 9),
      ]),
      null,
    );
    const headings = map.sections.map((s) => s.heading);
    expect(headings.some((h) => h.includes("Fake-green"))).toBe(true);
    expect(headings.some((h) => h.includes("flaky"))).toBe(true);
    expect(headings.some((h) => h.includes("CI trust"))).toBe(true);
    expect(map.summaryLine).toContain("3 things");
  });

  it("includes TRUE-FLAKE entries from forensics run data", () => {
    const map = buildHandover(
      scan([]),
      report([
        verdict({
          title: "lucky",
          attempts: 2,
          passedOnRetry: true,
          everFailed: true,
        }),
      ]),
    );
    const flakySection = map.sections.find((s) => s.heading.includes("flaky"));
    expect(flakySection?.items[0]).toContain("lucky");
    expect(flakySection?.items[0]).toContain("TRUE-FLAKE");
  });

  it("renders solid-foundation section for clean scans", () => {
    const map = buildHandover(scan([], 95), null);
    expect(map.sections[0]?.heading).toContain("Solid foundation");
    expect(renderHandover(map)).toContain("WELCOME TO THE TEST SUITE");
    expect(map.summaryLine).toContain("good shape");
  });

  it("caps section items at documented limits", () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      finding("QA-TEST-003", `f${i}.spec.ts`, i + 1),
    );
    const map = buildHandover(scan(many), null);
    const fg = map.sections.find((s) => s.heading.includes("Fake-green"));
    expect(fg?.items.length).toBeLessThanOrEqual(5);
  });
});

describe("runInit", () => {
  it("reports created steps and next commands on a bare repo", () => {
    const res = runInit(dir, null);
    expect(res.detectionUnknown).toBe(true);
    expect(res.nextCommands).toContain("mjolnir ci install");
    expect(res.nextCommands).toContain("mjolnir badge");
    const wf = res.steps.find((s) => s.name === "ci-workflow");
    expect(wf?.status).toBe("created");
    expect(renderInit(res)).toContain("MJÖLNIR INIT");
    expect(renderInit(res)).toContain("[-] framework-detection");
  });

  it("reports existing files without overwriting", () => {
    mkdirSync(join(dir, ".github", "workflows"), { recursive: true });
    writeFileSync(join(dir, ".github", "workflows", "mjolnir.yml"), "on: push");
    writeFileSync(join(dir, "mjolnir-badge.json"), "{}");
    writeFileSync(join(dir, "mjolnir.config.json"), "{}");
    const res = runInit(dir, null);
    expect(res.steps.find((s) => s.name === "ci-workflow")?.status).toBe(
      "exists",
    );
    expect(res.steps.find((s) => s.name === "badge")?.status).toBe("exists");
    expect(res.steps.find((s) => s.name === "config")?.status).toBe("exists");
    expect(res.nextCommands).toHaveLength(0);
    expect(existsSync(join(dir, ".github", "workflows", "mjolnir.yml"))).toBe(
      true,
    );
  });

  it("detects frameworks when workspace provided", () => {
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "t" }));
    writeFileSync(join(dir, "vitest.config.ts"), "");
    const ws = {
      root: dir,
      name: "t",
      packageJson: {},
      workspaceGlobs: [],
    };
    const res = runInit(dir, ws);
    expect(res.detectedFrameworks).toEqual(["vitest"]);
    expect(res.detectionUnknown).toBe(false);
  });

  it("notes interactive degradation without TTY", () => {
    const res = runInit(dir, null, { interactive: true });
    const note = res.steps.find((s) => s.name === "interactive");
    // In CI/test env there is no TTY → degradation note present.
    if (!(process.stdout.isTTY ?? false)) {
      expect(note?.status).toBe("skipped");
    }
  });
});

describe("tryReadPackageJson", () => {
  it("returns null when missing or invalid", () => {
    expect(tryReadPackageJson(dir)).toBeNull();
    writeFileSync(join(dir, "package.json"), "{ broken");
    expect(tryReadPackageJson(dir)).toBeNull();
  });

  it("parses valid package.json", () => {
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "ok" }));
    expect(tryReadPackageJson(dir)).toEqual({ name: "ok" });
  });
});

describe("summarizePwRun / renderPwRunSummary", () => {
  it("summarizes pass/fail/retry/flake counts and slowest tests", () => {
    const s = summarizePwRun(
      report([
        verdict({ title: "slow", totalDurationMs: 5000 }),
        verdict({
          title: "lucky",
          attempts: 2,
          passedOnRetry: true,
          everFailed: true,
          totalDurationMs: 100,
        }),
        verdict({ title: "dead", finalStatus: "failed", everFailed: true }),
      ]),
    );
    expect(s.total).toBe(3);
    // 'dead' has everFailed → counted in report.failed; 'lucky' also
    // everFailed but passedOnRetry excludes it from failed.
    expect(s.passed).toBe(2);
    expect(s.failed).toBe(1);
    expect(s.trueFlakes).toBe(1);
    expect(s.slowest[0]?.title).toBe("slow");

    const text = renderPwRunSummary(s);
    expect(text).toContain("RUN SUMMARY");
    expect(text).toContain("3 tests · 2 passed · 1 failed · 0 skipped");
    expect(text).toContain("TRUE-FLAKE");
    expect(text).toContain("Slowest:");
    expect(text).toContain("5.0s  slow");
  });

  it("omits retry line for clean runs", () => {
    const text = renderPwRunSummary(summarizePwRun(report([verdict()])));
    expect(text).not.toContain("retried");
  });

  it("shows the retry line and singular TRUE-FLAKE wording via the retried count", () => {
    const s = summarizePwRun(
      report([
        verdict({
          title: "lucky",
          attempts: 2,
          passedOnRetry: true,
          everFailed: true,
        }),
      ]),
    );
    const text = renderPwRunSummary({ ...s, retried: 1, trueFlakes: 1 });
    expect(text).toContain("1 retried");
    expect(text).toContain("1 TRUE-FLAKE (passed only");
  });

  it("omits the Slowest block when every duration is zero", () => {
    const text = renderPwRunSummary(
      summarizePwRun(report([verdict({ totalDurationMs: 0 })])),
    );
    expect(text).not.toContain("Slowest:");
  });
});

describe("QA-PW-140 placeholder rule", () => {
  it("is registered with correct metadata and stays silent (placeholder)", () => {
    expect(qaPw140.id).toBe("QA-PW-140");
    expect(qaPw140.severity).toBe("warning");
    expect(
      qaPw140.run({ path: "a.spec.ts", text: "page.screenshot()" }),
    ).toEqual([]);
  });
});
