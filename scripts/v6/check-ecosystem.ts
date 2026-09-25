#!/usr/bin/env tsx
/**
 * `npm run ecosystem:census` / `npm run ecosystem:gaps` — the two census
 * gates (ADR 0010).
 *
 * `ecosystem:census` validates the *registry*: schema, ownership,
 * states, detection signals, `nextLevelGap` obligations, over-claim, and
 * staleness. It is the "is the census itself well-formed and current?"
 * gate.
 *
 * `ecosystem:gaps` validates the *diff*: no `UNRECOGNIZED` QA tool may go
 * without a recorded disposition for longer than one corpus cycle. This
 * is the gate that makes an unknown tool a release blocker rather than a
 * backlog item — "a new tool the engine sees in the wild and ignores is
 * a release-blocking honesty failure".
 *
 * The gap gate distinguishes three outcomes, because conflating them is
 * how a probe turns into a rubber stamp:
 *
 *  - `PASS`   — the probe ran, and every `UNRECOGNIZED` tool is disposed.
 *  - `BLOCKED`— the corpus cache is absent, so the probe walked nothing.
 *               A probe that reports zero because it did not run is the
 *               classic silent green, so this is never `PASS`.
 *  - `FAIL`   — the probe ran and found a tool with no disposition.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyStalenessDemotions,
  buildCensus,
  buildClassifiedResults,
  buildGapBacklog,
  classifyObservations,
  validateCensus,
  type UnrecognizedDisposition,
} from "../../src/v6/ecosystem-census.js";
import {
  CORPUS_CACHE_DIR,
  buildRepoEvidenceIndex,
  createEvidenceResolver,
  probeCorpus,
} from "../../src/v6/ecosystem-probe.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");

export const CORPUS_CYCLE = 1;

type GateName = "census" | "gaps";
type GateStatus = "PASS" | "BLOCKED" | "FAIL";

export interface GateResult {
  gate: GateName;
  status: GateStatus;
  errors: string[];
  warnings: string[];
  facts: Record<string, unknown>;
}

/** Minimal corpus size that makes a gap report meaningful. Below it the
 *  probe has not seen enough of the field to say anything, and saying
 *  something anyway is the failure mode. */
export const MIN_CORPUS_REPOS = 10;

export function runCensusGate(root = ROOT): GateResult {
  const resolver = createEvidenceResolver(buildRepoEvidenceIndex(root), root);
  const census = buildCensus({ resolver, observedAt: "1970-01-01" });
  const diagnostics = validateCensus(census, resolver);
  const errors = diagnostics
    .filter((d) => d.severity === "error")
    .map((d) => `${d.code} ${d.entryId}: ${d.message}`);
  const warnings = diagnostics
    .filter((d) => d.severity === "warning")
    .map((d) => `${d.code} ${d.entryId}: ${d.message}`);

  // Staleness is a release-blocking honesty finding (ADR 0010 rule 3): a
  // SUPPORTED entry whose upstream moved past the adapter is exactly the
  // silent staleness the census exists to catch. It is an error even
  // though it lives outside the base registry, because the *fix* is real
  // work: re-validate the adapter, or record the demotion.
  const view = applyStalenessDemotions(census, resolver);
  for (const demotion of view.demotions) {
    errors.push(`STALE_UPSTREAM_MAJOR ${demotion.entryId}: ${demotion.reason}`);
  }

  // The checked-in artifact must agree with a fresh base build. A census
  // that was hand-edited after generation is exactly the drift Law 8
  // forbids. The comparison is against the **base** registry, not the
  // demoted view: the base is a function of the checkout, so the artifact
  // is byte-stable on a machine without the corpus cache.
  const artifactPath = join(root, "docs", "ECOSYSTEM-CENSUS.json");
  if (!existsSync(artifactPath)) {
    errors.push(
      "docs/ECOSYSTEM-CENSUS.json is missing; run `npm run docs:ecosystem`",
    );
  } else {
    const artifact = JSON.parse(readFileSync(artifactPath, "utf8")) as {
      entries?: Array<{ id: string; state: string; maturity: string }>;
    };
    const recorded = new Map(
      (artifact.entries ?? []).map((e) => [e.id, `${e.state}/${e.maturity}`]),
    );
    for (const entry of census.entries) {
      const actual = `${entry.state}/${entry.maturity}`;
      const stored = recorded.get(entry.id);
      if (stored === undefined) {
        errors.push(`${entry.id}: absent from docs/ECOSYSTEM-CENSUS.json`);
        continue;
      }
      if (stored !== actual) {
        errors.push(
          `${entry.id}: artifact records ${stored} but the registry derives ${actual}; regenerate`,
        );
      }
    }
    for (const id of recorded.keys()) {
      if (!census.entries.some((entry) => entry.id === id)) {
        errors.push(
          `${id}: present in docs/ECOSYSTEM-CENSUS.json but not derivable; remove or fix the source`,
        );
      }
    }
  }

  return {
    gate: "census",
    status: errors.length > 0 ? "FAIL" : "PASS",
    errors,
    warnings,
    facts: {
      entries: census.entries.length,
      demotedByStaleness: view.demotions.length,
      demotedEntryIds: view.demotions.map((d) => d.entryId),
    },
  };
}

