/**
 * trust-report hostile-error arms (WI-9 hardening): the defensive
 * `String(err)` arms of the four catch blocks, plus the no-positional
 * `?? "."` default-target arm. The node:fs and scan-pipeline mocks are
 * scoped to THIS file and toggle via holder objects so every other
 * spec runs against the real implementations.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Hoist-safe holders (vi.mock factories are hoisted above all imports).
const mockState = vi.hoisted(() => ({
  readThrowKind: "none",
  scanThrowKind: "none",
}));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    readFileSync: (
      p: Parameters<typeof actual.readFileSync>[0],
      ...rest: unknown[]
    ) => {
      if (
        typeof p === "string" &&
        p.includes("read-nonerror.json") &&
        mockState.readThrowKind === "nonerror"
      ) {
        throw "a hostile non-Error string"; // eslint-disable-line @typescript-eslint/only-throw-error
      }
      if (
        typeof p === "string" &&
        p.includes("read-nonerror.json") &&
        mockState.readThrowKind === "error"
      ) {
        throw new Error("a plain Error");
      }
      return actual.readFileSync(p, ...(rest as []));
    },
  };
});

vi.mock("../../src/engine/scan-pipeline.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/engine/scan-pipeline.js")>();
  return {
    ...actual,
    runScan: async (...args: Parameters<typeof actual.runScan>) => {
      if (mockState.scanThrowKind === "nonerror") {
        throw "a hostile non-Error string"; // eslint-disable-line @typescript-eslint/only-throw-error
      }
      if (mockState.scanThrowKind === "error") {
        throw new Error("a plain Error");
      }
      return actual.runScan(...args);
    },
  };
});

const { runTrustReportCommand } =
  await import("../../src/commands/trust-report.js");
const { errorMessage } = await import("../../src/cli-io.js");

describe('trust-report hostile-error arms (String(err) + ?? ".")', () => {
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
    mockState.readThrowKind = "none";
    mockState.scanThrowKind = "none";
    captured.out.length = 0;
    captured.err.length = 0;
  });

  it("readFileSync throwing a non-Error → String(err) arm renders the raw value", async () => {
    mockState.readThrowKind = "nonerror";
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-tr-arms-"));
    const p = join(dir, "read-nonerror.json");
    // The mocked readFileSync throws before any content is read.
    const code = await runTrustReportCommand(["--from", p], io);
    expect(code).toBe(10);
    expect(captured.err.join("\n")).toContain("a hostile non-Error string");
    rmSync(dir, { recursive: true, force: true });
  });

  it("JSON.parse catch: a plain Error still renders err.message", async () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-tr-arms-"));
    writeFileSync(join(dir, "read-nonerror.json"), "{not json");
    mockState.readThrowKind = "none";
    const code = await runTrustReportCommand(
      ["--from", join(dir, "read-nonerror.json")],
      io,
    );
    expect(code).toBe(10);
    expect(captured.err.join("\n")).toContain("cannot read");
    rmSync(dir, { recursive: true, force: true });
  });

  it("runScan throwing a non-Error → rescan catch String(err) arm (exit 20)", async () => {
    mockState.scanThrowKind = "nonerror";
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-tr-arms-"));
    const code = await runTrustReportCommand([dir], io);
    expect(code).toBe(20);
    expect(captured.err.join("\n")).toContain("a hostile non-Error string");
    rmSync(dir, { recursive: true, force: true });
  });

  it("runScan throwing a plain Error → rescan catch err.message arm (exit 20)", async () => {
    mockState.scanThrowKind = "error";
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-tr-arms-"));
    const code = await runTrustReportCommand([dir], io);
    expect(code).toBe(20);
    expect(captured.err.join("\n")).toContain("a plain Error");
    rmSync(dir, { recursive: true, force: true });
  });

  it("no positional argument → the ?? '.' default-target arm (scans cwd)", async () => {
    const orig = process.cwd();
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-tr-arms-cwd-"));
    try {
      process.chdir(dir);
      const code = await runTrustReportCommand([], io);
      expect(code).toBe(0);
      // The artifact lands in the target (cwd) — the default arm.
      expect(captured.out.join("\n")).toContain("trust report written");
    } finally {
      process.chdir(orig);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("errorMessage: Error instances render message; non-Errors stringify", () => {
    expect(errorMessage(new Error("plain"))).toBe("plain");
    expect(errorMessage("raw string")).toBe("raw string");
    expect(errorMessage(42)).toBe("42");
  });
});

// Local re-exports used above (writeFileSync is the real one here).
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
