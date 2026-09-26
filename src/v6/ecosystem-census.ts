/**
 * QA Ecosystem Census (Law 8, ADR 0010) — the single authority on "what
 * exists in the QA ecosystem".
 *
 * Before this module, every list of supported frameworks, runners, CI
 * providers and tools was **hand-maintained**: strings somebody typed,
 * never diffed against reality. That is a documentation defect *by
 * construction* (Law 8), not by negligence, and it produced three
 * silent failure modes — a tool the engine cannot handle is not in the
 * list so it is never acknowledged; a framework's upstream major moves
 * and the list still says "supported"; and the roadmap is prioritised by
 * enthusiasm rather than by field frequency.
 *
 * This census fixes all three by making the *diff* a generated artifact:
 *
 *  1. `CENSUS_ENTRIES` is a versioned, owned, dated registry.
 *  2. A **discovery probe** over real repositories reports what it sees,
 *     including tools the census does not know (`UNRECOGNIZED`).
 *  3. A **gap generator** diffs census against discovery and ranks the
 *     backlog by *field frequency*, not enthusiasm.
 *  4. A **staleness trigger** auto-demotes a `SUPPORTED` entry whose
 *     upstream major the adapter does not handle.
 *
 * Two hard constraints on this module:
 *
 *  - **No hand-written support claims.** Entries that the repository can
 *    already evidence are derived from the existing primitives
 *    (`FRAMEWORK_INVENTORY`, `CI_PROVIDER_CAPABILITY_RECORDS`) — see
 *    ADR 0007. This module never re-types a list the engine already has.
 *  - **Maturity is derived, never declared.** `maturity` is computed by
 *    `deriveMaturityFromEvidence` from observed evidence, so an entry
 *    cannot advertise a level its artifacts do not support.
 *
 * `UNRECOGNIZED` is a first-class state, not an error bucket. A new tool
 * the engine sees in the wild and silently ignores is a release-blocking
 * honesty failure, so the gap generator's oldest-`UNRECOGNIZED` rule is a
 * gate.
 */

import { CI_PROVIDER_CAPABILITY_RECORDS } from "../frameworks/provider-capability-contract.js";
import {
  FRAMEWORK_INVENTORY,
  type FrameworkMetadata,
} from "../frameworks/framework-inventory.js";
import {
  deriveMaturityFromEvidence,
  maturityRank,
  nextLevelGapFromEvidence,
  type Maturity,
  type MaturityEvidence,
} from "./maturity.js";
import type { NextLevelGap, Owner } from "./capability-types.js";

export const CENSUS_SCHEMA_VERSION = 1 as const;
export const CENSUS_ID = "mjolnir-ecosystem-census" as const;

// ─── Categories ──────────────────────────────────────────────────────

/**
 * The 18 census categories. A tool the engine can see but cannot place
 * in any of these is itself a census defect, so the enum is closed.
 */
export const CENSUS_CATEGORIES = [
  "language",
  "test-framework",
  "test-runner",
  "bdd-spec-dsl",
  "api-contract-testing",
  "component-e2e",
  "mobile-testing",
  "load-performance",
  "test-management",
  "accessibility-scanner",
  "security-scanner",
  "visual-regression",
  "report-artifact-format",
  "ci-cd-provider",
  "iac-container",
  "browser-device-matrix",
  "mutation-testing",
  "observability",
] as const;

export type CensusCategory = (typeof CENSUS_CATEGORIES)[number];

// ─── States ──────────────────────────────────────────────────────────

/**
 * Census entry states. `state` is *coverage of the ecosystem* and
 * `maturity` is *proof of our handling of it* — they are orthogonal
 * (ADR 0011), which is why both exist and why neither is derived from
 * the other.
 */
export const CENSUS_STATES = [
  "SUPPORTED",
  "TARGET",
  "DEPRECATED",
  "NOT_APPLICABLE",
  "UNRECOGNIZED",
] as const;

export type CensusState = (typeof CENSUS_STATES)[number];

// ─── Discovery signals ───────────────────────────────────────────────

/**
 * How the discovery probe recognises a census entry. This is the
 * executable half of the census: an entry with no signal is invisible to
 * discovery and therefore cannot be `SUPPORTED` honestly — the probe
 * would never see the tool it claims to handle.
 */
export type DetectSignal =
  | { kind: "manifest-file"; path: string }
  | { kind: "dependency"; ecosystem: string; name: string }
  | { kind: "config-file"; path: string }
  | { kind: "workflow-dir"; path: string }
  | { kind: "extension"; glob: string }
  | { kind: "script-command"; ecosystem: string; command: string };

// ─── Entry ───────────────────────────────────────────────────────────

export interface CensusEntry {
  /** Canonical census id, `ec.<category>.<slug>`. Never a rule id. */
  id: string;
  name: string;
  category: CensusCategory;
  state: CensusState;
  owner: Owner;
  /** ISO-8601 date the entry was last reviewed. */
  observedAt: string;
  /** Ecosystem-homepage or upstream reference, for deprecation successors. */
  upstream?: string;
  signals: readonly DetectSignal[];
  /** The adapter that handles this entry, when there is one. */
  adapter: string | null;
  /** Derived from evidence, never hand-declared. */
  maturity: Maturity;
  nextLevelGap: NextLevelGap | null;
  /** Which capability axis a missing adapter would block. */
  blocksAxes: readonly string[];
  /** Required for `DEPRECATED`: the entry that replaces this one. */
  successor: string | null;
  /** Required for `DEPRECATED`: never a silent disappearance. */
  removalDate: string | null;
  /** Required for `NOT_APPLICABLE`. */
  notApplicableReason: string | null;
  /**
   * The upstream package / distribution names this entry is known by,
   * with their ecosystem. This is census data, declared here rather than
   * in a consumer, because both the detection signal and the staleness
   * check need it — and when they each held their own copy, the census
   * declared `playwright` while the field installs `@playwright/test`, so
   * the tool the engine actually handles appeared in its own gap report.
   *
   * `ecosystem: "any"` means the name is genuinely cross-ecosystem and
   * the match must ignore the observed ecosystem.
   */
  upstreamPackages: readonly { ecosystem: string; name: string }[];
  /**
   * Upstream majors the adapter demonstrably handles. A `SUPPORTED`
   * entry whose observed major is absent here is auto-demoted by the
   * staleness trigger (ADR 0010 rule 3).
   */
  handledUpstreamMajors: readonly string[];
  revisitTrigger: string;
}

export interface CensusDiagnostics {
  code: CensusDiagnosticCode;
  entryId: string;
  message: string;
  severity: "error" | "warning";
}

export type CensusDiagnosticCode =
  | "MISSING_OWNER"
  | "MISSING_SIGNALS"
  | "SUPPORTED_WITHOUT_ADAPTER"
  | "TARGET_WITHOUT_GAP"
  | "GAP_MISSING_OWNER"
  | "DEPRECATED_WITHOUT_SUCCESSOR"
  | "DEPRECATED_WITHOUT_REMOVAL_DATE"
  | "NOT_APPLICABLE_WITHOUT_REASON"
  | "UNRECOGNIZED_IN_SOURCE"
  | "DUPLICATE_ID"
  | "OVER_CLAIMED_MATURITY"
  | "STALE_UPSTREAM_MAJOR";

// ─── Evidence resolution ─────────────────────────────────────────────

/**
 * `CensusEvidenceResolver` is the seam between the census and the
 * filesystem. It exists so the census can be *derived* from real
 * artifacts (which is what makes maturity honest) while remaining
 * testable without a checkout.
 */
export interface CensusEvidenceResolver {
  /** An adapter module for the census id exists. */
  adapterExists(entry: CensusEntry): boolean;
  /** The adapter has unit tests. */
  unitTested(entry: CensusEntry): boolean;
  /** The adapter has a passing positive/negative/boundary/adversarial quad. */
  fixtureQuadVerified(entry: CensusEntry): boolean;
  /** A corpus measurement exists for the adapter at a matching detectorRev. */
  corpusVerified(entry: CensusEntry): boolean;
  /** Independent field repositories have contributed evidence. */
  fieldProven(entry: CensusEntry): boolean;
  /** The upstream major version the checkout actually uses, if detectable. */
  observedUpstreamMajor(entry: CensusEntry): string | null;
}

