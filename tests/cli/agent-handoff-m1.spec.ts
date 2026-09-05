/**
 * Agent-handoff plan M1 — fixGroupId + --category + --score.
 *
 * Contracts under test (plan §5.1, §5.5, §5.6):
 * - fixGroupId: additive-optional field, present on emitted findings,
 *   currently equal to ruleId as an IMPLEMENTATION STRATEGY (the doc
 *   comment forbids consumers relying on that permanently).
 * - --category: a presentation filter — narrows the terminal findings
 *   display, never the scan, never the JSON report, never the score.
 *   The frozen acceptance example: full scan 17 findings score 72 →
 *   --category shows 3, score still 72, note printed.
 * - --score: bare numeric output (or `unknown`), wins over --json with
 *   a stderr note, exit code identical to the equivalent scan.
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseArgs, runScanCommand, type Output } from "../../src/cli.js";
import { renderTerminal } from "../../src/reporter/terminal.js";
import type { ScanResult } from "../../src/types.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-m1-"));
  // Vitest config: the strongest framework signal (frameworks.ts:34-39) —
  // without it the adapter skips .spec.ts discovery entirely.
  writeFileSync(join(dir, "vitest.config.ts"), "export default {};\n");
  writeFileSync(
    join(dir, "a.spec.ts"),
    [
      `import { test, expect } from "vitest";`,
      ``,
      `test.only("skipped sibling", () => {`,
      `  expect(1).toBe(1);`,
      `});`,
      ``,
      `test("clean", () => {`,
      `  expect(1).toBe(1);`,
      `});`,
    ].join("\n"),
  );
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "fixture", private: true }),
  );
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function capture() {
  let out = "";
  let err = "";
  return {
    io: {
      out: ((s: string) => (out += `${s}\n`)) as Output,
      err: ((s: string) => (err += `${s}\n`)) as Output,
    },
    text: () => out,
    errText: () => err,
  };
}

/** Full-scan fixture used for the pure renderTerminal assertions. */
function resultFixture(
  findings: ScanResult["findings"],
  overrides: Partial<ScanResult> = {},
): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 72,
    frameworks: ["vitest"],
    frameworkDetectionUnknown: false,
    dimensions: [
      { category: "QA-TEST", score: 60, errors: 2, warnings: 0, infos: 0 },
      { category: "QA-PW", score: 85, errors: 0, warnings: 1, infos: 0 },
    ],
    findings,
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 5,
    },
    ...overrides,
  };
}

function finding(
  over: Partial<ScanResult["findings"][number]> = {},
): ScanResult["findings"][number] {
  return {
    ruleId: "QA-TEST-001",
    category: "QA-TEST",
    severity: "error",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "HYGIENE",
    file: "e2e/a.spec.ts",
    line: 3,
    column: 1,
    message: "msg",
    why: "why",
    fix: "fix it",
    ...over,
  };
}

describe("parseArgs — --category", () => {
  it("accepts a valid category", () => {
    expect(parseArgs(["--category", "QA-TEST"])?.categories).toEqual([
      "QA-TEST",
    ]);
  });

  it("is repeatable and preserves order", () => {
    expect(
      parseArgs(["--category", "QA-PW", "--category", "QA-TEST"])?.categories,
    ).toEqual(["QA-PW", "QA-TEST"]);
  });

  it("rejects an unknown category with the shared usage-error detail", () => {
    const seen: Array<{
      token?: string | undefined;
      flag?: string | undefined;
    }> = [];
    expect(
      parseArgs(["--category", "SECURITY"], (d) => seen.push(d)),
    ).toBeNull();
    expect(seen).toEqual([{ flag: "--category", token: "SECURITY" }]);
  });

  it("rejects a missing value", () => {
    expect(parseArgs(["--category"])).toBeNull();
  });

  it("defaults to undefined (no filtering)", () => {
    expect(parseArgs(["."])?.categories).toBeUndefined();
  });
});

describe("parseArgs — --score", () => {
  it("parses as a pure flag", () => {
    expect(parseArgs(["--score"])?.scoreOnly).toBe(true);
    expect(parseArgs(["--score", "."])?.target).toBe(".");
    expect(parseArgs(["."])?.scoreOnly).toBeUndefined();
  });
});

