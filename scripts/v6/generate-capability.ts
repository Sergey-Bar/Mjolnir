#!/usr/bin/env tsx
/**
 * `npm run docs:registry` — Wave 1's projection generator.
 *
 * The capability registry is the authority. This command writes its
 * **projections**, and nothing here may be hand-edited:
 *
 *  - `docs/capability-registry.json` — the registry itself
 *  - `docs/FRAMEWORK-MATRIX.json`      — capabilities × rules per framework
 *  - `docs/LANGUAGE-MATRIX.json`       — capabilities per language
 *  - `docs/CI-MATRIX.json`             — capabilities per CI provider
 *  - `docs/DOMAIN-COVERAGE.json`       — domain axes with maturity + gap
 *  - `docs/SURFACE-MATURITY.json`      — the six client surfaces (D4)
 *
 * That is the whole point of ADR 0007. A matrix cell that disagrees with
 * a capability entry is not a stale matrix, it is two truths, and the
 * fix is to delete the matrix rather than reconcile it by hand.
 *
 * Byte-stable by construction: `observedAt` is the git commit date, never
 * a clock stamp, so regenerating at a given commit produces no diff.
 */

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { prettify } from "../lib/prettify.js";
import { isMainModule } from "../lib/is-main-module.js";
import { ROOT } from "./inventory.js";
import {
  BLIND_REGISTRY_EVIDENCE,
  buildCapabilityRegistry,
  realCapabilityEvidence,
  validateRegistry,
  type CapabilityEntry,
  type CapabilityRegistry,
  type RegistryEvidence,
} from "../../src/v6/capability-registry.js";
import { MATURITY_SHORT, ORTHOGONAL_AXES } from "../../src/v6/maturity.js";
import { FRAMEWORK_INVENTORY } from "../../src/frameworks/framework-inventory.js";
import { CI_PROVIDER_IDS } from "../../src/frameworks/provider-capability-contract.js";

/** The six client surfaces (D4). Each carries its own proof maturity. */
export const SURFACES = [
  "cli",
  "github-action",
  "mcp",
  "vscode",
  "github-app",
  "dashboard",
] as const;

export type Surface = (typeof SURFACES)[number];

export function gitSha(): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
  } catch {
    return "UNKNOWN";
  }
}

