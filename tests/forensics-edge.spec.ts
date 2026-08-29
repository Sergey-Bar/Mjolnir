/**
 * Edge-case coverage for forensics: analyze/leaderboard branches, parser
 * guards, and run.ts dispatch corners not hit by the happy-path specs.
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  analyze,
  leaderboard,
  renderFlakyMd,
  renderLeaderboard,
} from "../src/forensics/analyze.js";
import { parseJunitXml } from "../src/forensics/parse-junit.js";
import { parsePlaywrightJson } from "../src/forensics/parse-playwright-json.js";
import { runForensics } from "../src/forensics/run.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-fx-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("analyze edge cases", () => {
  it("counts failed/timedOut/interrupted finals and skips", () => {
    const report = analyze(
      [
        {
          file: "a",
          title: "failed",
          attempts: [{ index: 1, status: "failed", durationMs: 10 }],
        },
        {
          file: "a",
          title: "timed-out",
          attempts: [{ index: 1, status: "timedOut", durationMs: 10 }],
        },
        {
          file: "a",
          title: "interrupted",
          attempts: [{ index: 1, status: "interrupted", durationMs: 10 }],
        },
        {
          file: "a",
          title: "skipped",
          attempts: [{ index: 1, status: "skipped", durationMs: 0 }],
        },
      ],
      "junit-xml",
    );
    expect(report.failed).toBe(3);
    expect(report.skipped).toBe(1);
    expect(report.flakyTests).toBe(0);
  });

  it("retried-but-clean tests count as retried, not flaky", () => {
    const report = analyze(
      [
        {
          file: "a",
          title: "clean retry",
          attempts: [
            { index: 1, status: "passed", durationMs: 5 },
            { index: 2, status: "passed", durationMs: 5 },
          ],
        },
      ],
      "playwright-json",
    );
    expect(report.retriedTests).toBe(1);
    expect(report.flakyTests).toBe(0);
  });

  it("treats empty-attempt records as skipped", () => {
    const report = analyze(
      [{ file: "a", title: "ghost", attempts: [] }],
      "playwright-json",
    );
    expect(report.verdicts[0]?.finalStatus).toBe("skipped");
    expect(report.skipped).toBe(1);
  });

  it("renders leaderboard 'retried' flag for clean retries", () => {
    const report = analyze(
      [
        {
          file: "a",
          title: "clean retry",
          attempts: [
            { index: 1, status: "passed", durationMs: 5 },
            { index: 2, status: "passed", durationMs: 500 },
          ],
        },
      ],
      "playwright-json",
    );
    expect(renderLeaderboard(report)).toContain("retried");
  });

  it("FLAKY.md renders honest empty state", () => {
    expect(renderFlakyMd(analyze([], "junit-xml"))).toContain(
      "No flaky or failing tests",
    );
  });

  it("leaderboard sorts by attempts then duration among non-flakes", () => {
    const report = analyze(
      [
        {
          file: "a",
          title: "fail-fast",
          attempts: [{ index: 1, status: "failed", durationMs: 10 }],
        },
        {
          file: "b",
          title: "fail-slow",
          attempts: [{ index: 1, status: "failed", durationMs: 900 }],
        },
      ],
      "junit-xml",
    );
    expect(leaderboard(report).map((v) => v.title)).toEqual([
      "fail-slow",
      "fail-fast",
    ]);
  });
});

describe("parseJunitXml guards", () => {
  it("handles self-closing testcases with single-quoted attrs", () => {
    const recs = parseJunitXml(
      `<testsuite><testcase name='solo' classname='C' time='abc'/></testsuite>`,
    );
    expect(recs[0]?.title).toBe("solo");
    expect(recs[0]?.attempts[0]?.durationMs).toBe(0);
  });

  it("defaults missing name/classname", () => {
    const recs = parseJunitXml(`<testsuite><testcase/></testsuite>`);
    expect(recs[0]?.title).toBe("(unnamed)");
    expect(recs[0]?.file).toBe("unknown");
  });

  it("detects junit by content sniff even without .xml extension", () => {
    writeFileSync(
      join(dir, "report.txt"),
      "<testsuite><testcase name='x'/></testsuite>",
    );
    const { report } = runForensics(join(dir, "report.txt"), {
      writeFlakyMd: false,
    });
    expect(report.source).toBe("junit-xml");
    expect(report.totalTests).toBe(1);
  });
});

describe("parsePlaywrightJson guards", () => {
  it("caps recursion depth without crashing", () => {
    let deep: Record<string, unknown> = { specs: [] };
    for (let i = 0; i < 40; i++) deep = { suites: [deep] };
    expect(() => parsePlaywrightJson(deep)).not.toThrow();
  });

  it("maps unknown statuses to interrupted and tolerates bad durations", () => {
    const recs = parsePlaywrightJson({
      suites: [
        {
          specs: [
            {
              tests: [
                {
                  results: [
                    { status: "weird", duration: Number.NaN },
                    { status: "timedOut" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    expect(recs[0]?.attempts.map((a) => a.status)).toEqual([
      "interrupted",
      "timedOut",
    ]);
    expect(recs[0]?.attempts[0]?.durationMs).toBe(0);
  });

  it("skips tests with zero results and defaults titles/files", () => {
    const recs = parsePlaywrightJson({
      suites: [
        {
          specs: [
            { tests: [{ results: [] }] },
            { title: "named", tests: [{ results: [{ status: "passed" }] }] },
            { tests: [{ results: [{ status: "passed" }] }] },
          ],
        },
      ],
    });
    expect(recs).toHaveLength(2);
    expect(recs[0]?.file).toBe("unknown");
    expect(recs[1]?.title).toBe("(unnamed)");
  });
});

describe("runForensics dispatch corners", () => {
  it("prefers report.json over xml in mixed directories", () => {
    mkdirSync(join(dir, "nested"), { recursive: true });
    writeFileSync(
      join(dir, "z-junit.xml"),
      "<testsuite><testcase name='x'/></testsuite>",
    );
    writeFileSync(
      join(dir, "nested", "report.json"),
      JSON.stringify({
        suites: [
          {
            specs: [
              {
                file: "a.spec.ts",
                tests: [{ results: [{ status: "passed", duration: 1 }] }],
              },
            ],
          },
        ],
      }),
    );
    const { report } = runForensics(dir, { writeFlakyMd: false });
    expect(report.source).toBe("playwright-json");
  });

  it("returns undefined flakyMdPath when write fails on a file target", () => {
    // Single-file target: FLAKY.md path would be the FILE itself + /FLAKY.md
    // → write fails → undefined. Uses writeFlakyMd default (true).
    const f = join(dir, "report.json");
    writeFileSync(
      f,
      JSON.stringify({
        suites: [
          {
            specs: [
              {
                file: "a.spec.ts",
                tests: [{ results: [{ status: "passed", duration: 1 }] }],
              },
            ],
          },
        ],
      }),
    );
    const { flakyMdPath } = runForensics(f);
    expect(flakyMdPath).toBeUndefined();
  });
});
