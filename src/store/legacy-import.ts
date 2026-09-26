/**
 * Legacy import and the migration registry (plan V5-014).
 *
 * The repository has accumulated four generations of trust artifacts:
 * `.mjolnir/baseline.json`, `.mjolnir/trend.jsonl`, the historical-trust
 * ledger, and the M50 release-proof records. They are all real evidence, and
 * all of it predates machine-anchored identity.
 *
 * The law this module exists to enforce: **import cannot increase trust.**
 *
 * A legacy artifact has no run identity, no candidate binding, and no proof of
 * which bytes produced it. Importing one into the evidence store records that
 * the history exists — it does NOT upgrade that history to verified. So every
 * migrator emits records whose trust state is OPEN, and a record imported twice
 * is the same record: idempotence is not a nicety here, it is what stops a
 * re-run of the import from manufacturing new history on every invocation.
 *
 * What a consumer may do with an OPEN record is decided by
 * `legacyTrustAllows`: it may be replayed as history, shown as a prior
 * observation, and used to detect regressions. It may never be the sole basis
 * for a READY determination.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { digestOf, EvidenceStore } from "./evidence-store.js";

/** The trust state a record carries. Legacy import only ever produces OPEN. */
export type ImportedTrust =
  { state: "OPEN"; reason: string } | { state: "VERIFIED"; scanId: string };

export interface ImportedRecord {
  /** Where it came from, for audit. */
  origin: string;
  /** The legacy schema this record was read from. */
  format: string;
  /** The record's content, verbatim. */
  payload: unknown;
  trust: ImportedTrust;
}

export interface MigrationResult {
  origin: string;
  format: string;
  /** Records written to the store (idempotent: re-running writes none). */
  imported: number;
  /** Records already present from a previous run. */
  alreadyPresent: number;
  /** Records that could not be read at all. */
  unreadable: number;
  /** The digests written or found. */
  digests: string[];
}

/**
 * What an OPEN record is allowed to support.
 *
 * The distinction is not cosmetic. "Regressed since a previous run" is a
 * statement about a COMPARISON, and an unverified prior observation can support
 * one. "This build is clean" is a statement about THIS run, and a prior
 * observation says nothing about it.
 */
export type LegacyUse =
  | "REPLAY_HISTORY"
  | "REGRESSION_COMPARISON"
  | "DISPLAY_PRIOR_OBSERVATION"
  | "SOLE_BASIS_FOR_VERDICT";

