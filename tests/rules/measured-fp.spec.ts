/**
 * Drift lock for `src/rules/measured-fp.generated.ts`.
 *
 * That file bakes the measured false-positive rates into the shipped
 * package — `tests/corpus/verdicts/*.jsonl` is not in the npm tarball,
 * so the installed CLI (the scan footer, `mjolnir rules --unmeasured`,
 * `explain`, `doctor`) has no other way to know which rules are backed
 * by real classification. This test recomputes from the verdicts and
 * fails if the committed file is stale — same pattern as docs/rules/,
 * docs/FP-AUDIT.md and the README hero SVG.
 *
 * Regenerate: `npm run fp-audit:generate`
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  computeRuleStats,
  loadDetectorRevisions,
  MEASURED_THRESHOLD,
  renderMeasuredFpModule,
  type Verdict,
} from "../../scripts/generate-fp-audit-table.js";
import { compareFpMeasurements } from "../../scripts/lib/wilson.js";
import { MEASURED_FP } from "../../src/rules/measured-fp.generated.js";
import { RULES } from "../../src/rules/index.js";

const ROOT = join(import.meta.dirname, "..", "..");
const VERDICTS_DIR = join(ROOT, "tests", "corpus", "verdicts");

function loadVerdicts(): Verdict[] {
  const all: Verdict[] = [];
  for (const f of readdirSync(VERDICTS_DIR).filter((n) =>
    n.endsWith(".jsonl"),
  )) {
    for (const line of readFileSync(join(VERDICTS_DIR, f), "utf8")
      .split("\n")
      .filter((l) => l.trim())) {
      try {
        const v = JSON.parse(line) as Verdict;
        if (v.verdict) all.push(v);
      } catch {
        /* skip malformed */
      }
    }
  }
  return all;
}

describe("measured-fp.generated.ts", () => {
  const verdicts = loadVerdicts();

  it("matches what the verdicts currently say — regenerate if this fails", () => {
    const expected = renderMeasuredFpModule(verdicts);
    const actual = readFileSync(
      join(ROOT, "src", "rules", "measured-fp.generated.ts"),
      "utf8",
    );
    // Prettier reformats the generated file (long entries wrap onto
    // multiple lines); compare the DATA, not bytes: pull each rule's
    // entry block, normalize its field list, sort.
    const dataLines = (s: string) => {
      const out: string[] = [];
      for (const m of s.matchAll(/"(QA-[A-Z]+-\d+)":\s*\{([^}]*)\}/g)) {
        const fields = (m[2] ?? "")
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean)
          .sort();
        out.push(`${m[1]}: ${fields.join(", ")}`);
      }
      return out.sort();
    };
    expect(dataLines(actual)).toEqual(dataLines(expected));
  });

  it("contains exactly the rules with >= 10 classified verdicts", () => {
    const measuredIds = new Set(
      computeRuleStats(verdicts)
        .filter((s) => s.classified >= MEASURED_THRESHOLD)
        .map((s) => s.ruleId),
    );
    expect(new Set(Object.keys(MEASURED_FP))).toEqual(measuredIds);
  });

  it("every key is a real, registered rule ID", () => {
    const registry = new Set(RULES.map((r) => r.id));
    for (const id of Object.keys(MEASURED_FP)) {
      expect(registry.has(id), `${id} is not in the registry`).toBe(true);
    }
  });

  it("every rate is a plausible probability and n meets the threshold", () => {
    for (const [id, m] of Object.entries(MEASURED_FP)) {
      expect(m.fpRate, id).toBeGreaterThanOrEqual(0);
      expect(m.fpRate, id).toBeLessThanOrEqual(1);
      expect(m.n, id).toBeGreaterThanOrEqual(MEASURED_THRESHOLD);
    }
  });

  it("the README's headline coverage number matches the map size", () => {
    const readme = readFileSync(join(ROOT, "README.md"), "utf8");
    const n = Object.keys(MEASURED_FP).length;
    expect(
      readme,
      `README should state "${n} of ${RULES.length}" rules measured`,
    ).toContain(`${n} of ${RULES.length}`);
  });
});

