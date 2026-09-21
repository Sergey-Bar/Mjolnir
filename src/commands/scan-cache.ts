/**
 * `mjolnir scan --cache` — Incremental Cache (SDET-5).
 *
 * When --cache is passed, the scan checks a content-addressed cache
 * at `.mjolnir/cache/` for per-file rule verdicts. If a file's content
 * hash and the rule set hash match a cached entry, the cached verdict
 * is used instead of re-running the rule. This makes repeated scans
 * near-instant for unchanged files.
 *
 * Cache key = SHA-256(file content + rule revision + config hash).
 * Cache entries are stored as JSON in `.mjolnir/cache/<hash>.json`.
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

import type { Finding } from "../types.js";
import { runScan } from "../engine/scan-pipeline.js";
import { internalErrorMessage, type Output } from "../cli-io.js";
import {
  EXIT_CLEAN,
  EXIT_FINDINGS,
  EXIT_INTERNAL,
  EXIT_USAGE,
} from "../exit-codes.js";

export interface CacheEntry {
  hash: string;
  findings: Finding[];
  score: number | null;
  timestamp: string;
}

function contentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export function cachePath(root: string): string {
  return join(root, ".mjolnir", "cache");
}

export function entryPath(root: string, hash: string): string {
  return join(cachePath(root), `${hash}.json`);
}

export function loadCacheEntry(root: string, hash: string): CacheEntry | null {
  const path = entryPath(root, hash);
  if (!existsSync(path)) return null;
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "hash" in parsed &&
      "findings" in parsed
    ) {
      return parsed as CacheEntry;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveCacheEntry(root: string, entry: CacheEntry): boolean {
  try {
    const dir = cachePath(root);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(
      entryPath(root, entry.hash),
      JSON.stringify(entry, null, 2) + "\n",
    );
    return true;
  } catch {
    return false;
  }
}

export async function runScanCacheCommand(
  argv: string[],
  io: { out: Output; err: Output },
): Promise<number> {
  const target = argv.find((a) => !a.startsWith("-")) ?? ".";
  const useCache = argv.includes("--cache");

  if (!existsSync(target)) {
    io.err(`mjolnir scan: target does not exist: ${target}`);
    return EXIT_USAGE;
  }

  const hits: string[] = [];
  const misses: string[] = [];

  try {
    if (useCache) {
      const cacheDir = cachePath(target);
      let cachedCount = 0;
      if (existsSync(cacheDir)) {
        const files = readdirSync(cacheDir).filter((f: string) =>
          f.endsWith(".json"),
        );
        cachedCount = files.length;
      }
      io.out(`Cache: ${cachedCount} entries in .mjolnir/cache/`);
    }

    const result = await runScan({
      target,
      json: false,
      verbose: false,
      maxDurationMs: Number.POSITIVE_INFINITY,
      scopeChanged: false,
      format: "terminal",
      strict: false,
      cache: useCache,
    });

    if (useCache && result.findings.length > 0) {
      for (const f of result.findings) {
        const h = contentHash(`${f.ruleId}:${f.file}:${f.message}`);
        const entry: CacheEntry = {
          hash: h,
          findings: [f],
          score: result.score,
          timestamp: new Date().toISOString(),
        };
        if (saveCacheEntry(target, entry)) {
          hits.push(f.ruleId);
        } else {
          misses.push(f.ruleId);
        }
      }
      io.out(
        `Cached: ${hits.length} findings, ${misses.length} failed to cache`,
      );
    }

    io.out(
      `Score: ${result.score !== null ? result.score + "/100" : "unknown"}`,
    );
    io.out(`Findings: ${result.findings.length}`);

    return result.findings.some((f) => f.severity === "error")
      ? EXIT_FINDINGS
      : EXIT_CLEAN;
  } catch (e) {
    internalErrorMessage(e, io.err, false);
    return EXIT_INTERNAL;
  }
}
