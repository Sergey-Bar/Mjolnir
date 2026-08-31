/**
 * Registry-extension behaviors that no shipped rule can exercise: a rule
 * that crashes (crash isolation + --debug print + >50 truncation), a rule
 * that declares a weaker evidence level (override wins over derivation),
 * and a quarantine rule included only under --strict whose error-severity
 * finding still cannot gate the exit code.
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/rules/index.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/rules/index.js")>();
  const base = {
    category: "QA-TEST" as const,
    appliesTo: "test-files" as const,
    languages: ["typescript"],
    frameworks: ["vitest"],
    falsePositiveRisk: "low" as const,
  };
  const crashError = {
    ...base,
    id: "QA-TEST-950",
    title: "Crash (Error payload)",
    severity: "warning" as const,
    confidence: "high" as const,
    findingType: "deterministic-defect" as const,
    qaImpact: "HYGIENE" as const,
    run: () => {
      throw new Error("boom-err");
    },
  };
  const crashString = {
    ...base,
    id: "QA-TEST-951",
    title: "Crash (string payload)",
    severity: "warning" as const,
    confidence: "high" as const,
    findingType: "deterministic-defect" as const,
    qaImpact: "HYGIENE" as const,
    run: () => {
      const payload: unknown = "boom-str";
      throw payload;
    },
  };
  const downgradedEvidence = {
    ...base,
    id: "QA-TEST-952",
    title: "Evidence downgrade",
    // deterministic-defect/high would derive E2; the rule honestly claims
    // a weaker level and the override must win.
    evidenceLevel: "E0" as const,
    severity: "warning" as const,
    confidence: "high" as const,
    findingType: "deterministic-defect" as const,
    qaImpact: "HYGIENE" as const,
    run: (ctx: { path: string }) => [
      {
        severity: "error" as const,
        confidence: "high" as const,
        findingType: "deterministic-defect" as const,
        file: ctx.path,
        line: 1,
        column: 1,
        message: "evidence probe",
        why: "why",
        fix: "fix",
        qaImpact: "HYGIENE" as const,
      },
    ],
  };
  const quarantineError = {
    ...base,
    id: "QA-TEST-953",
    title: "Quarantine error probe",
    tier: "quarantine" as const,
    severity: "error" as const,
    confidence: "high" as const,
    findingType: "deterministic-defect" as const,
    qaImpact: "HYGIENE" as const,
    run: (ctx: { path: string }) => [
      {
        severity: "error" as const,
        confidence: "high" as const,
        findingType: "deterministic-defect" as const,
        file: ctx.path,
        line: 1,
        column: 1,
        message: "quarantine probe",
        why: "why",
        fix: "fix",
        qaImpact: "HYGIENE" as const,
      },
    ],
  };
  return {
    ...actual,
    RULES: [
      ...actual.RULES,
      crashError,
      crashString,
      downgradedEvidence,
      quarantineError,
    ],
    // getRule closes over the module-local RULES binding; the extended
    // registry must be visible to it too.
    getRule: (id: string) =>
      [crashError, crashString, downgradedEvidence, quarantineError].find(
        (r) => r.id === id,
      ) ?? actual.getRule(id),
  };
});

import { runScan, runScanCommand } from "../src/cli.js";
import { explainRule } from "../src/commands/explain.js";
import { mkdirSync } from "node:fs";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-cli-reg-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const CLEAN = "it('a', () => { expect(1 + 1).toBe(2); });\n";

function scanJson(extraArgs: string[] = []): {
  code: number;
  result: Record<string, unknown>;
  err: string[];
} {
  const out: string[] = [];
  const err: string[] = [];
  const code = runScanCommand([dir, "--json", ...extraArgs], {
    out: (...p: unknown[]) => out.push(p.map(String).join(" ")),
    err: (...p: unknown[]) => err.push(p.map(String).join(" ")),
  });
  return {
    code,
    result: JSON.parse(out.join("\n")) as Record<string, unknown>,
    err,
  };
}

describe("rule-crash isolation and --debug surfacing", () => {
  it("prints swallowed crashes for both payload shapes with --debug", () => {
    writeFileSync(join(dir, "a.spec.ts"), CLEAN);
    const { code, err } = scanJson(["--debug"]);
    expect(err.join("\n")).toContain("2 rule crash(es) were swallowed");
    expect(err.join("\n")).toContain(
      "QA-TEST-950 crashed on a.spec.ts: boom-err",
    );
    expect(err.join("\n")).toContain(
      "QA-TEST-951 crashed on a.spec.ts: boom-str",
    );
    expect(code).toBe(0);
  });

  it("truncates the crash list past 50 with an honest remainder line", () => {
    for (let i = 0; i < 60; i++) {
      writeFileSync(join(dir, `f${String(i).padStart(2, "0")}.spec.ts`), CLEAN);
    }
    const { err } = scanJson(["--debug"]);
    const text = err.join("\n");
    expect(text).toContain("120 rule crash(es) were swallowed");
    expect(text).toContain("… and 70 more");
  });

  it("counts crashes in analysisStatus and delivers them to runScan hooks", () => {
    writeFileSync(join(dir, "a.spec.ts"), CLEAN);
    const crashes: string[] = [];
    const result = runScan(
      {
        target: dir,
        json: true,
        verbose: false,
        maxDurationMs: Number.POSITIVE_INFINITY,
        scopeChanged: false,
        format: "json",
      },
      { onRuleCrash: (ruleId, file) => crashes.push(`${ruleId}@${file}`) },
    );
    expect(result.analysisStatus.rulesCrashed).toBe(2);
    expect(crashes).toEqual(["QA-TEST-950@a.spec.ts", "QA-TEST-951@a.spec.ts"]);
  });
});

describe("explain degradation on rule crash", () => {
  it("returns ok without an example when the rule throws on its fixture", () => {
    const fixturesRoot = join(dir, "tests", "fixtures");
    mkdirSync(join(fixturesRoot, "QA-TEST-950", "must-fire"), {
      recursive: true,
    });
    writeFileSync(
      join(fixturesRoot, "QA-TEST-950", "must-fire", "crash.spec.ts"),
      "it('a', () => { expect(1 + 1).toBe(2); });\n",
    );
    const result = explainRule("QA-TEST-950", fixturesRoot);
    expect(result.ok).toBe(true);
    expect(result.exampleFinding).toBeUndefined();
  });
});

describe("evidence-level override", () => {
  it("lets a rule honestly downgrade its evidence level", () => {
    writeFileSync(join(dir, "a.spec.ts"), CLEAN);
    const { result } = scanJson();
    const probe = (
      result as {
        findings: Array<{ ruleId: string; evidenceLevel: string }>;
      }
    ).findings.find((f) => f.ruleId === "QA-TEST-952");
    expect(probe).toBeDefined();
    expect(probe?.evidenceLevel).toBe("E0");
  });
});

describe("quarantine tier under --strict", () => {
  it("excludes the quarantine rule by default", () => {
    writeFileSync(join(dir, "a.spec.ts"), CLEAN);
    const { result } = scanJson();
    const findings = (result as { findings: Array<{ ruleId: string }> })
      .findings;
    expect(findings.map((f) => f.ruleId)).not.toContain("QA-TEST-953");
  });

  it("includes it with --strict but the finding still cannot gate CI", () => {
    writeFileSync(join(dir, "a.spec.ts"), CLEAN);
    const { code, result } = scanJson(["--strict"]);
    const probe = (
      result as {
        findings: Array<{
          ruleId: string;
          severity: string;
          evidenceLevel: string;
        }>;
      }
    ).findings.find((f) => f.ruleId === "QA-TEST-953");
    expect(probe).toBeDefined();
    expect(probe?.severity).toBe("info");
    expect(probe?.evidenceLevel).toBe("E0");
    // An error-declared quarantine finding must not produce exit 1.
    expect(code).toBe(0);
  });
});
