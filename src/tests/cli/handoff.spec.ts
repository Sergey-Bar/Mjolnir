/**
 * Agent-handoff plan M3 — `mjolnir handoff`.
 *
 * Contracts (plan §5.1–§5.4, §9.3, §10, §11, §12):
 * - Deterministic artifact: byte-identical output for identical input.
 * - QA-10: every rule/repo-controlled field is escapeMarkdown'd.
 * - Evidence boundaries per level (E2 deterministic / E1 confirm / E0
 *   observation), corroboration rendered when present, never fabricated.
 * - Verification contract: fingerprint correlation, four named outcomes,
 *   changed-scope-vs-full-scan caveat, report-files-changed / checks-
 *   not-run / unresolved-honestly instructions.
 * - Zero findings: exit 0, deterministic clean artifact, NO copy blocks,
 *   explicit non-actionability line.
 * - --category narrows findings inside groups; --rules narrows groups;
 *   both are presentation filters.
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  renderHandoff,
  runHandoffCommand,
  ruleCopyBlock,
  verificationBlock,
} from "../../src/commands/handoff.js";
import type { Finding, ScanResult } from "../../src/types.js";
import type { Output } from "../../src/cli.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-handoff-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function finding(over: Partial<Finding> = {}): Finding {
  const base: Finding = {
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
    fixGroupId: "QA-TEST-001",
  };
  const f = { ...base, ...over };
  // Current strategy: fixGroupId tracks the rule (plan §5.1 — a strategy,
  // not a semantic promise).
  f.fixGroupId = over.fixGroupId ?? over.ruleId ?? "QA-TEST-001";
  return f;
}

function report(over: Partial<ScanResult> = {}): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 72,
    frameworks: ["vitest"],
    frameworkDetectionUnknown: false,
    dimensions: [
      { category: "QA-TEST", score: 60, errors: 2, warnings: 0, infos: 0 },
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

describe("renderHandoff — structure", () => {
  it("headers the artifact and carries the score + verdict", () => {
    const md = renderHandoff(report());
    expect(md).toContain("### 🔨 Mjölnir — Fix Handoff");
    expect(md).toContain("Score: **72/100**");
    expect(md).toContain("72/100");
  });

  it("one rule section answers the seven questions", () => {
    const md = renderHandoff(report());
    expect(md).toContain("**What is wrong:**");
    expect(md).toContain("**Why Mjölnir believes it:**");
    expect(md).toContain("**How trustworthy (evidence boundary):**");
    expect(md).toContain("**Occurrences (1):**");
    expect(md).toContain("**What should change:**");
    expect(md).toContain("**What must NOT change:**");
    expect(md).toContain("## Verification procedure");
  });

  it("groups by fixGroupId and one group renders one section", () => {
    const md = renderHandoff(
      report({
        findings: [
          finding({ line: 3, file: "e2e/a.spec.ts" }),
          finding({ line: 9, file: "e2e/b.spec.ts" }),
        ],
      }),
    );
    expect(md.match(/### QA-TEST-001/g)).toHaveLength(1);
    expect(md).toContain("× 2 (fix group: QA-TEST-001)");
  });

  it("orders errors before warnings, larger groups first, then rule id", () => {
    const md = renderHandoff(
      report({
        findings: [
          finding({
            ruleId: "QA-Z-009",
            category: "QA-TQUAL",
            severity: "warning",
          }),
          finding({ ruleId: "QA-A-001", severity: "error" }),
          finding({
            ruleId: "QA-B-002",
            severity: "error",
            file: "e2e/c.spec.ts",
          }),
        ],
      }),
    );
    const idxA = md.indexOf("### QA-A-001");
    const idxB = md.indexOf("### QA-B-002");
    const idxZ = md.indexOf("### QA-Z-009");
    expect(idxA).toBeLessThan(idxB);
    expect(idxB).toBeLessThan(idxZ);
  });

  it("caps occurrences at 25 with an honest overflow count", () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      finding({ line: i + 1, file: `e2e/f${i}.spec.ts` }),
    );
    const md = renderHandoff(report({ findings: many }));
    expect(md).toContain("**Occurrences (30):**");
    expect(md).toContain("… and 5 more — see the JSON report.");
    expect(md).toContain("e2e/f24.spec.ts:25");
    expect(md).not.toContain("e2e/f25.spec.ts:26");
  });

  it("reports score:null honestly and still renders the plan", () => {
    const md = renderHandoff(report({ score: null, reason: "no-tests-found" }));
    expect(md).toContain("not measurable");
    expect(md).toContain("### QA-TEST-001");
  });

  it("marks partial scans and warns that verification claims weaken", () => {
    const md = renderHandoff(report({ partial: true }));
    expect(md).toContain("Partial scan");
    expect(md).toContain("may be incomplete");
  });
});

describe("renderHandoff — evidence boundaries (plan §5.4)", () => {
  it("E2: deterministic wording", () => {
    const md = renderHandoff(
      report({ findings: [finding({ evidenceLevel: "E2" })] }),
    );
    expect(md).toContain("evidence is deterministic");
  });

  it("E1: requires confirmation, never presented as a deterministic fact", () => {
    const md = renderHandoff(
      report({
        findings: [
          finding({ evidenceLevel: "E1", findingType: "heuristic-risk" }),
        ],
      }),
    );
    expect(md).toContain("REQUIRES CONFIRMATION before editing");
    expect(md).not.toContain("evidence is deterministic for this pattern");
  });

  it("E0: observation only, never gate, do not fix blindly", () => {
    const md = renderHandoff(
      report({
        findings: [
          finding({
            evidenceLevel: "E0",
            findingType: "observation",
            severity: "info",
          }),
        ],
      }),
    );
    expect(md).toContain("Observation only");
    expect(md).toContain("do NOT 'fix' it blindly");
  });

  it("renders measured FP when present, assumption-honesty when absent", () => {
    const withFp = renderHandoff(
      report({
        findings: [finding({ measuredFpRate: 0.08, measuredFpN: 51 })],
      }),
    );
    expect(withFp).toContain(
      "Measured FP rate: 8% over 51 classified verdicts",
    );
    const without = renderHandoff(report());
    expect(without).toContain("ships on assumption");
  });

  it("renders runtime corroboration when present, never fabricates it", () => {
    const withC = renderHandoff(
      report({
        findings: [
          finding({
            runtimeCorroboration: {
              level: "defect",
              source: "playwright-json",
              testsExecuted: 7,
            },
          }),
        ],
      }),
    );
    expect(withC).toContain("directly corroborates this defect");
    const without = renderHandoff(report());
    expect(without).not.toContain("Runtime corroboration:");
  });
});

describe("renderHandoff — verification contract (plan §5.3)", () => {
  it("embeds the four named outcomes and the fingerprint rule", () => {
    const md = renderHandoff(report());
    for (const outcome of [
      "TARGET_RESOLVED",
      "TARGET_REMAINS",
      "NEW_FINDINGS_INTRODUCED",
      "VERIFICATION_NOT_RUN",
    ]) {
      expect(md).toContain(outcome);
    }
    expect(md).toContain("ruleId + file + message");
    expect(md).toContain("line numbers are occurrence locations, not identity");
  });

  it("carries the changed-scope-vs-full-scan caveat verbatim", () => {
    const md = renderHandoff(report());
    expect(md).toContain(
      "It is NOT a statement that the entire repository is clean",
    );
  });

  it("pins the verification command version and never @latest", () => {
    const md = renderHandoff(report(), {}, "0.5.4");
    expect(md).toContain("npx mjolnir-qa@0.5.4 . --scope changed");
    expect(md).not.toContain("@latest");
  });

  it("mandates report-files-changed / checks-not-run / unresolved-honestly", () => {
    const md = renderHandoff(report());
    expect(md).toContain("Report files changed");
    expect(md).toContain("Report checks not run");
    expect(md).toContain("Report unresolved findings honestly");
  });

  it("the one-shot prompt preserves order and evidence boundaries", () => {
    const md = renderHandoff(
      report({
        findings: [
          finding({ evidenceLevel: "E2", ruleId: "QA-A-001" }),
          finding({
            evidenceLevel: "E1",
            findingType: "heuristic-risk",
            ruleId: "QA-B-002",
            severity: "warning",
          }),
        ],
      }),
    );
    const oneShot = md.slice(md.indexOf("## One-shot handoff prompt"));
    expect(oneShot).toContain("IN ORDER");
    expect(oneShot).toContain("E2 = deterministic, act after a location check");
    expect(oneShot).toContain("E1/E0 = confirm in context first");
    expect(oneShot).toContain(
      "Do NOT suppress findings merely to make the scan green",
    );
    expect(oneShot).toContain(
      "Stop and ask the user when an evidence boundary cannot be resolved",
    );
  });
});

describe("handoff copy block (plan §11)", () => {
  it("is self-contained: id, group, why, evidence, fix, constraints, verify", () => {
    const block = ruleCopyBlock(
      {
        ruleId: "QA-TEST-001",
        fixGroupId: "QA-TEST-001",
        findings: [finding()],
      },
      "0.5.4",
    );
    expect(block).toContain(
      "Remediation task: QA-TEST-001 (fix group: QA-TEST-001)",
    );
    expect(block).toContain("What was detected:");
    expect(block).toContain("Evidence boundary:");
    expect(block).toContain("What should change:");
    expect(block).toContain("Constraints:");
    expect(block).toContain("Occurrences (validate each):");
    expect(block).toContain("npx mjolnir-qa@0.5.4 . --scope changed");
    expect(block).toContain(
      "Do NOT disable the rule or suppress matching code",
    );
    expect(block).toContain("Report files changed");
    expect(block).toContain("Report checks not run");
  });

  it("is fenced (```text) so metadata can never break out", () => {
    const block = ruleCopyBlock(
      {
        ruleId: "QA-TEST-001",
        fixGroupId: "QA-TEST-001",
        findings: [finding()],
      },
      "0.5.4",
    );
    expect(block.startsWith("```text")).toBe(true);
    expect(block.trimEnd().endsWith("```")).toBe(true);
  });
});

describe("renderHandoff — QA-10 hostile metadata", () => {
  it("escapes every rule-controlled field; the details envelope survives", () => {
    const md = renderHandoff(
      report({
        findings: [
          finding({
            ruleId: "QA-EVIL|001",
            file: "a</script>`b.spec.ts",
            message: "msg with </details> and `backticks`",
            why: "why <script>alert(1)</script>",
            fix: "fix | it",
          }),
        ],
      }),
    );
    expect(md).toContain("QA-EVIL\\|001");
    expect(md).toContain("\\`backticks\\`");
    expect(md).toContain("why \\<script\\>alert\\(1\\)\\</script\\>");
    // Exactly THREE fenced ```text envelopes — the score bar, the rule
    // copy block, and the one-shot block. Hostile metadata opened no
    // new envelope.
    expect(md.match(/```text/g)?.length).toBe(3);
    expect(md).not.toContain("<script>");
  });
});

describe("renderHandoff — filters (presentation only)", () => {
  const findings = [
    finding({ ruleId: "QA-TEST-001", category: "QA-TEST" }),
    finding({ ruleId: "QA-PW-118", category: "QA-PW", severity: "warning" }),
  ];

  it("--category narrows findings inside groups", () => {
    const md = renderHandoff(report({ findings }), {
      categories: ["QA-PW"],
    });
    expect(md).toContain("QA-PW-118");
    expect(md).not.toContain("### QA-TEST-001");
  });

  it("--rules narrows groups", () => {
    const md = renderHandoff(report({ findings }), {
      rules: ["QA-TEST-001"],
    });
    expect(md).toContain("QA-TEST-001");
    expect(md).not.toContain("### QA-PW-118");
  });

  it("no matching groups → honest no-match, no prompt", () => {
    const md = renderHandoff(report({ findings }), { rules: ["QA-NOPE-001"] });
    expect(md).toContain("No findings match the requested filters");
    expect(md).not.toContain("Remediation task:");
  });

  it("scope note marks the filtered view", () => {
    const md = renderHandoff(report({ findings }), {
      categories: ["QA-PW"],
    });
    expect(md).toContain("(filtered — categories: QA-PW)");
  });
});

describe("zero-finding handoff (plan §5.9-equivalent)", () => {
  it("exit-0 clean artifact: no sections, no copy blocks, non-actionable", () => {
    const md = renderHandoff(report({ findings: [], score: 100 }));
    expect(md).toContain("Zero findings — nothing to fix.");
    expect(md).toContain(
      "No remediation prompt is included. Do not modify the repository on the basis of this document.",
    );
    expect(md).not.toContain("Remediation task:");
    expect(md).not.toContain("## One-shot handoff prompt");
    expect(md).not.toContain("## Verification procedure");
    expect(md).toContain("100/100");
  });

  it("partial zero-finding scan still carries the honesty caveat", () => {
    const md = renderHandoff(
      report({
        findings: [],
        score: null,
        reason: "no-tests-found",
        partial: true,
        analysisStatus: {
          discovery: "partial",
          rules: "partial",
          skippedFiles: 2,
          durationMs: 1,
        },
      }),
    );
    expect(md).toContain("Zero findings — nothing to fix.");
    expect(md).toContain("only as trustworthy as the scan's coverage");
  });
});

describe("determinism", () => {
  it("byte-identical output for identical input", () => {
    const result = report();
    expect(renderHandoff(result)).toBe(renderHandoff(result));
  });

  it("no timestamps or environment leakage in the artifact", () => {
    const md = renderHandoff(report());
    expect(md).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(md).not.toContain(process.cwd());
    expect(md).not.toContain("mjolnir-handoff-");
  });
});

describe("runHandoffCommand — CLI contract", () => {
  it("exit 0 + artifact on a valid saved report", () => {
    const p = writeReport();
    const cap = capture();
    expect(runHandoffCommand([p], cap.io)).toBe(0);
    expect(cap.text()).toContain("Fix Handoff");
  });

  it("exit 10 on a missing report, with the exact scan command", () => {
    const cap = capture();
    expect(runHandoffCommand([join(dir, "nope.json")], cap.io)).toBe(10);
    expect(cap.errText()).toContain("not found");
    expect(cap.errText()).toContain("mjolnir --json");
  });

  it("defaults to mjolnir.json", () => {
    const cap = capture();
    expect(runHandoffCommand([], cap.io)).toBe(10);
    expect(cap.errText()).toContain("mjolnir.json");
  });

  it("exit 2 on invalid JSON / foreign schema / non-report JSON", () => {
    const bad = join(dir, "bad.json");
    writeFileSync(bad, "{ not json");
    expect(runHandoffCommand([bad], capture().io)).toBe(2);

    const foreign = join(dir, "foreign.json");
    writeFileSync(foreign, JSON.stringify({ schemaVersion: 9, findings: [] }));
    expect(runHandoffCommand([foreign], capture().io)).toBe(2);

    const other = join(dir, "other.json");
    writeFileSync(other, JSON.stringify({ hello: 1 }));
    expect(runHandoffCommand([other], capture().io)).toBe(2);
  });

  it("exit 10 on unknown flags (shared did-you-mean machinery)", () => {
    const cap = capture();
    expect(runHandoffCommand(["--stduot"], cap.io)).toBe(10);
    expect(cap.errText()).toContain('unknown flag "--stduot"');
  });

  it("--category/--rules pass through to the renderer", () => {
    const p = writeReport({
      findings: [
        finding({ ruleId: "QA-TEST-001", category: "QA-TEST" }),
        finding({
          ruleId: "QA-PW-118",
          category: "QA-PW",
          severity: "warning",
        }),
      ],
    });
    const cap = capture();
    expect(runHandoffCommand([p, "--category", "QA-PW"], cap.io)).toBe(0);
    expect(cap.text()).toContain("QA-PW-118");
    expect(cap.text()).not.toContain("### QA-TEST-001");

    const cap2 = capture();
    expect(runHandoffCommand([p, "--rules", "QA-TEST-001"], cap2.io)).toBe(0);
    expect(cap2.text()).toContain("QA-TEST-001");
    expect(cap2.text()).not.toContain("### QA-PW-118");
  });
});

describe("verificationBlock (exported for reuse)", () => {
  it("carries all four outcomes + the caveat + the reporting duties", () => {
    const block = verificationBlock("0.5.4").join("\n");
    expect(block).toContain("npx mjolnir-qa@0.5.4 . --scope changed");
    expect(block).toContain("TARGET_RESOLVED");
    expect(block).toContain("TARGET_REMAINS");
    expect(block).toContain("NEW_FINDINGS_INTRODUCED");
    expect(block).toContain("VERIFICATION_NOT_RUN");
    expect(block).toContain(
      "NOT a statement that the entire repository is clean",
    );
    expect(block).toContain("Report files changed");
  });
});