/**
 * A resolver that observes **nothing**. Every entry lands at `M0` and
 * every claim is `M0_UNKNOWN`, which is the correct default for a
 * resolver that cannot see the repository: never grant a level you
 * cannot check (Law 1).
 */
export const BLIND_EVIDENCE_RESOLVER: CensusEvidenceResolver = {
  adapterExists: () => false,
  unitTested: () => false,
  fixtureQuadVerified: () => false,
  corpusVerified: () => false,
  fieldProven: () => false,
  observedUpstreamMajor: () => null,
};

export function resolveEvidence(
  entry: Omit<CensusEntry, "maturity" | "nextLevelGap">,
  resolver: CensusEvidenceResolver,
): MaturityEvidence {
  const probe: CensusEntry = {
    ...entry,
    maturity: "M0_UNKNOWN",
    nextLevelGap: null,
  };
  return {
    declared: Boolean(entry.owner) && entry.owner.trim() !== "",
    implemented: resolver.adapterExists(probe),
    unitTested: resolver.unitTested(probe),
    fixtureQuadVerified: resolver.fixtureQuadVerified(probe),
    corpusVerified: resolver.corpusVerified(probe),
    fieldProven: resolver.fieldProven(probe),
  };
}

// ─── Day-one seed ────────────────────────────────────────────────────

/**
 * The entries the v6 blueprint (§2.4.1) requires to be **explicitly in
 * the census from day one** — "previously omitted". They are seeded as
 * `TARGET` with a real `nextLevelGap`, because declaring them is the
 * point: an omitted tool is invisible, and an invisible tool is a tool
 * the engine silently ignores.
 *
 * This list is the ONE place a support name may be typed, and it is
 * typed as `TARGET` (no proof) rather than `SUPPORTED`. Adding a name
 * here is a census change with a date and an owner, which is exactly the
 * discipline a hand-maintained support list lacks.
 */
interface SeedSpec {
  name: string;
  category: CensusCategory;
  signal: DetectSignal;
  blocksAxes: readonly string[];
}

const DAY_ONE_SEED: readonly SeedSpec[] = [
  {
    name: "Cucumber",
    category: "bdd-spec-dsl",
    signal: {
      kind: "dependency",
      ecosystem: "npm",
      name: "@cucumber/cucumber",
    },
    blocksAxes: ["Discovery", "Static Analysis"],
  },
  {
    name: "SpecFlow",
    category: "bdd-spec-dsl",
    signal: { kind: "dependency", ecosystem: "nuget", name: "SpecFlow" },
    blocksAxes: ["Discovery", "Static Analysis"],
  },
  {
    name: "Karate",
    category: "api-contract-testing",
    signal: {
      kind: "dependency",
      ecosystem: "maven",
      name: "com.intuit.karate",
    },
    blocksAxes: ["API QA", "Contract Coverage"],
  },
  {
    name: "REST Assured",
    category: "api-contract-testing",
    signal: { kind: "dependency", ecosystem: "maven", name: "io.rest-assured" },
    blocksAxes: ["API QA", "Contract Coverage"],
  },
  {
    name: "Pact",
    category: "api-contract-testing",
    signal: {
      kind: "dependency",
      ecosystem: "npm",
      name: "@pact-foundation/pact",
    },
    blocksAxes: ["API QA", "Contract Quality"],
  },
  {
    name: "Postman / Newman",
    category: "api-contract-testing",
    signal: { kind: "dependency", ecosystem: "npm", name: "newman" },
    blocksAxes: ["API QA", "Artifact Analysis"],
  },
  {
    name: "Bruno",
    category: "api-contract-testing",
    signal: { kind: "manifest-file", path: "bruno.json" },
    blocksAxes: ["API QA", "Discovery"],
  },
  {
    name: "Testcontainers",
    category: "test-framework",
    signal: {
      kind: "dependency",
      ecosystem: "java",
      name: "org.testcontainers",
    },
    blocksAxes: ["Database QA", "Isolation"],
  },
  {
    name: "Playwright Components",
    category: "component-e2e",
    signal: {
      kind: "dependency",
      ecosystem: "npm",
      name: "@playwright/experimental-ct",
    },
    blocksAxes: ["Component E2E"],
  },
  {
    name: "Robot Framework",
    category: "test-runner",
    signal: { kind: "dependency", ecosystem: "pypi", name: "robotframework" },
    blocksAxes: ["Discovery", "Human / Manual Verification"],
  },
  {
    name: "k6",
    category: "load-performance",
    signal: { kind: "manifest-file", path: "k6.config.js" },
    blocksAxes: ["Performance QA"],
  },
  {
    name: "Gatling",
    category: "load-performance",
    signal: { kind: "dependency", ecosystem: "sbt", name: "io.gatling" },
    blocksAxes: ["Performance QA"],
  },
  {
    name: "Locust",
    category: "load-performance",
    signal: { kind: "dependency", ecosystem: "pypi", name: "locust" },
    blocksAxes: ["Performance QA"],
  },
  {
    name: "TestRail",
    category: "test-management",
    signal: { kind: "extension", glob: "**/testrail*.yml" },
    blocksAxes: ["Human / Manual Verification"],
  },
  {
    name: "Xray",
    category: "test-management",
    signal: { kind: "dependency", ecosystem: "maven", name: "xray" },
    blocksAxes: ["Human / Manual Verification"],
  },
  {
    name: "Zephyr",
    category: "test-management",
    signal: { kind: "manifest-file", path: "zephyr.properties" },
    blocksAxes: ["Human / Manual Verification"],
  },
  {
    name: "Azure Test Plans",
    category: "test-management",
    signal: { kind: "workflow-dir", path: ".azure-test-plans" },
    blocksAxes: ["Human / Manual Verification"],
  },
  {
    name: "Terraform",
    category: "iac-container",
    signal: { kind: "extension", glob: "**/*.tf" },
    blocksAxes: ["Infrastructure / Cloud / IaC"],
  },
  {
    name: "Kubernetes manifests",
    category: "iac-container",
    signal: { kind: "extension", glob: "**/k8s-*.yaml" },
    blocksAxes: ["Infrastructure / Cloud / IaC"],
  },
];

/** Slug form of a census name: stable, lower-kebab, no version noise. */
export function censusSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * The leading major of a version or range. `FRAMEWORK_INVENTORY`
 * records *validated versions* (`1.44`, `29`) while a manifest records a
 * *range* (`^29.7.0`); both sides normalise to a major so the staleness
 * trigger compares like with like. A trigger that fires on a
 * representation difference is a trigger people learn to ignore.
 */
export function versionMajor(raw: string): string | null {
  // `\d+(?:\.\d+)*` is a single character run with one optional group and
  // no nested quantifier, so it is linear; the rule cannot see that.
  // eslint-disable-next-line security/detect-unsafe-regex
  const match = /\d+(?:\.\d+)*/.exec(raw);
  if (!match) return null;
  return (match[0] ?? "").split(".")[0] ?? null;
}

/** Deduplicated, numerically sorted majors of a validated-version list. */
export function normalizeMajors(versions: readonly string[]): string[] {
  const majors = new Set<string>();
  for (const version of versions) {
    const major = versionMajor(version);
    if (major !== null) majors.add(major);
  }
  return [...majors].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
}

// ─── Derivation from existing primitives (ADR 0007) ──────────────────

const ENTITY_TYPE_TO_CATEGORY: Readonly<
  Record<FrameworkMetadata["entityType"], CensusCategory>
> = {
  TEST_FRAMEWORK: "test-framework",
  E2E_FRAMEWORK: "component-e2e",
  AUTOMATION_LIBRARY: "test-runner",
  CI_PROVIDER: "ci-cd-provider",
};

/**
 * Derive census entries from the framework inventory that already
 * exists. This is the mechanism that keeps ADR 0007 honest: the census
 * **projects** the existing primitive instead of re-declaring it, so a
 * framework added to `FRAMEWORK_INVENTORY` appears in the census without
 * anybody typing its name twice.
 */