export function legacyTrustAllows(
  trust: ImportedTrust,
  use: LegacyUse,
): boolean {
  if (use === "SOLE_BASIS_FOR_VERDICT") return trust.state === "VERIFIED";
  // An OPEN record is legitimate for everything that treats it as history.
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const LEGACY_REASON =
  "imported from a legacy artifact: no run identity, no candidate binding, no proof of origin. Replayable as history; not a basis for a verdict.";

/**
 * Import a JSON file's contents as one OPEN record.
 *
 * Used for artifacts that are a single document (baseline). The record is
 * stored verbatim: normalizing it here would make the import lossy, and a
 * lossy import of history is how history becomes unreliable.
 */
function importJsonDocument(
  store: EvidenceStore,
  root: string,
  relativePath: string,
): MigrationResult {
  const origin = relativePath;
  const base = {
    origin,
    format: "legacy-json",
    imported: 0,
    alreadyPresent: 0,
    unreadable: 0,
    digests: [] as string[],
  };
  const full = join(root, relativePath);
  if (!existsSync(full)) return base;
  let payload: unknown;
  try {
    payload = JSON.parse(readFileSync(full, "utf8"));
  } catch {
    return { ...base, unreadable: 1 };
  }
  const envelope = store.put(payload);
  const existed = store
    .history()
    .entries.filter((d) => d === envelope.digest).length;
  return {
    ...base,
    imported: existed > 1 ? 0 : 1,
    alreadyPresent: existed > 1 ? 1 : 0,
    digests: [envelope.digest],
  };
}

/**
 * Import a JSONL file line by line, one record per line.
 *
 * Unparseable lines are counted, not skipped silently: a trend file with
 * damaged lines is a fact about the artifact, and the caller should see it.
 */
function importJsonLines(
  store: EvidenceStore,
  root: string,
  relativePath: string,
): MigrationResult {
  const origin = relativePath;
  const base = {
    origin,
    format: "legacy-jsonl",
    imported: 0,
    alreadyPresent: 0,
    unreadable: 0,
    digests: [] as string[],
  };
  const full = join(root, relativePath);
  if (!existsSync(full)) return base;
  const lines = readFileSync(full, "utf8").split(/\r?\n/);
  let imported = 0;
  let alreadyPresent = 0;
  let unreadable = 0;
  const digests: string[] = [];
  const seen = new Set<string>();
  for (const raw of lines) {
    const line = raw.trim();
    if (line.length === 0) continue;
    let payload: unknown;
    try {
      payload = JSON.parse(line);
    } catch {
      unreadable++;
      continue;
    }
    const digest = digestOf(payload);
    if (seen.has(digest)) continue; // within-file duplicate
    seen.add(digest);
    if (store.has(digest)) {
      alreadyPresent++;
    } else {
      store.put(payload);
      imported++;
    }
    digests.push(digest);
  }
  return {
    origin,
    format: "legacy-jsonl",
    imported,
    alreadyPresent,
    unreadable,
    digests,
  };
}

interface Migrator {
  id: string;
  /** The legacy layout this migrator knows how to read. */
  format: string;
  run(store: EvidenceStore, root: string): MigrationResult;
}

/**
 * The migration registry.
 *
 * A registry rather than a function so that "which legacy formats were
 * imported, when, and by which version" is a data structure that can be
 * written down. An unrecorded migration is an unreviewable one.
 */
export const MIGRATIONS: readonly Migrator[] = [
  {
    id: "baseline@1",
    format: ".mjolnir/baseline.json",
    run: (store, root) =>
      importJsonDocument(store, root, ".mjolnir/baseline.json"),
  },
  {
    id: "trend@1",
    format: ".mjolnir/trend.jsonl",
    run: (store, root) => importJsonLines(store, root, ".mjolnir/trend.jsonl"),
  },
  {
    id: "historical-trust@1",
    format: ".mjolnir/trust-history.jsonl",
    run: (store, root) =>
      importJsonLines(store, root, ".mjolnir/trust-history.jsonl"),
  },
  {
    id: "m50-release-proof@1",
    format: "release-proof.jsonl",
    run: (store, root) => importJsonLines(store, root, "release-proof.jsonl"),
  },
] as const;

export interface ImportReport {
  results: MigrationResult[];
  /** The trust state every imported record carries. Never VERIFIED. */
  trust: ImportedTrust;
  /** Digests that exist in the store after the import. */
  totalDigests: number;
  /** Records the store could not trust (damaged content), if any. */
  corrupt: number;
}

/**
 * Run every migration against a store.
 *
 * Idempotent by construction: records are content-addressed, so a second run
 * finds every digest already present and imports nothing. A non-idempotent
 * import would let a routine command grow history on every invocation.
 */
export function importLegacy(
  store: EvidenceStore,
  root: string,
  migrations: readonly Migrator[] = MIGRATIONS,
): ImportReport {
  const results = migrations.map((migration) => migration.run(store, root));
  return {
    results,
    trust: { state: "OPEN", reason: LEGACY_REASON },
    totalDigests: store.digests().length,
    corrupt: store.audit().corrupt.length,
  };
}

/**
 * The trust record a migrator attaches to what it writes.
 *
 * Typed as the OPEN variant specifically, because that is the only thing this
 * function can return: a caller that has to narrow before reading `reason` is
 * being asked about a case that cannot occur, and the branch it writes will
 * quietly stop being tested.
 */
export function legacyTrust(): Extract<ImportedTrust, { state: "OPEN" }> {
  return { state: "OPEN", reason: LEGACY_REASON };
}

/** The migration ids, for a manifest that records what was applied. */
export function appliedMigrationIds(
  migrations: readonly Migrator[] = MIGRATIONS,
): string[] {
  return migrations.map((migration) => migration.id);
}

export { isRecord };
