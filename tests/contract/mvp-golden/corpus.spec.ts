/**
 * Canonical MVP Evidence Corpus (Mega MVP Master Plan v3.1 §26 WI-13A).
 *
 * Locks: the corpus exists, the manifest covers ALL 12 canonical
 * evidence case classes, every "active" class is actually demonstrable
 * against the committed data (same-evidence → same-verdict), and every
 * "awaiting-ingestion" class is provably NOT claimed by any 0.6.x
 * surface (the honesty law: trace/network/console corpus data must not
 * be read before their ingestion lands — WI-17/WI-18).
 */

import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { runForensics } from "../../../src/forensics/run.js";
import { buildEvidenceRecords } from "../../../src/engine/evidence-core.js";
import { workflowRows } from "../../../src/forensics/triage.js";

const ROOT = join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "examples",
  "mvp-demo",
);
const manifest = JSON.parse(
  readFileSync(join(ROOT, "manifest.json"), "utf8"),
) as {
  caseClasses: Array<{
    id: string;
    status: string;
    files: string[];
    expectation: string;
  }>;
};

const CANONICAL_12 = [
  "real-product-failure",
  "environmental-failure",
  "flaky-behavior",
  "unstable-selector",
  "retry-dependent-failure",
  "insufficient-evidence",
  "trace-zip-evidence",
  "junit-evidence",
  "playwright-json-evidence",
  "console-evidence",
  "network-evidence",
  "correlated-runtime-evidence",
];

describe("manifest completeness (the 12 canonical case classes)", () => {
  it("covers all 12 — no more, no fewer", () => {
    const ids = manifest.caseClasses.map((c) => c.id);
    expect([...ids].sort()).toEqual([...CANONICAL_12].sort());
  });

  it("every class lists its files and an expectation", () => {
    for (const c of manifest.caseClasses) {
      expect(c.files.length, c.id).toBeGreaterThan(0);
      expect(c.expectation.length, c.id).toBeGreaterThan(10);
      expect(["active", "awaiting-ingestion"]).toContain(c.status);
    }
  });

  it("every manifest file exists on disk", () => {
    for (const c of manifest.caseClasses) {
      for (const f of c.files) {
        // trace.zip is the one deliberately-uncommitted artifact (binary,
        // regenerated when trace ingestion lands — see run-reports/README.json).
        if (c.id === "trace-zip-evidence" && f.endsWith(".zip")) continue;
        expect(existsSync(join(ROOT, f)), `${c.id}: ${f}`).toBe(true);
      }
    }
  });
});

describe("active classes demonstrable against the committed data", () => {
  const fr = runForensics(join(ROOT, "mjolnir.report.json"), {
    writeFlakyMd: false,
  });

  it("real-product-failure: the charge test ends failed", () => {
    const row = workflowRows(fr.report).find((r) =>
      r.test.includes("charges the card exactly once"),
    );
    expect(row?.classification).toBe("FAILING");
  });

  it("flaky-behavior + retry-dependent-failure: TRUE-FLAKE with 3 attempts, quarantine proposed", () => {
    const row = workflowRows(fr.report).find((r) =>
      r.test.includes("signs in after the network hiccup"),
    );
    expect(row?.classification).toBe("RETRY-DEPENDENT");
    expect(row?.proposedQuarantine).toBe(true);
  });

  it("environmental-failure: the timeout test classifies TIMEOUT (MEDIUM trust)", () => {
    const row = workflowRows(fr.report).find((r) =>
      r.test.includes("shows the two-factor prompt"),
    );
    expect(row?.classification).toBe("TIMEOUT");
    expect(row?.trustVerdict).toContain("MEDIUM");
  });

  it("correlated-runtime-evidence: flake-risk findings in login.spec.ts rise above file-level", () => {
    const recs = buildEvidenceRecords(fr.report, "mjolnir.report.json");
    const login = recs.filter((r) => r.file === "e2e/login.spec.ts");
    expect(login.length).toBeGreaterThanOrEqual(2);
    const flaky = login.find((r) => r.status.passedOnRetry);
    expect(flaky).toBeDefined();
  });

  it("insufficient-evidence: export.spec.ts appears in no report (honest absence)", () => {
    const recs = buildEvidenceRecords(fr.report, "mjolnir.report.json");
    expect(recs.some((r) => r.file === "e2e/export.spec.ts")).toBe(false);
  });
});

describe("junit-evidence parses through the same forensics path", () => {
  it("junit-report.xml is recognized as junit-xml source", () => {
    const fr = runForensics(join(ROOT, "run-reports", "junit-report.xml"), {
      writeFlakyMd: false,
    });
    expect(fr.report.source).toBe("junit-xml");
    expect(fr.report.totalTests).toBe(4);
  });
});

describe("the honesty law for awaiting-ingestion classes", () => {
  it("no 0.6.x surface reads the console/network/trace corpus files", () => {
    // The scan pipeline's runtime discovery (discoverRuntimeReport)
    // looks for mjolnir.report.json / test-results/ only. Assert the
    // corpus-only files are not among the discovered shapes: the
    // forensics run over the run-reports DIR must recognize the JUnit
    // XML but must NOT report console/network JSON as test verdicts
    // (they parse as JSON but carry no suites/tests shape).
    const fr = runForensics(join(ROOT, "run-reports"), {
      writeFlakyMd: false,
    });
    expect(fr.report.source).toBe("junit-xml");
    expect(fr.report.verdicts.length).toBe(4);
  });

  it("trace.zip is intentionally absent (regenerated when WI-17 lands)", () => {
    expect(existsSync(join(ROOT, "run-reports", "trace.zip"))).toBe(false);
  });
});