export function deriveFrameworkEntries(
  resolver: CensusEvidenceResolver = BLIND_EVIDENCE_RESOLVER,
  observedAt = "1970-01-01",
): CensusEntry[] {
  return FRAMEWORK_INVENTORY.filter(
    // CI providers are derived once, by the joined
    // `deriveCiProviderEntries`, which folds this primitive together with
    // the provider-capability contract. Emitting them here too would
    // recreate the parallel-inventory drift inside the census.
    (framework) => framework.entityType !== "CI_PROVIDER",
  ).map((framework) => {
    const category = ENTITY_TYPE_TO_CATEGORY[framework.entityType];
    const base: Omit<CensusEntry, "maturity" | "nextLevelGap"> = {
      id: `ec.${category}.${censusSlug(framework.frameworkId)}`,
      name: framework.frameworkId,
      category,
      // An entry with no adapter is a TARGET, never a SUPPORTED claim.
      // `gitlab-ci` at F0/UNSUPPORTED lands here, which is the truth.
      state: framework.executorAdapterIds.length > 0 ? "SUPPORTED" : "TARGET",
      owner: "framework-inventory",
      observedAt,
      signals: deriveSignalsFromFramework(framework),
      adapter:
        framework.executorAdapterIds.length > 0
          ? framework.executorAdapterIds.join(",")
          : null,
      blocksAxes: ["Discovery"],
      successor: null,
      removalDate: null,
      notApplicableReason: null,
      handledUpstreamMajors: normalizeMajors(framework.validatedVersions),
      upstreamPackages: upstreamPackagesFor(censusSlug(framework.frameworkId)),
      revisitTrigger: `adapter no longer handles a major version in ${framework.frameworkId}; census staleness trigger demotes SUPPORTED`,
    };
    return materialize(base, resolver);
  });
}

/**
 * CI provider entries derived from the existing provider contract, with
 * the framework inventory's `CI_PROVIDER` rows **joined in** rather than
 * appended.
 *
 * The join is the point. `FRAMEWORK_INVENTORY` and
 * `CI_PROVIDER_CAPABILITY_RECORDS` both describe `github-actions`,
 * `azure-pipelines`, `gitlab-ci` and `jenkins`; emitting both would
 * recreate the parallel-inventory drift *inside* the census, which is the
 * exact defect ADR 0007 exists to prevent. So the two primitives are
 * projected into one entry per provider, keyed by a slug that folds the
 * two naming conventions (`azure-devops` ≡ `azure-pipelines`) together.
 */
export function deriveCiProviderEntries(
  resolver: CensusEvidenceResolver = BLIND_EVIDENCE_RESOLVER,
  observedAt = "1970-01-01",
): CensusEntry[] {
  const inventoryRows = new Map<string, FrameworkMetadata>();
  for (const framework of FRAMEWORK_INVENTORY) {
    if (framework.entityType !== "CI_PROVIDER") continue;
    inventoryRows.set(canonicalProviderSlug(framework.frameworkId), framework);
  }

  const records = new Map<
    string,
    (typeof CI_PROVIDER_CAPABILITY_RECORDS)[number]
  >();
  for (const record of CI_PROVIDER_CAPABILITY_RECORDS) {
    records.set(canonicalProviderSlug(record.provider), record);
  }

  const slugs = new Set([...inventoryRows.keys(), ...records.keys()]);
  const entries: CensusEntry[] = [];
  for (const slug of [...slugs].sort()) {
    const framework = inventoryRows.get(slug);
    const record = records.get(slug);
    const adapterIds = [
      ...(framework?.executorAdapterIds ?? []),
      ...(record === undefined ? [] : [`src/adapters/${slug}.ts`]),
    ];
    const hasAdapter = adapterIds.length > 0;
    const base: Omit<CensusEntry, "maturity" | "nextLevelGap"> = {
      id: `ec.ci-cd-provider.${slug}`,
      name: slug,
      category: "ci-cd-provider",
      state: hasAdapter ? "SUPPORTED" : "TARGET",
      owner: "provider-capability-contract",
      observedAt,
      signals: deriveSignalsFromProvider(slug),
      adapter: hasAdapter ? adapterIds.join(",") : null,
      blocksAxes: ["CI Integrity", "False-Green Detection"],
      successor: null,
      removalDate: null,
      notApplicableReason: null,
      handledUpstreamMajors: normalizeMajors(
        framework?.validatedVersions ?? [],
      ),
      upstreamPackages: upstreamPackagesFor(slug),
      revisitTrigger: `CI-IR adapter no longer normalizes a ${slug} pipeline construct; census staleness trigger demotes SUPPORTED`,
    };
    entries.push(materialize(base, resolver));
  }
  return entries;
}

/**
 * Fold the two provider naming conventions onto one key.
 * `azure-devops` (the product) and `azure-pipelines` (the service) are
 * the same census entry; without this the census would carry both and a
 * consumer would have to guess which one to look up.
 */
export function canonicalProviderSlug(id: string): string {
  const slug = censusSlug(id);
  if (slug === "azure-devops") return "azure-pipelines";
  return slug;
}

function deriveSignalsFromFramework(
  framework: FrameworkMetadata,
): readonly DetectSignal[] {
  const slug = censusSlug(framework.frameworkId);
  if (framework.entityType === "CI_PROVIDER") {
    return [{ kind: "workflow-dir", path: `.${slug}` }];
  }
  const signals: DetectSignal[] = upstreamPackagesFor(slug).map((pkg) => ({
    kind: "dependency",
    ecosystem: pkg.ecosystem,
    name: pkg.name,
  }));
  signals.push({ kind: "config-file", path: `${slug}.config.js` });
  signals.push({ kind: "config-file", path: `${slug}.config.ts` });
  return signals;
}

/**
 * Per-provider detection signals. One entry, one signal: a signal list
 * that names every provider for every provider would let the probe claim
 * to detect GitLab CI in a repository that has none, which is a
 * discovery false positive wearing a support claim's clothes.
 */
const PROVIDER_SIGNALS: Readonly<Record<string, readonly DetectSignal[]>> = {
  "github-actions": [{ kind: "workflow-dir", path: ".github/workflows" }],
  "gitlab-ci": [{ kind: "manifest-file", path: ".gitlab-ci.yml" }],
  "azure-pipelines": [{ kind: "manifest-file", path: "azure-pipelines.yml" }],
  jenkins: [{ kind: "manifest-file", path: "Jenkinsfile" }],
};

function deriveSignalsFromProvider(slug: string): readonly DetectSignal[] {
  return (
    PROVIDER_SIGNALS[slug] ?? [{ kind: "manifest-file", path: `${slug}.yml` }]
  );
}

function materialize(
  base: Omit<CensusEntry, "maturity" | "nextLevelGap">,
  resolver: CensusEvidenceResolver,
): CensusEntry {
  const evidence = resolveEvidence(base, resolver);
  const { maturity, nextLevelGap } = nextLevelGapFromEvidence(
    evidence,
    base.owner,
    base.revisitTrigger,
  );
  return { ...base, maturity, nextLevelGap };
}

// ─── Assembly ────────────────────────────────────────────────────────

// ─── Upstream package names ──────────────────────────────────────────

/**
 * The package / distribution names an entry is known by, per ecosystem.
 *
 * Versioned, owned and dated here — census data, not a consumer's guess.
 * The list is short and each entry is a fact about *naming* ("the Playwright
 * test runner ships as `@playwright/test`, not `playwright`"), not a
 * support claim, so it is safe to curate. The *support* claim lives in
 * `maturity`, which is derived.
 *
 * Getting this wrong is not cosmetic: when the census declared only
 * `playwright` while the field installs `@playwright/test`, the tool the
 * engine actually handles showed up in its own gap report as an
 * unrecognized tool.
 */
const UPSTREAM_PACKAGES: Readonly<
  Record<string, readonly { ecosystem: string; name: string }[]>
