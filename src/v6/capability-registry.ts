/**

}

/**
 * The unified capability registry (ADR 0007) — Wave 1.
 *
 * **One registry, never a parallel one.** Before this module the
 * repository held six capability-adjacent primitives (framework
 * inventory, provider capability contract, universal pack contract, rule
 * registry census, the 136-cell support matrix, `src/capabilities.ts`), and
 * none of them agreed with the others. That is the drift Law 8 exists to
 * prevent, and it is why a hand-maintained support list is a documentation
 * defect *by construction* rather than by negligence.
 *
 * This module is the **loader**. It reads from the existing primitives and
 * assembles one entry per capability. It deliberately does not:
 *
 *  - re-declare any framework, provider, language or rule list;
 *  - contain a `setMaturity` export (maturity is derived — ADR 0001);
 *  - let a consumer hand-write a claim (every claim resolves to a
 *    `ProofRef`, and `claim-registry` is the only place a claim lives).
 *
 * A **capability id is not a rule id.** Capability ids live in this
 * namespace and *reference* `QA-*` ids, which are frozen forever
 * (ADR 0003). A capability is a claim about coverage; a rule is a
 * detector. Collapsing them would forbid the one-capability-several-rules
 * case that already exists.
 *
 * The 136-cell support matrix becomes a **projection** of this registry
 * rather than a second truth (§2.3), which is what makes a matrix cell
 * impossible to disagree with a capability entry.
 */

import { compareCodePoints } from "../lib/compare.js";
import { RULES, RETIRED_RULE_IDS } from "../rules/index.js";
import { hasValidMeasurement } from "../rules/measurement.js";
import { ruleHasCompleteQuad } from "./fixture-quad-probe.js";
import { FRAMEWORK_INVENTORY } from "../frameworks/framework-inventory.js";
import { CI_PROVIDER_IDS } from "../frameworks/provider-capability-contract.js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildRepoEvidenceIndex,
  createEvidenceResolver,
} from "./ecosystem-probe.js";
import {
  isMaturity,
  maturityRank,
  nextLevelGapFromEvidence,
  type Maturity,
  type MaturityEvidence,
} from "./maturity.js";
import type { NextLevelGap, Owner, ProofRef } from "./capability-types.js";
import { isRecord } from "../lib/safe-json.js";

// ─── Identity ────────────────────────────────────────────────────────

/**
 * Capability ids are lower-dot-separated and are NOT rule ids. The
 * distinction is load-bearing: a rule id is immutable history, a
 * capability id is a current claim about coverage, and a renderer that
 * conflates them will eventually print a capability claim with a rule
 * id's authority.
 */
export const CAPABILITY_ID_PATTERN =
  // eslint-disable-next-line security/detect-unsafe-regex
  /^[a-z][a-z0-9]*(?:\.[a-z0-9-]+)*$/;

export function isCapabilityId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    CAPABILITY_ID_PATTERN.test(value) &&
    !/^QA-/.test(value)
  );
}

export function isRuleId(value: unknown): value is string {
  return typeof value === "string" && /^QA-[A-Z]+-\d+$/.test(value);
}

// ─── Registry vocabulary ─────────────────────────────────────────────

/**
 * What kind of claim a capability entry makes. The kind determines which
 * evidence the resolver may cite, which is what stops a language
 * capability from being backed by a rule measurement.
 */
export const CAPABILITY_KINDS = [
  "test-framework",
  "test-runner",
  "bdd-spec-dsl",
  "language",
  "ci-cd-provider",
  "iac-container",
  "domain",
  "policy",
  "surface",
] as const;

export type CapabilityKind = (typeof CAPABILITY_KINDS)[number];

