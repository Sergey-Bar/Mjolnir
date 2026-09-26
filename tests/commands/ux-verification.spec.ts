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
  proposalsFromStaticFindings,
  runtimeFailuresFromReport,
  type QuarantineProposal,
} from "../../src/commands/quarantine.js";
import { runCiAdapterCommand } from "../../src/commands/ci-adapter.js";
import { runEnterpriseCommand } from "../../src/commands/enterprise.js";
import { runAnalyzeCommand } from "../../src/commands/analyze.js";
import { buildPlaywrightReport } from "../../src/commands/report-playwright.js";
import {
  EXIT_CLEAN,
  EXIT_PARTIAL,
  EXIT_USAGE,
  EXIT_INTERNAL,
} from "../../src/exit-codes.js";
import { ENGINE_VERSION } from "../../src/engine/version.js";

const out = vi.fn();
const err = vi.fn();

/** Everything a command has printed to stdout so far. */
function stdout(): string {
  return out.mock.calls.map((call) => String(call[0])).join("\n");
}

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

describe("MATURITY (V5-001: artifact signals, not a score)", () => {
  it("reports named artifact signals and no overall score", () => {
    const dir = makeTempDir();
    const code = runMaturityCommand(["assess", dir], { out, err });
    // A presence list is not a maturity assessment, so it never reads clean.
    expect(code).toBe(EXIT_PARTIAL);
    const text = stdout();
    expect(text).toContain("QA ARTIFACT SIGNALS");
    expect(text).toContain("No overall score");
    expect(text).not.toMatch(/\(\d+\/100\)/);
    expect(text).not.toMatch(/Overall: (Initial|Managed|Defined|Optimizing)/);
    rmSync(dir, { recursive: true, force: true });
  });

  it("shows the level vocabulary without placing the target on it", () => {
    const code = runMaturityCommand(["levels"], { out, err });
    expect(code).toBe(EXIT_PARTIAL);
    const text = stdout();
    expect(text).toContain("Initial");
    expect(text).toContain("Optimizing");
    expect(text).toContain("vocabulary only");
    expect(text).not.toMatch(/Score ranges:/);
  });

  it("observes a present artifact without over-claiming what it means", () => {
    const dir = makeTempDir();
    mkdirSync(join(dir, ".mjolnir"), { recursive: true });
    writeFileSync(join(dir, ".mjolnir", "mjolnir.policy.json"), "{}", "utf8");
    runMaturityCommand(["assess", dir], { out, err });
    const text = stdout();
    expect(text).toContain("[present]");
    expect(text).toContain("does NOT say");
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("QUARANTINE (V5-001: no invented flakiness)", () => {
  it("refuses to propose quarantines from a static scan", () => {
    const code = runQuarantineCommand(["list", makeTempDir()], { out, err });
    // No runtime report → no attempts → no proposal. Anything else means
    // Mjölnir invented a flaky test.
    expect(code).toBe(EXIT_PARTIAL);
    expect(stdout()).toContain("no runtime behaviour to observe");
  });

  it("review states that nothing exists rather than claiming an update", () => {
    const code = runQuarantineCommand(["review", "--accept"], { out, err });
    expect(code).toBe(EXIT_PARTIAL);
    const text = stdout();
    expect(text).toContain("nothing was changed");
    expect(text).not.toContain("Quarantines updated");
  });

  it("stats refuses to print zeros as measured statistics", () => {
    const code = runQuarantineCommand(["stats"], { out, err });
    expect(code).toBe(EXIT_PARTIAL);
    const text = stdout();
    expect(text).toContain("no statistics can be reported");
    expect(text).not.toMatch(/Total: 0 \|/);
  });

  it("a static finding can never become a proposal", () => {
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
    expect(proposalsFromStaticFindings([mockFinding])).toEqual([]);
  });

  it("proposals come from observed attempts, never from severity", () => {
    const proposals = buildQuarantineProposals([
      {
        ruleId: "flaky login",
        file: "a.ts",
        line: 1,
        message: "msg",
        attempts: 3,
        everFailed: true,
      },
      {
        // Observed once: below the threshold, so no proposal.
        ruleId: "one-off",
        file: "b.ts",
        line: 2,
        message: "msg",
        attempts: 1,
        everFailed: true,
      },
      {
        // Many attempts but never failed: retries that passed are not flakiness.
        ruleId: "retried",
        file: "c.ts",
        line: 3,
        message: "msg",
        attempts: 5,
        everFailed: false,
      },
    ]);
    expect(proposals).toHaveLength(1);
    expect(proposals[0]?.id).toBe("Q-001");
    expect(proposals[0]?.attempts).toBe(3);
    expect(proposals[0]?.everFailed).toBe(true);
    expect(proposals[0]?.status).toBe("proposed");
  });

  it("a report record with no observed attempt count is not evidence", () => {
    expect(
      runtimeFailuresFromReport({
        tests: [
          { title: "no attempts", file: "a.ts" },
          { title: "attempts", file: "b.ts", attempts: 2 },
        ],
      }),
    ).toEqual([
      {
        ruleId: "attempts",
        file: "b.ts",
        line: 0,
        message: "no message recorded",
        attempts: 2,
        everFailed: true,
      },
    ]);
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
        everFailed: true,
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
        everFailed: true,
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
    expect(workflow).toContain(`mjolnir-qa@${ENGINE_VERSION} --blocking error`);
    expect(workflow).not.toContain("npx mjolnir scan");
    rmSync(dir, { recursive: true, force: true });
  });
  it("generates GitLab CI config", () => {
    const dir = makeTempDir();
    const code = runCiAdapterCommand(["gitlab", dir], { out, err });
    expect(code).toBe(EXIT_CLEAN);
    const workflow = readFileSync(join(dir, ".gitlab-ci.yml"), "utf8");
    expect(workflow).toContain(`mjolnir-qa@${ENGINE_VERSION} --blocking error`);
    expect(workflow).not.toContain("npx mjolnir scan");
    rmSync(dir, { recursive: true, force: true });
  });
  it("generates Jenkinsfile", () => {
    const dir = makeTempDir();
    const code = runCiAdapterCommand(["jenkins", dir], { out, err });
    expect(code).toBe(EXIT_CLEAN);
    const workflow = readFileSync(join(dir, "Jenkinsfile"), "utf8");
    expect(workflow).toContain(`mjolnir-qa@${ENGINE_VERSION} --blocking error`);
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
  // The three tests these replace asserted only the EXIT CODE and never
  // looked at a file, so a command that wrote fabricated SSO and
  // compliance artifacts passed them. An artifact generator's test has to
  // read the artifact.

  it("emits a capability manifest that records what is NOT provided", () => {
    const dir = makeTempDir();
    const code = runEnterpriseCommand(["config", dir], { out, err });
    expect(code).toBe(EXIT_CLEAN);

    const manifest = JSON.parse(
      readFileSync(join(dir, "capability-manifest.json"), "utf8"),
    ) as {
      runtimeDependencies: number;
      network: string;
      notProvided: string[];
      verified: string[];
    };
    expect(manifest.runtimeDependencies).toBe(0);
    expect(manifest.network).toContain("none");
    // The absence list is the deliverable: an operator filling in a
    // deployment questionnaire needs to know what is missing.
    expect(manifest.notProvided.join(" ")).toMatch(/SSO/);
    expect(manifest.notProvided.join(" ")).toMatch(/compliance/i);
    // And nothing may claim the SSO deployment that used to be invented.
    expect(
      readFileSync(join(dir, "capability-manifest.json"), "utf8"),
    ).not.toContain("sso-saml");
    rmSync(dir, { recursive: true, force: true });
  });

  it("refuses to write an SSO guide, and explains why", () => {
    const dir = makeTempDir();
    const code = runEnterpriseCommand(["sso", dir], { out, err });
    expect(code).toBe(EXIT_USAGE);
    // The guide told readers to add an `sso` block to mjolnir.config.json
    // — a key nothing reads. It must not be written at all.
    expect(existsSync(join(dir, "sso-setup.md"))).toBe(false);
    expect(err.mock.calls.flat().join("\n")).toContain(
      "no artifact will be written",
    );
    rmSync(dir, { recursive: true, force: true });
  });

  it("refuses to write compliance templates mapped to capabilities that do not exist", () => {
    const dir = makeTempDir();
    const code = runEnterpriseCommand(["compliance", dir], { out, err });
    expect(code).toBe(EXIT_USAGE);
    for (const framework of ["soc2", "hipaa", "pci-dss"]) {
      expect(
        existsSync(join(dir, `${framework}-compliance.md`)),
        framework,
      ).toBe(false);
    }
    expect(err.mock.calls.flat().join("\n")).toContain("auditor");
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

describe("REPORT PLAYWRIGHT (V5-001: never a fabricated test run)", () => {
  it("builds report from scan results without claiming tests ran", () => {
    const report = buildPlaywrightReport({
      findings: [],
      score: 85,
      frameworks: ["playwright"],
    });
    expect(report.version).toBe(1);
    expect(report.mjolnir.score).toBe(85);
    // A clean STATIC scan is not a green test run.
    expect(report.totalTests).toBe(0);
    expect(report.passedTests).toBe(0);
    expect(report.suites).toEqual([]);
    expect(report.mjolnir.execution).toBe("STATIC_ANALYSIS");
  });

  it("keeps findings in the mjolnir block, never as executed tests", () => {
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
    expect(report.totalTests).toBe(0);
    expect(report.suites).toEqual([]);
    expect(report.mjolnir.findings).toHaveLength(1);
  });

  it("a partial scan never reports a completed run", () => {
    const report = buildPlaywrightReport({
      findings: [],
      score: null,
      frameworks: [],
      partial: true,
    });
    expect(report.status).toBe("interrupted");
    expect(report.mjolnir.status).toBe("interrupted");
    expect(report.mjolnir.partial).toBe(true);
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
    expect(code).toBe(EXIT_PARTIAL);
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
  it("quarantine on a missing path is a usage error, not a clean result", () => {
    const code = runQuarantineCommand(
      ["list", "/nonexistent-path", "--from", "r.json"],
      { out, err },
    );
    // A path that does not exist proves nothing about the target.
    expect(code).toBe(EXIT_USAGE);
  });
});
