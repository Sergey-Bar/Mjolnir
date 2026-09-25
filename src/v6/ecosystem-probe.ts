/**
 * Filesystem-backed census evidence + the discovery probe (ADR 0010).
 *
 * This module is the executable half of the census. Two jobs, both of
 * which exist because a census nobody diffs against reality is just a
 * nicer-looking hand-maintained list:
 *
 *  1. **Evidence resolution** — a `CensusEvidenceResolver` that observes
 *     the real checkout, so a census entry's maturity is *derived* from
 *     artifacts that exist rather than typed by a person. This is what
 *     makes D1 mechanical: a capability ships only at the maturity the
 *     machine proves.
 *
 *  2. **The discovery probe** — a walk over the checked-out corpus
 *     (`tests/corpus/.cache/`) that reports every QA tool it sees,
 *     including tools the census has never heard of. Those land as
 *     `UNRECOGNIZED`, which is a first-class signal: a new tool the
 *     engine sees in the wild and silently ignores is a release-blocking
 *     honesty failure, not a backlog item.
 *
 * The resolver is deliberately **conservative**. Where no machine gate
 * exists to prove a criterion, the resolver returns `false` and the
 * entry lands lower. That direction of error is the safe one: an
 * under-claim is honest, an over-claim is a false proof (Law 1). Every
 * `false` returned here is therefore a real, named Wave-4 gate that does
 * not exist yet — see the `nextLevelGap` each entry carries.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { RULES } from "../rules/index.js";
import { MEASURED_FP } from "../rules/measured-fp.generated.js";
import { declaredDetectorRevision } from "../rules/measurement.js";
import {
  normalizeMajors,
  versionMajor,
  type CensusEntry,
  type CensusEvidenceResolver,
  type DiscoveryObservation,
  type DiscoveryResult,
} from "./ecosystem-census.js";

export const CORPUS_CACHE_DIR = join("tests", "corpus", ".cache");
export const FIXTURES_DIR = join("tests", "fixtures");
export const VERDICTS_DIR = join("tests", "corpus", "verdicts");
export const ADAPTERS_DIR = join("src", "adapters");
export const RULES_TESTS_DIR = join("tests", "rules");
export const ADAPTER_TESTS_DIR = join("tests", "adapters");

// ─── Rule-family evidence, computed once ─────────────────────────────

/** `QA-PW-*` → `QA-PW`. The family prefix is the id's domain segment. */
export function ruleFamily(ruleId: string): string {
  const parts = ruleId.split("-");
  return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : ruleId;
}

/**
 * Census ids are `ec.<category>.<slug>`, so the rule family they map to
 * is derived from the slug. This mapping is the join key between the
 * census and the rule registry — ADR 0007 in practice: the census
 * projects the existing registry rather than restating it.
 */
const SLUG_TO_FAMILY: Readonly<Record<string, string>> = {
  playwright: "QA-PW",
  cypress: "QA-CYP",
  selenium: "QA-SEL",
  jest: "QA-JV",
  vitest: "QA-JV",
  mocha: "QA-JV",
  jasmine: "QA-JV",
  pytest: "QA-PY",
  unittest: "QA-PY",
  "github-actions": "QA-CI",
  "azure-devops": "QA-CI",
  jenkins: "QA-CI",
  "gitlab-ci": "QA-CI",
  typescript: "QA-TEST",
  python: "QA-PY",
  java: "QA-JV",
  csharp: "QA-CS",
};

export function familyForEntry(entry: CensusEntry): string | null {
  const slug = entry.id.split(".").pop() ?? "";
  return SLUG_TO_FAMILY[slug] ?? null;
}

export interface RepoEvidenceIndex {
  /** Live rule ids per family. */
  rulesByFamily: ReadonlyMap<string, readonly string[]>;
  /** Rule ids with a valid (non-stale) measurement. */
  measuredByFamily: ReadonlyMap<string, readonly string[]>;
  /** Rule ids with a spec file referencing them. */
  testedByFamily: ReadonlyMap<string, readonly string[]>;
  /** Rule ids whose fixture directory holds >= 4 files (a quad proxy). */
  fixtureQuadByFamily: ReadonlyMap<string, readonly string[]>;
  /** Classified (TP/FP) corpus verdicts per family. */
  corpusVerdictsByFamily: ReadonlyMap<string, number>;
  /** Adapter file names present in `src/adapters/`. */
  adapters: ReadonlySet<string>;
  /** Spec files that import an adapter module. */
  adapterSpecNames: ReadonlySet<string>;
  /** Corpus repo directory names. */
  corpusRepos: readonly string[];
}

