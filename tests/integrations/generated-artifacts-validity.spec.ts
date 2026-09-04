/**
 * Generated-artifact validity (Test Hardening Plan — product-quality
 * gap: mjolnir writes files into a user's repo that other systems
 * then consume; nothing verified those files are actually well-formed).
 *
 *  - `mjolnir ci install` writes a GitHub Actions workflow — if it's
 *    not valid YAML, the user's CI silently never runs (or GitHub shows
 *    a cryptic parse error the user didn't cause).
 *  - `mjolnir badge` writes a shields.io endpoint JSON — if it doesn't
 *    match shields.io's schema, the badge silently renders as an error
 *    icon on the user's README forever.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";

import {
  ciInstall,
  gateScript,
  TEMPLATE,
  type EnforcingGate,
  type GateLevel,
} from "../../src/integrations/ci-install.js";
import { buildBadge } from "../../src/commands/badge.js";
import type { ScanResult } from "../../src/types.js";

describe("`ci install` output is valid, parseable YAML", () => {
  const gates: GateLevel[] = ["advisory", "error", "warning"];

  for (const gate of gates) {
    it(`gate="${gate}" produces a workflow that parses as YAML`, () => {
      const dir = mkdtempSync(join(tmpdir(), "mjolnir-ci-yaml-"));
      try {
        const { written } = ciInstall(dir, gate);
        const text = readFileSync(written, "utf8");
        let parsed: Record<string, unknown> | undefined;
        expect(() => {
          parsed = parseYaml(text) as Record<string, unknown>;
        }, "generated workflow is not valid YAML").not.toThrow();
        // `pull_request:` with no value is valid YAML for "run on all
        // pull_request event types" and parses to null — presence of
        // the key is what matters, not its (legitimately-null) value.
        const on = parsed?.["on"] as Record<string, unknown> | undefined;
        const jobs = parsed?.["jobs"] as Record<string, unknown> | undefined;
        expect(on, "workflow has no top-level `on:`").toBeDefined();
        expect(
          on && "pull_request" in on,
          "workflow's `on:` has no pull_request trigger",
        ).toBe(true);
        expect(jobs?.["scan"], "workflow has no `jobs.scan`").toBeDefined();
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }

  it("the embedded JS gate-check snippet has balanced braces/quotes (sanity check on template interpolation)", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-ci-yaml-balance-"));
    try {
      const { written } = ciInstall(dir, "error");
      const text = readFileSync(written, "utf8");
      const openBraces = (text.match(/\{/g) ?? []).length;
      const closeBraces = (text.match(/\}/g) ?? []).length;
      expect(openBraces).toBe(closeBraces);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("`ci install` gate script semantics (bug-audit H2b/H2c — executed, not just parsed)", () => {
  /**
   * The old template's gate was unreachable: with `--gate error` the scan
   * step's own exit 1 failed the job before the gate ever ran. The new gate
   * is a standalone `node -e` script; here it is executed for real against
   * fixture scan results, asserting the exact contract:
   *   clean → 0 · errors → 1 · warnings-only → 1 iff gate=warning ·
   *   partial → always 0 (a truncated scan must never block) ·
   *   missing mjolnir.json → 1 (a crashed scan must never pass).
   */
  const GATE_CASES: Array<{
    name: string;
    result: Record<string, unknown>;
    expected: Record<EnforcingGate, number>;
  }> = [
    {
      name: "clean scan passes both gates",
      result: { partial: false, findings: [] },
      expected: { error: 0, warning: 0 },
    },
    {
      name: "error-severity findings fail both gates",
      result: {
        partial: false,
        findings: [
          { severity: "error", ruleId: "QA-PW-101", file: "a.ts", line: 1 },
        ],
      },
      expected: { error: 1, warning: 1 },
    },
    {
      name: "warning-only findings fail the warning gate but not the error gate",
      result: {
        partial: false,
        findings: [
          { severity: "warning", ruleId: "QA-TEST-004", file: "a.ts", line: 2 },
        ],
      },
      expected: { error: 0, warning: 1 },
    },
    {
      name: "a partial scan never blocks either gate",
      result: {
        partial: true,
        findings: [
          { severity: "error", ruleId: "QA-PW-101", file: "a.ts", line: 1 },
        ],
      },
      expected: { error: 0, warning: 0 },
    },
    {
      name: "findings missing severity are ignored, not crashed on",
      result: { partial: false, findings: [{ ruleId: "QA-XXX-000" }, null] },
      expected: { error: 0, warning: 0 },
    },
  ];

  for (const tc of GATE_CASES) {
    for (const gate of ["error", "warning"] as EnforcingGate[]) {
      it(`${tc.name} — gate=${gate} exits ${tc.expected[gate]}`, () => {
        const dir = mkdtempSync(join(tmpdir(), "mjolnir-gate-fixture-"));
        try {
          writeFileSync(join(dir, "mjolnir.json"), JSON.stringify(tc.result));
          let status: number | null = 0;
          let stdout = "";
          try {
            stdout = execFileSync(process.execPath, ["-e", gateScript(gate)], {
              cwd: dir,
              encoding: "utf8",
            });
          } catch (e) {
            status = (e as { status: number | null }).status;
          }
          expect(status).toBe(tc.expected[gate]);
          if (status === 0 && stdout.length > 0) {
            // partial scans explain why they did not block
            if (tc.result.partial === true) expect(stdout).toContain("PARTIAL");
          }
        } finally {
          rmSync(dir, { recursive: true, force: true });
        }
      });
    }
  }

  it("a missing/corrupt mjolnir.json fails the gate (a crashed scan must not pass silently)", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-gate-missing-"));
    try {
      let status: number | null = 0;
      try {
        execFileSync(process.execPath, ["-e", gateScript("error")], {
          cwd: dir,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        });
      } catch (e) {
        status = (e as { status: number | null }).status;
      }
      expect(status).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("`ci install` never silently overwrites a customized workflow (bug-audit H2e)", () => {
  it("refuses when the file is hand-customized and preserves it verbatim", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-ci-refuse-"));
    try {
      const first = ciInstall(dir, "advisory");
      const customized =
        readFileSync(first.written, "utf8") + "\n# hand tweak\n";
      writeFileSync(first.written, customized);

      const second = ciInstall(dir, "error");
      expect(second.existed).toBe(true);
      expect(second.refused).toBe(true);
      expect(second.diffSummary.length).toBeGreaterThan(0);
      expect(readFileSync(first.written, "utf8")).toBe(customized);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("--force replaces the customized file with the template", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-ci-force-"));
    try {
      const first = ciInstall(dir, "advisory");
      writeFileSync(first.written, "name: mine\n");
      const forced = ciInstall(dir, "advisory", { force: true });
      expect(forced.refused).toBe(false);
      expect(readFileSync(first.written, "utf8")).toBe(TEMPLATE("advisory"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("re-running the same template (idempotent) and switching gates both stay allowed", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-ci-idempotent-"));
    try {
      expect(ciInstall(dir, "advisory").refused).toBe(false);
      // identical content → not customized
      expect(ciInstall(dir, "advisory").refused).toBe(false);
      // a different gate is still a Mjölnir-generated shape → allowed
      const switched = ciInstall(dir, "warning");
      expect(switched.refused).toBe(false);
      expect(readFileSync(switched.written, "utf8")).toContain(
        "Gate (warning)",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("`badge` output matches the shields.io endpoint schema", () => {
  function sampleResult(score: number | null): ScanResult {
    return {
      schemaVersion: 1,
      partial: false,
      score,
      frameworks: [],
      frameworkDetectionUnknown: true,
      dimensions: [],
      findings: [],
      analysisStatus: {
        discovery: "complete",
        rules: "complete",
        skippedFiles: 0,
        durationMs: 1,
      },
    };
  }

  const SHIELDS_COLORS = new Set([
    "brightgreen",
    "green",
    "yellowgreen",
    "yellow",
    "orange",
    "red",
    "blue",
    "lightgrey",
    "success",
    "important",
    "critical",
    "informational",
    "inactive",
  ]);

  it("schemaVersion is the literal 1 shields.io requires", () => {
    const badge = buildBadge(sampleResult(85));
    expect(badge.schemaVersion).toBe(1);
  });

  it("label and message are non-empty strings", () => {
    const badge = buildBadge(sampleResult(85));
    expect(typeof badge.label).toBe("string");
    expect(badge.label.length).toBeGreaterThan(0);
    expect(typeof badge.message).toBe("string");
    expect(badge.message.length).toBeGreaterThan(0);
  });

  it("color is one of shields.io's recognized named colors, for every score band", () => {
    for (const score of [null, 0, 40, 55, 76, 91, 100]) {
      const badge = buildBadge(sampleResult(score));
      expect(
        SHIELDS_COLORS.has(badge.color),
        `score ${score} produced color "${badge.color}", which shields.io ` +
          `does not recognize as a named color — it would render the ` +
          `badge with a fallback/gray color instead of the intended one.`,
      ).toBe(true);
    }
  });

  it("the JSON round-trips through JSON.stringify/parse without loss", () => {
    const badge = buildBadge(sampleResult(85));
    const roundTripped = JSON.parse(JSON.stringify(badge)) as typeof badge;
    expect(roundTripped).toEqual(badge);
  });
});
