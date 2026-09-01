/**
 * cli.ts remaining branch coverage (Test Hardening Plan — final sweep).
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runScanCommand } from "../src/cli.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-cli-final-"));
  mkdirSync(join(dir, "e2e"), { recursive: true });
  writeFileSync(
    join(dir, "e2e", "checkout.spec.ts"),
    "it('x', () => { expect(1).toBe(1); });\n",
  );
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("runScanCommand: partial-scan exit code (2)", () => {
  it("an already-expired --max-duration reports the scan as partial", async () => {
    const code = await runScanCommand([dir, "--max-duration", "0.001"], {
      out: () => {},
      err: () => {},
    });
    expect(code).toBe(2);
  });
});

describe("runScanCommand: catch block around SARIF rendering", () => {
  it("a SARIF renderer failure surfaces as exit 20, not an uncaught throw", async () => {
    vi.resetModules();
    vi.doMock("../src/reporter/sarif.js", () => ({
      renderSarif: () => {
        throw new Error("boom");
      },
    }));
    const { runScanCommand: mockedRunScanCommand } =
      await import("../src/cli.js");
    const errs: string[] = [];
    await expect(
      mockedRunScanCommand([dir, "--format", "sarif"], {
        out: () => {},
        err: (...a) => errs.push(a.map(String).join(" ")),
      }),
    ).resolves.toBe(20);
    expect(errs.join(" ")).toMatch(/internal error/i);
    vi.doUnmock("../src/reporter/sarif.js");
    vi.resetModules();
  });
});
