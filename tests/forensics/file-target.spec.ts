/**
 * File-target forensics/triage (bug-audit M1, M2, M3).
 *
 *  - M1: the documented `mjolnir triage <report-file>` joined the FILE
 *    path with "TRIAGE.md" → `<file>/TRIAGE.md` is not a directory →
 *    writeFileSync threw → "internal error" exit 20 after a successful
 *    parse. The md artifact now lands next to the file.
 *  - M2: `forensics <report-file>` had the same join bug inside its own
 *    try/catch — flakyMdPath silently became undefined while the output
 *    still ended "Full details in FLAKY.md (committed artifact)." The
 *    hint is now printed only when the file was actually written.
 *  - M3: a corrupt single-file report crashed with exit 20 (no try/catch
 *    on the single-file path) instead of the honest exit 2 the directory
 *    path already produced.
 */

import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { analyze, renderLeaderboard } from "../../src/forensics/analyze.js";
import type { TestRecord } from "../../src/forensics/types.js";
import { runForensics } from "../../src/forensics/run.js";
import { parsePlaywrightJson } from "../../src/forensics/parse-playwright-json.js";

const JUNIT = `<testsuite tests="1">
  <testcase classname="tests/test_a.py" name="test_ok" time="0.100"/>
</testsuite>`;

let dir: string;
let origCwd: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-file-target-"));
  origCwd = process.cwd();
  process.chdir(dir);
});

afterEach(() => {
  process.chdir(origCwd);
  rmSync(dir, { recursive: true, force: true });
});

describe("`forensics <report-file>` FLAKY.md honesty (M2)", () => {
  it("writes FLAKY.md next to the file and the hint tells the truth", () => {
    const reportFile = join(dir, "junit.xml");
    writeFileSync(reportFile, JUNIT);

    const { report, output, flakyMdPath } = runForensics(reportFile);

    expect(report.totalTests).toBe(1);
    expect(flakyMdPath).toBe(join(dir, "FLAKY.md"));
    expect(existsSync(flakyMdPath ?? "")).toBe(true);
    expect(output).toContain("Full details in FLAKY.md");
  });

  it("never claims the artifact when it was not written (--no-flaky-md)", () => {
    const reportFile = join(dir, "junit.xml");
    writeFileSync(reportFile, JUNIT);

    const { flakyMdPath, output } = runForensics(reportFile, {
      writeFlakyMd: false,
    });

    expect(flakyMdPath).toBeUndefined();
    expect(output).not.toContain("Full details in FLAKY.md");
    expect(output).toContain("--no-flaky-md");
  });
});

describe("corrupt single-file reports degrade honestly (M3)", () => {
  it("`forensics <corrupt.json>` yields zero records instead of throwing", () => {
    const corrupt = join(dir, "corrupt.json");
    writeFileSync(corrupt, '{"suites": 5, "specs": "nope"}');

    expect(() => {
      const { report } = runForensics(corrupt);
      expect(report.totalTests).toBe(0);
    }).not.toThrow();
  });
});

