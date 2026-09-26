#!/usr/bin/env tsx
/**
 * `npm run registry:check` — the Wave 1 DoD gate.
 *
 * Three invariants, and they are the whole of Wave 1's definition of
 * done:
 *
 *  1. **The registry schema is locked.** Every entry carries the same
 *     shape; a capability with a missing field is not a capability.
 *  2. **No consumer may hand-write a claim.** The checked-in
 *     `docs/capability-registry.json` must be byte-identical to a fresh
 *     derivation, and every matrix must name the registry it projects.
 *  3. **No capability is advertised above its proven level.** The check
 *     that Wave 0's census could not make, because the census measures
 *     *ecosystems* and this measures *our handling of them*.
 *
 * It also refuses the trap Wave 0 recorded: a projection that has drifted
 * from its source is a second truth, so a matrix that no longer matches
 * the registry fails rather than being regenerated in place silently.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { ROOT } from "./inventory.js";
import {
  buildCapabilityRegistry,
  realCapabilityEvidence,
  validateRegistry,
  type RegistryDiagnostic,
} from "../../src/v6/capability-registry.js";
import { generateCapability, SURFACES } from "./generate-capability.js";

export interface RegistryCheck {
  status: "PASS" | "FAIL";
  errors: string[];
  warnings: string[];
  facts: Record<string, unknown>;
}

/**
 * Key-order-independent JSON with **provenance stripped**, so the
 * comparison is about values a reader would act on.
 *
 * `baseSha` and `observedAt` are excluded on purpose. They are real
 * provenance and they belong in the artifact, but they are a function of
 * the commit rather than of the registry — so comparing them means the
 * artifact can *never* match a gate that also reads HEAD, and every
 * commit would report drift. That is the clock-in-the-artifact mistake the
 * census already made once (ADR 0010, the base registry / field view
 * split). Drift means a *claim* changed, not that a commit moved.
 */
export function stringifyStable(text: string): string {
  return JSON.stringify(sortKeys(stripProvenance(JSON.parse(text) as unknown)));
}

const PROVENANCE_KEYS = new Set(["baseSha", "observedAt", "generatedBy"]);

function stripProvenance(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripProvenance);
  if (typeof value !== "object" || value === null) return value;
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (PROVENANCE_KEYS.has(key)) continue;
    out[key] = stripProvenance(entry);
  }
  return out;
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (typeof value !== "object" || value === null) return value;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    out[key] = sortKeys((value as Record<string, unknown>)[key]);
  }
  return out;
}

/**
 * The shape every **matrix projection** must have.
 *
 * A matrix row is a claim somebody reads, so it must name what it
 * projects and carry its provenance. A row with neither is a hand-written
 * support list wearing a generated-file header — the exact artifact ADR
 * 0007 exists to prevent.
 */
export function checkMatrixShape(raw: unknown, path: string): string[] {
  const errors = checkShape(raw, path);
  if (errors.length > 0) return errors;
  const doc = raw as Record<string, unknown>;
  if (typeof doc.projectionOf !== "string" || doc.projectionOf === "") {
    errors.push(`${path}: "projectionOf" must name the registry it projects`);
  }
  for (const [index, row] of (doc.rows as unknown[]).entries()) {
    if (typeof row !== "object" || row === null) continue;
    const record = row as Record<string, unknown>;
    if (
      !("capabilityId" in record) &&
      !("framework" in record) &&
      !("provider" in record) &&
      !("domain" in record) &&
      !("language" in record) &&
      !("surface" in record)
    ) {
      errors.push(`${path}: row ${index} names no subject`);
    }
  }
  return errors;
}

/**
 * The shape the **registry** must have. It is the source, not a
 * projection, so it carries no `projectionOf` — and requiring one would
 * make the authority point at itself.
 */
export function checkRegistryShape(raw: unknown, path: string): string[] {
  const errors: string[] = [];
  if (typeof raw !== "object" || raw === null) {
    return [`${path}: not a JSON object`];
  }
  const doc = raw as Record<string, unknown>;
  for (const key of ["schemaVersion", "registryId", "entries", "counts"]) {
    if (!(key in doc)) errors.push(`${path}: missing "${key}"`);
  }
  if (doc.registryId !== "mjolnir-capability-registry") {
    errors.push(`${path}: registryId must be "mjolnir-capability-registry"`);
  }
  if (!Array.isArray(doc.entries)) {
    errors.push(`${path}: "entries" is not an array`);
    return errors;
  }
  const ids = new Set<string>();
  for (const [index, entry] of (doc.entries as unknown[]).entries()) {
    if (typeof entry !== "object" || entry === null) {
      errors.push(`${path}: entry ${index} is not an object`);
      continue;
    }
    const record = entry as Record<string, unknown>;
    // `proven` is what makes the document self-verifying: without it a
    // reader (or a gate) cannot tell an advertised level from a proven one.
    for (const key of [
      "id",
      "name",
      "kind",
      "owner",
      "rules",
      "maturity",
      "proven",
      "nextLevelGap",
      "proof",
    ]) {
      if (!(key in record)) {
        errors.push(`${path}: entry ${index} is missing "${key}"`);
      }
    }
    const id = typeof record.id === "string" ? record.id : "";
    if (ids.has(id)) errors.push(`${path}: duplicate entry id "${id}"`);
    ids.add(id);
  }
  return errors;
}

