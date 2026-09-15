import { describe, expect, it } from "vitest";
import {
  ASSERTION_VOCABULARIES,
  ASSERTION_VOCABULARY_COUNT,
  getAssertionVocabulary,
} from "../../../src/rules/families/no-assertions.js";

const EXPECTED_FRAMEWORKS = [
  "jest",
  "vitest",
  "pytest",
  "junit",
  "nunit",
  "xunit",
  "testng",
] as const;

describe("no-assertions vocabulary", () => {
  it("defines vocabularies for all 7 frameworks", () => {
    expect(ASSERTION_VOCABULARY_COUNT).toBe(7);
    expect(ASSERTION_VOCABULARIES).toHaveLength(7);
  });

  it.each(EXPECTED_FRAMEWORKS)("%s has a vocabulary", (framework) => {
    const vocab = getAssertionVocabulary(framework);
    expect(vocab).toBeDefined();
    expect(vocab?.framework).toBe(framework);
    expect(vocab?.assertionMethods.length).toBeGreaterThan(0);
    expect(vocab?.assertionPatterns.length).toBeGreaterThan(0);
  });

  it("returns undefined for unknown framework", () => {
    expect(getAssertionVocabulary("unknown-framework")).toBeUndefined();
  });

  it("all patterns are valid regex", () => {
    for (const vocab of ASSERTION_VOCABULARIES) {
      for (const pattern of vocab.assertionPatterns) {
        expect(() => new RegExp(pattern)).not.toThrow();
      }
    }
  });

  it("Jest vocabulary includes expect", () => {
    const vocab = getAssertionVocabulary("jest");
    expect(vocab).toBeDefined();
    expect(vocab?.assertionMethods).toContain("expect");
  });

  it("pytest vocabulary includes assert", () => {
    const vocab = getAssertionVocabulary("pytest");
    expect(vocab).toBeDefined();
    expect(vocab?.assertionMethods).toContain("assert");
  });

  it("JUnit vocabulary includes assertEquals", () => {
    const vocab = getAssertionVocabulary("junit");
    expect(vocab).toBeDefined();
    expect(vocab?.assertionMethods).toContain("assertEquals");
  });

  it("NUnit vocabulary includes Assert.That", () => {
    const vocab = getAssertionVocabulary("nunit");
    expect(vocab).toBeDefined();
    expect(vocab?.assertionMethods).toContain("Assert.That");
  });

  it("xUnit vocabulary includes Assert.Equal", () => {
    const vocab = getAssertionVocabulary("xunit");
    expect(vocab).toBeDefined();
    expect(vocab?.assertionMethods).toContain("Assert.Equal");
  });

  it("TestNG vocabulary includes assertEquals", () => {
    const vocab = getAssertionVocabulary("testng");
    expect(vocab).toBeDefined();
    expect(vocab?.assertionMethods).toContain("assertEquals");
  });

  it("framework names are unique", () => {
    const names = ASSERTION_VOCABULARIES.map((v) => v.framework);
    expect(new Set(names).size).toBe(names.length);
  });
});
