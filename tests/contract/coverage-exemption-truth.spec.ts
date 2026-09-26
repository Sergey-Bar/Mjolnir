/**
 * T3 — the coverage exemption ledger must have a truth check.
 *
 * `docs/COVERAGE-EXEMPTIONS.json` held 21 entries (16 `SHIPPED_SURFACE` debt
 * entries plus 5 `PERMANENT_STRUCTURAL` ones that are legitimate) with
 * free-text `justification` fields, and
 * `scripts/check-coverage-exemption-ledger.mjs` validated only PATH parity
 * with `vitest.config.ts` plus the import graph. It never asked whether the
 * asserted defect still existed. The prose had already drifted: the
 * `maturity.ts` entry claimed hardcoded scores and a `ruleCount = 79`
 * fallback that had been removed from the source, and five further entries
 * asserted defects that the same release line had already fixed.
 *
 * The mechanism is a DRIFT ALARM, not a defect prover. Each non-structural
 * entry carries `defectSignatures` — regexes that MUST still match its file
 * — or an explicit `closureState` when the defect is gone and no surface of
 * it remains. A signature that stops matching means the code moved, so the
 * entry needs re-review: a code fix forces a ledger edit in the same commit.
 * That is how `tests/corpus/detector-hashes.json` already works — a recorded
 * fingerprint of source that CI diffs.
 *
 * The gate lives in `scripts/lib/coverage-exemption-ledger.mjs` so the CLI
 * script and this spec evaluate ONE implementation. The first half of this
 * spec asserts the real tree; the second half attacks the evaluator with
 * mutated ledgers, because a rule that never fires is indistinguishable from
 * a rule that is correct.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  readLedger,
  validateCoverageExemptionLedger,
} from "../../scripts/lib/coverage-exemption-ledger.mjs";

const ROOT = join(import.meta.dirname, "..", "..");

type Entry = ReturnType<typeof readLedger>["entries"][number];
type Ledger = ReturnType<typeof readLedger>;

/** A deep copy of the committed ledger, for mutation. */
function clone(): Ledger {
  return JSON.parse(
    readFileSync(join(ROOT, "docs", "COVERAGE-EXEMPTIONS.json"), "utf8"),
  ) as Ledger;
}

function entryFor(ledger: Ledger, path: string): Entry {
  const entry = ledger.entries.find((candidate) => candidate.path === path);
  if (!entry) throw new Error(`ledger has no ${path} row`);
  return entry;
}

/** Validate a mutated ledger against the REAL tree. */
function gate(ledger: Ledger): string[] {
  return validateCoverageExemptionLedger(ROOT, { ledger });
}

/** Block and line comments carry no code (see privacy-network-isolation). */
function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("T3: every non-structural exemption carries a machine-checkable truth claim", () => {
  it("the committed ledger passes its own gate", () => {
    expect(validateCoverageExemptionLedger(ROOT)).toEqual([]);
  });

  it("no entry is prose-only: signatures XOR a closure state", () => {
    const ledger = readLedger(ROOT);
    for (const entry of ledger.entries) {
      const hasSignatures =
        Array.isArray(entry.defectSignatures) &&
        entry.defectSignatures.length > 0;
      const hasClosure =
        typeof entry.closureState === "string" && entry.closureState.length > 0;
      if (entry.classification === "PERMANENT_STRUCTURAL") {
        expect(
          hasSignatures || hasClosure,
          `${entry.path}: a structural entry is evidenced by its structuralReason — a defect signature would claim a defect it is not claiming`,
        ).toBe(false);
        continue;
      }
      expect(
        hasSignatures !== hasClosure,
        `${entry.path}: must carry defectSignatures XOR closureState (signatures=${hasSignatures}, closure=${hasClosure})`,
      ).toBe(true);
    }
  });

  it("every signature currently matches the file it names", () => {
    // Asserted here independently of the gate, so a regression in the gate's
    // own evaluation is visible rather than hidden behind it.
    const ledger = readLedger(ROOT);
    for (const entry of ledger.entries) {
      for (const signature of entry.defectSignatures ?? []) {
        const source = readFileSync(join(ROOT, entry.path), "utf8");
        expect(
          new RegExp(signature, "u").test(source),
          `${entry.path}: signature ${JSON.stringify(signature)} no longer matches — the defect was closed or the code drifted, so this entry must be removed or reclassified in the same commit`,
        ).toBe(true);
      }
    }
  });

  it("the `maturity.ts` row is reclassified: the defect it described is gone", () => {
    // The case the whole task was written for. The entry used to assert
    // "hardcoded 75/70/65/30 scores and a ruleCount = 79 fallback invented
    // from file existence" — none of which is in the source any more, and
    // the module header says so. A signature here would have been theatre:
    // pinning a shape nobody defends.
    const entry = entryFor(readLedger(ROOT), "src/commands/maturity.ts");
    expect(entry.closureState).toMatch(/CLOSED/);
    expect(entry.defectSignatures).toBeUndefined();
    expect(entry.justification).not.toMatch(/hardcoded 75\/70\/65\/30/);
    // The closure is a fact, not an assertion. Comments are stripped: the
    // module header CITES the removed `ruleCount = 79` fallback by name, and
    // a comment documenting a corrected claim must not read as the claim
    // still standing.
    const source = stripComments(
      readFileSync(join(ROOT, "src/commands/maturity.ts"), "utf8"),
    );
    expect(source).not.toContain("ruleCount");
    expect(source).toMatch(/doesNotSay/);
  });

  it("the `report-playwright` signatures are written against the POST-T1 status", () => {
    // T1 → T3 is a hard ordering dependency: this signature must name the
    // corrected field, or the gate fires on the very task that closed the
    // defect.
    const entry = entryFor(
      readLedger(ROOT),
      "src/commands/report-playwright.ts",
    );
    expect(entry.defectSignatures).toEqual(
      expect.arrayContaining([
        expect.stringContaining('status: "interrupted"'),
      ]),
    );
    expect(JSON.stringify(entry.defectSignatures)).not.toContain(
      'status: "passed"',
    );
  });

  it("the PERMANENT_STRUCTURAL rows are unaffected by the signature rule", () => {
    const structural = readLedger(ROOT).entries.filter(
      (entry) => entry.classification === "PERMANENT_STRUCTURAL",
    );
    // Five: the spawned stdio entry point, three type-only modules, dist/**.
    expect(structural).toHaveLength(5);
    for (const entry of structural) {
      expect(entry.structuralReason?.length, entry.path).toBeGreaterThan(0);
      expect(entry.reviewBy, entry.path).toBeUndefined();
    }
  });
});