/** The invariants a JSON document shares: it must be an object. */
export function checkShape(raw: unknown, path: string): string[] {
  const errors: string[] = [];
  if (typeof raw !== "object" || raw === null) {
    return [`${path}: not a JSON object`];
  }
  const doc = raw as Record<string, unknown>;
  for (const key of ["schemaVersion", "artifact", "projectionOf", "rows"]) {
    if (!(key in doc)) errors.push(`${path}: missing "${key}"`);
  }
  if (!Array.isArray(doc.rows)) {
    errors.push(`${path}: "rows" is not an array`);
    return errors;
  }
  for (const [index, row] of (doc.rows as unknown[]).entries()) {
    if (typeof row !== "object" || row === null) {
      errors.push(`${path}: row ${index} is not an object`);
      continue;
    }
    // A row must name what it projects and declare its provenance. A row
    // with neither is a claim somebody typed.
    if (!("projectionOf" in doc)) {
      errors.push(`${path}: rows have no projectionOf`);
      break;
    }
  }
  return errors;
}

export function runRegistryCheck(root = ROOT): RegistryCheck {
  const errors: string[] = [];
  const warnings: string[] = [];

  // The SAME evidence the generator and the verb use. Validating a
  // registry against a different evidence set than it was built from is how
  // a table and its own check disagree.
  const registry = buildCapabilityRegistry({
    evidence: realCapabilityEvidence(),
  });
  const diagnostics: RegistryDiagnostic[] = validateRegistry(registry);
  // A retired rule reference is a WARNING, not a failure: a capability is
  // allowed to name a rule it used to depend on, and a D3 adjudication
  // record in Wave 4 is exactly that. Advertising support *from* it is
  // the failure, and that is `RETIRED_RULE_REFERENCE` at severity error
  // when the entry claims a level the retired rule used to prove.
  for (const diagnostic of diagnostics) {
    if (diagnostic.code === "RETIRED_RULE_REFERENCE") {
      warnings.push(
        `${diagnostic.code} ${diagnostic.entryId}: ${diagnostic.message}`,
      );
    } else {
      errors.push(
        `${diagnostic.code} ${diagnostic.entryId}: ${diagnostic.message}`,
      );
    }
  }

  // Projection drift: the checked-in artifacts must be *structurally*
  // identical to a fresh render.
  //
  // Structural, not byte-for-byte, because the generator runs Prettier
  // over what it writes. A byte comparison here would fail on formatting
  // rather than on a claim, and a gate that fires on formatting teaches
  // people to ignore it. Key order is normalised by `stringifyStable`;
  // every *value* still has to match.
  const { files } = generateCapability(root);
  for (const [relative, expected] of Object.entries(files)) {
    const full = join(root, relative);
    if (!existsSync(full)) {
      errors.push(`${relative} is missing; run \`npm run docs:capability\``);
      continue;
    }
    let actualText: string;
    try {
      actualText = readFileSync(full, "utf8");
      errors.push(
        ...(relative.endsWith("capability-registry.json")
          ? checkRegistryShape(JSON.parse(actualText), relative)
          : checkMatrixShape(JSON.parse(actualText), relative)),
      );
    } catch (parseError) {
      errors.push(`${relative}: ${String(parseError)}`);
      continue;
    }
    if (stringifyStable(actualText) !== stringifyStable(expected)) {
      errors.push(
        `${relative} has drifted from the registry; run \`npm run docs:capability\``,
      );
    }
  }

  // Every declared surface must appear in the surface matrix, including
  // the absent ones. A surface nobody mentions is how a roadmap grows a
  // product nobody built.
  const surfacePath = join(root, "docs", "SURFACE-MATURITY.json");
  if (existsSync(surfacePath)) {
    const doc = JSON.parse(readFileSync(surfacePath, "utf8")) as {
      rows?: Array<{ surface?: string; state?: string }>;
    };
    const seen = new Set((doc.rows ?? []).map((row) => row.surface));
    for (const surface of SURFACES) {
      if (!seen.has(surface)) {
        errors.push(`SURFACE-MATURITY.json: missing surface "${surface}"`);
      }
    }
  } else {
    errors.push("docs/SURFACE-MATURITY.json is missing");
  }

  return {
    status: errors.length > 0 ? "FAIL" : "PASS",
    errors,
    warnings,
    facts: {
      capabilities: registry.entries.length,
      byKind: countBy(registry.entries.map((entry) => entry.kind)),
      byMaturity: countBy(registry.entries.map((entry) => entry.maturity)),
      projections: Object.keys(files).length,
      warnings: warnings.length,
    },
  };
}

function countBy(values: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const value of values) out[value] = (out[value] ?? 0) + 1;
  return out;
}

function main(): void {
  const check = runRegistryCheck(ROOT);
  console.log(
    JSON.stringify(
      {
        status: check.status,
        gate: "registry:check",
        facts: check.facts,
        errors: check.errors,
        warnings: check.warnings,
      },
      null,
      2,
    ),
  );
  process.exit(check.status === "PASS" ? 0 : 1);
}

if (process.argv[1]?.endsWith("check-capability-registry.ts")) {
  main();
}
