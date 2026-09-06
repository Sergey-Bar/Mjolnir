/**
 * Coverage completion for the agent-handoff milestones (M2/M3/M5).
 *
 * Each test targets one uncovered arm of the 100% per-file coverage
 * gate — these are genuine contract arms, not decoration:
 * - why: evidence/trust render arms, measuredFpN arm, corroboration
 *   level arms, default-io, --json without value, live-scan mode,
 *   --category filtering.
 * - handoff: severity sort arms, fixGroupId fallback, corroboration
 *   level arms, flag-value arms, --rules split arm, positional arm,
 *   default-io.
 * - changed: git-failure degraded arm of computeStagedFiles.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  explainAt,
  parseFileLine,
  renderWhy,
  runWhyCommand,
} from "../../src/commands/why.js";
import {
  renderHandoff,
  runHandoffCommand,
} from "../../src/commands/handoff.js";
import { computeStagedFiles } from "../../src/scope/changed.js";
import type { Finding, ScanResult } from "../../src/types.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-cov-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function finding(over: Partial<Finding> = {}): Finding {
  const f: Finding = {
    ruleId: "QA-TEST-001",
    category: "QA-TEST",
    severity: "error",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "FALSE-GREEN",
    file: "e2e/a.spec.ts",
    line: 3,
    column: 1,
    message: "msg",
    why: "why",
    fix: "fix it",
    fixGroupId: "QA-TEST-001",
    ...over,
  };
  // Current strategy: fixGroupId tracks the rule (plan §5.1).
  f.fixGroupId = over.fixGroupId ?? over.ruleId ?? "QA-TEST-001";
  return f;
}

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

import type { Output } from "../../src/cli.js";

describe("why — evidence render arms", () => {
  it("trust level renders when present (with evidence level)", () => {
    const text = renderWhy(
      explainAt(
        [finding({ evidenceLevel: "E2", trustLevel: "L4" })],
        "e2e/a.spec.ts",
        3,
      ),
    );
    expect(text).toContain("Evidence: evidence E2 · trust L4");
  });

  it("trust level renders even without an evidence level", () => {
    const text = renderWhy(
      explainAt([finding({ trustLevel: "L2" })], "e2e/a.spec.ts", 3),
    );
    expect(text).toContain("Evidence: trust L2");
  });

  it("neither evidence nor trust → no Evidence line", () => {
    const f = finding();
    delete f.evidenceLevel;
    delete f.trustLevel;
    const text = renderWhy(explainAt([f], "e2e/a.spec.ts", 3));
    expect(text).not.toContain("Evidence:");
  });

  it("measured FP without measuredFpN omits the verdict count", () => {
    const text = renderWhy(
      explainAt([finding({ measuredFpRate: 0.5 })], "e2e/a.spec.ts", 3),
    );
    expect(text).toContain("Measured FP rate: 50%");
    expect(text).not.toContain("classified verdicts");
  });

  it("corroboration level defect/file render their labels", () => {
    const defect = renderWhy(
      explainAt(
        [
          finding({
            runtimeCorroboration: {
              level: "defect",
              source: "junit-xml",
              testsExecuted: 3,
            },
          }),
        ],
        "e2e/a.spec.ts",
        3,
      ),
    );
    expect(defect).toContain(
      "defect corroborated by the run report (junit-xml)",
    );
    const fileLevel = renderWhy(
      explainAt(
        [
          finding({
            runtimeCorroboration: {
              level: "file",
              source: "playwright-json",
              testsExecuted: 3,
            },
          }),
        ],
        "e2e/a.spec.ts",
        3,
      ),
    );
    expect(fileLevel).toContain("the containing file executed");
  });

  it("parseFileLine windows-drive edge with a drive but no line", () => {
    expect(parseFileLine("C:\\x\\a.spec.ts:")).toBeNull();
  });
});

describe("why — command arms", () => {
  function reportJson(findings: Finding[]): string {
    const p = join(dir, `report-${Math.random().toString(36).slice(2)}.json`);
    writeFileSync(
      p,
      JSON.stringify({
        schemaVersion: 1,
        partial: false,
        score: 72,
        frameworks: [],
        frameworkDetectionUnknown: false,
        dimensions: [],
        findings,
        analysisStatus: {
          discovery: "complete",
          rules: "complete",
          skippedFiles: 0,
          durationMs: 1,
        },
      }),
    );
    return p;
  }

  it("default io path (console.log fallback) renders a match", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const p = reportJson([finding()]);
      expect(await runWhyCommand(["e2e/a.spec.ts:3", "--json", p])).toBe(0);
    } finally {
      logSpy.mockRestore();
    }
  });

  it("--json as the last token (no value) falls back to live scan on the target", async () => {
    // Deterministic: a tiny temp target so the live-scan fallback never
    // races the 5s default budget under full-suite load (it used to scan
    // "." — the whole worktree — which flaked CI).
    writeFileSync(join(dir, "vitest.config.ts"), "export default {};\n");
    const code = await runWhyCommand(
      ["e2e/none.spec.ts:1", dir, "--json"],
      capture().io,
    );
    expect([0, 1]).toContain(code);
  });

  it("live scan mode: target positional after the location", async () => {
    writeFileSync(join(dir, "vitest.config.ts"), "export default {};\n");
    writeFileSync(
      join(dir, "a.spec.ts"),
      [
        `import { test, expect } from "vitest";`,
        ``,
        `test.only("focused", () => {`,
        `  expect(1).toBe(1);`,
        `});`,
      ].join("\n"),
    );
    const cap = capture();
    const code = await runWhyCommand(["a.spec.ts:3", dir, "--strict"], cap.io);
    expect(code).toBe(0);
    expect(cap.text()).toContain("QA-TEST-001");
  });

  it("--category filters why output at one location", async () => {
    const p = reportJson([
      finding(),
      finding({ ruleId: "QA-PW-118", category: "QA-PW", severity: "warning" }),
    ]);
    const cap = capture();
    const code = await runWhyCommand(
      ["e2e/a.spec.ts:3", "--json", p, "--category", "QA-PW"],
      cap.io,
    );
    expect(code).toBe(0);
    expect(cap.text()).toContain("QA-PW-118");
    expect(cap.text()).not.toContain("QA-TEST-001");
  });

  it("live scan failure (nonexistent target) → exit 10 with the reason", async () => {
    const cap = capture();
    const code = await runWhyCommand(
      ["a.spec.ts:1", join(dir, "does-not-exist")],
      cap.io,
    );
    expect(code).toBe(10);
    expect(cap.errText()).toContain("scan target does not exist");
  });

  it("live scan success through the default io (console fallback)", async () => {
    writeFileSync(join(dir, "vitest.config.ts"), "export default {};\n");
    writeFileSync(
      join(dir, "a.spec.ts"),
      [
        `import { test, expect } from "vitest";`,
        ``,
        `test.only("focused", () => {`,
        `  expect(1).toBe(1);`,
        `});`,
      ].join("\n"),
    );
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      expect(await runWhyCommand(["a.spec.ts:3", dir, "--strict"])).toBe(0);
      const printed = logSpy.mock.calls.map((a) => a.join(" ")).join("\n");
      expect(printed).toContain("QA-TEST-001");
    } finally {
      logSpy.mockRestore();
    }
  });

  it("live scan crash (a config file that fails validation) → exit 20", async () => {
    writeFileSync(join(dir, "vitest.config.ts"), "export default {};\n");
    writeFileSync(join(dir, "a.spec.ts"), `test("x", () => {});\n`);
    // mjolnir.config.json with a broken gate value → ConfigValidationError
    // inside runScan → the why command's crash path (exit 20).
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ gate: "mega" }),
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(await runWhyCommand(["a.spec.ts:1", dir])).toBe(20);
    } finally {
      errSpy.mockRestore();
    }
  });
});

describe("handoff — uncovered arms", () => {
  function report(over: Partial<ScanResult> = {}): ScanResult {
    return {
      schemaVersion: 1,
      partial: false,
      score: 72,
      frameworks: [],
      frameworkDetectionUnknown: false,
      dimensions: [],
      findings: [finding()],
      analysisStatus: {
        discovery: "complete",
        rules: "complete",
        skippedFiles: 0,
        durationMs: 1,
      },
      ...over,
    };
  }

  function reportJson(findings: Finding[]): string {
    const p = join(dir, `report-${Math.random().toString(36).slice(2)}.json`);
    writeFileSync(
      p,
      JSON.stringify({
        schemaVersion: 1,
        partial: false,
        score: 72,
        frameworks: [],
        frameworkDetectionUnknown: false,
        dimensions: [],
        findings,
        analysisStatus: {
          discovery: "complete",
          rules: "complete",
          skippedFiles: 0,
          durationMs: 1,
        },
      }),
    );
    return p;
  }

  it("corroboration defect/test/file labels in the evidence boundary", () => {
    const base = { testsExecuted: 3 } as const;
    const defect = renderHandoff(
      report({
        findings: [
          finding({
            runtimeCorroboration: {
              ...base,
              level: "defect",
              source: "junit-xml",
            },
          }),
        ],
      }),
    );
    expect(defect).toContain("directly corroborates this defect");
    const testLevel = renderHandoff(
      report({
        findings: [
          finding({
            runtimeCorroboration: {
              ...base,
              level: "test",
              source: "junit-xml",
            },
          }),
        ],
      }),
    );
    expect(testLevel).toContain("the containing test executed");
    const fileLevel = renderHandoff(
      report({
        findings: [
          finding({
            runtimeCorroboration: {
              ...base,
              level: "file",
              source: "junit-xml",
            },
          }),
        ],
      }),
    );
    expect(fileLevel).toContain("the containing file executed");
  });

  it("groups without fixGroupId fall back to ruleId (semantic contract)", () => {
    const f = finding();
    delete f.fixGroupId;
    const md = renderHandoff(report({ findings: [f] }));
    expect(md).toContain("(fix group: QA-TEST-001)");
  });

  it("severity sort reaches the tie-break arms (same severity, same size)", () => {
    const md = renderHandoff(
      report({
        findings: [
          finding({ ruleId: "QA-Z-009", file: "e2e/z.spec.ts" }),
          finding({ ruleId: "QA-A-001", file: "e2e/a.spec.ts" }),
          finding({ ruleId: "QA-M-005", file: "e2e/m.spec.ts" }),
        ],
      }),
    );
    const z = md.indexOf("### QA-Z-009");
    const a = md.indexOf("### QA-A-001");
    const m = md.indexOf("### QA-M-005");
    expect(a).toBeLessThan(m);
    expect(m).toBeLessThan(z);
  });

  it("measured FP without measuredFpN omits the count (artifact arm)", () => {
    const md = renderHandoff(
      report({ findings: [finding({ measuredFpRate: 0.2 })] }),
    );
    expect(md).toContain("Measured FP rate: 20%.");
  });

  it("--pathless flag values hit the friendly-error arms", () => {
    const cap = capture();
    expect(runHandoffCommand(["--category"], cap.io)).toBe(10);
    expect(cap.errText()).toContain("--category");
    const cap2 = capture();
    expect(runHandoffCommand(["--rules"], cap2.io)).toBe(10);
    expect(cap2.errText()).toContain("--rules");
  });

  it("recognized flags (--help) pass the flag check without usage error", () => {
    const cap = capture();
    // --help is in KNOWN_FLAGS: the flag-check loop skips it; the
    // missing-report arm then reports exit 10 with its own message.
    expect(runHandoffCommand(["--help"], cap.io)).toBe(10);
    expect(cap.errText()).toContain("report file not found");
  });

  it("--rules splits on commas and ignores empty segments", () => {
    const p = reportJson([
      finding({ ruleId: "QA-A-001" }),
      finding({ ruleId: "QA-B-002", severity: "warning" }),
    ]);
    const cap = capture();
    expect(runHandoffCommand([p, "--rules", "QA-A-001,"], cap.io)).toBe(0);
    expect(cap.text()).toContain("QA-A-001");
    expect(cap.text()).not.toContain("### QA-B-002");
  });

  it("default io renders the artifact via console fallback", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const p = reportJson([finding()]);
      expect(runHandoffCommand([p])).toBe(0);
    } finally {
      logSpy.mockRestore();
    }
  });

  it("a finding at an index the sorter sees as empty (defensive) still sorts", () => {
    // Zero-length groups are filtered before the sort; this test pins
    // that no empty group can reach the renderer.
    const md = renderHandoff(report({ findings: [finding()] }));
    expect(md).not.toContain("× 0");
  });

  it("size sort: larger group of the same severity sorts first", () => {
    const f = (ruleId: string, file: string): Finding =>
      finding({ ruleId, file });
    const md = renderHandoff(
      report({
        findings: [
          f("QA-A-001", "e2e/a1.spec.ts"),
          f("QA-A-001", "e2e/a2.spec.ts"),
          f("QA-B-002", "e2e/b1.spec.ts"),
        ],
      }),
    );
    const a = md.indexOf("### QA-A-001");
    const b = md.indexOf("### QA-B-002");
    expect(a).toBeLessThan(b);
  });

  it("unknown flag → friendly usage error (exit 10)", () => {
    const cap = capture();
    expect(runHandoffCommand(["--nope"], cap.io)).toBe(10);
    expect(cap.errText()).toContain('unknown flag "--nope"');
  });

  it("default io renders via console.error fallback for the stderr stream", () => {
    // --category as the last token hits the usage-error arm of the
    // default-io path (console.error fallback, exit 10).
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(runHandoffCommand(["--category"])).toBe(10);
    } finally {
      errSpy.mockRestore();
    }
  });
});

describe("changed.ts — computeStagedFiles degraded arm", () => {
  it("git failure (corrupted repo) degrades to null, never throws", () => {
    // A .git DIRECTORY that is not a real repo makes `git diff` fail
    // inside computeStagedFiles — the function returns null instead.
    const broken = mkdtempSync(join(tmpdir(), "mjolnir-broken-git-"));
    mkdirSync(join(broken, ".git", "objects"), { recursive: true });
    try {
      expect(computeStagedFiles(broken)).toBeNull();
    } finally {
      rmSync(broken, { recursive: true, force: true });
    }
  });

  it("a real repo without staged files returns an empty list", () => {
    execFileSync("git", ["-C", dir, "init"], { stdio: "ignore" });
    expect(computeStagedFiles(dir)).toEqual([]);
  });

  it("staged non-test files exercise the intersection-filter skip arm", async () => {
    const { runScanCommand } = await import("../../src/cli.js");
    execFileSync("git", ["-C", dir, "init"], { stdio: "ignore" });
    writeFileSync(join(dir, "vitest.config.ts"), "export default {};\n");
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ name: "fixture", private: true }),
    );
    writeFileSync(
      join(dir, "a.spec.ts"),
      [
        `import { test, expect } from "vitest";`,
        ``,
        `test("ok", () => {`,
        `  expect(1).toBe(1);`,
        `});`,
      ].join("\n"),
    );
    // Stage only the README: discovery yields a.spec.ts (unstaged), so
    // the filter arm skips every discovered file.
    writeFileSync(join(dir, "README.md"), "x");
    execFileSync("git", ["-C", dir, "add", "README.md"], { stdio: "ignore" });
    const cap = capture();
    const code = await runScanCommand([dir, "--json", "--staged"], cap.io);
    expect(code).toBe(0);
    expect(cap.errText()).toContain("no staged files match");
  });
});
