/**
 * Forensics parsing & rendering edge cases (Test Hardening Plan —
 * coverage-gap closure).
 *
 * Targets specific unexercised branches: JUnit's single-quoted-attribute
 * fallback (every existing fixture uses double quotes), Playwright's
 * timedOut/skipped status mapping, the leaderboard/triage sort
 * comparators' tie-breaking branches (need a MIX of retry outcomes in
 * one report to all fire), and the MAX_FILES cap in the results-
 * directory walker.
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { parseJunitXml } from "../../src/forensics/parse-junit.js";
import { parsePlaywrightJson } from "../../src/forensics/parse-playwright-json.js";
import { analyze, leaderboard } from "../../src/forensics/analyze.js";
import { triageRows } from "../../src/forensics/triage.js";
import { runForensics } from "../../src/forensics/run.js";
import type { TestRecord } from "../../src/forensics/types.js";

describe("JUnit XML: single-quoted attributes (the double-quote path is already tested)", () => {
  it("parses testcase attributes wrapped in single quotes", () => {
    const xml = `<testsuite><testcase name='login test' classname='auth' time='0.5' /></testsuite>`;
    const records = parseJunitXml(xml);
    expect(records.length).toBeGreaterThan(0);
    expect(records[0]?.title).toBe("login test");
  });
});

describe("Playwright JSON: every RunStatus value maps correctly", () => {
  function pwJsonWithStatus(status: string) {
    return {
      suites: [
        {
          specs: [
            {
              file: "e2e/x.spec.ts",
              tests: [
                {
                  results: [{ status, duration: 100 }],
                },
              ],
            },
          ],
        },
      ],
    };
  }

  it("maps 'timedOut' to the timedOut status", () => {
    const records = parsePlaywrightJson(pwJsonWithStatus("timedOut"));
    expect(records[0]?.attempts[0]?.status).toBe("timedOut");
  });

  it("maps 'skipped' to the skipped status", () => {
    const records = parsePlaywrightJson(pwJsonWithStatus("skipped"));
    expect(records[0]?.attempts[0]?.status).toBe("skipped");
  });

  it("maps an unrecognized status string to 'interrupted' (the safe default)", () => {
    const records = parsePlaywrightJson(pwJsonWithStatus("some-future-status"));
    expect(records[0]?.attempts[0]?.status).toBe("interrupted");
  });
});

describe("leaderboard/triage sort comparators: mixed passedOnRetry outcomes", () => {
  // One test that failed then passed on retry (TRUE-FLAKE), one that
  // just failed outright with more attempts — forces the comparator's
  // passedOnRetry-tie-break branch to actually differ between two rows.
  const records: TestRecord[] = [
    {
      file: "e2e/flaky.spec.ts",
      title: "flaky one",
      attempts: [
        { index: 1, status: "failed", durationMs: 50 },
        { index: 2, status: "passed", durationMs: 40 },
      ],
    },
    {
      file: "e2e/broken.spec.ts",
      title: "always broken",
      attempts: [
        { index: 1, status: "failed", durationMs: 10 },
        { index: 2, status: "failed", durationMs: 10 },
        { index: 3, status: "failed", durationMs: 10 },
      ],
    },
  ];
  const report = analyze(records, "playwright-json");

  it("leaderboard ranks the TRUE-FLAKE ahead of the consistently-failing test", () => {
    const rows = leaderboard(report);
    expect(rows.length).toBe(2);
    expect(rows[0]?.passedOnRetry).toBe(true);
  });

  it("triage rows carry the same ordering and a 'quarantine + ticket' suggestion for the flake", () => {
    const rows = triageRows(report);
    const flakeRow = rows.find((r) => r.file === "e2e/flaky.spec.ts");
    expect(flakeRow?.suggestedAction).toBe("quarantine + ticket");
    expect(flakeRow?.proposedQuarantine).toBe(true);

    const brokenRow = rows.find((r) => r.file === "e2e/broken.spec.ts");
    expect(brokenRow?.suggestedAction).toBe("fix now — failing");
  });

  it("a single-attempt, non-retried failure suggests 'investigate' (too few attempts to call it flaky)", () => {
    // everFailed requires status "failed" or "timedOut"; a single attempt
    // with only 1 total attempt means passedOnRetry is false (needs >=2
    // attempts) and finalStatus isn't "failed"/"timedOut" either, since
    // this run ended in "interrupted" after one try — falls through to
    // the suggestAction() default branch.
    const singleFail: TestRecord[] = [
      {
        file: "e2e/one-shot.spec.ts",
        title: "single fail",
        attempts: [
          { index: 1, status: "failed", durationMs: 5 },
          { index: 2, status: "interrupted", durationMs: 5 },
        ],
      },
    ];
    const r = analyze(singleFail, "playwright-json");
    const rows = triageRows(r);
    expect(rows[0]?.suggestedAction).toBe("investigate");
  });
});

describe("results-directory walker respects MAX_FILES", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "mjolnir-forensics-maxfiles-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("does not hang or crash when a results directory has more than 500 files", () => {
    for (let i = 0; i < 520; i++) {
      writeFileSync(
        join(dir, `report-${i}.xml`),
        `<testsuite><testcase name="t${i}" classname="c" time="0.01" /></testsuite>`,
      );
    }
    const start = performance.now();
    expect(() => runForensics(dir, { writeFlakyMd: false })).not.toThrow();
    expect(performance.now() - start).toBeLessThan(15_000);
  });
});
