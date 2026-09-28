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
import { runCiAdapterCommand } from "../../src/commands/ci-adapter.js";
import { runAnalyzeCommand } from "../../src/commands/analyze.js";
import { EXIT_CLEAN, EXIT_USAGE, EXIT_INTERNAL } from "../../src/exit-codes.js";
import { ENGINE_VERSION } from "../../src/engine/version.js";

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

describe("EDGE CASES", () => {
  it("trend record handles empty dir", async () => {
    const dir = makeTempDir();
    const code = await runTrendCommand(["record", dir], { out, err });
    expect(code).toBe(EXIT_CLEAN);
    rmSync(dir, { recursive: true, force: true });
  });
  it("analyze handles non-existent dir", () => {
    const code = runAnalyzeCommand(["/nonexistent"], { out, err });
    expect(code).toBe(EXIT_USAGE);
  });
});
