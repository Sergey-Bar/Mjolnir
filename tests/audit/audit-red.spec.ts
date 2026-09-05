/**
 * M0 red tests — audit-remediation-master-plan.md (1788567639628).
 *
 * Behavioral freeze: each test pins a currently-broken behavior before any
 * fix lands. These are the acceptance tests for the M1–M4 fixes and are
 * expected to FAIL until their audit ID closes:
 *
 *  - audit-C1  (M1): cached verdicts must be path-identifiable — the
 *    content-addressed cache key omits the file path, so two files with
 *    byte-identical text share one verdict entry and the first file's
 *    findings get attributed to the second file on cache hit.
 *  - audit-C3  (M1): the default `err` sink must emit ALL parts
 *    (currently only the first — e.g. "mjolnir internal error:" prints
 *    without the actual error message).
 *  - audit-C5  (M1): a partial (truncated) scan must not write the
 *    first-clean-scan milestone, and `diff` on a partial scan must not
 *    fold resolved findings into stats or fire first-debt-reduction.
 *  - audit-S8  (M3): --help/-h exits 0; runSuppressions / runDoctorPlaywright
 *    map thrown errors to exit 20 instead of unhandled rejection.
 *  - audit-W1  (M1): code-text maskers must keep code AFTER a closed
 *    block comment live (`/…x…/ y` — `y` stays live).
 *  - audit-C4  (M4): a repo with only cypress.config.ts + insecure
 *    settings yields QA-CYP-003 (config rule currently unreachable).
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  main,
  runScan,
  runScanCommand,
  runDiffCommand,
  runSuppressions,
  runDoctorPlaywright,
} from "../../src/cli.js";
import { computeCodeText } from "../../src/engine/code-text.js";

const createdDirs: string[] = [];
afterEach(() => {
  while (createdDirs.length > 0) {
    const d = createdDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
  vi.restoreAllMocks();
});

function tmpRepo(label: string): string {
  const d = mkdtempSync(join(tmpdir(), `mjolnir-audit-${label}-`));
  createdDirs.push(d);
  return d;
}

function capture() {
  const out: string[] = [];
  return {
    io: {
      out: (...parts: unknown[]) => out.push(parts.map(String).join(" ")),
      err: (...parts: unknown[]) => out.push(parts.map(String).join(" ")),
    },
    text: () => out.join("\n"),
  };
}

const PW_HARD_SLEEP = (name: string) =>
  "import { test, expect } from '@playwright/test';\n" +
  `test('x-${name}', async ({ page }) => {\n` +
  "  await page.waitForTimeout(3000);\n" +
  "  await expect(page).toHaveTitle('t');\n" +
  "});\n";

describe("audit-C1: cache identity — verdicts identify their file", () => {
  it("two byte-identical files with different paths each carry their own file on --cache", async () => {
    const dir = tmpRepo("c1");
    // Byte-identical content — the whole point of the probe: the cache
    // key hashes only the text, so the second file's lookup returns the
    // first file's verdicts with `file: a.spec.ts` stamped inside.
    const identical = PW_HARD_SLEEP("same");
    writeFileSync(join(dir, "a.spec.ts"), identical);
    writeFileSync(join(dir, "b.spec.ts"), identical);
    const result = await runScan({
      target: dir,
      json: true,
      verbose: false,
      maxDurationMs: Number.POSITIVE_INFINITY,
      scopeChanged: false,
      format: "json",
      cache: true,
    });
    const files = new Set(
      result.findings
        .filter((f) => f.ruleId === "QA-PW-101")
        .map((f) => f.file),
    );
    // The cache key is content-only, so the second file's lookup returns
    // the first file's verdicts — findings for b.spec.ts carry a.spec.ts.
    expect(files).toEqual(new Set(["a.spec.ts", "b.spec.ts"]));
  });
});

describe("audit-C3: default io sinks are variadic", () => {
  it("default err sink emits every argument joined by spaces", async () => {
    // Deterministic two-arg default-err call: `triage` on a report whose
    // TRIAGE.md write fails (blocked by a same-named directory) reaches
    // the catch-to-20 handler, which calls the DEFAULT io.err with
    // ("mjolnir internal error:", <cause>) — the default sink must print
    // both. Today it prints only the first.
    const dir = tmpRepo("c3");
    const results = join(dir, "results");
    mkdirSync(results);
    mkdirSync(join(results, "TRIAGE.md"));
    writeFileSync(
      join(results, "report.xml"),
      '<testsuite tests="1">\n' +
        '  <testcase classname="tests/test_a.py" name="test_ok" time="0.100"/>\n' +
        "</testsuite>",
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await main(["triage", results]);
    // Read calls BEFORE restore — mockRestore() clears the call log.
    const calls = errSpy.mock.calls.map((c) => c.map(String).join(" "));
    errSpy.mockRestore();
    const internal = calls.find((c) => c.includes("mjolnir internal error:"));
    expect(internal).toBeDefined();
    expect((internal ?? "").length).toBeGreaterThan(
      "mjolnir internal error:".length,
    );
  });
});

describe("audit-C5: partial scans never write milestones or fold stats", () => {
  it("a --max-duration-truncated scan with a clean subset does NOT write first-clean-scan", async () => {
    const dir = tmpRepo("c5");
    mkdirSync(join(dir, "test"), { recursive: true });
    for (let i = 0; i < 12; i++) {
      writeFileSync(
        join(dir, "test", `clean${i}.spec.ts`),
        "import { describe, expect, it } from 'vitest';\n" +
          `describe('m${i}', () => { it('works', () => { expect(1 + ${i}).toBe(${1 + i}); }); });\n`,
      );
    }
    const cap = capture();
    const code = await runScanCommand(
      [dir, "--record-milestones", "--max-duration", "0.001"],
      cap.io,
    );
    if (code === 2) {
      // The scan was truncated — no milestone may be written.
      expect(cap.text()).not.toContain("MILESTONE");
    } else {
      // Not truncated — the probe is inconclusive but must stay clean.
      expect(code).toBe(0);
    }
    expect(cap.text()).not.toContain("first flawless scan");
  });

  it("diff with a partial (truncated) scan must NOT count resolved findings or fire first-debt-reduction", async () => {
    const dir = tmpRepo("c5-diff");
    mkdirSync(join(dir, "test"), { recursive: true });
    writeFileSync(join(dir, "test", "flaky.spec.ts"), PW_HARD_SLEEP("flaky"));
    // Baseline captured when the file still had the hard sleep; a
    // truncated scan that happens to miss the file must not "resolve" it.
    mkdirSync(join(dir, ".mjolnir"), { recursive: true });
    writeFileSync(
      join(dir, ".mjolnir", "baseline.json"),
      JSON.stringify({
        schemaVersion: 1,
        capturedAt: "2020-01-01T00:00:00.000Z",
        commit: "unknown",
        findings: [
          {
            ruleId: "QA-PW-101",
            file: "test/flaky.spec.ts",
            message: "`waitForTimeout()` hard sleep.",
            severity: "warning",
          },
        ],
      }),
    );
    const cap1 = capture();
    const code = await runDiffCommand(
      [dir, "--max-duration", "0.001"],
      cap1.io,
    );
    // A truncated (partial) diff must never announce a debt-reduction
    // milestone: the "fix" may be nothing but a truncated analysis.
    expect(cap1.text()).not.toContain("first debt reduction");
    if (code === 2) {
      expect(cap1.text()).not.toContain("MILESTONE");
    }
  });
});

describe("audit-S8: help exits 0; handler throws become exit 20", () => {
  it("--help exits 0 via main() dispatch", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const code = await main(["--help"]);
      expect(code).toBe(0);
    } finally {
      logSpy.mockRestore();
    }
  });

  it("-h exits 0 via main() dispatch", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const code = await main(["-h"]);
      expect(code).toBe(0);
    } finally {
      logSpy.mockRestore();
    }
  });

  it("runSuppressions maps a thrown error to exit 20 (not unhandled rejection)", () => {
    // Any non-ConfigValidationError throw must be contained by the
    // handler (catch-to-20), not rethrown to an unhandled rejection.
    // Today runSuppressions rethrows (line 904) — this probe pins the
    // containment contract; the M3 fix wraps the handler body.
    const code = runSuppressions({
      out: () => {
        throw new Error("probe-crash");
      },
      err: () => {},
    });
    expect(code).toBe(20);
  });

  it("runDoctorPlaywright maps a thrown error to exit 20 (never rejects)", async () => {
    const dir = tmpRepo("s8-dp");
    // Any downstream crash must be contained by the handler. Today an
    // error propagates as a rejection; after the fix: exit 20.
    const code = await runDoctorPlaywright(["doctor:playwright", dir], {
      out: () => {
        throw new Error("probe-crash");
      },
      err: () => {},
    });
    expect(code).toBe(20);
  });
});

describe("audit-W1: closed block comments keep trailing code live", () => {
  it("maskJava keeps `y` live after a closed block comment", () => {
    const masked = computeCodeText({ path: "A.java", text: "/*x*/y" }, "java");
    expect(masked.endsWith("y")).toBe(true);
  });

  it("maskCSharp keeps `y` live after a closed block comment", () => {
    const masked = computeCodeText({ path: "A.cs", text: "/*x*/y" }, "csharp");
    expect(masked.endsWith("y")).toBe(true);
  });
});

describe("audit-C4: cypress-only repo reaches QA-CYP-003", () => {
  it("scanning a repo with only cypress.config.ts + chromeWebSecurity:false yields QA-CYP-003", async () => {
    const dir = tmpRepo("c4");
    mkdirSync(join(dir, "test"), { recursive: true });
    writeFileSync(
      join(dir, "test", "app.cy.ts"),
      "describe('smoke', () => { it('opens', () => { cy.visit('/'); }); });\n",
    );
    writeFileSync(
      join(dir, "cypress.config.ts"),
      "import { defineConfig } from 'cypress';\n\n" +
        "export default defineConfig({\n" +
        "  chromeWebSecurity: false,\n" +
        "  e2e: { setupNodeEvents() {} },\n" +
        "});\n",
    );
    const cap = capture();
    const code = await runScanCommand([dir], cap.io);
    expect(code).toBe(1);
    expect(cap.text()).toContain("QA-CYP-003");
  });
});