describe("detector-revisions.json sidecar (Verification Trust Evolution Plan §07/§11.3)", () => {
  const revisions = loadDetectorRevisions();

  it("covers exactly the measured set — no missing entries, no strays", () => {
    // A rule measured but missing from the sidecar means a measurement
    // shipping without an implementation revision (the D8 hole); a stray
    // sidecar entry names a rule that no longer carries a measurement.
    expect(Object.keys(revisions).sort()).toEqual(
      Object.keys(MEASURED_FP).sort(),
    );
  });

  it("every MEASURED_FP entry carries a positive integer revision", () => {
    for (const [id, m] of Object.entries(MEASURED_FP)) {
      expect(
        Number.isInteger(m.detectorRevision),
        `${id}: detectorRevision must be an integer`,
      ).toBe(true);
      expect(m.detectorRevision, id).toBeGreaterThanOrEqual(1);
    }
  });

  it("the generated map's revisions match the sidecar exactly", () => {
    for (const [id, m] of Object.entries(MEASURED_FP)) {
      expect(m.detectorRevision, id).toBe(revisions[id]);
    }
  });

  it("every sidecar entry is a valid registry rule ID", () => {
    const registry = new Set(RULES.map((r) => r.id));
    for (const id of Object.keys(revisions)) {
      expect(registry.has(id), `${id} is not in the registry`).toBe(true);
    }
  });

  it("a newly measured rule without a sidecar entry defaults to revision 1", () => {
    // The generator stamps loadDetectorRevisions() output; a rule absent
    // from the sidecar must default to 1 (documented first-generation
    // default), never undefined — the map is the shipped contract. The
    // entry also carries its §20.2 Wilson interval.
    const verdicts: Verdict[] = (
      Array.from({ length: 10 }, () => ({
        ruleId: "QA-CS-101",
        verdict: "TP" as const,
      })) as Verdict[]
    ).concat([{ ruleId: "QA-CS-101", verdict: "FP" }]);
    const rendered = renderMeasuredFpModule(verdicts);
    expect(rendered).toMatch(
      /"QA-CS-101":\s*\{\s*fpRate:\s*0\.091,\s*n:\s*11,\s*detectorRevision:\s*1,\s*ciLow:\s*[\d.]+,\s*ciHigh:\s*[\d.]+,?\s*\}/,
    );
  });
});

describe("§20.2 Wilson intervals in the generated artifact", () => {
  it("every measurement carries a 95% Wilson interval bracketing its point estimate", () => {
    for (const [id, m] of Object.entries(MEASURED_FP)) {
      expect(m.ciLow, id).toBeGreaterThanOrEqual(0);
      expect(m.ciHigh, id).toBeLessThanOrEqual(1);
      expect(
        m.ciLow,
        `${id}: ciLow ${m.ciLow} must not exceed the point estimate ${m.fpRate} (±4dp rounding)`,
      ).toBeLessThanOrEqual(m.fpRate + 0.0005);
      expect(
        m.ciHigh,
        `${id}: ciHigh ${m.ciHigh} must not fall below the point estimate ${m.fpRate} (±4dp rounding)`,
      ).toBeGreaterThanOrEqual(m.fpRate - 0.0005);
      expect(m.ciLow, id).toBeLessThanOrEqual(m.ciHigh);
    }
  });
});

describe("§20.2 regression governance: compareFpMeasurements", () => {
  it("flags a regression only on disjoint-bad-direction intervals AND a worse point estimate", () => {
    // 4/20 → 16/20: point estimate 20% → 80%, intervals
    // [0.0573, 0.4366] vs [0.5438, 0.9307] — disjoint in the bad direction.
    const regressed = compareFpMeasurements(
      { fpRate: 0.2, n: 20 },
      { fpRate: 0.8, n: 20 },
    );
    expect(regressed.regressed).toBe(true);
    expect(regressed.comparable).toBe(true);

    // 10/20 → 11/20: point estimate worsened, intervals still overlap
    // heavily — noise within tolerance must NOT fail CI.
    const noise = compareFpMeasurements(
      { fpRate: 0.5, n: 20 },
      { fpRate: 0.55, n: 20 },
    );
    expect(noise.regressed).toBe(false);
  });

  it("an improved rate is never a regression even when intervals are disjoint", () => {
    const improved = compareFpMeasurements(
      { fpRate: 0.8, n: 20 },
      { fpRate: 0.45, n: 20 },
    );
    expect(improved.regressed).toBe(false);
  });

  it("n < 10 on either side is informational only (§20.2)", () => {
    const smallOld = compareFpMeasurements(
      { fpRate: 0.1, n: 9 },
      { fpRate: 0.9, n: 20 },
    );
    expect(smallOld.comparable).toBe(false);
    expect(smallOld.regressed).toBe(false);

    const smallNew = compareFpMeasurements(
      { fpRate: 0.1, n: 20 },
      { fpRate: 0.9, n: 9 },
    );
    expect(smallNew.comparable).toBe(false);
    expect(smallNew.regressed).toBe(false);
  });

  it("a missing prior measurement is informational, never a failure", () => {
    const fresh = compareFpMeasurements(undefined, { fpRate: 1, n: 20 });
    expect(fresh.regressed).toBe(false);
    expect(fresh.comparable).toBe(false);
  });
});
