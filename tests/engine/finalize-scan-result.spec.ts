/**
 * Evidence is persisted, and trust is re-derivable (plan V5-011, G-V5-031).
 *
 * The pipeline normalized every runtime report into evidence records and then
 * threw the array away — `buildEvidenceRecords(...)` on its own line, value
 * unused. The records existed for the duration of one expression. Everything
 * downstream that needed them re-parsed the report itself, which is not just
 * wasteful: a re-derivation reading a report that has since changed produces a
 * projection that disagrees with the verdict it claims to explain, and nothing
 * compares the two.
 *
 * These specs assert the three properties that make the derivation
 * trustworthy: the records survive on the result, finalize is deterministic and
 * reads only the persisted records, and the empty cases stay distinguishable
 * from each other.
 */

import { describe, expect, it } from "vitest";

import {
  canCorroborate,
  finalizeScanResult,
} from "../../src/engine/finalize-scan-result.js";
import type { EvidenceRecord } from "../../src/engine/evidence-core.js";

function record(overrides: Partial<EvidenceRecord> = {}): EvidenceRecord {
  return {
    source: "jest-json",
    artifact: "reports/jest.json",
    file: "test/a.spec.ts",
    title: "passes",
    line: 10,
    status: {
      final: "passed",
      failed: false,
      retried: false,
      passedOnRetry: false,
      skipped: false,
      timedOut: false,
    },
    attempts: 1,
    durationMs: 5,
    errors: [],
    attachments: [],
    provenance: { core: "evidence-core@1", ingest: "mjolnir.forensics" },
    ...overrides,
  };
}

describe("finalize reads the persisted records, not the report", () => {
  it("derives counts from the records it was given", () => {
    const finalized = finalizeScanResult({
      records: [
        record(),
        record({
          title: "flaky",
          line: 20,
          status: {
            final: "passed",
            failed: true,
            retried: true,
            passedOnRetry: true,
            skipped: false,
            timedOut: false,
          },
          attempts: 3,
        }),
        record({
          title: "skipped",
          line: 30,
          status: {
            final: "skipped",
            failed: false,
            retried: false,
            passedOnRetry: false,
            skipped: true,
            timedOut: false,
          },
        }),
      ],
      artifact: "reports/jest.json",
      findings: [],
    });
    expect(finalized.counts).toEqual({
      total: 3,
      failed: 1,
      flaky: 1,
      skipped: 1,
      timedOut: 0,
    });
    expect(finalized.state).toBe("PROVEN");
    expect(finalized.coveredFiles).toEqual(["test/a.spec.ts"]);
    expect(finalized.sources).toEqual(["jest-json"]);
  });

  it("is order-independent, so a re-derivation cannot depend on read order", () => {
    const a = record({ title: "a", line: 1 });
    const b = record({ title: "b", line: 2 });
    const forward = finalizeScanResult({
      records: [a, b],
      artifact: "r.json",
      findings: [],
    });
    const reversed = finalizeScanResult({
      records: [b, a],
      artifact: "r.json",
      findings: [],
    });
    expect(reversed.records).toEqual(forward.records);
    expect(reversed.counts).toEqual(forward.counts);
  });

  it("is pure: the same input always produces the same output", () => {
    const input = {
      records: [record({ title: "x", line: 5 })],
      artifact: "r.json",
      findings: [],
    };
    expect(JSON.stringify(finalizeScanResult(input))).toBe(
      JSON.stringify(finalizeScanResult(input)),
    );
  });

  it("does not mutate the records it was handed", () => {
    const records = [
      record({ title: "z", line: 9 }),
      record({ title: "a", line: 1 }),
    ];
    const snapshot = JSON.stringify(records);
    finalizeScanResult({ records, artifact: "r.json", findings: [] });
    expect(JSON.stringify(records)).toBe(snapshot);
  });
});

describe("the empty cases stay distinguishable", () => {
  it("no report found is NOT_FOUND, never an empty passing report", () => {
    // The distinction that matters: "we found no runtime report" is not
    // evidence that the suite passed. Reporting it as an empty report would
    // let a scan with zero runtime coverage read as corroborated.
    const finalized = finalizeScanResult({
      records: [],
      artifact: null,
      findings: [],
    });
    expect(finalized.state).toBe("NOT_FOUND");
    expect(finalized.counts.total).toBe(0);
    expect(canCorroborate(finalized)).toBe(false);
  });

  it("a report that exists but carries no tests is EMPTY_REPORT", () => {
    const finalized = finalizeScanResult({
      records: [],
      artifact: "reports/empty.json",
      findings: [],
    });
    expect(finalized.state).toBe("EMPTY_REPORT");
    expect(canCorroborate(finalized)).toBe(false);
  });

  it("only a proven report can corroborate", () => {
    expect(
      canCorroborate(
        finalizeScanResult({
          records: [record()],
          artifact: "r.json",
          findings: [],
        }),
      ),
    ).toBe(true);
  });
});

describe("the scan pipeline persists the records (the no-discard property)", () => {
  it("never calls buildEvidenceRecords for its return value alone", async () => {
    // The shape of the original defect, asserted on the source: a call whose
    // value is dropped. Any future refactor that reintroduces it fails here
    // rather than silently making the core a throwaway again.
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const source = readFileSync(
      join(
        import.meta.dirname,
        "..",
        "..",
        "src",
        "engine",
        "scan-pipeline.ts",
      ),
      "utf8",
    );
    const discarded = source.match(/^\s*buildEvidenceRecords\([^;]*\);\s*$/m);
    expect(
      discarded,
      "buildEvidenceRecords is called for its value and the value is dropped — that is G-V5-031",
    ).toBeNull();
  });

  it("the report type declares the evidence slot so consumers can read it", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const types = readFileSync(
      join(import.meta.dirname, "..", "..", "src", "types.ts"),
      "utf8",
    );
    expect(types).toMatch(/evidence\?: \{/);
    expect(types).toMatch(/records: Array<EvidenceRecordShape>/);
    // And the artifact, so a consumer knows WHICH run the records came from.
    expect(types).toMatch(/artifact: string \| null/);
  });
});
