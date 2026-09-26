/**
 * QA-IR — the neutral test semantic model (Wave 2).
 *
 * **The problem this solves.** `src/engine/adapter.ts` declares
 * `ParsedFile.ast` as `unknown` — "typed loosely until tree-sitter
 * unifies it". Every rule therefore reaches into whatever shape its
 * ecosystem's parser happened to produce, which is why the repository has
 * 79 rules with per-framework reachability caveats and why the blueprint's
 * "no per-framework engines" clause exists at all: each framework has
 * quietly become its own engine.
 *
 * **What this is.** One closed vocabulary for *what a test means*, and a
 * translation from each shipped dialect into it. A rule written against
 * QA-IR sees the same thing whether the test came from TypeScript,
 * Python, Java or C# — which is the only way "parity of canonical result
 * across adapters" can be a checkable claim rather than an aspiration.
 *
 * **What this is not.** A parser. It does not read files; it normalises a
 * *result* that an adapter already produced. That separation is
 * deliberate — swapping a parser is then a change behind a seam the model
 * already defines, instead of a rewrite of every rule.
 *
 * **The load-bearing property.** Two tests that mean the same thing must
 * canonicalise to the same `fingerprint`. That is a machine check
 * (`qa-ir:parity`), and it is what makes the neutral model more than a
 * renamed AST.
 */

import { createHash } from "node:crypto";

// ─── Dialects ───────────────────────────────────────────────────────

/**
 * The dialects the 7 shipped executor adapters speak. This enum is the
 * complete set of *test* dialects: the CI adapters (`github-actions`,
 * `azure-pipelines`, `jenkins`) speak `ci-pipeline`, a different IR that
 * Wave 3 normalizes.
 */
export const TEST_DIALECTS = [
  "ts",
  "python",
  "java",
  "csharp",
  "unknown",
] as const;

export type TestDialect = (typeof TEST_DIALECTS)[number];

/** Adapter id → dialect. Seven executor adapters, seven entries. */
export const ADAPTER_DIALECT: Readonly<Record<string, TestDialect>> = {
  typescript: "ts",
  python: "python",
  java: "java",
  csharp: "csharp",
};

export function dialectForAdapter(adapterId: string): TestDialect {
  return ADAPTER_DIALECT[adapterId] ?? "unknown";
}

// ─── The neutral vocabulary ─────────────────────────────────────────

/**
 * What an assertion *does*, in terms no ecosystem owns. A closed enum on
 * purpose: a new assertion kind is a version change to the IR, not an
 * extension somebody adds in one adapter and leaves the others out of —
 * which is exactly the drift class this model exists to stop.
 */
export const ASSERTION_KINDS = [
  /** The test asserts a value is truthy / non-null / not empty. */
  "TRUTHY",
  /** Equality against a literal or a computed value. */
  "EQUALITY",
  /** Identity/inequality. */
  "IDENTITY",
  /** The test asserts an operation raises / throws / returns an error. */
  "RAISES",
  /** Substring or element containment. */
  "CONTAINS",
  /** Regular-expression match. */
  "MATCHES",
  /** Cardinality / length. */
  "QUANTITY",
  /** The test asserts a mock or double was (not) called. */
  "INTERACTION",
  /** The test asserts a snapshot or golden output. */
  "SNAPSHOT",
] as const;

export type AssertionKind = (typeof ASSERTION_KINDS)[number];

/**
 * What a test is *for*. A single enum, not a set of per-framework
 * labels: `describe`/`it`, `@pytest.mark.smoke`, `@Tag` and
 * `[Fact]` all reduce to one of these or to `UNCLASSIFIED`.
 */
export const TEST_INTENTIONS = [
  "SMOKE",
  "FUNCTIONAL",
  "REGRESSION",
  "BOUNDARY",
  "NEGATIVE",
  "CONTRACT",
  "INTEGRATION",
  "E2E",
  "PERFORMANCE",
  "ACCESSIBILITY",
  "REGRESSION_GUARD",
  "UNCLASSIFIED",
] as const;

export type TestIntention = (typeof TEST_INTENTIONS)[number];

