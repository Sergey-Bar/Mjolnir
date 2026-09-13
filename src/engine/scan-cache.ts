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
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import type { Finding } from "../types.js";
import { parseJsonFile, isRecord } from "../lib/safe-json.js";

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
 * every rule (sorted for determinism), plus a content hash of all rule
 * source files. The directory-tree hash catches changes to ANY file
 * under src/rules/ — same-file helpers, cross-module imports, shared
 * utilities — without needing to trace the import graph. This is the
 * only reliable way to detect helper function changes in a bundled
 * ESM codebase where String(fn) doesn't reveal transitive dependencies.
 */
export function computeRulesDigest(
  rules: ReadonlyArray<{
    id: string;
    detectorRevision?: number;
    run: unknown;
    modulePath?: string;
  }>,
): string {
  const parts = rules.map((r) => `${r.id}:${r.detectorRevision ?? 1}`).sort();

  // Hash the rules source directory tree. Any change to any rule file,
  // helper, or shared utility invalidates the cache. The cost is one
  // directory traversal + sha256 per scan (not per file).
  const rulesDirHash = hashRulesSourceTree(rules);

  return sha256(parts.join("|") + "\0" + rulesDirHash);
}

/**
 * Hash all .ts files under src/rules/ (when the first rule's modulePath
 * reveals the project root). Falls back to per-rule function source
 * hashing when the directory cannot be resolved.
 */
function hashRulesSourceTree(
  rules: ReadonlyArray<{ run: unknown; modulePath?: string }>,
): string {
  // Derive the rules directory from the first rule's modulePath
  const firstPath = rules.find((r) => r.modulePath)?.modulePath;
  if (!firstPath) {
    // Fallback: hash all String(run) sources
    return sha256(rules.map((r) => String(r.run)).join("\0")).slice(0, 16);
  }
  // Walk up from the module path to find src/rules/
  const marker = "/src/rules/";
  const idx = firstPath.replace(/\\/g, "/").indexOf(marker);
  if (idx < 0) {
    return sha256(rules.map((r) => String(r.run)).join("\0")).slice(0, 16);
  }
  const rulesDir = firstPath.replace(/\\/g, "/").slice(0, idx + marker.length);
  try {
    const hash = createHash("sha256");
    hashDir(rulesDir, hash, 0);
    return hash.digest("hex").slice(0, 16);
  } catch {
    return sha256(rules.map((r) => String(r.run)).join("\0")).slice(0, 16);
  }
}

function hashDir(
  dir: string,
  hash: ReturnType<typeof createHash>,
  depth: number,
): void {
  if (depth > 8) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      hashDir(full, hash, depth + 1);
    } else if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
      try {
        hash.update(entry.name);
        hash.update(readFileSync(full));
      } catch {
        // unreadable → skip
      }
    }
  }
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
  // Audit M5: incremental byte accounting. entryBytes caches each
  // entry's serialized size; totalBytes is the running sum (bounded by
  // MAX_TOTAL_BYTES before persist). Updated incrementally on
  // store/lookup-refresh/evict — never by re-stringifying the cache.
  const entryBytes = new Map<string, number>();
  let totalBytes = 0;
  try {
    if (existsSync(file)) {
      const parsed = parseJsonFile(
        readFileSync(file, "utf8"),
        file,
        (v): v is CacheFile =>
          isRecord(v) &&
          v["version"] === CACHE_VERSION &&
          isRecord(v["entries"]),
      );
      entries = parsed.entries;
      for (const [k, v] of Object.entries(entries)) {
        const size = JSON.stringify(v).length + k.length + 4;
        entryBytes.set(k, size);
        totalBytes += size;
      }
    }
  } catch {
    entries = {}; // corrupt cache = cold cache; the scan stays honest
    entryBytes.clear();
    totalBytes = 0;
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
      const replacedBytes = entryBytes.get(key) ?? 0;
      delete entries[key];
      const entryJson = JSON.stringify(findings);
      entries[key] = { findings: structuredClone(findings) };
      const newBytes = entryJson.length + key.length + 4;
      entryBytes.set(key, newBytes);
      totalBytes = totalBytes - replacedBytes + newBytes;
      // Evict oldest-by-use until both caps hold. The byte budget is the
      // honest bound: entries are evicted in insertion (= use) order.
      // Bytes are tracked INCREMENTALLY — stringifying the whole cache
      // per store made 5,000 stores O(n²) (a real timeout in the suite).
      let count = Object.keys(entries).length;
      while (
        (count > MAX_ENTRIES || totalBytes > MAX_TOTAL_BYTES) &&
        count > 1
      ) {
        const oldest = Object.keys(entries)[0] as string;
        // entryBytes always carries the key — both maps are updated
        // together in store() and evicted together here.
        totalBytes -= entryBytes.get(oldest) as number;
        delete entries[oldest];
        entryBytes.delete(oldest);
        count--;
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