export interface CapabilityEntry {
  /** `test.framework.playwright` — never a `QA-*` id. */
  id: string;
  name: string;
  kind: CapabilityKind;
  owner: Owner;
  /** The `QA-*` ids this capability is evidenced by. May be empty. */
  rules: readonly string[];
  /** The census entry this projects, when it has one. */
  censusId: string | null;
  /** The framework-inventory row it projects, when it has one. */
  frameworkId: string | null;
  /** Domains it contributes to. */
  domains: readonly string[];
  /**
   * The level this entry's **own** evidence supports, stamped at build
   * time.
   *
   * Stamping it rather than re-deriving it at check time is what makes the
   * committed registry document **self-verifying**: `registry:check` can
   * read `docs/capability-registry.json` and decide whether any entry
   * over-claims, without the filesystem. A validator that had to re-run
   * the resolver to check the artifact would be checking its own
   * environment, not the claim.
   */
  proven: Maturity;
  maturity: Maturity;
  nextLevelGap: NextLevelGap | null;
  proof: ProofRef;
  /** Axes this capability blocks when absent. */
  blocksAxes: readonly string[];
  /**
   * Observed upstream major, when detectable. Recorded rather than
   * inferred, because a staleness verdict that guesses is worse than no
   * staleness verdict at all.
   */
  observedUpstreamMajor: string | null;
  /** The adapter that IMPLEMENTS this capability, when one exists. */
  adapter: string | null;
  /**
   * Language adapters used to EXECUTE this framework's tests, from the
   * inventory.
   *
   * Recorded separately from `adapter` and on purpose: an entry that carried
   * only the executor list read as though the framework were supported by
   * them, which is how `test.framework.selenium` reached M2 on a TypeScript
   * adapter. Having its own field is what lets the distinction be stated
   * rather than assumed.
   */
  executorAdapters?: readonly string[];
  /**
   * The support matrix's own disposition, for entries sourced from it.
   * `null` for capabilities the matrix does not describe. A `BLOCKED`
   * domain is not merely `M1 DECLARED` — it is declared AND known to be
   * blocked, and the reason has to travel with the claim or the row reads
   * as "planned" rather than "refused".
   */
  declaredDisposition?: string | null;
  /** Why the axis is blocked, when it is. */
  blockedReason?: string | null;
  /** What re-opens the question, when the ledger names it. */
  revisitTrigger?: string | null;
}

export interface CapabilityRegistry {
  schemaVersion: 1;
  registryId: "mjolnir-capability-registry";
  observedAt: string;
  entries: readonly CapabilityEntry[];
}

// ─── Evidence resolution ─────────────────────────────────────────────

/**
 * What the machine can actually see. Every capability's maturity comes
 * from this, and nothing else — which is the "no manual promotion" rule
 * made mechanical (ADR 0001).
 */
export interface CapabilityEvidence {
  /** A live rule in the registry supports this capability. */
  hasLiveRule: boolean;
  /** At least one supporting rule has a valid (non-stale) measurement. */
  hasMeasurement: boolean;
  /** An adapter module exists on disk. */
  hasAdapter: boolean;
  /** A fixture quad exists for at least one supporting rule. */
  hasFixtureQuad: boolean;
  /** A corpus measurement covers the supporting rules at a matching detectorRev. */
  hasCorpusMeasurement: boolean;
  /** Independent field evidence exists. Never true without REMOTE_PROVEN. */
  hasFieldEvidence: boolean;
}

export const BLIND_EVIDENCE: CapabilityEvidence = {
  hasLiveRule: false,
  hasMeasurement: false,
  hasAdapter: false,
  hasFixtureQuad: false,
  hasCorpusMeasurement: false,
  hasFieldEvidence: false,
};

export function toMaturityEvidence(e: CapabilityEvidence): MaturityEvidence {
  return {
    declared: true,
    implemented: e.hasLiveRule || e.hasAdapter,
    unitTested: e.hasLiveRule,
    fixtureQuadVerified: e.hasFixtureQuad,
    corpusVerified: e.hasCorpusMeasurement,
    fieldProven: e.hasFieldEvidence,
  };
}

/**
 * The filesystem-observed half of the evidence. Split from the
 * registry-derived half so the resolver is testable against a synthetic
 * tree rather than requiring a checkout.
 */
export interface CapabilityFileProbe {
  adapterExists(relPath: string): boolean;
  fixtureQuadExists(ruleId: string): boolean;
  observedUpstreamMajor(frameworkId: string): string | null;
}

export const BLIND_FILE_PROBE: CapabilityFileProbe = {
  adapterExists: () => false,
  fixtureQuadExists: () => false,
  observedUpstreamMajor: () => null,
};

export interface RegistryEvidence {
  registry: CapabilityEvidence;
  files: CapabilityFileProbe;
}

export const BLIND_REGISTRY_EVIDENCE: RegistryEvidence = {
  registry: BLIND_EVIDENCE,
  files: BLIND_FILE_PROBE,
};

// ─── Rule-family facts, computed once ────────────────────────────────

export function ruleFamily(ruleId: string): string {
  const parts = ruleId.split("-");
  return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : ruleId;
}

export interface RuleFacts {
  liveByFamily: ReadonlyMap<string, readonly string[]>;
  /** Measured rule ids — what a single entry resolves against. */
  measured: ReadonlySet<string>;
  /** Ids that no longer exist, so an entry naming one is not credited. */
  retired: ReadonlySet<string>;
}

