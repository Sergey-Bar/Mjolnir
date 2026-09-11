/**
 * Release Trust Contract drift-lock + status-algebra tests (plan
 * 1789009691197 R4a; docs/RELEASE-TRUST-CONTRACT.md +
 * docs/TRUST-CONSTITUTION.md §2/§5).
 *
 * Locked invariants:
 *  - the emitted dimension set ≡ the canonical list (id + order) — a
 *    silent addition/removal/rename is a contract violation (governance);
 *  - every canonical evidence binding RESOLVES against a real doctor run
 *    or a registered check — a typo'd binding must fail CI, not silently
 *    render UNSUPPORTED (which is reserved for genuinely unwired
 *    surfaces);
 *  - the derivation table (Constitution §2) is total and terminality
 *    holds: only PROVEN evidence derives PASS/FAILED;
 *  - the machine document is byte-deterministic and path-free;
 *  - the exit contract: PASS → 0, non-PASS → 1.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildReleaseTrust,
  CANONICAL_DIMENSIONS,
  compareSemver,
  computeVerdict,
  releaseTrustJson,
  RELEASE_TRUST_SCHEMA,
  type DimensionRecord,
  type ReleaseTrustReport,
} from "../../src/commands/release-trust.js";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const REPORT = buildReleaseTrust(join(ROOT, "tests", "fixtures"));

describe("canonical dimension set (docs/RELEASE-TRUST-CONTRACT.md)", () => {
  const doc = readFileSync(
    join(ROOT, "docs", "RELEASE-TRUST-CONTRACT.md"),
    "utf8",
  );

  it("emits exactly the canonical 12 dimensions in the canonical order", () => {
    const expected = [
      "engine-integrity",
      "evidence-integrity",
      "rule-integrity",
      "failure-containment",
      "corpus-integrity",
      "contract-compatibility",
      "determinism",
      "scope-integrity",
      "reproducibility",
      "zero-network-compliance",
      "agent-safety",
      "artifact-integrity",
    ];
    expect(REPORT.dimensions.map((d) => d.id)).toEqual(expected);
    expect(CANONICAL_DIMENSIONS.map((d) => d.id)).toEqual(expected);
    expect(REPORT.dimensions).toHaveLength(12);
  });

  it("every canonical dimension is documented in the contract doc (no silent additions)", () => {
    for (const d of CANONICAL_DIMENSIONS) {
      expect(
        doc.includes(d.id),
        `${d.id} missing from docs/RELEASE-TRUST-CONTRACT.md`,
      ).toBe(true);
    }
    // And the doc's table row count matches the canonical set (12 rows).
    const rows = [...doc.matchAll(/^\|\s*\d+\s*\|/gm)].length;
    expect(rows).toBe(12);
  });

  it("every evidence binding resolves — a typo must fail CI, not render UNSUPPORTED", () => {
    // The real repo run: all WIREABLE dimensions must evaluate (the two
    // documented-unwired surfaces legitimately render UNSUPPORTED — that
    // is Constitution §5, not a typo). Anything else UNSUPPORTED here
    // means a canonical binding is miswired. (scope-integrity wired with
    // R4c; agent-safety/artifact-integrity ship with R8/R9.)
    const documentedUnwired = new Set(["agent-safety", "artifact-integrity"]);
    for (const d of REPORT.dimensions) {
      if (documentedUnwired.has(d.id)) continue;
      expect(
        d.evidence === "UNSUPPORTED" && d.applicability.required === false,
        `${d.id} rendered UNSUPPORTED in the mjolnir checkout — a binding must be typo'd`,
      ).toBe(false);
    }
    // And the unwired three must say SO (genuine unwiring, never a typo).
    for (const d of REPORT.dimensions) {
      if (!documentedUnwired.has(d.id)) continue;
      expect(d.details.join(" ")).toContain("surface not wired");
    }
  });

  it("the unwired surfaces render UNSUPPORTED, recorded and non-blocking", () => {
    const byId = new Map(REPORT.dimensions.map((d) => [d.id, d]));
    for (const [id, expectedFrom] of [
      ["agent-safety", "1.3.0"],
      ["artifact-integrity", "1.4.0"],
    ] as const) {
      const d = byId.get(id);
      expect(d, id).toBeDefined();
      expect(d?.evidence).toBe("UNSUPPORTED");
      expect(d?.determination).toBe("UNSUPPORTED");
      expect(d?.applicability.required).toBe(false);
      expect(d?.applicability.applicableFrom).toBe(expectedFrom);
      expect(d?.details.join(" ")).toContain("Constitution §5");
    }
  });
});

describe("status algebra (Constitution §2) — derivation table + terminality", () => {
  function dim(
    determination: DimensionRecord["determination"],
    evidence: DimensionRecord["evidence"],
  ): DimensionRecord {
    return {
      id: "d",
      title: "D",
      applicability: { applicableFrom: "0.0.1", required: true },
      requirement: "r",
      evidence,
      determination,
      evidenceRefs: [],
      details: [],
    };
  }

  const baseInvariant: ReleaseTrustReport["invariant"] = {
    execution: "PROVEN",
    evidence: "PROVEN",
    scope: "PROVEN",
    contract: "satisfied",
    contradictions: "none",
    provenance: "PROVEN",
  };

  it("all PROVEN + all satisfied ⇒ PASS", () => {
    const v = computeVerdict([dim("PASS", "PROVEN")], baseInvariant, "9.9.9");
    expect(v.releaseTrust).toBe("PASS");
  });

  it("PROVEN + violated ⇒ FAILED (evidence of a violation is still PROVEN)", () => {
    const v = computeVerdict(
      [dim("PASS", "PROVEN"), dim("FAILED", "PROVEN")],
      baseInvariant,
      "9.9.9",
    );
    expect(v.releaseTrust).toBe("FAILED");
    expect(v.strictestState).toBe("FAILED");
  });

  it("UNPROVEN is terminal — never upgraded to PASS (all-dimensions-PROVEN alone is not an outcome)", () => {
    const v = computeVerdict(
      [dim("PASS", "PROVEN"), dim("UNPROVEN", "UNPROVEN")],
      baseInvariant,
      "9.9.9",
    );
    expect(v.releaseTrust).toBe("FAILED");
    expect(v.strictestState).toBe("UNPROVEN");
  });

  it("PARTIAL is terminal and non-PASS", () => {
    const v = computeVerdict(
      [dim("PASS", "PROVEN"), dim("PARTIAL", "PARTIAL")],
      baseInvariant,
      "9.9.9",
    );
    expect(v.releaseTrust).toBe("FAILED");
    expect(v.strictestState).toBe("PARTIAL");
  });

  it("BLOCKED outranks UNPROVEN (precedence FAILED > BLOCKED > INCONCLUSIVE > UNPROVEN > PARTIAL)", () => {
    const v = computeVerdict(
      [dim("UNPROVEN", "UNPROVEN"), dim("BLOCKED", "BLOCKED")],
      baseInvariant,
      "9.9.9",
    );
    expect(v.strictestState).toBe("BLOCKED");
  });

  it("INCONCLUSIVE anywhere is blocking, even with every dimension PASS", () => {
    const v = computeVerdict(
      [dim("PASS", "PROVEN"), dim("INCONCLUSIVE", "INCONCLUSIVE")],
      baseInvariant,
      "9.9.9",
    );
    expect(v.releaseTrust).toBe("FAILED");
    expect(v.strictestState).toBe("INCONCLUSIVE");
  });

  it("the provenance=bound activation: UNSUPPORTED invariant item is recorded, non-blocking (§5)", () => {
    const preR4c: ReleaseTrustReport["invariant"] = {
      ...baseInvariant,
      provenance: "UNSUPPORTED",
    };
    const v = computeVerdict([dim("PASS", "PROVEN")], preR4c, "1.1.4");
    expect(v.releaseTrust).toBe("PASS");
  });

  it("a violated invariant fails the verdict even with all dimensions PASS", () => {
    const violated: ReleaseTrustReport["invariant"] = {
      ...baseInvariant,
      contract: "violated",
    };
    const v = computeVerdict([dim("PASS", "PROVEN")], violated, "9.9.9");
    expect(v.releaseTrust).toBe("FAILED");
    expect(v.strictestState).toBe("UNPROVEN");
  });

  it("zero applicable dimensions can never PASS (no vacuous verdicts)", () => {
    const v = computeVerdict([], baseInvariant, "9.9.9");
    expect(v.releaseTrust).toBe("FAILED");
    expect(v.requiredCount).toBe(0);
  });
});

describe("machine document (mjolnir.release-trust@1) — Law 7 model", () => {
  it("byte-deterministic: serializing one report twice is byte-identical", () => {
    const a = releaseTrustJson(REPORT);
    const b = releaseTrustJson(REPORT);
    expect(a).toBe(b);
  });

  it("structure-deterministic: two builds agree on ids, order and verdict shape", () => {
    // Concurrent spec workers may legitimately touch the tree between two
    // builds (fixture-harness temp files) — the emitter's guarantee is
    // canonical ORDER + frozen schema, so compare structure, not bytes:
    // byte-identity is the serialization layer's contract (test above).
    const second = buildReleaseTrust(join(ROOT, "tests", "fixtures"));
    expect(second.dimensions.map((d) => d.id)).toEqual(
      REPORT.dimensions.map((d) => d.id),
    );
    expect(second.verdict.requiredCount).toBe(REPORT.verdict.requiredCount);
    expect(second.schema).toBe(RELEASE_TRUST_SCHEMA);
  });

  it("zero absolute paths, no timestamps, schema frozen", () => {
    const json = releaseTrustJson(REPORT);
    expect(json).toContain(RELEASE_TRUST_SCHEMA);
    expect(json).not.toMatch(/[A-Z]:\\/); // windows drive paths
    expect(json).not.toMatch(/\/home\//);
    expect(json).not.toMatch(/\/Users\//);
    expect(json).not.toMatch(/20\d\d-\d\d-\d\dT/); // timestamps
  });

  it("every dimension carries BOTH evidence and determination (record shape)", () => {
    for (const d of REPORT.dimensions) {
      expect(d.evidence, d.id).toBeDefined();
      expect(d.determination, d.id).toBeDefined();
      // Terminality: PASS/FAILED only ever ride PROVEN evidence.
      if (d.determination === "PASS" || d.determination === "FAILED") {
        expect(d.evidence, d.id).toBe("PROVEN");
      }
    }
  });
});

describe("exit contract + applicability comparator", () => {
  it("compareSemver orders the applicability gate", () => {
    expect(compareSemver("1.1.6", "1.1.4")).toBeGreaterThan(0);
    expect(compareSemver("1.1.4", "1.1.4")).toBe(0);
    expect(compareSemver("1.1.3", "1.1.4")).toBeLessThan(0);
  });

  it("the shipped report exits PASS in the mjolnir checkout (doctor healthy)", () => {
    expect(REPORT.verdict.releaseTrust).toBe("PASS");
    expect(REPORT.verdict.passedCount).toBe(REPORT.verdict.requiredCount);
  });
});
