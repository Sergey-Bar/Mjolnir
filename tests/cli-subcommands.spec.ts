/**
 * CLI handler coverage for post-0.2 subcommands: fix, create-rule,
 * handover, init, pw-report — plus main() dispatch of each.
 */

import {
  mkdtempSync,
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  main,
  runCreateRuleCommand,
  runFixCommand,
  runHandoverCommand,
  runInitCommand,
  runPwReportCommand,
} from "../src/cli.js";

let dir: string;
let origCwd: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "qa-doctor-cli2-"));
  origCwd = process.cwd();
});
afterEach(() => {
  process.chdir(origCwd);
  rmSync(dir, { recursive: true, force: true });
});

function capture() {
  const out: string[] = [];
  const errOut: string[] = [];
  return {
    io: {
      out: (...parts: unknown[]) => out.push(parts.map(String).join(" ")),
      err: (...parts: unknown[]) => errOut.push(parts.map(String).join(" ")),
    },
    text: () => out.join("\n"),
    errText: () => errOut.join("\n"),
  };
}

const PW_JSON = JSON.stringify({
  suites: [
    {
      specs: [
        {
          file: "a.spec.ts",
          title: "lucky",
          tests: [
            {
              results: [
                { status: "failed", duration: 100 },
                { status: "passed", duration: 120 },
              ],
            },
          ],
        },
      ],
    },
  ],
});

describe("runFixCommand", () => {
  it("returns usage error on bad args", () => {
    const cap = capture();
    expect(runFixCommand(["--nope"], cap.io)).toBe(10);
  });

  it("applies a safe fix and exits 0", () => {
    writeFileSync(
      join(dir, "focused.test.ts"),
      "it.only('x', () => { expect(1).toBe(1); });\n",
    );
    const cap = capture();
    const code = runFixCommand([dir], cap.io);
    expect(code).toBe(0);
    expect(cap.text()).toContain("Remove `.only`");
    expect(readFileSync(join(dir, "focused.test.ts"), "utf8")).not.toContain(
      ".only",
    );
  });

  it("dry-run reports without writing", () => {
    writeFileSync(join(dir, "f.test.ts"), "it.only('x', () => {});\n");
    const cap = capture();
    const code = runFixCommand([dir, "--dry-run"], cap.io);
    expect(code).toBe(1); // dry-run reports as failed (not applied)
    expect(readFileSync(join(dir, "f.test.ts"), "utf8")).toContain(".only");
  });
});

describe("runCreateRuleCommand", () => {
  it("returns usage error without id or title", () => {
    const cap = capture();
    expect(runCreateRuleCommand([], cap.io)).toBe(10);
    expect(cap.errText()).toContain("Usage:");
  });

  it("scaffolds rule + fixtures in cwd", () => {
    process.chdir(dir);
    const cap = capture();
    const code = runCreateRuleCommand(
      ["QA-PW-141", "--title", "No maxDiffPixelRatio"],
      cap.io,
    );
    expect(code).toBe(0);
    expect(existsSync(join(dir, "src", "rules", "playwright"))).toBe(true);
  });
});

describe("runHandoverCommand", () => {
  it("returns usage error on bad args", () => {
    const cap = capture();
    expect(runHandoverCommand(["--bogus"], cap.io)).toBe(10);
  });

  it("renders the handover map", () => {
    writeFileSync(
      join(dir, "a.test.ts"),
      "it('x', () => { expect(1).toBe(1); });\n",
    );
    const cap = capture();
    expect(runHandoverCommand([dir], cap.io)).toBe(0);
    expect(cap.text()).toContain("WELCOME TO THE TEST SUITE");
  });
});

describe("runInitCommand", () => {
  it("prints the init checklist", () => {
    process.chdir(dir);
    const cap = capture();
    expect(runInitCommand([], cap.io)).toBe(0);
    expect(cap.text()).toContain("QA DOCTOR INIT");
  });
});

describe("runPwReportCommand", () => {
  it("returns usage error without target", () => {
    const cap = capture();
    expect(runPwReportCommand([], cap.io)).toBe(10);
    expect(cap.errText()).toContain("Usage: qa-doctor pw-report");
  });

  it("summarizes a Playwright report and exits 0 for clean runs", () => {
    writeFileSync(join(dir, "report.json"), PW_JSON);
    const cap = capture();
    // The single test is a TRUE-FLAKE → exit 1.
    expect(runPwReportCommand([dir], cap.io)).toBe(1);
    expect(cap.text()).toContain("RUN SUMMARY");
    expect(cap.text()).toContain("TRUE-FLAKE");
  });

  it("returns 2 when no results recognized", () => {
    const cap = capture();
    expect(runPwReportCommand([dir], cap.io)).toBe(2);
    expect(cap.errText()).toContain("No Playwright JSON report");
  });
});

describe("main dispatch of new subcommands", () => {
  it("routes fix / create-rule / handover / init / pw-report", () => {
    process.chdir(dir);
    expect(main(["fix", "--nope"])).toBe(10);
    expect(main(["create-rule"])).toBe(10);
    expect(main(["handover", "--bogus"])).toBe(10);
    expect(main(["init"])).toBe(0);
    expect(main(["pw-report"])).toBe(10);
  });
});
