/**
 * Test doubles — the false-proof detector the product is named after.
 *
 * **The claim.** A test whose every assertion is about a *double* — a
 * mock, a stub, a fake, a spy — is not evidence about the code under
 * test. `mock.assert_called_once()` proves the test called its own mock.
 * `verify(mock).get()` proves JUnit did what JUnit was told. Read as
 * passing, that is a **false proof**: the single failure class the
 * constitution exists to prevent (Law 1, Law 2).
 *
 * **Why it needs no new engine.** Wave 2's QA-IR already normalizes every
 * dialect's assertions into one vocabulary with an `INTERACTION` kind, a
 * polarity and an expectation shape. A double assertion is
 * `expectation: NONE` — there is no value to compare against, only a
 * record that something was touched. So "is this test self-referential?"
 * is a *derivation* from the neutral model, not a new parser and not a
 * new per-framework engine. That is what the IR was for.
 *
 * **What it is not.** It does not claim a test is bad. A test that also
 * asserts real behaviour is fine, however many doubles it touches. The
 * finding is about the *ratio* and about whether any substantiating
 * assertion exists at all.
 */

import { canonicalize, type AssertionKind, type NeutralTest } from "./qa-ir.js";

/** Assertion kinds that carry real evidence about the code under test. */
const SUBSTANTIATING: ReadonlySet<AssertionKind> = new Set<AssertionKind>([
  "EQUALITY",
  "IDENTITY",
  "CONTAINS",
  "MATCHES",
  "QUANTITY",
  "RAISES",
  "SNAPSHOT",
]);

/** How serious the pattern is. Closed enum, so a renderer cannot invent a
 *  fourth severity at a call site. */
export const DOUBLE_RISKS = [
  /** No assertion at all. Nothing was proven either way. */
  "NO_ASSERTION",
  /** Every assertion is about a double. Self-referential: a false proof. */
  "DOUBLE_ONLY",
  /** Doubles are present but at least one assertion substantiates the code. */
  "DOUBLE_MIXED",
  /** Doubles present, and they are the *subject* of the assertions. */
  "DOUBLE_SUBJECT",
] as const;

export type DoubleRisk = (typeof DOUBLE_RISKS)[number];

export interface DoubleFinding {
  risk: DoubleRisk;
  /** How many assertions there are in total. */
  assertions: number;
  /** How many are about a double. */
  doubleAssertions: number;
  /** How many carry real evidence about the code under test. */
  substantiatingAssertions: number;
  /** 0..1 — the share of assertions that prove nothing. */
  hollowRatio: number;
  /** The one-line statement a surface can render verbatim. */
  statement: string;
}

const STATEMENTS: Readonly<Record<DoubleRisk, string>> = {
  NO_ASSERTION:
    "this test asserts nothing, so passing it proves nothing about the code",
  DOUBLE_ONLY:
    "every assertion is about a test double, so this passing proves the test called its own mock rather than that the code works",
  DOUBLE_MIXED:
    "test doubles are involved and at least one assertion checks real behaviour",
  DOUBLE_SUBJECT:
    "the test double IS the subject under test, so assertions about it are legitimate evidence about the double",
};

/**
 * Assess a normalized test.
 *
 * `doubleIsSubject` is the one judgement a caller supplies, because only
 * the caller knows the test's intent: a test suite *for* a fake HTTP
 * client legitimately asserts on that fake, and must not be reported as a
 * false proof. Defaulting it to `false` keeps the safe direction — an
 * unannotated double-asserting test is reported, and the caller can clear
 * it once it has decided.
 */
