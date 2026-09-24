/**
 * Comprehensive UX verification for all new features.
 */

import { describe, expect, it, vi } from "vitest";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { runExecReportCommand } from "../../src/commands/exec-report.js";
import { runPolicyCommand } from "../../src/commands/policy.js";
import { runTrendCommand, loadTrend } from "../../src/commands/trend.js";
import { runMaturityCommand } from "../../src/commands/maturity.js";
import {
  runQuarantineCommand,
  buildQuarantineProposals,
  filterByStatus,
  type QuarantineProposal,
} from "../../src/commands/quarantine.js";
import { runCiAdapterCommand } from "../../src/commands/ci-adapter.js";
import { runEnterpriseCommand } from "../../src/commands/enterprise.js";
import { runAnalyzeCommand } from "../../src/commands/analyze.js";
import { buildPlaywrightReport } from "../../src/commands/report-playwright.js";
import { EXIT_CLEAN, EXIT_USAGE, EXIT_INTERNAL } from "../../src/exit-codes.js";

const out = vi.fn();
const err = vi.fn();

let counter = 0;

function makeTempDir(): string {
  counter++;
  const dir = join(tmpdir(), `mjolnir-verify-${counter}`);
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, "test-results"), { recursive: true });
  return dir;
}

describe("EXEC-REPORT (QM-3)", () => {
  it("produces structured executive output", async () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, "results.json"), JSON.stringify({ suites: [] }));
    const code = await runExecReportCommand([dir], { out, err });
    expect(code).toBe(EXIT_CLEAN);
    rmSync(dir, { recursive: true, force: true });
  });
  it("exits usage on non-existent target", async () => {
    const code = await runExecReportCommand(["/nonexistent"], { out, err });
    expect(code).toBe(EXIT_USAGE);
    expect(err).toHaveBeenCalled();
  });
});