function groupBy(ids: readonly string[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const id of ids) {
    const family = ruleFamily(id);
    const bucket = map.get(family) ?? [];
    bucket.push(id);
    map.set(family, bucket);
  }
  return map;
}

function listFilesRecursive(dir: string, depth = 0): string[] {
  if (depth > 4 || !existsSync(dir)) return [];
  const out: string[] = [];
  let entries: Array<{ name: string; isDirectory(): boolean }>;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(full, depth + 1));
    else out.push(full);
  }
  return out;
}

/**
 * Build the evidence index from the real checkout. Pure with respect to
 * the census (it takes a root), so the same function serves the
 * generator, the gate and the test fixture.
 */
export function buildRepoEvidenceIndex(root: string): RepoEvidenceIndex {
  const liveIds = RULES.map((rule) => rule.id);
  const rulesByFamily = groupBy(liveIds);

  const measured: string[] = [];
  for (const rule of RULES) {
    const measurement = MEASURED_FP[rule.id];
    if (
      measurement &&
      measurement.detectorRevision === declaredDetectorRevision(rule)
    ) {
      measured.push(rule.id);
    }
  }
  const measuredByFamily = groupBy(measured);

  // Unit tests: a spec file that mentions the rule id. Text-level rather
  // than import-level because the suite asserts rule behaviour through
  // shared helpers, not one import per rule.
  const ruleSpecSources = listFilesRecursive(RULES_TESTS_DIR)
    .filter((file) => file.endsWith(".ts"))
    .map((file) => readFileSync(file, "utf8"));
  const tested = liveIds.filter((id) =>
    ruleSpecSources.some((source) => source.includes(id)),
  );
  const testedByFamily = groupBy(tested);

  // Fixture quad: a per-rule fixture directory with at least four files.
  // This is a *proxy* for the Wave-4 quad gate, so it is reported
  // separately and never upgrades maturity on its own.
  const quad: string[] = [];
  if (existsSync(join(root, FIXTURES_DIR))) {
    for (const id of liveIds) {
      const dir = join(root, FIXTURES_DIR, id);
      if (!existsSync(dir)) continue;
      try {
        if (listFilesRecursive(dir).length >= 4) quad.push(id);
      } catch {
        /* unreadable fixture dir is not evidence either way */
      }
    }
  }
  const fixtureQuadByFamily = groupBy(quad);

  // Corpus verdicts per family.
  const corpusVerdictsByFamily = new Map<string, number>();
  const verdictsDir = join(root, VERDICTS_DIR);
  if (existsSync(verdictsDir)) {
    for (const file of readdirSync(verdictsDir)) {
      if (!file.endsWith(".jsonl")) continue;
      for (const line of readFileSync(join(verdictsDir, file), "utf8").split(
        "\n",
      )) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line) as {
            ruleId?: string;
            verdict?: string;
          };
          if (!entry.ruleId) continue;
          if (entry.verdict !== "TP" && entry.verdict !== "FP") continue;
          const family = ruleFamily(entry.ruleId);
          corpusVerdictsByFamily.set(
            family,
            (corpusVerdictsByFamily.get(family) ?? 0) + 1,
          );
        } catch {
          /* a malformed verdict line is not a classified verdict */
        }
      }
    }
  }

  const adapters = new Set<string>();
  const adapterDir = join(root, ADAPTERS_DIR);
  if (existsSync(adapterDir)) {
    for (const file of readdirSync(adapterDir)) {
      if (file.endsWith(".ts")) adapters.add(file.replace(/\.ts$/, ""));
    }
  }

  const adapterSpecNames = new Set<string>();
  for (const dir of [ADAPTER_TESTS_DIR, join("tests", "frameworks")]) {
    for (const file of listFilesRecursive(join(root, dir))) {
      if (!file.endsWith(".spec.ts")) continue;
      const source = readFileSync(file, "utf8");
      for (const adapter of adapters) {
        if (source.includes(adapter)) adapterSpecNames.add(adapter);
      }
    }
  }

  const corpusRoot = join(root, CORPUS_CACHE_DIR);
  const corpusRepos = existsSync(corpusRoot)
    ? readdirSync(corpusRoot).filter((name) => {
        try {
          return statSync(join(corpusRoot, name)).isDirectory();
        } catch {
          return false;
        }
      })
    : [];

  return {
    rulesByFamily,
    measuredByFamily,
    testedByFamily,
    fixtureQuadByFamily,
    corpusVerdictsByFamily,
    adapters,
    adapterSpecNames,
    corpusRepos,
  };
}

