/**
 * Config-file feature audit (Test Hardening Plan — digs on top of the
 * suppressions-enforcement finding: `src/config/config.ts` defines
 * `loadConfig`, `applySeverityOverrides`, and validation for `gate` and
 * `ignore`, with a whole doc-comment about "Zero-config preserved... only
 * severity, scope, and gating" — but `src/cli.ts` never imports
 * `config.ts` at all. Every feature that module implements is dead code
 * from the scan's point of view, not just suppressions.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runScan, runScanCommand, parseArgs } from "../../src/cli.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-config-audit-"));
  mkdirSync(join(dir, "e2e"), { recursive: true });
  writeFileSync(
    join(dir, "e2e", "checkout.spec.ts"),
    "it.only('checkout', () => { expect(true).toBe(true); });\n",
  );
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function scan() {
  return runScan({
    target: dir,
    json: true,
    verbose: true,
    maxDurationMs: 10_000,
    scopeChanged: false,
    format: "json",
    strict: true,
  });
}

describe("mjolnir.config.json `severityOverrides` (documented in config.ts)", () => {
  it("downgrading QA-TEST-001 to info in config has no effect on scan output", async () => {
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ severityOverrides: { "QA-TEST-001": "info" } }),
    );
    const result = await scan();
    const finding = result.findings.find((f) => f.ruleId === "QA-TEST-001");
    expect(
      finding?.severity,
      "config.ts's applySeverityOverrides is never called from the scan " +
        "path — severityOverrides in mjolnir.config.json is silently " +
        "ignored, same root cause as the `ignore` (suppressions) gap.",
    ).toBe("info");
  });
});

describe("mjolnir.config.json `gate` (documented in config.ts)", () => {
  it("a malformed gate value fails fast with a clear config error", async () => {
    // Now that the scan path actually reads the config, an invalid value
    // surfaces loudly instead of being silently ignored — a typo'd gate
    // level must never quietly change gating behavior.
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ gate: "not-a-real-gate-level" }),
    );
    // An async scan rejects on a fatal config error; that rejection IS
    // the throw the contract pins.
    await expect(scan()).rejects.toThrow(
      /gate must be advisory\|error\|warning/,
    );
  });
});

describe("mjolnir.config.json `ignore` missing required `reason`", () => {
  it("an ignore entry without a reason fails fast with a clear config error", async () => {
    // §27 requires every suppression to carry a reason; now that the
    // scan path validates the config, the requirement is actually
    // enforced instead of silently skipped.
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ ignore: [{ ruleId: "QA-TEST-001" }] }),
    );
    // An async scan rejects on a fatal config error; that rejection IS
    // the throw the contract pins.
    await expect(scan()).rejects.toThrow(/requires a "reason"/);
  });
});

describe("the empty-state message suggests only real invocations (H-5)", () => {
  it("the empty-state hint references no flag that parseArgs rejects", () => {
    // Regression guard for the audit finding: terminal.ts used to tell
    // users to run `mjolnir --tests-dir <path>`, a flag parseArgs never
    // recognized — following the tool's own suggestion produced exit 10.
    // The hint is now `mjolnir <path-to-your-tests>`; the phantom flag
    // must stay rejected so the docs-consistency net catches any
    // re-appearance of an invented suggestion.
    expect(parseArgs(["--tests-dir", "somewhere"])).toBeNull();
  });

  it("running a scan on a nonexistent path exits 10 naming the path (H-4)", async () => {
    const missing = join(dir, "does-not-exist");
    let errText = "";
    const code = await runScanCommand([missing], {
      out: () => {},
      err: (...parts) => (errText += parts.join(" ")),
    });
    expect(code).toBe(10);
    expect(errText).toContain(missing);
  });

  it("running a scan on a file (not a directory) exits 10 (H-4)", async () => {
    const file = join(dir, "plain.txt");
    writeFileSync(file, "not a test\n");
    let errText = "";
    const code = await runScanCommand([file], {
      out: () => {},
      err: (...parts) => (errText += parts.join(" ")),
    });
    expect(code).toBe(10);
    expect(errText).toContain("not a directory");
  });

  it("a real directory with no tests keeps exit 0 (H-4 keeps the honest empty state)", async () => {
    const empty = join(dir, "empty-dir");
    mkdirSync(empty, { recursive: true });
    const code = await runScanCommand([empty], {
      out: () => {},
      err: () => {},
    });
    expect(code).toBe(0);
  });
});