> = {
  playwright: [
    { ecosystem: "npm", name: "@playwright/test" },
    { ecosystem: "npm", name: "playwright" },
    { ecosystem: "npm", name: "playwright-core" },
    { ecosystem: "any", name: "playwright" },
  ],
  "playwright-components": [
    { ecosystem: "npm", name: "@playwright/experimental-ct" },
  ],
  cypress: [{ ecosystem: "npm", name: "cypress" }],
  jest: [
    { ecosystem: "npm", name: "jest" },
    { ecosystem: "npm", name: "jest-cli" },
  ],
  vitest: [{ ecosystem: "npm", name: "vitest" }],
  mocha: [{ ecosystem: "npm", name: "mocha" }],
  jasmine: [{ ecosystem: "npm", name: "jasmine" }],
  selenium: [
    { ecosystem: "npm", name: "selenium-webdriver" },
    { ecosystem: "pypi", name: "selenium" },
    { ecosystem: "maven", name: "org.seleniumhq.selenium" },
    { ecosystem: "java", name: "selenium-java" },
    { ecosystem: "nuget", name: "Selenium.WebDriver" },
    { ecosystem: "go", name: "github.com/tebeka/selenium" },
  ],
  pytest: [
    { ecosystem: "pypi", name: "pytest" },
    { ecosystem: "pypi", name: "_pytest" },
  ],
  unittest: [{ ecosystem: "pypi", name: "unittest" }],
  typescript: [
    { ecosystem: "npm", name: "typescript" },
    { ecosystem: "npm", name: "ts-jest" },
    { ecosystem: "npm", name: "ts-node" },
  ],
  python: [{ ecosystem: "pypi", name: "pytest" }],
  java: [{ ecosystem: "maven", name: "org.junit.jupiter" }],
  csharp: [{ ecosystem: "nuget", name: "xunit" }],
  junit: [
    { ecosystem: "maven", name: "junit" },
    { ecosystem: "maven", name: "junit-jupiter" },
    { ecosystem: "gradle", name: "junit" },
    { ecosystem: "gradle", name: "junit-jupiter" },
  ],
  testng: [
    { ecosystem: "maven", name: "org.testng" },
    { ecosystem: "gradle", name: "testng" },
  ],
  nunit: [
    { ecosystem: "nuget", name: "NUnit" },
    { ecosystem: "nuget", name: "NUnit3TestAdapter" },
  ],
  xunit: [{ ecosystem: "nuget", name: "xunit" }],
  mstest: [{ ecosystem: "nuget", name: "MSTest.TestFramework" }],
  "github-actions": [{ ecosystem: "npm", name: "@actions/core" }],
  "azure-pipelines": [],
  jenkins: [],
  "gitlab-ci": [],
};

export function upstreamPackagesFor(
  slug: string,
): readonly { ecosystem: string; name: string }[] {
  return UPSTREAM_PACKAGES[slug] ?? [{ ecosystem: "any", name: slug }];
}

// ─── Name classifier ─────────────────────────────────────────────────

/**
 * A versioned, owned, dated pattern that places a discovered name into a
 * census category.
 *
 * Why this table exists, stated plainly: the census covers the **QA
 * ecosystem**, not every dependency a repository has. `react` and
 * `lodash` are not ecosystem gaps; a gap report listing 4 197 npm
 * packages is a report nobody reads, and a report nobody reads is the
 * same failure as no report at all. So an observation is only a *finding*
 * when it is either (a) matched to a census entry by signal, or (b)
 * matched to a QA-tool name pattern here.
 *
 * This is a curated list, which is exactly what Law 8 forbids — with two
 * differences that make it a census rather than a support list:
 *
 *  - it is **versioned, owned and dated** here, and schema-gated by
 *    `ecosystem:census`;
 *  - it is **diffed against discovery** by `ecosystem:gaps`, so an
 *    unlisted QA tool shows up as `UNRECOGNIZED` and must be dispositioned
 *    rather than quietly widening the list.
 *
 * A pattern that matches nothing is not a "false positive" — it is a
 * capability (a category nobody has a tool for yet), and it is reported.
 */
export interface CensusNamePattern {
  id: string;
  category: CensusCategory;
  pattern: RegExp;
  /** Why this pattern identifies a tool of this category. */
  rationale: string;
  observedAt: string;
  owner: Owner;
}