/** `M4` needs n >= 10 classified verdicts for the family (ADR 0001). */
export const CORPUS_N_MINIMUM = 10;

/**
 * Build the resolver from the index. Every arm is conservative and each
 * `false` is a *named missing gate*, not an oversight — see the comments.
 */
export function createEvidenceResolver(
  index: RepoEvidenceIndex,
  root: string,
): CensusEvidenceResolver {
  return {
    adapterExists(entry) {
      // Either a real adapter module, or a live rule family — the
      // capability is "we can analyse this ecosystem", which a rule
      // family satisfies as well as an adapter does.
      const family = familyForEntry(entry);
      if (family && (index.rulesByFamily.get(family)?.length ?? 0) > 0)
        return true;
      const slug = entry.id.split(".").pop() ?? "";
      return index.adapters.has(slug);
    },
    unitTested(entry) {
      const family = familyForEntry(entry);
      if (family && (index.testedByFamily.get(family)?.length ?? 0) > 0) {
        return true;
      }
      const slug = entry.id.split(".").pop() ?? "";
      return index.adapterSpecNames.has(slug);
    },
    // There is no machine gate that verifies a positive/negative/
    // boundary/adversarial fixture quad *per adapter or per framework*.
    // The fixture directories are a proxy, and a proxy must not buy an
    // `M3` claim (Law 1). Wave 4 ships the real gate; until then every
    // entry carries this exact gap.
    fixtureQuadVerified() {
      return false;
    },
    // `M4` additionally requires a locked `detectorRev` per capability.
    // The measurement sidecar locks it per *rule*, and no framework-level
    // binding exists, so corpus verdicts alone cannot grant `M4`.
    corpusVerified() {
      return false;
    },
    // `M5` requires external field evidence. The zero-network default
    // never produces it, and the census may not claim it.
    fieldProven() {
      return false;
    },
    observedUpstreamMajor(entry) {
      const major = detectUpstreamMajor(entry, root);
      return major;
    },
  };
}

/**
 * The leading major of a version or range. The framework inventory
 * records *validated versions* (`1.44`, `29`, `2.0`), while a manifest
 * records a *range* (`^29.7.0`, `~2.0.0`, `>=8`). Comparing the two
 * literally would report a staleness that does not exist, so both sides
 * are normalised to their major first — a staleness trigger that fires
 * on a representation difference is a trigger people learn to ignore.
 *
 * Re-exported from the census module (single implementation, ADR 0007)
 * so the normaliser used by the registry and by the probe cannot drift.
 */
export { versionMajor, normalizeMajors };

/**
 * The npm package name(s) a census slug corresponds to, if any.
 *
 * Read from the entry's own `upstreamPackages` — the census is the
 * authority on naming, so a consumer holding its own copy of the answer
 * is the parallel-inventory drift ADR 0007 exists to prevent. An earlier
 * version kept a local map here and a heuristic on the slug, and the
 * consequence was concrete: `@percy/cypress` was read as `cypress` and
 * `@swc/jest` as `jest`, inventing staleness verdicts for plugins whose
 * versions do not track the runner.
 */
function npmPackageNames(entry: CensusEntry): readonly string[] {
  return entry.upstreamPackages
    .filter((pkg) => pkg.ecosystem === "npm" || pkg.ecosystem === "any")
    .map((pkg) => pkg.name);
}

/**
 * Detect the upstream major version a corpus repository actually uses,
 * when it is discoverable from a manifest. Returns `null` when it is not
 * — and `null` means "no staleness verdict", never "up to date".
 */