export function collectRuleFacts(): RuleFacts {
  const group = (ids: readonly string[]): Map<string, string[]> => {
    const map = new Map<string, string[]>();
    for (const id of ids) {
      const family = ruleFamily(id);
      const bucket = map.get(family) ?? [];
      bucket.push(id);
      map.set(family, bucket);
    }
    return map;
  };
  const live = RULES.map((rule) => rule.id);
  const measured = RULES.filter((rule) => hasValidMeasurement(rule)).map(
    (rule) => rule.id,
  );
  return {
    liveByFamily: group(live),
    measured: new Set(measured),
    retired: new Set(RETIRED_RULE_IDS),
  };
}

// ─── Framework → capability-id mapping ───────────────────────────────

/**
 * The framework-inventory id becomes a capability id in the
 * `test.framework.*` / `test.runner.*` namespace. The mapping is a pure
 * function of the inventory row, so a framework added to the inventory
 * appears in the registry without anybody typing its name a second time.
 */
export function frameworkCapabilityId(frameworkId: string): string {
  const slug = frameworkId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `test.framework.${slug}`;
}

export function providerCapabilityId(provider: string): string {
  return `ci.provider.${provider
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;
}

export function domainCapabilityId(domainId: string): string {
  return `qa.domain.${domainId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;
}

// ─── Assembly ────────────────────────────────────────────────────────

/**
 * The evidence for ONE entry, not the registry's.
 *
 * `RegistryEvidence.registry` carries `hasLiveRule` and `hasMeasurement` as
 * single booleans, and every entry was OR-ed against them — so one measured
 * rule anywhere in the registry made `hasMeasurement` true for every
 * capability in it. `ci.provider.azure-pipelines` sat at M2 with
 * `hasAdapter` from its own file and `hasMeasurement` from an unrelated
 * Java rule, which is the wave-1 "no capability advertised above proven level"
 * failure arriving through the evidence layer instead of the maturity layer.
 *
 * Resolved per entry, against that entry's OWN rules:
 *
 *   - `hasLiveRule` — `base.rules` names at least one live id.
 *   - `hasMeasurement` — at least one id in `base.rules` has a valid
 *     measurement, using the same `hasValidMeasurement` predicate the doctor's
 *     census and the tier ratchets use, so "measured" means one thing.
 *
 * The caller-supplied flags are still honoured, because a caller that KNOWS
 * something the tree does not (a test injecting an adapter, a build with
 * evidence from elsewhere) must be able to say so. The OR is the caller's
 * claim, not a global truth leaking into an entry it does not describe.
 */
function evidenceForEntry(
  base: { rules: readonly string[] },
  evidence: RegistryEvidence,
  facts: RuleFacts,
): RegistryEvidence {
  const own = base.rules.filter((id) => !facts.retired.has(id));
  return {
    registry: {
      ...evidence.registry,
      hasLiveRule: evidence.registry.hasLiveRule || own.length > 0,
      hasMeasurement:
        evidence.registry.hasMeasurement ||
        own.some((id) => facts.measured.has(id)),
    },
    files: evidence.files,
  };
}

function finalize(
  base: Omit<CapabilityEntry, "maturity" | "proven" | "nextLevelGap" | "proof">,
  evidence: RegistryEvidence,
  observedAt: string,
  facts: RuleFacts = collectRuleFacts(),
  census: ReadonlyMap<string, DeclaredCensusClaim> = new Map(),
): CapabilityEntry {
  const perEntry = evidenceForEntry(base, evidence, facts);
  const maturityEvidence = toMaturityEvidence(perEntry.registry);
  const { maturity: proven, nextLevelGap } = nextLevelGapFromEvidence(
    maturityEvidence,
    base.owner,
    `capability ${base.id} gains evidence for its next level`,
  );
  // `maturity` is the level a consumer would ADVERTISE; `proven` is the level
  // this registry's own evidence supports. They come from two different
  // resolvers on purpose — see `readCensusClaims` — and the gap between them
  // is what `OVER_CLAIMED_MATURITY` exists to see.
  //
  // With no census row there is nothing separate to advertise, so the entry
  // advertises what it proved. Defaulting the other way — to M1 — would
  // under-claim every entry whose census has not been generated, which is a
  // false negative in the other direction.
  // Validated where the value is USED, not only where it is read.
  // `readCensusClaims` already filters, but the census map is also a
  // parameter: a caller can inject a claim carrying a level from another
  // vocabulary — `F4` is the framework support ladder, and ADR 0011 declares
  // the two orthogonal. Importing one through the other is the axis violation
  // `findAxisViolations` exists to catch, so it is refused at the boundary
  // rather than trusted because the TypeScript type says it should be fine.
  const claim = census.get(censusIdFor(base.id));
  const maturity =
    claim !== undefined && isMaturity(claim.maturity) ? claim.maturity : proven;
  return {
    ...base,
    proven,
    maturity,
    nextLevelGap,
    proof: proofFor(base, proven, perEntry, observedAt, facts),
  };
}

/**
 * The proof pointer.
 *
 * **Only a measured rule can carry `LOCAL_PROVEN`.** An adapter file on
 * disk proves the capability is *implemented*, which is M2, but it is not
 * an observation: nobody recorded when it was checked, against which
 * revision, with what result. Promoting it to `LOCAL_PROVEN` would be the
 * precise failure the wave-1 DoD forbids — "no capability advertised
 * above proven level" — and it is why the honest answer for most entries
 * today is `BLOCKED`.
 *
 * That `BLOCKED` is not a gap in this module. It is the measurement that
 * Wave 4 produces: a per-capability `detectorRev` binding with a recorded
 * observation date. Until then, every claim being unbound is the truth
 * (`GAP-V6-006`), and `claim-registry.json` shows exactly that.
 */
function proofFor(
  base: Omit<CapabilityEntry, "maturity" | "proven" | "nextLevelGap" | "proof">,
  maturity: Maturity,
  evidence: RegistryEvidence,
  observedAt: string,
  facts: RuleFacts,
): ProofRef {
  if (maturityRank(maturity) >= maturityRank("M2_IMPLEMENTED")) {
    const measured = evidence.registry.hasMeasurement
      ? base.rules.find((rule) => !facts.retired.has(rule))
      : undefined;
    if (measured !== undefined && observedAt !== "") {
      return {
        status: "LOCAL_PROVEN",
        artifact: `docs/FP-AUDIT.md#${measured}`,
        digest: null,
        observedAt,
        authority: base.owner,
      };
    }
  }
  return {
    status: "BLOCKED",
    artifact: null,
    digest: null,
    observedAt: null,
    authority: "NONE",
  };
}

/**
 * The census's per-ecosystem claim, keyed by census id.
 *
 * This is the DECLARED half of `maturity`. The census derives it through its
 * own evidence resolver (`src/v6/ecosystem-probe.ts`); the registry derives
 * `proven` through its own (`CapabilityFileProbe` plus the per-entry rule
 * facts). Two resolvers, two answers — and the gate between them is
 * `OVER_CLAIMED_MATURITY`, which is what holds the two to agreeing.
 *
 * Before the split, `finalize` assigned `proven: maturity` from one call, so
 * the gate compared a value with itself and could not fire. That is the
 * defect: a check that has never fired is a comment.
 *
 * A malformed or absent census yields an empty map, not a throw, for the
 * reason every other artifact reader in this file gives one: the caller
 * renders INCONCLUSIVE, and a gate that crashes tells a reader less than one
 * that names the file.
 */
function readCensusClaims(
  root: string,
): ReadonlyMap<string, DeclaredCensusClaim> {
  const out = new Map<string, DeclaredCensusClaim>();
  let entries: unknown;
  try {
    const parsed = JSON.parse(
      readFileSync(join(root, "docs", "ECOSYSTEM-CENSUS.json"), "utf8"),
    ) as { entries?: unknown };
    entries = parsed.entries;
  } catch {
    return out;
  }
  if (!Array.isArray(entries)) return out;
  for (const raw of entries) {
    if (!isRecord(raw)) continue;
    const { id, state, maturity } = raw;
    if (typeof id !== "string") continue;
    if (typeof state !== "string") continue;
    if (!isMaturity(maturity)) continue;
    out.set(id, { id, state, maturity });
  }
  return out;
}

/**
 * `test.framework.playwright` → `ec.test-framework.playwright`, and
 * `ci.provider.github-actions` → `ec.ci-cd-provider.github-actions`.
 *
 * A pure function of the id, so the join between the two registries cannot rot
 * into a second hand-maintained mapping. Every registry id is
 * `<namespace>.<facet>.<slug>`, and the census names the same ecosystems as
 * `ec.<category>.<slug>` — so the FACET is dropped and the category comes from
 * a closed table keyed by namespace. A head outside the table yields the id
 * unprefixed, which matches no census row and therefore leaves the entry
 * advertising what it proved rather than guessing a category.
 */
const CENSUS_CATEGORY_BY_NAMESPACE: Readonly<Record<string, string>> = {
  test: "test-framework",
  ci: "ci-cd-provider",
};

function censusIdFor(capabilityId: string): string {
  const parts = capabilityId.split(".");
  const category =
    parts[0] === undefined ? undefined : CENSUS_CATEGORY_BY_NAMESPACE[parts[0]];
  if (category === undefined) return capabilityId;
  return `ec.${category}.${parts.slice(2).join(".")}`;
}

export interface BuildRegistryOptions {
  evidence?: RegistryEvidence;
  observedAt?: string;
  /** The checkout the domain cells are read from. */
  root?: string;
  /**
   * The ecosystem census, for the DECLARED half of each entry's level.
   *
   * Read from `docs/ECOSYSTEM-CENSUS.json` by default. A caller with no
   * census — a test, or a build before the census has run — gets an empty map,
   * which leaves every entry's declared level equal to its proven level rather
   * than defaulting either way.
   */
  census?: ReadonlyMap<string, DeclaredCensusClaim>;
}

/** What the census CLAIMS about one ecosystem, in the M vocabulary. */
export interface DeclaredCensusClaim {
  id: string;
  state: string;
  maturity: Maturity;
}

/**
 * Build the registry. The result is a function of the checkout plus the
 * supplied evidence, and of nothing else — which is what makes
 * `docs/capability-registry.json` byte-stable for a commit.
 */
export function buildCapabilityRegistry(
  options: BuildRegistryOptions = {},
): CapabilityRegistry {
  const root = options.root ?? process.cwd();
  const evidence = options.evidence ?? BLIND_REGISTRY_EVIDENCE;
  const observedAt = options.observedAt ?? "1970-01-01";
  const facts = collectRuleFacts();
  const census = options.census ?? readCensusClaims(root);
  const byId = new Map<string, CapabilityEntry>();

  // 1. Frameworks. The single largest source, and the one that used to be
  //    a hand-maintained list in the README.
  for (const framework of FRAMEWORK_INVENTORY) {
    if (framework.entityType === "CI_PROVIDER") continue;
    const id = frameworkCapabilityId(framework.frameworkId);
    const family = familyForFramework(framework.frameworkId);
    const live = facts.liveByFamily.get(family) ?? [];
    // The adapter that IMPLEMENTS this capability, which is a different
    // question from the one the inventory answers.
    //
    // `executorAdapterIds` is the list of LANGUAGE adapters used to run this
    // framework's tests — Selenium names `["typescript", "python", "java"]`.
    // The first version read `executorAdapterIds[0]` as the framework's own
    // adapter, so `test.framework.selenium` claimed `src/adapters/typescript.ts`
    // and reached M2 on a TypeScript adapter. An adapter for one ecosystem is
    // not evidence of support for another; that is the same laundering the
    // registry-global evidence flags were, one indirection further out.
    //
    // So `adapter` now means "an adapter whose implementation target IS this
    // framework", probed by name. Today no framework has one — the adapters
    // in `src/adapters/` are language adapters — and every framework
    // capability rests on its own rules instead, which is the honest state.
    // `executorAdapters` keeps the inventory's answer as a fact about the
    // framework, without letting it stand in for support.
    const ownAdapter = `src/adapters/${framework.frameworkId.toLowerCase()}.ts`;
    const adapter = evidence.files.adapterExists(ownAdapter)
      ? ownAdapter
      : null;
    byId.set(
      id,
      finalize(
        {
          id,
          name: framework.frameworkId,
          kind: kindForFramework(framework.entityType),
          owner: "framework-inventory",
          rules: live,
          censusId: censusIdFor(id),
          frameworkId: framework.frameworkId,
          domains: [],
          blocksAxes: ["Discovery"],
          observedUpstreamMajor: evidence.files.observedUpstreamMajor(
            framework.frameworkId,
          ),
          adapter,
          executorAdapters: framework.executorAdapterIds.map(
            (slug) => `src/adapters/${slug}.ts`,
          ),
        },
        {
          registry: {
            ...evidence.registry,
            // Both arms are per-entry observations this builder makes about
            // the entry it is building, not global facts.
            //
            // `hasAdapter` asks the file probe whether the path RESOLVES, and
            // `adapter` above is that probe's answer — so the two cannot
            // disagree, which is the point of asking once. The CI-provider
            // branch below does the same thing with the same probe; before this
            // the framework branch used `adapter !== null` against an adapter
            // path derived from `executorAdapterIds[0]`, which is a LANGUAGE
            // adapter, and that is how `test.framework.selenium` reached M2 on
            // `src/adapters/typescript.ts`.
            hasAdapter: evidence.registry.hasAdapter || adapter !== null,
            hasFixtureQuad:
              evidence.registry.hasFixtureQuad ||
              live.some((rule) => evidence.files.fixtureQuadExists(rule)),
          },
          files: evidence.files,
        },
        observedAt,
        facts,
        census,
      ),
    );
  }

  // 2. CI providers. Declared from the provider contract, which is the
  //    existing primitive; no second list.
  for (const provider of CI_PROVIDER_IDS) {
    const id = providerCapabilityId(provider);
    if (byId.has(id)) continue;
    const family = "QA-CI";
    const live = facts.liveByFamily.get(family) ?? [];
    const adapter = `src/adapters/${provider
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}.ts`;
    byId.set(
      id,
      finalize(
        {
          id,
          name: provider,
          kind: "ci-cd-provider",
          owner: "provider-capability-contract",
          rules: live,
          censusId: censusIdFor(id),
          frameworkId: null,
          domains: ["ci-integrity"],
          blocksAxes: ["CI Integrity", "False-Green Detection"],
          observedUpstreamMajor: null,
          adapter,
        },
        {
          registry: {
            ...evidence.registry,
            hasAdapter:
              evidence.registry.hasAdapter ||
              evidence.files.adapterExists(adapter),
            hasFixtureQuad:
              evidence.registry.hasFixtureQuad ||
              live.some((rule) => evidence.files.fixtureQuadExists(rule)),
          },
          files: evidence.files,
        },
        observedAt,
        facts,
        census,
      ),
    );
  }

  // 3. Domains, read from the **support matrix** rather than from
  //    `src/qa/domain-model.ts`.
  //
  //    Two reasons, and the second is the decisive one. First, the matrix
  //    is the ledger of record and `m26:integrity` gates it, so a domain
  //    claim sourced from it is already checked. Second — and this is the
  //    one that matters — `src/qa/domain-model.ts` is classified
  //    `CONTRACT_ONLY` in `docs/COVERAGE-EXEMPTIONS.json` with a removal
  //    plan to retire it. Importing it here would give a file declared to
  //    have no production importer a production importer, and would couple
  //    the registry to a module scheduled for deletion. The matrix also
  //    carries the disposition, the blocked reason and the revisit trigger,
  //    so the entry is richer than an id ever was.
  for (const domain of readDomainCells(root)) {
    const id = domainCapabilityId(domain.id);
    if (byId.has(id)) continue;
    byId.set(
      id,
      finalize(
        {
          id,
          name: domain.label,
          kind: "domain",
          owner: domain.owner,
          rules: [],
          censusId: censusIdFor(id),
          frameworkId: null,
          domains: [domain.id],
          blocksAxes: ["Domain Coverage"],
          observedUpstreamMajor: null,
          adapter: null,
          // The matrix's own disposition is the axis's honest state. A
          // BLOCKED domain is not M1 "declared" — it is declared AND known
          // to be blocked, and the reason travels with it.
          declaredDisposition: domain.disposition,
          blockedReason: domain.blockedReason,
          revisitTrigger: domain.revisitTrigger,
        },
        { registry: BLIND_EVIDENCE, files: evidence.files },
        observedAt,
        facts,
        census,
      ),
    );
  }

  return {
    schemaVersion: 1,
    registryId: "mjolnir-capability-registry",
    observedAt,
    entries: [...byId.values()].sort((a, b) => compareCodePoints(a.id, b.id)),
  };
}

const FRAMEWORK_FAMILY: Readonly<Record<string, string>> = {
  playwright: "QA-PW",
  cypress: "QA-CYP",
  selenium: "QA-SEL",
  jest: "QA-JV",
  vitest: "QA-JV",
  mocha: "QA-JV",
  jasmine: "QA-JV",
  pytest: "QA-PY",
  typescript: "QA-TEST",
  "github-actions": "QA-CI",
  "azure-pipelines": "QA-CI",
  jenkins: "QA-CI",
  "gitlab-ci": "QA-CI",
};

/** The rule family a framework's capability is evidenced by. */
export function familyForFramework(frameworkId: string): string {
  return FRAMEWORK_FAMILY[frameworkId] ?? "QA-TEST";
}

function kindForFramework(entityType: string): CapabilityKind {
  switch (entityType) {
    case "E2E_FRAMEWORK":
      return "test-framework";
    case "AUTOMATION_LIBRARY":
      return "test-runner";
    default:
      return "test-framework";
  }
}

// ─── Domain cells, read from the support matrix ─────────────────────

export interface DomainCell {
  /** `REQUIREMENTS`, from `MATRIX-DOMAIN-REQUIREMENTS`. */
  id: string;
  label: string;
  disposition: string;
  owner: string;
  blockedReason: string | null;
  revisitTrigger: string | null;
}

/**
 * Read the `MATRIX-DOMAIN-*` cells from the support matrix.
 *
 * Returns an empty list when the matrix is absent rather than throwing: a
 * missing ledger means "no domain claims are derivable", which is a gap the
 * gate reports — not a crash in the middle of building a registry.
 */
export function readDomainCells(root: string = process.cwd()): DomainCell[] {
  const path = join(root, "docs", "M26-SUPPORT-MATRIX.json");
  if (!existsSync(path)) return [];
  let cells: Array<Record<string, unknown>>;
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as {
      cells?: Array<Record<string, unknown>>;
    };
    cells = raw.cells ?? [];
  } catch {
    return [];
  }
  const out: DomainCell[] = [];
  for (const cell of cells) {
    const cellId = typeof cell.cell_id === "string" ? cell.cell_id : "";
    if (!cellId.startsWith("MATRIX-DOMAIN-")) continue;
    const id = cellId.slice("MATRIX-DOMAIN-".length);
    if (id === "") continue;
    out.push({
      id,
      label: typeof cell.cell === "string" ? cell.cell : id,
      disposition:
        typeof cell.disposition === "string" ? cell.disposition : "UNKNOWN",
      owner: typeof cell.owner === "string" ? cell.owner : "unowned",
      blockedReason:
        typeof cell.blocked_reason === "string" ? cell.blocked_reason : null,
      revisitTrigger:
        typeof cell.revisit_trigger === "string" ? cell.revisit_trigger : null,
    });
  }
  return out.sort((a, b) => compareCodePoints(a.id, b.id));
}

