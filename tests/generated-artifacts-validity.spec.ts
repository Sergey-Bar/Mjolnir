/**
 * Generated-artifact validity (Test Hardening Plan — product-quality
 * gap: qa-doctor writes files into a user's repo that other systems
 * then consume; nothing verified those files are actually well-formed).
 *
 *  - `qa-doctor ci install` writes a GitHub Actions workflow — if it's
 *    not valid YAML, the user's CI silently never runs (or GitHub shows
 *    a cryptic parse error the user didn't cause).
 *  - `qa-doctor badge` writes a shields.io endpoint JSON — if it doesn't
 *    match shields.io's schema, the badge silently renders as an error
 *    icon on the user's README forever.
 */

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";

import { ciInstall, type GateLevel } from "../src/integrations/ci-install.js";
import { buildBadge } from "../src/commands/badge.js";
import type { ScanResult } from "../src/types.js";

describe("`ci install` output is valid, parseable YAML", () => {
  const gates: GateLevel[] = ["advisory", "error", "warning"];

  for (const gate of gates) {
    it(`gate="${gate}" produces a workflow that parses as YAML`, () => {
      const dir = mkdtempSync(join(tmpdir(), "qa-doctor-ci-yaml-"));
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
    const dir = mkdtempSync(join(tmpdir(), "qa-doctor-ci-yaml-balance-"));
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
    const roundTripped = JSON.parse(JSON.stringify(badge));
    expect(roundTripped).toEqual(badge);
  });
});
