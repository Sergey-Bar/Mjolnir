/**
 * Agent-handoff plan M2 — `mjolnir why <file>:<line>`.
 *
 * Contracts (plan §9.2, §12): informational evidence/explanation query,
 * NOT a gate — works regardless of verdict/tier, exact file+line
 * matching, evidence tags + measured FP + corroboration + suppression
 * guidance, saved-report mode authoritative, live mode default, exit
 * 0 match / 1 no match / 10 usage / 2 invalid report.
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  explainAt,
  parseFileLine,
  renderWhy,
  runWhyCommand,
} from "../../src/commands/why.js";
import type { Finding } from "../../src/types.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-why-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function finding(over: Partial<Finding> = {}): Finding {
  return {
    ruleId: "QA-TEST-001",
    category: "QA-TEST",
    severity: "error",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "FALSE-GREEN",
    file: "e2e/a.spec.ts",
    line: 3,
    column: 1,
    message: "`.only` focus modifier committed.",
    why: "Only the focused subset executes; the rest of the suite is silently skipped in CI.",
    fix: "Remove `.only` before committing.",
    ...over,
  };
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

// The why command's Output type lives in cli.ts; importing it as a type
// here mirrors the command's own import.
import type { Output } from "../../src/cli.js";

describe("parseFileLine", () => {
  it("splits at the LAST colon (windows-style drive paths stay intact)", () => {
    expect(parseFileLine("e2e/a.spec.ts:42")).toEqual({
      file: "e2e/a.spec.ts",
      line: 42,
    });
    expect(parseFileLine("C:\\x\\a.spec.ts:7")).toEqual({
      file: "C:\\x\\a.spec.ts",
      line: 7,
    });
  });

  it("rejects malformed tokens", () => {
    expect(parseFileLine("no-colon")).toBeNull();
    expect(parseFileLine("file:notanumber")).toBeNull();
    expect(parseFileLine("file:0")).toBeNull();
    expect(parseFileLine(":5")).toBeNull();
  });
});

describe("explainAt (exact matching)", () => {
  const findings = [
    finding(),
    finding({ ruleId: "QA-PW-118", severity: "warning", line: 3 }),
    finding({ file: "other.spec.ts", line: 3 }),
    finding({ line: 4 }),
  ];

  it("matches exact file + exact line, collecting multiple findings", () => {
    const m = explainAt(findings, "e2e/a.spec.ts", 3);
    expect(m.findings).toHaveLength(2);
    expect(m.file).toBe("e2e/a.spec.ts");
  });

  it("does not match a different file at the same line", () => {
    expect(explainAt(findings, "other.spec.ts", 3).findings).toHaveLength(1);
  });

  it("does not match the same file at a different line", () => {
    expect(explainAt(findings, "e2e/a.spec.ts", 4).findings).toHaveLength(1);
    expect(explainAt(findings, "e2e/a.spec.ts", 99).findings).toHaveLength(0);
  });

  it("normalizes backslash paths to forward slashes", () => {
    expect(explainAt(findings, "e2e\\a.spec.ts", 3).findings).toHaveLength(2);
  });
});

describe("renderWhy", () => {
  it("renders rule, message, why, fix for a match", () => {
    const text = renderWhy(explainAt([finding()], "e2e/a.spec.ts", 3));
    expect(text).toContain("WHY — e2e/a.spec.ts:3");
    expect(text).toContain("QA-TEST-001");
    expect(text).toContain("focus modifier committed.");
    expect(text).toContain("Why it matters:");
    expect(text).toContain("Fix: Remove \\`.only\\` before committing.");
  });

  it("renders multiple findings at one location", () => {
    const text = renderWhy(
      explainAt(
        [finding(), finding({ ruleId: "QA-PW-118" })],
        "e2e/a.spec.ts",
        3,
      ),
    );
    expect(text).toContain("2 findings at this location");
    expect(text).toContain("QA-PW-118");
  });

  it("shows measured FP rate when present and honesty when absent", () => {
    const withFp = renderWhy(
      explainAt(
        [finding({ measuredFpRate: 0.12, measuredFpN: 43 })],
        "e2e/a.spec.ts",
        3,
      ),
    );
    expect(withFp).toContain(
      "Measured FP rate: 12% over 43 classified verdicts",
    );
    const withoutFp = renderWhy(explainAt([finding()], "e2e/a.spec.ts", 3));
    expect(withoutFp).toContain("ships on assumption");
  });

  it("renders runtime corroboration when present, never fabricates it", () => {
    const corroborated = renderWhy(
      explainAt(
        [
          finding({
            runtimeCorroboration: {
              level: "test",
              source: "playwright-json",
              testsExecuted: 12,
            },
          }),
        ],
        "e2e/a.spec.ts",
        3,
      ),
    );
    expect(corroborated).toContain(
      "the containing test executed in the run report (playwright-json)",
    );
    const plain = renderWhy(explainAt([finding()], "e2e/a.spec.ts", 3));
    expect(plain).not.toContain("Runtime corroboration:");
  });

  it("carries the suppression guidance (reason required, 90-day expiry)", () => {
    const text = renderWhy(explainAt([finding()], "e2e/a.spec.ts", 3));
    expect(text).toContain("reason REQUIRED");
    expect(text).toContain("90 days");
  });

  it("escapes hostile metadata (markdown + no injection)", () => {
    const hostile = finding({
      ruleId: "QA-EVIL|001",
      message: "msg with </details> and `backticks`",
      why: "why <script>alert(1)</script>",
      fix: "fix | it",
    });
    const text = renderWhy(explainAt([hostile], "e2e/a.spec.ts", 3));
    // escapeMarkdown backslash-escapes ` | < > — nothing parses, nothing executes.
    expect(text).toContain("QA-EVIL\\|001");
    expect(text).toContain("\\`backticks\\`");
    expect(text).toContain(
      "Why it matters: why \\<script\\>alert\\(1\\)\\</script\\>",
    );
    expect(text).toContain("Fix: fix \\| it");
    expect(text).not.toContain("<script>");
  });

  it("renders the honest no-match state with a pointer to re-scanning", () => {
    const text = renderWhy(explainAt([], "e2e/a.spec.ts", 3));
    expect(text).toContain("No finding at e2e/a.spec.ts:3");
    expect(text).toContain("re-run mjolnir to refresh locations");
  });
});

describe("runWhyCommand — saved-report mode (authoritative)", () => {
  it("matches a finding in the saved report and exits 0", async () => {
    const report = join(dir, "mjolnir.json");
    writeFileSync(
      report,
      JSON.stringify({
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
      }),
    );
    const cap = capture();
    const code = await runWhyCommand(
      ["e2e/a.spec.ts:3", "--json", report],
      cap.io,
    );
    expect(code).toBe(0);
    expect(cap.text()).toContain("QA-TEST-001");
  });

  it("exits 1 (not 10/20) when the location has no finding", async () => {
    const report = join(dir, "mjolnir.json");
    writeFileSync(
      report,
      JSON.stringify({
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
      }),
    );
    const cap = capture();
    expect(
      await runWhyCommand(["e2e/a.spec.ts:99", "--json", report], cap.io),
    ).toBe(1);
    expect(cap.text()).toContain("No finding at e2e/a.spec.ts:99");
  });

  it("exit 10 on a missing report file, with the exact scan command", async () => {
    const cap = capture();
    expect(
      await runWhyCommand(
        ["a.spec.ts:1", "--json", join(dir, "nope.json")],
        cap.io,
      ),
    ).toBe(10);
    expect(cap.errText()).toContain("not found");
    expect(cap.errText()).toContain("mjolnir --json");
  });

  it("exit 2 on invalid JSON — a data problem", async () => {
    const p = join(dir, "bad.json");
    writeFileSync(p, "{ not json");
    const cap = capture();
    expect(await runWhyCommand(["a.spec.ts:1", "--json", p], cap.io)).toBe(2);
    expect(cap.errText()).toContain("not valid JSON");
  });

  it("exit 10 on a malformed location token", async () => {
    const cap = capture();
    expect(await runWhyCommand(["no-colon", "--json", "x.json"], cap.io)).toBe(
      10,
    );
    expect(cap.errText()).toContain("expected <file>:<line>");
  });

  it("exit 10 with usage when no location is given", async () => {
    const cap = capture();
    expect(await runWhyCommand([], cap.io)).toBe(10);
    expect(cap.errText()).toContain("Usage: mjolnir why");
  });
});
