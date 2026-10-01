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
vi.mock("../../src/commands/fix.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/commands/fix.js")>();
  return { ...actual, planAndApplyFixes: vi.fn() };
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

import {} from "../../src/commands/baseline.js";
import { explainRule } from "../../src/commands/explain.js";
import { loadConfig } from "../../src/config/config.js";
import { planAndApplyFixes } from "../../src/commands/fix.js";
import { renderHandover } from "../../src/commands/handover.js";
import { renderPrComment } from "../../src/commands/pr-comment.js";
import { renderStats } from "../../src/commands/stats.js";
import { runDoctorSelfAudit } from "../../src/commands/doctor.js";

import {
  runDoctorCommand,
  runExplainCommand,
  runFixCommand,
  runHandoverCommand,
  runPrCommentCommand,
  runScanCommand,
  runStatsCommand,
  runSuppressions,
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
  it("doctor", () => {
    throwOnce(runDoctorSelfAudit, ERR);
    const cap = capture();
    expect(runDoctorCommand([dir], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-err");
  });

  it("explain", async () => {
    throwOnce(explainRule, ERR);
    const cap = capture();
    expect(await runExplainCommand(["QA-TEST-001"], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-err");
  });

  it("fix", async () => {
    throwOnce(planAndApplyFixes, ERR);
    const cap = capture();
    expect(await runFixCommand([dir], cap.io)).toBe(20);
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
});

describe("exit-20 mapping: non-Error throwables render via String()", () => {
  it("doctor", () => {
    throwOnce(runDoctorSelfAudit, STR);
    const cap = capture();
    expect(runDoctorCommand([dir], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-str");
  });

  it("explain", async () => {
    throwOnce(explainRule, STR);
    const cap = capture();
    expect(await runExplainCommand(["QA-TEST-001"], cap.io)).toBe(20);
    expect(cap.errText()).toContain("boom-str");
  });

  it("fix", async () => {
    throwOnce(planAndApplyFixes, STR);
    const cap = capture();
    expect(await runFixCommand([dir], cap.io)).toBe(20);
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