export const CENSUS_NAME_PATTERNS: readonly CensusNamePattern[] = [
  // Test frameworks / runners — JS/TS
  {
    id: "np.js-runner",
    category: "test-runner",
    pattern: /^(jest|vitest|mocha|jasmine|ava|karma|qunit|uvu|tape)$/i,
    rationale: "JavaScript and TypeScript test runner package name",
    observedAt: "2026-09-25",
    owner: "ecosystem-census",
  },
  {
    id: "np.js-bdd",
    category: "bdd-spec-dsl",
    pattern:
      /^(@cucumber\/cucumber|@badeball\/cucumber|cucumber|@wdio\/cucumber-framework|codeceptjs|playwright-bdd|ts-bdd)$/i,
    rationale: "BDD and spec-DSL package name",
    observedAt: "2026-09-25",
    owner: "ecosystem-census",
  },
  // Component / E2E
  {
    id: "np.e2e",
    category: "component-e2e",
    pattern:
      /^(@playwright\/(test|ct|experimental-ct)|cypress|puppeteer|puppeteer-core|selenium-webdriver|webdriverio|@wdio\/cli|nightwatch|protractor|testcafe)$/i,
    rationale: "Browser automation and end-to-end driver package name",
    observedAt: "2026-09-25",
    owner: "ecosystem-census",
  },
  {
    id: "np.percy-chromatic",
    category: "visual-regression",
    pattern:
      /^(@percy\/\w+|percy|chromatic|@chromatic-sdk\/\w+|backstopjs|argus)$/i,
    rationale: "Visual-regression platform client package name",
    observedAt: "2026-09-25",
    owner: "ecosystem-census",
  },
  // API / contract
  {
    id: "np.api",
    category: "api-contract-testing",
    pattern:
      /^(supertest|axios-mock-adapter|nock|msw|@mswjs\/interceptors|newman|postman-collection|@pact-foundation\/\w+|karate|wiremock|wiremock-jre8|@openapi\/\w+|swagger-parser|json-schema-faker|dredd|schemathesis|hoppscotch|@usebruno\/\w+)$/i,
    rationale: "API and contract testing client or mock package name",
    observedAt: "2026-09-25",
    owner: "ecosystem-census",
  },
  // Mobile
  {
    id: "np.mobile",
    category: "mobile-testing",
    pattern:
      /^(appium|@appium\/\w+|detox|maestro|maestro-cli|espresso|androidx\.test\.\w+|xctest|robolectric|appium-[a-z-]+)$/i,
    rationale: "Mobile test framework or device-automation driver package name",
    observedAt: "2026-09-25",
    owner: "ecosystem-census",
  },
  // Load / performance
  {
    id: "np.load",
    category: "load-performance",
    pattern:
      /^(k6|artillery|@artilleryio\/\w+|locust|autocannon|gatling|gatling-test-framework|jmeter|tsung|wrk)$/i,
    rationale: "Load and performance testing tool package name",
    observedAt: "2026-09-25",
    owner: "ecosystem-census",
  },
  // Accessibility / security scanners
  {
    id: "np.a11y",
    category: "accessibility-scanner",
    pattern:
      /^(axe-core|@axe-core\/\w+|pa11y|pa11y-ci|jest-axe|eslint-plugin-jsx-a11y|lighthouse|lighthouse-ci|@lhci\/\w+|a11y-toolkit)$/i,
    rationale: "Accessibility scanning client package name",
    observedAt: "2026-09-25",
    owner: "ecosystem-census",
  },
  {
    id: "np.security",
    category: "security-scanner",
    pattern:
      /^(snyk|@snyk\/\w+|semgrep|trivy|grype|syft|trufflehog|gitleaks|detect-secrets|bandit|safety|checkov|tfsec|npm-check-updates)$/i,
    rationale: "Security scanner, SAST or dependency gate package name",
    observedAt: "2026-09-25",
    owner: "ecosystem-census",
  },
  // Mutation
  {
    id: "np.mutation",
    category: "mutation-testing",
    pattern:
      /^(mutation-testing-report-schema|@stryker-mutator\/\w+|stryker|cosmic-ray|mutmut|infection\/infection|pitest|pitest-junit5)$/i,
    rationale: "Mutation-testing tool package name",
    observedAt: "2026-09-25",
    owner: "ecosystem-census",
  },
  // Test management / requirements
  {
    id: "np.tm",
    category: "test-management",
    pattern:
      /^(@qase\/\w+|qase|zephyr|xray|testrail|allure|@allure-js\/\w+|@testmanager\/ai|testmo|@azure-devops\/\w+)$/i,
    rationale: "Test-management and reporting integration package name",
    observedAt: "2026-09-25",
    owner: "ecosystem-census",
  },
  // Report / artifact formats
  {
    id: "np.report",
    category: "report-artifact-format",
    pattern:
      /^(allure-junit4|@allure-cli\/\w+|junit-report|jest-junit|mocha-junit-reporter|cucumber-junit|istanbul|nyc|@vitest\/ui|lcov|cobertura|jest-html-reporters|mochawesome|@jest\/reporters)$/i,
    rationale: "Test report and coverage artifact producer package name",
    observedAt: "2026-09-25",
    owner: "ecosystem-census",
  },
  // Observability
  {
    id: "np.observability",
    category: "observability",
    pattern:
      /^(@sentry\/\w+|opentelemetry|@opentelemetry\/\w+|@elastic\/\w+|@datadog\/\w+|newrelic|winston|pino|dd-trace)$/i,
    rationale: "Observability and telemetry source package name",
    observedAt: "2026-09-25",
    owner: "ecosystem-census",
  },
  // CI providers (npm clients)
  {
    id: "np.ci",
    category: "ci-cd-provider",
    pattern:
      /^(actions-checkout|@actions\/\w+|@octokit\/\w+|@azure\/devops-node-api|@google-cloud\/cloud-build)$/i,
    rationale: "CI and CD provider client package name",
    observedAt: "2026-09-25",
    owner: "ecosystem-census",
  },
  // IaC / container
  {
    id: "np.iac",
    category: "iac-container",
    pattern:
      /^(terraform|@cdktf\/\w+|pulumi|@pulumi\/\w+|@aws-cdk\/\w+|serverless|@serverless\/\w+|knative|dockerode|@kubernetes\/client-node)$/i,
    rationale: "Infrastructure-as-code or container tooling package name",
    observedAt: "2026-09-25",
    owner: "ecosystem-census",
  },
  // Python / JVM / .NET / Go / Ruby / PHP / Rust / Swift QA tooling,
  // discovered by distribution name rather than by an npm package.
  {
    id: "dist.py-qa",
    category: "test-framework",
    pattern:
      /^(pytest|pytest-\w+|nose2|hypothesis|tox|robotframework|behave|robotframework-seleniumlibrary|selenium|allure-pytest|schemathesis|tavern|moto|responses|httpretty|testfixtures|deepchecks|nose|parameterized|freezegun|factory-boy|model-bakery|faker)$/i,
    rationale: "Python QA distribution name",
    observedAt: "2026-09-25",
    owner: "ecosystem-census",
  },
  {
    id: "dist.jvm-qa",
    category: "test-framework",
    pattern:
      /^(junit|junit-jupiter|org\.junit\.\w+|testng|org\.testng|spock|spock-core|assertj|assertj-core|org\.assertj|hamcrest|org\.hamcrest|mockito-core|org\.mockito|powermock|org\.powermock|wiremock-standalone|rest-assured|io\.rest-assured|com\.intuit\.karate|testcontainers|org\.testcontainers|selenium-java|io\.selenium|io\.appium|cucumber-java|io\.cucumber|surefire|failsafe|org\.jacoco|org\.pitest|allure-junit4|org\.awaitility|org\.apache\.jmeter|io\.gatling|net\.serenity-bdd|serenity-core)$/i,
    rationale: "JVM QA artifact or plugin name",
    observedAt: "2026-09-25",
    owner: "ecosystem-census",
  },
  {
    id: "dist.net-qa",
    category: "test-framework",
    pattern:
      /^(xunit|xunit\.core|nunit|nunit\.framework|mstest(\.testframework)?|microsoft\.net\.test\.sdk|specflow|specflow\.core|coverlet\.collector|moq|nsubstitute|fluentassertions|shouldly|autofixture|playwright\.microsoft|practicals\.playwright|selenium\.webdriver|wiremock\.net)$/i,
    rationale: ".NET QA package name",
    observedAt: "2026-09-25",
    owner: "ecosystem-census",
  },
  {
    id: "dist.go-qa",
    category: "test-framework",
    pattern:
      /^(testify|ginkgo|gomega|go-cmp|go-playwright|playwright-go|chromedp|rod|agouti|check\.v1|gotest\.tools|gocheck)$/i,
    rationale:
      "Go testing-library package name (testify, ginkgo, go-cmp and peers)",
    observedAt: "2026-09-25",
    owner: "ecosystem-census",
  },
  {
    id: "dist.ruby-qa",
    category: "test-framework",
    pattern:
      /^(rspec|rspec-core|rspec-rails|capybara|minitest|webmock|vcr|factory_bot|shoulda-matchers|simplecov|selenium-webdriver|puppet-lint|rspec-puppet|rspec_junit_formatter)$/i,
    rationale: "Ruby testing gem name (rspec, minitest, cucumber and peers)",
    observedAt: "2026-09-25",
    owner: "ecosystem-census",
  },
  {
    id: "dist.php-qa",
    category: "test-framework",
    pattern:
      /^(phpunit|codeception|behat|pestphp\/pest|phpspec|kahlan|infection\/infection|atoum|phpstan\/phpstan|psalm|friendsofphp\/php-cs-fixer|codeception\/module-\w+|symfony\/phpunit-bridge|mockery\/mockery|dmore\/behat-chrome-extension|php-mock\/php-mock|phpunit-silent-result-printer)$/i,
    rationale: "PHP QA package name (phpunit, codeception, pest and peers)",
    observedAt: "2026-09-25",
    owner: "ecosystem-census",
  },
  {
    id: "dist.rust-qa",
    category: "test-framework",
    pattern:
      /^(proptest|quickcheck|rstest|test-case|criterion|iai|mockall|mockito|wiremock|wiremock-rs|serial_test|nextest|proptest-derive|approx|pretty_assertions|test-log|cargo-nextest)$/i,
    rationale: "Rust QA crate name (proptest, mockall, wiremock and peers)",
    observedAt: "2026-09-25",
    owner: "ecosystem-census",
  },
  {
    id: "dist.swift-qa",
    category: "mobile-testing",
    pattern:
      /^(xctest|quick|nimble|snapshotTesting|swift-snapshot-testing|earendil-works)$/i,
    rationale: "Swift and iOS test package name",
    observedAt: "2026-09-25",
    owner: "ecosystem-census",
  },
];

/** The category a name pattern places a discovered name in, or `null`. */
export function classifyName(name: string): {
  category: CensusCategory;
  patternId: string;
} | null {
  for (const pattern of CENSUS_NAME_PATTERNS) {
    if (pattern.pattern.test(name)) {
      return { category: pattern.category, patternId: pattern.id };
    }
  }
  return null;
}

// ─── What is not QA tooling ─────────────────────────────────────────

/**
 * Tooling that a QA engine is right to *ignore*, with a reason.
 *
 * The first corpus run reported 44 `UNRECOGNIZED` tools, and 15 of them
 * were error trackers, tracing SDKs and GitHub API clients — `@sentry/*`,
 * `@opentelemetry/*`, `@elastic/*`, `@octokit/*`, `@actions/*`. None of
 * them says anything about test quality, and every one of them was
 * occupying a gap slot.
 *
 * That is a Law 8 failure in the *other* direction from the one Law 8
 * names. An inflated gap list is not an honest one: it drowns the four
 * real findings (the `pytest-*` plugins, the accessibility scanners, the
 * report producers) in fifteen phantoms, and a report nobody can triage
 * protects nothing. The first corpus run was right to name them; it was
 * wrong to call them gaps.
 *
 * Each entry states the reason, because "we decided these don't count" is
 * a judgement someone has to be able to re-make. These are *observation*
 * patterns — a name is still detected and still reported in the scan — so
 * nothing is hidden; they are simply not counted as capability gaps.
 */