// ─── The checkout's own evidence ─────────────────────────────────────

/**
 * Evidence resolved against the real working tree.
 *
 * `hasLiveRule` and `hasMeasurement` come from the **rule registry**, not
 * from the filesystem, and they are read here rather than inside the
 * builder so that a test can inject an evidence object and have it mean
 * something. That matters: an earlier version of the builder read the
 * rule facts itself and only honoured the *capability-level* arms from its
 * caller, so a test that injected "no measurement" still saw
 * `LOCAL_PROVEN`. An evidence seam that silently ignores half of itself is
 * not a seam.
 *
 * The `hasCorpusMeasurement` arm is **always false** here, because nothing
 * binds a *capability* to a locked `detectorRev` yet — that is Wave 4's
 * `rules:quality:check`. A capability claiming M4 on the strength of a
 * per-rule measurement is exactly the false proof ADR 0001 forbids, so
 * M3/M4 stay unreachable until the per-capability gate exists.
 */
export function realCapabilityEvidence(): RegistryEvidence {
  const probe = createEvidenceResolver(
    buildRepoEvidenceIndex(process.cwd()),
    process.cwd(),
  );
  return {
    registry: {
      // `hasLiveRule` and `hasMeasurement` are FALSE here, and that is the
      // point rather than an oversight.
      //
      // There is no registry-wide fact of either kind. "A live rule supports
      // this capability" is only meaningful per entry — the question is
      // whether a live rule supports THIS capability, and the answer differs
      // per row. The real resolver used to answer it once for the whole
      // registry (`live.size > 0`, `measured.size > 0`), which meant every
      // entry inherited the answer: `test.framework.selenium`, with no
      // supporting rule and no adapter file, was M2 because 79 other rules
      // existed. `evidenceForEntry` now derives both per entry; the flags
      // remain in the interface because a caller that KNOWS something the
      // tree cannot show must still be able to say so, and they are OR-ed
      // rather than read.
      hasLiveRule: false,
      hasMeasurement: false,
      hasAdapter: false,
      // FALSE, and it stays false.
      //
      // The global flags are a CALLER CLAIM, OR-ed on top of the per-entry
      // derivation — not a summary of it. Making this one "measured" was
      // tried and it reintroduces exactly the laundering `evidenceForEntry`
      // was written to remove: every entry OR-s it in, so
      // `ci.provider.azure-pipelines` reached M3 on a quad belonging to a
      // QA-PW rule, and the published `rules` list did not contain the rule
      // that earned it.
      //
      // A caller that KNOWS something the tree cannot show must be able to say
      // so. The real resolver knows nothing the tree does not, so it claims
      // nothing and lets `live.some(quad)` answer per entry.
      hasFixtureQuad: false,
      hasCorpusMeasurement: false,
      hasFieldEvidence: false,
    },
    files: {
      // A PATH is handed in, so the honest answer is whether the path
      // resolves. It used to be delegated to the census resolver, which
      // answers a different question — "can we analyse this ecosystem at
      // all", satisfied by a live rule family OR an adapter file — and that
      // fallback is why `test.framework.selenium` reported
      // `src/adapters/selenium.ts` as present: `SLUG_TO_FAMILY.selenium` is
      // `QA-SEL`, that family has rules, and the file was never consulted.
      // The census resolver keeps its own (correct) meaning for the census;
      // a path-shaped question gets a path-shaped answer.
      adapterExists: (relPath) => existsSync(join(process.cwd(), relPath)),
      // The ONE quad answer, shared with the census. It used to be
      // `fixtureQuadExists()` — a function whose body was `return false`, with
      // a comment saying a real gate ships in Wave 4. A hardcoded `false` is
      // indistinguishable from a measured one at the call site, and the census
      // had its own separate answer, so the two were free to disagree about
      // the same capability. Both now read the filesystem; see
      // `src/v6/fixture-quad-probe.ts`.
      fixtureQuadExists: (ruleId) => ruleHasCompleteQuad(ruleId),
      observedUpstreamMajor: (frameworkId) =>
        probe.observedUpstreamMajor(adapterProbeEntry(frameworkId)),
    },
  };
}

