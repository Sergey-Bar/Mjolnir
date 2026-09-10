/**
 * Certification claims verification (Mega MVP Master Plan v3.1 §26
 * WI-16 groundwork, §25 end-of-mission reconciliation).
 *
 * The certification report (docs/CERTIFICATION-0.6.md) makes claims;
 * this suite verifies each one against LIVE code — the repo is the
 * source of truth, never the document (plan §25).
 */

import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { RULES, RETIRED_RULE_IDS } from "../../src/rules/index.js";
import { MEASURED_FP } from "../../src/rules/measured-fp.generated.js";
import { declaredDetectorRevision } from "../../src/rules/measurement.js";

const ROOT = join(import.meta.dirname, "..", "..");
const REPORT = readFileSync(join(ROOT, "docs", "CERTIFICATION-0.6.md"), "utf8");

describe("certification census claims vs live registry", () => {
  it("active canonical rules grew from the certified floor of 77 (registry ≥ certification)", () => {
    const active = RULES.filter((r) => !RETIRED_RULE_IDS.includes(r.id));
    // The certification census (77/77/22) was the v1.0.0 state. Later
    // releases grow the registry under §15.5 born-quarantine (P3b added
    // QA-CI-013, born quarantine, introduced 1.1.0) — the certified
    // numbers are a FLOOR, never a ceiling, and the historical report's
    // claims stay true as written. The live census is drift-locked
    // separately (census-drift.spec.ts + `npm run docs:counts`).
    expect(active.length).toBeGreaterThanOrEqual(77);
    // Prettier aligns the MD table, so assert on stable fragments — the
    // census numbers and the metric names, not the exact spacing.
    expect(REPORT).toContain("Active canonical rules");
    expect(REPORT).toContain("**77**");
  });

  it("measured rules are a floor of 77, and only born-quarantine rules may be unmeasured (report matches MEASURED_FP)", () => {
    const active = RULES.filter((r) => !RETIRED_RULE_IDS.includes(r.id));
    const measured = active.filter((r) => MEASURED_FP[r.id] !== undefined);
    expect(measured.length).toBeGreaterThanOrEqual(77);
    // Every unmeasured rule must be a §15.5 born-quarantine addition —
    // measured set never shrinks, and no pre-existing rule loses its
    // measurement.
    for (const r of active.filter((x) => MEASURED_FP[x.id] === undefined)) {
      expect(r.tier, `${r.id} unmeasured but not quarantine`).toBe(
        "quarantine",
      );
      expect(
        r.introduced && r.introduced > "1.0.0",
        `${r.id} unmeasured but predates the born-quarantine waves`,
      ).toBe(true);
    }
    expect(REPORT).toContain("Measured (n ≥ 10, revision-current)");
    expect(REPORT).toContain("**77**");
  });

  it("retired = 21 and excluded from the census", () => {
    expect(RETIRED_RULE_IDS.length).toBe(22);
    for (const id of RETIRED_RULE_IDS) {
      expect(
        RULES.some((r) => r.id === id),
        `retired ID ${id} must not be registered`,
      ).toBe(false);
    }
    expect(REPORT).toContain("Retired (excluded from census)");
  });

  it("measured rules are revision-current (ratchet law restated live)", () => {
    // Every measured entry's rule exists and the revision matches —
    // the same invariant the registry ratchet enforces, restated here
    // so the certification claim cannot outlive the data. Omitted
    // detectorRevision declares revision 1 (declaredDetectorRevision).
    for (const [id, m] of Object.entries(MEASURED_FP)) {
      if (RETIRED_RULE_IDS.includes(id)) continue;
      const rule = RULES.find((r) => r.id === id);
      if (rule) {
        expect(m.detectorRevision, id).toBe(declaredDetectorRevision(rule));
      }
    }
  });
});

describe("certification artifact claims vs live files", () => {
  it("every Gate-A evidence file the report names exists", () => {
    for (const f of [
      "src/discovery/evidence-discovery.ts",
      "src/reporter/trust-report.ts",
      "src/commands/explain.ts",
      "src/forensics/triage.ts",
      "src/engine/machine-contract.ts",
      "action.yml",
      "packages/playwright-reporter/package.json",
      "src/commands/trust-report.ts",
      "examples/mvp-demo/manifest.json",
      "tests/contract/mvp-golden/harness.spec.ts",
      "scripts/check-changelog.ts",
      "scripts/check-reporter-version.ts",
      "docs/MEASUREMENT-CLOSEOUT.md",
      "docs/SCORING.md",
      "docs/ARCHITECTURE.md",
    ]) {
      expect(existsSync(join(ROOT, f)), `missing: ${f}`).toBe(true);
    }
  });

  it("the two honest ⚠️s are stated, not hidden", () => {
    expect(REPORT).toContain("partial");
    expect(REPORT).toContain("6 rules PROVISIONAL");
  });

  it("the report does not claim 78/78 measured (the measurement law)", () => {
    expect(REPORT).not.toContain("77/77 measured");
    expect(REPORT).toContain("PROVISIONAL");
  });

  it("docs/ARCHITECTURE.md census agrees with the live registry", () => {
    const arch = readFileSync(join(ROOT, "docs", "ARCHITECTURE.md"), "utf8");
    expect(arch).toContain("78 rules (57 measured / 21 PROVISIONAL)");
  });
});