/**
 * A single assertion, normalised. `expectation` is a *shape*, not a value:
 * two dialects that assert against the same shape are equivalent even when
 * the literal differs, and a rule that only cares about "is there any
 * value here at all" must be able to see that.
 */
export interface NeutralAssertion {
  kind: AssertionKind;
  /**
   * The expectation's shape:
   *  - `LITERAL`   — compared against a constant
   *  - `COMPUTED`  — compared against something derived
   *  - `ANY`       — presence/truthiness only, no expected value
   *  - `NONE`      — asserted absent
   *  - `PATTERN`   — a regex or glob
   *  - `NOTHING`   — nothing to compare against (e.g. "does not throw")
   */
  expectation: "LITERAL" | "COMPUTED" | "ANY" | "NONE" | "PATTERN" | "NOTHING";
  /**
   * Whether the assertion is *inverted* (`NOT`). Kept as a field rather
   * than a separate assertion kind, because a negative assertion is the
   * same assertion with a polarity — and a model that cannot say "this
   * expects failure" is a model that will report a negative test as a
   * weak positive one.
   */
  negated: boolean;
}

/** A test, normalised. */
export interface NeutralTest {
  dialect: TestDialect;
  intention: TestIntention;
  assertions: readonly NeutralAssertion[];
  /**
   * Whether the test declares its own fixtures/setup. A test with setup and
   * one without are not interchangeable, and a rule that ignores this
   * will rate a 400-line scenario equal to a two-line smoke test.
   */
  hasFixture: boolean;
  /** Async / lifecycle-bearing: retries, polling, teardown hooks. */
  hasLifecycle: boolean;
}

// ─── Canonicalization ───────────────────────────────────────────────

/**
 * A dialect-independent projection of a test. Two tests that mean the same
 * thing produce the same value, field for field.
 */
export interface CanonicalTest {
  intention: TestIntention;
  /** Assertion kinds present, de-duplicated and sorted. */
  assertionKinds: readonly AssertionKind[];
  /** How many assertions of each polarity, as sorted `KIND`/`KIND:NEG`. */
  assertionShape: readonly string[];
  hasFixture: boolean;
  hasLifecycle: boolean;
  /** The strength dimensions that are derivable from shape alone. */
  dimensions: Readonly<Record<string, number>>;
  /**
   * A digest over the canonical fields. **Excludes the dialect** on
   * purpose: including it would make the fingerprint a statement about
   * which ecosystem wrote the test, which is the opposite of neutral.
   */
  fingerprint: string;
}

/**
 * Canonicalize a neutral test.
 *
 * Sorting is not cosmetic — it is what makes the fingerprint
 * order-independent, so a rule that visits assertions in source order and
 * one that sorts them agree. `JSON.stringify` on an unsorted structure
 * would encode an implementation detail into a proof.
 */
export function canonicalize(test: NeutralTest): CanonicalTest {
  const kinds = [...new Set(test.assertions.map((a) => a.kind))].sort();
  const shape = [
    ...new Set(
      test.assertions.map((a) => `${a.kind}${a.negated ? ":NEG" : ""}`),
    ),
  ].sort();
  const dimensions = deriveDimensions(test, shape);
  const canonical = {
    intention: test.intention,
    assertionKinds: kinds,
    assertionShape: shape,
    hasFixture: test.hasFixture,
    hasLifecycle: test.hasLifecycle,
    dimensions,
  };
  return {
    ...canonical,
    fingerprint: digest(canonical),
  };
}

function digest(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
    .slice(0, 16);
}

/**
 * The dimensions derivable from a test's shape alone.
 *
 * **Only what the model can actually see.** There is no "coverage" here
 * and no "mutation score", because a neutral model of a test's *text* has
 * no business claiming to know either. A dimension added without a
 * derivable definition is a vanity metric, and §94 bans those by name.
 * Everything below is computable from `NeutralTest` and nothing else.
 */