function adapterProbeEntry(
  slug: string,
): Parameters<ReturnType<typeof createEvidenceResolver>["adapterExists"]>[0] {
  return {
    id: `ec.test-framework.${slug}`,
    name: slug,
    category: "test-framework",
    state: "SUPPORTED",
    owner: "capability-registry",
    observedAt: "1970-01-01",
    signals: [],
    adapter: `src/adapters/${slug}.ts`,
    blocksAxes: [],
    successor: null,
    removalDate: null,
    notApplicableReason: null,
    upstreamPackages: [{ ecosystem: "npm", name: slug }],
    handledUpstreamMajors: [],
    revisitTrigger: "",
    maturity: "M1_DECLARED",
    nextLevelGap: null,
  };
}

// ─── The gate: no entry may exceed its proven level ──────────────────

export interface RegistryDiagnostic {
  code:
    | "OVER_CLAIMED_MATURITY"
    | "UNKNOWN_RULE_REFERENCE"
    | "RETIRED_RULE_REFERENCE"
    | "DUPLICATE_ID"
    | "MISSING_NEXT_LEVEL_GAP"
    | "MISSING_OWNER"
    | "PROOF_WITHOUT_ARTIFACT";
  entryId: string;
  message: string;
}

/**
 * `registry:check` — the Wave 1 DoD gate.
 *
 * The single most important rule here is **no capability advertised above
 * proven level**. A capability whose `maturity` outranks what its own
 * evidence supports is a false proof, and this is the function every
 * surface calls before it renders a maturity badge.
 */
