/**
 * CLI contract exhaustiveness (Test Hardening Plan, P1).
 *
 * Existing CLI tests cover happy paths and a handful of usage errors.
 * What's missing is the thing CI pipelines actually script against: a
 * documented flag/subcommand producing exactly the documented exit code
 * (§ "Exit codes: 0 clean · 1 errors found · 2 partial · 10 usage ·
 * 20 crash" in printUsage), and the stdout/stderr split holding —
 * findings and normal output on stdout, errors on stderr, never mixed,
 * because scripts pipe one and not the other.
 *
 * Runs through the real `main()` dispatcher (not individual handlers
 * directly) so this exercises the actual routing a user's argv goes
 * through, with console.log/console.error captured in-process.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { main } from "../../src/cli.js";

const DOCUMENTED_EXIT_CODES = [0, 1, 2, 10, 20];

let dir: string;
let logSpy: string[];
let errSpy: string[];
let restoreConsole: () => void;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-flag-matrix-"));
  mkdirSync(join(dir, "e2e"), { recursive: true });
  writeFileSync(
    join(dir, "e2e", "checkout.spec.ts"),
    `import { test, expect } from '@playwright/test';\n` +
      `test.only('checkout', async ({ page }) => {\n` +
      `  await page.waitForTimeout(3000);\n` +
      `  expect(true).toBe(true);\n` +
      `});\n`,
  );

  logSpy = [];
  errSpy = [];
  const origLog = console.log;
  const origErr = console.error;
  console.log = (...a: unknown[]) => logSpy.push(a.map(String).join(" "));
  console.error = (...a: unknown[]) => errSpy.push(a.map(String).join(" "));
  restoreConsole = () => {
    console.log = origLog;
    console.error = origErr;
  };
});

afterEach(() => {
  restoreConsole();
  rmSync(dir, { recursive: true, force: true });
});

async function run(
  argv: string[],
): Promise<{ code: number; stdout: string; stderr: string }> {
  const code = await main(argv);
  return { code, stdout: logSpy.join("\n"), stderr: errSpy.join("\n") };
}

describe("base scan command — documented flag matrix", () => {
  const cases: Array<{
    name: string;
    argv: (d: string) => string[];
    expectExit: number[];
  }> = [
    {
      name: "default scan (findings present)",
      argv: (d) => [d],
      expectExit: [1],
    },
    { name: "--json", argv: (d) => [d, "--json"], expectExit: [1] },
    {
      name: "--format json",
      argv: (d) => [d, "--format", "json"],
      expectExit: [1],
    },
    {
      name: "--format sarif",
      argv: (d) => [d, "--format", "sarif"],
      expectExit: [1],
    },
    { name: "--verbose", argv: (d) => [d, "--verbose"], expectExit: [1] },
    {
      name: "--scope changed (no git repo — degrades, never usage error)",
      argv: (d) => [d, "--scope", "changed"],
      expectExit: [0, 1, 2],
    },
    {
      name: "--max-duration 5",
      argv: (d) => [d, "--max-duration", "5"],
      expectExit: [1],
    },
    // Frozen usage contract (v0.5.3): bare -h/--help print usage and
    // exit 10; `<verb> --help` routes to the verb page with exit 0.
    { name: "-h", argv: () => ["-h"], expectExit: [10] },
    { name: "--help", argv: () => ["--help"], expectExit: [10] },
    // --version answers a question, so it succeeds (0) rather than
    // falling through to the scan parser's usage error like --help does.
    { name: "--version", argv: () => ["--version"], expectExit: [0] },
    { name: "-v", argv: () => ["-v"], expectExit: [0] },
    { name: "unknown flag", argv: () => ["--nope"], expectExit: [10] },
    {
      name: "--scope with invalid mode",
      argv: (d) => [d, "--scope", "bogus"],
      expectExit: [10],
    },
    {
      name: "--max-duration with non-numeric value",
      argv: (d) => [d, "--max-duration", "notanumber"],
      expectExit: [10],
    },
    {
      name: "--format with invalid value",
      argv: (d) => [d, "--format", "xml"],
      expectExit: [10],
    },
  ];

  for (const c of cases) {
    it(`${c.name} → exit ${c.expectExit.join("|")}`, async () => {
      const { code, stdout, stderr } = await run(c.argv(dir));
      expect(
        DOCUMENTED_EXIT_CODES,
        `exit code ${code} is not one of the documented codes`,
      ).toContain(code);
      expect(c.expectExit, `unexpected exit code ${code}`).toContain(code);

      if (c.expectExit.includes(10)) {
        // Usage errors: help/usage text is output, and by convention
        // here it goes to stdout (printUsage receives io.out) — the
        // real contract this test pins is that it is NEVER silent.
        expect(stdout.length + stderr.length).toBeGreaterThan(0);
      }
    });
  }

  it("findings never appear on stderr, only stdout", async () => {
    const { stdout, stderr } = await run([dir, "--json"]);
    expect(stdout).toContain("findings");
    expect(stderr).toBe("");
  });

  it("a usage error never writes findings-shaped JSON to stdout", async () => {
    const { stdout } = await run(["--nope"]);
    expect(() => {
      JSON.parse(stdout);
    }).toThrow();
  });
});

describe("subcommands — return a documented exit code without crashing unexpectedly", () => {
  const subcommands: Array<{ name: string; argv: (d: string) => string[] }> = [
    { name: "suppressions", argv: () => ["suppressions"] },
    { name: "badge", argv: (d) => ["badge", d] },
    { name: "debt", argv: (d) => ["debt", d] },
    { name: "fix --dry-run", argv: (d) => ["fix", d, "--dry-run"] },
    { name: "handover", argv: (d) => ["handover", d] },
    { name: "forensics (no report present)", argv: (d) => ["forensics", d] },
    { name: "triage (no report present)", argv: (d) => ["triage", d] },
    { name: "pw-report (no report present)", argv: (d) => ["pw-report", d] },
    { name: "doctor:playwright", argv: (d) => ["doctor:playwright", d] },
  ];

  for (const c of subcommands) {
    it(`${c.name} → documented exit code, no throw`, async () => {
      // main() dispatches to async handlers since the Phase 0.5 parse
      // stage; a crash now surfaces as a rejected promise, which the
      // await propagates — "no throw" means this resolves.
      const code = await main(c.argv(dir));
      expect(
        DOCUMENTED_EXIT_CODES,
        `"${c.name}" returned undocumented exit code ${code}`,
      ).toContain(code);
    });
  }
});
