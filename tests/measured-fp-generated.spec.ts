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
} from "../scripts/generate-fp-audit-table.js";
import { MEASURED_FP } from "../src/rules/measured-fp.generated.js";
import { RULES } from "../src/rules/index.js";

const ROOT = join(import.meta.dirname, "..");
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
    // Prettier reformats the generated file; compare the data, not bytes.
    const dataLines = (s: string) =>
      s
        .split("\n")
        .filter((l) => /^\s*"QA-/.test(l))
        .map((l) => l.trim().replace(/,\s*$/, ""))
        .sort();
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
    // default), never undefined — the map is the shipped contract.
    const verdicts: Verdict[] = (
      Array.from({ length: 10 }, () => ({
        ruleId: "QA-CS-101",
        verdict: "TP" as const,
      })) as Verdict[]
    ).concat([{ ruleId: "QA-CS-101", verdict: "FP" }]);
    const rendered = renderMeasuredFpModule(verdicts);
    expect(rendered).toContain("{ fpRate: 0.091, n: 11, detectorRevision: 1 }");
  });
});
