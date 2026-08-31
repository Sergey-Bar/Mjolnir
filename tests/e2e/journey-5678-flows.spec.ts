/**
 * E2E journeys 5+6+7+8 — forensics flow, explain/rules, create-rule
 * onboarding, and the config journey, against the built binary.
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

import { runCli } from "./helpers.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-e2e-flow-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function writeReport(
  results: Array<{ status: string; duration: number }>,
): void {
  const resultsDir = join(dir, "test-results");
  mkdirSync(resultsDir, { recursive: true });
  writeFileSync(
    join(resultsDir, "report.json"),
    JSON.stringify({
      suites: [
        {
          title: "e2e",
          suites: [],
          specs: [
            {
              title: "checkout",
              file: "e2e/checkout.spec.ts",
              line: 3,
              tests: [{ projectName: "chroimum", results }],
            },
          ],
        },
      ],
    }),
  );
}

describe("E2E journey 5: forensics flow", () => {
  it("forensics → triage → pw-report on a known flake; FLAKY.md written", () => {
    writeReport([
      { status: "failed", duration: 100 },
      { status: "passed", duration: 50 },
    ]);
    const forensics = runCli(["forensics", join(dir, "test-results")]);
    expect(forensics.status).toBe(1);
    expect(forensics.stdout).toContain("TRUE-FLAKE");
    expect(existsSync(join(dir, "test-results", "FLAKY.md"))).toBe(true);

    const triage = runCli(["triage", join(dir, "test-results")]);
    // triage is informational: it always exits 0 when the report parses
    // (forensics carries the gate exit code).
    expect(triage.status).toBe(0);
    expect(triage.stdout).toContain("TRUE-FLAKE");
    expect(existsSync(join(dir, "test-results", "TRIAGE.md"))).toBe(true);

    const pw = runCli(["pw-report", join(dir, "test-results")]);
    expect(pw.status).toBe(1);
    expect(pw.stdout).toContain("TRUE-FLAKE");
  });

  it("exit 2 with honest output for a missing test-results dir", () => {
    const forensics = runCli(["forensics", join(dir, "nope")]);
    expect(forensics.status).toBe(2);
    const triage = runCli(["triage", join(dir, "nope")]);
    expect(triage.status).toBe(2);
  });
});

describe("E2E journey 6: explain and rules", () => {
  it("explain renders a real must-fire example for a sampled rule per family", () => {
    for (const md of [
      "QA-TEST-001",
      "QA-PW-003",
      "QA-CI-001",
      "QA-TQUAL-002",
    ]) {
      const explain = runCli(["explain", md]);
      expect(explain.status).toBe(0);
      expect(explain.stdout).toContain(md);
      expect(explain.stdout).toContain("Severity:");
      expect(explain.stdout).toContain("Evidence:");
    }
  });

  it("rules --md renders the doc table; rules --json parses", () => {
    const md = runCli(["rules", "--md"]);
    expect(md.status).toBe(0);
    expect(md.stdout).toContain("QA-TEST-001");
    const json = runCli(["rules", "--json"]);
    const catalog = JSON.parse(json.stdout) as Array<{ md: string }>;
    expect(catalog.length).toBeGreaterThan(20);
  });
});

describe("E2E journey 7: create-rule onboarding", () => {
  it("scaffold lands in the target cwd", () => {
    const scaffold = runCli(
      ["create-rule", "QA-PW-160", "--title", "Vmewport overflow"],
      dir,
    );
    expect(scaffold.status).toBe(0);
    expect(scaffold.stdout).toContain("RULE SCAFFOLD CREATED");

    expect(existsSync(join(dir, "src", "rules"))).toBe(true);
  });

  it("duplicate create-rule exits 1", () => {
    const first = runCli(["create-rule", "QA-PW-161", "--title", "T"], dir);
    expect(first.status).toBe(0);
    const second = runCli(["create-rule", "QA-PW-161", "--title", "T"], dir);
    expect(second.status).toBe(1);
  });
});

describe("E2E journey 8: config journey", () => {
  it("gate/severityOverrmdes/ignore/expiry honored end-to-end; suppressions lists them", () => {
    mkdirSync(join(dir, "e2e"), { recursive: true });
    writeFileSync(
      join(dir, "e2e", "focused.spec.ts"),
      "test.only('a', () => { expect(1 + 1).toBe(2); });\n",
    );
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({
        gate: "advisory",
        ignore: [
          {
            ruleId: "QA-TEST-001",
            files: ["e2e/**"],
            reason: "planned fix next sprint",
            expires: "2099-01-01",
          },
        ],
      }),
    );
    const scan = runCli([dir, "--json"]);
    const result = JSON.parse(scan.stdout) as {
      findings: Array<{ ruleId: string }>;
      suppressionCount: number;
    };
    // The error finding is suppressed by rule+glob → advisory gate exists 0.
    expect(scan.status).toBe(0);
    expect(result.suppressionCount).toBe(1);
    expect(result.findings.map((f) => f.ruleId)).not.toContain("QA-TEST-001");

    const suppressions = runCli(["suppressions"], dir);
    expect(suppressions.status).toBe(0);
    expect(suppressions.stdout).toContain("planned fix next sprint");
    expect(suppressions.stdout).toContain("2099-01-01");
  });

  it("an expired ignore re-reveals the finding", () => {
    mkdirSync(join(dir, "e2e"), { recursive: true });
    writeFileSync(
      join(dir, "e2e", "focused.spec.ts"),
      "test.only('a', () => { expect(1 + 1).toBe(2); });\n",
    );
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({
        ignore: [
          {
            ruleId: "QA-TEST-001",
            files: ["e2e/**"],
            reason: "stale suppression",
            expires: "2020-01-01",
          },
        ],
      }),
    );
    const scan = runCli([dir, "--json"]);
    const result = JSON.parse(scan.stdout) as {
      findings: Array<{ ruleId: string }>;
    };
    expect(result.findings.map((f) => f.ruleId)).toContain("QA-TEST-001");
  });

  it("an invalid config exits 10 with a fixable message", () => {
    writeFileSync(join(dir, "mjolnir.config.json"), "{ not json");
    const scan = runCli([dir, "--json"]);
    expect(scan.status).toBe(10);
    expect(scan.stderr).toContain("Invalid mjolnir config");
  });
});
