/**
 * The exit-20 contract of every command handler, for BOTH throw shapes:
 * real Error objects (message printed) and non-Error throwables (the
 * String(err) fallback). Each handler's downstream boundary is simulated
 * by a one-shot mock; the handler's catch behavior is what is under test.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/forensics/run.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/forensics/run.js")>();
  return { ...actual, runForensics: vi.fn() };
});
vi.mock("../../src/commands/doctor.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/commands/doctor.js")>();
  return { ...actual, runDoctorSelfAudit: vi.fn() };
});
vi.mock("../../src/commands/explain.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/commands/explain.js")>();
  return { ...actual, explainRule: vi.fn() };
});
vi.mock("../../src/commands/badge.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/commands/badge.js")>();
  return { ...actual, writeBadge: vi.fn() };
});
vi.mock("../../src/commands/debt.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/commands/debt.js")>();
  return { ...actual, renderDebt: vi.fn() };
});
vi.mock("../../src/commands/fix.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/commands/fix.js")>();
  return { ...actual, planAndApplyFixes: vi.fn() };
});
vi.mock("../../src/commands/create-rule.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/commands/create-rule.js")>();
  return { ...actual, createRuleScaffold: vi.fn() };
});
vi.mock("../../src/commands/impact.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/commands/impact.js")>();
  return { ...actual, computeImpact: vi.fn() };
});
vi.mock("../../src/commands/baseline.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/commands/baseline.js")>();
  return { ...actual, saveBaseline: vi.fn(), renderBaselineDiff: vi.fn() };
});
vi.mock("../../src/commands/pr-comment.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/commands/pr-comment.js")>();
  return { ...actual, renderPrComment: vi.fn() };
});
vi.mock("../../src/commands/stats.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/commands/stats.js")>();
  return { ...actual, renderStats: vi.fn() };
});
vi.mock("../../src/commands/init.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/commands/init.js")>();
  return { ...actual, runInit: vi.fn() };
});
vi.mock("../../src/commands/handover.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/commands/handover.js")>();
  return { ...actual, renderHandover: vi.fn() };
});
vi.mock("../../src/config/config.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/config/config.js")>();
  return {
    ...actual,
    // Default: a valid empty config, so scans reach the intended mocked
    // boundary; individual tests override with mockImplementationOnce.
    loadConfig: vi.fn(() => ({ config: {}, path: null, warnings: [] })),
  };
});

import {
  saveBaseline,
  renderBaselineDiff,
} from "../../src/commands/baseline.js";
import { computeImpact } from "../../src/commands/impact.js";
import { createRuleScaffold } from "../../src/commands/create-rule.js";
import { explainRule } from "../../src/commands/explain.js";
import { loadConfig } from "../../src/config/config.js";
import { planAndApplyFixes } from "../../src/commands/fix.js";
import { renderDebt } from "../../src/commands/debt.js";
import { renderHandover } from "../../src/commands/handover.js";
import { renderPrComment } from "../../src/commands/pr-comment.js";
import { renderStats } from "../../src/commands/stats.js";
import { runDoctorSelfAudit } from "../../src/commands/doctor.js";
import { runForensics } from "../../src/forensics/run.js";
import { runInit } from "../../src/commands/init.js";
import { writeBadge } from "../../src/commands/badge.js";

import {
  runBadgeCommand,
  runBaselineCommand,
  runCreateRuleCommand,
  runDebtCommand,
  runDiffCommand,
  runDoctorCommand,
  runExplainCommand,
  runFixCommand,
  runForensicsCommand,
  runHandoverCommand,
  runImpactCommand,
  runInitCommand,
  runPrCommentCommand,
  runPwReportCommand,
  runScanCommand,
  runStatsCommand,
  runSuppressions,
  runTriageCommand,
} from "../../src/cli.js";

const ERR = new Error("boom-err");
const STR = "boom-str";

/** Makes the mocked boundary throw once with an arbitrary payload —
 * the non-Error payload is how the String(err) fallback is reached. */
function throwOnce(boundary: unknown, payload: unknown): void {
  (
    boundary as { mockImplementationOnce: (fn: () => never) => unknown }
  ).mockImplementationOnce(() => {
    throw payload;
  });
}

let dir: string;
let origCwd: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-cli-err-"));
  origCwd = process.cwd();
  mkdirSync(join(dir, "tests", "fixtures"), { recursive: true });
  writeFileSync(
    join(dir, "clean.spec.ts"),
    "it('a', () => { expect(1).toBe(1); });\n",
  );
});
afterEach(() => {
  process.chdir(origCwd);
  rmSync(dir, { recursive: true, force: true });
  vi.clearAllMocks();
});

function capture() {
  const out: string[] = [];
  const errOut: string[] = [];
  return {
    out,
    errOut,
    io: {
      out: (...p: unknown[]) => out.push(p.map(String).join(" ")),
      err: (...p: unknown[]) => errOut.push(p.map(String).join(" ")),
    },
    errText: () => errOut.join("\n"),
  };
}

