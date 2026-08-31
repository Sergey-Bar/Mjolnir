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

import { runTriageCommand } from "../src/cli.js";
import { runForensics } from "../src/forensics/run.js";
import { parsePlaywrightJson } from "../src/forensics/parse-playwright-json.js";

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

describe("`triage <report-file>` writes TRIAGE.md next to the file (M1)", () => {
  it("exits 0 and writes TRIAGE.md into the file's directory", () => {
    mkdirSync(join(dir, "results"));
    const reportFile = join(dir, "results", "report.xml");
    writeFileSync(reportFile, JUNIT);

    const code = runTriageCommand([reportFile]);

    expect(code, "the documented single-file usage must not crash").toBe(0);
    expect(existsSync(join(dir, "results", "TRIAGE.md"))).toBe(true);
    expect(existsSync(join(dir, "results", "report.xml", "TRIAGE.md"))).toBe(
      false,
    );
  });

  it("directory targets still write TRIAGE.md inside the directory (no behavior change)", () => {
    const resultsDir = join(dir, "results");
    mkdirSync(resultsDir);
    writeFileSync(join(resultsDir, "report.xml"), JUNIT);

    const code = runTriageCommand([resultsDir]);

    expect(code).toBe(0);
    expect(existsSync(join(resultsDir, "TRIAGE.md"))).toBe(true);
  });
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

  it("`triage <corrupt.json>` exits 2 (honest), never 20 (internal error)", () => {
    const corrupt = join(dir, "corrupt.json");
    writeFileSync(corrupt, "{not json at all");

    const code = runTriageCommand([corrupt]);
    expect(code).toBe(2);
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