export interface NotQaToolingPattern {
  id: string;
  pattern: RegExp;
  rationale: string;
}

export const NOT_QA_TOOLING: readonly NotQaToolingPattern[] = [
  {
    id: "error-tracking",
    pattern:
      /^(@sentry\/|sentry|bugsnag|rollbar|datadoghq|@datadoghq\/\w+|raygun|bugherd)/i,
    rationale:
      "Error tracking reports where production broke. It says nothing about whether a test proves anything, and a test-quality engine that treated it as a coverage signal would be measuring the wrong thing.",
  },
  {
    id: "tracing-and-telemetry",
    pattern:
      /^(@opentelemetry\/|opentelemetry|@elastic\/|@newrelic\/|newrelic|dd-trace|@datadog\/)/i,
    rationale:
      "Tracing and metrics SDKs instrument runtime behaviour. They are observability inputs, not test evidence, and counting them as a gap would inflate the backlog with every company that has a tracing stack.",
  },
  {
    id: "source-control-api",
    pattern:
      /^(@octokit\/|octokit|@actions\/core|@actions\/github|@actions\/http-client|@actions\/io|@actions\/runner|@actions\/cache|@actions\/artifact)/i,
    rationale:
      "GitHub API clients and Actions SDK packages appear in CI workflow code, not in test code. A QA engine analysing a repository should see them and say nothing about them.",
  },
  {
    id: "general-runtime",
    // `react-dom` is covered by the `react` prefix. `eslint`, `typescript`
    // and `prettier` are deliberately NOT here: a linter and a formatter
    // are absent from this list on purpose, because exempting them by name
    // is a judgement about *this* repository's stack, and the next
    // repository's build tooling would need a new entry. They land in
    // `notAFinding` anyway -- they match no QA name pattern either.
    pattern:
      /^(react|vue|angular|@angular\/core|svelte|next|nuxt|express|fastify|webpack|vite|rollup)/i,
    rationale:
      "An application dependency. It appears in the same package.json as the tooling, and a gap report that lists it is a gap report nobody reads.",
  },
];

/** The pattern that classifies a name as not-QA-tooling, or `null`. */
export function classifyNotQaTooling(name: string): NotQaToolingPattern | null {
  for (const entry of NOT_QA_TOOLING) {
    if (entry.pattern.test(name)) return entry;
  }
  return null;
}

// ─── Build the census ────────────────────────────────────────────────

export interface Census {
  schemaVersion: typeof CENSUS_SCHEMA_VERSION;
  censusId: typeof CENSUS_ID;
  observedAt: string;
  entries: readonly CensusEntry[];
}

/**
 * Apply the staleness trigger (ADR 0010 rule 3): a `SUPPORTED` entry
 * whose upstream released a major the adapter does not handle is
 * **auto-demoted to `TARGET`** with a `nextLevelGap` that names the
 * observed major.
 *
 * This is the mechanism that closes the third silent failure mode. A
 * framework's upstream major moves, nothing in the repo changes, and the
 * support list keeps saying "supported" — until now, when the demotion
 * happens in the registry rather than in a reviewer's memory.
 *
 * The demotion is not a judgement about the adapter: it registers that
 * the adapter's validated-version set no longer covers what the field
 * uses. Re-promotion needs new validated versions with real proof, which
 * is a different artifact and a different gate.
 *
 * **It returns a *view*, it does not mutate the census.** The base
 * registry answers "what do we claim", which depends only on the
 * checkout; the demotion answers "what does the field say", which
 * depends on whether the corpus cache happens to be present. Baking the
 * second into the first made the generated artifact non-reproducible on
 * a machine without the cache — a clock-style nondeterminism in a file
 * that is supposed to be byte-stable for a given commit. The two
 * concerns stay separate, exactly as `state` (ecosystem coverage) and
 * `maturity` (proof) are separate axes.
 */
export function applyStalenessDemotion(
  entry: CensusEntry,
  resolver: CensusEvidenceResolver,
): CensusEntry {
  if (entry.state !== "SUPPORTED") return entry;
  if (entry.handledUpstreamMajors.length === 0) return entry;
  const observed = resolver.observedUpstreamMajor(entry);
  if (observed === null) return entry;
  if (entry.handledUpstreamMajors.includes(observed)) return entry;
  return {
    ...entry,
    state: "TARGET",
    nextLevelGap: {
      target: "M2_IMPLEMENTED",
      missing: [
        `adapter validated against upstream major(s) ${entry.handledUpstreamMajors.join(", ")} but the corpus uses major ${observed}`,
        "re-validate the adapter against the observed major with positive/negative/boundary/adversarial fixtures",
      ],
      owner: entry.owner,
      revisitTrigger: `upstream major ${observed} validated against the adapter`,
    },
  };
}

/** A staleness finding: which entry, and what the field is using. */
export interface StalenessDemotion {
  entryId: string;
  handledUpstreamMajors: readonly string[];
  observedMajor: string;
  reason: string;
}

/**
 * The demoted view of a census, plus the findings that produced it.
 * `entries` is what the census *should* say right now; `demotions` is
 * the evidence for the change.
 */
export interface StalenessView {
  entries: readonly CensusEntry[];
  demotions: readonly StalenessDemotion[];
}

export function applyStalenessDemotions(
  census: Census,
  resolver: CensusEvidenceResolver,
): StalenessView {
  const demotions: StalenessDemotion[] = [];
  const entries = census.entries.map((entry) => {
    const demoted = applyStalenessDemotion(entry, resolver);
    if (demoted === entry) return entry;
    const observed = resolver.observedUpstreamMajor(entry) ?? "UNKNOWN";
    demotions.push({
      entryId: entry.id,
      handledUpstreamMajors: entry.handledUpstreamMajors,
      observedMajor: observed,
      reason: `upstream major ${observed} is not in the adapter's validated majors ${entry.handledUpstreamMajors.join(", ")}; auto-demoted SUPPORTED → TARGET`,
    });
    return demoted;
  });
  return { entries, demotions };
}

/**
 * Build the census. `observedAt` is supplied by the caller (the
 * generator stamps the checkout date) so the module stays pure and the
 * generated artifact stays reproducible.
 *
 * The result is the **base registry**: no staleness demotion, so it is a
 * function of the checkout alone. Apply `applyStalenessDemotions` for the
 * field-aware view.
 */
export function buildCensus(
  options: {
    resolver?: CensusEvidenceResolver;
    observedAt?: string;
  } = {},
): Census {
  const resolver = options.resolver ?? BLIND_EVIDENCE_RESOLVER;
  const observedAt = options.observedAt ?? "1970-01-01";
  const derived = [
    ...deriveFrameworkEntries(resolver, observedAt),
    ...deriveCiProviderEntries(resolver, observedAt),
  ];
  const byId = new Map(derived.map((entry) => [entry.id, entry]));
  for (const spec of DAY_ONE_SEED) {
    const id = `ec.${spec.category}.${censusSlug(spec.name)}`;
    if (byId.has(id)) continue; // derived from a primitive already
    byId.set(
      id,
      materialize(
        {
          id,
          name: spec.name,
          category: spec.category,
          // Declared, no proof. That is the entire point of seeding them.
          state: "TARGET",
          owner: "ecosystem-census",
          observedAt,
          signals: [spec.signal],
          adapter: null,
          blocksAxes: spec.blocksAxes,
          successor: null,
          removalDate: null,
          notApplicableReason: null,
          handledUpstreamMajors: [],
          upstreamPackages: [{ ecosystem: "any", name: spec.name }],
          revisitTrigger: `census gap generator reports this entry in the field backlog; promote only with adapter + corpus proof`,
        },
        resolver,
      ),
    );
  }
  return {
    schemaVersion: CENSUS_SCHEMA_VERSION,
    censusId: CENSUS_ID,
    observedAt,
    // The base registry: a function of the checkout alone, so the
    // generated artifact is byte-stable for a given commit. Staleness
    // demotions live in a separate, clearly-labelled section of the
    // artifact (ADR 0010 rule 3) precisely because they depend on whether
    // the corpus cache is present.
    entries: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id)),
  };
}

