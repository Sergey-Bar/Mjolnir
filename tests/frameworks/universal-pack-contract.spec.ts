import { describe, expect, it } from "vitest";

import {
  FRAMEWORK_CAPABILITY_TIERS,
  FRAMEWORK_LIFECYCLE_RULES,
  FRAMEWORK_SEMANTIC_RULES,
  UNIVERSAL_FRAMEWORK_PACK_AUTHORITY,
  UNIVERSAL_FRAMEWORK_PACK_LIMITS,
  createUniversalFrameworkPackFactoryRecord,
  createUniversalFrameworkPackManifest,
  type FrameworkRuleCoverageSet,
  type UniversalFrameworkPackDefinition,
  type UniversalFrameworkPackDiagnostic,
} from "../../src/frameworks/universal-pack-contract.js";

function evidence(rule: string, index: number) {
  return [
    {
      kind: "test" as const,
      id: `tests/frameworks/${rule}-${index}.spec.ts`,
    },
  ];
}

function coverage(): FrameworkRuleCoverageSet {
  return {
    semantic: FRAMEWORK_SEMANTIC_RULES.map((rule, index) => ({
      rule,
      tier: "supported" as const,
      evidence: evidence(rule, index),
    })),
    lifecycle: FRAMEWORK_LIFECYCLE_RULES.map((rule, index) => ({
      rule,
      tier: "supported" as const,
      evidence: evidence(rule, index),
    })),
  };
}

function definition(
  overrides: Partial<UniversalFrameworkPackDefinition> = {},
): UniversalFrameworkPackDefinition {
  const base: UniversalFrameworkPackDefinition = {
    packId: "example-framework-pack",
    frameworkId: "example-framework",
    packVersion: "1.0.0",
    compatibility: {
      min: "1.0.0",
      maxExclusive: "2.0.0",
      validatedVersions: ["1.0.0", "1.2.0", "1.5.0"],
    },
    coverage: coverage(),
  };
  return {
    ...base,
    ...overrides,
    compatibility: overrides.compatibility ?? base.compatibility,
    coverage: overrides.coverage ?? base.coverage,
  };
}

function codes(
  diagnostics: readonly UniversalFrameworkPackDiagnostic[],
): string[] {
  return diagnostics.map((diagnostic) => diagnostic.code);
}

