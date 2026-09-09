/**
 * Triage v2 — the guided workflow (Mega MVP Master Plan v3.1 §26 WI-8,
 * §9).
 *
 * Locks: the FAILED → CLASSIFY → COLLECT EVIDENCE → CORRELATE → TRUST
 * VERDICT → NEXT ACTION → FIX → RERUN → PROOF chain is present per row;
 * EVERY row ends with a concrete next action (the acceptance law);
 * classification is deterministic from retry history; the --json twin
 * mirrors the terminal rows; hostile/empty inputs degrade honestly.
 */

import { describe, expect, it } from "vitest";

import {
  classifyVerdict,
  renderTriage,
  renderTriageWorkflow,
  renderTriageWorkflowJson,
  triageRows,
  workflowRows,
} from "../../src/forensics/triage.js";
import type {
  ForensicsReport,
  TestVerdict,
} from "../../src/forensics/types.js";

function verdict(overrides: Partial<TestVerdict>): TestVerdict {
  return {
    file: "e2e/shop.spec.ts",
    title: "checkout flow",
    attempts: 1,
    finalStatus: "passed",
    totalDurationMs: 120,
    passedOnRetry: false,
    everFailed: false,
    skipped: false,
    ...overrides,
  };
}

function report(overrides: Partial<ForensicsReport> = {}): ForensicsReport {
  return {
    source: "playwright-json",
    totalTests: 3,
    failed: 2,
    skipped: 0,
    retriedTests: 1,
    flakyTests: 1,
    totalDurationMs: 6000,
    verdicts: [],
    ...overrides,
  };
}

describe("CLASSIFY — deterministic from retry history", () => {
  it("the four labels are exhaustive over retry shapes", () => {
    expect(
      classifyVerdict(
        verdict({ passedOnRetry: true, everFailed: true, attempts: 2 }),
      ),
    ).toBe("RETRY-DEPENDENT");
    expect(
      classifyVerdict(verdict({ finalStatus: "failed", everFailed: true })),
    ).toBe("FAILING");
    expect(
      classifyVerdict(verdict({ finalStatus: "timedOut", everFailed: true })),
    ).toBe("TIMEOUT");
    expect(
      classifyVerdict(verdict({ skipped: true, finalStatus: "skipped" })),
    ).toBe("SKIPPED");
  });

  it("RETRY-DEPENDENT wins over FAILING (the flake IS the finding)", () => {
    expect(
      classifyVerdict(
        verdict({
          passedOnRetry: true,
          finalStatus: "passed",
          everFailed: true,
        }),
      ),
    ).toBe("RETRY-DEPENDENT");
  });
});

describe("the acceptance law — every row ends with a concrete next action", () => {
  const rep = report({
    verdicts: [
      verdict({
        title: "flaky",
        attempts: 3,
        passedOnRetry: true,
        everFailed: true,
      }),
      verdict({ title: "failing", finalStatus: "failed", everFailed: true }),
      verdict({ title: "hanging", finalStatus: "timedOut", everFailed: true }),
      verdict({
        title: "skipped-after-retry",
        skipped: true,
        finalStatus: "skipped",
      }),
    ],
  });
  const rows = workflowRows(rep);
  const out = renderTriageWorkflow(rep);

  it("every row carries all §9 fields", () => {
    for (const r of rows) {
      expect(r.classification).toBeTruthy();
      expect(r.evidence.length).toBeGreaterThan(0);
      expect(r.trustVerdict).toBeTruthy();
      expect(r.nextAction).toBeTruthy();
    }
  });

  it("the terminal render shows the chain per row", () => {
    for (const section of ["evidence:", "trust:", "next:"]) {
      expect(out).toContain(section);
    }
    expect(out).toContain("Rerun after fixes");
  });

  it("next actions are concrete commands or checkable procedures", () => {
    for (const r of rows) {
      expect(
        r.nextAction.includes("npx playwright test") ||
          r.nextAction.includes("repeat execution") ||
          r.nextAction.includes("inspect"),
      ).toBe(true);
    }
  });

  it("trust verdicts stay honest — LOW for unclear skips, MEDIUM for unresolved timeouts", () => {
    const skipped = rows.find((r) => r.classification === "SKIPPED");
    expect(skipped?.trustVerdict).toContain("LOW");
    const timedOut = rows.find((r) => r.classification === "TIMEOUT");
    expect(timedOut?.trustVerdict).toContain("MEDIUM");
  });
});