// ─── Validation (the `ecosystem:census` gate) ────────────────────────

/**
 * Census schema + ownership + staleness validation. `UNRECOGNIZED` in
 * the *source* census is an error: the census is the curated registry
 * and cannot contain its own discovery output (that is what the gap
 * report is for). An unrecognized tool belongs in discovery, and the gap
 * generator must have a disposition for it.
 */
export function validateCensus(
  census: Census,
  resolver: CensusEvidenceResolver = BLIND_EVIDENCE_RESOLVER,
): CensusDiagnostics[] {
  const diagnostics: CensusDiagnostics[] = [];
  const seen = new Set<string>();
  for (const entry of census.entries) {
    if (seen.has(entry.id)) {
      diagnostics.push({
        code: "DUPLICATE_ID",
        entryId: entry.id,
        message: "duplicate census id",
        severity: "error",
      });
    }
    seen.add(entry.id);
    if (!entry.owner || entry.owner.trim() === "") {
      diagnostics.push({
        code: "MISSING_OWNER",
        entryId: entry.id,
        message: "census entry has no named owner",
        severity: "error",
      });
    }
    if (entry.signals.length === 0) {
      diagnostics.push({
        code: "MISSING_SIGNALS",
        entryId: entry.id,
        message:
          "census entry has no detection signal, so discovery can never see it and a SUPPORTED claim is unfalsifiable",
        severity: "error",
      });
    }
    if (entry.state === "SUPPORTED" && entry.adapter === null) {
      diagnostics.push({
        code: "SUPPORTED_WITHOUT_ADAPTER",
        entryId: entry.id,
        message: "SUPPORTED requires an adapter",
        severity: "error",
      });
    }
    if (entry.state === "UNRECOGNIZED") {
      diagnostics.push({
        code: "UNRECOGNIZED_IN_SOURCE",
        entryId: entry.id,
        message:
          "UNRECOGNIZED is a discovery output, not a curated census state; record a disposition in the gap report instead",
        severity: "error",
      });
    }
    if (entry.state === "DEPRECATED") {
      if (entry.successor === null) {
        diagnostics.push({
          code: "DEPRECATED_WITHOUT_SUCCESSOR",
          entryId: entry.id,
          message: "DEPRECATED requires a successor link",
          severity: "error",
        });
      }
      if (entry.removalDate === null) {
        diagnostics.push({
          code: "DEPRECATED_WITHOUT_REMOVAL_DATE",
          entryId: entry.id,
          message:
            "DEPRECATED requires a removal date (never a silent disappearance)",
          severity: "error",
        });
      }
    }
    if (
      entry.state === "NOT_APPLICABLE" &&
      entry.notApplicableReason === null
    ) {
      diagnostics.push({
        code: "NOT_APPLICABLE_WITHOUT_REASON",
        entryId: entry.id,
        message: "NOT_APPLICABLE requires a recorded reason",
        severity: "error",
      });
    }
    if (entry.state === "TARGET" && entry.nextLevelGap === null) {
      diagnostics.push({
        code: "TARGET_WITHOUT_GAP",
        entryId: entry.id,
        message:
          "TARGET requires a nextLevelGap (D1: ship with an explicit gap)",
        severity: "error",
      });
    }
    if (entry.nextLevelGap && entry.nextLevelGap.owner.trim() === "") {
      diagnostics.push({
        code: "GAP_MISSING_OWNER",
        entryId: entry.id,
        message: "nextLevelGap has no named owner",
        severity: "error",
      });
    }
    // Over-claim check: a level above the one the evidence supports is
    // the exact Law 1 failure the census exists to prevent. Compare the
    // advertised level against what `resolveEvidence` can actually prove —
    // a level is not credible because somebody typed it into a field, so
    // the comparison has to run through the evidence function rather than
    // against a hardcoded "nothing proves anything" shortcut.
    const proven = deriveMaturityFromEvidence(resolveEvidence(entry, resolver));
    if (maturityRank(entry.maturity) > maturityRank(proven)) {
      diagnostics.push({
        code: "OVER_CLAIMED_MATURITY",
        entryId: entry.id,
        message: `advertises ${entry.maturity} but the resolver can only prove ${proven}`,
        severity: "error",
      });
    }
    // Staleness trigger (ADR 0010 rule 3).
    if (entry.state === "SUPPORTED" && entry.handledUpstreamMajors.length > 0) {
      const observed = resolver.observedUpstreamMajor(entry);
      if (
        observed !== null &&
        !entry.handledUpstreamMajors.includes(observed)
      ) {
        diagnostics.push({
          code: "STALE_UPSTREAM_MAJOR",
          entryId: entry.id,
          message: `upstream major ${observed} is not in handledUpstreamMajors ${entry.handledUpstreamMajors.join(", ")}; auto-demote SUPPORTED`,
          severity: "error",
        });
      }
    }
  }
  return diagnostics;
}

// ─── Discovery probe (ADR 0010 rule 1) ──────────────────────────────

/** One tool observed in one repository. */
export interface DiscoveryObservation {
  /** Which census entry the signal matched, or `null` when unknown. */
  censusId: string | null;
  name: string;
  category: CensusCategory | "UNCLASSIFIED";
  /** Repo-relative path or dependency that triggered the match. */
  via: string;
}

export interface DiscoveryResult {
  repo: string;
  observations: readonly DiscoveryObservation[];
}

/**
 * Run the probe's *classification* step over observations.
 *
 * Three outcomes, and the third is the point:
 *
 *  1. **recognized** — the observation matched a census entry's declared
 *     detection signal. The engine can see it and the census knows it.
 *  2. **classified / `UNRECOGNIZED`** — the observation matched a
 *     `CENSUS_NAME_PATTERNS` entry: we know exactly what kind of QA tool
 *     this is, but the census has no entry for it. **This is the real
 *     gap**, and it is what ADR 0010 means by "detected in a real
 *     repository but absent from the census".
 *  3. **not-a-finding** — an ordinary application dependency (`react`,
 *     `lodash`). The census covers the QA ecosystem, so these are counted
 *     and the count is published, but they are not gaps. Reporting them
 *     would produce a 4 000-row report nobody reads, and a report nobody
 *     reads is the same failure as no report.
 *
 * Pure, so the same function serves the generator, the gate and the test.
 */
export function classifyObservations(
  census: Census,
  observations: readonly DiscoveryObservation[],
): {
  recognized: DiscoveryObservation[];
  unrecognized: DiscoveryObservation[];
  notAFinding: DiscoveryObservation[];
  /** Observations excluded by NOT_QA_TOOLING rather than by being ordinary. */
  notQaTooling: number;
} {
  const bySignal = new Map<string, string>();
  for (const entry of census.entries) {
    for (const signal of entry.signals) {
      bySignal.set(signalKey(signal), entry.id);
    }
  }
  const recognized: DiscoveryObservation[] = [];
  const unrecognized: DiscoveryObservation[] = [];
  const notAFinding: DiscoveryObservation[] = [];
  let notQaTooling = 0;
  for (const observation of observations) {
    const hit =
      bySignal.get(signalKeyForObservation(observation)) ??
      matchDependencyObservation(census, observation);
    if (hit !== undefined && hit !== null) {
      recognized.push({ ...observation, censusId: hit });
      continue;
    }
    const named = classifyName(observation.name);
    if (named !== null) {
      // A QA tool by name that the census has no entry for. This is the
      // honesty signal, so it is never folded into "not a finding".
      unrecognized.push({
        ...observation,
        censusId: null,
        category: named.category,
      });
      continue;
    }
    // Classifiable as QA tooling by name, but explicitly out of scope for a
    // test-quality engine. Still observed and still reportable in a scan --
    // it is simply not a capability gap. Counting error trackers and CI API
    // clients as gaps is how a 4-finding backlog becomes an unreadable 19.
    if (classifyNotQaTooling(observation.name) !== null) {
      notQaTooling += 1;
    }
    notAFinding.push({
      ...observation,
      censusId: null,
      category: "UNCLASSIFIED",
    });
  }
  return { recognized, unrecognized, notAFinding, notQaTooling };
}