describe("M41 universal framework pack contract", () => {
  it("creates a typed bounded manifest with explicit non-certification", () => {
    const factory = createUniversalFrameworkPackFactoryRecord(definition());
    expect(factory.status).toBe("accepted");
    expect(factory.record?.authority).toEqual(
      UNIVERSAL_FRAMEWORK_PACK_AUTHORITY,
    );

    const result = createUniversalFrameworkPackManifest(
      factory.record,
      "1.2.0",
    );
    expect(result.status).toBe("accepted");
    expect(result.manifest).toMatchObject({
      packId: "example-framework-pack",
      frameworkId: "example-framework",
      frameworkVersion: "1.2.0",
      authority: {
        certification: "not-claimed",
        verdict: "not-declared",
        gate: "none",
      },
    });
    expect(result.manifest?.coverage.semantic.map((item) => item.rule)).toEqual(
      [...FRAMEWORK_SEMANTIC_RULES],
    );
    expect(
      result.manifest?.coverage.lifecycle.map((item) => item.rule),
    ).toEqual([...FRAMEWORK_LIFECYCLE_RULES]);
    expect(JSON.stringify(result.manifest)).not.toContain("PASS");
  });

  it("rejects unsupported and conflicting framework versions", () => {
    const factory = createUniversalFrameworkPackFactoryRecord(definition());
    const unsupported = createUniversalFrameworkPackManifest(
      factory.record,
      "1.4.0",
    );
    expect(unsupported.status).toBe("unsupported");
    expect(codes(unsupported.diagnostics)).toContain(
      "FRAMEWORK_VERSION_UNSUPPORTED",
    );

    const conflicting = createUniversalFrameworkPackFactoryRecord(
      definition({
        compatibility: {
          min: "2.0.0",
          maxExclusive: "1.0.0",
          validatedVersions: ["1.5.0"],
        },
      }),
    );
    expect(conflicting.status).toBe("rejected");
    expect(codes(conflicting.diagnostics)).toContain("VERSION_RANGE_CONFLICT");
  });

  it("rejects missing lifecycle coverage", () => {
    const incomplete = coverage();
    const result = createUniversalFrameworkPackFactoryRecord(
      definition({
        coverage: {
          ...incomplete,
          lifecycle: incomplete.lifecycle.slice(1),
        },
      }),
    );

    expect(result.status).toBe("rejected");
    expect(result.diagnostics).toContainEqual({
      code: "LIFECYCLE_COVERAGE_INCOMPLETE",
      path: "coverage.lifecycle",
      message: "Framework pack must declare each required rule exactly once",
    });

    const missingDimension = createUniversalFrameworkPackFactoryRecord({
      ...definition(),
      coverage: { semantic: incomplete.semantic },
    });
    expect(missingDimension.status).toBe("rejected");
    expect(codes(missingDimension.diagnostics)).toContain(
      "LIFECYCLE_COVERAGE_INCOMPLETE",
    );
  });

  it("canonicalizes factory and manifest output deterministically", () => {
    const base = coverage();
    const firstCoverage: FrameworkRuleCoverageSet = {
      semantic: [...base.semantic].reverse().map((item) => ({
        ...item,
        evidence: [...item.evidence].reverse(),
      })),
      lifecycle: [...base.lifecycle].reverse(),
    };
    const secondCoverage: FrameworkRuleCoverageSet = {
      semantic: [...base.semantic].map((item) => ({
        ...item,
        evidence: [...item.evidence].reverse(),
      })),
      lifecycle: [...base.lifecycle],
    };
    const firstDefinition = {
      coverage: firstCoverage,
      compatibility: {
        validatedVersions: ["1.5.0", "1.0.0", "1.2.0"],
        maxExclusive: "2.0.0",
        min: "1.0.0",
      },
      packVersion: "1.0.0",
      frameworkId: "example-framework",
      packId: "example-framework-pack",
    } as const;
    const secondDefinition = definition({
      coverage: secondCoverage,
      compatibility: {
        min: "1.0.0",
        maxExclusive: "2.0.0",
        validatedVersions: ["1.0.0", "1.2.0", "1.5.0"],
      },
    });

    const firstFactory =
      createUniversalFrameworkPackFactoryRecord(firstDefinition);
    const secondFactory =
      createUniversalFrameworkPackFactoryRecord(secondDefinition);
    expect(firstFactory).toEqual(secondFactory);
    expect(JSON.stringify(firstFactory)).toBe(JSON.stringify(secondFactory));

    const firstManifest = createUniversalFrameworkPackManifest(
      firstFactory.record,
      "1.2.0",
    );
    const secondManifest = createUniversalFrameworkPackManifest(
      secondFactory.record,
      "1.2.0",
    );
    expect(firstManifest).toEqual(secondManifest);
    expect(JSON.stringify(firstManifest)).toBe(JSON.stringify(secondManifest));
    expect(firstManifest.manifest?.compatibility.validatedVersions).toEqual([
      "1.0.0",
      "1.2.0",
      "1.5.0",
    ]);
    expect(
      firstManifest.manifest?.coverage.semantic.map((item) => item.rule),
    ).toEqual([...FRAMEWORK_SEMANTIC_RULES]);
    expect(
      firstManifest.manifest?.coverage.lifecycle.map((item) => item.rule),
    ).toEqual([...FRAMEWORK_LIFECYCLE_RULES]);
  });

  it("rejects PASS and authority claims in definitions and factories", () => {
    const passClaim = createUniversalFrameworkPackFactoryRecord({
      ...definition(),
      description: "PASS",
    });
    expect(passClaim.status).toBe("rejected");
    expect(codes(passClaim.diagnostics)).toContain("PASS_FORBIDDEN");

    const authorityClaim = createUniversalFrameworkPackFactoryRecord({
      ...definition(),
      verdict: "certified",
    });
    expect(authorityClaim.status).toBe("rejected");
    expect(codes(authorityClaim.diagnostics)).toContain("AUTHORITY_FORBIDDEN");

    const validFactory =
      createUniversalFrameworkPackFactoryRecord(definition());
    if (validFactory.record === null) {
      throw new Error("Expected a valid factory fixture");
    }
    const hostileFactory = {
      ...validFactory.record,
      authority: {
        certification: "certified",
        verdict: "PASS",
        gate: "release",
      },
    };
    const factoryResult = createUniversalFrameworkPackManifest(
      hostileFactory,
      "1.2.0",
    );
    expect(factoryResult.status).toBe("rejected");
    expect(codes(factoryResult.diagnostics)).toContain("AUTHORITY_FORBIDDEN");
  });

  it("requires evidence for claimed tiers and permits explicit unsupported coverage", () => {
    const base = coverage();
    const first = base.semantic[0];
    if (first === undefined) throw new Error("Expected semantic coverage");
    const missingEvidence = createUniversalFrameworkPackFactoryRecord(
      definition({
        coverage: {
          ...base,
          semantic: [{ ...first, evidence: [] }, ...base.semantic.slice(1)],
        },
      }),
    );
    expect(missingEvidence.status).toBe("rejected");
    expect(codes(missingEvidence.diagnostics)).toContain("EVIDENCE_REQUIRED");

    const unsupported = createUniversalFrameworkPackFactoryRecord(
      definition({
        coverage: {
          ...base,
          semantic: [
            {
              ...first,
              tier: "unsupported",
              evidence: [],
              limitation: "No executable semantic adapter is registered",
            },
            ...base.semantic.slice(1),
          ],
        },
      }),
    );
    expect(unsupported.status).toBe("accepted");
    expect(unsupported.record?.definition.coverage.semantic[0]?.tier).toBe(
      "unsupported",
    );
    expect(FRAMEWORK_CAPABILITY_TIERS).not.toContain("certified");
  });

  it("bounds version and evidence lists", () => {
    const versions = Array.from(
      { length: UNIVERSAL_FRAMEWORK_PACK_LIMITS.maxValidatedVersions + 1 },
      (_, index) => `1.0.${index}`,
    );
    const excessiveVersions = createUniversalFrameworkPackFactoryRecord(
      definition({
        compatibility: {
          min: "1.0.0",
          maxExclusive: "2.0.0",
          validatedVersions: versions,
        },
      }),
    );
    expect(excessiveVersions.status).toBe("rejected");

    const base = coverage();
    const first = base.semantic[0];
    if (first === undefined) throw new Error("Expected semantic coverage");
    const excessiveEvidence = createUniversalFrameworkPackFactoryRecord(
      definition({
        coverage: {
          ...base,
          semantic: [
            {
              ...first,
              evidence: Array.from(
                {
                  length:
                    UNIVERSAL_FRAMEWORK_PACK_LIMITS.maxEvidencePerRule + 1,
                },
                (_, index) => ({ kind: "test" as const, id: `test-${index}` }),
              ),
            },
            ...base.semantic.slice(1),
          ],
        },
      }),
    );
    expect(excessiveEvidence.status).toBe("rejected");
    expect(codes(excessiveEvidence.diagnostics)).toContain("EVIDENCE_INVALID");
  });
});
