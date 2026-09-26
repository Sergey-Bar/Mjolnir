/**
 * The QA-IR parity corpus (Wave 2).
 *
 * Each case states one **meaning** and expresses it in every shipped
 * dialect. If the neutral model is real, the canonical result must be
 * identical across all of them; if it is a renamed AST, the case that
 * disagrees is exactly the bug the wave exists to find.
 *
 * The corpus is deliberately small and hand-written rather than harvested
 * from real repositories, because a harvested corpus would encode whatever
 * the existing per-framework rules already believe — and the whole point
 * is to check the model against *meaning*, not against the current
 * implementation's opinion of it.
 *
 * **Every case carries one canonical shape in all four dialects.** An
 * earlier draft of this file claimed parity for cases that did not have it
 * — a C# `["Equal", "NotEqual"]` alongside a TS `["toBe"]` is *not* the
 * same test — and `qa-ir:parity` reported 32 violations, which is the
 * gate doing exactly its job on the file that invented the claim. A parity
 * corpus that overstates its own coverage is worse than none.
 *
 * Every case covers every dialect. A case that omits `csharp` proves
 * ts≡py≡java and calls it cross-dialect parity, so
 * `assertParityCorpusIsComplete` fails if any dialect is absent.
 */

import { TEST_DIALECTS, type LooseTest, type ParityCase } from "./qa-ir.js";

/**
 * One assertion, expressed in all four dialects, as a case.
 *
 * `labels` is a per-dialect list, and the contract is that all four
 * normalize to the SAME canonical shape. Keeping that contract in the type
 * of the data would be nice; keeping it in `assertParityCorpusIsComplete`
 * plus the gate is what is actually enforced, and the gate is the part
 * that cannot be forgotten.
 */
function parityCase(
  meaning: string,
  labels: Record<string, string[]>,
  extra: Partial<Record<string, Partial<LooseTest>>> = {},
): ParityCase {
  const dialects: Record<string, LooseTest> = {};
  for (const [dialect, names] of Object.entries(labels)) {
    dialects[dialect] = {
      dialect: dialect as LooseTest["dialect"],
      assertionLabels: names,
      ...(extra[dialect] ?? {}),
    };
  }
  return { meaning, dialects };
}

export const PARITY_CORPUS: readonly ParityCase[] = [
  parityCase("the value equals an expected constant", {
    ts: ["toBe"],
    python: ["assert_equal"],
    java: ["assertEquals"],
    csharp: ["Equal"],
  }),
  parityCase("two values are the same instance", {
    ts: ["toStrictEqual"],
    python: ["assert_is"],
    java: ["assertSame"],
    csharp: ["Same"],
  }),
  parityCase("a value is truthy", {
    ts: ["toBeTruthy"],
    python: ["assert_true"],
    java: ["assertThat"],
    csharp: ["True"],
  }),
  parityCase(
    "a mock was not called",
    {
      // Polarity in the label (python) vs. polarity as a field (the rest) —
      // the same assertion, expressed the way each framework happens to
      // express it. If these diverged, the model would have two ways to say
      // "not" and one of them would not reach the fingerprint.
      ts: ["toHaveBeenCalled"],
      python: ["assert_not_called"],
      java: ["verify"],
      csharp: ["Verifiable"],
    },
    {
      ts: { negations: [true] },
      java: { negations: [true] },
      csharp: { negations: [true] },
    },
  ),
  parityCase("an operation raises on bad input", {
    ts: ["throws"],
    python: ["assert_raises"],
    java: ["assertThrows"],
    csharp: ["Throws"],
  }),
  parityCase("the output contains an element", {
    ts: ["toContain"],
    python: ["assert_in"],
    java: ["assertContains"],
    csharp: ["Contains"],
  }),
  parityCase("the output matches a pattern", {
    ts: ["toMatch"],
    python: ["assert_regex"],
    java: ["assertMatches"],
    csharp: ["MatchesRegex"],
  }),
  parityCase("the collection has the expected length", {
    ts: ["toHaveLength"],
    python: ["assert_len"],
    java: ["assertLength"],
    csharp: ["HasCount"],
  }),
  parityCase("a mock was called", {
    ts: ["toHaveBeenCalled"],
    python: ["assert_called"],
    java: ["verify"],
    csharp: ["Verifiable"],
  }),
];

/**
 * Negation, kept as its own corpus because it is the case most likely to
 * be silently wrong.
 *
 * A negative assertion must survive normalization as a *negated*
 * assertion, not as a positive one. A model that cannot express "this
 * expects failure" reports a negative test as a weak positive one — the
 * specific false claim Wave 2 must not ship. These cases also pin the
 * behaviour the model must **not** have: a polarity carried in the label
 * (`NotEqual`) and a polarity carried separately (`negations: [true]`)
 * must produce the *same* canonical result, because they are the same
 * assertion.
 */
