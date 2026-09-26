import { describe, expect, it } from "vitest";

import {
  ADAPTER_DIALECT,
  ASSERTION_KINDS,
  TEST_DIALECTS,
  TEST_INTENTIONS,
  canonicalize,
  checkParity,
  deriveDimensions,
  dialectForAdapter,
  labelEncodesNegation,
  normalize,
  type LooseTest,
  type NeutralTest,
} from "../../src/v6/qa-ir.js";
import {
  ALL_PARITY_CORPORA,
  KNOWN_IR_GAPS,
  assertParityCorpusIsComplete,
} from "../../src/v6/qa-ir-parity.js";
import {
  CI_ADAPTERS,
  TEST_ADAPTERS,
  checkQaIr,
} from "../../scripts/v6/check-qa-ir-parity.js";

describe("QA-IR — the vocabularies are closed", () => {
  it("declares four test dialects plus an explicit unknown", () => {
    expect(TEST_DIALECTS).toEqual([
      "ts",
      "python",
      "java",
      "csharp",
      "unknown",
    ]);
    // `unknown` is a value, not a fallback that silently absorbs a typo.
    // An adapter with no dialect gets `unknown` and the gate reports it.
    expect(dialectForAdapter("nope")).toBe("unknown");
  });

  it("gives every test adapter a dialect and no CI adapter a test dialect", () => {
    // A pipeline is not a test. Giving `github-actions` a test dialect
    // would be inventing a capability it does not have.
    for (const adapter of TEST_ADAPTERS) {
      expect(dialectForAdapter(adapter), adapter).not.toBe("unknown");
    }
    for (const adapter of CI_ADAPTERS) {
      expect(ADAPTER_DIALECT[adapter], adapter).toBeUndefined();
    }
  });

  it("has no duplicate assertion kind or intention", () => {
    expect(new Set(ASSERTION_KINDS).size).toBe(ASSERTION_KINDS.length);
    expect(new Set(TEST_INTENTIONS).size).toBe(TEST_INTENTIONS.length);
    // A test with no declared intent is a real state, not a null.
    expect(TEST_INTENTIONS).toContain("UNCLASSIFIED");
  });
});

describe("QA-IR — normalization never guesses", () => {
  it("drops an unrecognised assertion rather than mapping it to a neighbour", () => {
    // Law 1: an unknown label must not be mapped to a *stronger* known kind.
    // Dropping it makes the test look weaker, which is the safe direction —
    // an under-claim is recoverable, an over-claim is a false proof.
    const test = normalize({
      dialect: "ts",
      assertionLabels: ["toBe", "someVendorSpecificThing", "toMatch"],
    });
    expect(test.assertions.map((a) => a.kind)).toEqual(["EQUALITY", "MATCHES"]);
  });

  it("gives a test with no recognised assertions zero assertions, not one", () => {
    const test = normalize({ dialect: "ts", assertionLabels: ["wat"] });
    expect(test.assertions).toEqual([]);
    expect(deriveDimensions(test, []).assertionCount).toBe(0);
    // And a zero-assertion test must not divide by zero anywhere.
    expect(deriveDimensions(test, []).specificity).toBe(0);
    expect(deriveDimensions(test, []).negativeRatio).toBe(0);
  });

  it("classifies an unlabelled test as UNCLASSIFIED rather than guessing", () => {
    expect(normalize({ dialect: "ts", assertionLabels: [] }).intention).toBe(
      "UNCLASSIFIED",
    );
    // `intentClarity` is what makes that visible to a rule.
    expect(
      deriveDimensions(
        {
          dialect: "ts",
          intention: "UNCLASSIFIED",
          assertions: [],
          hasFixture: false,
          hasLifecycle: false,
        },
        [],
      ).intentClarity,
    ).toBe(0);
  });
});

describe("QA-IR — polarity, which every framework encodes differently", () => {
  it("recognises negation in a delimited label", () => {
    for (const label of ["not.toBe", "assert_not_called", "toBe.not"]) {
      expect(labelEncodesNegation(label), label).toBe(true);
    }
  });

  it("recognises negation in a camelCase label, with or without a prefix", () => {
    // `NotEqual` leads; `assertNotEquals` and `DoesNotContain` do not. A
    // pattern anchored at the start misses every JUnit negative assertion,
    // which is how a negative test gets reported as a positive one.
    for (const label of ["NotEqual", "assertNotEquals", "DoesNotContain"]) {
      expect(labelEncodesNegation(label), label).toBe(true);
    }
  });

  it("does not mistake a positive label for a negative one", () => {
    for (const label of [
      "toBe",
      "assert_equal",
      "toHaveBeenCalled",
      "verify",
    ]) {
      expect(labelEncodesNegation(label), label).toBe(false);
    }
  });

  it("combines a polarity field with a polarity label", () => {
    // A framework that states polarity twice states the same thing twice.
    const both = normalize({
      dialect: "ts",
      assertionLabels: ["NotEqual"],
      negations: [true],
    });
    expect(both.assertions[0]?.negated).toBe(true);
  });
});

