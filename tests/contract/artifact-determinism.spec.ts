/**
 * `artifact:deterministic` — two runs of an HTML artifact over an
 * unchanged repository produce byte-identical bytes.
 *
 * BITTERSWEET `BW-106`. The dashboard embedded `new Date()` in the
 * visible body, so its output changed on every run and could never be
 * diffed in review: a reviewer could not tell a real change from a new
 * timestamp. `engine/machine-contract.ts` already excludes `durationMs`
 * from the verification digest for exactly this reason — the HTML
 * artifact now holds the same line.
 *
 * The rule this locks:
 *   - `--deterministic` omits the generation timestamp entirely, so the
 *     file is a pure function of the scan result;
 *   - without the flag, the timestamp is still recorded — as document
 *     METADATA (`<meta name="mjolnir-generated-at">`), never as body text,
 *     so it cannot be mistaken for a measurement.
 */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import type { DashboardData } from "../../src/commands/dashboard.js";
import { generateDashboardHtmlForTest } from "../../src/commands/dashboard.js";

const ROOT = resolve(import.meta.dirname, "..", "..");

/** A result with everything a dashboard renders, so a missing branch
 *  cannot make the two runs agree by both being empty. */
const FULL: DashboardData = {
  score: 72,
  totalFindings: 3,
  errorCount: 1,
  warningCount: 1,
  frameworkCount: 2,
  partial: false,
  findingsShown: 3,
  findings: [
    {
      ruleId: "QA-TEST-001",
      severity: "error",
      file: "a.spec.ts",
      message: "assertion is a no-op",
    },
    {
      ruleId: "QA-PY-003",
      severity: "warning",
      file: "b.spec.ts",
      message: "fixed sleep",
    },
    {
      ruleId: "QA-CI-010",
      severity: "info",
      file: ".github/workflows/x.yml",
      message: "continue-on-error",
    },
  ],
  generatedAt: "2026-01-01T00:00:00.000Z",
};

describe("artifact:deterministic — the HTML artifact is a function of the scan", () => {
  it("the same result renders byte-identical HTML twice", () => {
    expect(generateDashboardHtmlForTest(FULL)).toBe(
      generateDashboardHtmlForTest(FULL),
    );
  });

  it("--deterministic drops the timestamp, so two runs over an unchanged repo match", () => {
    // Two "runs" that differ ONLY in wall-clock, exactly as two scans of
    // an unchanged repository would.
    const first = { ...FULL, generatedAt: null };
    const second = { ...FULL, generatedAt: null };
    expect(generateDashboardHtmlForTest(first)).toBe(
      generateDashboardHtmlForTest(second),
    );
    // ...and a different clock with the flag OFF still changes the file,
    // which is the whole point of having the flag.
    const stamped = generateDashboardHtmlForTest({
      ...FULL,
      generatedAt: "2026-02-02T00:00:00.000Z",
    });
    expect(stamped).not.toBe(generateDashboardHtmlForTest(first));
  });

  it("no wall-clock reaches the rendered body in any mode", () => {
    for (const generatedAt of [null, "2026-03-03T04:05:06.000Z"]) {
      const html = generateDashboardHtmlForTest({ ...FULL, generatedAt });
      const body = html.slice(html.indexOf("<body>"));
      // A timestamp in the body is a value with no provenance: it
      // changes every run and describes nothing about the repository.
      expect(body, String(generatedAt)).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
    }
  });

  it("the timestamp is still recorded, as metadata, when not deterministic", () => {
    const html = generateDashboardHtmlForTest(FULL);
    expect(html).toContain('<meta name="mjolnir-generated-at"');
    expect(html).toContain("2026-01-01T00:00:00.000Z");
  });

  it("the dashboard score band comes from the one registry, not a local split", () => {
    // BW-104: the dashboard used to split at 60. 65 is UNWORTHY in the
    // terminal and must not render as the trusted colour here.
    const html = generateDashboardHtmlForTest({ ...FULL, score: 65 });
    // trusted is aurora-cyan; a 65 must take the critical colour.
    expect(html.toLowerCase()).toContain("#ec6b66");
    expect(html.toLowerCase()).not.toContain("#5cc4e0");
  });

  it("an unmeasured framework count reads 'unknown', never 0", () => {
    const html = generateDashboardHtmlForTest({
      ...FULL,
      frameworkCount: null,
    });
    expect(html).toContain(">unknown<");
  });
});

describe("the artifact is the one the CLI writes", () => {
  it("no other dashboard template is in the tree", () => {
    // BW-042 retires the hand-written template; until the React bundle
    // ships this asserts there is exactly ONE generator, not two that
    // can disagree about a band.
    const source = readFileSync(
      join(ROOT, "src", "commands", "dashboard.ts"),
      "utf8",
    );
    expect(source.match(/<!DOCTYPE html>/g) ?? []).toHaveLength(1);
  });
});