function commitDate(): string {
  try {
    return execFileSync("git", ["log", "-1", "--format=%cs"], {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
  } catch {
    return "1970-01-01";
  }
}

/**
 * The checkout's own evidence.
 *
 * Thin alias for the module's `realCapabilityEvidence()` rather than a
 * second implementation: the gate, the `capability` verb and this
 * generator must all resolve evidence identically, or a table and its own
 * check become two truths wearing one command's clothes (ADR 0007).
 */
export function realEvidence(): RegistryEvidence {
  return realCapabilityEvidence();
}

// ─── Projections ─────────────────────────────────────────────────────

function entryProjection(entry: CapabilityEntry): Record<string, unknown> {
  return {
    capabilityId: entry.id,
    name: entry.name,
    kind: entry.kind,
    owner: entry.owner,
    maturity: MATURITY_SHORT[entry.maturity],
    rules: entry.rules,
    adapter: entry.adapter,
    proof: entry.proof,
    nextLevelGap: entry.nextLevelGap,
    blocksAxes: entry.blocksAxes,
  };
}

export function renderRegistry(
  registry: CapabilityRegistry,
  baseSha: string,
): string {
  return (
    JSON.stringify(
      {
        schemaVersion: 1,
        artifact: "capability-registry",
        generatedBy: "npm run docs:capability",
        registryId: registry.registryId,
        observedAt: registry.observedAt,
        baseSha,
        counts: registryCounts(registry),
        entries: registry.entries,
        orthogonalAxes: ORTHOGONAL_AXES.map((axis) => ({
          id: axis.id,
          fields: axis.fields,
          question: axis.question,
        })),
      },
      null,
      2,
    ) + "\n"
  );
}

export function registryCounts(
  registry: CapabilityRegistry,
): Record<string, number> {
  const counts: Record<string, number> = { entries: registry.entries.length };
  for (const entry of registry.entries) {
    counts[`kind:${entry.kind}`] = (counts[`kind:${entry.kind}`] ?? 0) + 1;
    counts[`maturity:${MATURITY_SHORT[entry.maturity]}`] =
      (counts[`maturity:${MATURITY_SHORT[entry.maturity]}`] ?? 0) + 1;
  }
  return counts;
}

function matrixDocument(
  artifact: string,
  axis: string,
  registry: CapabilityRegistry,
  baseSha: string,
  rows: Array<Record<string, unknown>>,
): string {
  return (
    JSON.stringify(
      {
        schemaVersion: 1,
        artifact,
        generatedBy: "npm run docs:capability",
        // The axis is named so a reader can see WHAT this matrix is a
        // projection OF, which is what stops it being read as an
        // independent source.
        projectionOf: registry.registryId,
        axis,
        observedAt: registry.observedAt,
        baseSha,
        rowCount: rows.length,
        rows,
      },
      null,
      2,
    ) + "\n"
  );
}

export function renderFrameworkMatrix(
  registry: CapabilityRegistry,
  baseSha: string,
): string {
  const rows = FRAMEWORK_INVENTORY.filter(
    (f) => f.entityType !== "CI_PROVIDER",
  ).map((framework) => {
    const slug = framework.frameworkId
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const entry = registry.entries.find(
      (candidate) => candidate.id === `test.framework.${slug}`,
    );
    return {
      framework: framework.frameworkId,
      entityType: framework.entityType,
      // The inventory's own `F`-ladder value, preserved verbatim. It is
      // NOT the capability maturity and must not be read as one (ADR
      // 0001 / GAP-V6-001): three ladders already collide.
      inventoryMaturity: framework.maturity,
      supportStatus: framework.supportStatus,
      capabilityId: entry?.id ?? null,
      maturity: entry === undefined ? null : MATURITY_SHORT[entry.maturity],
      rules: entry?.rules ?? [],
      validatedVersions: framework.validatedVersions,
    };
  });
  return matrixDocument(
    "framework-matrix",
    "framework",
    registry,
    baseSha,
    rows,
  );
}

export function renderLanguageMatrix(
  registry: CapabilityRegistry,
  baseSha: string,
): string {
  // Languages are not a first-class primitive in the repository, so this
  // matrix is derived from the *domains* each capability contributes to —
  // and it is deliberately tiny. A two-row language matrix that says
  // "typescript, python" is honest; a fabricated list of eight would not
  // be.
  const byLanguage = new Map<string, unknown[]>();
  for (const entry of registry.entries) {
    const language = languageOf(entry.id);
    if (language === null) continue;
    const bucket = byLanguage.get(language) ?? [];
    bucket.push(entryProjection(entry));
    byLanguage.set(language, bucket);
  }
  const rows = [...byLanguage.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([language, capabilities]) => ({ language, capabilities }));
  return matrixDocument("language-matrix", "language", registry, baseSha, rows);
}

/**
 * The language a capability id implies, when it implies one at all.
 * Returning `null` is the honest answer far more often than a guess.
 */
export function languageOf(capabilityId: string): string | null {
  if (capabilityId.startsWith("test.framework.")) return "typescript";
  if (capabilityId.startsWith("qa.domain.")) return null;
  return null;
}

export function renderCiMatrix(
  registry: CapabilityRegistry,
  baseSha: string,
): string {
  const rows = CI_PROVIDER_IDS.map((provider) => {
    const slug = provider
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const entry = registry.entries.find(
      (candidate) => candidate.id === `ci.provider.${slug}`,
    );
    return {
      provider,
      capabilityId: entry?.id ?? null,
      maturity: entry === undefined ? null : MATURITY_SHORT[entry.maturity],
      rules: entry?.rules ?? [],
      adapter: entry?.adapter ?? null,
      blocksAxes: entry?.blocksAxes ?? [],
    };
  });
  return matrixDocument("ci-matrix", "ci-provider", registry, baseSha, rows);
}

export function renderDomainCoverage(
  registry: CapabilityRegistry,
  baseSha: string,
): string {
  const rows = registry.entries
    .filter((entry) => entry.kind === "domain")
    .map((entry) => ({
      domain: entry.name,
      capabilityId: entry.id,
      maturity: MATURITY_SHORT[entry.maturity],
      nextLevelGap: entry.nextLevelGap,
      // D4 / §2.3: a domain with no pack is a visible gap, never an
      // omitted row and never an implied "covered".
      covered: entry.maturity !== "M0_UNKNOWN",
    }));
  return matrixDocument("domain-coverage", "domain", registry, baseSha, rows);
}

export function renderSurfaceMaturity(
  registry: CapabilityRegistry,
  baseSha: string,
): string {
  // A surface that does not exist may not be advertised at any maturity.
  // ABSENT is therefore a value the document has to be able to say, and
  // it is the honest answer for three of the six.
  const present: Record<Surface, "PRESENT" | "PROVISIONAL" | "ABSENT"> = {
    cli: "PRESENT",
    "github-action": "PRESENT",
    mcp: "PRESENT",
    vscode: "ABSENT",
    "github-app": "ABSENT",
    dashboard: "PROVISIONAL",
  };
  const rows = SURFACES.map((surface) => {
    const capabilities = registry.entries
      .filter((entry) => entry.kind === "surface")
      .filter((entry) => entry.name === surface);
    return {
      surface,
      state: present[surface],
      // A surface with no implementation is M0 regardless of how many
      // capabilities nominally reference it.
      maturity:
        present[surface] === "ABSENT"
          ? "M0"
          : capabilities.length === 0
            ? "M1"
            : MATURITY_SHORT[capabilities[0]?.maturity ?? "M0_UNKNOWN"],
      capabilities: capabilities.map((entry) => entry.id),
      // The honest claim for a surface is a function of its own evidence,
      // not of the capabilities behind it.
      nextLevelGap:
        present[surface] === "ABSENT"
          ? {
              target: "M1_DECLARED",
              missing: [`the ${surface} surface does not exist yet`],
              owner: "surface-convergence",
              revisitTrigger: `the ${surface} surface ships`,
            }
          : null,
    };
  });
  return matrixDocument("surface-maturity", "surface", registry, baseSha, rows);
}

// ─── Entrypoint ──────────────────────────────────────────────────────

export interface GeneratedCapability {
  registry: CapabilityRegistry;
  files: Readonly<Record<string, string>>;
}

export function generateCapability(root = ROOT): GeneratedCapability {
  const evidence = realEvidence();
  const registry = buildCapabilityRegistry({
    evidence,
    observedAt: commitDate(),
    // The domain cells come from the support matrix under this root, so the
    // root is part of the derivation rather than a convenience parameter.
    root,
  });
  const sha = gitSha();
  return {
    registry,
    files: {
      "docs/capability-registry.json": renderRegistry(registry, sha),
      "docs/FRAMEWORK-MATRIX.json": renderFrameworkMatrix(registry, sha),
      "docs/LANGUAGE-MATRIX.json": renderLanguageMatrix(registry, sha),
      "docs/CI-MATRIX.json": renderCiMatrix(registry, sha),
      "docs/DOMAIN-COVERAGE.json": renderDomainCoverage(registry, sha),
      "docs/SURFACE-MATURITY.json": renderSurfaceMaturity(registry, sha),
    },
  };
}

async function main(): Promise<void> {
  const { registry, files } = generateCapability(ROOT);
  const diagnostics = validateRegistry(registry);
  const errors = diagnostics.filter((d) => d.code !== "RETIRED_RULE_REFERENCE");
  for (const file of Object.entries(files)) {
    writeFileSync(join(ROOT, file[0]), file[1]);
    await prettify(join(ROOT, file[0]));
  }
  console.log(
    `Wrote ${Object.keys(files).length} Wave 1 projections: ` +
      `${registry.entries.length} capabilities, ` +
      `maturity ${JSON.stringify(registryCounts(registry))}.`,
  );
  if (errors.length > 0) {
    for (const diagnostic of errors) {
      console.error(
        `${diagnostic.code} ${diagnostic.entryId}: ${diagnostic.message}`,
      );
    }
    process.exit(1);
  }
}

export { BLIND_REGISTRY_EVIDENCE };

if (isMainModule(import.meta.url)) {
  await main();
}