describe("exit-20 mapping: Error payload carries the message", () => {
  it("forensics", () => {
    throwOnce(runForensics, ERR);
    const cap = capture();
    expect(runForensicsCommand([dir], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-err");
  });

  it("triage", () => {
    throwOnce(runForensics, ERR);
    const cap = capture();
    expect(runTriageCommand([dir], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-err");
  });

  it("pw-report", () => {
    throwOnce(runForensics, ERR);
    const cap = capture();
    expect(runPwReportCommand([dir], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-err");
  });

  it("doctor", () => {
    throwOnce(runDoctorSelfAudit, ERR);
    const cap = capture();
    expect(runDoctorCommand([dir], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-err");
  });

  it("explain", () => {
    throwOnce(explainRule, ERR);
    const cap = capture();
    expect(runExplainCommand(["QA-TEST-001"], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-err");
  });

  it("badge", async () => {
    throwOnce(writeBadge, ERR);
    const cap = capture();
    expect(await runBadgeCommand([dir], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-err");
  });

  it("debt", async () => {
    throwOnce(renderDebt, ERR);
    const cap = capture();
    expect(await runDebtCommand([dir], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-err");
  });

  it("fix", async () => {
    throwOnce(planAndApplyFixes, ERR);
    const cap = capture();
    expect(await runFixCommand([dir], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-err");
  });

  it("create-rule", () => {
    throwOnce(createRuleScaffold, ERR);
    const cap = capture();
    expect(runCreateRuleCommand(["QA-PW-151", "--title", "T"], cap.io)).toBe(
      20,
    );
    expect(cap.errText()).toContain("boom-err");
  });

  it("impact", async () => {
    throwOnce(computeImpact, ERR);
    const cap = capture();
    expect(await runImpactCommand([dir], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-err");
  });

  it("baseline", async () => {
    throwOnce(saveBaseline, ERR);
    const cap = capture();
    expect(await runBaselineCommand([dir], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-err");
  });

  it("diff", async () => {
    throwOnce(renderBaselineDiff, ERR);
    const cap = capture();
    expect(await runDiffCommand([dir], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-err");
  });

  it("pr-comment", async () => {
    throwOnce(renderPrComment, ERR);
    const cap = capture();
    expect(await runPrCommentCommand([dir], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-err");
  });

  it("stats", () => {
    throwOnce(renderStats, ERR);
    const cap = capture();
    expect(runStatsCommand([dir], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-err");
  });

  it("handover", async () => {
    throwOnce(renderHandover, ERR);
    const cap = capture();
    expect(await runHandoverCommand([dir], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-err");
  });

  it("init", () => {
    throwOnce(runInit, ERR);
    const cap = capture();
    expect(runInitCommand([], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-err");
  });
});

describe("exit-20 mapping: non-Error throwables render via String()", () => {
  it("forensics", () => {
    throwOnce(runForensics, STR);
    const cap = capture();
    expect(runForensicsCommand([dir], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-str");
  });

  it("triage", () => {
    throwOnce(runForensics, STR);
    const cap = capture();
    expect(runTriageCommand([dir], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-str");
  });

  it("pw-report", () => {
    throwOnce(runForensics, STR);
    const cap = capture();
    expect(runPwReportCommand([dir], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-str");
  });

  it("doctor", () => {
    throwOnce(runDoctorSelfAudit, STR);
    const cap = capture();
    expect(runDoctorCommand([dir], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-str");
  });

  it("explain", () => {
    throwOnce(explainRule, STR);
    const cap = capture();
    expect(runExplainCommand(["QA-TEST-001"], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-str");
  });

  it("badge", async () => {
    throwOnce(writeBadge, STR);
    const cap = capture();
    expect(await runBadgeCommand([dir], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-str");
  });

  it("debt", async () => {
    throwOnce(renderDebt, STR);
    const cap = capture();
    expect(await runDebtCommand([dir], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-str");
  });

  it("fix", async () => {
    throwOnce(planAndApplyFixes, STR);
    const cap = capture();
    expect(await runFixCommand([dir], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-str");
  });

  it("create-rule", () => {
    throwOnce(createRuleScaffold, STR);
    const cap = capture();
    expect(runCreateRuleCommand(["QA-PW-151", "--title", "T"], cap.io)).toBe(
      20,
    );
    expect(cap.errText()).toContain("boom-str");
  });

  it("impact", async () => {
    throwOnce(computeImpact, STR);
    const cap = capture();
    expect(await runImpactCommand([dir], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-str");
  });

  it("baseline", async () => {
    throwOnce(saveBaseline, STR);
    const cap = capture();
    expect(await runBaselineCommand([dir], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-str");
  });

  it("diff", async () => {
    throwOnce(renderBaselineDiff, STR);
    const cap = capture();
    expect(await runDiffCommand([dir], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-str");
  });

  it("pr-comment", async () => {
    throwOnce(renderPrComment, STR);
    const cap = capture();
    expect(await runPrCommentCommand([dir], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-str");
  });

  it("stats", () => {
    throwOnce(renderStats, STR);
    const cap = capture();
    expect(runStatsCommand([dir], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-str");
  });

  it("handover", async () => {
    throwOnce(renderHandover, STR);
    const cap = capture();
    expect(await runHandoverCommand([dir], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-str");
  });

  it("init", () => {
    throwOnce(runInit, STR);
    const cap = capture();
    expect(runInitCommand([], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-str");
  });
});

describe("unknown config errors propagate (exit-20 path stays honest)", () => {
  it("suppressions maps non-ConfigValidationError errors to exit 20 (audit S8: contained, never rethrown)", () => {
    throwOnce(loadConfig, ERR);
    process.chdir(dir);
    const errLines: string[] = [];
    // Audit C3: the sink is variadic — join all parts so the cause is
    // actually captured by the test harness too.
    const code = runSuppressions({
      out: () => {},
      err: (...m: unknown[]) => errLines.push(m.map(String).join(" ")),
    });
    expect(code).toBe(20);
    expect(errLines.join("\n")).toContain("boom-err");
  });

  it("scan maps a generic non-Error config failure to exit 20", async () => {
    throwOnce(loadConfig, STR);
    const cap = capture();
    expect(await runScanCommand([dir, "--json"], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-str");
  });
});
