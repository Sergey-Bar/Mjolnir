/**
 * T8 — a release gate that is not itself covered is a gate that can stop
 * working without anyone noticing.
 *
 * `src/ledger/m26-validators.ts` runs inside `npm run m26:audit` on every
 * certify, and `src/release/version-surface.ts` runs inside
 * `npm run check-version`. Neither is inside the coverage ratchet
 * (`docs/COVERAGE-EXEMPTIONS.json` classifies both as SHIPPED_SURFACE debt),
 * so the reject arms — the paths that only execute when something is WRONG —
 * are exactly the paths with no reviewer pressure on them.
 *
 * These tests are TABLE-DRIVEN over the arms rather than one-example-per-arm,
 * because the property worth protecting is completeness: the gate must reject
 * a record missing ANY required field, not the twenty or so fields somebody
 * remembered to write a test for. A per-field test suite drifts the moment a
 * field is added, and the field that was added is the one with no test.
 *
 * That is the same property the ledger's `defectSignatures` guard watches from
 * the other side: a required-field list that SHRINKS is a gate quietly
 * accepting records it used to reject. These arms make that shrink fail here.
 */

import { describe, expect, it } from "vitest";

import {
  GAP_REQUIRED_FIELDS,
  MAX_M26_LEDGER_RECORDS,
  SUPPORT_REQUIRED_FIELDS,
  validateGapLedger,
  validateGapLedgerJsonl,
  validateGapLedgerRecord,
  validateSupportMatrix,
  validateSupportMatrixRecord,
  type LedgerValidationResult,
} from "../../src/ledger/m26-validators.js";

/**
 * A record the gate accepts, so each arm removes exactly one thing.
 * `id` varies only for the bound arms, which need distinct records.
 */
function validGap(id = "GAP-T8-001"): Record<string, unknown> {
  return {
    schemaVersion: 1,
    gap_id: id,
    source_url_or_command: "local test fixture",
    source_kind: "test",
    severity: "high",
    category: "contract",
    affected_surface: "ledger",
    affected_version_or_milestone: "M26",
    reproduction_or_proof: "fixture reproduces the state",
    expected_behavior: "the contract remains explicit",
    actual_behavior: "the contract remains explicit",
    user_or_security_impact: "no user impact",
    owner: "qa-owner",
    target_train: "M26",
    status: "open",
    fix_design: "retain the explicit state",
    regression_test: "tests/ledger/m26-validator-reject-arms.spec.ts",
    revalidation_command: "npx vitest run tests/ledger",
    evidence_artifact: "tests/ledger/m26-validator-reject-arms.spec.ts",
    expiry_or_revisit_trigger: "next candidate review",
    rollback_artifact: "revert the ledger record",
    dependencies: [],
    closure_evidence: null,
  };
}

function validCell(id = "MATRIX-T8-001"): Record<string, unknown> {
  return {
    schemaVersion: 1,
    cell_id: id,
    axis: "surface",
    cell: id.replace("MATRIX-", ""),
    disposition: "TESTED",
    owner: "qa-owner",
    evidence: ["tests/ledger/m26-validator-reject-arms.spec.ts"],
    command: "npx vitest run tests/ledger",
    fixture: "local fixture",
    observed_result: "PASS",
    resource_budget: { durationMs: 1000 },
    last_candidate: "candidate-1",
  };
}

/** Every diagnostic and error the result carries, as one searchable string. */
function allText(result: LedgerValidationResult): string {
  return [
    ...result.diagnostics.map((d) => `${d.code} ${d.path} ${d.message}`),
    ...result.errors,
  ].join(" | ");
}

describe("T8: the gap-ledger gate rejects a record missing ANY required field", () => {
  it("the control: the unedited record passes, so each arm removes exactly one thing", () => {
    const result = validateGapLedgerRecord(validGap());
    expect(result.valid, allText(result)).toBe(true);
  });

  it.each([...GAP_REQUIRED_FIELDS])(
    "rejects a gap record with no %s",
    (field) => {
      const record = validGap();
      delete record[field];
      const result = validateGapLedgerRecord(record);
      // A diagnostic is not enough on its own: it must NAME the field, or a
      // record could be rejected for some unrelated reason and this arm would
      // pass while the field stayed unenforced.
      expect(
        allText(result).includes(field),
        `dropping ${field} produced no diagnostic naming it: ${allText(result)}`,
      ).toBe(true);
    },
  );

  it("distinguishes an absent schemaVersion (warning) from a wrong one (error)", () => {
    const absent = validGap();
    delete absent.schemaVersion;
    const absentResult = validateGapLedgerRecord(absent);
    expect(allText(absentResult)).toContain("$.schemaVersion");
    expect(
      absentResult.diagnostics.some((d) => d.code === "MISSING_FIELD"),
    ).toBe(true);

    const wrong = validateGapLedgerRecord({ ...validGap(), schemaVersion: 2 });
    expect(
      wrong.diagnostics.some(
        (d) => d.code === "INVALID_FIELD" && d.path === "$.schemaVersion",
      ),
      allText(wrong),
    ).toBe(true);
  });
});