describe("T3: the gate fails when the truth claim is absent, invalid, or drifted", () => {
  it("a prose-only entry is rejected", () => {
    const ledger = clone();
    const entry = entryFor(ledger, "src/commands/policy.ts");
    delete entry.defectSignatures;
    const problems = gate(ledger);
    expect(
      problems.some(
        (problem) =>
          problem.includes("src/commands/policy.ts") &&
          problem.includes("prose-only"),
      ),
      problems.join("\n"),
    ).toBe(true);
  });

  it("an entry carrying BOTH signatures and a closure state is rejected", () => {
    const ledger = clone();
    const entry = entryFor(ledger, "src/commands/policy.ts");
    entry.closureState = "CLOSED";
    const problems = gate(ledger);
    expect(
      problems.some(
        (problem) =>
          problem.includes("src/commands/policy.ts") &&
          problem.includes("both defectSignatures and closureState"),
      ),
      problems.join("\n"),
    ).toBe(true);
  });

  it("a signature that no longer matches is reported as closed-or-drifted", () => {
    const ledger = clone();
    const entry = entryFor(ledger, "src/commands/trend.ts");
    entry.defectSignatures = ["export interface ThisSymbolDoesNotExist \\{"];
    const problems = gate(ledger);
    expect(
      problems.some(
        (problem) =>
          problem.includes("src/commands/trend.ts") &&
          problem.includes("defect closed or drifted"),
      ),
      problems.join("\n"),
    ).toBe(true);
  });

  it("a malformed signature is reported rather than thrown", () => {
    // A guard that crashes on malformed input is a guard that gets deleted.
    const ledger = clone();
    const entry = entryFor(ledger, "src/commands/trend.ts");
    entry.defectSignatures = ["([unclosed"];
    const problems = gate(ledger);
    expect(
      problems.some(
        (problem) =>
          problem.includes("src/commands/trend.ts") &&
          problem.includes("not a valid regex"),
      ),
      problems.join("\n"),
    ).toBe(true);
  });

  it("a structural row may not carry a defect signature or a closure state", () => {
    const ledger = clone();
    const entry = entryFor(ledger, "src/types.ts");
    entry.defectSignatures = ["export "];
    const problems = gate(ledger);
    expect(
      problems.some(
        (problem) =>
          problem.includes("src/types.ts") &&
          problem.includes("PERMANENT_STRUCTURAL is evidenced by"),
      ),
      problems.join("\n"),
    ).toBe(true);
  });

  it("a closure state is required to be prose, not an empty string", () => {
    const ledger = clone();
    const entry = entryFor(ledger, "src/commands/maturity.ts");
    entry.closureState = "";
    const problems = gate(ledger);
    expect(
      problems.some(
        (problem) =>
          problem.includes("src/commands/maturity.ts") &&
          problem.includes("prose-only"),
      ),
      problems.join("\n"),
    ).toBe(true);
  });

  it("the ledger schema version is pinned, so a future shape is a deliberate change", () => {
    const ledger = clone();
    ledger.schemaVersion = 1;
    const problems = gate(ledger);
    expect(
      problems.some((problem) => problem.includes("schemaVersion must be 2")),
      problems.join("\n"),
    ).toBe(true);
  });

  it("the rule is documented in the ledger's own policy, not only in code", () => {
    // The policy block is what a maintainer reads. A rule that lives only in
    // the evaluator is not self-describing, and the next person adds a
    // prose-only entry.
    const policy = readLedger(ROOT).policy as unknown as {
      defectSignatureSemantics: string;
    };
    expect(policy.defectSignatureSemantics).toMatch(/defectSignatures/);
    expect(policy.defectSignatureSemantics).toMatch(/closureState/);
    expect(policy.defectSignatureSemantics).toMatch(/DRIFT ALARM/);
  });
});
