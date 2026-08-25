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

import { runScan, parseArgs, main } from "../src/cli.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "qa-doctor-config-audit-"));
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
  });
}

describe("qa-doctor.config.json `severityOverrides` (documented in config.ts)", () => {
  it("downgrading QA-TEST-001 to info in config has no effect on scan output", () => {
    writeFileSync(
      join(dir, "qa-doctor.config.json"),
      JSON.stringify({ severityOverrides: { "QA-TEST-001": "info" } }),
    );
    const result = scan();
    const finding = result.findings.find((f) => f.ruleId === "QA-TEST-001");
    expect(
      finding?.severity,
      "config.ts's applySeverityOverrides is never called from the scan " +
        "path — severityOverrides in qa-doctor.config.json is silently " +
        "ignored, same root cause as the `ignore` (suppressions) gap.",
    ).toBe("info");
  });
});

describe("qa-doctor.config.json `gate` (documented in config.ts)", () => {
  it("a malformed gate value fails fast with a clear config error", () => {
    // Now that the scan path actually reads the config, an invalid value
    // surfaces loudly instead of being silently ignored — a typo'd gate
    // level must never quietly change gating behavior.
    writeFileSync(
      join(dir, "qa-doctor.config.json"),
      JSON.stringify({ gate: "not-a-real-gate-level" }),
    );
    expect(() => scan()).toThrow(/gate must be advisory\|error\|warning/);
  });
});

describe("qa-doctor.config.json `ignore` missing required `reason`", () => {
  it("an ignore entry without a reason fails fast with a clear config error", () => {
    // §27 requires every suppression to carry a reason; now that the
    // scan path validates the config, the requirement is actually
    // enforced instead of silently skipped.
    writeFileSync(
      join(dir, "qa-doctor.config.json"),
      JSON.stringify({ ignore: [{ ruleId: "QA-TEST-001" }] }),
    );
    expect(() => scan()).toThrow(/requires a "reason"/);
  });
});

describe("the empty-state message references a flag that doesn't exist", () => {
  it("`--tests-dir` is not a recognized flag (parseArgs rejects it)", () => {
    // src/reporter/terminal.ts's own no-tests-found message says:
    // "If your tests live elsewhere: qa-doctor --tests-dir <path>"
    // — but parseArgs has no case for it, so this exact command a user
    // is told to run fails with a usage error before it does anything.
    expect(
      parseArgs(["--tests-dir", "somewhere"]),
      "terminal.ts tells users to run `--tests-dir <path>` when no " +
        "tests are found, but parseArgs doesn't recognize that flag at " +
        "all — following the tool's own suggestion produces exit 10.",
    ).toBeNull();
  });

  it("running the suggested command actually exits 10 (usage error), not more help", () => {
    const code = main(["--tests-dir", "somewhere"]);
    expect(code).toBe(10);
  });
});