export function validateRegistry(
  registry: CapabilityRegistry,
): RegistryDiagnostic[] {
  const diagnostics: RegistryDiagnostic[] = [];
  const seen = new Set<string>();
  const liveIds = new Set(RULES.map((rule) => rule.id));
  const retired = new Set(RETIRED_RULE_IDS);

  for (const entry of registry.entries) {
    if (seen.has(entry.id)) {
      diagnostics.push({
        code: "DUPLICATE_ID",
        entryId: entry.id,
        message: "duplicate capability id",
      });
    }
    seen.add(entry.id);
    if (entry.owner.trim() === "") {
      diagnostics.push({
        code: "MISSING_OWNER",
        entryId: entry.id,
        message: "capability has no named owner",
      });
    }
    for (const reference of entry.rules) {
      const rule: string = reference;
      if (!isRuleId(rule)) {
        diagnostics.push({
          code: "UNKNOWN_RULE_REFERENCE",
          entryId: entry.id,
          message: `rule reference "${String(rule)}" is not a QA-* rule id (ADR 0003)`,
        });
      } else if (retired.has(rule)) {
        // A retired id may be referenced only to say it was retired. A
        // capability that *depends* on one is claiming support from a
        // detector that no longer runs.
        diagnostics.push({
          code: "RETIRED_RULE_REFERENCE",
          entryId: entry.id,
          message: `depends on retired rule ${rule}`,
        });
      } else if (!liveIds.has(rule)) {
        diagnostics.push({
          code: "UNKNOWN_RULE_REFERENCE",
          entryId: entry.id,
          message: `rule reference "${rule}" is not in the live registry`,
        });
      }
    }
    // The entry stamps the level its own evidence proved, so the
    // comparison is per-entry rather than against one global resolver
    // that would either pass everything or fail everything.
    if (maturityRank(entry.maturity) > maturityRank(entry.proven)) {
      diagnostics.push({
        code: "OVER_CLAIMED_MATURITY",
        entryId: entry.id,
        message: `advertises ${entry.maturity} but its own evidence proves only ${entry.proven}`,
      });
    }
    if (entry.nextLevelGap === null && entry.maturity !== "M5_FIELD_PROVEN") {
      diagnostics.push({
        code: "MISSING_NEXT_LEVEL_GAP",
        entryId: entry.id,
        message: `${entry.maturity} must expose a nextLevelGap (D1)`,
      });
    }
    if (
      entry.proof.status !== "BLOCKED" &&
      (entry.proof.artifact === null || entry.proof.observedAt === null)
    ) {
      diagnostics.push({
        code: "PROOF_WITHOUT_ARTIFACT",
        entryId: entry.id,
        message: `proof status ${entry.proof.status} requires both an artifact and an observedAt`,
      });
    }
  }
  return diagnostics;
}
