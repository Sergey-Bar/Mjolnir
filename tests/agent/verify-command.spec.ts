/**
 * `runVerifyCommand` in-process unit coverage (master plan P7): the
 * dispatch path (main → verify), the usage-error arm, the
 * validateScanTarget arms, and the digest render through the handler —
 * the e2e spec covers the exit contract through the spawned binary; this
 * spec covers the handler's own branches at 100%.
 */

import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { main, runVerifyCommand } from "../../src/cli.js";
import type { Output } from "../../src/cli.js";

let dir: string;
let origCwd: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-verify-cmd-"));
  origCwd = process.cwd();
  process.chdir(dir);
});

afterEach(() => {
  process.chdir(origCwd);
  rmSync(dir, { recursive: true, force: true });
});

function capture() {
  let out = "";
  let err = "";
  return {
    io: {
      out: ((s: string) => (out += `${s}\n`)) as Output,
      err: ((s: string) => (err += `${s}\n`)) as Output,
    },
    text: () => out,
    errText: () => err,
  };
}

describe("runVerifyCommand in-process (P7)", () => {
  it("usage error on unknown flags (exit 10)", async () => {
    const cap = capture();
    expect(await runVerifyCommand(["--no-such-flag"], cap.io)).toBe(10);
    expect(cap.errText()).toContain("unknown flag");
  });

  it("nonexistent target → validateScanTarget's exit 10", async () => {
    const cap = capture();
    expect(await runVerifyCommand([join(dir, "missing")], cap.io)).toBe(10);
    expect(cap.errText()).toContain("does not exist");
  });

  it("a FILE target → validateScanTarget's not-a-directory exit 10", async () => {
    writeFileSync(join(dir, "afile"), "x");
    const cap = capture();
    expect(await runVerifyCommand([join(dir, "afile")], cap.io)).toBe(10);
    expect(cap.errText()).toContain("not a directory");
  });

  it("dispatch through main() renders the digest (io passthrough)", async () => {
    writeFileSync(
      join(dir, "ok.spec.ts"),
      "test('y', () => { expect(1).toBe(1); });\n",
    );
    const cap = capture();
    const code = await main(["verify", "."], cap.io);
    expect(code).toBe(2); // no baseline
    expect(cap.text()).toContain("No committed baseline");
  });

  it("with a baseline: clean → exit 0, digest via the handler", async () => {
    writeFileSync(
      join(dir, "ok.spec.ts"),
      "test('y', () => { expect(1).toBe(1); });\n",
    );
    mkdirSync(join(dir, ".mjolnir"), { recursive: true });
    writeFileSync(
      join(dir, ".mjolnir", "baseline.json"),
      JSON.stringify({
        schemaVersion: 1,
        capturedAt: "2026-09-09T00:00:00.000Z",
        commit: "abc1234",
        score: 100,
        findings: [],
      }),
    );
    const cap = capture();
    expect(await runVerifyCommand(["."], cap.io)).toBe(0);
    expect(cap.text()).toContain("VERIFY — before/after digest");
  });
});

describe("runVerifyCommand — partial scan, warning callback, gate arms", () => {
  it("a partial scan → exit 2 with the digest rendered (never a fake clean)", async () => {
    // --max-duration 0 forces the budget to exhaust immediately →
    // analysisStatus.partial = true, score null. The handler must render
    // the digest and return 2 BEFORE the hasBaseline gate.
    writeFileSync(
      join(dir, "x.spec.ts"),
      "test('y', () => { expect(1).toBe(1); });\n",
    );
    mkdirSync(join(dir, ".mjolnir"), { recursive: true });
    writeFileSync(
      join(dir, ".mjolnir", "baseline.json"),
      JSON.stringify({
        schemaVersion: 1,
        capturedAt: "2026-09-09T00:00:00.000Z",
        commit: "abc1234",
        score: 100,
        findings: [],
      }),
    );
    const cap = capture();
    const code = await runVerifyCommand(
      [".", "--max-duration", "0.001"],
      cap.io,
    );
    expect(code).toBe(2);
    expect(cap.text()).toContain("VERIFY — before/after digest");
  });

  it("a legacy baseline (no schemaVersion) → warning callback fires; exit follows the digest", async () => {
    writeFileSync(
      join(dir, "x.spec.ts"),
      "test('y', () => { expect(1).toBe(1); });\n",
    );
    mkdirSync(join(dir, ".mjolnir"), { recursive: true });
    // No schemaVersion → loadBaseline warns through the callback (line
    // 1234's arrow function) and treats it as v1.
    writeFileSync(
      join(dir, ".mjolnir", "baseline.json"),
      JSON.stringify({
        capturedAt: "2026-09-09T00:00:00.000Z",
        commit: "abc1234",
        score: 100,
        findings: [],
      }),
    );
    const cap = capture();
    const code = await runVerifyCommand(["."], cap.io);
    expect(code).toBe(0);
    expect(cap.errText()).toContain("no schemaVersion");
    expect(cap.text()).toContain("VERIFY — before/after digest");
  });

  it("new error findings at the gate → exit 1; clean digest → exit 0", async () => {
    mkdirSync(join(dir, ".mjolnir"), { recursive: true });
    writeFileSync(
      join(dir, "bad.spec.ts"),
      "test('z', () => { page.waitForTimeout(500); });\n",
    );
    writeFileSync(
      join(dir, ".mjolnir", "baseline.json"),
      JSON.stringify({
        schemaVersion: 1,
        capturedAt: "2026-09-09T00:00:00.000Z",
        commit: "abc1234",
        score: 100,
        findings: [],
      }),
    );
    const cap = capture();
    expect(await runVerifyCommand(["."], cap.io)).toBe(1);
  });
});

describe("the handler catch (exit 20) — audit-red's probe pattern", () => {
  it("an io throw inside the try block is contained: exit 20, not a crash", async () => {
    // The render (io.out) sits inside the try — a throwing out surfaces
    // the same containment contract every Mjölnir handler carries.
    writeFileSync(
      join(dir, "x.spec.ts"),
      "test('y', () => { expect(1).toBe(1); });\n",
    );
    const code = await runVerifyCommand(["."], {
      out: () => {
        throw new Error("probe-crash");
      },
      err: () => {},
    });
    expect(code).toBe(20);
  });
});

describe("the default-io arm (line 1222) — default parameter coverage", () => {
  it("omitting io falls back to the process streams and completes", async () => {
    // The default parameter `{ out, err }` is real code: the arm runs
    // only when a caller omits io. Output goes to the real stdout —
    // harmless in CI logs; the contract under test is completion.
    writeFileSync(
      join(dir, "x.spec.ts"),
      "test('y', () => { expect(1).toBe(1); });\n",
    );
    const code = await runVerifyCommand(["."]);
    expect(code).toBe(2); // no baseline → 2
  });
});
