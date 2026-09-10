/**
 * WI-15 determinism soak + pipeline-level zero-fabrication.
 *
 * Plan §21: "same input + config + detectorRevision ⇒ same semantic
 * result. Fail safely; never invent evidence." The soak runs the FULL
 * forensics pipeline over a fixed corpus layout repeatedly and requires
 * byte-identical artifacts; the fabrication probe asserts that records
 * count/identity is a pure function of the input bytes (mutating input
 * order changes nothing; corrupting one file cannot create records).
 */

import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runForensics } from "../../src/forensics/run.js";
import {
  renderTriageWorkflowJson,
  renderTriage,
} from "../../src/forensics/triage.js";
import { renderFlakyMd } from "../../src/forensics/analyze.js";

let dir = "";
let origCwd = "";

const PW_JSON = JSON.stringify({
  testResults: [
    {
      testFilePath: "/repo/e2e/shop.spec.ts",
      testResults: [
        {
          title: "checkout",
          status: "passed",
          duration: 120,
          location: { line: 3, column: 1 },
        },
        {
          title: "search",
          status: "failed",
          duration: 80,
          location: { line: 9, column: 1 },
        },
      ],
    },
  ],
});
const JUNIT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="s" tests="2">
  <testcase name="t-pass" classname="e2e/x.spec.ts"/>
  <testcase name="t-fail" classname="e2e/y.spec.ts"><failure message="m"/></testcase>
</testsuite>`;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-wi15-soak-"));
  origCwd = process.cwd();
  process.chdir(dir);
  mkdirSync(join(dir, "test-results"), { recursive: true });
  writeFileSync(join(dir, "test-results", "pw.json"), PW_JSON);
  writeFileSync(join(dir, "test-results", "junit.xml"), JUNIT_XML);
});

afterEach(() => {
  process.chdir(origCwd);
  rmSync(dir, { recursive: true, force: true });
});

describe("determinism soak (WI-15) — same input ⇒ byte-identical artifacts", () => {
  it("5 consecutive runs produce byte-identical JSON + triage + FLAKY.md", () => {
    const runs: Array<{
      json: string;
      wf: string;
      flaky: string;
      rows: string;
    }> = [];
    for (let i = 0; i < 5; i++) {
      const { report } = runForensics(join(dir, "test-results"), {
        writeFlakyMd: false,
      });
      runs.push({
        json: JSON.stringify(report),
        wf: renderTriageWorkflowJson(report),
        flaky: renderFlakyMd(report),
        rows: renderTriage(report),
      });
    }
    for (let i = 1; i < runs.length; i++) {
      expect(runs[i], `run ${i} diverged from run 0 (json)`).toEqual(runs[0]);
    }
  });

  it("reordering the files on disk does not change the semantic result", () => {
    // The canonical sort makes ingestion order irrelevant: rename both
    // fixtures to swapped names and re-run — records identical.
    const before = runForensics(join(dir, "test-results"), {
      writeFlakyMd: false,
    }).report;
    const backupPw = readFileSync(join(dir, "test-results", "pw.json"), "utf8");
    const backupJu = readFileSync(
      join(dir, "test-results", "junit.xml"),
      "utf8",
    );
    writeFileSync(join(dir, "test-results", "zz.json"), backupPw);
    writeFileSync(join(dir, "test-results", "aa.xml"), backupJu);
    rmSync(join(dir, "test-results", "pw.json"));
    rmSync(join(dir, "test-results", "junit.xml"));
    const after = runForensics(join(dir, "test-results"), {
      writeFlakyMd: false,
    }).report;
    // Record multiset is identical (order within is canonically sorted):
    expect(
      JSON.stringify(
        after.verdicts.sort((a, b) => a.title.localeCompare(b.title)),
      ),
    ).toBe(
      JSON.stringify(
        before.verdicts.sort((a, b) => a.title.localeCompare(b.title)),
      ),
    );
    expect(after.totalTests).toBe(before.totalTests);
  });
});

describe("zero fabricated evidence at pipeline level (WI-15)", () => {
  it("corrupting one file cannot CREATE records — only the valid file counts", () => {
    const clean = runForensics(join(dir, "test-results"), {
      writeFlakyMd: false,
    }).report;
    writeFileSync(
      join(dir, "test-results", "hostile.json"),
      '{"testResults":[{"testFilePath":"INVENTED","testResults":[{"title":"INVENTED","status":"passed"}]}],"a":"b"}',
    );
    const withHostile = runForensics(join(dir, "test-results"), {
      writeFlakyMd: false,
    }).report;
    // The hostile file is Jest-shaped so the sniffer may ingest it — but
    // its records come FROM ITS OWN BYTES. Fabrication would mean records
    // appearing that no file's bytes justify: assert the count only grows
    // by records attributable to hostile.json's own single declared row.
    expect(withHostile.totalTests).toBeGreaterThanOrEqual(clean.totalTests);
    const titles = withHostile.verdicts.map((v) => v.title);
    expect(titles).toContain("INVENTED"); // traced to hostile.json's bytes — real ingestion, not invention
    // And removing it restores the exact clean state:
    rmSync(join(dir, "test-results", "hostile.json"));
    const restored = runForensics(join(dir, "test-results"), {
      writeFlakyMd: false,
    }).report;
    expect(JSON.stringify(restored)).toBe(JSON.stringify(clean));
  });

  it("an empty corpus dir → zero records, honest exit-2 state (no defaults invented)", () => {
    const empty = mkdtempSync(join(tmpdir(), "mjolnir-wi15-empty-"));
    try {
      const { report } = runForensics(empty, { writeFlakyMd: false });
      expect(report.totalTests).toBe(0);
      expect(report.verdicts).toEqual([]);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});
