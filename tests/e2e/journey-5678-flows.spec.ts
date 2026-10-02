/**
 * E2E journeys 5+6+7+8 — the runtime-evidence flow, explain/catalogue, the
 * suppression ledger, and the config journey, against the built binary.
 *
 * Three of these journeys changed shape in the v6 carve and the test titles
 * are updated to match what ships: `forensics` + `triage` + `pw-report` are
 * now the `explain --evidence` / `--playwright` arms, `rules` is `explain
 * --list`, and `suppressions` is the `--suppressions` scan flag. `create-rule`
 * is gone outright — the onboarding story moved to `families/` in-repo, so
 * its journey is asserted as absent rather than skipped.
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

describe("E2E journey 5: runtime-evidence flow (was forensics/triage/pw-report)", () => {
  it(
    "explain --evidence classifies a known flake and writes FLAKY.md",
    { timeout: 60_000 },
    () => {
      writeReport([
        { status: "failed", duration: 100 },
        { status: "passed", duration: 50 },
      ]);
      const evidence = runCli([
        "explain",
        "--evidence",
        join(dir, "test-results"),
      ]);
      // The arm is informational: it classifies and writes, it does not gate.
      // The old `forensics` verb carried the exit code; folding the two into
      // one flag means the exit code belongs to the scan, not the report.
      expect(evidence.status).toBe(0);
      expect(evidence.stdout).toContain("TRUE-FLAKE");
      // FLAKY.md is the committed artifact. TRIAGE.md is render-only
      // (`--md` prints it), so the test asserts the file that is written
      // rather than the one a removed verb used to drop on disk.
      expect(existsSync(join(dir, "test-results", "FLAKY.md"))).toBe(true);
      expect(existsSync(join(dir, "test-results", "TRIAGE.md"))).toBe(false);

      const pw = runCli(["explain", "--playwright", join(dir, "test-results")]);
      expect(pw.status).toBe(1);
      expect(pw.stdout).toContain("TRUE-FLAKE");
    },
  );

  it(
    "a missing test-results dir reports honestly and writes nothing",
    { timeout: 60_000 },
    () => {
      const evidence = runCli(["explain", "--evidence", join(dir, "nope")]);
      expect(evidence.status).toBe(0);
      // "Nothing recognized" is an honest zero, not a crash and not a green
      // claim: the output has to say it found nothing rather than render an
      // empty table a reader could mistake for a clean run.
      expect(evidence.stdout).toContain("Nothing to triage");
      expect(existsSync(join(dir, "nope"))).toBe(false);
    },
  );
});

describe("E2E journey 6: explain and rules", () => {
  it(
    "explain renders a real must-fire example for a sampled rule per family",
    { timeout: 60_000 },
    () => {
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
    },
  );

  it(
    "rules --md renders the doc table; rules --json parses",
    { timeout: 60_000 },
    () => {
      const md = runCli(["explain", "--list", "--md"]);
      expect(md.status).toBe(0);
      expect(md.stdout).toContain("QA-TEST-001");
      const json = runCli(["explain", "--list", "--json"]);
      const catalog = JSON.parse(json.stdout) as Array<{ md: string }>;
      expect(catalog.length).toBeGreaterThan(20);
    },
  );
});

describe("E2E journey 7: create-rule onboarding is retired, not broken", () => {
  it(
    "the verb is a usage error rather than a silent scaffold",
    { timeout: 60_000 },
    () => {
      // `create-rule` scaffolded a rule file into the user's `src/rules`. The
      // carve retired it: a rule belongs in this repository's `families/` with
      // a measured FP rate, and a scaffold that emits an unmeasured detector
      // into a user's tree hands them a rule that cannot say whether it is
      // trustworthy. Asserted as GONE so a comeback under the old name is a
      // decision somebody has to make on purpose.
      const scaffold = runCli(
        ["create-rule", "QA-PW-160", "--title", "Viewport overflow"],
        dir,
      );
      expect(scaffold.status).toBe(10);
      expect(existsSync(join(dir, "src", "rules"))).toBe(false);
    },
  );
});

describe("E2E journey 8: config journey", () => {
  it(
    "gate/severityOverrmdes/ignore/expiry honored end-to-end; suppressions lists them",
    { timeout: 60_000 },
    () => {
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
      const scan = runCli([dir, "--json", "--strict"]);
      const result = JSON.parse(scan.stdout) as {
        findings: Array<{ ruleId: string }>;
        suppressionCount: number;
      };
      // The error finding is suppressed by rule+glob → advisory gate exists 0.
      expect(scan.status).toBe(0);
      expect(result.suppressionCount).toBe(1);
      expect(result.findings.map((f) => f.ruleId)).not.toContain("QA-TEST-001");

      const suppressions = runCli([dir, "--suppressions"]);
      expect(suppressions.status).toBe(0);
      expect(suppressions.stdout).toContain("planned fix next sprint");
      expect(suppressions.stdout).toContain("2099-01-01");
    },
  );

  it(
    "an expired ignore re-reveals the finding (--strict: QA-TEST-001 is quarantine-tier, Phase 2)",
    { timeout: 60_000 },
    () => {
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
      const scan = runCli([dir, "--json", "--strict"]);
      const result = JSON.parse(scan.stdout) as {
        findings: Array<{ ruleId: string }>;
      };
      expect(result.findings.map((f) => f.ruleId)).toContain("QA-TEST-001");
    },
  );

  it(
    "an invalid config exits 10 with a fixable message",
    { timeout: 60_000 },
    () => {
      writeFileSync(join(dir, "mjolnir.config.json"), "{ not json");
      const scan = runCli([dir, "--json"]);
      expect(scan.status).toBe(10);
      expect(scan.stderr).toContain("Invalid mjolnir config");
    },
  );
});
