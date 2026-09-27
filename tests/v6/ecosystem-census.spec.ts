import { describe, expect, it } from "vitest";

import {
  BLIND_EVIDENCE_RESOLVER,
  CENSUS_CATEGORIES,
  CENSUS_NAME_PATTERNS,
  CENSUS_STATES,
  buildCensus,
  buildClassifiedResults,
  buildGapBacklog,
  applyStalenessDemotions,
  canonicalProviderSlug,
  censusSlug,
  classifyName,
  classifyObservations,
  normalizeMajors,
  validateCensus,
  versionMajor,
  type Census,
  type CensusEntry,
  type CensusEvidenceResolver,
  type DiscoveryObservation,
  type DiscoveryResult,
} from "../../src/v6/ecosystem-census.js";
import { validateNextLevelGap } from "../../src/v6/maturity.js";

const OBSERVED_AT = "2026-01-01";

function resolver(
  overrides: Partial<CensusEvidenceResolver> = {},
): CensusEvidenceResolver {
  return { ...BLIND_EVIDENCE_RESOLVER, ...overrides };
}

/**
 * `CensusEntry` declares `upstream?: string`. Under
 * `exactOptionalPropertyTypes` a `Partial<CensusEntry>` spread would let a
 * caller pass `upstream: undefined`, which the type forbids, so the
 * override type pins the optional field out of the way and the helper owns
 * it.
 */
function entry(
  overrides: Partial<Omit<CensusEntry, "upstream">> = {},
): CensusEntry {
  return {
    id: "ec.test-framework.example",
    name: "example",
    category: "test-framework",
    state: "SUPPORTED",
    owner: "test",
    observedAt: OBSERVED_AT,
    signals: [{ kind: "dependency", ecosystem: "npm", name: "example" }],
    adapter: "src/adapters/example.ts",
    blocksAxes: [],
    successor: null,
    removalDate: null,
    notApplicableReason: null,
    upstreamPackages: [{ ecosystem: "npm", name: "example" }],
    handledUpstreamMajors: ["1"],
    revisitTrigger: "trigger",
    // Supplied in the base, not in `overrides`: a spread of a
    // `Partial<>` would otherwise make these two required fields optional
    // in the resulting type, and the helper would not satisfy `CensusEntry`.
    maturity: "M1_DECLARED",
    nextLevelGap: {
      target: "M2_IMPLEMENTED",
      missing: ["an implementation and unit tests"],
      owner: "test",
      revisitTrigger: "an implementation lands",
    },
    ...overrides,
  };
}

function census(entries: CensusEntry[]): Census {
  return {
    schemaVersion: 1,
    censusId: "mjolnir-ecosystem-census",
    observedAt: OBSERVED_AT,
    entries,
  };
}