describe("renderTerminal — --category presentation filter", () => {
  const findings = [
    finding({ ruleId: "QA-TEST-001", category: "QA-TEST", line: 1 }),
    finding({ ruleId: "QA-TEST-002", category: "QA-TEST", line: 2 }),
    finding({ ruleId: "QA-TEST-003", category: "QA-TEST", line: 3 }),
    finding({
      ruleId: "QA-PW-118",
      category: "QA-PW",
      severity: "warning",
      line: 4,
      file: "e2e/b.spec.ts",
    }),
  ];

  it("renders ONLY the filtered findings and keeps the full-scan score", () => {
    const result = resultFixture(findings);
    const visible = findings.filter((f) => f.category === "QA-PW");
    const out = renderTerminal(result, {
      isTTY: false,
      visibleFindings: visible,
    });
    // Frozen acceptance example, scale model: 3 of 4 hidden by filter.
    expect(out).toContain(
      "filtered view: 1 of 4 findings shown; score reflects the full scan",
    );
    expect(out).toContain("QA-PW-118");
    expect(out).not.toContain("QA-TEST-001");
    // Score reflects the FULL scan, not the filtered view.
    expect(out).toContain("72/100");
  });

  it("emits the empty-view note when the category matches nothing", () => {
    const result = resultFixture(findings);
    const out = renderTerminal(result, {
      isTTY: false,
      visibleFindings: [],
    });
    expect(out).toContain(
      "filtered view: no findings in the selected category",
    );
    // Score still the full-scan score.
    expect(out).toContain("72/100");
  });

  it("renders identically to the unfiltered report when no filter is given", () => {
    const result = resultFixture(findings);
    expect(renderTerminal(result, { isTTY: false })).toBe(
      renderTerminal(result, { isTTY: false, visibleFindings: findings }),
    );
  });

  it("applies the filter to FIX THIS FIRST as well", () => {
    const result = resultFixture(findings);
    const visible = findings.filter((f) => f.category === "QA-PW");
    const out = renderTerminal(result, {
      isTTY: false,
      visibleFindings: visible,
    });
    // QA-TEST rules must not surface in the fix-first list either.
    expect(out).not.toContain("QA-TEST-00");
  });
});

describe("--score end-to-end", () => {
  it("prints the bare numeric score and nothing else on stdout", async () => {
    const cap = capture();
    const code = await runScanCommand([dir, "--score"], cap.io);
    // The fixture fires an error finding (test.only) → gate error → 1.
    expect(code).toBe(1);
    expect(cap.text().trim()).toMatch(/^\d+$/);
  });

  it("matches the --json score exactly (score vs report)", async () => {
    const jsonCap = capture();
    await runScanCommand([dir, "--json"], jsonCap.io);
    const report = JSON.parse(jsonCap.text()) as ScanResult;
    const cap = capture();
    await runScanCommand([dir, "--score"], cap.io);
    expect(cap.text().trim()).toBe(String(report.score));
  });

  it("preserves the gate exit code (fixture has an error finding → 1)", async () => {
    const cap = capture();
    const code = await runScanCommand([dir, "--score"], cap.io);
    // No-io call: exercises runScanCommand's console-fallback default io.
    const plain = await runScanCommand([dir]);
    // Exit code identical to the equivalent scan without --score.
    expect(code).toBe(plain);
    expect(code).toBe(1);
  });

  it("prints unknown when no tests exist (never a fake 0)", async () => {
    const empty = mkdtempSync(join(tmpdir(), "mjolnir-m1-empty-"));
    try {
      const cap = capture();
      const code = await runScanCommand([empty, "--score"], cap.io);
      expect(code).toBe(0);
      expect(cap.text().trim()).toBe("unknown");
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  it("keeps stdout machine-clean when --json is also passed (stderr note)", async () => {
    const cap = capture();
    const code = await runScanCommand([dir, "--score", "--json"], cap.io);
    expect(code).toBe(1);
    expect(cap.text().trim()).toMatch(/^(\d+|unknown)$/);
    expect(cap.errText()).toContain("--score overrides --json");
  });
});

describe("fixGroupId (plan §5.1)", () => {
  it("is present on emitted findings and currently equals ruleId", async () => {
    const cap = capture();
    await runScanCommand([dir, "--json"], cap.io);
    const report = JSON.parse(cap.text()) as ScanResult;
    expect(report.findings.length).toBeGreaterThan(0);
    for (const f of report.findings) {
      expect(f.fixGroupId).toBe(f.ruleId);
    }
  });

  it("groups same-rule findings under one remediation group id", async () => {
    writeFileSync(
      join(dir, "b.spec.ts"),
      [
        `import { test, expect } from "vitest";`,
        ``,
        `test.only("another skipped sibling", () => {`,
        `  expect(1).toBe(1);`,
        `});`,
      ].join("\n"),
    );
    const cap = capture();
    // QA-TEST-001 is tier: "quarantine" — it only runs under --strict.
    await runScanCommand([dir, "--json", "--strict"], cap.io);
    const report = JSON.parse(cap.text()) as ScanResult;
    expect(report.findings.length).toBeGreaterThan(0);
    // Every finding's fixGroupId equals its own ruleId (current
    // strategy), and the two .only occurrences across DIFFERENT files
    // (same rule = same root cause) share one remediation group.
    for (const f of report.findings) {
      expect(f.fixGroupId).toBe(f.ruleId);
    }
    const onlyFindings = report.findings.filter(
      (f) => f.ruleId === "QA-TEST-001",
    );
    expect(onlyFindings.length).toBeGreaterThanOrEqual(2);
    expect(new Set(onlyFindings.map((f) => f.fixGroupId)).size).toBe(1);
  });
});
