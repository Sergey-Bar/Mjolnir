/**
 * Drift lock for the Rule Capability Matrix v0 (Verification Trust
 * Evolution Plan §04/§09, Phase 0 tasks 1–3).
 *
 * docs/RULE-CAPABILITY-MATRIX.md (+ .json) are GENERATED artifacts built
 * from the rule registry + MEASURED_FP + the verdict corpus. Hand-editing
 * them would recreate the exact drift class the generated-docs-drift CI
 * job exists to catch. This spec recomputes the matrix in-memory and
 * fails if the committed files are stale — same pattern as
 * measured-fp-generated.spec.ts (docs/rules/, docs/FP-AUDIT.md).
 *
 * Regenerate: `npm run docs:capability`
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildMatrixJson,
  buildRows,
  crossCheckDeclaredVsMeasured,
  deriveDetectionStrategyEnum,
  deriveSemanticDepth,
  renderMatrixMd,
  wilsonInterval,
  DEFECT_LEDGER,
} from "../scripts/generate-capability-matrix.js";
import { MEASURED_FP } from "../src/rules/measured-fp.generated.js";
import { RULES } from "../src/rules/index.js";

const ROOT = join(import.meta.dirname, "..");
const MD_PATH = join(ROOT, "docs", "RULE-CAPABILITY-MATRIX.md");
const JSON_PATH = join(ROOT, "docs", "RULE-CAPABILITY-MATRIX.json");

describe("capability matrix generation", () => {
  const data = { rows: buildRows(), ...crossCheckDeclaredVsMeasured() };

  it("covers exactly the registry, sorted, no duplicates", () => {
    expect(data.rows.map((r) => r.id).sort()).toEqual(
      RULES.map((r) => r.id).sort(),
    );
    expect(new Set(data.rows.map((r) => r.id)).size).toBe(data.rows.length);
    const sorted = [...data.rows.map((r) => r.id)].sort((a, b) =>
      a.localeCompare(b),
    );
    expect(data.rows.map((r) => r.id)).toEqual(sorted);
  });

  it("renders deterministically for identical input", () => {
    const again = { rows: buildRows(), ...crossCheckDeclaredVsMeasured() };
    expect(renderMatrixMd(data)).toBe(renderMatrixMd(again));
  });

  it("matches the committed markdown — regenerate if this fails", () => {
    const expected = renderMatrixMd(data) + "\n";
    // Prettier reformats the generated file (tables re-aligned); compare
    // cell content, not bytes: strip leading/trailing pipes and collapse
    // padding, per row, ignoring blank-line count. Separator rows get
    // their dash runs collapsed too — prettier pads `---` to the column
    // width, the raw render doesn't, and both mean the same columns.
    // (This comparison only became real once the generator stopped
    // rewriting the file as an import side effect — see the
    // isMainModule guard in scripts/generate-capability-matrix.ts.)
    const normalize = (s: string): string[] =>
      s
        .split("\n")
        .filter((l) => l.startsWith("|"))
        .map((l) =>
          l
            .split("|")
            .map((c) => c.trim().replace(/^-+$/, "-"))
            .join("|"),
        );
    const actual = readFileSync(MD_PATH, "utf8");
    expect(normalize(actual)).toEqual(normalize(expected));
  });

  it("matches the committed JSON — regenerate if this fails", () => {
    const committed = JSON.parse(readFileSync(JSON_PATH, "utf8")) as ReturnType<
      typeof buildMatrixJson
    >;
    expect(committed).toEqual(buildMatrixJson(data));
  });

  it("measured flags agree with MEASURED_FP", () => {
    for (const row of data.rows) {
      const m = MEASURED_FP[row.id];
      expect(row.measured, row.id).toBe(m !== undefined);
      if (m !== undefined) {
        expect(row.n, row.id).toBe(m.n);
        expect(row.fpRate, row.id).toBe(m.fpRate);
      }
    }
  });

  it("UNCLASSIFIED is used for unknown fields, never a fabricated value (plan §04)", () => {
    for (const row of data.rows) {
      expect(row.mutationCoverage, row.id).toBe("UNCLASSIFIED");
      expect(row.recall, row.id).toBe("UNCLASSIFIED");
      expect(row.knownLimitations, row.id).toBe("UNCLASSIFIED");
      expect(row.evidenceRequirements, row.id).toBe("UNCLASSIFIED");
    }
  });

  it("unmeasured rules never carry a claimed FP rate (No False Proof)", () => {
    for (const row of data.rows) {
      if (!row.measured) {
        expect(row.fpRate, row.id).toBe("UNCLASSIFIED");
        expect(row.n, row.id).toBe("UNCLASSIFIED");
        // PROVISIONAL (plan §11.2 Step 2) = extended-or-omitted tier
        // without a valid measurement; UNMEASURED = quarantine without
        // one. Both are unclaimed statuses — never a measured band.
        expect(["PROVISIONAL", "UNMEASURED"]).toContain(row.status);
        if (row.tier === "extended") {
          expect(row.status, row.id).toBe("PROVISIONAL");
        }
        if (row.tier === "quarantine") {
          expect(row.status, row.id).toBe("UNMEASURED");
        }
      }
    }
  });

  it("every measured row's status band follows the tier FP ceilings", () => {
    for (const row of data.rows) {
      if (typeof row.fpRate !== "number") continue;
      const expected =
        row.fpRate <= 0.1
          ? "MEASURED-CORE"
          : row.fpRate <= 0.3
            ? "MEASURED-EXTENDED"
            : "MEASURED-QUARANTINE";
      expect(row.status, row.id).toBe(expected);
    }
  });

  it("the D9 cross-check is consistent with the registry + MEASURED_FP", () => {
    // Recompute independently to catch a silent generator regression.
    const declaredQuarantine = new Set(
      RULES.filter((r) => r.tier === "quarantine").map((r) => r.id),
    );
    for (const rule of RULES) {
      const m = MEASURED_FP[rule.id];
      const tier = rule.tier ?? "core";
      if (m && m.fpRate > 0.3 && tier !== "quarantine") {
        expect(
          data.d9Suspects.some((s) => s.ruleId === rule.id),
          `${rule.id} measured FP > 30% without quarantine must appear as a D9 suspect`,
        ).toBe(true);
      }
    }
    expect(declaredQuarantine.size).toBeGreaterThan(0);
  });

  it("the D3 demotion list names unmeasured effective-core rules only", () => {
    const byId = new Map(RULES.map((r) => [r.id, r]));
    for (const id of data.unmeasuredInCore) {
      const rule = byId.get(id);
      expect(rule, `${id} is not in the registry`).toBeDefined();
      expect(rule?.tier ?? "core", id).toBe("core");
      expect(MEASURED_FP[id], id).toBeUndefined();
    }
  });

  it("the defect ledger matches plan §02 exactly (IDs and owning phases)", () => {
    expect(DEFECT_LEDGER.map((d) => d.id)).toEqual([
      "D1",
      "D2",
      "D3",
      "D4",
      "D5",
      "D6",
      "D7",
      "D8",
    ]);
    expect(DEFECT_LEDGER.map((d) => d.targetPhase)).toEqual([
      "0.5",
      "0.5",
      "1",
      "0",
      "1",
      "0 (contract), 2 (migration)",
      // D7 closed by the Phase 5 FrameworkDimension (plan §15.1).
      "5 (closed)",
      "1",
    ]);
  });

  it("ledger D5/QA-PW-101 is resolved: the UNSURE park was adjudicated (§11.5), the rule is measured", () => {
    // QA-PW-101's 20 verdicts were parked UNSURE (the D5 corpus-bias
    // defect: "QA-PW-101 parked on 20 UNSURE verdicts"). The 2026-09-01
    // adjudication pass (plan §11.5) resolved every row from source:
    // 20 TP — next-auth's session-sync sleeps and sveltejs/kit's 100 ms
    // request-observation windows are load-bearing, false-pass-prone hard
    // sleeps. UNSURE never counted into n (plan §08); adjudicated rows
    // do. The rule is now measured at 0% FP, n=20, and sits in effective
    // core via the measurement-dependent default.
    const m = MEASURED_FP["QA-PW-101"];
    expect(m).toBeDefined();
    expect(m?.n).toBe(20);
    expect(m?.fpRate).toBe(0);
    expect(m?.detectorRevision).toBe(1);
  });

  it("detection-strategy enum is enforced from the registry (D6 closed in Phase 2)", () => {
    // Since the Phase 2 migration, `detectionStrategy` IS the §09.6
    // enum — the declared value passes through; only an undeclared or
    // out-of-contract value renders UNCLASSIFIED (no fabricated claims).
    expect(deriveDetectionStrategyEnum("LEXICAL")).toBe("LEXICAL");
    expect(deriveDetectionStrategyEnum("AST")).toBe("AST");
    expect(deriveDetectionStrategyEnum("SEMANTIC")).toBe("SEMANTIC");
    expect(deriveDetectionStrategyEnum("FRAMEWORK")).toBe("FRAMEWORK");
    expect(deriveDetectionStrategyEnum("RUNTIME")).toBe("RUNTIME");
    expect(deriveDetectionStrategyEnum("regex pattern")).toBe("UNCLASSIFIED");
    expect(deriveDetectionStrategyEnum(undefined)).toBe("UNCLASSIFIED");

    // Every registry rule declares the enum — no UNCLASSIFIED rows.
    for (const row of data.rows) {
      expect(row.detectionStrategy, row.id).not.toBe("UNCLASSIFIED");
      expect(row.detectionStrategyEnum, row.id).toBe(row.detectionStrategy);
    }

    expect(deriveSemanticDepth("LEXICAL")).toBe("Low");
    expect(deriveSemanticDepth("AST")).toBe("Medium");
    expect(deriveSemanticDepth("SEMANTIC")).toBe("High");
    expect(deriveSemanticDepth("FRAMEWORK")).toBe("UNCLASSIFIED");
    expect(deriveSemanticDepth("UNCLASSIFIED")).toBe("UNCLASSIFIED");
  });

  it("Wilson intervals bracket the point estimate and stay in [0,1]", () => {
    // Spot checks: 0/20, 20/20, 1/23 (the QA-PY-002 shape), plus monotonicity.
    const zero = wilsonInterval(0, 20);
    expect(zero.ciLow).toBe(0);
    expect(zero.ciHigh).toBeGreaterThan(0);
    expect(zero.ciHigh).toBeLessThan(0.2);

    const one = wilsonInterval(20, 20);
    expect(one.ciHigh).toBe(1);
    expect(one.ciLow).toBeGreaterThan(0.8);

    const rare = wilsonInterval(1, 23);
    expect(rare.ciLow).toBeLessThan(rare.ciHigh);
    expect(rare.ciLow).toBeGreaterThanOrEqual(0);
    expect(rare.ciHigh).toBeLessThanOrEqual(1);

    const degenerate = wilsonInterval(5, 0);
    expect(degenerate).toEqual({ ciLow: 0, ciHigh: 1 });
  });

  it("the Wilson CI used for the §20.2 comparison contract stays exported and stable", () => {
    // §20.2 stores ciLow/ciHigh per measurement. Lock the numeric
    // behavior of one known case so a silent change can't slip in.
    expect(wilsonInterval(0, 20)).toEqual({
      ciLow: 0,
      ciHigh: expect.any(Number),
    });
    expect(wilsonInterval(0, 20).ciHigh).toBeCloseTo(0.1611, 3);
  });
});
