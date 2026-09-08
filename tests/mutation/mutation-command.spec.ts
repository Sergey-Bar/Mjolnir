/**
 * Unit tests for `runMutationCommand` (master plan P5, plan
 * 1788853205786) — the branches the e2e spec cannot reach without
 * spawning scans, and the usage-error paths the coverage gate requires:
 * missing/extra arguments, a missing --scan value, a nonexistent report,
 * and the report-only exit-0 contract exercised in-process.
 */

import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { main, runMutationCommand } from "../../src/cli.js";

const STRYKER = {
  files: {
    "src/auth.spec.ts": {
      mutants: [
        {
          id: "1",
          mutatorName: "ConditionalExpression",
          status: "Survived",
          location: {
            start: { line: 0, column: 1 },
            end: { line: 0, column: 9 },
          },
        },
      ],
    },
  },
};

let dir: string;
let origCwd: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-mutation-cmd-"));
  origCwd = process.cwd();
  process.chdir(dir);
});

afterEach(() => {
  process.chdir(origCwd);
  rmSync(dir, { recursive: true, force: true });
});

function io() {
  const out: string[] = [];
  const errs: string[] = [];
  return {
    out: (...a: unknown[]) => out.push(a.map(String).join(" ")),
    err: (...a: unknown[]) => errs.push(a.map(String).join(" ")),
    text: () => out.join("\n"),
    errors: () => errs.join("\n"),
  };
}

describe("runMutationCommand usage errors (exit 10)", () => {
  it(`no arguments → usage line`, async () => {
    const cap = io();
    expect(await runMutationCommand([], cap)).toBe(10);
    expect(cap.errors()).toContain("Usage: mjolnir mutation");
  });

  it(`--scan without a value → usage error`, async () => {
    writeFileSync(join(dir, "m.json"), JSON.stringify(STRYKER));
    const cap = io();
    expect(await runMutationCommand([join(dir, "m.json"), "--scan"], cap)).toBe(
      10,
    );
    expect(cap.errors()).toContain("--scan requires a path argument");
  });

  it(`--scan followed by another flag → usage error`, async () => {
    writeFileSync(join(dir, "m.json"), JSON.stringify(STRYKER));
    const cap = io();
    expect(
      await runMutationCommand([join(dir, "m.json"), "--scan", "--json"], cap),
    ).toBe(10);
    expect(cap.errors()).toContain("--scan requires a path argument");
  });
});

describe("runMutationCommand honest no-evidence (exit 2)", () => {
  it(`nonexistent report file → exit 2 with the path`, async () => {
    const cap = io();
    expect(await runMutationCommand([join(dir, "nope.json")], cap)).toBe(2);
    expect(cap.errors()).toContain("No such file");
  });

  it(`an unrecognized payload → exit 2, expected-formats message`, async () => {
    writeFileSync(join(dir, "m.json"), "definitely not a report");
    const cap = io();
    expect(await runMutationCommand([join(dir, "m.json")], cap)).toBe(2);
    expect(cap.errors()).toContain("No mutants recognized");
    expect(cap.errors()).toContain("Stryker");
    expect(cap.errors()).toContain("mutmut");
  });
});

describe("runMutationCommand report-only contract (exit 0)", () => {
  it(`recognized report → leaderboard rendered, exit 0, no scan`, async () => {
    writeFileSync(join(dir, "m.json"), JSON.stringify(STRYKER));
    const cap = io();
    expect(await runMutationCommand([join(dir, "m.json")], cap)).toBe(0);
    expect(cap.text()).toContain("MUTATION EVIDENCE — stryker");
    expect(cap.text()).toContain("1 survived");
  });

  it(`mutmut xml is sniffed from content (no extension dependence)`, async () => {
    writeFileSync(
      join(dir, "report.txt"),
      '<?xml version="1.0"?><testsuite><testcase classname="t.py-mutmut1" name="m"/></testsuite>',
    );
    const cap = io();
    expect(await runMutationCommand([join(dir, "report.txt")], cap)).toBe(0);
    expect(cap.text()).toContain("MUTATION EVIDENCE — mutmut");
  });

  it(`--scan on an invalid target → validateScanTarget's usage error (exit 10)`, async () => {
    writeFileSync(join(dir, "m.json"), JSON.stringify(STRYKER));
    const cap = io();
    expect(
      await runMutationCommand(
        [join(dir, "m.json"), "--scan", join(dir, "missing-dir")],
        cap,
      ),
    ).toBe(10);
  });
});

describe("main() dispatches mutation", () => {
  it("routes mjolnir mutation <report> through the same handler", async () => {
    writeFileSync(join(dir, "m.json"), JSON.stringify(STRYKER));
    const out: string[] = [];
    const code = await main(["mutation", join(dir, "m.json")], {
      out: (...a: unknown[]) => out.push(a.map(String).join(" ")),
      err: () => {},
    });
    expect(code).toBe(0);
    expect(out.join("\n")).toContain("MUTATION EVIDENCE — stryker");
  });
});

describe("runMutationCommand --scan in-process (coverage of the stamp path)", () => {
  it("stamps a matching finding and renders the derivation line", async () => {
    writeFileSync(join(dir, "m.json"), JSON.stringify(STRYKER));
    mkdirSync(join(dir, "src"), { recursive: true });
    // QA-PW-101 fires on waitForTimeout inside a spec the discovery
    // recognizes; the mutant span covers that line.
    writeFileSync(
      join(dir, "src", "auth.spec.ts"),
      "test('x', () => { page.waitForTimeout(500); });\n",
    );
    const cap = io();
    const code = await runMutationCommand(
      [join(dir, "m.json"), "--scan", "."],
      cap,
    );
    expect(code).toBe(0);
    expect(cap.text()).toContain("carry mutationEvidence");
  });

  it("a scan with no intersecting findings says so honestly (exit 0)", async () => {
    writeFileSync(join(dir, "m.json"), JSON.stringify(STRYKER));
    writeFileSync(join(dir, "unrelated.txt"), "hello\n");
    const cap = io();
    const code = await runMutationCommand(
      [join(dir, "m.json"), "--scan", "."],
      cap,
    );
    expect(code).toBe(0);
    expect(cap.text()).toContain("nothing to derive");
  });

  it("a DIRECTORY passed as the report → internal-error path (exit 20)", async () => {
    const cap = io();
    const code = await runMutationCommand([dir], cap);
    expect(code).toBe(20);
  });
});