/**
 * `command` and `fixture` are ALTERNATIVES, not two requireds — the gate
 * requires one or the other as evidence, which is why the existing suite
 * accepts a tested cell carrying either. Treating them as singletons here
 * would have asserted a rule the validator deliberately does not have.
 */
const EVIDENCE_PAIR = ["command", "fixture"] as const;
const SINGLETON_CELLS = SUPPORT_REQUIRED_FIELDS.filter(
  (field) => !(EVIDENCE_PAIR as readonly string[]).includes(field),
);

describe("T8: the support-matrix gate rejects a cell missing ANY required field", () => {
  it("the control: the unedited cell passes", () => {
    const result = validateSupportMatrixRecord(validCell());
    expect(result.valid, allText(result)).toBe(true);
  });

  it.each([...SINGLETON_CELLS])("rejects a matrix cell with no %s", (field) => {
    const cell = validCell();
    delete cell[field];
    const result = validateSupportMatrixRecord(cell);
    expect(
      allText(result).includes(field),
      `dropping ${field} produced no diagnostic naming it: ${allText(result)}`,
    ).toBe(true);
  });

  it("command and fixture are an alternative pair, and the gate says so", () => {
    // Removing one alone is fine, and that must stay fine — a repo whose
    // evidence is a committed fixture has no command to record.
    for (const field of EVIDENCE_PAIR) {
      const cell = validCell();
      delete cell[field];
      expect(
        validateSupportMatrixRecord(cell).valid,
        `dropping only ${field} should still be valid evidence`,
      ).toBe(true);
    }
    // Removing both is the actual rejection, and the diagnostic has to name
    // the pair so a reader knows which field to supply.
    const neither = validCell();
    delete neither.command;
    delete neither.fixture;
    const result = validateSupportMatrixRecord(neither);
    expect(result.valid, allText(result)).toBe(false);
    expect(allText(result)).toMatch(/command or fixture is required/);
  });
});

describe("T8: the record-count bound holds in every container", () => {
  // The bound is a denial-of-service guard, so it has to be checked in each
  // of the three entry points that accept a collection. Checking one and
  // assuming the others is how a 10k-line JSONL turns `certify` into a
  // multi-minute stall.
  it("the bound is what the source claims", () => {
    expect(MAX_M26_LEDGER_RECORDS).toBe(10_000);
  });

  it("a gap ledger over the bound is refused rather than validated record by record", () => {
    const records = Array.from({ length: MAX_M26_LEDGER_RECORDS + 1 }, (_, i) =>
      validGap(`GAP-T8-${i}`),
    );
    const result = validateGapLedger(records);
    expect(result.valid, allText(result)).toBe(false);
    expect(allText(result)).toContain(String(MAX_M26_LEDGER_RECORDS));
  });

  it("a JSONL body over the bound is refused", () => {
    const lines = Array.from({ length: MAX_M26_LEDGER_RECORDS + 1 }, (_, i) =>
      JSON.stringify(validGap(`GAP-T8-${i}`)),
    );
    const result = validateGapLedgerJsonl(lines.join("\n"));
    expect(result.valid, allText(result)).toBe(false);
    expect(allText(result)).toContain(String(MAX_M26_LEDGER_RECORDS));
  });

  it("a support matrix over the bound is refused", () => {
    const records = Array.from({ length: MAX_M26_LEDGER_RECORDS + 1 }, (_, i) =>
      validCell(`MATRIX-T8-${i}`),
    );
    const result = validateSupportMatrix(records);
    expect(result.valid, allText(result)).toBe(false);
    expect(allText(result)).toContain(String(MAX_M26_LEDGER_RECORDS));
  });
});

it("a body exactly AT the bound is not refused for size", () => {
  // The boundary arm. A guard that rejects at the limit has silently
  // become a smaller limit, and the cap is the only thing keeping a
  // 10,000-record ledger legal.
  const atBound = Array.from({ length: MAX_M26_LEDGER_RECORDS }, (_, i) =>
    validGap(`GAP-T8-${i}`),
  );
  const result = validateGapLedger(atBound);
  expect(
    allText(result).includes(String(MAX_M26_LEDGER_RECORDS)),
    "a body exactly at the bound was refused for size",
  ).toBe(false);
});
