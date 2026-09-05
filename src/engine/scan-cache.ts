/**
 * Local incremental scan cache (Beta-to-Stable 1.0 plan, M5.2 / A-2).
 *
 * Content-addressed, local-only verdict cache: `--cache` reuses the
 * per-file rule outputs of a previous scan when the file's bytes AND the
 * active rule set are unchanged, and invalidates everything else. The
 * key is `sha256(fileText) + rulesDigest` + the file's own identity
 * (repo-relative path + adapter id + parse mode — audit C1/W9), where
 * the rules digest folds
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

const CACHE_VERSION = 2;
/** Entry cap: a monorepo-scale suite stays far below this; bounded file. */
const MAX_ENTRIES = 4096;
/**
 * Audit M5: total byte budget. The old cap counted only ENTRIES, so
 * 4096 files × ~100KB of findings each could still produce a
 * multi-hundred-MB writeFileSync on persist. The budget bounds the
 * serialized size; the newest entries win (real LRU-by-use).
 */
const MAX_TOTAL_BYTES = 32 * 1024 * 1024;

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

/**
 * Content-addressed key for one file's rule-loop verdicts.
 *
 * Audit C1: the key MUST identify the verdict's producer, not just the
 * bytes — two files with byte-identical text (a copied spec, a generated
 * snapshot) previously shared one entry, and the first file's cached
 * findings were re-emitted for the second with the wrong `file` stamp.
 * The key therefore folds in the repo-relative path AND the adapter id,
 * plus a parse-mode token (audit W9): a file whose analysis degraded to
 * the regex fallback (or skipped the AST path) must not collide with a
 * fully-AST-analyzed verdict for the same bytes — the fallback output
 * belongs only to the fallback mode.
 */
export function fileCacheKey(
  rulesDigest: string,
  fileText: string,
  identity: { relPath: string; adapterId: string; parseMode?: string },
): string {
  const parseMode = identity.parseMode ?? "ast";
  return sha256(
    `${CACHE_VERSION}\u0000${rulesDigest}\u0000${identity.relPath}\u0000${identity.adapterId}\u0000${parseMode}\u0000${fileText}`,
  );
}

/** No-op cache used when --cache is absent: zero stats, zero I/O. */
export const disabledScanCache: ScanCache = {
  stats: { hits: 0, misses: 0, file: "" },
  lookup: () => undefined,
  store: () => {},
  persist: () => {},
};

/**
 * Opens (and lazily creates) `<root>/.mjolnir/cache/scan-v<CACHE_VERSION>.json`. A
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
      // Audit M5: LRU-by-use — a hit re-inserts the key so the eviction
      // order below reflects actual use, not file-scan order. Structured
      // copy: post-processing (evidence stamping, tier policy,
      // measured-FP tagging) mutates findings in place after the loop —
      // a shared reference would let a fresh run pollute cached entries.
      delete entries[key];
      entries[key] = entry;
      return structuredClone(entry.findings);
    },
    store(key, findings, fileBudgetExceeded) {
      // A file whose analysis was cut short by the per-file budget
      // produced partial results — baking those into the cache would
      // turn a truncated scan into a permanent lie for that file.
      if (fileBudgetExceeded) return;
      // Audit M5: refresh on re-store (same file scanned twice in one
      // process — e.g. library consumers) must not duplicate its slot.
      delete entries[key];
      entries[key] = { findings: structuredClone(findings) };
      // Evict oldest-by-use until both caps hold. The byte budget is the
      // honest bound: entries are evicted in insertion (= use) order.
      let keys = Object.keys(entries);
      let totalBytes = JSON.stringify({
        version: CACHE_VERSION,
        entries,
      }).length;
      while (
        (keys.length > MAX_ENTRIES || totalBytes > MAX_TOTAL_BYTES) &&
        keys.length > 1
      ) {
        const oldest = keys[0] as string;
        const evicted = entries[oldest];
        delete entries[oldest];
        totalBytes -= evicted
          ? JSON.stringify(evicted).length + oldest.length + 20
          : 0;
        keys = Object.keys(entries);
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
