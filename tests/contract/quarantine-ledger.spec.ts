/**
 * QUARANTINE-REMEDIATION.md drift-lock (product-gap master plan P6 —
 * plan 1789009691197 R3). The ledger is GENERATED from the live registry:
 * a hand edit to the tables, a quarantine rule missing from the ledger,
 * or a disposition row that no longer matches the shipped detector
 * revision must fail CI.
 *
 * Guarded-claims design mirrors the other docs drift-locks: the live
 * registry is the source of truth, the file must agree with it, and the
 * prose dispositions for the P6 rework set are pinned because they are
 * evidence claims.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { RULES, RETIRED_RULE_IDS } from "../../src/rules/index.js";
import type { QADoctorRule } from "../../src/rules/rule.js";
import { MEASURED_FP } from "../../src/rules/measured-fp.generated.js";
import { declaredDetectorRevision } from "../../src/rules/measurement.js";
import { renderForCommit } from "../../scripts/generate-quarantine-ledger.js";

const ROOT = join(import.meta.dirname, "..", "..");
const LEDGER_PATH = join(ROOT, "docs", "QUARANTINE-REMEDIATION.md");

const COMMITTED = readFileSync(LEDGER_PATH, "utf8");
const LIVE = await renderForCommit();

describe("docs/QUARANTINE-REMEDIATION.md matches the live registry", () => {
  it("the committed file equals a fresh render (regenerate if this fails)", () => {
    expect(COMMITTED).toBe(LIVE);
  });

  it("every live quarantine rule has a row", () => {
    const quarantine = RULES.filter((r) => r.tier === "quarantine");
    for (const rule of quarantine) {
      expect(
        COMMITTED.includes(`| ${rule.id} `),
        `${rule.id} is tier=quarantine but has no ledger row`,
      ).toBe(true);
    }
    // And no row for a rule that is not live quarantine (retired or
    // re-tiered rules must leave the table).
    const rowIds = [...COMMITTED.matchAll(/^\| (QA-[A-Z]+-\d+) /gm)].map(
      (m) => m[1] ?? "",
    );
    for (const id of rowIds) {
      const rule = RULES.find((r) => r.id === id);
      expect(
        rule?.tier === "quarantine",
        `${id} has a ledger row but is not live quarantine`,
      ).toBe(true);
    }
  });

  it("the historical section lists exactly RETIRED_RULE_IDS", () => {
    for (const id of RETIRED_RULE_IDS) {
      expect(COMMITTED).toContain(`- ${id}`);
    }
    const listed = [...COMMITTED.matchAll(/^- (QA-[A-Z]+-\d+)$/gm)].map(
      (m) => m[1] ?? "",
    );
    expect(listed.sort()).toEqual([...RETIRED_RULE_IDS].sort());
  });

  it("the P6 rework set carries its shipped detectorRevision", () => {
    // The reworks bumped these revisions; the ledger's disposition rows
    // are evidence claims about the SHIPPED state.
    const expected: Record<string, number> = {
      "QA-ENV-001": 4,
      "QA-PW-147": 2,
      "QA-PY-007": 4,
      "QA-TQUAL-009": 2,
    };
    for (const [id, rev] of Object.entries(expected)) {
      const rule = RULES.find((r) => r.id === id);
      expect(rule, `${id} missing from the registry`).toBeDefined();
      expect(declaredDetectorRevision(rule as QADoctorRule)).toBe(rev);
      expect(
        COMMITTED.includes(id),
        `${id} disposition row missing from the ledger`,
      ).toBe(true);
    }
  });

  it("measured cells agree with MEASURED_FP (no hand-typed rates)", () => {
    for (const [id, m] of Object.entries(MEASURED_FP)) {
      const rule = RULES.find((r) => r.id === id);
      if (rule?.tier !== "quarantine") continue;
      const rate = `${(m.fpRate * 100).toFixed(1)}% (n=${m.n})`;
      expect(
        COMMITTED.includes(rate),
        `${id} ledger cell does not match MEASURED_FP (${rate})`,
      ).toBe(true);
    }
  });
});
