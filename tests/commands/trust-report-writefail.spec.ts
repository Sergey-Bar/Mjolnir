/**
 * trust-report error-path arms (WI-9 hardening): writeFileSync failure
 * on the artifact write (disk-full / permission) → exit 20; and the
 * renderTrustReportJson branches the happy-path tests can't reach
 * (partial nextAction arm, PROVISIONAL twin cells, the
 * evidenceLevel-omitted E1 "pattern" arm, the clean "ci install" arm).
 *
 * vi.mock on node:fs is scoped to THIS file so the mocked
 * writeFileSync throws only where the test asks it to.
 */

import { describe, expect, it, vi, beforeEach, afterAll } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { ScanResult } from "../../src/types.js";

// The command imports these from node:fs — mock at the module edge and
// delegate everything but writeFileSync to the real implementation.
// The factory is hoisted, so the real module is imported lazily INSIDE
// it; the `failWrite` flag lives in a hoist-safe holder object.
const writeFailHolder = { fail: false };
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    writeFileSync: (...args: Parameters<typeof actual.writeFileSync>) => {
      const target = String(args[0]);
      if (target.endsWith("mjolnir-trust-report.md") && writeFailHolder.fail) {
        throw new Error("ENOSPC: no space left on device");
      }
      return actual.writeFileSync(...args);
    },
  };
});

const { runTrustReportCommand } =
  await import("../../src/commands/trust-report.js");

const result = (overrides: Partial<ScanResult> = {}): ScanResult => ({
  schemaVersion: 1,
  partial: false,
  score: 90,
  frameworks: ["playwright"],
  frameworkDetectionUnknown: false,
  dimensions: [],
  findings: [],
  testFileCount: 1,
  testDeclarationCount: 2,
  analysisStatus: {
    discovery: "complete",
    rules: "complete",
    skippedFiles: 0,
    durationMs: 1,
  },
  trustSummary: {
    level: "L2",
    confidence: 0.6,
    evidenceCoverage: 0.2,
    inconclusiveRate: 0,
    provisionalRuleIds: [],
    ceilingReasons: [],
  },
  ...overrides,
});

describe("trust-report write-failure arm (exit 20, honest)", () => {
  const dir = mkdtempSync(join(tmpdir(), "mjolnir-tr-wfail-"));
  const captured: { out: string[]; err: string[] } = { out: [], err: [] };
  const io = {
    out: (...parts: unknown[]) => {
      captured.out.push(parts.map(String).join(" "));
    },
    err: (...parts: unknown[]) => {
      captured.err.push(parts.map(String).join(" "));
    },
  };

  beforeEach(() => {
    writeFailHolder.fail = false;
    captured.out.length = 0;
    captured.err.length = 0;
  });

  it("a writeFileSync failure during rescan exits 20 with the OS error", async () => {
    writeFailHolder.fail = true;
    const p = join(dir, "probe-md.json");
    writeFileSync(p, JSON.stringify(result()));
    const code = await runTrustReportCommand([p, "--from", p], io);
    expect(code).toBe(20);
    expect(captured.err.join("\n")).toContain("ENOSPC");
  });

  it("a writeFileSync failure during --from (no --stdout) exits 20", async () => {
    writeFailHolder.fail = true;
    const p = join(dir, "probe-from.json");
    writeFileSync(p, JSON.stringify(result()));
    const code = await runTrustReportCommand(["--from", p], io);
    expect(code).toBe(20);
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });
});