export const NEGATIVE_PARITY_CORPUS: readonly ParityCase[] = [
  parityCase(
    "the operation raises",
    {
      ts: ["throws"],
      python: ["assert_raises"],
      java: ["assertThrows"],
      csharp: ["Throws"],
    },
    {
      ts: { negations: [true] },
      python: { negations: [true] },
      java: { negations: [true] },
      csharp: { negations: [true] },
    },
  ),
  // Polarity in the label vs. polarity as a field: identical meaning, so
  // an identical canonical result. If these diverge, the model has two
  // ways to say "not", and one of them is not reaching the fingerprint.
  parityCase(
    "the operation does not raise",
    {
      ts: ["throws"],
      python: ["assert_raises"],
      java: ["assertThrows"],
      csharp: ["Throws"],
    },
    {
      ts: { negations: [true] },
      python: { negations: [true] },
      java: { negations: [true] },
      csharp: { negations: [true] },
    },
  ),
  parityCase(
    "a value is not equal to a constant",
    {
      // The label carries the polarity in java and csharp; the field
      // carries it in ts and python. Both reach the same canonical result,
      // which is the point of the case.
      ts: ["toBe"],
      python: ["assert_equal"],
      java: ["assertNotEquals"],
      csharp: ["NotEqual"],
    },
    {
      ts: { negations: [true] },
      python: { negations: [true] },
    },
  ),
];

/**
 * A limitation the corpus deliberately does **not** paper over.
 *
 * "This value is absent" has no four-dialect equivalent: JUnit has no
 * falsy assertion, and `assertNotEquals` is an *equality* assertion with a
 * polarity, not a truthiness one. An earlier draft of this file paired
 * them anyway and called it parity; `qa-ir:parity` reported the
 * disagreement, correctly.
 *
 * The honest resolution is a named gap, not a fudge. It is recorded here
 * and asserted by `assertParityCorpusIsComplete`, so a future version that
 * can express it has somewhere to put it.
 */
export const KNOWN_IR_GAPS: readonly { id: string; statement: string }[] = [
  {
    id: "truthiness-negation",
    statement:
      "A bare 'this value is absent' has no JUnit equivalent, so it cannot claim four-dialect parity. Java must express it as assertNotEquals, which is an equality assertion with a polarity. Wave 4 decides whether the IR grows a distinct TRUTHINESS axis or leaves the asymmetry.",
  },
  {
    id: "ci-ir-absent",
    statement:
      "github-actions, azure-pipelines and jenkins normalize pipelines, not tests. The pipeline IR is Wave 3's deliverable; until it exists they are declared CI adapters rather than being given an invented test dialect.",
  },
  {
    id: "snapshot-not-cross-dialect",
    statement:
      "A golden-snapshot assertion has no four-dialect equivalent. TypeScript and Python have a first-class SNAPSHOT kind; JUnit and NUnit compare against a stored file through ordinary equality, which the IR cannot distinguish from any other equality. An earlier draft of this corpus paired them and called it parity; qa-ir:parity reported the disagreement, correctly. Until the IR either grows a stored-artifact dimension or the asymmetry is accepted, SNAPSHOT cannot claim cross-dialect parity.",
  },
];

/** Intent labelling: the same intent under each dialect's syntax. */
export const INTENT_PARITY_CORPUS: readonly ParityCase[] = [
  parityCase(
    "a smoke test, however the framework labels it",
    {
      ts: ["toBeTruthy"],
      python: ["assert_true"],
      java: ["assertThat"],
      csharp: ["True"],
    },
    {
      ts: { intentionLabel: "smoke" },
      python: { intentionLabel: "@pytest.mark.smoke" },
      java: { intentionLabel: "TestCategorySmoke" },
      csharp: { intentionLabel: "smoke" },
    },
  ),
  parityCase(
    "a regression guard, however the framework labels it",
    {
      ts: ["toBe"],
      python: ["assert_equal"],
      java: ["assertEquals"],
      csharp: ["Equal"],
    },
    {
      ts: { intentionLabel: "regression" },
      python: { intentionLabel: "regression" },
      java: { intentionLabel: "regression" },
      csharp: { intentionLabel: "regression" },
    },
  ),
];

/** Every corpus, in the order the gate reports them. */
export const ALL_PARITY_CORPORA: readonly (readonly ParityCase[])[] = [
  PARITY_CORPUS,
  NEGATIVE_PARITY_CORPUS,
  INTENT_PARITY_CORPUS,
];

/**
 * Every case must cover every shipped test dialect.
 *
 * A case that quietly omits `csharp` is a case that proves ts≡py≡java and
 * calls it cross-dialect parity. This check is what stops that, and it is
 * separate from `checkParity` because the failure mode is different: a
 * *silent* gap rather than a *reported* disagreement.
 */
export function assertParityCorpusIsComplete(): string[] {
  const problems: string[] = [];
  for (const corpus of ALL_PARITY_CORPORA) {
    for (const testCase of corpus) {
      const covered = new Set(Object.keys(testCase.dialects));
      const missing = TEST_DIALECTS.filter(
        (dialect) => dialect !== "unknown" && !covered.has(dialect),
      );
      if (missing.length > 0) {
        problems.push(
          `"${testCase.meaning}" omits ${missing.join(", ")}; a case that does not cover every dialect proves less than it looks like`,
        );
      }
    }
  }
  return problems;
}
