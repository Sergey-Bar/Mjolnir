/**
 * Local incremental scan cache (Beta-to-Stable 1.0 plan, M5.2 / A-2).
 *
 * Content-addressed, local-only verdict cache: `--cache` reuses the
 * per-file rule outputs of a previous scan when the file's bytes AND the
 * active rule set are unchanged, and invalidates everything else. The
 * key is `sha256(fileText) + rulesDigest`, where the rules digest folds
 * in every active rule's id + `detectorRevision ?? 1` (the existing
 * stale-measurement machinery — Verification Trust Evolution Plan §07 —
 * reused as the cache invalidation signal, per A-2) plus a source hash
 * of each external plugin/local rule's `run` function, so a plugin that
 * changes code without bumping its revision still misses.
 *
 * Privacy posture: the cache lives under `<repo>/.mjolnir/cache/`, is
 * gitignored, never leaves the machine, and this module performs zero
 * network I/O — fs and crypto only (asserted by the privacy spec).
 *
 * Only raw rule-loop outputs are cached. Everything after the loop
 * (severity overrides, suppressions, overlap dedup, evidence stamping,
 * tier policy, runtime corroboration, scoring) re-runs on every scan,
 * so a cached scan is byte-equivalent to a fresh one by construction.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { Finding } from "../types.js";

const CACHE_VERSION = 1;
/** Entry cap: a monorepo-scale suite stays far below this; bounded file. */
const MAX_ENTRIES = 4096;

export interface CacheStats {
  hits: number;
  misses: number;
  /** Where the cache lives — reported so `--json` consumers can audit it. */
  file: string;
}

interface CacheEntry {
  /** Raw per-file rule-loop findings (file paths re-stamped on reuse). */
  findings: Finding[];
}

interface CacheFile {
  version: number;
  entries: Record<string, CacheEntry>;
}

export interface ScanCache {
  readonly stats: CacheStats;
  lookup(key: string): Finding[] | undefined;
  store(key: string, findings: Finding[], fileBudgetExceeded: boolean): void;
  persist(): void;
}

/** sha256 hex of a string — the only hash this module needs. */
function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/**
 * Digest of the active rule set: id + effective detectorRevision for
 * every rule (sorted for determinism), plus a source hash per rule's
 * `run` function. Any detector change — revision bump OR code edit —
 * produces a different digest, invalidating every cached entry. Takes a
 * structural subset on purpose: only these three fields feed the key.
 */
export function computeRulesDigest(
  rules: ReadonlyArray<{
    id: string;
    detectorRevision?: number;
    run: unknown;
  }>,
): string {
  const parts = rules
    .map(
      (r) =>
        `${r.id}:${r.detectorRevision ?? 1}:${sha256(
          // Function source is stable within a runtime; a rule whose
          // detection code changed without a revision bump still
          // invalidates (belt-and-braces on top of detectorRevision).
          String(r.run),
        ).slice(0, 12)}`,
    )
    .sort();
  return sha256(parts.join("|"));
}

/** Content-addressed key for one file's rule-loop verdicts. */
export function fileCacheKey(rulesDigest: string, fileText: string): string {
  return sha256(`${CACHE_VERSION}\u0000${rulesDigest}\u0000${fileText}`);
}

/** No-op cache used when --cache is absent: zero stats, zero I/O. */
export const disabledScanCache: ScanCache = {
  stats: { hits: 0, misses: 0, file: "" },
  lookup: () => undefined,
  store: () => {},
  persist: () => {},
};

/**
 * Opens (and lazily creates) `<root>/.mjolnir/cache/scan-v1.json`. A
 * corrupt, hostile or future-versioned cache file degrades to a cold
 * cache — never fails the scan.
 */
export function createScanCache(root: string): ScanCache {
  const dir = join(root, ".mjolnir", "cache");
  const file = join(dir, `scan-v${CACHE_VERSION}.json`);
  let entries: Record<string, CacheEntry> = {};
  let dirty = false;
  try {
    if (existsSync(file)) {
      const parsed = JSON.parse(readFileSync(file, "utf8")) as CacheFile;
      if (parsed?.version === CACHE_VERSION && parsed.entries) {
        entries = parsed.entries;
      }
    }
  } catch {
    entries = {}; // corrupt cache = cold cache; the scan stays honest
  }

  return {
    stats: { hits: 0, misses: 0, file },
    lookup(key) {
      const entry = entries[key];
      if (!entry) {
        this.stats.misses++;
        return undefined;
      }
      this.stats.hits++;
      // Structured copy: post-processing (evidence stamping, tier policy,
      // measured-FP tagging) mutates findings in place after the loop —
      // a shared reference would let a fresh run pollute cached entries.
      return structuredClone(entry.findings);
    },
    store(key, findings, fileBudgetExceeded) {
      // A file whose analysis was cut short by the per-file budget
      // produced partial results — baking those into the cache would
      // turn a truncated scan into a permanent lie for that file.
      if (fileBudgetExceeded) return;
      entries[key] = { findings: structuredClone(findings) };
      const keys = Object.keys(entries);
      if (keys.length > MAX_ENTRIES) {
        delete entries[keys[0] as string]; // insertion-ordered FIFO
      }
      dirty = true;
    },
    persist() {
      if (!dirty) return;
      try {
        mkdirSync(dir, { recursive: true });
        writeFileSync(
          file,
          JSON.stringify({ version: CACHE_VERSION, entries }),
          "utf8",
        );
      } catch {
        // A read-only or vanished .mjolnir/ must never fail a scan —
        // the cache is an optimization, not a source of truth.
      }
    },
  };
}
