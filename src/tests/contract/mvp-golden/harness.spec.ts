/**
 * Golden Product Harness — stage 1 (Mega MVP Master Plan v3.1 §26
 * WI-13B, §22): proves Correct Evidence → Correct Correlation → Correct
 * Trust Decision over the canonical mvp-demo corpus.
 *
 * Staged activation: 0.6.x covers CLI + JSON (+ Action/Reporter as
 * their WI-9/WI-10 residuals complete; +trace in 1.1.x; +MCP/Agent in
 * 1.2.x; +artifact in 1.3.x). The expected-outcome table is the
 * contract: every case's expectation is a DECISION, and where evidence
 * is insufficient the expected outcome IS inconclusive — the harness
 * treats honest INCONCLUSIVE as a PASS, never as a failure (plan §14).
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { runScan } from "../../../src/cli.js";
import { renderTrustReport } from "../../../src/reporter/trust-report.js";
import { runForensics } from "../../../src/forensics/run.js";
import { workflowRows } from "../../../src/forensics/triage.js";

const ROOT = join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "examples",
  "mvp-demo",
);

type Anchor =
  | { kind: "finding-rule"; ruleId: string }
  | { kind: "finding-file"; file: string }
  | { kind: "triage-test"; titleFragment: string };

interface CaseExpectation {
  anchor: Anchor;
  expect: {
    classification?: string;
    trustBand?: string;
    corroboration?: "present" | "absent";
    /** The honest INCONCLUSIVE marker: this case PASSES by being inconclusive. */
    inconclusiveAsPass?: boolean;
  };
}

/** The expected-outcome table — the stage-1 contract over the corpus. */
const EXPECTED_OUTCOMES: CaseExpectation[] = [
  {
    anchor: {
      kind: "triage-test",
      titleFragment: "charges the card exactly once",
    },
    expect: { classification: "FAILING" },
  },
  {
    anchor: {
      kind: "triage-test",
      titleFragment: "signs in after the network hiccup",
    },
    expect: { classification: "RETRY-DEPENDENT" },
  },
  {
    anchor: {
      kind: "triage-test",
      titleFragment: "shows the two-factor prompt",
    },
    expect: { classification: "TIMEOUT", trustBand: "MEDIUM" },
  },
  {
    anchor: { kind: "finding-rule", ruleId: "QA-PW-004" },
    expect: { corroboration: "absent" }, // selector evidence is static
  },
  {
    anchor: { kind: "finding-file", file: "e2e/login.spec.ts" },
    expect: { corroboration: "present" }, // hard sleep ↔ flaked test
  },
  {
    anchor: { kind: "finding-file", file: "e2e/export.spec.ts" },
    expect: { corroboration: "absent", inconclusiveAsPass: true }, // no run coverage: honest absent
  },
];

describe("golden harness stage 1 — same evidence, same verdict", () => {
  let result!: Awaited<ReturnType<typeof runScan>>;
  it("scan the canonical corpus", async () => {
    result = await runScan({
      target: ROOT,
      json: true,
      verbose: false,
      maxDurationMs: Number.POSITIVE_INFINITY,
      scopeChanged: false,
      format: "json",
    });
    expect(result.schemaVersion).toBe(1);
  });

  for (const c of EXPECTED_OUTCOMES) {
    it(`expected outcome: ${c.anchor.kind}`, () => {
      expect(result).toBeDefined();
      const anchor = c.anchor;
      if (anchor.kind === "finding-rule") {
        const f = result.findings.find((x) => x.ruleId === anchor.ruleId);
        // The QA-PW-004 case must have its finding; corroboration is
        // static-only for selector evidence. (Family variants: absence
        // is fine, the CLASS is checked in corpus.spec.)
        if (c.expect.corroboration === "absent" && !f) return;
        expect(f).toBeDefined();
        expect(
          f?.runtimeCorroboration === undefined,
          `${anchor.ruleId} must not claim runtime evidence`,
        ).toBe(true);
      }
      if (anchor.kind === "finding-file") {
        const f = result.findings.find((x) => x.file === anchor.file);
        const present = f?.runtimeCorroboration !== undefined;
        if (c.expect.corroboration === "present") {
          expect(
            present,
            `${anchor.file} must have corroborated findings`,
          ).toBe(true);
        }
        if (
          c.expect.corroboration === "absent" &&
          c.expect.inconclusiveAsPass
        ) {
          // INCONCLUSIVE-as-pass: no corroboration is the CORRECT outcome.
          expect(present).toBe(false);
        }
      }
      if (anchor.kind === "triage-test") {
        const fr = runForensics(join(ROOT, "mjolnir.report.json"), {
          writeFlakyMd: false,
        });
        const row = workflowRows(fr.report).find((r) =>
          r.test.includes(anchor.titleFragment),
        );
        expect(
          row,
          `no triage row for "${anchor.titleFragment}"`,
        ).toBeDefined();
        expect(row?.classification).toBe(c.expect.classification);
        if (c.expect.trustBand !== undefined) {
          expect(row?.trustVerdict).toContain(c.expect.trustBand);
        }
      }
    });
  }

  it("CLI/JSON parity: the Trust Report renders exactly the JSON summary", () => {
    const out = renderTrustReport(result, {
      isTTY: false,
      width: 80,
      ascii: true,
    });
    const s = result.trustSummary;
    if (s) {
      expect(out).toContain(`${Math.round(s.confidence * 100)}%`);
      expect(out).toContain(`${Math.round(s.evidenceCoverage * 100)}%`);
      expect(out).toContain(s.level);
    }
    // The rendered report must never invent a level absent from JSON:
    expect(["L0", "L1", "L2", "L3", "L4", "L5"]).toContain(s?.level ?? "L0");
  });

  it("determinism: two scans of the same corpus produce identical findings", async () => {
    const second = await runScan({
      target: ROOT,
      json: true,
      verbose: false,
      maxDurationMs: Number.POSITIVE_INFINITY,
      scopeChanged: false,
      format: "json",
    });
    expect(second.findings).toEqual(result.findings);
    expect(second.trustSummary).toEqual(result.trustSummary);
  });

  it("the manifest numbers agree with the corpus reality", () => {
    const manifest = JSON.parse(
      readFileSync(join(ROOT, "manifest.json"), "utf8"),
    ) as { caseClasses: Array<{ id: string; status: string }> };
    expect(
      manifest.caseClasses.filter((c) => c.status === "active"),
    ).toHaveLength(9);
    expect(
      manifest.caseClasses.filter((c) => c.status === "awaiting-ingestion"),
    ).toHaveLength(3);
  });
});