describe("Law 8 / ADR 0010 — the census is well-formed by construction", () => {
  const built = buildCensus({ observedAt: OBSERVED_AT });

  it("derives entries from the existing primitives instead of re-typing them", () => {
    // ADR 0007: the census projects the framework inventory and the
    // provider-capability contract rather than restating them.
    const ids = new Set(built.entries.map((e) => e.id));
    expect(ids.has("ec.component-e2e.playwright")).toBe(true);
    expect(ids.has("ec.test-framework.vitest")).toBe(true);
    for (const id of ids) expect(id).toMatch(/^ec\.[a-z0-9-]+\.[a-z0-9-]+$/);
  });

  it("emits each CI provider exactly once, joining the two primitives", () => {
    // FRAMEWORK_INVENTORY calls it `azure-devops`; the provider contract
    // calls it `azure-pipelines`. Both describe one census entry, and a
    // consumer must not have to guess which id to look up.
    const providers = built.entries.filter(
      (e) => e.category === "ci-cd-provider",
    );
    const slugs = providers.map((e) => e.id);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toContain("ec.ci-cd-provider.azure-pipelines");
    expect(slugs).not.toContain("ec.ci-cd-provider.azure-devops");
    expect(canonicalProviderSlug("azure-devops")).toBe("azure-pipelines");
  });

  it("has no duplicate ids and only closed-enum values", () => {
    const ids = built.entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of built.entries) {
      expect(CENSUS_STATES).toContain(e.state);
      expect(CENSUS_CATEGORIES).toContain(e.category);
    }
  });

  it("passes its own validator", () => {
    const errors = validateCensus(built, resolver()).filter(
      (d) => d.severity === "error",
    );
    expect(errors).toEqual([]);
  });

  it("gives every entry an owner and at least one detection signal", () => {
    for (const e of built.entries) {
      expect(e.owner.trim()).not.toBe("");
      expect(e.signals.length).toBeGreaterThan(0);
    }
  });

  it("carries a real nextLevelGap on every TARGET, per D1", () => {
    const targets = built.entries.filter((e) => e.state === "TARGET");
    expect(targets.length).toBeGreaterThan(0);
    for (const e of targets) {
      expect(e.nextLevelGap).not.toBeNull();
      expect(validateNextLevelGap(e.maturity, e.nextLevelGap)).toEqual({
        ok: true,
      });
    }
  });

  it("seeds the tools the blueprint names as previously omitted", () => {
    const names = new Set(built.entries.map((e) => e.name));
    for (const required of [
      "Cucumber",
      "SpecFlow",
      "Karate",
      "REST Assured",
      "Pact",
      "Postman / Newman",
      "Bruno",
      "Testcontainers",
      "Playwright Components",
      "Robot Framework",
      "k6",
      "Gatling",
      "Locust",
      "TestRail",
      "Xray",
      "Zephyr",
      "Azure Test Plans",
      "Terraform",
      "Kubernetes manifests",
    ]) {
      expect(names.has(required)).toBe(true);
    }
  });

  it("seeds them as TARGET with no adapter, never as a support claim", () => {
    const cucumber = built.entries.find((e) => e.name === "Cucumber");
    expect(cucumber?.state).toBe("TARGET");
    expect(cucumber?.adapter).toBeNull();
    // Declared, not proven: seeding a name must not invent maturity.
    expect(cucumber?.maturity).toBe("M1_DECLARED");
  });

  it("is a function of the checkout alone, so the artifact is byte-stable", () => {
    // The corpus cache is absent here on purpose: a registry that changed
    // with the presence of a local cache would not be reproducible.
    const first = buildCensus({ observedAt: OBSERVED_AT });
    const second = buildCensus({ observedAt: OBSERVED_AT });
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("never advertises a maturity above the evidence", () => {
    // A blind resolver sees nothing, so nothing may be above M1.
    for (const e of buildCensus({
      resolver: resolver(),
      observedAt: OBSERVED_AT,
    }).entries) {
      expect(["M0_UNKNOWN", "M1_DECLARED"]).toContain(e.maturity);
    }
  });
});

describe("ADR 0010 — the validator rejects an unfalsifiable census", () => {
  const codes = (entries: CensusEntry[]): string[] =>
    validateCensus(census(entries), resolver())
      .filter((d) => d.severity === "error")
      .map((d) => d.code);

  it("rejects SUPPORTED without an adapter", () => {
    expect(codes([entry({ adapter: null })])).toContain(
      "SUPPORTED_WITHOUT_ADAPTER",
    );
  });

  it("rejects a TARGET with no gap", () => {
    expect(codes([entry({ state: "TARGET", nextLevelGap: null })])).toContain(
      "TARGET_WITHOUT_GAP",
    );
  });

  it("rejects DEPRECATED without a successor and without a removal date", () => {
    expect(codes([entry({ state: "DEPRECATED" })])).toEqual(
      expect.arrayContaining([
        "DEPRECATED_WITHOUT_SUCCESSOR",
        "DEPRECATED_WITHOUT_REMOVAL_DATE",
      ]),
    );
  });

  it("rejects NOT_APPLICABLE without a recorded reason", () => {
    expect(codes([entry({ state: "NOT_APPLICABLE" })])).toContain(
      "NOT_APPLICABLE_WITHOUT_REASON",
    );
  });

  it("rejects UNRECOGNIZED in the curated registry, which is a discovery output", () => {
    expect(codes([entry({ state: "UNRECOGNIZED" })])).toContain(
      "UNRECOGNIZED_IN_SOURCE",
    );
  });

  it("rejects an entry nobody can detect and an unowned one", () => {
    expect(codes([entry({ signals: [] })])).toContain("MISSING_SIGNALS");
    expect(codes([entry({ owner: "" })])).toContain("MISSING_OWNER");
  });

  it("rejects duplicate ids", () => {
    expect(codes([entry(), entry()])).toContain("DUPLICATE_ID");
  });

  it("rejects an over-claimed maturity a blind resolver cannot support", () => {
    expect(codes([entry({ maturity: "M4_CORPUS_VERIFIED" })])).toContain(
      "OVER_CLAIMED_MATURITY",
    );
  });
});

describe("ADR 0010 rule 3 — the staleness trigger", () => {
  const stale = resolver({ observedUpstreamMajor: () => "16" });
  const current = resolver({ observedUpstreamMajor: () => "13" });
  const unknown = resolver({ observedUpstreamMajor: () => null });

  it("auto-demotes a SUPPORTED entry whose upstream moved past the adapter", () => {
    const view = applyStalenessDemotions(
      census([entry({ handledUpstreamMajors: ["13"] })]),
      stale,
    );
    expect(view.entries[0]?.state).toBe("TARGET");
    expect(view.demotions).toHaveLength(1);
    expect(view.demotions[0]?.observedMajor).toBe("16");
    expect(view.demotions[0]?.reason).toMatch(/auto-demoted SUPPORTED/);
  });

  it("leaves a SUPPORTED entry alone when the observed major is handled", () => {
    const view = applyStalenessDemotions(
      census([entry({ handledUpstreamMajors: ["13"] })]),
      current,
    );
    expect(view.entries[0]?.state).toBe("SUPPORTED");
    expect(view.demotions).toEqual([]);
  });

  it("treats an unobservable major as no verdict, never as up to date", () => {
    const view = applyStalenessDemotions(
      census([entry({ handledUpstreamMajors: ["13"] })]),
      unknown,
    );
    expect(view.entries[0]?.state).toBe("SUPPORTED");
    expect(view.demotions).toEqual([]);
  });

  it("does not demote an entry that has no validated set to compare against", () => {
    const view = applyStalenessDemotions(
      census([entry({ handledUpstreamMajors: [] })]),
      stale,
    );
    expect(view.demotions).toEqual([]);
  });

  it("keeps the base registry independent of the demotion", () => {
    // The demotion is a *view*. Folding it into the registry would make
    // the generated artifact differ between two machines at one commit.
    const base = census([entry({ handledUpstreamMajors: ["13"] })]);
    applyStalenessDemotions(base, stale);
    expect(base.entries[0]?.state).toBe("SUPPORTED");
  });

  it("normalises a validated version list to its majors", () => {
    expect(normalizeMajors(["1.44", "1.45", "1.46", "29", "30"])).toEqual([
      "1",
      "29",
      "30",
    ]);
    expect(normalizeMajors(["v4"])).toEqual(["4"]);
    expect(normalizeMajors(["catalog:"])).toEqual([]);
  });

  it("extracts a major from a version or a range", () => {
    expect(versionMajor("^29.7.0")).toBe("29");
    expect(versionMajor("~2.0.0")).toBe("2");
    expect(versionMajor(">=8")).toBe("8");
    expect(versionMajor("1.44.1")).toBe("1");
    expect(versionMajor("workspace:*")).toBeNull();
    expect(versionMajor("catalog:")).toBeNull();
  });
});

describe("Law 8 / ADR 0010 — the name classifier", () => {
  it("places a QA tool in a category and an application dependency nowhere", () => {
    // `jest` is a test *runner*, not a test framework. The distinction is
    // the whole point of having a category per kind, so the classifier is
    // asserted against the exact category rather than a plausible one.
    expect(classifyName("jest")?.category).toBe("test-runner");
    expect(classifyName("vitest")?.category).toBe("test-runner");
    expect(classifyName("@playwright/test")?.category).toBe("component-e2e");
    expect(classifyName("pytest")?.category).toBe("test-framework");
    expect(classifyName("org.junit.jupiter")?.category).toBe("test-framework");
    expect(classifyName("k6")?.category).toBe("load-performance");
    // An ordinary dependency is not an ecosystem gap.
    expect(classifyName("react")).toBeNull();
    expect(classifyName("lodash")).toBeNull();
  });

  it("declares every pattern as owned, dated and versioned data", () => {
    for (const pattern of CENSUS_NAME_PATTERNS) {
      expect(pattern.id).toBeTruthy();
      expect(pattern.rationale.length).toBeGreaterThanOrEqual(20);
      expect(pattern.owner.trim()).not.toBe("");
      expect(pattern.observedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(CENSUS_CATEGORIES).toContain(pattern.category);
    }
  });

  it("gives each pattern a unique id", () => {
    const ids = CENSUS_NAME_PATTERNS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("ADR 0010 — classification and the frequency-ranked backlog", () => {
  const built = buildCensus({ observedAt: OBSERVED_AT });
  const obs = (name: string, via: string): DiscoveryObservation => ({
    censusId: null,
    name,
    category: "UNCLASSIFIED",
    via,
  });

  it("matches a census signal across ecosystems, so a handled tool is never a gap", () => {
    // The census declares playwright for npm; the field installs it under
    // pypi too. A tool we claim to handle must not appear in the gap report.
    const { recognized, unrecognized } = classifyObservations(built, [
      obs("playwright", "dep:pypi:playwright"),
      obs("vitest", "dep:npm:vitest"),
    ]);
    expect(recognized).toHaveLength(2);
    expect(recognized.every((o) => o.censusId !== null)).toBe(true);
    expect(unrecognized).toHaveLength(0);
  });

  it("recognises the scoped package name the field actually installs", () => {
    const { recognized } = classifyObservations(built, [
      obs("@playwright/test", "dep:npm:@playwright/test"),
    ]);
    expect(recognized[0]?.censusId).toBe("ec.component-e2e.playwright");
  });

  it("reports a classifiable QA tool with no census entry as UNRECOGNIZED", () => {
    const { recognized, unrecognized, notAFinding } = classifyObservations(
      built,
      [
        obs("k6", "manifest-file:k6.config.js"),
        obs("msw", "dep:npm:msw"),
        obs("react", "dep:npm:react"),
      ],
    );
    // k6 is seeded so it is recognized; msw is a QA tool we have no entry for.
    expect(recognized.map((o) => o.name)).toContain("k6");
    expect(unrecognized.map((o) => o.name)).toEqual(["msw"]);
    expect(notAFinding.map((o) => o.name)).toEqual(["react"]);
  });

  it("separates gaps from ordinary dependencies in the per-repo finding sets", () => {
    const results: DiscoveryResult[] = [
      {
        repo: "a",
        observations: [
          obs("msw", "dep:npm:msw"),
          obs("react", "dep:npm:react"),
        ],
      },
      { repo: "b", observations: [obs("msw", "dep:npm:msw")] },
    ];
    const classified = buildClassifiedResults(built, results);
    expect(classified[0]?.observations.map((o) => o.name)).not.toContain(
      "react",
    );
  });

  it("ranks the backlog by field frequency, not by order of appearance", () => {
    // Frequency, not enthusiasm, sets priority (ADR 0010 rule 2).
    const results: DiscoveryResult[] = [
      { repo: "r1", observations: [obs("rare", "dep:npm:rare")] },
      { repo: "r2", observations: [obs("common", "dep:npm:common")] },
      { repo: "r3", observations: [obs("common", "dep:npm:common")] },
      { repo: "r4", observations: [obs("common", "dep:npm:common")] },
    ];
    const backlog = buildGapBacklog(results);
    expect(backlog[0]?.name).toBe("common");
    expect(backlog[0]?.repos).toBe(3);
    expect(backlog[0]?.priority).toBe("P0");
    expect(backlog[1]?.name).toBe("rare");
    expect(backlog[1]?.priority).toBe("P2");
  });

  it("counts each repository once per tool, not each observation", () => {
    const results: DiscoveryResult[] = [
      {
        repo: "r1",
        observations: [obs("dup", "dep:npm:dup"), obs("dup", "dep:pypi:dup")],
      },
      { repo: "r2", observations: [obs("dup", "dep:npm:dup")] },
    ];
    const backlog = buildGapBacklog(results);
    expect(backlog[0]?.repos).toBe(2);
    expect(backlog[0]?.observations).toBe(3);
  });

  it("sorts the backlog deterministically", () => {
    const results: DiscoveryResult[] = [
      {
        repo: "r1",
        observations: [obs("b", "dep:npm:b"), obs("a", "dep:npm:a")],
      },
    ];
    expect(buildGapBacklog(results).map((i) => i.name)).toEqual(["a", "b"]);
  });
});

describe("census ids", () => {
  it("slugs to a stable lower-kebab form", () => {
    expect(censusSlug("Postman / Newman")).toBe("postman-newman");
    expect(censusSlug("Playwright Components")).toBe("playwright-components");
    expect(censusSlug("  Azure  DevOps  ")).toBe("azure-devops");
    expect(censusSlug("Kubernetes manifests")).toBe("kubernetes-manifests");
  });
});
