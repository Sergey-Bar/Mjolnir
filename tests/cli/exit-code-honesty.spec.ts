/**
 * The exit-code contract on the verbs that bypassed it (review #732, P1 3–8).
 *
 * `scan` routes every exit through `scanExitCode`, and `docs/VERSIONING.md`
 * makes the codes a frozen contract: 0 clean, 1 findings at the gate,
 * 2 inconclusive (a CI step fails on it), 10 usage, 20 internal. The verbs
 * below each computed their own code and each got one case wrong:
 *
 *   - `--save-baseline` printed a text block on stdout before `--json`, so the
 *     machine output did not parse; a failed save exited 1 ("findings") and
 *     never printed the report; a PARTIAL scan became the baseline.
 *   - `fix` and `explain --plan` exited 0 on a partial scan.
 *   - An invalid config exited 20 ("a bug in Mjölnir") from `fix`,
 *     `ci verify` and `explain --plan`, but 10 from `scan`.
 *   - `ci verify` ignored `--blocking`, so `--blocking none` still failed.
 *   - `explain --evidence` exited 1 on an incomplete run report.
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  runEvidenceArm,
  runFixCommand,
  runHandoverCommand,
  runScanCommand,
  runVerifyCommand,
} from "../../src/cli.js";

let dir: string;

function capture(): {
  io: { out: (s: string) => void; err: (s: string) => void };
  out: string[];
  err: string[];
} {
  const out: string[] = [];
  const err: string[] = [];
  return {
    io: { out: (s) => out.push(s), err: (s) => err.push(s) },
    out,
    err,
  };
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-exit-honesty-"));
  mkdirSync(join(dir, "e2e"), { recursive: true });
  writeFileSync(
    join(dir, "e2e", "a.spec.ts"),
    "it('x', () => { expect(1).toBe(1); });\n",
  );
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** A workflow carrying a default-tier error finding (QA-CI-002). */
function addGateFinding(): void {
  mkdirSync(join(dir, ".github", "workflows"), { recursive: true });
  writeFileSync(
    join(dir, ".github", "workflows", "ci.yml"),
    "name: ci\non: [push]\njobs:\n  t:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm test || true\n",
  );
}

describe("--save-baseline", () => {
  it("keeps --json stdout valid JSON (the confirmation goes to stderr)", async () => {
    const cap = capture();
    await runScanCommand([dir, "--json", "--save-baseline"], cap.io);
    expect(() => JSON.parse(cap.out.join("\n")) as unknown).not.toThrow();
    expect(existsSync(join(dir, ".mjolnir", "baseline.json"))).toBe(true);
  });

  it("a failed save exits 2, not 1, and the report is still printed", async () => {
    // A directory where the file should be: the write fails.
    mkdirSync(join(dir, ".mjolnir", "baseline.json"), { recursive: true });
    const cap = capture();
    const code = await runScanCommand(
      [dir, "--json", "--save-baseline"],
      cap.io,
    );
    expect(code).toBe(2);
    expect(() => JSON.parse(cap.out.join("\n")) as unknown).not.toThrow();
    expect(cap.err.join("\n")).toContain("baseline save FAILED");
  });

  it("a partial scan is not saved as the before-state", async () => {
    const cap = capture();
    const code = await runScanCommand(
      [dir, "--save-baseline", "--max-duration", "0.001"],
      cap.io,
    );
    expect(code).toBe(2);
    expect(existsSync(join(dir, ".mjolnir", "baseline.json"))).toBe(false);
    expect(cap.err.join("\n")).toMatch(/partial/i);
  });
});

describe("partial scans are inconclusive on every verb", () => {
  it("fix exits 2 on a partial scan", async () => {
    const code = await runFixCommand(
      [dir, "--dry-run", "--max-duration", "0.001"],
      capture().io,
    );
    expect(code).toBe(2);
  });

  it("explain --plan exits 2 on a partial scan", async () => {
    const code = await runHandoverCommand(
      [dir, "--max-duration", "0.001"],
      capture().io,
    );
    expect(code).toBe(2);
  });
});

describe("an invalid config is a usage error on every verb", () => {
  beforeEach(() => {
    writeFileSync(join(dir, "mjolnir.config.json"), '{ "gate": 5 }\n');
  });

  it.each([
    ["scan", runScanCommand],
    ["fix", runFixCommand],
    ["ci verify", runVerifyCommand],
    ["explain --plan", runHandoverCommand],
  ] as const)("%s exits 10", async (_name, run) => {
    const cap = capture();
    expect(await run([dir], cap.io)).toBe(10);
    expect(cap.err.join("\n")).not.toContain("this is a bug in");
  });
});

describe("ci verify uses the same gate as scan", () => {
  it("--blocking none does not fail on a new error finding", async () => {
    await runScanCommand([dir, "--save-baseline"], capture().io);
    addGateFinding();
    expect(await runVerifyCommand([dir], capture().io)).toBe(1);
    expect(
      await runVerifyCommand([dir, "--blocking", "none"], capture().io),
    ).toBe(0);
  });
});

describe("explain --evidence", () => {
  it("an incomplete run report is inconclusive (2), not findings (1)", () => {
    mkdirSync(join(dir, "results"));
    writeFileSync(
      join(dir, "results", "huge.json"),
      "x".repeat(1024 * 1024 + 1),
    );
    expect(
      runEvidenceArm([join(dir, "results"), "--no-flaky-md"], capture().io),
    ).toBe(2);
  });
});
