import { describe, expect, it } from "vitest";

import {
  DOUBLE_CAPABILITY,
  HOLLOW_RISKS,
  assessDoubleRisk,
  assessSuite,
  hollowFingerprint,
  isEvidential,
} from "../../src/v6/test-doubles.js";
import { normalize, type NeutralTest } from "../../src/v6/qa-ir.js";
import {
  IGNORED_TOOLING,
  NOT_QA_TOOLING,
  classifyIgnoredTooling,
  classifyName,
  classifyNotQaTooling,
} from "../../src/v6/ecosystem-census.js";

const test = (
  labels: string[],
  extra: Partial<NeutralTest> = {},
): NeutralTest =>
  normalize({ dialect: "ts", assertionLabels: labels, ...extra });

describe("the false proof the product is named after", () => {
  it("flags a test whose every assertion is about a double", () => {
    // `mock.assert_called_once()` proves the test called its own mock.
    const finding = assessDoubleRisk(
      test(["toHaveBeenCalled", "toHaveBeenCalled"]),
    );
    expect(finding.risk).toBe("DOUBLE_ONLY");
    expect(finding.doubleAssertions).toBe(2);
    expect(finding.substantiatingAssertions).toBe(0);
    expect(finding.hollowRatio).toBe(1);
    expect(isEvidential(finding)).toBe(false);
    expect(HOLLOW_RISKS.has(finding.risk)).toBe(true);
  });

  it("flags a test that asserts nothing at all", () => {
    // Zero findings is not a pass. A test with no assertion is not
    // evidence, and reporting it as one is the oldest false proof there
    // is.
    const finding = assessDoubleRisk(test([]));
    expect(finding.risk).toBe("NO_ASSERTION");
    expect(finding.hollowRatio).toBe(0);
    expect(isEvidential(finding)).toBe(false);
  });

  it("accepts a test that also checks real behaviour, however many doubles it touches", () => {
    // The over-report here is as harmful as the under-report: a detector
    // that flags every mock-using test trains users to ignore it.
    const finding = assessDoubleRisk(
      test(["toHaveBeenCalled", "toBe", "toMatch"]),
    );
    expect(finding.risk).toBe("DOUBLE_MIXED");
    expect(finding.doubleAssertions).toBe(1);
    expect(finding.substantiatingAssertions).toBe(2);
    expect(isEvidential(finding)).toBe(true);
  });

  it("clears a test whose double IS the subject, when the caller says so", () => {
    // A test suite *for* a fake HTTP client legitimately asserts on that
    // fake. Only the caller knows the intent, so only the caller can
    // clear it -- and the default is to report.
    const doubles = test(["toHaveBeenCalled"]);
    expect(assessDoubleRisk(doubles).risk).toBe("DOUBLE_ONLY");
    expect(assessDoubleRisk(doubles, { doubleIsSubject: true }).risk).toBe(
      "DOUBLE_SUBJECT",
    );
    expect(
      isEvidential(assessDoubleRisk(doubles, { doubleIsSubject: true })),
    ).toBe(true);
  });

  it("produces a statement a surface can render verbatim", () => {
    // A finding whose prose a renderer has to invent is a finding a
    // renderer will mis-word, and a mis-worded false-proof warning is
    // worse than none.
    expect(assessDoubleRisk(test(["toHaveBeenCalled"])).statement).toMatch(
      /proves the test called its own mock/,
    );
    expect(assessDoubleRisk(test([])).statement).toMatch(/asserts nothing/);
    expect(
      assessDoubleRisk(test(["toBe", "toHaveBeenCalled"])).statement,
    ).toMatch(/at least one assertion checks real behaviour/);
  });
});

describe("the same detection across all four dialects", () => {
  it("finds the double-only shape in ts, python, java and csharp alike", () => {
    // This is the Wave 2 IR paying for itself: one derivation, four
    // dialects, no per-framework rule.
    const shapes: Array<[string, string[]]> = [
      ["ts", ["toHaveBeenCalled"]],
      ["python", ["assert_called"]],
      ["java", ["verify"]],
      ["csharp", ["Verifiable"]],
    ];
    for (const [dialect, labels] of shapes) {
      const finding = assessDoubleRisk(
        normalize({ dialect: dialect as "ts", assertionLabels: labels }),
      );
      expect(finding.risk, dialect).toBe("DOUBLE_ONLY");
    }
  });

  it("finds the substantiating shape in all four too", () => {
    const shapes: Array<[string, string[]]> = [
      ["ts", ["toHaveBeenCalled", "toBe"]],
      ["python", ["assert_called", "assert_equal"]],
      ["java", ["verify", "assertEquals"]],
      ["csharp", ["Verifiable", "Equal"]],
    ];
    for (const [dialect, labels] of shapes) {
      const finding = assessDoubleRisk(
        normalize({ dialect: dialect as "ts", assertionLabels: labels }),
      );
      expect(finding.risk, dialect).toBe("DOUBLE_MIXED");
    }
  });

  it("sees through a double that a dialect encodes as a negated interaction", () => {
    // `never()` and `not_called` are still assertions about a double.
    const finding = assessDoubleRisk(
      normalize({ dialect: "python", assertionLabels: ["assert_not_called"] }),
    );
    expect(finding.risk).toBe("DOUBLE_ONLY");
  });
});