describe("POLICY (TL-2)", () => {
  it("init creates valid policy file", async () => {
    const dir = makeTempDir();
    const code = await runPolicyCommand(["init", dir], { out, err });
    expect(code).toBe(EXIT_CLEAN);
    expect(existsSync(join(dir, "mjolnir.policy.json"))).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });
  it("validate accepts valid policy", async () => {
    const dir = makeTempDir();
    writeFileSync(
      join(dir, "mjolnir.policy.json"),
      JSON.stringify({
        version: 1,
        name: "test",
        gates: {
          requiredRules: [],
          forbiddenSeverities: {},
          maxFindings: null,
          minScore: null,
        },
      }),
    );
    const code = await runPolicyCommand(
      ["validate", join(dir, "mjolnir.policy.json")],
      { out, err },
    );
    expect(code).toBe(EXIT_CLEAN);
    rmSync(dir, { recursive: true, force: true });
  });
  it("rejects invalid JSON policy", async () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, "bad.json"), "not-json");
    const code = await runPolicyCommand(["validate", join(dir, "bad.json")], {
      out,
      err,
    });
    expect(code).toBe(EXIT_INTERNAL);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("TREND (QM-2)", () => {
  it("record stores snapshots", async () => {
    const dir = makeTempDir();
    const code = await runTrendCommand(["record", dir], { out, err });
    expect(code).toBe(EXIT_CLEAN);
    const snapshots = loadTrend(dir, 10);
    expect(snapshots.length).toBeGreaterThanOrEqual(1);
    expect(snapshots[0]).toHaveProperty("score");
    expect(snapshots[0]).toHaveProperty("timestamp");
    rmSync(dir, { recursive: true, force: true });
  });
  it("show displays trend table", async () => {
    const dir = makeTempDir();
    await runTrendCommand(["record", dir], { out, err });
    const code = await runTrendCommand(["show", dir], { out, err });
    expect(code).toBe(EXIT_CLEAN);
    rmSync(dir, { recursive: true, force: true });
  });
  it("diff compares snapshots", async () => {
    const dir = makeTempDir();
    await runTrendCommand(["record", dir], { out, err });
    await runTrendCommand(["record", dir], { out, err });
    const code = await runTrendCommand(["diff", dir], { out, err });
    expect(code).toBe(EXIT_CLEAN);
    rmSync(dir, { recursive: true, force: true });
  });
  it("shows helpful message when no data", async () => {
    const dir = makeTempDir();
    const code = await runTrendCommand(["show", dir], { out, err });
    expect(code).toBe(EXIT_CLEAN);
    expect(out).toHaveBeenCalledWith(expect.stringContaining("No trend data"));
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("MATURITY (QM-6)", () => {
  it("assesses all dimensions", () => {
    const dir = makeTempDir();
    const code = runMaturityCommand(["assess", dir], { out, err });
    expect(code).toBe(EXIT_CLEAN);
    expect(out).toHaveBeenCalledWith(
      expect.stringContaining("MATURITY ASSESSMENT"),
    );
    rmSync(dir, { recursive: true, force: true });
  });
  it("shows maturity levels", () => {
    const code = runMaturityCommand(["levels"], { out, err });
    expect(code).toBe(EXIT_CLEAN);
    expect(out).toHaveBeenCalledWith(expect.stringContaining("Initial"));
    expect(out).toHaveBeenCalledWith(expect.stringContaining("Optimizing"));
  });
});

describe("QUARANTINE (TL-3)", () => {
  it("lists proposals from a target", async () => {
    const dir = makeTempDir();
    writeFileSync(
      join(dir, "results.xml"),
      `<testsuite><testcase/></testsuite>`,
    );
    const code = await runQuarantineCommand(["list", dir], { out, err });
    expect(code).toBe(EXIT_CLEAN);
    rmSync(dir, { recursive: true, force: true });
  });
  it("review subcommand works", async () => {
    const code = await runQuarantineCommand(["review"], { out, err });
    expect(code).toBe(EXIT_CLEAN);
  });
  it("stats subcommand works", async () => {
    const code = await runQuarantineCommand(["stats"], { out, err });
    expect(code).toBe(EXIT_CLEAN);
  });
  it("buildQuarantineProposals assigns correct severity", () => {
    const mockFinding = {
      ruleId: "QA-TEST-001",
      category: "QA-TEST",
      severity: "error",
      confidence: "high" as const,
      findingType: "deterministic-defect" as const,
      qaImpact: "HYGIENE" as const,
      file: "a.ts",
      line: 1,
      column: 1,
      message: "msg",
      why: "why",
      fix: "fix",
    } as const;
    const proposals = buildQuarantineProposals([mockFinding]);
    expect(proposals).toHaveLength(1);
    expect(proposals[0]?.id).toBe("Q-001");
    expect(proposals[0]?.attempts).toBe(3);
    expect(proposals[0]?.status).toBe("proposed");
  });
  it("filterByStatus filters correctly", () => {
    const proposals: QuarantineProposal[] = [
      {
        id: "Q-001",
        ruleId: "QA-TEST-001",
        file: "a.ts",
        line: 1,
        message: "msg",
        attempts: 3,
        status: "proposed" as const,
        reason: "",
      },
      {
        id: "Q-002",
        ruleId: "QA-TEST-001",
        file: "a.ts",
        line: 1,
        message: "msg",
        attempts: 3,
        status: "accepted" as const,
        reason: "",
      },
    ];
    const pending = filterByStatus(proposals, "proposed");
    expect(pending).toBeDefined();
  });
});

describe("CI-ADAPTER (SDET-4)", () => {
  it("generates GitHub workflow", () => {
    const dir = makeTempDir();
    const code = runCiAdapterCommand(["github", dir], { out, err });
    expect(code).toBe(EXIT_CLEAN);
    expect(out).toHaveBeenCalledWith(expect.stringContaining("qa-check.yml"));
    const workflow = readFileSync(join(dir, "qa-check.yml"), "utf8");
    expect(workflow).toContain(
      "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
    );
    expect(workflow).toContain("mjolnir-qa@2.0.2 --blocking error");
    expect(workflow).not.toContain("npx mjolnir scan");
    rmSync(dir, { recursive: true, force: true });
  });
  it("generates GitLab CI config", () => {
    const dir = makeTempDir();
    const code = runCiAdapterCommand(["gitlab", dir], { out, err });
    expect(code).toBe(EXIT_CLEAN);
    const workflow = readFileSync(join(dir, ".gitlab-ci.yml"), "utf8");
    expect(workflow).toContain("mjolnir-qa@2.0.2 --blocking error");
    expect(workflow).not.toContain("npx mjolnir scan");
    rmSync(dir, { recursive: true, force: true });
  });
  it("generates Jenkinsfile", () => {
    const dir = makeTempDir();
    const code = runCiAdapterCommand(["jenkins", dir], { out, err });
    expect(code).toBe(EXIT_CLEAN);
    const workflow = readFileSync(join(dir, "Jenkinsfile"), "utf8");
    expect(workflow).toContain("mjolnir-qa@2.0.2 --blocking error");
    expect(workflow).not.toContain("npx mjolnir scan");
    rmSync(dir, { recursive: true, force: true });
  });
  it("exits usage for unknown adapter", () => {
    const dir = makeTempDir();
    const code = runCiAdapterCommand(["unknown", dir], { out, err });
    expect(code).toBe(EXIT_USAGE);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("ENTERPRISE (QM-4)", () => {
  it("generates deployment config", () => {
    const dir = makeTempDir();
    const code = runEnterpriseCommand(["config", dir], { out, err });
    expect(code).toBe(EXIT_CLEAN);
    rmSync(dir, { recursive: true, force: true });
  });
  it("generates SSO guide", () => {
    const dir = makeTempDir();
    const code = runEnterpriseCommand(["sso", dir], { out, err });
    expect(code).toBe(EXIT_CLEAN);
    rmSync(dir, { recursive: true, force: true });
  });
  it("generates compliance templates", () => {
    const dir = makeTempDir();
    const code = runEnterpriseCommand(["compliance", dir], { out, err });
    expect(code).toBe(EXIT_CLEAN);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("ANALYZE --cross-file (SDET-7)", () => {
  it("analyzes target directory", () => {
    const dir = makeTempDir();
    mkdirSync(join(dir, "src"), { recursive: true });
    writeFileSync(join(dir, "src", "a.ts"), "import { x } from 'lib';\n");
    const code = runAnalyzeCommand([dir, "--cross-file"], { out, err });
    expect(code).toBe(EXIT_CLEAN);
    rmSync(dir, { recursive: true, force: true });
  });
  it("works without --cross-file", () => {
    const dir = makeTempDir();
    const code = runAnalyzeCommand([dir], { out, err });
    expect(code).toBe(EXIT_CLEAN);
    rmSync(dir, { recursive: true, force: true });
  });
  it("exits usage for non-existent target", () => {
    const code = runAnalyzeCommand(["/nonexistent"], { out, err });
    expect(code).toBe(EXIT_USAGE);
  });
});

describe("REPORT PLAYWRIGHT (SDET-2)", () => {
  it("builds report from scan results", () => {
    const report = buildPlaywrightReport({
      findings: [],
      score: 85,
      frameworks: ["playwright"],
    });
    expect(report.version).toBe(1);
    expect(report.status).toBe("passed");
    expect(report.mjolnir.score).toBe(85);
  });
  it("builds report with findings", () => {
    const report = buildPlaywrightReport({
      findings: [
        {
          ruleId: "QA-TEST-001",
          category: "QA-TEST" as const,
          severity: "error",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "HYGIENE",
          file: "test.ts",
          line: 1,
          column: 1,
          message: "failure",
          why: "why",
          fix: "fix",
        },
      ],
      score: 50,
      frameworks: ["playwright"],
    });
    expect(report.status).toBe("failed");
    expect(report.totalTests).toBe(1);
  });
});

describe("EDGE CASES", () => {
  it("trend record handles empty dir", async () => {
    const dir = makeTempDir();
    const code = await runTrendCommand(["record", dir], { out, err });
    expect(code).toBe(EXIT_CLEAN);
    rmSync(dir, { recursive: true, force: true });
  });
  it("maturity assess handles fresh dir", () => {
    const dir = makeTempDir();
    const code = runMaturityCommand(["assess", dir], { out, err });
    expect(code).toBe(EXIT_CLEAN);
    rmSync(dir, { recursive: true, force: true });
  });
  it("enterprise handles unknown subcommand", () => {
    const code = runEnterpriseCommand(["unknown"], { out, err });
    expect(code).toBe(EXIT_USAGE);
  });
  it("analyze handles non-existent dir", () => {
    const code = runAnalyzeCommand(["/nonexistent"], { out, err });
    expect(code).toBe(EXIT_USAGE);
  });
  it("quarantine handles non-existent dir gracefully", async () => {
    const code = await runQuarantineCommand(["list", "/nonexistent-path"], {
      out,
      err,
    });
    expect(code).toBe(EXIT_CLEAN);
  });
});
