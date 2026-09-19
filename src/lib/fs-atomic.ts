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
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";

export function atomicTempPath(path: string): string {
  return `${path}.mjolnir-${process.pid}-${Date.now()}-${randomBytes(4).toString("hex")}.tmp`;
}

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
  const tmp = atomicTempPath(path);
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
 *
 * Internal contract test hook: the platform check keeps this loop off
 * the POSIX hot path; on win32 the EBUSY/EPERM arms are exercised by
 * the fs-atomic-retry spec (mocked renameSync).
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
  for (let attempt = 0; ; attempt++) {
    try {
      renameSync(from, to);
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException | null)?.code;
      if (
        process.platform === "win32" &&
        (code === "EBUSY" || code === "EPERM") &&
        attempt < RENAME_RETRIES
      ) {
        sleepSync(RENAME_RETRY_DELAY_MS);
        continue;
      }
      // Not retryable (or retries exhausted): the loop's last iteration
      // exits here on the final attempt, so the error always propagates.
      throw err;
    }
  }
}

const STALE_TEMP_AGE_MS = 24 * 60 * 60 * 1000;
const TEMP_PID_RE = /^.+\.mjolnir-([1-9]\d{0,9})-(\d{13})-[0-9a-f]{8}\.tmp$/;

export function sweepStaleTempFiles(dir: string): number {
  let swept = 0;
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return 0;
  }
  const cutoff = Date.now() - STALE_TEMP_AGE_MS;
  for (const entry of entries) {
    const match = TEMP_PID_RE.exec(entry);
    if (!match || Number(match[2]) > cutoff) continue;
    const path = join(dir, entry);
    try {
      const stat = lstatSync(path);
      if (!stat.isFile() || stat.mtimeMs > cutoff) continue;
      if (pidAlive(Number(match[1]))) continue;
      unlinkSync(path);
      swept++;
    } catch {
      continue;
    }
  }
  return swept;
}

function pidAlive(pid: number): boolean {
  if (!Number.isSafeInteger(pid) || pid <= 0 || pid > 2147483647) return true;
  if (pid === process.pid) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return (err as NodeJS.ErrnoException | null)?.code !== "ESRCH";
  }
}
