import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { main, type Output } from "../../src/cli.js";
import { buildMachineContract } from "../../src/engine/machine-contract.js";
import { runScan } from "../../src/engine/scan-pipeline.js";
import {
  runCIIntegrityCommand,
  runContractVerifyCommand,
  runCrossFileCommand,
  runEvidenceGraphCommand,
  runFrameworkMaturityCommand,
  runSuppressionGateCommand,
  runTrustTrendCommand,
} from "../../src/commands/milestone.js";

function capture() {
  let stdout = "";
  let stderr = "";
  return {
    io: {
      out: ((value: string) => (stdout += `${value}\n`)) as Output,
      err: ((...parts: string[]) =>
        (stderr += `${parts.join(" ")}\n`)) as Output,
    },
    stdout: () => stdout,
    stderr: () => stderr,
  };
}

function createRepo(): string {
  const root = mkdtempSync(join(tmpdir(), "mjolnir-milestone-cli-"));
  writeFileSync(
    join(root, "sample.spec.ts"),
    "test('sample', () => { expect(true).toBe(true); });\n",
  );
  return root;
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function parseOutput(cap: ReturnType<typeof capture>): unknown {
  return JSON.parse(cap.stdout());
}

describe("milestone CLI commands", () => {
  it("runs framework maturity without pretending human calibration is automated", async () => {
    const cap = capture();
    const code = await main(
      ["framework-maturity", "--framework", "playwright", "--json"],
      cap.io,
    );

    expect(code).toBe(0);
    expect(parseOutput(cap)).toMatchObject({
      calibrationAuthority: "human",
      automatedClosureAllowed: false,
      frameworks: [{ frameworkId: "playwright", targetMaturity: "F5" }],
    });

    const all = capture();
    expect(await main(["framework-maturity", "--json"], all.io)).toBe(0);
    expect(
      (parseOutput(all) as { frameworks: unknown[] }).frameworks.length,
    ).toBeGreaterThan(1);
    const terminal = capture();
    expect(
      await main(["framework-maturity", "--format", "terminal"], terminal.io),
    ).toBe(0);
    expect(terminal.stdout()).toContain("Calibration authority: human");
  });

  it("gates suppressions using matched findings from a complete scan", async () => {
    const root = createRepo();
    try {
      const cap = capture();
      const code = await main(["suppression-gate", root, "--json"], cap.io);

      expect(code).toBe(0);
      expect(parseOutput(cap)).toMatchObject({
        passed: true,
        totalSuppressions: 0,
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("detects matched suppressions before scan filtering", async () => {
    const root = createRepo();
    try {
      mkdirSync(join(root, "e2e"));
      writeFileSync(
        join(root, "e2e", "a.spec.ts"),
        [
          "import { test, expect } from '@playwright/test';",
          "test('one', async ({ page }) => {",
          "  await page.waitForTimeout(500);",
          "  await expect(page).toHaveURL('/a');",
          "});",
        ].join("\n"),
      );
      writeFileSync(
        join(root, "mjolnir.config.json"),
        JSON.stringify({
          ignore: [
            {
              ruleId: "QA-PW-101",
              files: ["e2e/**"],
              reason: "known flake",
              expires: "2099-01-01",
            },
          ],
        }),
      );
      const cap = capture();
      const code = await main(["suppression-gate", root, "--json"], cap.io);
      const report = parseOutput(cap) as {
        totalSuppressions: number;
        massSuppression: {
          suppressedCount: number;
          totalFindings: number;
        };
      };
      expect(code).toBe(0);
      expect(report.totalSuppressions).toBe(1);
      expect(report.massSuppression.suppressedCount).toBe(1);
      expect(report.massSuppression.totalFindings).toBeGreaterThan(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("returns findings when cross-file signals are detected", async () => {
    const root = createRepo();
    try {
      writeFileSync(
        join(root, "other.spec.ts"),
        'import "./sample.spec";\ntest("other", () => {});\n',
      );
      writeFileSync(
        join(root, "sample.spec.ts"),
        'import "./other.spec";\ntest("sample", () => {});\n',
      );
      const cap = capture();
      const code = await main(["cross-file", root, "--json"], cap.io);

      expect(code, cap.stdout()).toBe(1);
      const analysis = parseOutput(cap) as { signals?: unknown };
      if (!isUnknownArray(analysis.signals)) {
        throw new Error("expected cross-file signals");
      }
      expect(
        analysis.signals.some(
          (signal) =>
            typeof signal === "object" &&
            signal !== null &&
            "type" in signal &&
            signal.type === "circular-dep",
        ),
      ).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("verifies a persisted scan contract and rejects a corrupted digest", async () => {
    const root = createRepo();
    try {
      const result = await runScan({
        target: root,
        json: false,
        verbose: false,
        maxDurationMs: Number.POSITIVE_INFINITY,
        scopeChanged: false,
        format: "terminal",
      });
      const contractPath = join(root, "scan.json");
      const document = { ...result, contract: buildMachineContract(result) };
      writeFileSync(contractPath, JSON.stringify(document));

      const valid = capture();
      expect(
        await main(
          ["contract-verify", root, "--contract", contractPath, "--json"],
          valid.io,
        ),
      ).toBe(0);
      expect(parseOutput(valid)).toMatchObject({ passed: true });

      document.contract.summary.digest = "sha256:corrupted";
      writeFileSync(contractPath, JSON.stringify(document));
      const corrupted = capture();
      expect(
        await main(
          ["contract-verify", root, "--contract", contractPath, "--json"],
          corrupted.io,
        ),
      ).toBe(1);
      expect(parseOutput(corrupted)).toMatchObject({
        passed: false,
        digestMatch: false,
      });

      const staleResult = { ...document, score: 0 };
      writeFileSync(contractPath, JSON.stringify(staleResult));
      const stale = capture();
      expect(
        await main(
          ["contract-verify", root, "--contract", contractPath, "--json"],
          stale.io,
        ),
      ).toBe(1);
      expect(parseOutput(stale)).toMatchObject({
        passed: false,
        freshScanMatch: false,
        artifactResultMatch: false,
      });

      const malformed = {
        ...document,
        analysisStatus: { discovery: "complete", rules: "complete" },
      };
      writeFileSync(contractPath, JSON.stringify(malformed));
      const invalidSchema = capture();
      expect(
        await main(
          ["contract-verify", root, "--contract", contractPath, "--json"],
          invalidSchema.io,
        ),
      ).toBe(10);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("validates every populated finding and annotation field", async () => {
    const root = createRepo();
    try {
      writeFileSync(
        join(root, "package.json"),
        JSON.stringify({ devDependencies: { vitest: "^5.0.0" } }),
      );
      writeFileSync(
        join(root, "sample.spec.ts"),
        "test('slow', async () => { await sleep(10); });\n",
      );
      const result = await runScan({
        target: root,
        json: false,
        verbose: false,
        maxDurationMs: Number.POSITIVE_INFINITY,
        scopeChanged: false,
        format: "terminal",
      });
      expect(result.findings.length).toBeGreaterThan(0);
      const document = { ...result, contract: buildMachineContract(result) };
      const contractPath = join(root, "scan.json");
      writeFileSync(contractPath, JSON.stringify(document));
      expect(
        await main(
          ["contract-verify", root, "--contract", contractPath, "--json"],
          capture().io,
        ),
      ).toBe(0);

      const findingMutations: Array<
        (finding: Record<string, unknown>) => void
      > = [
        (finding) => (finding.ruleId = ""),
        (finding) => (finding.category = 1),
        (finding) => (finding.file = ""),
        (finding) => (finding.line = 0),
        (finding) => (finding.column = 0),
        (finding) => (finding.message = ""),
        (finding) => (finding.severity = 1),
        (finding) => (finding.confidence = 1),
        (finding) => (finding.findingType = 1),
        (finding) => (finding.qaImpact = 1),
        (finding) => (finding.why = 1),
        (finding) => (finding.fix = 1),
      ];
      for (const mutate of findingMutations) {
        const malformed = structuredClone(document);
        const finding = malformed.findings[0] as unknown as Record<
          string,
          unknown
        >;
        mutate(finding);
        writeFileSync(contractPath, JSON.stringify(malformed));
        expect(
          await main(
            ["contract-verify", root, "--contract", contractPath, "--json"],
            capture().io,
          ),
        ).toBe(10);
      }

      for (const mutate of [
        (annotation: Record<string, unknown>) => (annotation.path = ""),
        (annotation: Record<string, unknown>) =>
          (annotation.annotation_level = "invalid"),
        (annotation: Record<string, unknown>) =>
          (annotation.detectorRevision = 0),
        (annotation: Record<string, unknown>) => (annotation.advisory = "yes"),
      ]) {
        const malformed = structuredClone(document);
        const annotation = malformed.contract
          .annotations[0] as unknown as Record<string, unknown>;
        mutate(annotation);
        writeFileSync(contractPath, JSON.stringify(malformed));
        expect(
          await main(
            ["contract-verify", root, "--contract", contractPath, "--json"],
            capture().io,
          ),
        ).toBe(10);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("validates optional trust, provenance, and forensic projections", async () => {
    const root = createRepo();
    try {
      const result = await runScan({
        target: root,
        json: false,
        verbose: false,
        maxDurationMs: Number.POSITIVE_INFINITY,
        scopeChanged: false,
        format: "terminal",
      });
      const trust = {
        level: "L2",
        confidence: 0.8,
        evidenceCoverage: 1,
        inconclusiveRate: 0,
        provisionalRuleIds: [],
        ceilingReasons: [],
        measuredFpOfFiredRules: 0,
        confidenceCeiling: 1,
      };
      const provenance = {
        testFiles: 1,
        generatedMarkedFiles: 0,
        codegenLikeFiles: 0,
        shareMarkedGenerated: 0,
        findingsInGeneratedFiles: 0,
        findingsInUnmarkedFiles: 0,
        note: "fixture",
      };
      const forensicVerdicts = {
        classifications: 0,
        inconclusive: 0,
        byVerdict: {},
      };
      const contract = buildMachineContract(result);
      contract.provenance = provenance;
      contract.forensicVerdicts = forensicVerdicts;
      const document = {
        ...result,
        trustSummary: trust,
        agenticProfile: provenance,
        forensicVerdicts,
        contract,
      };
      const contractPath = join(root, "scan.json");
      writeFileSync(contractPath, JSON.stringify(document));
      const valid = capture();
      const code = await main(
        ["contract-verify", root, "--contract", contractPath, "--json"],
        valid.io,
      );
      expect(code).not.toBe(10);

      for (const mutate of [
        (value: Record<string, unknown>) => (value.trustSummary = 1),
        (value: Record<string, unknown>) =>
          (value.agenticProfile = "invalid" as never),
        (value: Record<string, unknown>) =>
          (value.forensicVerdicts = { classifications: -1 }),
        (value: Record<string, unknown>) => {
          const contract = value.contract as Record<string, unknown>;
          value.contract = {
            ...contract,
            provenance: { testFiles: -1 },
          };
        },
      ]) {
        const malformed = structuredClone(document) as unknown as Record<
          string,
          unknown
        >;
        mutate(malformed);
        writeFileSync(contractPath, JSON.stringify(malformed));
        expect(
          await main(
            ["contract-verify", root, "--contract", contractPath, "--json"],
            capture().io,
          ),
        ).toBe(10);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects malformed persisted scan and contract layers", async () => {
    const root = createRepo();
    try {
      const result = await runScan({
        target: root,
        json: false,
        verbose: false,
        maxDurationMs: Number.POSITIVE_INFINITY,
        scopeChanged: false,
        format: "terminal",
      });
      const document = { ...result, contract: buildMachineContract(result) };
      const contractPath = join(root, "scan.json");
      const mutations: Array<(value: typeof document) => void> = [
        (value) => {
          value.analysisStatus = "invalid" as never;
        },
        (value) => {
          value.frameworks = [1] as never;
        },
        (value) => {
          value.dimensions = [null] as never;
        },
        (value) => {
          value.findings = [null] as never;
        },
        (value) => {
          value.trustSummary = 7 as never;
        },
        (value) => {
          value.agenticProfile = { testFiles: -1 } as never;
        },
        (value) => {
          value.forensicVerdicts = null as never;
        },
        (value) => {
          value.contract = null as never;
        },
        (value) => {
          value.contract.summary = null as never;
        },
        (value) => {
          value.contract.annotations = [{} as never];
        },
        (value) => {
          value.contract.annotations = [null as never];
        },
        (value) => {
          value.contract.completeness = null as never;
        },
        (value) => {
          value.contract.completeness = {} as never;
        },
        (value) => {
          value.contract.trustSummary = { level: "invalid" } as never;
        },
        (value) => {
          value.contract.provenance = { testFiles: -1 } as never;
        },
        (value) => {
          value.contract.forensicVerdicts = { byVerdict: { R: -1 } } as never;
        },
      ];

      for (const mutate of mutations) {
        const malformed = structuredClone(document);
        mutate(malformed);
        writeFileSync(contractPath, JSON.stringify(malformed));
        const cap = capture();
        expect(
          await main(
            ["contract-verify", root, "--contract", contractPath, "--json"],
            cap.io,
          ),
        ).toBe(10);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("persists trust history idempotently at a caller-supplied timestamp", async () => {
    const root = createRepo();
    try {
      const historyPath = join(root, "trust-history.json");
      const argv = [
        "trust-trend",
        root,
        "--history",
        historyPath,
        "--recorded-at",
        "2026-09-23T00:00:00.000Z",
        "--json",
      ];
      const first = capture();
      expect(await main(argv, first.io)).toBe(0);
      expect(parseOutput(first)).toMatchObject({
        overallDirection: "insufficient-data",
      });

      const history = JSON.parse(readFileSync(historyPath, "utf8")) as Array<
        Record<string, unknown>
      >;
      history.push({ ...history[0], scanId: "other" });
      writeFileSync(historyPath, JSON.stringify(history));

      const second = capture();
      expect(await main(argv, second.io)).toBe(0);
      const updated = JSON.parse(
        readFileSync(historyPath, "utf8"),
      ) as unknown[];
      expect(updated).toHaveLength(2);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("classifies evidence from real discovered file contents", async () => {
    const root = createRepo();
    try {
      writeFileSync(
        join(root, "package.json"),
        JSON.stringify({ devDependencies: { vitest: "^5.0.0" } }),
      );
      writeFileSync(
        join(root, "sample.spec.ts"),
        "// Generated by fixture\ntest('generated', async () => { await sleep(10); });\n",
      );
      const cap = capture();
      const code = await main(["evidence-graph", root, "--json"], cap.io);

      expect(code).toBe(0);
      expect(parseOutput(cap)).toMatchObject({
        agenticProfile: {
          testFiles: 1,
          generatedMarkedFiles: 1,
        },
      });

      const query = capture();
      expect(
        await main(
          ["evidence-graph", root, "--rule", "QA-TEST-004", "--json"],
          query.io,
        ),
      ).toBe(0);
      const queried = parseOutput(query) as {
        findings: Array<{ ruleId: string }>;
      };
      expect(queried.findings.map((finding) => finding.ruleId)).toContain(
        "QA-TEST-004",
      );

      const terminalQuery = capture();
      expect(
        await main(
          ["evidence-graph", root, "--rule", "QA-TEST-004"],
          terminalQuery.io,
        ),
      ).toBe(0);
      expect(terminalQuery.stdout()).toContain("QA-TEST-004 sample.spec.ts");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("accepts only a blocking scan in CI integrity checks", async () => {
    const root = createRepo();
    try {
      const workflowPath = join(root, ".github", "workflows", "ci.yml");
      mkdirSync(join(root, ".github", "workflows"), { recursive: true });
      writeFileSync(
        workflowPath,
        "name: ci\njobs:\n  test:\n    steps:\n      - run: mjolnir .\n",
      );
      const policyPath = join(root, "policy.json");
      writeFileSync(policyPath, JSON.stringify({ requireExpiration: false }));
      const cap = capture();
      const code = await main(
        ["ci-integrity", root, "--policy", policyPath, "--json"],
        cap.io,
      );

      expect(code).toBe(0);
      expect(parseOutput(cap)).toMatchObject({
        overallStatus: "healthy",
        failed: 0,
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("renders terminal outputs without machine decoration", async () => {
    const root = createRepo();
    try {
      const framework = capture();
      expect(
        await main(
          ["framework-maturity", "--framework", "playwright"],
          framework.io,
        ),
      ).toBe(0);
      expect(framework.stdout()).toContain("Calibration authority: human");

      const jest = capture();
      expect(
        await main(["framework-maturity", "--framework", "jest"], jest.io),
      ).toBe(0);
      expect(jest.stdout()).toContain("jest");

      const suppression = capture();
      expect(await main(["suppression-gate", root], suppression.io)).toBe(0);
      expect(suppression.stdout()).toContain(
        "Suppression Policy Governance Gate",
      );

      const crossFile = capture();
      expect(await main(["cross-file", root], crossFile.io)).toBe(0);
      expect(crossFile.stdout()).toContain("Cross-File Analysis Report");

      const contract = capture();
      expect(await main(["contract-verify", root], contract.io)).toBe(0);
      expect(contract.stdout()).toContain("Machine Contract Verification");

      const trust = capture();
      expect(
        await main(
          [
            "trust-trend",
            root,
            "--history",
            join(root, "history.json"),
            "--recorded-at",
            "2026-09-23T00:00:00.000Z",
          ],
          trust.io,
        ),
      ).toBe(0);
      expect(trust.stdout()).toContain("Trust Trend Analysis");

      const defaultHistory = capture();
      expect(await main(["trust-trend", root], defaultHistory.io)).toBe(0);
      expect(defaultHistory.stdout()).toContain("Trust Trend Analysis");

      const evidence = capture();
      expect(await main(["evidence-graph", root], evidence.io)).toBe(0);
      expect(evidence.stdout()).toContain("Evidence Graph Report");

      const ci = capture();
      expect(await main(["ci-integrity", root], ci.io)).toBe(1);
      expect(ci.stdout()).toContain("CI Workflow Integrity Report");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("loads explicit policies and rejects malformed policy input", async () => {
    const root = createRepo();
    try {
      const policyPath = join(root, "policy.json");
      writeFileSync(
        policyPath,
        JSON.stringify({
          requireExpiration: false,
          maxMassSuppressionRatio: 0.5,
          maxTotalSuppressions: 100,
          maxExpiredSuppressions: 0,
          allowedRuleIds: [],
        }),
      );
      const valid = capture();
      expect(
        await main(
          ["suppression-gate", root, "--policy", policyPath, "--json"],
          valid.io,
        ),
      ).toBe(0);

      writeFileSync(policyPath, JSON.stringify({ maxTotalSuppressions: -1 }));
      const invalid = capture();
      expect(
        await main(
          ["suppression-gate", root, "--policy", policyPath, "--json"],
          invalid.io,
        ),
      ).toBe(10);
      expect(invalid.stderr()).toContain("maxTotalSuppressions");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("supports evidence queries and rejects malformed persisted inputs", async () => {
    const root = createRepo();
    try {
      const byFile = capture();
      expect(
        await main(
          ["evidence-graph", root, "--file", "sample.spec.ts", "--json"],
          byFile.io,
        ),
      ).toBe(0);
      expect(parseOutput(byFile)).toMatchObject({ findings: [] });

      const contractPath = join(root, "bad-contract.json");
      writeFileSync(contractPath, JSON.stringify({ schemaVersion: 1 }));
      const contract = capture();
      expect(
        await main(
          ["contract-verify", root, "--contract", contractPath, "--json"],
          contract.io,
        ),
      ).toBe(10);

      const historyPath = join(root, "bad-history.json");
      writeFileSync(historyPath, JSON.stringify([null]));
      const history = capture();
      expect(
        await main(
          [
            "trust-trend",
            root,
            "--history",
            historyPath,
            "--recorded-at",
            "2026-09-23T00:00:00.000Z",
          ],
          history.io,
        ),
      ).toBe(10);

      const historyParent = join(root, "history-parent");
      writeFileSync(historyParent, "not a directory");
      const unwritable = capture();
      expect(
        await main(
          [
            "trust-trend",
            root,
            "--history",
            join(historyParent, "history.json"),
            "--recorded-at",
            "2026-09-23T00:00:00.000Z",
          ],
          unwritable.io,
        ),
      ).toBe(20);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects invalid options, framework names, and empty scan surfaces", async () => {
    const empty = mkdtempSync(join(tmpdir(), "mjolnir-empty-cli-"));
    try {
      const option = capture();
      expect(
        await main(
          ["suppression-gate", "--history", "history.json"],
          option.io,
        ),
      ).toBe(10);
      const framework = capture();
      expect(
        await main(
          ["framework-maturity", "--framework", "unknown"],
          framework.io,
        ),
      ).toBe(10);
      const partial = capture();
      expect(await main(["cross-file", empty, "--json"], partial.io)).toBe(2);
      const emptyEvidence = capture();
      expect(
        await main(["evidence-graph", empty, "--json"], emptyEvidence.io),
      ).toBe(2);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  it("uses shared default output sinks for every handler", async () => {
    expect(
      runFrameworkMaturityCommand([undefined as unknown as string, "--json"]),
    ).toBe(0);
    expect(runFrameworkMaturityCommand(["--unknown"])).toBe(10);
    expect(await runSuppressionGateCommand(["missing"])).toBe(10);
    expect(await runCrossFileCommand(["missing"])).toBe(10);
    expect(await runContractVerifyCommand(["missing"])).toBe(10);
    expect(await runTrustTrendCommand(["missing"])).toBe(10);
    expect(await runEvidenceGraphCommand(["missing"])).toBe(10);
    expect(await runCIIntegrityCommand(["missing"])).toBe(10);
  });

  it("rejects every missing command option value before scanning", async () => {
    const invocations = [
      ["framework-maturity", "--format"],
      ["cross-file", "--format"],
      ["ci-integrity", "--format"],
      ["suppression-gate", "--max-duration"],
      ["framework-maturity", "--framework"],
      ["suppression-gate", "--policy"],
      ["trust-trend", "--history"],
      ["trust-trend", "--recorded-at"],
      ["contract-verify", "--contract"],
      ["evidence-graph", "--file"],
      ["evidence-graph", "--rule"],
    ] as const;

    for (const argv of invocations) {
      const cap = capture();
      expect(await main([...argv], cap.io), argv.join(" ")).toBe(10);
      expect(cap.stderr()).toContain("requires a value");
    }

    for (const argv of [
      ["cross-file", "--history", "history.json"],
      ["contract-verify", "--file", "sample.spec.ts"],
      ["trust-trend", "--file", "sample.spec.ts"],
      ["evidence-graph", "--policy", "policy.json"],
      ["ci-integrity", "--file", "sample.spec.ts"],
    ]) {
      const cap = capture();
      expect(await main(argv, cap.io), argv.join(" ")).toBe(10);
      expect(cap.stderr()).toContain("is not valid for this command");
    }

    for (const argv of [
      ["framework-maturity", "--recorded-at", "not-a-date"],
      ["suppression-gate", "--unknown"],
      ["suppression-gate", "one", "two"],
    ]) {
      const cap = capture();
      expect(await main(argv, cap.io), argv.join(" ")).toBe(10);
    }
  });

  it("rejects invalid target shapes", async () => {
    const root = createRepo();
    try {
      const file = join(root, "sample.spec.ts");
      const cap = capture();
      expect(await main(["cross-file", file], cap.io)).toBe(10);
      expect(cap.stderr()).toContain("not a directory");

      const persisted = capture();
      expect(
        await main(
          ["contract-verify", "missing", "--contract", "scan.json"],
          persisted.io,
        ),
      ).toBe(10);
      expect(persisted.stderr()).toContain("does not exist");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects invalid suppression policy shapes", async () => {
    const root = createRepo();
    try {
      const policyPath = join(root, "policy.json");
      const invalidPolicies = [
        { requireExpiration: "yes" },
        { allowedRuleIds: [1] },
        { maxMassSuppressionRatio: 2 },
        { maxMassSuppressionRatio: "invalid" },
      ];
      for (const policy of invalidPolicies) {
        writeFileSync(policyPath, JSON.stringify(policy));
        const cap = capture();
        expect(
          await main(
            ["suppression-gate", root, "--policy", policyPath, "--json"],
            cap.io,
          ),
          JSON.stringify(policy),
        ).toBe(10);
      }
      writeFileSync(policyPath, "{");
      const invalidJson = capture();
      expect(
        await main(
          ["suppression-gate", root, "--policy", policyPath, "--json"],
          invalidJson.io,
        ),
      ).toBe(10);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("maps configured suppressions into the gate", async () => {
    const root = createRepo();
    try {
      mkdirSync(join(root, "mjolnir-rules"), { recursive: true });
      writeFileSync(join(root, "mjolnir-rules", "local.mjs"), "");
      writeFileSync(
        join(root, "mjolnir.config.json"),
        JSON.stringify({
          ignore: [
            {
              ruleId: "QA-TEST-001",
              files: ["sample.spec.ts"],
              reason: "coverage fixture",
              expires: "2026-12-31",
            },
            { ruleId: "QA-CI-001", reason: "rule-wide fixture" },
          ],
          mystery: true,
        }),
      );
      const cap = capture();
      await main(["suppression-gate", root, "--json"], cap.io);
      const gate = parseOutput(cap) as { totalSuppressions: number };
      expect(gate.totalSuppressions).toBe(2);
      expect(cap.stderr()).toContain("unknown top-level key");
      expect(cap.stderr()).toContain("mjolnir-rules/local.mjs");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("validates persisted contracts stored outside the scan target", async () => {
    const root = createRepo();
    const outside = `${root}-contract.json`;
    try {
      const result = await runScan({
        target: root,
        json: false,
        verbose: false,
        maxDurationMs: Number.POSITIVE_INFINITY,
        scopeChanged: false,
        format: "terminal",
      });
      writeFileSync(
        outside,
        JSON.stringify({ ...result, contract: buildMachineContract(result) }),
      );
      const cap = capture();
      expect(
        await main(
          ["contract-verify", root, "--contract", outside, "--json"],
          cap.io,
        ),
      ).toBe(0);
      const missing = capture();
      expect(
        await main(
          ["contract-verify", "missing-target", "--contract", outside],
          missing.io,
        ),
      ).toBe(10);
      const partialPath = join(root, "partial.json");
      writeFileSync(
        join(root, "oversized.spec.ts"),
        "x".repeat(1024 * 1024 + 1),
      );
      const partialResult = await runScan({
        target: root,
        json: false,
        verbose: false,
        maxDurationMs: Number.POSITIVE_INFINITY,
        scopeChanged: false,
        format: "terminal",
      });
      expect(partialResult.partial).toBe(true);
      expect(partialResult.analysisStatus.truncationReasons).toContain(
        "file-size",
      );
      writeFileSync(
        partialPath,
        JSON.stringify({
          ...partialResult,
          contract: buildMachineContract(partialResult),
        }),
      );
      expect(
        await main(
          ["contract-verify", root, "--contract", partialPath, "--json"],
          capture().io,
        ),
      ).toBe(2);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(outside, { force: true });
    }
  });

  it("returns partial for bounded short scans across scan-backed commands", async () => {
    const root = createRepo();
    try {
      writeFileSync(
        join(root, "oversized.spec.ts"),
        "x".repeat(1024 * 1024 + 1),
      );
      for (const command of [
        "suppression-gate",
        "cross-file",
        "contract-verify",
        "trust-trend",
        "evidence-graph",
        "ci-integrity",
      ]) {
        const cap = capture();
        const code = await main(
          [command, root, "--max-duration", "0.000001", "--json"],
          cap.io,
        );
        expect(code, command).toBe(2);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("parses explicit modes, duration limits, and rule queries", async () => {
    const root = createRepo();
    try {
      const scan = capture();
      expect(
        await main(
          [
            "suppression-gate",
            root,
            "--format",
            "json",
            "--no-progress",
            "--max-duration",
            "30",
          ],
          scan.io,
        ),
      ).toBe(0);
      expect(parseOutput(scan)).toMatchObject({ passed: true });

      const query = capture();
      expect(
        await main(["evidence-graph", root, "--rule", "QA-TEST-001"], query.io),
      ).toBe(0);
      expect(query.stdout()).toContain("No matching findings.");

      const invalidFormat = capture();
      expect(
        await main(
          ["suppression-gate", root, "--format", "sarif"],
          invalidFormat.io,
        ),
      ).toBe(10);
      const invalidDuration = capture();
      expect(
        await main(
          ["suppression-gate", root, "--max-duration", "0"],
          invalidDuration.io,
        ),
      ).toBe(10);
      const bothQueries = capture();
      expect(
        await main(
          [
            "evidence-graph",
            root,
            "--file",
            "sample.spec.ts",
            "--rule",
            "QA-TEST-004",
          ],
          bothQueries.io,
        ),
      ).toBe(10);
      const unexpected = capture();
      expect(
        await main(
          ["framework-maturity", "--policy", "policy.json"],
          unexpected.io,
        ),
      ).toBe(10);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("returns usage errors before scanning an invalid target", async () => {
    for (const command of [
      "suppression-gate",
      "cross-file",
      "contract-verify",
      "trust-trend",
      "evidence-graph",
      "ci-integrity",
    ]) {
      const cap = capture();
      expect(await main([command, "missing-target"], cap.io), command).toBe(10);
      expect(cap.stderr(), command).toContain("does not exist");
    }
  });
});
