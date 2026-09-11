/**
 * False-Green Mutation / Assertion-Strength Protocol (plan §6, R4b).
 *
 * For EVERY wired case and EVERY report-field binding, the protocol
 * injects the controlled mutation the plan names — the false-green twin
 * of the honest report (failure→success · partial→complete ·
 * unknown→clean · crashed-rule→clean · missing-evidence→PASS …) — and
 * requires the case's own assertion to FAIL on the twin. A binding that
 * survives its negation is decorative (it would pass on a false green)
 * and fails CI. Unexecuted assertions count as no protection: the
 * protocol derives the mutation set FROM the bindings, so a case cannot
 * opt out.
 *
 * Input-level twins (the parser class) additionally flip the hostile
 * INPUT to its benign form and require the observed state to flip with
 * it — a parser that returns the same zero-record verdict for a corrupt
 * report AND a valid passing report is a detector defect this protocol
 * surfaces.
 */

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runForensics } from "../../src/forensics/run.js";
import { FALSE_GREEN_CASES } from "./cases.js";
import {
  assertReportFields,
  cleanupDir,
  negateReportField,
  runScanOnInput,
} from "./harness.js";

const wired = FALSE_GREEN_CASES.filter((c) => c.wired);

const HONEST_REPORTS = new Map<
  string,
  Awaited<ReturnType<typeof runScanOnInput>>
>();
const TEMP_DIRS: string[] = [];

beforeAll(async () => {
  // Build each scan-based wired case's honest observation ONCE, then
  // mutate it. (The corpus spec re-runs the cases; here we need the
  // report objects the bindings were written against.)
  HONEST_REPORTS.set(
    "fg-exec-empty-suite",
    await runScanOnInput({ "README.md": "not a test\n" }),
  );

  const files: Record<string, string> = {};
  for (let i = 0; i < 30; i++) {
    files[`test${i}.spec.ts`] = "it('x', () => { expect(1).toBe(1); });\n";
  }
  HONEST_REPORTS.set(
    "fg-exec-deadline-scan",
    await runScanOnInput(files, { maxDurationMs: 1 }),
  );

  const pad = "# " + "x".repeat(120) + "\n";
  const partial = await runScanOnInput({
    ".github/workflows/big.yml":
      "jobs: {a: {steps: [{run: 'x'}]}}\n" + pad.repeat(9200),
    ".github/workflows/ci.yml":
      "jobs:\n  a:\n    steps:\n      - run: npm test || true\n",
  });
  HONEST_REPORTS.set("fg-exec-partial-with-findings", partial);
  TEMP_DIRS.push(...[...HONEST_REPORTS.values()].map((v) => v.dir));
});

afterAll(() => {
  for (const dir of TEMP_DIRS) cleanupDir(dir);
});

describe("mutation protocol — every report-field binding must fail on its false-green twin", () => {
  for (const c of wired) {
    for (const binding of c.expectedReportFields) {
      it(`${c.id}: binding "${binding}" survives no mutation`, () => {
        const report = HONEST_REPORTS.get(c.id)?.result;
        if (report === undefined) {
          // Non-scan cases (evidence/mcp/agent) assert behavioral
          // outcomes in corpus.spec.ts; their bindings are declarative
          // contract rows for the index (hasBaseline/exit mappings the
          // CLI arms lock). The mutation loop applies to scan reports.
          return;
        }
        const twin = negateReportField(report, binding);
        let threw = false;
        try {
          assertReportFields(twin, [binding]);
        } catch {
          threw = true;
        }
        expect(
          threw,
          `binding "${binding}" of ${c.id} PASSED on its false-green twin — the assertion is decorative`,
        ).toBe(true);
      });
    }
  }
});

describe("mutation protocol — parser input twins (hostile → benign must flip the verdict)", () => {
  function forensicsTotalTests(name: string, body: string): number {
    const dir = mkdtempSync(join(tmpdir(), "fg-mut-"));
    try {
      writeFileSync(join(dir, name), body);
      return runForensics(join(dir, name), { writeFlakyMd: false }).report
        .totalTests;
    } finally {
      cleanupDir(dir);
    }
  }

  it("corrupt → passing report flips totalTests 0 → ≥1 (the assertions tell the difference)", () => {
    expect(forensicsTotalTests("jest-report.json", "{{{{")).toBe(0);
    expect(
      forensicsTotalTests(
        "jest-report.json",
        JSON.stringify({
          numTotalTests: 1,
          testResults: [
            {
              testFilePath: "a.spec.ts",
              testResults: [
                {
                  title: "t",
                  status: "passed",
                  location: { file: "a.spec.ts", line: 1 },
                },
              ],
            },
          ],
        }),
      ),
    ).toBe(1);
  });

  it("truncated → complete report flips totalTests 0 → ≥1", () => {
    const full = JSON.stringify({
      config: { version: "1.0" },
      suites: [
        {
          specs: [
            {
              title: "a",
              ok: true,
              file: "a.spec.ts",
              line: 1,
              column: 1,
              tests: [{ status: "expected", results: [{ status: "passed" }] }],
            },
          ],
        },
      ],
    });
    expect(
      forensicsTotalTests(
        "playwright-report.json",
        full.slice(0, Math.floor(full.length * 0.6)),
      ),
    ).toBe(0);
    expect(forensicsTotalTests("playwright-report.json", full)).toBe(1);
  });

  it("malformed → well-formed JUnit flips totalTests 0 → 1", () => {
    expect(
      forensicsTotalTests(
        "junit.xml",
        '<?xml version="1.0"?><testsuites><testsuite name="s"><testcase name="t"',
      ),
    ).toBe(0);
    expect(
      forensicsTotalTests(
        "junit.xml",
        '<?xml version="1.0"?><testsuites><testsuite name="s" tests="1" failures="0"><testcase name="t" classname="a.spec.ts" time="0.1"/></testsuite></testsuites>',
      ),
    ).toBe(1);
  });
});
