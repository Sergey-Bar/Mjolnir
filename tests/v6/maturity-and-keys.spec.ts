/**
 * The maturity ladder, and the family keys that feed it.
 *
 * Four defects, all of a shape this repository has a name for: a hand-maintained
 * lookup naming a key that does not resolve, or a level that does not require the
 * level below it.
 *
 *  - `FRAMEWORK_FAMILY.selenium` and `SLUG_TO_FAMILY.selenium` were `"QA-SEL"`,
 *    which no rule id carries — the real prefix is `QA-SE`. Both maps are the
 *    same join, and an unmatched key returns an EMPTY list rather than an
 *    error, so the Selenium capability reported no evidence while its three
 *    rules went uncounted.
 *  - `deriveMaturityFromEvidence` tested `fieldProven` first, so a capability
 *    with only that flag reached `M5_FIELD_PROVEN` — a level whose published
 *    meaning includes "declared" and "implemented" — without either. M5 did not
 *    require M4, so the ladder's own stated invariant did not hold at the top
 *    and the only route to M5 was to satisfy none of M4.
 *  - `proofFor` cited the first non-RETIRED rule, not a MEASURED one, so
 *    `LOCAL_PROVEN` could point into `docs/FP-AUDIT.md` at a rule the audit
 *    never measured.
 *  - `checkParity` iterated `["intention", "fingerprint"]` after a guard that
 *    already required the fingerprints to differ, so the `fingerprint` field
 *    could never appear on a violation.
 */

import { describe, expect, it } from "vitest";

import {
  collectRuleFacts,
  familyForFramework,
} from "../../src/v6/capability-registry.js";
import { deriveMaturityFromEvidence } from "../../src/v6/maturity.js";
import { checkParity } from "../../src/v6/qa-ir.js";

/** The M4 chain, so each case below differs from it in exactly one field. */
const M4_CHAIN = {
  declared: true,
  implemented: true,
  unitTested: true,
  fixtureQuadVerified: true,
  corpusVerified: true,
  fieldProven: false,
};

const FRAMEWORKS = [
  "playwright",
  "cypress",
  "selenium",
  "jest",
  "vitest",
  "mocha",
  "jasmine",
  "pytest",
  "github-actions",
  "azure-pipelines",
  "jenkins",
  "gitlab-ci",
] as const;

describe("every framework key resolves to rules that exist", () => {
  const { liveByFamily } = collectRuleFacts();

  it("selenium keys on QA-SE, the prefix its three rules carry", () => {
    expect(familyForFramework("selenium")).toBe("QA-SE");
    expect(familyForFramework("selenium")).not.toBe("QA-SEL");
    expect(liveByFamily.get("QA-SE")?.length ?? 0).toBeGreaterThan(0);
  });

  it("every mapped framework's family has at least one live rule", () => {
    // A key naming a family with zero members is not a wrong answer, it is an
    // EMPTY one — which is why nothing reported this.
    for (const framework of FRAMEWORKS) {
      const family = familyForFramework(framework);
      expect(
        liveByFamily.get(family)?.length ?? 0,
        `${framework} → ${family} has no rules`,
      ).toBeGreaterThan(0);
    }
  });

  it("every family those frameworks map to is reachable and populated", () => {
    // The direction that caught it. A key naming a family with zero members is
    // not a wrong answer, it is an EMPTY one, so nothing reported it — and the
    // three `QA-SE-*` rules were credited to nobody because no key named
    // `QA-SE`.
    //
    // Scoped to the frameworks this map serves. Domain capabilities reach their
    // families through `liveByFamily` directly rather than through a framework
    // slug, so "every family in the registry has a framework key" is not the
    // invariant — the invariant is that every key this map hands out resolves.
    for (const framework of FRAMEWORKS) {
      const family = familyForFramework(framework);
      expect(
        liveByFamily.has(family),
        `${framework} → ${family} is not a family any rule belongs to`,
      ).toBe(true);
      expect(liveByFamily.get(family)?.length ?? 0).toBeGreaterThan(0);
    }
  });
});

describe("the ladder is monotone", () => {
  it("M5 requires the whole M4 chain", () => {
    // Field proof alone is not M5. M5's published meaning includes "declared"
    // and "implemented"; a flag cannot assert those on its own.
    expect(
      deriveMaturityFromEvidence({
        ...M4_CHAIN,
        implemented: false,
        fieldProven: true,
      }),
    ).not.toBe("M5_FIELD_PROVEN");
    expect(
      deriveMaturityFromEvidence({
        ...M4_CHAIN,
        declared: false,
        fieldProven: true,
      }),
    ).not.toBe("M5_FIELD_PROVEN");
  });

  it("still reaches M5 with the full chain plus field proof", () => {
    expect(deriveMaturityFromEvidence({ ...M4_CHAIN, fieldProven: true })).toBe(
      "M5_FIELD_PROVEN",
    );
  });

  it("dropping any one criterion lowers the level", () => {
    // Each expectation is the level that criterion BELONGS TO, not the one
    // below it — dropping `declared` leaves nothing declared at all, so M0.
    const drops: Array<[keyof typeof M4_CHAIN, string]> = [
      ["declared", "M0_UNKNOWN"],
      ["implemented", "M1_DECLARED"],
      ["unitTested", "M3_FIXTURE_VERIFIED"],
      ["fixtureQuadVerified", "M2_IMPLEMENTED"],
      ["corpusVerified", "M3_FIXTURE_VERIFIED"],
      ["fieldProven", "M4_CORPUS_VERIFIED"],
    ];
    for (const [key, expected] of drops) {
      const reduced = deriveMaturityFromEvidence({ ...M4_CHAIN, [key]: false });
      expect(reduced, `dropping ${key}`).toBe(expected);
    }
  });
});

describe("a parity violation names a field that can differ", () => {
  it("never reports `fingerprint` as the diverging field", () => {
    // Reaching this comparison requires the fingerprints to differ, so the
    // `fingerprint` field could never appear — a field a reader would look for a
    // cause in, in a place the control flow had already excluded.
    //
    // `python`'s `toMatch` canonicalizes differently from the other three
    // dialects' `toBe`, so the pairs involving python diverge.
    const violations = checkParity([
      {
        meaning: "mismatch",
        dialects: {
          ts: { dialect: "ts", assertionLabels: ["toBe"] },
          python: { dialect: "python", assertionLabels: ["toMatch"] },
          java: { dialect: "java", assertionLabels: ["toBe"] },
          csharp: { dialect: "csharp", assertionLabels: ["toBe"] },
        },
      },
    ] as never);
    expect(violations.length).toBeGreaterThan(0);
    for (const violation of violations) {
      expect(violation.field).not.toBe("fingerprint");
    }
    // The reported fields are real divergences. This corpus diverges on
    // `assertionShape` (python's `toMatch` is a pattern match; `toBe` is an
    // equality) and not on `intention`, because the dialects agree about it —
    // which is the point: only what differs is reported.
    const fields = new Set(violations.map((v) => v.field));
    expect(fields.has("assertionShape")).toBe(true);
    expect(fields.has("intention")).toBe(false);
    for (const field of fields) {
      for (const violation of violations.filter((v) => v.field === field)) {
        expect(violation.left, `${field} left equals right`).not.toBe(
          violation.right,
        );
      }
    }
  });
});