describe("forensics completeness regressions", () => {
  it.each([true, false])(
    "single traces report FLAKY.md only when written (%s)",
    (writeFlakyMd) => {
      const path = join(dir, "single.trace");
      writeFileSync(
        path,
        [
          JSON.stringify({
            type: "before",
            callId: "c1",
            apiName: "page.goto",
          }),
          JSON.stringify({
            type: "after",
            callId: "c1",
            startTime: 1,
            endTime: 2,
          }),
        ].join("\n"),
      );
      const result = runForensics(path, { writeFlakyMd });
      expect(result.report.totalTests).toBe(1);
      expect(result.output.includes("Full details in FLAKY.md")).toBe(
        writeFlakyMd,
      );
      expect(existsSync(join(dir, "FLAKY.md"))).toBe(writeFlakyMd);
      expect(result.flakyMdPath).toBe(
        writeFlakyMd ? join(dir, "FLAKY.md") : undefined,
      );
    },
  );

  it("marks the analysis record cap partial without claiming skipped files", () => {
    const record: TestRecord = {
      file: "a.spec.ts",
      title: "a",
      attempts: [{ index: 1, status: "passed", durationMs: 0 }],
    };
    const report = analyze(
      Array.from({ length: 100_001 }, () => record),
      "playwright-json",
    );
    expect(report.totalTests).toBe(100_000);
    expect(report.analysisComplete).toBe(false);
    expect(report.skippedReports).toBe(0);
    expect(report.incompleteReasons).toContain("record-count-limit");
    const output = renderLeaderboard(report);
    expect(output).toContain("record count limit reached; analysis is partial");
    expect(output).not.toContain("0 report(s) skipped");
    expect(analyze([record], "playwright-json").analysisComplete).toBe(true);
  });

  it.each([
    ["report.json", "{broken"],
    ["playwright-report.json", '{"suites":'],
    ["jest-report.json", '{"testResults":'],
    ["vitest-report.json", "{broken"],
    ["custom.json", '{"suites": 5}'],
    ["custom.json", '{"testResults": "broken"}'],
  ])(
    "marks malformed recognized %s partial alongside valid tests",
    (name, text) => {
      writeFileSync(join(dir, "valid.xml"), JUNIT);
      writeFileSync(join(dir, name), text);
      const { report } = runForensics(dir, { writeFlakyMd: false });
      expect(report.totalTests).toBe(1);
      expect(report.analysisComplete).toBe(false);
      expect(report.skippedReports).toBe(1);
      expect(report.incompleteReasons).toContain("parse-failure");
      // The `forensics` VERB is retired in the v6 CLI collapse (plan §3), so
      // the EXIT-CODE half of this assertion went with it — there is no
      // command left to return 2. What that code encoded, the report says in
      // words: `analysisComplete: false` and a `parse-failure` reason, both
      // asserted above. A partial analysis is now reported as a partial
      // analysis rather than as a command that failed — the same information
      // with one fewer thing to go wrong, and the `trust-report` path that
      // consumes it reads the report, not the exit code.
    },
  );

  it("preserves record and parse limits together through directory aggregation", () => {
    const xml =
      "<testsuite>" + '<testcase name="ok"/>'.repeat(20_000) + "</testsuite>";
    for (let i = 0; i < 6; i++) writeFileSync(join(dir, `${i}.xml`), xml);
    writeFileSync(join(dir, "report.json"), "{broken");
    const { report } = runForensics(dir, { writeFlakyMd: false });
    expect(report.totalTests).toBe(100_000);
    expect(report.analysisComplete).toBe(false);
    expect(report.skippedReports).toBe(1);
    expect(report.incompleteReasons).toEqual(
      expect.arrayContaining(["record-count-limit", "parse-failure"]),
    );
    const output = renderLeaderboard(report);
    expect(output).toContain("1 report(s) skipped (parse-failure)");
    expect(output).toContain("record count limit reached");
    expect(output).not.toContain(
      "1 report(s) skipped (record-count-limit, parse-failure)",
    );
  });

  it("ignores ordinary JSON configuration alongside valid tests", () => {
    writeFileSync(join(dir, "valid.xml"), JUNIT);
    writeFileSync(join(dir, "package.json"), '{"name":"app"}');
    const { report } = runForensics(dir, { writeFlakyMd: false });
    expect(report.analysisComplete).toBe(true);
    expect(report.skippedReports).toBe(0);
  });
});

describe("parsePlaywrightJson is total over corrupt shapes (M3)", () => {
  const corruptShapes: Array<[string, unknown]> = [
    ["suites is a number", { suites: 5 }],
    ["suites is a string", { suites: "x" }],
    ["nested suite is null", { suites: [null] }],
    ["nested suite is a number", { suites: [7] }],
    ["specs is null", { specs: null }],
    ["spec.tests is a string", { specs: [{ title: "t", tests: "no" }] }],
    ["test.results is a number", { specs: [{ tests: [{ results: 3 }] }] }],
    [
      "deeply interleaved nulls",
      { suites: [{ suites: [null, { specs: [{ tests: null }] }] }] },
    ],
  ];

  for (const [name, shape] of corruptShapes) {
    it(`does not throw when ${name}`, () => {
      expect(() => parsePlaywrightJson(shape)).not.toThrow();
      expect(parsePlaywrightJson(shape)).toEqual([]);
    });
  }

  it("still parses valid records alongside corrupt siblings", () => {
    const shape = {
      suites: [
        null,
        {
          specs: [
            {
              title: "real",
              file: "a.spec.ts",
              tests: [{ results: [{ status: "passed", duration: 5 }] }],
            },
          ],
        },
      ],
    };
    const recs = parsePlaywrightJson(shape);
    expect(recs).toHaveLength(1);
    expect(recs[0]?.title).toBe("real");
  });
});
