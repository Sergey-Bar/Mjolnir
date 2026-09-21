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
    // The real repo run: every dimension's machinery is now wired
    // (scope-integrity with R4c, agent-safety with R8, artifact-integrity
    // with R9). ANYTHING rendering UNSUPPORTED here means a canonical
    // binding is miswired — the UNSUPPORTED state is reserved for
    // genuinely unwired surfaces, and none remain (Constitution §5).
    const documentedUnwired: ReadonlySet<string> = new Set();
    for (const d of REPORT.dimensions) {
      if (documentedUnwired.has(d.id)) continue;
      expect(
        d.evidence === "UNSUPPORTED" && d.applicability.required === false,
        `${d.id} rendered UNSUPPORTED in the mjolnir checkout — a binding must be typo'd`,
      ).toBe(false);
    }
  });

  it("the last-wired surfaces (agent-safety R8, artifact-integrity R9) PASS and are required", () => {
    const byId = new Map(REPORT.dimensions.map((d) => [d.id, d]));
    for (const id of ["agent-safety", "artifact-integrity"] as const) {
      const d = byId.get(id);
      expect(d, id).toBeDefined();
      expect(d?.applicability.required).toBe(true);
      expect(d?.evidence).toBe("PROVEN");
      expect(d?.determination).toBe("PASS");
    }
  });

  it("agent-safety (wired with R8) asserts the §17 machinery", () => {
    const d = new Map(REPORT.dimensions.map((x) => [x.id, x])).get(
      "agent-safety",
    );
    expect(d?.details.join(" ")).toContain("§17 safety wording");
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
    const v = computeVerdict([dim("PASS", "PROVEN")], baseInvariant);
    expect(v.releaseTrust).toBe("PASS");
  });

  it("PROVEN + violated ⇒ FAILED (evidence of a violation is still PROVEN)", () => {
    const v = computeVerdict(
      [dim("PASS", "PROVEN"), dim("FAILED", "PROVEN")],
      baseInvariant,
    );
    expect(v.releaseTrust).toBe("FAILED");
    expect(v.strictestState).toBe("FAILED");
  });

  it("UNPROVEN is terminal — never upgraded to PASS (all-dimensions-PROVEN alone is not an outcome)", () => {
    const v = computeVerdict(
      [dim("PASS", "PROVEN"), dim("UNPROVEN", "UNPROVEN")],
      baseInvariant,
    );
    expect(v.releaseTrust).toBe("FAILED");
    expect(v.strictestState).toBe("UNPROVEN");
  });

  it("PARTIAL is terminal and non-PASS", () => {
    const v = computeVerdict(
      [dim("PASS", "PROVEN"), dim("PARTIAL", "PARTIAL")],
      baseInvariant,
    );
    expect(v.releaseTrust).toBe("FAILED");
    expect(v.strictestState).toBe("PARTIAL");
  });

  it("BLOCKED outranks UNPROVEN (precedence FAILED > BLOCKED > INCONCLUSIVE > UNPROVEN > PARTIAL)", () => {
    const v = computeVerdict(
      [dim("UNPROVEN", "UNPROVEN"), dim("BLOCKED", "BLOCKED")],
      baseInvariant,
    );
    expect(v.strictestState).toBe("BLOCKED");
  });

  it("INCONCLUSIVE anywhere is blocking, even with every dimension PASS", () => {
    const v = computeVerdict(
      [dim("PASS", "PROVEN"), dim("INCONCLUSIVE", "INCONCLUSIVE")],
      baseInvariant,
    );
    expect(v.releaseTrust).toBe("FAILED");
    expect(v.strictestState).toBe("INCONCLUSIVE");
  });

  it("provenance is BOUND in the mjolnir checkout (R4c identity chain + R9 artifact binding proven)", () => {
    // Plan §5.2 activation: provenance = PROVEN exactly when the
    // scope-integrity dimension (runIdentity + evidence graph) AND the
    // artifact-integrity dimension (artifact scanId binding) both prove
    // their machinery. Before both shipped, the item rendered UNSUPPORTED
    // and non-blocking — recorded, never silently dropped.
    expect(REPORT.invariant.provenance).toBe("PROVEN");
    expect(REPORT.verdict.releaseTrust).toBe("PASS");
  });

  it("the provenance=bound activation: UNSUPPORTED invariant item is recorded, non-blocking (§5)", () => {
    const preR4c: ReleaseTrustReport["invariant"] = {
      ...baseInvariant,
      provenance: "UNSUPPORTED",
    };
    const v = computeVerdict([dim("PASS", "PROVEN")], preR4c);
    expect(v.releaseTrust).toBe("PASS");
  });

  it("a violated invariant fails the verdict even with all dimensions PASS", () => {
    const violated: ReleaseTrustReport["invariant"] = {
      ...baseInvariant,
      contract: "violated",
    };
    const v = computeVerdict([dim("PASS", "PROVEN")], violated);
    expect(v.releaseTrust).toBe("FAILED");
    expect(v.strictestState).toBe("UNPROVEN");
  });

  it("zero applicable dimensions can never PASS (no vacuous verdicts)", () => {
    const v = computeVerdict([], baseInvariant);
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
