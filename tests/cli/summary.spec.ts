/**
 * `mjolnir summary` — CI annotations + step summary (plan M4).
 *
 * Contract pins: ONE annotation emitter (github.ts), annotations only
 * under GITHUB_ACTIONS, step summary to $GITHUB_STEP_SUMMARY (or stdout
 * with --stdout), exit 0 never blocks the gate, 10 missing file, 2
 * invalid JSON. Escaping is property-tested (fast-check) including the
 * ANSI-injection guard.
 */

import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  runSummaryCommand,
  renderStepSummary,
  annotationForFinding,
} from "../../src/commands/summary.js";
import {
  escapeAnnotationMessage,
  escapeAnnotationProperty,
  renderAnnotation,
  truncateMessage,
  stripAnsiForSummary,
} from "../../src/reporter/github.js";
import type { Finding, ScanResult } from "../../src/types.js";
import type { Output } from "../../src/cli.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-summary-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const savedEnv = new Map<string, string | undefined>();
afterEach(() => {
  for (const [k, v] of savedEnv) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  savedEnv.clear();
});
function withEnv(key: string, value: string | undefined): void {
  savedEnv.set(key, process.env[key]);
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

function finding(over: Partial<Finding> = {}): Finding {
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

function report(over: Partial<ScanResult> = {}): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 72,
    frameworks: ["vitest"],
    frameworkDetectionUnknown: false,
    dimensions: [
      { category: "QA-TEST", score: 70, errors: 1, warnings: 0, infos: 0 },
    ],
    findings: [finding()],
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 5,
    },
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

function writeReport(over: Partial<ScanResult> = {}): string {
  const p = join(dir, "report.json");
  writeFileSync(p, JSON.stringify(report(over)));
  return p;
}

describe("annotation escaping (workflow-command spec)", () => {
  it("property: properties escape % CR LF : ,", () => {
    const special = ",:%\r\nabc";
    const escaped = escapeAnnotationProperty(special);
    expect(escaped).toBe("%2C%3A%25%0D%0Aabc");
  });

  it("property: messages escape % CR LF but keep : and ,", () => {
    const escaped = escapeAnnotationMessage("a:b,c%d\re\n");
    expect(escaped).toBe("a:b,c%25d%0De%0A");
  });

  it("property (fast-check): escaped property never contains raw , : \\r \\n", () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 200 }).filter((s) => !s.includes("%25")),
        (s) => {
          const out = escapeAnnotationProperty(s);
          expect(out).not.toContain(",");
          expect(out).not.toContain(":");
          expect(out).not.toMatch(/[\r\n]/);
          // Round-trip: every special char became its %XX form.
          const decoded = out
            .replaceAll("%2C", ",")
            .replaceAll("%3A", ":")
            .replaceAll("%0D", "\r")
            .replaceAll("%0A", "\n")
            .replaceAll("%25", "%");
          expect(decoded).toBe(s);
        },
      ),
    );
  });

  it("property (fast-check): annotation line structure holds for hostile input", () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 100 }),
        fc.string({ maxLength: 100 }),
        (file, message) => {
          const line = renderAnnotation({
            severity: "error",
            file: `a/${file}`,
            line: 1,
            title: "QA-X-001",
            message,
          });
          expect(line.startsWith("::error file=")).toBe(true);
          expect(line).toContain("title=QA-X-001");
          // The un-escaped payload never breaks the command envelope.
          const payload = line.slice(line.indexOf("::", 3) + 2);
          expect(payload).not.toContain("\r");
          expect(payload).not.toContain("\n");
        },
      ),
    );
  });

  it("ANSI escapes are stripped from messages before annotation/summary", () => {
    expect(stripAnsiForSummary("bad \x1b[31mred\x1b[0m")).toBe("bad red");
    const line = annotationForFinding(
      finding({ message: "\x1b[2Jclear\x1b[0Amessages" }),
    );
    expect(line).not.toContain("\x1b");
  });

  it("message truncation keeps the pointer to the step summary", () => {
    const long = "x".repeat(400);
    const t = truncateMessage(long);
    expect(t.length).toBeLessThan(long.length);
    expect(t).toContain("full text in the step summary");
    expect(truncateMessage("short")).toBe("short");
  });

  it("severity maps error/warning → error/warning, info → notice", () => {
    expect(
      renderAnnotation({
        severity: "error",
        file: "a",
        title: "T",
        message: "m",
      }),
    ).toContain("::error ");
    expect(
      renderAnnotation({
        severity: "warning",
        file: "a",
        title: "T",
        message: "m",
      }),
    ).toContain("::warning ");
    expect(
      renderAnnotation({
        severity: "info",
        file: "a",
        title: "T",
        message: "m",
      }),
    ).toContain("::notice ");
  });
});