export function deriveDimensions(
  test: NeutralTest,
  shape: readonly string[],
): Record<string, number> {
  const total = test.assertions.length;
  const kinds = new Set(test.assertions.map((a) => a.kind));
  return {
    /** How many assertions the test makes. */
    assertionCount: total,
    /** Distinct assertion kinds — a test that only checks truthiness is weaker. */
    assertionBreadth: kinds.size,
    /** 0..1: the fraction of assertions that check something specific. */
    specificity:
      total === 0
        ? 0
        : round4(
            test.assertions.filter(
              (a) => a.expectation === "LITERAL" || a.expectation === "PATTERN",
            ).length / total,
          ),
    /** 0..1: the fraction that are inverted. A fully-inverted test is a
     *  different kind of evidence, and a model that cannot express that
     *  will rate a "nothing should happen" test as a real check. */
    negativeRatio:
      total === 0
        ? 0
        : round4(test.assertions.filter((a) => a.negated).length / total),
    /** 0..1: how much of the test's meaning is in the intent label. An
     *  UNCLASSIFIED test with rich assertions is still evidence. */
    intentClarity: test.intention === "UNCLASSIFIED" ? 0 : 1,
    /** 1 when the test has more than one assertion kind, else 0. */
    multiShape: shape.length > 1 ? 1 : 0,
    hasFixture: test.hasFixture ? 1 : 0,
    hasLifecycle: test.hasLifecycle ? 1 : 0,
  };
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

// ─── Dialect normalization ───────────────────────────────────────────

/**
 * A loose, dialect-shaped description as an adapter produces it. This is
 * the input the normalizer accepts: it is *loose by construction* (that is
 * what `ast: unknown` meant), and normalizing it into `NeutralTest` is the
 * whole point of the seam.
 */
export interface LooseTest {
  dialect: TestDialect;
  /** Raw, dialect-specific intention label. */
  intentionLabel?: string;
  /** Raw, dialect-specific assertion labels. */
  assertionLabels: readonly string[];
  hasFixture?: boolean;
  hasLifecycle?: boolean;
  /** Per-assertion polarity, when the dialect carries it separately. */
  negations?: readonly boolean[];
  /** Per-assertion expectation shape, when the dialect states it. */
  expectations?: readonly NeutralAssertion["expectation"][];
}

const ASSERTION_ALIASES: Readonly<Record<string, AssertionKind>> = {
  // TypeScript / JS
  toBeTruthy: "TRUTHY",
  toBeFalsy: "TRUTHY",
  toBeDefined: "TRUTHY",
  toBeUndefined: "TRUTHY",
  toBeNull: "TRUTHY",
  toBe: "EQUALITY",
  toEqual: "EQUALITY",
  toStrictEqual: "IDENTITY",
  toBeInstanceOf: "IDENTITY",
  rejects: "RAISES",
  throws: "RAISES",
  toThrow: "RAISES",
  toContain: "CONTAINS",
  toContainEqual: "CONTAINS",
  toMatch: "MATCHES",
  toHaveLength: "QUANTITY",
  toHaveProperty: "QUANTITY",
  toHaveBeenCalled: "INTERACTION",
  toHaveBeenCalledTimes: "INTERACTION",
  toMatchSnapshot: "SNAPSHOT",
  // Python
  assert_true: "TRUTHY",
  assert_false: "TRUTHY",
  assert_is_none: "TRUTHY",
  assert_is: "IDENTITY",
  assert_equal: "EQUALITY",
  assert_equals: "EQUALITY",
  assert_in: "CONTAINS",
  assert_raises: "RAISES",
  assert_regex: "MATCHES",
  assert_len: "QUANTITY",
  mock_called: "INTERACTION",
  assert_called: "INTERACTION",
  assert_not_called: "INTERACTION",
  snapshot_match: "SNAPSHOT",
  // Java / JUnit
  assertThrows: "RAISES",
  assertArrayEquals: "EQUALITY",
  assertEquals: "EQUALITY",
  assertNotEquals: "EQUALITY",
  assertSame: "IDENTITY",
  assertNotSame: "IDENTITY",
  assertContains: "CONTAINS",
  assertMatches: "MATCHES",
  assertLength: "QUANTITY",
  verify: "INTERACTION",
  assertThat: "TRUTHY",
  assertAll: "EQUALITY",
  // C# / NUnit / xUnit
  True: "TRUTHY",
  IsTrue: "TRUTHY",
  False: "TRUTHY",
  IsFalse: "TRUTHY",
  Equal: "EQUALITY",
  Same: "IDENTITY",
  NotEqual: "EQUALITY",
  Contains: "CONTAINS",
  DoesNotContain: "CONTAINS",
  Throws: "RAISES",
  ThrowsAsync: "RAISES",
  MatchesRegex: "MATCHES",
  HasCount: "QUANTITY",
  Verifiable: "INTERACTION",
  // Generic, already-normalized
  TRUTHY: "TRUTHY",
  EQUALITY: "EQUALITY",
  IDENTITY: "IDENTITY",
  RAISES: "RAISES",
  CONTAINS: "CONTAINS",
  MATCHES: "MATCHES",
  QUANTITY: "QUANTITY",
  INTERACTION: "INTERACTION",
  SNAPSHOT: "SNAPSHOT",
};

const INTENTION_ALIASES: Readonly<Record<string, TestIntention>> = {
  smoke: "SMOKE",
  "@smoke": "SMOKE",
  TestCategorySmoke: "SMOKE",
  smokeTest: "SMOKE",
  functional: "FUNCTIONAL",
  "@pytest.mark.smoke": "SMOKE",
  regression: "REGRESSION",
  "@regression": "REGRESSION",
  boundary: "BOUNDARY",
  "@boundary": "BOUNDARY",
  negative: "NEGATIVE",
  "@negative": "NEGATIVE",
  contract: "CONTRACT",
  "@contract": "CONTRACT",
  integration: "INTEGRATION",
  "@integration": "INTEGRATION",
  e2e: "E2E",
  "@e2e": "E2E",
  performance: "PERFORMANCE",
  "@performance": "PERFORMANCE",
  "@perf": "PERFORMANCE",
  a11y: "ACCESSIBILITY",
  accessibility: "ACCESSIBILITY",
  "@accessibility": "ACCESSIBILITY",
};

/**
 * Does the raw label itself encode a negation?
 *
 * Frameworks disagree about where polarity lives: pytest writes
 * `assert_not_called`, NUnit writes `NotEqual` and `DoesNotContain`, and
 * Jest writes `not.toHaveBeenCalled` — which a normalizer sees as the same
 * `toHaveBeenCalled` under a `not.` prefix. A model that reads polarity
 * only from a separate field silently reports every one of those as a
 * *positive* assertion, which is the specific false claim this IR must not
 * ship.
 *
 * So the label is inspected too, and the two sources are combined. When a
 * dialect provides a polarity field, it is authoritative; the label is the
 * fallback, and the combination is an OR because a framework that states
 * polarity twice is stating the same thing twice.
 */
export function labelEncodesNegation(label: string): boolean {
  return (
    // Delimited forms: `not.toBe`, `assert_not_called`, `toBe.not`.
    // Non-capturing throughout — a capture group nobody reads is a group
    // someone will later start reading, and then the pattern means
    // something it did not.
    /(?:^|[._])not(?:[._]|$)/i.test(label) ||
    /(?:^|[a-z])not_/i.test(label) ||
    // CamelCase forms: `NotEqual`, `assertNotEquals`, `DoesNotContain`.
    // `Not` can sit at the start or mid-identifier, and there is no
    // delimiter around it — which is exactly why a delimiter-only pattern
    // misses every NUnit, xUnit and JUnit negative assertion.
    /Not[A-Z]/.test(label) ||
    /^Never/i.test(label) ||
    /^IsFalse$/i.test(label)
  );
}

/**
 * Normalize an adapter's loose output into the neutral model.
 *
 * An **unrecognised assertion label is dropped, not guessed.** A
 * normalization layer that maps unknown labels onto a nearest known kind
 * would quietly inflate a test's apparent strength, which is the exact
 * failure Law 1 describes. Dropping it makes the test look *weaker* than
 * it is — the safe direction of error, because an under-claim is
 * recoverable and an over-claim is a false proof.
 */
export function normalize(loose: LooseTest): NeutralTest {
  const assertions: NeutralAssertion[] = [];
  for (const [index, label] of loose.assertionLabels.entries()) {
    const kind = ASSERTION_ALIASES[label];
    if (kind === undefined) continue;
    assertions.push({
      kind,
      expectation:
        loose.expectations?.[index] ?? defaultExpectation(kind, loose),
      negated:
        (loose.negations?.[index] ?? false) || labelEncodesNegation(label),
    });
  }
  return {
    dialect: loose.dialect,
    intention: normalizeIntention(loose.intentionLabel),
    assertions,
    hasFixture: loose.hasFixture ?? false,
    hasLifecycle: loose.hasLifecycle ?? false,
  };
}

function normalizeIntention(label: string | undefined): TestIntention {
  if (label === undefined) return "UNCLASSIFIED";
  const direct = INTENTION_ALIASES[label];
  if (direct !== undefined) return direct;
  // A marker may be a compound like `@pytest.mark.slow_smoke`.
  const lower = label.toLowerCase();
  for (const [key, value] of Object.entries(INTENTION_ALIASES)) {
    if (lower.includes(key.toLowerCase().replace(/^@/, ""))) return value;
  }
  return "UNCLASSIFIED";
}

/**
 * The expectation shape implied by an assertion kind when the dialect does
 * not state one. `ANY` for truthiness, `LITERAL` for equality, and so on —
 * an explicit table rather than a default, because "unknown" is not a
 * shape and pretending otherwise would let an unstated expectation read as
 * a checked value.
 */
function defaultExpectation(
  kind: AssertionKind,
  loose: LooseTest,
): NeutralAssertion["expectation"] {
  void loose;
  switch (kind) {
    case "TRUTHY":
      return "ANY";
    case "EQUALITY":
    case "IDENTITY":
      return "LITERAL";
    case "CONTAINS":
    case "MATCHES":
      return "PATTERN";
    case "QUANTITY":
      return "LITERAL";
    case "RAISES":
      return "COMPUTED";
    case "INTERACTION":
    case "SNAPSHOT":
      return "NONE";
  }
}

// ─── Parity ─────────────────────────────────────────────────────────

export interface ParityCase {
  /** What the test means, in words. */
  meaning: string;
  /** The same meaning, one entry per dialect. */
  dialects: Readonly<Record<string, LooseTest>>;
}

/**
 * A parity failure: two dialects that were supposed to mean the same thing
 * and did not.
 */
export interface ParityViolation {
  case: string;
  dialects: readonly string[];
  field: string;
  left: string;
  right: string;
}

/**
 * Prove that equivalent inputs in different dialects produce the same
 * canonical result. This is Wave 2's definition of done
 * ("parity of canonical result across adapters"), expressed as a
 * function so it can be a gate rather than a claim.
 *
 * Comparison is pairwise across every dialect pair, not against a
 * reference dialect: a two-way check would pass with a reference that is
 * wrong in the same way as the others.
 */
export function checkParity(cases: readonly ParityCase[]): ParityViolation[] {
  const violations: ParityViolation[] = [];
  for (const testCase of cases) {
    const names = Object.keys(testCase.dialects).sort();
    const canonical = new Map(
      names.map((name) => [
        name,
        canonicalize(normalize(testCase.dialects[name] as LooseTest)),
      ]),
    );
    for (let i = 0; i < names.length; i += 1) {
      for (let j = i + 1; j < names.length; j += 1) {
        const left = canonical.get(names[i] as string);
        const right = canonical.get(names[j] as string);
        if (left === undefined || right === undefined) continue;
        if (left.fingerprint === right.fingerprint) continue;
        for (const field of ["intention", "fingerprint"] as const) {
          if (left[field] === right[field]) continue;
          violations.push({
            case: testCase.meaning,
            dialects: [names[i] as string, names[j] as string],
            field,
            left: String(left[field]),
            right: String(right[field]),
          });
        }
        if (left.assertionShape.join("|") !== right.assertionShape.join("|")) {
          violations.push({
            case: testCase.meaning,
            dialects: [names[i] as string, names[j] as string],
            field: "assertionShape",
            left: left.assertionShape.join("|"),
            right: right.assertionShape.join("|"),
          });
        }
      }
    }
  }
  return violations;
}