describe("a suite roll-up, which is the statement a user needs at the top", () => {
  it("calls a suite hollow when no test in it substantiates anything", () => {
    const suite = assessSuite([
      assessDoubleRisk(test(["toHaveBeenCalled"])),
      assessDoubleRisk(test([])),
      assessDoubleRisk(test(["verify"])),
    ]);
    expect(suite.tests).toBe(3);
    expect(suite.hollow).toBe(3);
    expect(suite.verdict).toBe("HOLLOW");
  });

  it("calls a suite partially hollow when only some tests are", () => {
    const suite = assessSuite([
      assessDoubleRisk(test(["toHaveBeenCalled"])),
      assessDoubleRisk(test(["toBe", "toMatch"])),
    ]);
    expect(suite.verdict).toBe("PARTIALLY_HOLLOW");
    expect(suite.substantiating).toBe(1);
    expect(suite.hollowRatio).toBe(0.5);
  });

  it("does not divide by zero on an empty suite", () => {
    const suite = assessSuite([]);
    expect(suite.tests).toBe(0);
    expect(suite.hollowRatio).toBe(0);
    // An empty suite is not a hollow one -- there is nothing to hollow.
    expect(suite.verdict).toBe("SUBSTANTIATED");
  });
});

describe("the capability is declared where the registry can find it", () => {
  it("names itself and carries an honest maturity with a real gap", () => {
    expect(DOUBLE_CAPABILITY.id).toBe("test.doubles.hollow-assertion");
    // M2, not M3: there is no per-capability fixture-quad gate yet, so M3
    // is unreachable for everything (`GAP-V6-004`).
    expect(DOUBLE_CAPABILITY.maturity).toBe("M2_IMPLEMENTED");
    expect(
      DOUBLE_CAPABILITY.nextLevelGap.missing.length,
    ).toBeGreaterThanOrEqual(4);
    expect(DOUBLE_CAPABILITY.nextLevelGap.owner).toBe("test-doubles");
  });
});

describe("fingerprints dedupe the same finding across dialects", () => {
  it("gives a double-only test one fingerprint whatever wrote it", () => {
    const ts = hollowFingerprint(
      normalize({ dialect: "ts", assertionLabels: ["toHaveBeenCalled"] }),
    );
    const csharp = hollowFingerprint(
      normalize({ dialect: "csharp", assertionLabels: ["Verifiable"] }),
    );
    expect(ts).toBe(csharp);
  });
});

describe("Law 8 in the other direction — a gap list that is not a gap", () => {
  it("stops counting error trackers and CI API clients as capability gaps", () => {
    // The first corpus run reported 44 unrecognized tools, 15 of which
    // were Sentry, OpenTelemetry, Octokit and the Actions SDK. None of
    // them says something about test quality, and all of them were
    // occupying a gap slot and drowning the four real findings.
    //
    // This asserts the OUTCOME rather than the entry, which is the
    // property that matters: a name becomes a gap only when it matches a
    // QA category pattern and is not exempted.
    for (const name of [
      "@sentry/node",
      "@sentry/core",
      "@opentelemetry/api",
      "@elastic/elasticsearch",
      "@octokit/rest",
      "@actions/core",
    ]) {
      const isQaTooling = classifyName(name) !== null;
      const isExempt =
        classifyNotQaTooling(name) !== null ||
        classifyIgnoredTooling(name) !== null;
      expect(isQaTooling && !isExempt, name).toBe(false);
    }
  });

  it("does not report application dependencies at all, not even as out-of-scope", () => {
    // A report that opens with `react` buries the four real findings under
    // the first forty dependencies. Two tiers, not one: the plausible-
    // but-not-QA tier is answered, the obvious tier is not mentioned.
    for (const name of ["react", "react-dom", "vue", "webpack", "vite"]) {
      expect(classifyIgnoredTooling(name), name).not.toBeNull();
      expect(classifyNotQaTooling(name), name).toBeNull();
    }
  });

  it("reaches the same outcome for build tooling, without naming it", () => {
    // `eslint` and `typescript` are this repository's own build tooling.
    // Naming them in an exemption list would be a judgement about THIS
    // stack, and the next repository would need a new entry. They still
    // cannot become gaps, because they match no QA name pattern either.
    for (const name of ["typescript", "eslint", "prettier"]) {
      const isQaTooling = classifyName(name) !== null;
      expect(isQaTooling, name).toBe(false);
    }
  });

  it("keeps the tools that genuinely are QA tooling out of the exemption", () => {
    // The whole point of the exemption is that it is narrow. If it ever
    // swallows a real gap, the fix is to tighten it -- never to widen it.
    for (const name of [
      "pytest-mock",
      "pytest-xdist",
      "@axe-core/playwright",
      "jest-junit",
      "k6",
      "msw",
      "nock",
      "axe-core",
    ]) {
      expect(classifyNotQaTooling(name), name).toBeNull();
    }
  });

  it("states a reason per exemption, so the judgement can be re-made", () => {
    for (const entry of [...NOT_QA_TOOLING, ...IGNORED_TOOLING]) {
      expect(entry.id).toBeTruthy();
      expect(entry.rationale.length, entry.id).toBeGreaterThan(60);
    }
  });
});