describe("runSummaryCommand exit codes", () => {
  it("exit 10 when the report file is missing, with the exact scan command", () => {
    const cap = capture();
    const code = runSummaryCommand([join(dir, "nope.json")], cap.io);
    expect(code).toBe(10);
    expect(cap.errText()).toContain("not found");
    expect(cap.errText()).toContain("mjolnir --json");
  });

  it("defaults to mjolnir.json when no positional given", () => {
    const cap = capture();
    const code = runSummaryCommand([], cap.io);
    expect(code).toBe(10);
    expect(cap.errText()).toContain("mjolnir.json");
  });

  it("exit 2 on invalid JSON — a data problem, not a crash", () => {
    const p = join(dir, "bad.json");
    writeFileSync(p, "{ not json");
    const cap = capture();
    expect(runSummaryCommand([p], cap.io)).toBe(2);
    expect(cap.errText()).toContain("not valid JSON");
  });

  it("exit 2 on a foreign JSON object (wrong schemaVersion)", () => {
    const p = join(dir, "foreign.json");
    writeFileSync(p, JSON.stringify({ schemaVersion: 99, findings: [] }));
    const cap = capture();
    expect(runSummaryCommand([p], cap.io)).toBe(2);
    expect(cap.errText()).toContain("schemaVersion");
  });

  it("exit 2 on valid JSON that is not a Mjölnir report (no findings array)", () => {
    const p = join(dir, "other.json");
    writeFileSync(p, JSON.stringify({ hello: 1 }));
    expect(runSummaryCommand([p], capture().io)).toBe(2);
  });

  it("exit 0 on success — the command NEVER blocks the gate", () => {
    withEnv("GITHUB_ACTIONS", undefined);
    const p = writeReport();
    const cap = capture();
    expect(runSummaryCommand([p], cap.io)).toBe(0);
    expect(cap.text()).toContain("Verification Trust");
  });
});

describe("annotation emission (GitHub Actions only)", () => {
  it("no annotations outside GITHUB_ACTIONS — summary only", () => {
    withEnv("GITHUB_ACTIONS", undefined);
    const p = writeReport();
    const cap = capture();
    runSummaryCommand([p, "--stdout"], cap.io);
    expect(cap.text()).not.toContain("::error");
  });

  it("one annotation per finding inside GITHUB_ACTIONS", () => {
    withEnv("GITHUB_ACTIONS", "true");
    withEnv("GITHUB_STEP_SUMMARY", undefined);
    const p = writeReport({
      findings: [finding(), finding({ severity: "warning", line: 9 })],
    });
    const cap = capture();
    runSummaryCommand([p], cap.io);
    const out = cap.text();
    expect(out).toContain(
      "::error file=e2e/a.spec.ts,line=3,column=1,title=QA-TEST-001::msg",
    );
    expect(out).toContain(
      "::warning file=e2e/a.spec.ts,line=9,column=1,title=QA-TEST-001::msg",
    );
  });

  it("--path-prefix re-scopes annotation + summary paths", () => {
    withEnv("GITHUB_ACTIONS", "true");
    withEnv("GITHUB_STEP_SUMMARY", undefined);
    const p = writeReport();
    const cap = capture();
    runSummaryCommand([p, "--path-prefix", "packages/app"], cap.io);
    expect(cap.text()).toContain("file=packages/app/e2e/a.spec.ts");
  });
});

describe("step summary", () => {
  it("writes to $GITHUB_STEP_SUMMARY when set", () => {
    withEnv("GITHUB_ACTIONS", "true");
    const summaryPath = join(dir, "step-summary.md");
    withEnv("GITHUB_STEP_SUMMARY", summaryPath);
    const p = writeReport();
    const cap = capture();
    expect(runSummaryCommand([p], cap.io)).toBe(0);
    expect(existsSync(summaryPath)).toBe(true);
    const md = readFileSync(summaryPath, "utf8");
    expect(md).toContain("Score: **72/100**");
  });

  it("--stdout forces stdout even when $GITHUB_STEP_SUMMARY is set", () => {
    withEnv("GITHUB_ACTIONS", "true");
    withEnv("GITHUB_STEP_SUMMARY", join(dir, "never.md"));
    const p = writeReport();
    const cap = capture();
    runSummaryCommand([p, "--stdout"], cap.io);
    expect(cap.text()).toContain("Score: **72/100**");
    expect(existsSync(join(dir, "never.md"))).toBe(false);
  });

  it("score:null reports the honest no-tests state, never a fake 0", () => {
    const md = renderStepSummary(
      report({
        score: null,
        reason: "no-tests-found",
        findings: [],
        dimensions: [],
      }),
    );
    expect(md).toContain("not measurable");
    expect(md).toContain("no-tests-found");
    expect(md).toContain("No fake numbers");
    expect(md).not.toMatch(/0\/100/);
  });

  it("errors are open, warnings/info collapsed, each finding carries Fix", () => {
    const md = renderStepSummary(
      report({
        findings: [
          finding(),
          finding({ severity: "warning", ruleId: "QA-PW-118", line: 5 }),
        ],
      }),
    );
    expect(md).toContain("<details open>");
    expect(md).toContain("<summary>🔴 1 error</summary>");
    expect(md).toContain("<summary>🟡 1 warning</summary>");
    expect(md).toContain("- Fix: fix it");
    expect(md).not.toContain("<details open>🟡");
  });

  it("renders the dimensions table and the text score bar", () => {
    const md = renderStepSummary(report());
    expect(md).toContain("| Category | Score |");
    expect(md).toContain("| QA-TEST | 70/100 |");
    expect(md).toMatch(/█+░+/);
  });

  it("marks partial scans honestly", () => {
    const md = renderStepSummary(
      report({
        partial: true,
        analysisStatus: {
          discovery: "partial",
          rules: "partial",
          skippedFiles: 2,
          durationMs: 5,
        },
      }),
    );
    expect(md).toContain("Partial scan");
  });
});