export function assessDoubleRisk(
  test: NeutralTest,
  options: { doubleIsSubject?: boolean } = {},
): DoubleFinding {
  const total = test.assertions.length;
  const doubles = test.assertions.filter(
    (a) => a.kind === "INTERACTION" || a.expectation === "NONE",
  ).length;
  const substantiating = test.assertions.filter(
    (a) => SUBSTANTIATING.has(a.kind) && a.expectation !== "NONE",
  ).length;

  const risk: DoubleRisk =
    total === 0
      ? "NO_ASSERTION"
      : options.doubleIsSubject === true && doubles > 0
        ? "DOUBLE_SUBJECT"
        : substantiating === 0
          ? "DOUBLE_ONLY"
          : "DOUBLE_MIXED";

  return {
    risk,
    assertions: total,
    doubleAssertions: doubles,
    substantiatingAssertions: substantiating,
    hollowRatio:
      total === 0 ? 0 : Math.round((doubles / total) * 10_000) / 10_000,
    // `risk` is one of the four keys, so the lookup cannot be undefined;
    // the fallback names the risk rather than printing "undefined".
    statement: STATEMENTS[risk] ?? `unclassified double risk: ${risk}`,
  };
}

/** The risks that must never render as a pass. */
export const HOLLOW_RISKS: ReadonlySet<DoubleRisk> = new Set<DoubleRisk>([
  "NO_ASSERTION",
  "DOUBLE_ONLY",
]);

/**
 * Whether a verdict derived from this test may be reported as evidence.
 *
 * The function every surface calls before it turns a test outcome into a
 * quality claim. `DOUBLE_MIXED` passes: doubles are legitimate in a test
 * that also checks real behaviour, and reporting those would train users
 * to ignore the finding.
 */
export function isEvidential(finding: DoubleFinding): boolean {
  return !HOLLOW_RISKS.has(finding.risk);
}

/**
 * A roll-up across a suite. A suite is hollow when *no* test in it
 * substantiates anything — which is a different and stronger statement
 * than "some tests are hollow", and the one a user needs at the top of a
 * report.
 */
export function assessSuite(findings: readonly DoubleFinding[]): {
  tests: number;
  hollow: number;
  substantiating: number;
  hollowRatio: number;
  verdict: "SUBSTANTIATED" | "PARTIALLY_HOLLOW" | "HOLLOW";
} {
  const hollow = findings.filter((f) => !isEvidential(f)).length;
  const substantiating = findings.filter((f) => isEvidential(f)).length;
  return {
    tests: findings.length,
    hollow,
    substantiating,
    hollowRatio:
      findings.length === 0
        ? 0
        : Math.round((hollow / findings.length) * 10_000) / 10_000,
    verdict:
      findings.length === 0
        ? "SUBSTANTIATED"
        : substantiating === 0
          ? "HOLLOW"
          : hollow > 0
            ? "PARTIALLY_HOLLOW"
            : "SUBSTANTIATED",
  };
}

/**
 * The capability this detector provides, expressed in the Wave 1
 * registry's own vocabulary. Declared here so the finding is
 * discoverable by the registry rather than being a feature that exists
 * only in a test file.
 */
export const DOUBLE_CAPABILITY = {
  id: "test.doubles.hollow-assertion",
  name: "Hollow test-double assertions",
  kind: "test-framework" as const,
  owner: "test-doubles",
  /** M2: implemented and unit-tested. Not M3 — there is no per-capability
   *  fixture-quad gate yet (`GAP-V6-004`), so M3 is unreachable for
   *  everything today. */
  maturity: "M2_IMPLEMENTED" as const,
  nextLevelGap: {
    target: "M3_FIXTURE_VERIFIED" as const,
    missing: [
      "positive fixture: a double-asserting test is detected",
      "negative fixture: a mixed real+double test is not flagged",
      "boundary fixture: a zero-assertion test is reported as NO_ASSERTION",
      "adversarial fixture: a subject-double test is cleared by the caller",
    ],
    owner: "test-doubles",
    revisitTrigger:
      "rules:quality:check ships the per-capability fixture-quad gate",
  },
} as const;

/** The canonical fingerprint of a test, for dedupe in a report. */
export function hollowFingerprint(test: NeutralTest): string {
  return canonicalize(test).fingerprint;
}