describe("--json twin mirrors the workflow", () => {
  it("structured, agent-consumable, same rows", () => {
    const rep = report({
      verdicts: [
        verdict({
          title: "flaky",
          attempts: 2,
          passedOnRetry: true,
          everFailed: true,
        }),
      ],
    });
    const j = JSON.parse(renderTriageWorkflowJson(rep)) as {
      artifact: string;
      rows: Array<{ classification: string; nextAction: string }>;
    };
    expect(j.artifact).toBe("mjolnir-triage-workflow");
    expect(j.rows).toHaveLength(1);
    expect(j.rows[0]?.classification).toBe("RETRY-DEPENDENT");
    expect(j.rows[0]?.nextAction).toContain("quarantine + ticket");
  });
});

describe("determinism + hostile inputs", () => {
  it("same report → same workflow, twice", () => {
    const rep = report({
      verdicts: [
        verdict({ title: "failing", finalStatus: "failed", everFailed: true }),
        verdict({
          title: "flaky",
          attempts: 2,
          passedOnRetry: true,
          everFailed: true,
        }),
      ],
    });
    expect(renderTriageWorkflow(rep)).toBe(renderTriageWorkflow(rep));
    expect(renderTriageWorkflowJson(rep)).toBe(renderTriageWorkflowJson(rep));
  });

  it("empty run → honest nothing-to-triage, no fabricated rows", () => {
    const out = renderTriageWorkflow(report({ verdicts: [], totalTests: 0 }));
    expect(out).toContain("Nothing to triage");
  });

  it("a passed-only run has nothing to triage (passed = not a row)", () => {
    const out = renderTriageWorkflow(
      report({ verdicts: [verdict({})], failed: 0 }),
    );
    expect(out).toContain("Nothing to triage");
  });
});

describe("triageRows + renderTriage — the legacy surface (P8 completeness)", () => {
  it("rows sort worst-first: flake by passedOnRetry, then attempts desc, then duration", () => {
    const rep = report({
      verdicts: [
        verdict({
          file: "a.spec.ts",
          title: "plain-fail",
          everFailed: true,
          attempts: 1,
        }),
        verdict({
          file: "b.spec.ts",
          title: "flake-3",
          passedOnRetry: true,
          everFailed: true,
          attempts: 3,
        }),
        verdict({
          file: "c.spec.ts",
          title: "flake-2-slow",
          passedOnRetry: true,
          everFailed: true,
          attempts: 2,
          totalDurationMs: 900,
        }),
        verdict({
          file: "d.spec.ts",
          title: "flake-2-fast",
          passedOnRetry: true,
          everFailed: true,
          attempts: 2,
          totalDurationMs: 100,
        }),
        verdict({
          file: "e.spec.ts",
          title: "clean",
          attempts: 1,
          totalDurationMs: 50,
        }),
      ],
    });
    const rows = triageRows(rep);
    expect(rows.map((r) => r.title)).toEqual([
      "flake-3",
      "flake-2-slow",
      "flake-2-fast",
      "plain-fail",
    ]);
    expect(rows[0]?.suggestedAction).toBe("quarantine + ticket");
  });

  it("renderTriage renders TRUE-FLAKE/FAILING rows + the quarantine proposal", () => {
    const rep = report({
      verdicts: [
        verdict({
          file: "b.spec.ts",
          title: "flake",
          passedOnRetry: true,
          everFailed: true,
          attempts: 3,
        }),
        verdict({
          file: "a.spec.ts",
          title: "failing",
          everFailed: true,
          attempts: 1,
        }),
      ],
    });
    const out = renderTriage(rep);
    expect(out).toContain("TRUE-FLAKE");
    expect(out).toContain("FAILING");
    expect(out).toContain("Auto-quarantine proposal: 1 test");
    expect(out).toContain("quarantine is not deletion");
  });

  it("renderTriage with no failures says so and renders nothing else", () => {
    const rep = report({ verdicts: [verdict({})] });
    const out = renderTriage(rep);
    expect(out).toContain("Nothing to triage");
  });

  it("timedOut failures get the fix-now action (suggestAction arm)", () => {
    const rows = triageRows(
      report({
        verdicts: [
          verdict({ finalStatus: "timedOut", everFailed: true, attempts: 1 }),
        ],
      }),
    );
    expect(rows[0]?.suggestedAction).toBe("fix now — failing");
  });
});
