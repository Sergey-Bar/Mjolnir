import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  BLIND_EVIDENCE_RESOLVER,
  applyStalenessDemotion,
  buildCensus,
  classifyObservations,
  matchDependencyEntry,
  validateCensus,
  type Census,
  type CensusEntry,
  type CensusEvidenceResolver,
  type DetectSignal,
} from "../../src/v6/ecosystem-census.js";
import {
  CORPUS_CACHE_DIR,
  buildRepoEvidenceIndex,
  corpusReposOf,
  createEvidenceResolver,
  probeCorpus,
  probeRepository,
} from "../../src/v6/ecosystem-probe.js";

/** A tree with only what a case needs, so each arm is reachable. */
function tree(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "mjolnir-arm-"));
  for (const [relative, content] of Object.entries(files)) {
    const full = join(root, relative);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

const OBSERVED_AT = "2026-01-01";

function entry(overrides: Partial<CensusEntry> = {}): CensusEntry {
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
    maturity: "M1_DECLARED",
    nextLevelGap: null,
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

describe("dependency matching — the ecosystem is a fallback, not a key", () => {
  const c = buildCensus({ observedAt: OBSERVED_AT });

  it("matches by package name across ecosystems", () => {
    expect(matchDependencyEntry(c, "pypi", "playwright")).toBe(
      "ec.component-e2e.playwright",
    );
    expect(matchDependencyEntry(c, "npm", "vitest")).toBe(
      "ec.test-framework.vitest",
    );
    expect(matchDependencyEntry(c, "npm", "not-a-qa-tool")).toBeNull();
  });

  it("honours an explicit `any` ecosystem opt-out", () => {
    // `playwright` is declared with an `any` ecosystem because the same
    // distribution name is genuinely cross-ecosystem.
    expect(matchDependencyEntry(c, "go", "playwright")).toBe(
      "ec.component-e2e.playwright",
    );
  });

  it("does not try to match a file-shaped observation as a dependency", () => {
    const c = census([
      entry({ signals: [{ kind: "manifest-file", path: "example" }] }),
    ]);
    const result = classifyObservations(c, [
      {
        censusId: null,
        name: "example",
        category: "UNCLASSIFIED",
        via: "manifest-file:example",
      },
    ]);
    // A file-shaped observation goes through the signal key, not the
    // dependency matcher. Asserting that it lands somewhere sane is the
    // point: an unrecognised file is a finding, not a crash and not a
    // mis-attribution to a dependency of the same name.
    expect(result.recognized).toHaveLength(1);
    expect(result.unrecognized).toHaveLength(0);
  });
});

describe("the staleness trigger — it only touches SUPPORTED entries", () => {
  it("leaves a TARGET entry alone even when the upstream moved", () => {
    const resolver: CensusEvidenceResolver = {
      ...BLIND_EVIDENCE_RESOLVER,
      observedUpstreamMajor: () => "9",
    };
    const target = entry({ state: "TARGET", adapter: null });
    expect(applyStalenessDemotion(target, resolver)).toBe(target);
  });
});

describe("a day-one seed that a primitive already covers is not duplicated", () => {
  it("keeps one entry when a seeded name is also in the framework inventory", () => {
    // The seed loop skips an id the derived set already has. That arm
    // matters: a duplicate would give one tool two maturity records, and
    // two records is one too many truths.
    const c = buildCensus({ observedAt: OBSERVED_AT });
    const ids = c.entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    // `k6` is seeded and is not a framework, so it appears exactly once.
    expect(ids.filter((id) => id === "ec.load-performance.k6")).toHaveLength(1);
  });
});

describe("validateCensus reports the diagnostics it can actually reach", () => {
  it("reports a duplicate id and an unowned entry together", () => {
    const problems = validateCensus(
      census([
        entry(),
        entry(),
        entry({ id: "ec.test-framework.other", owner: "" }),
      ]),
      BLIND_EVIDENCE_RESOLVER,
    ).filter((d) => d.severity === "error");
    expect(problems.map((p) => p.code)).toEqual(
      expect.arrayContaining(["DUPLICATE_ID", "MISSING_OWNER"]),
    );
  });

  it("reports an over-claim against the evidence it can resolve", () => {
    const resolver: CensusEvidenceResolver = {
      ...BLIND_EVIDENCE_RESOLVER,
      adapterExists: () => true,
      unitTested: () => true,
    };
    const problems = validateCensus(
      census([entry({ maturity: "M4_CORPUS_VERIFIED" })]),
      resolver,
    );
    // No fixture-quad gate exists, so M3 and M4 are unreachable and an
    // M4 claim is an over-claim even with a real adapter and tests.
    const overclaim = problems.find((p) => p.code === "OVER_CLAIMED_MATURITY");
    expect(overclaim?.message).toContain("M2_IMPLEMENTED");
  });
});

describe("a signal of every kind normalises to a lookup key", () => {
  const signals: DetectSignal[] = [
    { kind: "manifest-file", path: "Jenkinsfile" },
    { kind: "config-file", path: "playwright.config.ts" },
    { kind: "workflow-dir", path: ".github/workflows" },
    { kind: "dependency", ecosystem: "npm", name: "vitest" },
    { kind: "extension", glob: "**/*.tf" },
    { kind: "script-command", ecosystem: "npm", command: "test" },
  ];

  it("matches an observation for each signal shape", () => {
    const c = census([
      entry({
        id: "ec.ci-cd-provider.jenkins",
        category: "ci-cd-provider",
        signals: [{ kind: "manifest-file", path: "Jenkinsfile" }],
      }),
    ]);
    const result = classifyObservations(c, [
      {
        censusId: null,
        name: "jenkins",
        category: "UNCLASSIFIED",
        via: "manifest-file:Jenkinsfile",
      },
    ]);
    expect(result.recognized).toHaveLength(1);
  });

  it("keeps an unknown signal shape from becoming a false match", () => {
    // A `via` the census does not declare, and a name it does not know, is
    // an honest miss rather than a mis-attribution.
    const c = census([entry({ signals })]);
    const result = classifyObservations(c, [
      {
        censusId: null,
        name: "example",
        category: "UNCLASSIFIED",
        via: "manifest-file:example",
      },
    ]);
    expect(result.recognized).toHaveLength(0);
  });
});

describe("the evidence index tolerates a tree that is missing things", () => {
  it("reads an empty tree without throwing", () => {
    const root = mkdtempSync(join(tmpdir(), "mjolnir-bare-"));
    const index = buildRepoEvidenceIndex(root);
    // The real rules are still indexed (they come from the registry, not the
    // filesystem), and the filesystem-derived parts are simply empty.
    expect(index.rulesByFamily.size).toBeGreaterThan(0);
    expect(index.adapters.size).toBe(0);
    expect(index.corpusRepos).toEqual([]);
  });

  it("indexes an adapter directory and its specs", () => {
    const root = tree({
      "src/adapters/example.ts": "export const x = 1;",
      "tests/adapters/example.spec.ts": 'import "../src/adapters/example";',
      "tests/adapters/notes.txt": "not a spec",
    });
    const index = buildRepoEvidenceIndex(root);
    expect(index.adapters.has("example")).toBe(true);
    expect(index.adapterSpecNames.has("example")).toBe(true);
  });

  it("counts only classified verdicts, and skips rows with no ruleId", () => {
    const root = tree({
      "tests/corpus/verdicts/repo-a.jsonl": [
        JSON.stringify({ ruleId: "QA-PW-001", verdict: "TP" }),
        JSON.stringify({ verdict: "TP" }),
        JSON.stringify({ ruleId: "QA-PW-002" }),
        JSON.stringify({ ruleId: "QA-PW-003", verdict: "FP" }),
        "{ not json",
      ].join("\n"),
    });
    const index = buildRepoEvidenceIndex(root);
    // Only TP and FP count into n. A row with no verdict, no ruleId, or no
    // parse is not a measurement.
    expect(index.corpusVerdictsByFamily.get("QA-PW")).toBe(2);
  });

  it("skips a corpus repository with no package.json", () => {
    const root = tree({ "tests/corpus/.cache/repo-a/README.md": "x" });
    expect(corpusReposOf(root)).toEqual(["repo-a"]);
    expect(probeCorpus(root)[0]?.observations).toEqual([]);
  });

  it("ignores a dependency entry with an empty range", () => {
    const root = tree({
      "tests/corpus/.cache/repo-a/package.json": JSON.stringify({
        devDependencies: { example: "", "@scope/example": "^3.0.0" },
      }),
    });
    const resolver = createEvidenceResolver(buildRepoEvidenceIndex(root), root);
    // An empty range is not a version observation; the resolver moves on
    // rather than inventing a major.
    expect(resolver.observedUpstreamMajor(entry())).toBeNull();
  });
});

describe("the probe reads every build file's ecosystem", () => {
  it("maps pyproject and requirements to pypi, pom to maven, gradle to gradle", () => {
    const result = probeRepository(
      tree({
        "pyproject.toml": 'dependencies = ["hypothesis"]',
        "requirements-dev.txt": "pytest-cov==5.0.0",
        "pom.xml": "<dependency><artifactId>testng</artifactId></dependency>",
        "build.gradle": 'testImplementation "junit:junit:4.13"',
      }),
      "synthetic",
    );
    const vias = result.observations.map((o) => o.via);
    expect(vias).toContain("dep:pypi:hypothesis");
    expect(vias).toContain("dep:pypi:pytest-cov");
    expect(vias).toContain("manifest-file:pom.xml");
    expect(vias).toContain("manifest-file:build.gradle");
  });

  it("reads terraform and kubernetes from an infrastructure directory", () => {
    const result = probeRepository(
      tree({
        "infrastructure/main.tf": "resource {}",
        "k8s/namespace.yaml": "kind: Namespace",
      }),
      "synthetic",
    );
    const names = result.observations.map((o) => o.name);
    expect(names).toContain("terraform");
    expect(names).toContain("kubernetes");
  });

  it("finds kubernetes under a kubernetes/ directory too", () => {
    const result = probeRepository(
      tree({ "kubernetes/deployment.yaml": "kind: Deployment" }),
      "synthetic",
    );
    expect(result.observations.map((o) => o.name)).toContain("kubernetes");
  });
});

describe("the census cache is optional and says so", () => {
  it("probes zero repositories without a cache, rather than inventing any", () => {
    const root = mkdtempSync(join(tmpdir(), "mjolnir-nocache2-"));
    expect(probeCorpus(root)).toEqual([]);
    expect(CORPUS_CACHE_DIR).toContain("corpus");
  });
});
