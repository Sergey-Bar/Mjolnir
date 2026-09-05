/**
 * Atomic file writes (audit S9).
 *
 * Every durability-critical write in Mjölnir (baseline, stats, badge,
 * TRIAGE.md, scaffolded rule files) used to hand-roll
 * `writeFileSync(path, data)` — a crash mid-write left a TRUNCATED file
 * at the real path, and a subsequent read (diff, badge endpoint) served
 * confident nonsense from it.
 *
 * `writeFileAtomic` writes to a temp sibling, then RENAMES. On the same
 * volume rename is atomic: readers see either the complete old file or
 * the complete new file, never a half-written one. The temp name is
 * created with `wx` (exclusive) so concurrent writers cannot interleave,
 * stale temps are cleaned up on failure, and on Windows the rename is
 * retried briefly because a concurrent reader can hold the destination
 * open (EBUSY/EPERM).
 */

import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";

export interface WriteFileAtomicOptions {
  encoding?: BufferEncoding;
  mode?: number;
  /** Create the parent directory when missing (default true). */
  mkdirs?: boolean;
}

/**
 * Atomically replace `path` with `data`.
 */
export function writeFileAtomic(
  path: string,
  data: string,
  opts: WriteFileAtomicOptions = {},
): void {
  const dir = dirname(path);
  if (opts.mkdirs !== false && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const tmp = `${path}.mjolnir-${Date.now()}-${randomBytes(4).toString("hex")}.tmp`;
  let fd: number | undefined;
  try {
    // wx: exclusive create — two concurrent writers never interleave.
    fd = openSync(tmp, "wx", opts.mode ?? 0o644);
    writeSync(fd, data, null, opts.encoding ?? "utf8");
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
  try {
    renameWithWindowsRetry(tmp, path);
  } catch (err) {
    // The destination keeps its previous (complete) contents. Clean up
    // the temp so a crash loop does not litter the directory.
    try {
      if (existsSync(tmp)) unlinkSync(tmp);
    } catch {
      // best effort — the failed rename already told the caller
    }
    throw err;
  }
}

/**
 * renameSync retry loop for Windows: a concurrent reader (another scan,
 * a badge endpoint, an editor) holding the destination open makes
 * rename fail with EBUSY/EPERM. A short bounded retry closes the race
 * without turning an atomic swap into a partial write.
 */
const RENAME_RETRIES = 8;
const RENAME_RETRY_DELAY_MS = 25;

/** Synchronous sleep that does not spin the CPU. */
function sleepSync(ms: number): void {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    // Atomics.wait unavailable on this thread — bounded busy-wait fallback
    const until = Date.now() + ms;
    while (Date.now() < until) {
      // spin
    }
  }
}

function renameWithWindowsRetry(from: string, to: string): void {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= RENAME_RETRIES; attempt++) {
    try {
      renameSync(from, to);
      return;
    } catch (err) {
      lastErr = err;
      const code = (err as NodeJS.ErrnoException | null)?.code;
      if (
        process.platform === "win32" &&
        (code === "EBUSY" || code === "EPERM") &&
        attempt < RENAME_RETRIES
      ) {
        sleepSync(RENAME_RETRY_DELAY_MS);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

/**
 * Startup sweep: remove stale `.mjolnir-*.tmp` files left by a crashed
 * writer in `dir` (and its children named like artifacts). Called by the
 * fix command's pre-flight. Never throws — cleanup is advisory.
 */
export function sweepStaleTempFiles(dir: string): number {
  let swept = 0;
  try {
    for (const entry of readdirSync(dir)) {
      if (!entry.includes(".mjolnir-") || !entry.endsWith(".tmp")) continue;
      try {
        unlinkSync(join(dir, entry));
        swept++;
      } catch {
        // a temp currently being renamed over — leave it
      }
    }
  } catch {
    // unreadable dir — nothing to sweep
  }
  return swept;
}
