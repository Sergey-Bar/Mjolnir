/**
 * Category integrity + measurement consistency checks
 * (certification-audit Phase 1.4 D6 and Phase 4.1 D7 anti-false-green
 * tests, §23).
 *
 * Category integrity: an external rule source may carry a category
 * string outside RULE_CATEGORIES — the check must catch it at runtime
 * (D6 makes the internal registry compile-time safe; this is the
 * external-input backstop).
 *
 * Measurement consistency (D7): MEASURED_FP is the shipped truth, but a
 * drifted corpus (n mismatch), a stale sidecar revision, or a sidecar
 * row for an unregistered rule must each FAIL — a measurement that no
 * longer matches its evidence is a lie about evidence.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  checkCategoryIntegrity,
  checkMeasurementConsistency,
  measurementBlock,
} from "../../src/commands/doctor.js";
import { isValidCategory } from "../../src/types.js";
import { minimalRules } from "../engine/helpers.js";

let tmpDirs: string[] = [];
afterEach(() => {
  for (const d of tmpDirs) rmSync(d, { recursive: true, force: true });
  tmpDirs = [];
});

describe("checkCategoryIntegrity (D6)", () => {
  it("passes the real registry (no invented categories, count reported)", () => {
    const result = checkCategoryIntegrity();
    expect(result.ok).toBe(true);
    expect(result.status).toBe("pass");
    expect(result.details[0]).toContain("categories in use");
  });

  it("FAILS on a rule whose category is outside RULE_CATEGORIES", () => {
    const result = checkCategoryIntegrity([
      minimalRules.one(),
      {
        ...minimalRules.one(),
        id: "QA-T-903",
        category: "QA-MADE-UP" as never,
      },
    ]);
    expect(result.ok).toBe(false);
    expect(result.details.join("\n")).toContain("not in RULE_CATEGORIES");
    expect(result.details.join("\n")).toContain("QA-MADE-UP");
  });
});

describe("isValidCategory (shared Phase 1.2 helper)", () => {
  it("accepts every RULE_CATEGORIES value and rejects unknown/missing", () => {
    for (const c of [
      "QA-TEST",
      "QA-TQUAL",
      "QA-PW",
      "QA-CI",
      "QA-PY",
      "QA-ENV",
      "QA-JV",
      "QA-CS",
      "QA-CYP",
      "QA-SE",
      "QA-WDIO",
      "QA-PPTR",
      "QA-APM",
    ]) {
      expect(isValidCategory(c)).toBe(true);
    }
    expect(isValidCategory("QA-NOPE")).toBe(false);
    expect(isValidCategory(undefined)).toBe(false);
    expect(isValidCategory("qa-test")).toBe(false); // case-sensitive API
  });
});

describe("checkMeasurementConsistency (D7)", () => {
  function makeCorpus(rows: Array<{ ruleId: string; verdict: string }>): {
    verdictsDir: string;
    sidecarPath: string;
  } {
    const root = mkdtempSync(join(tmpdir(), "mjolnir-meascons-"));
    tmpDirs.push(root);
    const verdictsDir = join(root, "tests", "corpus", "verdicts");
    mkdirSync(verdictsDir, { recursive: true });
    if (rows.length > 0) {
      writeFileSync(
        join(verdictsDir, "qa-test.jsonl"),
        rows.map((r) => JSON.stringify(r)).join("\n") + "\n",
      );
    }
    const sidecarPath = join(
      root,
      "tests",
      "corpus",
      "detector-revisions.json",
    );
    writeFileSync(sidecarPath, JSON.stringify({}));
    return { verdictsDir, sidecarPath };
  }

  it("INCONCLUSIVE (never pass) when the verdicts directory is missing", () => {
    const root = mkdtempSync(join(tmpdir(), "mjolnir-meascons-"));
    tmpDirs.push(root);
    const result = checkMeasurementConsistency(
      join(root, "tests", "corpus", "verdicts"),
      join(root, "tests", "corpus", "detector-revisions.json"),
      [minimalRules.one()],
    );
    expect(result.ok).toBe(false);
    expect(result.status).toBe("inconclusive");
  });

  it("FAILS on a MEASURED_FP entry whose n ≠ the live classified count", () => {
    // The synthetic corpus gives QA-T-900 three classified rows; the real
    // MEASURED_FP is bypassed by seeding a mismatch via the live-side
    // check: QA-T-900 HAS no MEASURED_FP entry in the shipped map, so we
    // prove the mechanism on a rule that does — QA-CI-001 (n=19) — by
    // giving it a WRONG count in the live corpus.
    const { verdictsDir, sidecarPath } = makeCorpus([
      { ruleId: "QA-CI-001", verdict: "TP" },
    ]);
    const result = checkMeasurementConsistency(verdictsDir, sidecarPath, [
      minimalRules.one(),
      { ...minimalRules.one(), id: "QA-CI-001" },
    ]);
    expect(result.ok).toBe(false);
    expect(result.details.join("\n")).toMatch(
      /MEASURED_FP\.n=\d+ but the live corpus has 1/,
    );
  });

  it("FAILS on a sidecar revision disagreeing with MEASURED_FP", () => {
    const { verdictsDir, sidecarPath } = makeCorpus([]);
    // Sidecar claims revision 99 for QA-CI-001; the shipped MEASURED_FP
    // declares 2 — mismatch must fail.
    writeFileSync(
      sidecarPath,
      JSON.stringify({ "QA-CI-001": { detectorRevision: 99 } }),
    );
    const result = checkMeasurementConsistency(verdictsDir, sidecarPath, [
      { ...minimalRules.one(), id: "QA-CI-001" },
    ]);
    expect(result.ok).toBe(false);
    expect(result.details.join("\n")).toContain("MEASURED_FP revision");
    expect(result.details.join("\n")).toContain("≠ sidecar 99");
  });

  it("FAILS on a sidecar row for an unregistered rule", () => {
    const { verdictsDir, sidecarPath } = makeCorpus([]);
    writeFileSync(
      sidecarPath,
      JSON.stringify({ "QA-GHOST-555": { detectorRevision: 1 } }),
    );
    const result = checkMeasurementConsistency(verdictsDir, sidecarPath, [
      minimalRules.one(),
    ]);
    expect(result.ok).toBe(false);
    expect(result.details.join("\n")).toContain("unregistered rule");
  });

  it("FAILS on an unparseable verdict row (corpus integrity arm)", () => {
    const root = mkdtempSync(join(tmpdir(), "mjolnir-meascons-"));
    tmpDirs.push(root);
    const verdictsDir = join(root, "tests", "corpus", "verdicts");
    mkdirSync(verdictsDir, { recursive: true });
    writeFileSync(join(verdictsDir, "broken.jsonl"), "{ not json\n");
    // Sidecar present-but-empty: the parse failure must surface as FAIL,
    // not be masked by the missing-sidecar INCONCLUSIVE arm.
    writeFileSync(
      join(root, "tests", "corpus", "detector-revisions.json"),
      JSON.stringify({}),
    );
    const result = checkMeasurementConsistency(
      verdictsDir,
      join(root, "tests", "corpus", "detector-revisions.json"),
      [minimalRules.one()],
    );
    expect(result.ok).toBe(false);
    expect(result.details.join("\n")).toContain("unparseable verdict row");
  });
});

describe("measurementBlock (Phase 4.3)", () => {
  it("the real registry reconciles: measured + unmeasured = total", () => {
    const block = measurementBlock();
    expect(block.measured + block.unmeasured).toBe(block.total);
    expect(block.total).toBeGreaterThan(0);
  });

  it("a registry with no measurements reports zero measured", () => {
    const block = measurementBlock([minimalRules.one()]);
    expect(block).toEqual({
      measured: 0,
      unmeasured: 1,
      total: 1,
      quarantine: 0,
    });
  });

  it("quarantine counts only measured quarantine rules", () => {
    // QA-CI-001 IS measured in the shipped map (n=19, detectorRevision 2)
    // — the synthetic rule must declare that same revision to count as
    // measured, and the quarantine tier to land in the quarantine census.
    const rule = minimalRules.one({
      id: "QA-CI-001",
      tier: "quarantine",
      detectorRevision: 2,
    });
    const block = measurementBlock([rule]);
    expect(block.measured).toBe(1);
    expect(block.quarantine).toBe(1);
  });
});