describe("QA-IR — the canonical result is dialect-independent", () => {
  const asTest = (loose: LooseTest): NeutralTest => normalize(loose);

  it("gives the same fingerprint to the same meaning in different dialects", () => {
    const ts = canonicalize(
      asTest({ dialect: "ts", assertionLabels: ["toBe"] }),
    );
    const py = canonicalize(
      asTest({ dialect: "python", assertionLabels: ["assert_equal"] }),
    );
    // The dialect is deliberately NOT in the fingerprint: a fingerprint
    // that recorded the ecosystem would be a statement about who wrote the
    // test, which is the opposite of neutral.
    expect(ts.fingerprint).toBe(py.fingerprint);
  });

  it("gives different fingerprints to different meanings", () => {
    const eq = canonicalize(
      asTest({ dialect: "ts", assertionLabels: ["toBe"] }),
    );
    const raises = canonicalize(
      asTest({ dialect: "ts", assertionLabels: ["throws"] }),
    );
    expect(eq.fingerprint).not.toBe(raises.fingerprint);
  });

  it("distinguishes a positive assertion from its negation", () => {
    const positive = canonicalize(
      asTest({ dialect: "ts", assertionLabels: ["toBe"] }),
    );
    const negative = canonicalize(
      asTest({ dialect: "ts", assertionLabels: ["toBe"], negations: [true] }),
    );
    expect(positive.fingerprint).not.toBe(negative.fingerprint);
    expect(positive.dimensions.negativeRatio).toBe(0);
    expect(negative.dimensions.negativeRatio).toBe(1);
  });

  it("is order-independent, so source order cannot leak into a proof", () => {
    // A rule that visits assertions in order and one that sorts them must
    // agree, or the fingerprint encodes an implementation detail.
    const a = canonicalize(
      asTest({ dialect: "ts", assertionLabels: ["toBe", "toMatch"] }),
    );
    const b = canonicalize(
      asTest({ dialect: "ts", assertionLabels: ["toMatch", "toBe"] }),
    );
    expect(a.fingerprint).toBe(b.fingerprint);
  });

  it("includes fixture and lifecycle presence, because a scenario is not a smoke test", () => {
    const bare = canonicalize(
      asTest({ dialect: "ts", assertionLabels: ["toBe"] }),
    );
    const staged = canonicalize(
      asTest({
        dialect: "ts",
        assertionLabels: ["toBe"],
        hasFixture: true,
        hasLifecycle: true,
      }),
    );
    expect(bare.fingerprint).not.toBe(staged.fingerprint);
    expect(staged.dimensions.hasFixture).toBe(1);
    expect(bare.dimensions.hasFixture).toBe(0);
  });

  it("produces a stable, digest-shaped fingerprint", () => {
    const result = canonicalize(
      asTest({ dialect: "ts", assertionLabels: ["toBe"] }),
    );
    expect(result.fingerprint).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("QA-IR — the dimensions are all derivable", () => {
  it("publishes no dimension it cannot compute from the model", () => {
    // §94 bans a vanity metric by name. A neutral model of a test's text
    // has no business claiming coverage, mutation score or defect
    // density, and the allowed list is asserted so none can be added
    // quietly.
    const result = canonicalize(
      normalize({
        dialect: "ts",
        assertionLabels: ["toBe", "toMatch", "throws"],
      }),
    );
    expect(Object.keys(result.dimensions).sort()).toEqual([
      "assertionBreadth",
      "assertionCount",
      "hasFixture",
      "hasLifecycle",
      "intentClarity",
      "multiShape",
      "negativeRatio",
      "specificity",
    ]);
    for (const forbidden of [
      "coverage",
      "mutationScore",
      "defectDensity",
      "risk",
    ]) {
      expect(Object.keys(result.dimensions)).not.toContain(forbidden);
    }
  });

  it("keeps every dimension inside 0..1 or a count", () => {
    const result = canonicalize(
      normalize({
        dialect: "ts",
        assertionLabels: ["toBe", "toMatch"],
        negations: [true, false],
      }),
    );
    for (const [name, value] of Object.entries(result.dimensions)) {
      if (name === "assertionCount" || name === "assertionBreadth") {
        expect(value, name).toBeGreaterThanOrEqual(0);
        continue;
      }
      expect(value, name).toBeGreaterThanOrEqual(0);
      expect(value, name).toBeLessThanOrEqual(1);
    }
  });

  it("rates specificity by whether anything is actually compared", () => {
    const specific = canonicalize(
      normalize({ dialect: "ts", assertionLabels: ["toBe"] }),
    );
    const vacuous = canonicalize(
      normalize({ dialect: "ts", assertionLabels: ["toBeTruthy"] }),
    );
    expect(specific.dimensions.specificity).toBeGreaterThan(
      vacuous.dimensions.specificity,
    );
  });
});

describe("Wave 2 DoD — parity of canonical result across adapters", () => {
  it("holds for every case in every corpus", () => {
    const violations = ALL_PARITY_CORPORA.flatMap((corpus) =>
      checkParity(corpus),
    );
    expect(
      violations.map((v) => `${v.case}: ${v.field} ${v.left} != ${v.right}`),
    ).toEqual([]);
  });

  it("covers every shipped dialect in every case, so no case proves less than it looks", () => {
    expect(assertParityCorpusIsComplete()).toEqual([]);
  });

  it("compares every pair, not just against a reference dialect", () => {
    // A two-way check passes with a reference that is wrong in the same
    // way as everything else, which is how a broken model looks green.
    const corpus = [
      {
        meaning: "mismatch",
        dialects: {
          ts: { dialect: "ts" as const, assertionLabels: ["toBe"] },
          python: { dialect: "python" as const, assertionLabels: ["toMatch"] },
          java: { dialect: "java" as const, assertionLabels: ["toBe"] },
          csharp: { dialect: "csharp" as const, assertionLabels: ["toBe"] },
        },
      },
    ];
    const violations = checkParity(corpus);
    // python differs from all three others, so it is caught against the
    // first of them AND the violations name every pair involved.
    expect(violations.length).toBeGreaterThan(0);
    const pairs = new Set(violations.map((v) => v.dialects.join(" vs ")));
    expect(pairs.has("python vs ts")).toBe(true);
  });

  it("names the IR gaps it cannot paper over", () => {
    // These are the fudges this corpus declined to make. Deleting a gap
    // record without fixing the underlying asymmetry is how a limitation
    // becomes a claim.
    const ids = KNOWN_IR_GAPS.map((gap) => gap.id);
    expect(ids).toContain("truthiness-negation");
    expect(ids).toContain("ci-ir-absent");
    expect(ids).toContain("snapshot-not-cross-dialect");
    for (const gap of KNOWN_IR_GAPS) {
      expect(gap.statement.length, gap.id).toBeGreaterThan(60);
    }
  });
});

describe("qa-ir:parity — the gate", () => {
  const check = checkQaIr();

  it("passes with no violations", () => {
    expect(check.status).toBe("PASS");
    expect(check.errors).toEqual([]);
    expect(check.facts.parityViolations).toBe(0);
  });

  it("accounts for all seven shipped adapters across the two IRs", () => {
    // The seven the framework inventory names. The union is a superset:
    // `gitlab-ci` is a real adapter with no framework-inventory row, and it
    // is a CI adapter, so Wave 3 owns it. An adapter that exists but is in
    // neither list is the gap this assertion exists to catch.
    expect([...TEST_ADAPTERS, ...CI_ADAPTERS]).toEqual(
      expect.arrayContaining([
        "azure-pipelines",
        "csharp",
        "github-actions",
        "java",
        "jenkins",
        "python",
        "typescript",
      ]),
    );
    // And nothing is double-claimed by both IRs.
    const overlap = TEST_ADAPTERS.filter((a) => CI_ADAPTERS.includes(a));
    expect(overlap).toEqual([]);
  });

  it("reports enough facts to tell what it actually proved", () => {
    expect(check.facts.parityCases).toBeGreaterThanOrEqual(10);
    expect(check.facts.assertionKinds).toBe(ASSERTION_KINDS.length);
    expect(check.facts.sampleFingerprint).toMatch(/^[0-9a-f]{16}$/);
  });
});