function detectUpstreamMajor(entry: CensusEntry, root: string): string | null {
  if (entry.handledUpstreamMajors.length === 0) return null;
  const upstream = npmPackageNames(entry);
  if (upstream.length === 0) return null;
  for (const repo of corpusReposOf(root)) {
    const pkgPath = join(root, CORPUS_CACHE_DIR, repo, "package.json");
    if (!existsSync(pkgPath)) continue;
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
        peerDependencies?: Record<string, string>;
      };
      const deps: Record<string, string> = {
        ...(pkg.dependencies ?? {}),
        ...(pkg.devDependencies ?? {}),
        ...(pkg.peerDependencies ?? {}),
      };
      // Exact upstream package name only — see `UPSTREAM_PACKAGES`.
      for (const name of upstream) {
        const range = deps[name];
        if (range === undefined) continue;
        const major = versionMajor(range);
        if (major !== null) return major;
      }
    } catch {
      /* an unparseable manifest is not a version observation */
    }
  }
  return null;
}

export function corpusReposOf(root: string): readonly string[] {
  const corpusRoot = join(root, CORPUS_CACHE_DIR);
  if (!existsSync(corpusRoot)) return [];
  return readdirSync(corpusRoot).filter((name) => {
    try {
      return statSync(join(corpusRoot, name)).isDirectory();
    } catch {
      return false;
    }
  });
}

// ─── Discovery probe ─────────────────────────────────────────────────

interface ManifestRead {
  deps: string[];
  scripts: string[];
}

function readJsonManifest(path: string): ManifestRead | null {
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      scripts?: Record<string, string>;
    };
    return {
      deps: [
        ...Object.keys(raw.dependencies ?? {}),
        ...Object.keys(raw.devDependencies ?? {}),
        ...Object.keys(raw.peerDependencies ?? {}),
      ],
      scripts: Object.keys(raw.scripts ?? {}),
    };
  } catch {
    return null;
  }
}

/** Ecosystem-qualified dependency names, `npm:playwright`. */
function observationsFromDeps(
  ecosystem: string,
  deps: readonly string[],
): DiscoveryObservation[] {
  return deps.map((name) => ({
    censusId: null,
    name,
    category: "UNCLASSIFIED" as const,
    via: `dep:${ecosystem}:${name}`,
  }));
}

/**
 * Probe one repository. Reads the manifests the census declares signals
 * for, plus the CI workflow directory, and reports what it sees.
 *
 * Scope honesty: the probe sees **declared** tooling (manifests, config
 * files, workflow files, file extensions). It does not execute anything,
 * and it does not see tooling that a repository uses without declaring
 * it. That limitation is recorded as the probe's own `nextLevelGap`
 * rather than hidden, because a probe that silently under-reports is
 * the same failure as a census that silently over-reports.
 */
