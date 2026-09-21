/**
 * Cross-language no-assertions family (INTEL-008, plan §37.4).
 *
 * Framework-specific assertion vocabulary definitions. Rules can
 * consume these to determine whether a test body contains assertions
 * for a given framework, instead of hard-coding per-rule vocabularies.
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface AssertionVocabulary {
  /** Framework identifier. */
  framework: string;
  /** Method/function names that constitute assertions. */
  assertionMethods: string[];
  /** Regex patterns to match assertion calls in source text. */
  assertionPatterns: string[];
}

// ─── Framework vocabularies ──────────────────────────────────────────

export const ASSERTION_VOCABULARIES: readonly AssertionVocabulary[] = [
  {
    framework: "jest",
    assertionMethods: ["expect"],
    assertionPatterns: [
      "\\bexpect\\s*\\(",
      "\\b(?:toBe|toEqual|toStrictEqual|toBeCloseTo|toBeDefined|toBeUndefined|toBeNull|toBeTruthy|toBeFalsy|toContain|toMatch|toBeGreaterThan|toBeLessThan|toBeGreaterThanOrEqual|toBeLessThanOrEqual|toBeInstanceOf|toHaveProperty|toHaveLength|toHaveBeen|toHaveBeenCalled|toHaveBeenCalledWith|toHaveBeenCalledTimes|toThrow|rejects|resolves)\\s*\\(",
      "\\bexpect\\.extend\\s*\\(",
    ],
  },
  {
    framework: "vitest",
    assertionMethods: ["expect", "assert"],
    assertionPatterns: [
      "\\bexpect\\s*\\(",
      "\\bassert\\.",
      "\\b(?:toBe|toEqual|toStrictEqual|toBeCloseTo|toBeDefined|toBeUndefined|toBeNull|toBeTruthy|toBeFalsy|toContain|toMatch|toHaveBeenCalled|toHaveBeenCalledWith|toThrow|rejects|resolves)\\s*\\(",
    ],
  },
  {
    framework: "pytest",
    assertionMethods: ["assert"],
    assertionPatterns: [
      "\\bassert\\b",
      "\\bpytest\\.raises\\b",
      "\\bpytest\\.warns\\b",
      "\\bpytest\\.approx\\b",
      "\\bunittest\\.TestCase\\.assert\\w+\\b",
    ],
  },
  {
    framework: "junit",
    assertionMethods: [
      "assertEquals",
      "assertTrue",
      "assertFalse",
      "assertNull",
      "assertNotNull",
      "assertThrows",
      "assertAll",
      "assertIterableEquals",
      "assertLinesMatch",
      "assertTimeout",
      "assertTimeoutPreemptively",
      "fail",
    ],
    assertionPatterns: [
      "\\bassert(?:Equals|True|False|Null|NotNull|Throws|All|IterableEquals|LinesMatch|Timeout|TimeoutPreemptively)\\s*\\(",
      "\\bAssertions?\\.assert\\w+\\s*\\(",
      "\\bfail\\s*\\(",
      "\\bassertThat\\s*\\(",
      "\\bverify\\s*\\(",
    ],
  },
  {
    framework: "nunit",
    assertionMethods: [
      "Assert.That",
      "Assert.AreEqual",
      "Assert.IsTrue",
      "Assert.IsFalse",
      "Assert.IsNull",
      "Assert.IsNotNull",
      "Assert.Throws",
      "Assert.DoesNotThrow",
      "Assert.IsEmpty",
      "Assert.IsNotEmpty",
      "Assert.Contains",
      "Assert.Greater",
      "Assert.Less",
    ],
    assertionPatterns: [
      "\\bAssert\\.That\\s*\\(",
      "\\bAssert\\.(?:AreEqual|IsTrue|IsFalse|IsNull|IsNotNull|Throws|DoesNotThrow|IsEmpty|IsNotEmpty|Contains|Greater|Less|GreaterOrEqual|LessOrEqual|AreNotEqual|AreSame|AreNotSame|IsInstanceOf|IsAssignableFrom|Fail|Pass|Ignore|Inconclusive)\\s*\\(",
    ],
  },
  {
    framework: "xunit",
    assertionMethods: [
      "Assert.Equal",
      "Assert.NotEqual",
      "Assert.True",
      "Assert.False",
      "Assert.Null",
      "Assert.NotNull",
      "Assert.Throws",
      "Assert.ThrowsAsync",
      "Assert.Contains",
      "Assert.Empty",
      "Assert.NotEmpty",
      "Assert.Single",
      "Assert.IsType",
      "Assert.IsNotType",
      "Assert.StartsWith",
      "Assert.EndsWith",
      "Assert.Matches",
      "Assert.DoesNotMatch",
      "Assert.Equivalent",
      "Assert.StrictEqual",
      "Assert.NotStrictEqual",
    ],
    assertionPatterns: [
      "\\bAssert\\.(?:Equal|NotEqual|True|False|Null|NotNull|Throws|ThrowsAsync|Contains|Empty|NotEmpty|Single|IsType|IsNotType|StartsWith|EndsWith|Matches|DoesNotMatch|Equivalent|StrictEqual|NotStrictEqual|InRange|NotInRange|PropertyChanged|Same|NotSame|AssignableFrom|NotAssignableFrom|IsAssignableFrom|All|Collection|Distinct|DoesNotContain|DoesNotThrow|EndsWith|Equal|Fail|InRange|IsType|NotInRange|NotEmpty|NotEqual|NotNull|NotStrictEqual|NotType|Null|PropertyChanged|ProperSuperset|ProperSubset|Single|StartsWith|Subset|Superset|ThrowsAny|ThrowsAnyAsync)\\s*\\(",
    ],
  },
  {
    framework: "testng",
    assertionMethods: [
      "assertEquals",
      "assertTrue",
      "assertFalse",
      "assertNull",
      "assertNotNull",
      "assertSame",
      "assertNotSame",
      "assertThrows",
      "fail",
    ],
    assertionPatterns: [
      "\\bassert(?:Equals|True|False|Null|NotNull|Same|NotSame|Throws)\\s*\\(",
      "\\bAssert\\.assert\\w+\\s*\\(",
      "\\bfail\\s*\\(",
    ],
  },
];

/**
 * Get assertion vocabulary for a specific framework.
 * Returns undefined for unknown frameworks.
 */
export function getAssertionVocabulary(
  framework: string,
): AssertionVocabulary | undefined {
  return ASSERTION_VOCABULARIES.find((v) => v.framework === framework);
}

/**
 * Total number of registered assertion vocabularies.
 */
export const ASSERTION_VOCABULARY_COUNT = ASSERTION_VOCABULARIES.length;
