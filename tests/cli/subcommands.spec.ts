/**
 * CLI handler coverage for post-0.2 subcommands: fix, create-rule,
 * handover, init, pw-report — plus main() dispatch of each.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { main, runFixCommand, runHandoverCommand } from "../../src/cli.js";
let dir: string;
let origCwd: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-cli2-"));
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

describe("runFixCommand", () => {
  it("returns usage error on bad args", async () => {
    const cap = capture();
    expect(await runFixCommand(["--nope"], cap.io)).toBe(10);
  });

  it("applies a safe fix and exits 0", async () => {
    writeFileSync(
      join(dir, "focused.test.ts"),
      "it.only('x', () => { expect(1).toBe(1); });\n",
    );
    const cap = capture();
    const code = await runFixCommand([dir], cap.io);
    expect(code).toBe(0);
    expect(cap.text()).toContain("Remove `.only`");
    expect(readFileSync(join(dir, "focused.test.ts"), "utf8")).not.toContain(
      ".only",
    );
  });

  it("dry-run reports without writing", async () => {
    writeFileSync(join(dir, "f.test.ts"), "it.only('x', () => {});\n");
    const cap = capture();
    const code = await runFixCommand([dir, "--dry-run"], cap.io);
    // Audit R-6: a successful dry run is a plan, not a failure — exit 0.
    expect(code).toBe(0);
    expect(cap.text()).toContain("planned");
    expect(readFileSync(join(dir, "f.test.ts"), "utf8")).toContain(".only");
  });
});

describe("runHandoverCommand", () => {
  it("returns usage error on bad args", async () => {
    const cap = capture();
    expect(await runHandoverCommand(["--bogus"], cap.io)).toBe(10);
  });

  it("renders the handover map", async () => {
    writeFileSync(
      join(dir, "a.test.ts"),
      "it('x', () => { expect(1).toBe(1); });\n",
    );
    const cap = capture();
    expect(await runHandoverCommand([dir], cap.io)).toBe(0);
    expect(cap.text()).toContain("WELCOME TO THE TEST SUITE");
  });
});

describe("main dispatch of the folded commands", () => {
  it("routes fix, and a retired verb is a usage error rather than a fallback", async () => {
    process.chdir(dir);
    expect(await main(["fix", "--nope"])).toBe(10);
    // The verbs these arms replaced are gone, so typing one is a usage error
    // rather than a silent scan of the current directory. That is the whole
    // point of a REPLACE: one name per command, and a retired name says so
    // rather than doing something plausible and different.
    for (const retired of [
      ["create-rule"],
      ["handover"],
      ["init"],
      ["pw-report"],
      ["rules"],
      ["why"],
      ["triage"],
      ["verify"],
    ]) {
      expect(
        await main(retired),
        `${retired.join(" ")} should be a usage error`,
      ).toBe(10);
    }
    // And the arms that replaced them are still routed.
    expect(await main(["explain", "--plan", "--bogus"])).toBe(10);
    expect(await main(["explain", "--playwright"])).toBe(10);
  });
});