export function runGapsGate(root = ROOT): GateResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const resolver = createEvidenceResolver(buildRepoEvidenceIndex(root), root);
  const census = buildCensus({ resolver, observedAt: "1970-01-01" });

  if (!existsSync(join(root, CORPUS_CACHE_DIR))) {
    // Not a pass. A probe that walked nothing has proven nothing, and
    // reporting PASS here would be a false green generated by the very
    // mechanism meant to prevent them.
    return {
      gate: "gaps",
      status: "BLOCKED",
      errors,
      warnings,
      facts: {
        reason: `${CORPUS_CACHE_DIR} is absent; the discovery probe walked 0 repositories`,
        corpusRepos: 0,
      },
    };
  }

  const results = probeCorpus(root);
  if (results.length < MIN_CORPUS_REPOS) {
    return {
      gate: "gaps",
      status: "BLOCKED",
      errors,
      warnings: [
        `corpus has ${results.length} repositories; ${MIN_CORPUS_REPOS} is the minimum for a meaningful gap report`,
      ],
      facts: { corpusRepos: results.length, minimum: MIN_CORPUS_REPOS },
    };
  }

  const all = results.flatMap((result) => result.observations);
  const { recognized, unrecognized } = classifyObservations(census, all);
  const dispositions = loadDispositions(root);
  const byName = new Map<string, UnrecognizedDisposition>();
  for (const disposition of dispositions) {
    if (byName.has(disposition.name)) {
      errors.push(
        `docs/ECOSYSTEM-DISPOSITIONS.json: duplicate disposition for ${disposition.name}`,
      );
    }
    if (!disposition.owner || disposition.owner.trim() === "") {
      errors.push(
        `docs/ECOSYSTEM-DISPOSITIONS.json: ${disposition.name} has no named owner`,
      );
    }
    if (disposition.disposition === "PENDING_ADJUDICATION") {
      errors.push(
        `docs/ECOSYSTEM-DISPOSITIONS.json: ${disposition.name} is still PENDING_ADJUDICATION`,
      );
    }
    byName.set(disposition.name, disposition);
  }

  // Dispositions for tools the probe no longer sees are stale records:
  // keeping them is how a ledger rots.
  const observed = new Set(unrecognized.map((o) => o.name));
  for (const disposition of dispositions) {
    if (!observed.has(disposition.name)) {
      warnings.push(
        `disposition for ${disposition.name} is stale: not observed in the probed corpus`,
      );
    }
  }

  const undisposed = [...observed].filter((name) => !byName.has(name));
  for (const name of undisposed) {
    errors.push(
      `UNRECOGNIZED QA tool ${name} has no disposition in docs/ECOSYSTEM-DISPOSITIONS.json`,
    );
  }

  const backlog = buildGapBacklog(
    buildClassifiedResults(census, results),
    dispositions,
  );
  return {
    gate: "gaps",
    status: errors.length > 0 ? "FAIL" : "PASS",
    errors,
    warnings,
    facts: {
      corpusRepos: results.length,
      recognized: recognized.length,
      unrecognizedTools: observed.size,
      undisposed: undisposed.length,
      backlogTop5: backlog
        .slice(0, 5)
        .map((item) => `${item.name}(${item.repos})`),
      corpusCycle: CORPUS_CYCLE,
    },
  };
}

function loadDispositions(root: string): readonly UnrecognizedDisposition[] {
  const path = join(root, "docs", "ECOSYSTEM-DISPOSITIONS.json");
  if (!existsSync(path)) return [];
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as {
      dispositions?: UnrecognizedDisposition[];
    };
    return raw.dispositions ?? [];
  } catch {
    return [];
  }
}

function main(): void {
  const requested = (process.argv[2] ?? "census") as GateName;
  if (requested !== "census" && requested !== "gaps") {
    console.error("usage: check-ecosystem.ts [census|gaps]");
    process.exit(2);
  }
  const result =
    requested === "census" ? runCensusGate(ROOT) : runGapsGate(ROOT);
  console.log(
    JSON.stringify(
      {
        status: result.status,
        gate: result.gate,
        facts: result.facts,
        errors: result.errors,
        warnings: result.warnings,
      },
      null,
      2,
    ),
  );
  // BLOCKED is not a pass and is not a failure: it is the honest state
  // when the evidence needed to decide does not exist locally.
  process.exit(result.status === "FAIL" ? 1 : 0);
}

if (process.argv[1] && process.argv[1].endsWith("check-ecosystem.ts")) {
  main();
}
