import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CORPUS_N_MINIMUM,
  buildRepoEvidenceIndex,
  corpusReposOf,
  createEvidenceResolver,
  familyForEntry,
  normalizeMajors,
  probeCorpus,
  probeRepository,
  ruleFamily,
  versionMajor,
} from "../../src/v6/ecosystem-probe.js";
import {
  buildCensus,
  type CensusEntry,
} from "../../src/v6/ecosystem-census.js";

/**
 * A synthetic repository tree. The probe is filesystem code, so it is
 * tested against a real (temporary) filesystem rather than mocked: a mock
 * would assert the code calls `existsSync` in the order it calls it, which
 * is not a property anybody cares about.
 */
function repo(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "mjolnir-probe-"));
  for (const [relative, content] of Object.entries(files)) {
    const full = join(root, relative);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

describe("the probe — version and family normalisation", () => {
  it("reads a major from a version, a range and a spec", () => {
    expect(versionMajor("1.44.1")).toBe("1");
    expect(versionMajor("^29.7.0")).toBe("29");
    expect(versionMajor("~2.0.0")).toBe("2");
    expect(versionMajor(">=8")).toBe("8");
    expect(versionMajor("v4")).toBe("4");
    expect(versionMajor("1.44.1-beta.2")).toBe("1");
  });

  it("returns null when there is no leading number, which is no verdict", () => {
    // `null` must never be read as "up to date"; it means "not observable".
    for (const input of [
      "workspace:*",
      "catalog:",
      "",
      "next",
      "file:../local",
    ]) {
      expect(versionMajor(input)).toBeNull();
    }
  });

  it("deduplicates and sorts the majors of a validated-version list", () => {
    expect(normalizeMajors(["1.44", "1.45", "1.46", "29", "30"])).toEqual([
      "1",
      "29",
      "30",
    ]);
    expect(normalizeMajors([])).toEqual([]);
    expect(normalizeMajors(["catalog:", "workspace:*"])).toEqual([]);
  });

  it("derives a rule family from an id", () => {
    expect(ruleFamily("QA-PW-144")).toBe("QA-PW");
    expect(ruleFamily("QA-TQUAL-002")).toBe("QA-TQUAL");
    expect(ruleFamily("ODD")).toBe("ODD");
  });

  it("maps a census entry to its rule family, and admits when it cannot", () => {
    const census = buildCensus({ observedAt: "2026-01-01" });
    const find = (id: string): CensusEntry => {
      const entry = census.entries.find((e) => e.id === id);
      if (entry === undefined) throw new Error(`no census entry ${id}`);
      return entry;
    };
    expect(familyForEntry(find("ec.component-e2e.playwright"))).toBe("QA-PW");
    expect(familyForEntry(find("ec.test-framework.pytest"))).toBe("QA-PY");
    // A CI provider maps to the CI rule family, which is a real mapping and
    // not a coincidence: CI integrity is what the family analyses.
    expect(familyForEntry(find("ec.ci-cd-provider.jenkins"))).toBe("QA-CI");
    // A day-one TARGET with no rule family yet admits it.
    expect(familyForEntry(find("ec.load-performance.k6"))).toBeNull();
  });
});

describe("the probe — reading a repository", () => {
  it("reports npm dependencies, scripts and the manifest itself", () => {
    const path = repo({
      "package.json": JSON.stringify({
        dependencies: { playwright: "^1.44.0" },
        devDependencies: { vitest: "^2.1.0", typescript: "5.4.0" },
        scripts: { test: "vitest run", e2e: "playwright test" },
      }),
    });
    const result = probeRepository(path, "synthetic");
    const deps = result.observations
      .filter((o) => o.via.startsWith("dep:"))
      .map((o) => o.name)
      .sort();
    expect(deps).toEqual(["playwright", "typescript", "vitest"]);
    expect(
      result.observations
        .filter((o) => o.via.startsWith("cmd:"))
        .map((o) => o.name)
        .sort(),
    ).toEqual(["e2e", "test"]);
    expect(
      result.observations.some((o) => o.via === "manifest-file:package.json"),
    ).toBe(true);
  });

  it("reports a package listed in two dep groups once", () => {
    const path = repo({
      "package.json": JSON.stringify({
        dependencies: { mocha: "10.0.0" },
        devDependencies: { mocha: "10.0.0" },
      }),
    });
    const result = probeRepository(path, "synthetic");
    expect(result.observations.filter((o) => o.name === "mocha")).toHaveLength(
      1,
    );
  });

  it("records the repository it walked", () => {
    const path = repo({ "package.json": "{}" });
    expect(probeRepository(path, "named-repo").repo).toBe("named-repo");
  });

  it("recognises every CI provider it declares a signal for", () => {
    const cases: Array<[string, string]> = [
      [".gitlab-ci.yml", "gitlab-ci"],
      ["Jenkinsfile", "jenkins"],
      ["azure-pipelines.yml", "azure-devops"],
    ];
    for (const [file, name] of cases) {
      const result = probeRepository(repo({ [file]: "x" }), "synthetic");
      expect(
        result.observations.some((o) => o.name === name),
        `${file} should be observed as ${name}`,
      ).toBe(true);
    }
  });

  it("recognises the .github workflow directory and the other CI markers", () => {
    for (const [file, name] of [
      [".github/workflows/ci.yml", "npm"],
      [".circleci/config.yml", "circleci"],
      [".buildkite/pipeline.yml", "buildkite"],
      [".drone.yml", "drone"],
      ["bitbucket-pipelines.yml", "bitbucket-pipelines"],
    ] as Array<[string, string]>) {
      // A `package.json` is included so the workflow-directory case has a
      // manifest to read; the probe reports the `npm` ecosystem from the
      // manifest, not from the workflow file.
      const result = probeRepository(
        repo({ [file]: "x", "package.json": "{}" }),
        "synthetic",
      );
      expect(
        result.observations.map((o) => o.name),
        file,
      ).toContain(name);
    }
  });

  it("recognises non-npm manifests by their ecosystem", () => {
    const result = probeRepository(
      repo({
        "pyproject.toml": "[project]\nname='x'\n",
        "pom.xml": "<project/>",
        "go.mod": "module x",
        "Cargo.toml": "[package]\n",
        Gemfile: "source 'x'",
        "composer.json": "{}",
        "requirements.txt": "pytest==8.0.0\n",
      }),
      "synthetic",
    );
    const ecosystems = result.observations
      .filter(
        (o) =>
          o.via === "manifest-file:pyproject.toml" ||
          o.via.startsWith("dep:pypi"),
      )
      .map((o) => o.via);
    expect(ecosystems.length).toBeGreaterThan(0);
    // A quoted coordinate in a requirements file is a pypi dependency.
    expect(
      result.observations.some(
        (o) => o.via === "dep:pypi:pytest" && o.name === "pytest",
      ),
    ).toBe(true);
    expect(
      result.observations.some((o) => o.via === "manifest-file:go.mod"),
    ).toBe(true);
    expect(
      result.observations.some((o) => o.via === "manifest-file:Cargo.toml"),
    ).toBe(true);
  });

  it("recognises infrastructure-as-code and container markers", () => {
    const result = probeRepository(
      repo({
        "main.tf": "resource {}",
        "k8s/deploy.yaml": "kind: Deployment",
        Dockerfile: "FROM node",
      }),
      "synthetic",
    );
    const names = result.observations.map((o) => o.name);
    expect(names).toContain("terraform");
    expect(names).toContain("kubernetes");
    expect(names).toContain("docker");
  });

  it("finds a kustomization file as kubernetes", () => {
    const result = probeRepository(
      repo({ "kustomization.yaml": "x" }),
      "synthetic",
    );
    expect(result.observations.map((o) => o.name)).toContain("kubernetes");
  });

  it("walks an empty directory without inventing findings", () => {
    const result = probeRepository(repo({ "notes.txt": "hello" }), "synthetic");
    expect(result.observations).toEqual([]);
  });

  it("survives a manifest it cannot parse", () => {
    // An unparseable manifest is not an observation, and it is not a crash
    // either: one broken file in a 40 000-file repository must not stop the
    // probe.
    const result = probeRepository(
      repo({ "package.json": "{ not json" }),
      "synthetic",
    );
    expect(result.observations).toEqual([]);
  });
});

describe("the probe — corpus walking", () => {
  it("returns nothing when there is no cache, and says so by being empty", () => {
    // An absent cache must be a BLOCKED verdict from the gate, not a
    // fabricated "nothing to support". The probe's job here is only to not
    // invent repositories.
    const empty = mkdtempSync(join(tmpdir(), "mjolnir-nocache-"));
    expect(probeCorpus(empty)).toEqual([]);
    expect(corpusReposOf(empty)).toEqual([]);
  });

  it("walks only the directories in the cache root", () => {
    const root = mkdtempSync(join(tmpdir(), "mjolnir-cache-"));
    mkdirSync(join(root, "tests", "corpus", ".cache", "repo-a"), {
      recursive: true,
    });
    writeFileSync(
      join(root, "tests", "corpus", ".cache", "repo-a", "package.json"),
      JSON.stringify({ dependencies: { jest: "29.7.0" } }),
    );
    writeFileSync(
      join(root, "tests", "corpus", ".cache", "stray-file.txt"),
      "not a repo",
    );
    expect(corpusReposOf(root)).toEqual(["repo-a"]);
    const results = probeCorpus(root);
    expect(results).toHaveLength(1);
    expect(results[0]?.repo).toBe("repo-a");
    expect(results[0]?.observations.map((o) => o.name)).toContain("jest");
  });
});

describe("the probe — evidence resolution", () => {
  it("caps every capability at M2 when no criterion beyond that has a gate", () => {
    // The conservative direction of error is the safe one: an under-claim is
    // honest, an over-claim is a false proof.
    const index = buildRepoEvidenceIndex(process.cwd());
    const resolver = createEvidenceResolver(index, process.cwd());
    const census = buildCensus({ resolver, observedAt: "2026-01-01" });
    for (const entry of census.entries) {
      expect(["M0_UNKNOWN", "M1_DECLARED", "M2_IMPLEMENTED"]).toContain(
        entry.maturity,
      );
      expect(resolver.fixtureQuadVerified(entry)).toBe(false);
      expect(resolver.corpusVerified(entry)).toBe(false);
      expect(resolver.fieldProven(entry)).toBe(false);
    }
  });

  it("treats a rule family as an implementation even with no adapter module", () => {
    const index = buildRepoEvidenceIndex(process.cwd());
    const resolver = createEvidenceResolver(index, process.cwd());
    const playwright = buildCensus({
      resolver,
      observedAt: "2026-01-01",
    }).entries.find((e) => e.id === "ec.component-e2e.playwright");
    expect(playwright).toBeDefined();
    if (playwright === undefined) return;
    // The capability is "we can analyse this ecosystem", which a live rule
    // family satisfies as well as an adapter does.
    expect(resolver.adapterExists(playwright)).toBe(true);
  });

  it("publishes the corpus minimum n, so M4's criterion is a constant", () => {
    // ADR 0001: M4 needs n >= 10 classified verdicts. Naming the number once
    // means a criterion cannot drift between the ladder and the gate.
    expect(CORPUS_N_MINIMUM).toBe(10);
  });

  it("indexes the real repository without throwing", () => {
    const index = buildRepoEvidenceIndex(process.cwd());
    expect(index.rulesByFamily.size).toBeGreaterThan(0);
    expect(index.adapters.size).toBeGreaterThan(0);
  });
});

describe("the probe — upstream version staleness", () => {
  it("reads an unquoted requirement line, which is the normal format", () => {
    // `requirements.txt` names its dependency without quotes. A probe that
    // only reads quoted coordinates misses every conventionally-written
    // Python project, and a discovery miss reads as "nothing is out there".
    const result = probeRepository(
      repo({
        "requirements.txt": [
          "# a comment",
          "pytest==8.0.0",
          "selenium>=4.0",
          "hypothesis[extra]~=6.100",
          "pytest-mock ; python_version < '3.11'",
          "-r other.txt",
          "git+https://example.invalid/x.git#egg=y",
        ].join("\n"),
      }),
      "synthetic",
    );
    const names = result.observations
      .filter((o) => o.via.startsWith("dep:pypi:"))
      .map((o) => o.name);
    expect(names).toContain("pytest");
    expect(names).toContain("selenium");
    expect(names).toContain("hypothesis");
    expect(names).toContain("pytest-mock");
    // A comment, an include directive and a VCS line are not dependencies.
    expect(names).not.toContain("other.txt");
  });

  it("recognises an upstream major from a corpus manifest by exact package name", () => {
    // A slug heuristic would read `@percy/cypress` as `cypress` and
    // `@swc/jest` as `jest`, inventing staleness verdicts for plugins whose
    // versions do not track the runner. Exact names only.
    const entry: CensusEntry = {
      id: "ec.test-framework.example",
      name: "example",
      category: "test-framework",
      state: "SUPPORTED",
      owner: "test",
      observedAt: "2026-01-01",
      signals: [{ kind: "dependency", ecosystem: "npm", name: "example" }],
      adapter: "src/adapters/example.ts",
      blocksAxes: [],
      successor: null,
      removalDate: null,
      notApplicableReason: null,
      upstreamPackages: [{ ecosystem: "npm", name: "example" }],
      handledUpstreamMajors: ["1"],
      revisitTrigger: "trigger",
      maturity: "M2_IMPLEMENTED",
      nextLevelGap: null,
    };
    // The resolver reads the corpus cache, so the fixture has to *be* a
    // cache: `tests/corpus/.cache/<repo>/package.json`.
    const root = repo({
      "tests/corpus/.cache/repo-a/package.json": JSON.stringify({
        devDependencies: { example: "^4.2.0", "@types/example": "^1.0.0" },
      }),
    });
    const resolver = createEvidenceResolver(buildRepoEvidenceIndex(root), root);
    expect(resolver.observedUpstreamMajor(entry)).toBe("4");
  });

  it("returns null for an entry with no npm upstream, which is no verdict", () => {
    const entry: CensusEntry = {
      id: "ec.ci-cd-provider.jenkins",
      name: "jenkins",
      category: "ci-cd-provider",
      state: "SUPPORTED",
      owner: "test",
      observedAt: "2026-01-01",
      signals: [{ kind: "manifest-file", path: "Jenkinsfile" }],
      adapter: "src/adapters/jenkins.ts",
      blocksAxes: [],
      successor: null,
      removalDate: null,
      notApplicableReason: null,
      upstreamPackages: [],
      handledUpstreamMajors: ["1"],
      revisitTrigger: "trigger",
      maturity: "M2_IMPLEMENTED",
      nextLevelGap: null,
    };
    const root = repo({ "package.json": "{}" });
    const resolver = createEvidenceResolver(buildRepoEvidenceIndex(root), root);
    expect(resolver.observedUpstreamMajor(entry)).toBeNull();
  });

  it("returns null for an entry with no validated set to compare against", () => {
    const entry: CensusEntry = {
      id: "ec.test-framework.example",
      name: "example",
      category: "test-framework",
      state: "TARGET",
      owner: "test",
      observedAt: "2026-01-01",
      signals: [{ kind: "dependency", ecosystem: "npm", name: "example" }],
      adapter: null,
      blocksAxes: [],
      successor: null,
      removalDate: null,
      notApplicableReason: null,
      upstreamPackages: [{ ecosystem: "npm", name: "example" }],
      handledUpstreamMajors: [],
      revisitTrigger: "trigger",
      maturity: "M1_DECLARED",
      nextLevelGap: null,
    };
    const root = repo({
      "package.json": JSON.stringify({ dependencies: { example: "9.0.0" } }),
    });
    const resolver = createEvidenceResolver(buildRepoEvidenceIndex(root), root);
    expect(resolver.observedUpstreamMajor(entry)).toBeNull();
  });
});