/**
 * Match a census `dependency` signal against an observation.
 *
 * Matching is by **package name**, not by `ecosystem + name`. An earlier
 * version keyed on both, which silently missed `pytest` (declared for
 * `npm`, observed in `pypi`) and `@playwright/test` (a scoped name the
 * entry did not list) — i.e. it reported tools the census handles as
 * *unrecognized*, which is a discovery false negative wearing an
 * honesty signal's clothes. A tool we claim to handle must never appear
 * in the gap report.
 *
 * A declared/observed ecosystem mismatch is still reported, as its own
 * diagnostic: "the census expects this tool in npm and the field uses it
 * in pypi" is a real observation about the census, not a miss.
 */
function matchesDependencySignal(
  signal: Extract<DetectSignal, { kind: "dependency" }>,
  ecosystem: string,
  name: string,
): boolean {
  if (signal.name !== name) return false;
  // A declared ecosystem of `any` opts out of the ecosystem check
  // entirely, for ecosystems where the same distribution name is
  // genuinely cross-ecosystem.
  return signal.ecosystem === "any" || signal.ecosystem === ecosystem;
}

/** The census entry a dependency observation belongs to, or `null`. */
export function matchDependencyEntry(
  census: Census,
  ecosystem: string,
  name: string,
): string | null {
  for (const entry of census.entries) {
    for (const signal of entry.signals) {
      if (signal.kind !== "dependency") continue;
      if (matchesDependencySignal(signal, ecosystem, name)) return entry.id;
    }
  }
  return null;
}

/**
 * Dependency observations are matched by package name, with a
 * cross-ecosystem fallback. See `matchesDependencySignal` for why the
 * ecosystem is not part of the key.
 */
function matchDependencyObservation(
  census: Census,
  observation: DiscoveryObservation,
): string | null {
  if (!observation.via.startsWith("dep:")) return null;
  const [, ecosystem = "", name = ""] = observation.via.split(":");
  return matchDependencyEntry(census, ecosystem, name);
}

function signalKey(signal: DetectSignal): string {
  switch (signal.kind) {
    case "manifest-file":
      return `manifest-file:${signal.path}`;
    case "config-file":
      return `config-file:${signal.path}`;
    case "workflow-dir":
      return `workflow-dir:${signal.path}`;
    case "dependency":
      return `dependency:${signal.ecosystem}:${signal.name}`;
    case "extension":
      return `extension:${signal.glob}`;
    case "script-command":
      return `script-command:${signal.ecosystem}:${signal.command}`;
  }
}

/**
 * The lookup key for an observation.
 *
 * `via` is the observation's own wire form: dependency and command
 * observations are namespaced (`dep:npm:vitest`, `cmd:npm:test`) so an
 * ecosystem is recoverable, while every file-shaped observation is
 * **already** prefixed by the probe (`manifest-file:Jenkinsfile`).
 *
 * Re-prefixing a file-shaped `via` is a bug this function used to have,
 * and it was a silent one: no file-based census signal could ever match,
 * so `.gitlab-ci.yml`, `Jenkinsfile`, `azure-pipelines.yml`, `bruno.json`
 * and every other declared file signal were undetectable. A discovery
 * miss that looks like "nothing is out there" is the worst kind.
 */
/**
 * The lookup key for an observation.
 *
 * `via` is the observation's wire form. Dependency and command observations
 * are namespaced (`dep:npm:vitest`, `cmd:npm:test`) so an ecosystem is
 * recoverable; every file-shaped observation is **already** prefixed by
 * the probe (`manifest-file:Jenkinsfile`).
 *
 * Re-prefixing a file-shaped `via` is a bug this function used to have, and
 * it was a silent one: no file-based census signal could ever match, so
 * `.gitlab-ci.yml`, `Jenkinsfile`, `azure-pipelines.yml`, `bruno.json`,
 * `k6.config.js` and every other declared file signal were undetectable. A
 * discovery miss that looks like "nothing is out there" is the worst kind,
 * because it reads as a clean result.
 */
function signalKeyForObservation(observation: DiscoveryObservation): string {
  const via = observation.via;
  if (via.startsWith("dep:")) {
    const [, ecosystem = "", name = ""] = via.split(":");
    return `dependency:${ecosystem}:${name}`;
  }
  if (via.startsWith("cmd:")) {
    const [, ecosystem = "", command = ""] = via.split(":");
    return `script-command:${ecosystem}:${command}`;
  }
  // Already in wire form: the probe emits `manifest-file:<path>`,
  // `config-file:<path>` and `workflow-dir:<path>`, and the census declares
  // signals in exactly those forms.
  // An anchored alternation of five fixed prefixes: linear, and the
  // `^` anchor means the engine cannot restart.
  if (
    /^(?:manifest-file|config-file|workflow-dir|extension|script-command):/.test(
      via,
    )
  ) {
    return via;
  }
  // A bare path from a hand-written observation: treat it as a manifest.
  return `manifest-file:${via}`;
}

// ─── Gap generator (ADR 0010 rule 2) ─────────────────────────────────

export interface GapBacklogItem {
  name: string;
  category: CensusCategory | "UNCLASSIFIED";
  /** Repositories in which the tool was seen. */
  repos: number;
  /** Total observations. */
  observations: number;
  /** Axes that would be blocked without support. */
  blocksAxes: readonly string[];
  /** The census entry this belongs to, or `null` when unrecognized. */
  censusId: string | null;
  priority: "P0" | "P1" | "P2";
}

export interface UnrecognizedDisposition {
  name: string;
  /** The recorded decision for an unrecognized tool. */
  disposition:
    | "PENDING_ADJUDICATION"
    | "ACCEPTED_AS_TARGET"
    | "NOT_APPLICABLE"
    | "ALIASED_TO_CENSUS_ENTRY";
  note: string;
  owner: Owner;
}

/**
 * Per-repository finding sets: recognized + `UNRECOGNIZED` only, with the
 * ordinary application dependencies removed. The backlog is built from
 * these, so `react` can never outrank a QA tool on field frequency.
 */
export function buildClassifiedResults(
  census: Census,
  results: readonly DiscoveryResult[],
): DiscoveryResult[] {
  return results.map((result) => {
    const { recognized, unrecognized } = classifyObservations(
      census,
      result.observations,
    );
    return {
      repo: result.repo,
      observations: [...recognized, ...unrecognized],
    };
  });
}

/**
 * Rank the backlog by **field frequency** (ADR 0010 rule 2): a tool seen
 * in more repositories outranks a tool nobody has encountered, regardless
 * of how interesting it is. This is the mechanism that stops the roadmap
 * being prioritised by enthusiasm.
 *
 * Feed it `buildClassifiedResults(...)` output, not raw probe output.
 */
export function buildGapBacklog(
  results: readonly DiscoveryResult[],
  _dispositions: readonly UnrecognizedDisposition[] = [],
): GapBacklogItem[] {
  const counts = new Map<
    string,
    {
      name: string;
      category: CensusCategory | "UNCLASSIFIED";
      repos: Set<string>;
      observations: number;
      censusId: string | null;
    }
  >();
  for (const result of results) {
    for (const observation of result.observations) {
      const key = observation.censusId ?? `unrecognized:${observation.name}`;
      const existing = counts.get(key) ?? {
        name: observation.name,
        category: observation.category,
        repos: new Set<string>(),
        observations: 0,
        censusId: observation.censusId,
      };
      existing.repos.add(result.repo);
      existing.observations += 1;
      counts.set(key, existing);
    }
  }
  const items: GapBacklogItem[] = [...counts.values()].map((entry) => {
    const repos = entry.repos.size;
    return {
      name: entry.name,
      category: entry.category,
      repos,
      observations: entry.observations,
      blocksAxes: [],
      censusId: entry.censusId,
      priority: repos >= 3 ? "P0" : repos >= 2 ? "P1" : "P2",
    };
  });
  return items.sort(
    (a, b) => b.repos - a.repos || a.name.localeCompare(b.name),
  );
}

export { DAY_ONE_SEED };
