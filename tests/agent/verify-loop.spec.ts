/**
 * P7 agent loop (product-gap-remediation master plan, plan
 * 1788853205786 — flag agent, decision 6).
 *
 * Locks:
 *  - the digest derives from the SAME §15 comparison as `mjolnir diff`
 *    (no second truth): resolved carry lifecycle resolutions, only
 *    VERIFIED-RESOLVED is a fix claim;
 *  - unchanged debt groups by ruleId + location (the agent's working
 *    key — a reworded message at the same location is still debt);
 *  - score delta moves with the findings and states its direction;
 *  - the CLI verb honors the frozen exit contract: 0 clean, 1 new
 *    error findings, 2 partial scan or no baseline;
 *  - the MCP `verify` tool is 1:1 with the verb (same digest, same
 *    guardrails), and never masquerades a partial scan as clean.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  buildVerifyDigest,
  renderVerifyDigest,
} from "../../src/commands/verify.js";
import type { BaselineFile } from "../../src/commands/baseline.js";
import type { ScanResult } from "../../src/types.js";

const BASE: BaselineFile = {
  schemaVersion: 1,
  capturedAt: "2026-09-09T00:00:00.000Z",
  commit: "abc1234",
  score: 90,
  findings: [
    {
      ruleId: "QA-PW-101",
      file: "src/a.spec.ts",
      message: "hard sleep",
      severity: "warning",
    },
    {
      ruleId: "QA-PW-004",
      file: "src/b.spec.ts",
      message: "waitForTimeout() is a hard sleep",
      severity: "warning",
    },
  ],
};

function scan(over: Partial<ScanResult> = {}): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 95,
    frameworks: ["playwright"],
    frameworkDetectionUnknown: false,
    dimensions: [],
    findings: [
      {
        ruleId: "QA-PW-004",
        category: "QA-PW",
        severity: "warning",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "HYGIENE",
        file: "src/b.spec.ts",
        line: 4,
        column: 1,
        message: "waitForTimeout() is a hard sleep",
        why: "w",
        fix: "f",
        evidenceLevel: "E2",
      },
    ],
    testFileCount: 2,
    testDeclarationCount: 2,
    rawDeductions: 3,
    effectiveDeductions: 3,
    suppressionCount: 0,
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 0,
    },
    ...over,
  };
}

describe("buildVerifyDigest (P7)", () => {
  it("RESOLVED carries the §15 lifecycle resolution — not a fabricated fix claim", () => {
    // QA-PW-101 vanished; its disappearance must resolve via the ordered
    // algorithm (inconclusive here — no code-change evidence supplied).
    const d = buildVerifyDigest(scan(), BASE);
    expect(d.hasBaseline).toBe(true);
    const gone = d.resolved.find((r) => r.ruleId === "QA-PW-101");
    expect(gone).toBeDefined();
    expect(gone?.resolution.startsWith("INCONCLUSIVE")).toBe(true);
    // Never a fix claim without code-change evidence:
    expect(gone?.resolution.startsWith("VERIFIED-RESOLVED")).toBe(false);
    // The surviving finding is UNCHANGED (same ruleId+file+message).
    expect(d.unchangedCount).toBe(1);
    expect(d.new).toHaveLength(0);
  });

  it("unchanged debt groups by ruleId + location", () => {
    const d = buildVerifyDigest(scan(), BASE);
    expect(d.unchanged).toEqual([
      {
        ruleId: "QA-PW-004",
        locations: ["src/b.spec.ts:4"],
      },
    ]);
  });

  it("score delta moves with the findings and states its direction in the render", () => {
    const d = buildVerifyDigest(scan(), BASE);
    expect(d.scoreBefore).toBe(90);
    expect(d.scoreAfter).toBe(95);
    expect(d.scoreDelta).toBe(5);
    const out = renderVerifyDigest(d);
    expect(out).toContain("score: 90 → 95 (improved, Δ+5)");
  });

  it("a legacy baseline (no score) degrades to no delta — never fabricated", () => {
    const { score: _omitted, ...legacyBase } = BASE;
    const legacy: BaselineFile = legacyBase;
    const d = buildVerifyDigest(scan(), legacy);
    expect(d.scoreDelta).toBeNull();
    expect(renderVerifyDigest(d)).not.toContain("score:");
  });

  it("no baseline → hasBaseline false, honest no-baseline render", () => {
    const d = buildVerifyDigest(scan(), null);
    expect(d.hasBaseline).toBe(false);
    const out = renderVerifyDigest(d);
    expect(out).toContain("No committed baseline");
    expect(out).toContain("mjolnir baseline");
  });
});

describe("`mjolnir verify` verb (frozen exit contract)", () => {
  let dir: string;
  let origCwd: string;
  const run = (args: string[]): { code: number; out: string } => {
    try {
      const out = execFileSync(
        process.execPath,
        [
          join(import.meta.dirname, "..", "..", "dist", "cli.mjs"),
          "verify",
          ...args,
        ],
        { cwd: dir, encoding: "utf8" },
      );
      return { code: 0, out };
    } catch (e) {
      return {
        code: (e as { status: number }).status,
        out: (e as { stdout: string }).stdout,
      };
    }
  };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "mjolnir-p7-verify-"));
    origCwd = process.cwd();
    process.chdir(dir);
  });

  afterEach(() => {
    process.chdir(origCwd);
    rmSync(dir, { recursive: true, force: true });
  });

  it("no baseline → exit 2, honest message", { timeout: 120_000 }, () => {
    writeFileSync(
      join(dir, "x.spec.ts"),
      "test('y', () => { expect(1).toBe(1); });\n",
    );
    const { code, out } = run(["."]);
    expect(code).toBe(2);
    expect(out).toContain("No committed baseline");
  });

  it(
    "clean verification with a baseline → exit 0, digest rendered",
    { timeout: 120_000 },
    () => {
      // Clean spec (no findings), baseline empty.
      mkdirSync(join(dir, ".mjolnir"), { recursive: true });
      writeFileSync(
        join(dir, "ok.spec.ts"),
        "test('y', () => { expect(1).toBe(1); });\n",
      );
      writeFileSync(
        join(dir, ".mjolnir", "baseline.json"),
        JSON.stringify({
          schemaVersion: 1,
          capturedAt: "2026-09-09T00:00:00.000Z",
          commit: "abc1234",
          score: 100,
          findings: [],
        }),
      );
      const { code, out } = run(["."]);
      expect(code).toBe(0);
      expect(out).toContain("VERIFY — before/after digest");
      expect(out).toContain("0 resolved · 0 new · 0 unchanged");
    },
  );

  it(
    "a new ERROR finding vs the baseline → exit 1",
    { timeout: 120_000 },
    () => {
      mkdirSync(join(dir, ".mjolnir"), { recursive: true });
      // QA-PW-101 is core error-tier — fires without --strict.
      writeFileSync(
        join(dir, "bad.spec.ts"),
        "test('z', () => { page.waitForTimeout(500); });\n",
      );
      writeFileSync(
        join(dir, ".mjolnir", "baseline.json"),
        JSON.stringify({
          schemaVersion: 1,
          capturedAt: "2026-09-09T00:00:00.000Z",
          commit: "abc1234",
          score: 100,
          findings: [],
        }),
      );
      const { code, out } = run(["."]);
      // QA-PW-101 is ERROR tier in a new file → the new finding fails the
      // verb (exit 1) — the digest still renders in full.
      expect(code).toBe(1);
      expect(out).toContain(
        "NEW (introduced by the change under verification)",
      );
    },
  );

  it(
    "the digest distinguishes RESOLVED from UNCHANGED on a mixed baseline",
    { timeout: 120_000 },
    () => {
      // The baseline carries TWO entries: one that still fires exactly
      // (UNCHANGED — same ruleId+file+message fingerprint) and one that
      // no longer fires (RESOLVED via the §15 lifecycle).
      mkdirSync(join(dir, ".mjolnir"), { recursive: true });
      writeFileSync(
        join(dir, "hard.spec.ts"),
        "test('y', () => { page.waitForTimeout(100); });\n",
      );
      writeFileSync(
        join(dir, ".mjolnir", "baseline.json"),
        JSON.stringify({
          schemaVersion: 1,
          capturedAt: "2026-09-09T00:00:00.000Z",
          commit: "abc1234",
          score: 85,
          findings: [
            {
              ruleId: "QA-PW-101",
              file: "hard.spec.ts",
              message: "`waitForTimeout()` hard sleep.",
              severity: "warning",
            },
            {
              ruleId: "QA-PW-003",
              file: "gone.spec.ts",
              message: "bare goto drift",
              severity: "warning",
            },
          ],
        }),
      );
      const { code, out } = run(["."]);
      // The hard.spec.ts QA-PW-101 is UNCHANGED (same fingerprint) → not
      // new → exit 0. gone.spec.ts's entry resolves (INCONCLUSIVE — no
      // code-change evidence) — never a fabricated fix claim.
      expect(code).toBe(0);
      expect(out).toContain("RESOLVED (per §15 lifecycle");
      expect(out).toContain("QA-PW-003 gone.spec.ts —");
      expect(out).toContain("UNCHANGED (pre-existing debt");
      expect(out).toContain("QA-PW-101 × 1");
      expect(out).toContain("hard.spec.ts:1");
    },
  );
});