export function probeRepository(
  repoPath: string,
  repoName: string,
): DiscoveryResult {
  const observations: DiscoveryObservation[] = [];
  const push = (list: DiscoveryObservation[]): void => {
    observations.push(...list);
  };

  const pkg = readJsonManifest(join(repoPath, "package.json"));
  if (pkg) {
    push(observationsFromDeps("npm", pkg.deps));
    for (const script of pkg.scripts) {
      observations.push({
        censusId: null,
        name: script,
        category: "UNCLASSIFIED",
        via: `cmd:npm:${script}`,
      });
    }
    observations.push({
      censusId: null,
      name: "npm",
      category: "UNCLASSIFIED",
      via: "manifest-file:package.json",
    });
  }

  for (const [ecosystem, file] of [
    ["pypi", "pyproject.toml"],
    ["maven", "pom.xml"],
    ["gradle", "build.gradle"],
    ["gradle", "build.gradle.kts"],
    ["nuget", "packages.config"],
    ["rubygems", "Gemfile"],
    ["go", "go.mod"],
    ["cargo", "Cargo.toml"],
    ["composer", "composer.json"],
  ] as const) {
    const path = join(repoPath, file);
    if (!existsSync(path)) continue;
    observations.push({
      censusId: null,
      name: ecosystem,
      category: "UNCLASSIFIED",
      via: `manifest-file:${file}`,
    });
  }

  // Build-file requirements / test requirements, the two places a Python
  // or JVM project names its test tools.
  for (const file of [
    "pyproject.toml",
    "requirements.txt",
    "requirements-dev.txt",
    "build.gradle",
    "build.gradle.kts",
    "pom.xml",
  ]) {
    const path = join(repoPath, file);
    if (!existsSync(path)) continue;
    const source = readFileSync(path, "utf8");
    // A quoted coordinate in a build/requirements file: one character class
    // and an optional bracket suffix, so the run is linear. The rule is a
    // heuristic that flags the `(?:\[\w+\])?` shape.
    // eslint-disable-next-line security/detect-unsafe-regex
    for (const match of source.matchAll(/["']([\w.-]+(?:\[\w+\])?)["']/g)) {
      const name = match[1];
      if (!name) continue;
      const ecosystem =
        file.endsWith(".toml") || file.startsWith("requirements")
          ? "pypi"
          : file === "pom.xml"
            ? "maven"
            : "gradle";
      observations.push({
        censusId: null,
        name,
        category: "UNCLASSIFIED",
        via: `dep:${ecosystem}:${name}`,
      });
    }
  }

  if (existsSync(join(repoPath, ".gitlab-ci.yml"))) {
    observations.push({
      censusId: null,
      name: "gitlab-ci",
      category: "UNCLASSIFIED",
      via: "manifest-file:.gitlab-ci.yml",
    });
  }
  if (
    existsSync(join(repoPath, "azure-pipelines.yml")) ||
    existsSync(join(repoPath, ".azure-pipelines"))
  ) {
    observations.push({
      censusId: null,
      name: "azure-devops",
      category: "UNCLASSIFIED",
      via: "manifest-file:azure-pipelines.yml",
    });
  }
  if (existsSync(join(repoPath, "Jenkinsfile"))) {
    observations.push({
      censusId: null,
      name: "jenkins",
      category: "UNCLASSIFIED",
      via: "manifest-file:Jenkinsfile",
    });
  }
  if (existsSync(join(repoPath, ".circleci"))) {
    observations.push({
      censusId: null,
      name: "circleci",
      category: "UNCLASSIFIED",
      via: "workflow-dir:.circleci",
    });
  }
  if (existsSync(join(repoPath, ".buildkite"))) {
    observations.push({
      censusId: null,
      name: "buildkite",
      category: "UNCLASSIFIED",
      via: "workflow-dir:.buildkite",
    });
  }
  if (existsSync(join(repoPath, ".drone.yml"))) {
    observations.push({
      censusId: null,
      name: "drone",
      category: "UNCLASSIFIED",
      via: "manifest-file:.drone.yml",
    });
  }
  if (existsSync(join(repoPath, "bitbucket-pipelines.yml"))) {
    observations.push({
      censusId: null,
      name: "bitbucket-pipelines",
      category: "UNCLASSIFIED",
      via: "manifest-file:bitbucket-pipelines.yml",
    });
  }

  // Infrastructure-as-code, which is a first-class v6 domain.
  const hasTerraform = listFilesRecursive(
    join(repoPath, "infrastructure"),
    1,
  ).some((f) => f.endsWith(".tf"));
  if (hasTerraform || existsSync(join(repoPath, "main.tf"))) {
    observations.push({
      censusId: null,
      name: "terraform",
      category: "UNCLASSIFIED",
      via: "manifest-file:main.tf",
    });
  }
  if (
    listFilesRecursive(join(repoPath, "k8s"), 2).some(
      (f) => f.endsWith(".yaml") || f.endsWith(".yml"),
    ) ||
    listFilesRecursive(join(repoPath, "kubernetes"), 2).some(
      (f) => f.endsWith(".yaml") || f.endsWith(".yml"),
    ) ||
    existsSync(join(repoPath, "kustomization.yaml"))
  ) {
    observations.push({
      censusId: null,
      name: "kubernetes",
      category: "UNCLASSIFIED",
      via: "manifest-file:kustomization.yaml",
    });
  }
  if (
    existsSync(join(repoPath, "Dockerfile")) ||
    existsSync(join(repoPath, "docker-compose.yml"))
  ) {
    observations.push({
      censusId: null,
      name: "docker",
      category: "UNCLASSIFIED",
      via: "manifest-file:Dockerfile",
    });
  }

  // Deduplicate: a package listed in both dependencies and devDependencies,
  // or named twice in one manifest, is one observation of one tool.
  const seen = new Set<string>();
  const unique = observations.filter((observation) => {
    const key = `${observation.name} ${observation.via}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { repo: repoName, observations: unique };
}

/** Probe the whole corpus cache. Missing cache ⇒ empty result, never a
 *  fabricated "nothing found": a probe that reports zero when it did not
 *  run is the classic silent-green, so the result records the repos it
 *  actually walked. */
export function probeCorpus(root: string): DiscoveryResult[] {
  const repos = corpusReposOf(root);
  return repos.map((repo) =>
    probeRepository(join(root, CORPUS_CACHE_DIR, repo), repo),
  );
}
