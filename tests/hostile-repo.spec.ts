/**
 * Hostile-repo regression suite (QA-2026-08-30 wave, Phase 3).
 *
 * Synthetic repositories in tmp dirs (never tests/fixtures/ — rule
 * fixtures are must-fire/must-not-fire contracts that must stay clean).
 * Each test runs the REAL scan pipeline (runScan) against a tree built
 * to break a specific ingestion path: malformed workflow YAML, malformed
 * JUnit XML handed to forensics, oversized files, deep nesting, unicode
 * filenames, and metadata that survives the walk.
 *
 * Contract under test: a hostile repo degrades HONESTLY — counted
 * skips, exit code stays in the documented set, no crash, no hang.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runScan } from "../src/cli.js";
import { parseJunitXml } from "../src/forensics/parse-junit.js";
import { parsePlaywrightJson } from "../src/forensics/parse-playwright-json.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-hostile-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** runScan + the documented exit-code contract (0/1/2 in-scan, 10 usage). */
async function expectScanInContract(target = dir): Promise<number> {
  let exit: number;
  try {
    const r = await runScan({
      target,
      json: true,
      verbose: true,
      maxDurationMs: 30_000,
      scopeChanged: false,
      format: "json",
    });
    exit =
      r.analysisStatus.discovery === "partial" || r.partial
        ? 2
        : r.findings.some((f) => f.severity === "error")
          ? 1
          : 0;
  } catch (err) {
    exit =
      err instanceof Error && err.name === "ConfigValidationError" ? 10 : 20;
  }
  expect([0, 1, 2, 10]).toContain(exit);
  return exit;
}

describe("hostile repo: malformed ingestion inputs", () => {
  it("a workflow YAML that is not YAML at all degrades without crashing the scan", async () => {
    mkdirSync(join(dir, ".github", "workflows"), { recursive: true });
    writeFileSync(
      join(dir, ".github", "workflows", "ci.yml"),
      "{{{{ not yaml: [:::\n\t\tbroken ]]]\n  - - - - : : :",
    );
    expect([0, 1, 2, 10]).toContain(await expectScanInContract());
  });

  it("a workflow YAML that is valid YAML but not a workflow is ignored honestly", async () => {
    mkdirSync(join(dir, ".github", "workflows"), { recursive: true });
    writeFileSync(
      join(dir, ".github", "workflows", "notes.yml"),
      "just: text\n",
    );
    expect([0, 1, 2, 10]).toContain(await expectScanInContract());
  });

  it("malformed JUnit XML shapes all return records or empty — never throw", () => {
    const hostile = [
      "",
      "<testsuite>",
      "</testcase>",
      "<testcase name=",
      "<testcase name='a></testcase><script>alert(1)</script>",
      "<TESTCASE NAME='UPPER' CLASSNAME='C'/></TESTCASE>",
      '<testcase name="x"><skipped/></testcase>',
      "<!-- comment --><testcase name='y' classname='C' time='-3'/>",
    ];
    for (const xml of hostile) {
      expect(() => parseJunitXml(xml)).not.toThrow();
      const recs = parseJunitXml(xml);
      expect(Array.isArray(recs)).toBe(true);
    }
  });

  it("a hostile playwright JSON report never throws the forensics parser", () => {
    const hostile = [
      "null",
      "[]",
      '"string"',
      "42",
      '{"suites": {"not": "an array"}}',
      '{"suites": [null], "specs": 42}',
      '{"suites": [{"suites": [{"specs": [{"title": 5, "file": null, "tests": null}]}]}]}',
      '{"errors": [null, 1, "x"], "stats": {"expected": "NaN"}}',
    ];
    for (const json of hostile) {
      expect(() => parsePlaywrightJson(JSON.parse(json))).not.toThrow();
    }
  });

  it("a 2 MB test file is skipped honestly — counted, not scanned, not fatal", async () => {
    mkdirSync(join(dir, "e2e"), { recursive: true });
    writeFileSync(
      join(dir, "e2e", "huge.spec.ts"),
      `// ${"x".repeat(2 * 1024 * 1024)}\n`,
    );
    const r = await runScan({
      target: dir,
      json: true,
      verbose: true,
      maxDurationMs: 30_000,
      scopeChanged: false,
      format: "json",
    });
    // QA-16: the skip is counted and the scan flags itself partial.
    expect(r.analysisStatus.skippedFiles).toBeGreaterThanOrEqual(1);
    expect(r.analysisStatus.truncationReasons).toContain("file-size");
    expect(r.partial).toBe(true);
    expect(r.findings.some((f) => f.file.includes("huge.spec.ts"))).toBe(false);
  });

  it("40 levels of nesting exceed the depth cap without hanging or crashing", async () => {
    let d = dir;
    for (let i = 0; i < 40; i++) d = join(d, `n${i}`);
    mkdirSync(d, { recursive: true });
    writeFileSync(
      join(d, "deep.spec.ts"),
      `it("x", () => { expect(1).toBe(1); });\n`,
    );
    expect([0, 1, 2, 10]).toContain(await expectScanInContract());
  });

  it("unicode and # filenames survive the whole pipeline", async () => {
    mkdirSync(join(dir, "t"), { recursive: true });
    writeFileSync(
      join(dir, "t", "ünïcodé-#hash.test.ts"),
      "const expected = 1;\nit('x', () => { expect(expected).toBe(1); });\n",
    );
    const r = await runScan({
      target: dir,
      json: true,
      verbose: true,
      maxDurationMs: 30_000,
      scopeChanged: false,
      format: "json",
    });
    expect(
      r.findings.some((f) => f.file.includes("ünïcodé-#hash.test.ts")),
    ).toBe(false); // clean file: no findings, but it must have been scanned
    // proof it was scanned: a focused twin does produce a finding
    // (QA-TEST-002 was measured 65% FP and demoted to quarantine
    // 2026-08-31; the proof file uses QA-TEST-001, which still fires
    // by default)
    writeFileSync(
      join(dir, "t", "ünïcodé-#hash-2.test.ts"),
      "it.only('y', () => { page.goto('/x'); });\n",
    );
    const r2 = await runScan({
      target: dir,
      json: true,
      verbose: true,
      maxDurationMs: 30_000,
      scopeChanged: false,
      format: "json",
    });
    expect(
      r2.findings.some((f) => f.file.includes("ünïcodé-#hash-2.test.ts")),
    ).toBe(true);
  });

  it("a rejected-severity config plus hostile repo still exits in the documented set", async () => {
    mkdirSync(join(dir, ".github", "workflows"), { recursive: true });
    writeFileSync(
      join(dir, ".github", "workflows", "ci.yml"),
      "on: push\njobs:\n  a:\n    steps:\n      - run: echo hi\n",
    );
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ exclude: [1, null, {}] }),
    );
    // loadConfig throws ConfigValidationError → usage error path (10).
    // Since the Phase 0.5 async parse stage, that throw surfaces as a
    // rejected promise from runScan.
    let exit: number;
    try {
      await runScan({
        target: dir,
        json: true,
        verbose: true,
        maxDurationMs: 30_000,
        scopeChanged: false,
        format: "json",
      });
      exit = 0; // did not throw — would mean the hostile exclude was accepted
    } catch (err) {
      exit =
        err instanceof Error && err.name === "ConfigValidationError" ? 10 : 20;
    }
    expect(exit).toBe(10);
  });
});
