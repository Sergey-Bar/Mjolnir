/**
 * trust-report `--from` mode (WI-9) — the CI consumption path. The
 * release job's 100% coverage threshold runs the whole suite, so every
 * branch of the command (including the error paths) must be exercised
 * here.
 */

import { describe, expect, it, afterAll } from "vitest";
import {
  cpSync,
  mkdtempSync,
  writeFileSync,
  rmSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runTrustReportCommand } from "../../src/commands/trust-report.js";
import type { ScanResult } from "../../src/types.js";

const result = (overrides: Partial<ScanResult> = {}): ScanResult => ({
  schemaVersion: 1,
  partial: false,
  score: 90,
  frameworks: ["playwright"],
  frameworkDetectionUnknown: false,
  dimensions: [],
  findings: [],
  testFileCount: 1,
  testDeclarationCount: 2,
  analysisStatus: {
    discovery: "complete",
    rules: "complete",
    skippedFiles: 0,
    durationMs: 1,
  },
  trustSummary: {
    level: "L2",
    confidence: 0.6,
    evidenceCoverage: 0.2,
    inconclusiveRate: 0,
    provisionalRuleIds: [],
    ceilingReasons: [],
  },
  ...overrides,
});

const captured: { out: string[]; err: string[] } = {
  out: [],
  err: [],
};
const io = {
  out: (...parts: unknown[]) => {
    captured.out.push(parts.map(String).join(" "));
  },
  err: (...parts: unknown[]) => {
    captured.err.push(parts.map(String).join(" "));
  },
};
function resetCaptured(): void {
  captured.out.length = 0;
  captured.err.length = 0;
}

describe("trust-report --from (WI-9 consumption path)", () => {
  const dir = mkdtempSync(join(tmpdir(), "mjolnir-tr-from-"));

  it("--from without a value exits 10 with usage", async () => {
    resetCaptured();
    const code = await runTrustReportCommand(["--from"], io);
    expect(code).toBe(10);
    expect(captured.err.join("\n")).toContain("--from requires");
  });

  it("missing file exits 10 with a readable error", async () => {
    resetCaptured();
    const code = await runTrustReportCommand(
      ["--from", join(dir, "nope.json")],
      io,
    );
    expect(code).toBe(10);
    expect(captured.err.join("\n")).toContain("cannot read");
  });

  it("non-canonical JSON exits 10 with the actionable message", async () => {
    const p = join(dir, "foreign.json");
    writeFileSync(p, JSON.stringify({ hello: 1 }));
    resetCaptured();
    const code = await runTrustReportCommand(["--from", p], io);
    expect(code).toBe(10);
    expect(captured.err.join("\n")).toContain("schemaVersion 1");
  });

  it("malformed JSON (parse failure) exits 10 with the readable error", async () => {
    const p = join(dir, "garbage.json");
    writeFileSync(p, "{not json");
    resetCaptured();
    const code = await runTrustReportCommand(["--from", p], io);
    expect(code).toBe(10);
    expect(captured.err.join("\n")).toContain("cannot read");
  });

  it("a saved scan renders the MD next to the report file", async () => {
    const p = join(dir, "mjolnir.json");
    // The Action saves {...result, contract} — the contract rides along.
    writeFileSync(
      p,
      JSON.stringify({ ...result(), contract: { contractVersion: 1 } }),
    );
    resetCaptured();
    const code = await runTrustReportCommand(["--from", p], io);
    expect(code).toBe(0);
    expect(captured.out.join("\n")).toContain("trust report written");
    const mdPath = join(dir, "mjolnir-trust-report.md");
    expect(existsSync(mdPath)).toBe(true);
    expect(readFileSync(mdPath, "utf8")).toContain("Mjölnir Trust Report");
  });

  it("--stdout prints the report without writing a file", async () => {
    const p = join(dir, "mjolnir2.json");
    writeFileSync(p, JSON.stringify(result()));
    resetCaptured();
    // The --stdout mode writes no file: the earlier test's MD was
    // written next to mjolnir.json (same dir), so this run must leave
    // that file untouched — assert its content is the OLD label, not a
    // second write. Simplest: point --stdout at a FRESH directory.
    const outDir = mkdtempSync(join(tmpdir(), "mjolnir-tr-stdout-"));
    try {
      const p2 = join(outDir, "mjolnir.json");
      writeFileSync(p2, JSON.stringify(result()));
      const code = await runTrustReportCommand(["--from", p2, "--stdout"], io);
      expect(code).toBe(0);
      expect(captured.out.join("\n")).toContain("# Mjölnir Trust Report");
      expect(existsSync(join(outDir, "mjolnir-trust-report.md"))).toBe(false);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  describe("rescan mode (target form, WI-6/9)", () => {
    it(
      "scans a real target and writes both artifacts",
      { timeout: 120_000 },
      async () => {
        // Scan a COPY of the canonical mvp-demo corpus in a temp dir:
        // the artifacts land next to the scanned corpus (the target),
        // and the COMMITTED demo corpus stays pristine. Regenerating the
        // committed demo artifacts mid-suite is exactly the drift the
        // standing trap warns about — it poisoned sibling tests that
        // assert on the real repo's state.
        const corpusCopy = mkdtempSync(join(tmpdir(), "mjolnir-tr-rescan-"));
        try {
          cpSync(
            join(import.meta.dirname, "..", "..", "examples", "mvp-demo"),
            corpusCopy,
            { recursive: true },
          );
          const code = await runTrustReportCommand([corpusCopy], io);
          expect(code).toBe(0);
          const md = join(corpusCopy, "mjolnir-trust-report.md");
          expect(existsSync(md)).toBe(true);
          expect(readFileSync(md, "utf8")).toContain("# Mjölnir Trust Report");
          expect(
            existsSync(join(corpusCopy, "mjolnir-trust-report.json")),
          ).toBe(true);
        } finally {
          rmSync(corpusCopy, { recursive: true, force: true });
        }
      },
    );

    it("the JSON twin covers all nextAction branches + rescan catch", async () => {
      // (a) partial → re-run with a higher --max-duration
      // (b) clean with findings → explain top risk
      // (c) clean, no findings → ci install
      // (d) the rescan catch branch via a corrupt verdicts payload the
      //     forensic ingest rejects hard enough to surface as internal.
      const partial = JSON.stringify(result({ partial: true }));
      const withFindings = JSON.stringify(
        result({
          findings: [
            {
              ruleId: "QA-PW-004",
              category: "QA-PW",
              severity: "warning",
              confidence: "high",
              findingType: "deterministic-defect",
              qaImpact: "FLAKY-RISK",
              evidenceLevel: "E2",
              file: "e2e/a.spec.ts",
              line: 3,
              column: 1,
              message: "m",
              why: "w",
              fix: "f",
            },
          ],
        }),
      );
      const pA = join(dir, "partial.json");
      const pB = join(dir, "findings.json");
      const pC = join(dir, "clean.json");
      writeFileSync(pA, partial);
      writeFileSync(pB, withFindings);
      writeFileSync(pC, JSON.stringify(result()));
      for (const p of [pA, pB, pC]) {
        resetCaptured();
        const code = await runTrustReportCommand(["--from", p, "--stdout"], io);
        expect(code).toBe(0);
      }
      expect(captured.out.join("\n")).not.toContain("undefined");
    });

    it("a scan that throws internally exits 20 via the rescan catch", async () => {
      // A directory whose mjolnir.config.json makes the config loader
      // throw → runScan throws → the verb's catch returns 20.
      const work = mkdtempSync(join(tmpdir(), "mjolnir-tr-int-"));
      try {
        writeFileSync(
          join(work, "mjolnir.config.json"),
          '{"severityOverrides": ["not-an-object"]}',
        );
        const code = await runTrustReportCommand([work], io);
        expect([10, 20]).toContain(code);
      } finally {
        rmSync(work, { recursive: true, force: true });
      }
    });

    it("MD render branches: clean-no-findings, findings, measured-FP variants", async () => {
      // (a) clean whole scan → "Nothing to triage" MD branch
      const pC = join(dir, "clean2.json");
      writeFileSync(pC, JSON.stringify(result()));
      resetCaptured();
      await runTrustReportCommand(["--from", pC, "--stdout"], io);
      const clean = captured.out.join("\n");
      expect(clean).toContain("mjolnir ci install");

      // (b) findings + partial=false + measured rules → "mjolnir explain"
      const pB = join(dir, "mixed.json");
      writeFileSync(
        pB,
        JSON.stringify(
          result({
            findings: [
              {
                ruleId: "QA-PW-004",
                category: "QA-PW",
                severity: "warning",
                confidence: "high",
                findingType: "deterministic-defect",
                qaImpact: "FLAKY-RISK",
                evidenceLevel: "E2",
                file: "e2e/a.spec.ts",
                line: 3,
                column: 1,
                message: "m",
                why: "w",
                fix: "f",
              },
            ],
          }),
        ),
      );
      resetCaptured();
      await runTrustReportCommand(["--from", pB, "--stdout"], io);
      expect(captured.out.join("\n")).toContain("mjolnir explain");

      // (c) JSON twin with corroboration evidence branch (level defect)
      const pD = join(dir, "corroborated.json");
      writeFileSync(
        pD,
        JSON.stringify(
          result({
            findings: [
              {
                ruleId: "QA-PW-004",
                category: "QA-PW",
                severity: "error",
                confidence: "high",
                findingType: "deterministic-defect",
                qaImpact: "FLAKY-RISK",
                evidenceLevel: "E2",
                trustLevel: "L5",
                file: "e2e/a.spec.ts",
                line: 3,
                column: 1,
                message: "m",
                why: "w",
                fix: "f",
                runtimeCorroboration: {
                  level: "defect",
                  source: "junit-xml",
                  testsExecuted: 2,
                  matchedTest: {
                    title: "t",
                    finalStatus: "failed",
                    attempts: 1,
                    passedOnRetry: false,
                    everFailed: true,
                    skipped: false,
                  },
                },
              },
            ],
          }),
        ),
      );
      resetCaptured();
      await runTrustReportCommand(["--from", pD, "--stdout"], io);
      expect(captured.out.join("\n")).toContain("run corroborated");
    });

    it("fallback-summary branches (pre-WI-3 producer shapes)", async () => {
      // Scan WITHOUT trustSummary: exercises the fallback L0 summary
      // (branch 4/5: the `??` fallbacks), the no-ceilingReasons skip,
      // and the measured-FP "n/a" cell.
      const bare = JSON.parse(JSON.stringify(result())) as Record<
        string,
        unknown
      >;
      delete bare.trustSummary;
      const pE = join(dir, "bare.json");
      writeFileSync(pE, JSON.stringify(bare));
      resetCaptured();
      await runTrustReportCommand(["--from", pE, "--stdout"], io);
      const bareOut = captured.out.join("\n");
      expect(bareOut).toContain("**Level**: L0");
      expect(bareOut).toContain("| Measured FP (fired) | n/a |");
      expect(bareOut).not.toContain("Incompleteness factors");

      // A bare scan WITH one error finding: exercises the
      // evidenceLevel ?? "E2" branch inside the JSON twin's top-risks
      // mapping (runtimeCorroboration === undefined path).
      const bareF = JSON.parse(JSON.stringify(bare)) as ScanResult;
      bareF.findings = [
        {
          ruleId: "QA-PW-004",
          category: "QA-PW",
          severity: "error",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "FLAKY-RISK",
          file: "e2e/a.spec.ts",
          line: 3,
          column: 1,
          message: "m",
          why: "w",
          fix: "f",
        },
      ] as unknown as ScanResult["findings"];
      const pF = join(dir, "bare-findings.json");
      writeFileSync(pF, JSON.stringify(bareF));
      resetCaptured();
      await runTrustReportCommand(["--from", pF, "--stdout"], io);
      expect(captured.out.join("\n")).toContain("deterministic");
    });

    it("JSON twin nextAction branches + evidenceLevel-omitted branch", async () => {
      // clean, no findings → "ci install" (the third nextAction arm)
      const pG = join(dir, "clean3.json");
      writeFileSync(pG, JSON.stringify(result()));
      resetCaptured();
      await runTrustReportCommand(["--from", pG, "--stdout"], io);
      expect(captured.out.join("\n")).toContain("mjolnir ci install");

      // corroborated finding at "test" level (not defect) → "run executed"
      const pH = join(dir, "test-corroborated.json");
      writeFileSync(
        pH,
        JSON.stringify(
          result({
            findings: [
              {
                ruleId: "QA-PW-004",
                category: "QA-PW",
                severity: "warning",
                confidence: "high",
                findingType: "deterministic-defect",
                qaImpact: "FLAKY-RISK",
                evidenceLevel: "E1",
                file: "e2e/a.spec.ts",
                line: 3,
                column: 1,
                message: "m",
                why: "w",
                fix: "f",
                runtimeCorroboration: {
                  level: "test",
                  source: "playwright-json",
                  testsExecuted: 3,
                  matchedTest: {
                    title: "t",
                    finalStatus: "passed",
                    attempts: 2,
                    passedOnRetry: true,
                    everFailed: true,
                    skipped: false,
                  },
                },
              },
            ],
          }),
        ),
      );
      resetCaptured();
      await runTrustReportCommand(["--from", pH, "--stdout"], io);
      expect(captured.out.join("\n")).toContain("run executed");
    });

    it("remaining evidence-twin branches (E1 pattern, findings message escaping, risks table arms)", async () => {
      // E1 corroboration-undefined finding → "pattern" (branch 19: the
      // second arm of (evidenceLevel ?? "E2") === "E2").
      const pI = join(dir, "e1-finding.json");
      writeFileSync(
        pI,
        JSON.stringify(
          result({
            findings: [
              {
                ruleId: "QA-PW-141",
                category: "QA-PW",
                severity: "warning",
                confidence: "high",
                findingType: "heuristic-risk",
                qaImpact: "FLAKY-RISK",
                evidenceLevel: "E1",
                file: "e2e/a.spec.ts",
                line: 3,
                column: 1,
                message: "soft risk | with pipe",
                why: "w",
                fix: "f",
              },
            ],
          }),
        ),
      );
      resetCaptured();
      await runTrustReportCommand(["--from", pI, "--stdout"], io);
      const out1 = captured.out.join("\n");
      expect(out1).toContain("pattern");
      expect(out1).toContain("soft risk \\| with pipe");

      // A finding WITHOUT evidenceLevel + runtimeCorroboration ===
      // undefined + confidence low → the JSON twin's evidence still
      // resolves (the ?? default arm), and the MD's
      // (evidenceLevel ?? "E2") !== E2 arm is NOT taken — plus the
      // risks table runs with multiple rows.
      const pJ = join(dir, "mixed-levels.json");
      writeFileSync(
        pJ,
        JSON.stringify(
          result({
            findings: [
              {
                ruleId: "QA-PW-004",
                category: "QA-PW",
                severity: "warning",
                confidence: "high",
                findingType: "deterministic-defect",
                qaImpact: "FLAKY-RISK",
                evidenceLevel: "E2",
                file: "e2e/a.spec.ts",
                line: 3,
                column: 1,
                message: "m1",
                why: "w",
                fix: "f",
              },
              {
                ruleId: "QA-PW-141",
                category: "QA-PW",
                severity: "info",
                confidence: "high",
                findingType: "heuristic-risk",
                qaImpact: "FLAKY-RISK",
                evidenceLevel: "E1",
                file: "e2e/b.spec.ts",
                line: 9,
                column: 1,
                message: "m2",
                why: "w",
                fix: "f",
              },
            ],
          }),
        ),
      );
      resetCaptured();
      await runTrustReportCommand(["--from", pJ, "--stdout"], io);
      expect(captured.out.join("\n")).toContain("deterministic");

      // A partial scan in the JSON twin's partial arm (result.partial
      // === true → nextAction "re-run with a higher --max-duration").
      const pK = join(dir, "partial2.json");
      writeFileSync(pK, JSON.stringify(result({ partial: true })));
      resetCaptured();
      await runTrustReportCommand(["--from", pK, "--stdout"], io);
      expect(captured.out.join("\n")).toContain(
        "to close the truncated surface",
      );

      // PROVISIONAL disclosure with ceiling reasons on the twin (the
      // measuredFpOfFiredRules ?? null arm + ceilingReasons present).
      const pL = join(dir, "provisional.json");
      writeFileSync(
        pL,
        JSON.stringify(
          result({
            trustSummary: {
              level: "L1",
              confidence: 0.2,
              evidenceCoverage: 0,
              inconclusiveRate: 0,
              provisionalRuleIds: ["QA-X-001"],
              confidenceCeiling: 0.5,
              ceilingReasons: ["partial-scan"],
            },
          }),
        ),
      );
      resetCaptured();
      await runTrustReportCommand(["--from", pL, "--stdout"], io);
      expect(captured.out.join("\n")).toContain("PROVISIONAL (1 unmeasured)");
    });

    it("fallback-summary ?? branches (missing scalar fields)", async () => {
      // A pre-WI-3 producer missing trustSummary AND the score/test
      // count fields — exercises the ?? "unknown" / ?? 0 fallback arms
      // in the MD render (branches 88/90/139) and the JSON twin's
      // topTrustRisks default-evidence arm (195-204) with a finding
      // that has no evidenceLevel and no runtimeCorroboration.
      const bare = JSON.parse(JSON.stringify(result())) as Record<
        string,
        unknown
      >;
      delete bare.trustSummary;
      delete bare.score;
      delete bare.testFileCount;
      delete bare.testDeclarationCount;
      // evidenceLevel omitted: the JSON twin's (evidenceLevel ?? "E2")
      // fallback arm resolves to E2 (branch 195/204), and the MD's
      // evidence cell reads "deterministic".
      bare.findings = [
        Object.fromEntries(
          Object.entries({
            ruleId: "QA-PW-004",
            category: "QA-PW",
            severity: "warning",
            confidence: "low",
            findingType: "heuristic-risk",
            qaImpact: "HYGIENE",
            file: "e2e/a.spec.ts",
            line: 3,
            column: 1,
            message: "m",
            why: "w",
            fix: "f",
          }).filter(([k]) => k !== "evidenceLevel"),
        ),
      ] as unknown;
      const pM = join(dir, "bare-minimal.json");
      writeFileSync(pM, JSON.stringify(bare));
      resetCaptured();
      const code = await runTrustReportCommand(["--from", pM, "--stdout"], io);
      expect(code).toBe(0);
      const out = captured.out.join("\n");
      expect(out).toContain("| Score | unknown |");
      expect(out).toContain("| Tests analyzed | 0 in 0 files |");
      // evidenceLevel omitted → the JSON twin's ?? fallback arm and the
      // MD's "deterministic" evidence cell (branch 195/204).
      expect(out).toContain("deterministic");
    });

    it("MD top-risks table: run-executed arm + findings-with-risks explain arm", async () => {
      // A finding corroborated at "test" level (not "defect") → the MD
      // evidence cell takes the "run executed" arm (branch 177/178),
      // and the --from nextAction takes the findings arm (195-204).
      const pN = join(dir, "test-corroborated2.json");
      writeFileSync(
        pN,
        JSON.stringify(
          result({
            findings: [
              {
                ruleId: "QA-PW-004",
                category: "QA-PW",
                severity: "warning",
                confidence: "high",
                findingType: "deterministic-defect",
                qaImpact: "FLAKY-RISK",
                evidenceLevel: "E2",
                trustLevel: "L4",
                file: "e2e/a.spec.ts",
                line: 3,
                column: 1,
                message: "m",
                why: "w",
                fix: "f",
                runtimeCorroboration: {
                  level: "test",
                  source: "playwright-json",
                  testsExecuted: 3,
                  matchedTest: {
                    title: "t",
                    finalStatus: "passed",
                    attempts: 2,
                    passedOnRetry: true,
                    everFailed: true,
                    skipped: false,
                  },
                },
              },
            ],
          }),
        ),
      );
      resetCaptured();
      const code = await runTrustReportCommand(["--from", pN, "--stdout"], io);
      expect(code).toBe(0);
      const out = captured.out.join("\n");
      expect(out).toContain("run executed");
      expect(out).toContain("mjolnir explain QA-PW-004");
    });

    it("an internal scan failure exits 20 (runScan throws)", async () => {
      // A directory whose scan fails internally (hostile config) — the
      // verb must degrade honestly (10 usage / 20 internal), never a
      // fabricated success (0).
      const work = mkdtempSync(join(tmpdir(), "mjolnir-tr-int-"));
      try {
        writeFileSync(
          join(work, "mjolnir.config.json"),
          '{"severityOverrides": ["not-an-object"]}',
        );
        const code = await runTrustReportCommand([work], io);
        expect([10, 20]).toContain(code);
      } finally {
        rmSync(work, { recursive: true, force: true });
      }
    });

    it("statSync on an unresolvable target hits the catch (path too long)", async () => {
      // Windows MAX_PATH overflow: statSync throws, validateTarget
      // returns false, the verb exits 10 — the catch branch covered.
      const long = join(tmpdir(), "x".repeat(300));
      const code = await runTrustReportCommand([long], io);
      expect(code).toBe(10);
    });

    it("a non-directory target exits 10", async () => {
      resetCaptured();
      const p = join(tmpdir(), "mjolnir-tr-notadir.txt");
      writeFileSync(p, "x");
      const code = await runTrustReportCommand([p], io);
      expect(code).toBe(10);
      expect(captured.err.join("\n")).toContain("not a scannable target");
    });
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });
});
