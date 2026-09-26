/**
 * The content-addressed evidence store (plan V5-013).
 *
 * Evidence is the product. If a verdict cannot be re-checked against the bytes
 * that produced it, it is an anecdote — and this store is what makes it
 * re-checkable. Four properties, each of which the previous arrangement (a
 * JSON file rewritten in place) did not have:
 *
 *  1. CONTENT ADDRESSING. A record is stored under sha256 of its own canonical
 *     bytes, so a blob's location proves what it contains. An attacker — or a
 *     bug — cannot swap one record for another without the key no longer
 *     matching, and the mismatch is detectable on read rather than trusted.
 *
 *  2. APPEND-ONLY HISTORY. The history is a JSONL log that is only ever
 *     appended to. A record that contradicts an earlier one does not overwrite
 *     it; both are retained and the contradiction is visible. Overwriting is
 *     how history becomes fiction.
 *
 *  3. ATOMICITY. Every write goes through `writeFileAtomic` (temp sibling,
 *     exclusive create, rename), so a crash mid-write cannot leave a truncated
 *     record at a real path. Readers see the old record or the new one.
 *
 *  4. FAIL-CLOSED INTEGRITY. Every stored record carries the digest of its own
 *     content. A read that does not match is CORRUPT and is reported as such;
 *     it is never returned as if it were intact, and never silently dropped
 *     either — a dropped record reads as an absence of evidence.
 *
 * Concurrency: writers coordinate through an exclusive-create lock file. The
 * lock is held for the duration of one append, released in a finally block, and
 * stolen if its owner is gone (a crashed process must not wedge the store
 * forever).
 */

import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  appendFileSync,
} from "node:fs";
import { join } from "node:path";

import {
  atomicTempPath,
  sweepStaleTempFiles,
  writeFileAtomic,
} from "../lib/fs-atomic.js";

/** The store's own layout version. Bump on a semantic change to the format. */
export const EVIDENCE_STORE_VERSION = "evidence-store@1";

export interface StoredEnvelope<T = unknown> {
  /** The store version that wrote this record. */
  store: typeof EVIDENCE_STORE_VERSION;
  /** Content digest of `record`, hex sha256. The record's own address. */
  digest: string;
  /** When it was written. Absent when the caller suppressed it. */
  writtenAt?: string;
  /** The record itself. */
  record: T;
}

export type ReadOutcome<T> =
  | { status: "OK"; envelope: StoredEnvelope<T> }
  | { status: "ABSENT" }
  | { status: "CORRUPT"; expected: string; actual: string; reason: string };

/** Canonical JSON: sorted keys, no incidental whitespace. */
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
    .join(",")}}`;
}

export function digestOf(record: unknown): string {
  return createHash("sha256").update(canonical(record)).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const LOCK_STALE_MS = 30_000;

export class EvidenceStore {
  private readonly root: string;

  constructor(root: string) {
    this.root = root;
    this.recordsDir = join(root, "records");
    this.historyPath = join(root, "history.jsonl");
    this.lockPath = join(root, "store.lock");
  }

  private readonly recordsDir: string;
  private readonly historyPath: string;
  private readonly lockPath: string;

  /** Create the layout. Idempotent. */
  init(): void {
    mkdirSync(this.recordsDir, { recursive: true });
  }

  /**
   * Store a record and return its envelope.
   *
   * Idempotent by construction: storing the same content twice writes the same
   * address, so a retry after a crash cannot create a duplicate.
   */
  put<T>(record: T, writtenAt?: string): StoredEnvelope<T> {
    const digest = digestOf(record);
    const envelope: StoredEnvelope<T> = {
      store: EVIDENCE_STORE_VERSION,
      digest,
      ...(writtenAt !== undefined ? { writtenAt } : {}),
      record,
    };
    this.init();
    const target = this.recordPath(digest);
    // Only write when absent: an existing record at this address has, by
    // definition, identical content, and rewriting it would churn the inode
    // and the mtime a consumer may be using as a recency signal.
    if (!existsSync(target)) {
      writeFileAtomic(target, JSON.stringify(envelope, null, 2) + "\n");
    }
    this.appendHistory(envelope);
    return envelope;
  }

  private recordPath(digest: string): string {
    // Sharded by the first two hex characters: a single directory with one
    // file per record becomes unlistable past a few thousand entries on
    // Windows, and the shard keeps any one directory small.
    return join(this.recordsDir, digest.slice(0, 2), `${digest}.json`);
  }

  /**
   * Read a record by address.
   *
   * CORRUPT is a distinct outcome from ABSENT on purpose. ABSENT means there
   * is no evidence; CORRUPT means there IS evidence and it cannot be trusted.
   * Collapsing them turns a damaged store into an empty one, and an empty
   * store reads as "nothing was ever proven".
   */
  get<T>(digest: string): ReadOutcome<T> {
    const path = this.recordPath(digest);
    if (!existsSync(path)) return { status: "ABSENT" };
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(path, "utf8"));
    } catch (error) {
      return {
        status: "CORRUPT",
        expected: digest,
        actual: "unparseable",
        reason: error instanceof Error ? error.message : "unreadable JSON",
      };
    }
    if (!isRecord(parsed) || !isRecord(parsed["record"])) {
      return {
        status: "CORRUPT",
        expected: digest,
        actual: "wrong-shape",
        reason: "envelope has no record object",
      };
    }
    const actual = digestOf(parsed["record"]);
    if (actual !== digest) {
      // The record was edited after it was written. Its address no longer
      // describes its contents, which is exactly the tamper this store exists
      // to catch.
      return {
        status: "CORRUPT",
        expected: digest,
        actual,
        reason:
          "content digest does not match its address — the record was modified in place",
      };
    }
    return { status: "OK", envelope: parsed as unknown as StoredEnvelope<T> };
  }

  has(digest: string): boolean {
    return existsSync(this.recordPath(digest));
  }

  /**
   * Compare-and-swap a record's content under a new address.
   *
   * Returns the NEW digest on success and null when the precondition fails.
   * The store is content-addressed, so "changing" a record cannot rewrite it:
   * the old address keeps its bytes forever and the new content gets its own.
   * What CAS protects is the caller's claim that the record they read is still
   * the record they are writing against.
   */
  compareAndSwap<T>(
    expectedDigest: string,
    record: T,
    writtenAt?: string,
  ): string | null {
    if (!this.has(expectedDigest)) return null;
    const previous = this.get(expectedDigest);
    if (previous.status !== "OK") return null;
    return this.put(record, writtenAt).digest;
  }

  /**
   * Append to the history log under the store lock.
   *
   * Append-only: nothing here ever rewrites or truncates. `appendFileSync` on
   * a local file is atomic for writes below the pipe-buffer size, and the
   * lock serializes writers above that.
   */
  private appendHistory(envelope: StoredEnvelope<unknown>): void {
    const line =
      JSON.stringify({ ...envelope, record: undefined, at: envelope.digest }) +
      "\n";
    withLock(this.lockPath, () => {
      appendFileSync(this.historyPath, line, "utf8");
    });
  }

  /**
   * Read the history, skipping a torn final line.
   *
   * A crash during append can leave a partial line. It is dropped and REPORTED
   * (via the returned `torn` count) rather than parsed leniently — a
   * half-parsed history entry is not history.
   */
  history(): { entries: string[]; torn: number } {
    if (!existsSync(this.historyPath)) return { entries: [], torn: 0 };
    const lines = readFileSync(this.historyPath, "utf8").split("\n");
    const entries: string[] = [];
    let torn = 0;
    for (const raw of lines) {
      const line = raw.trim();
      if (line.length === 0) continue;
      // Any line that does not parse is counted torn, wherever it is. A torn
      // final line is the crash case this is written for, but a damaged middle
      // line is at least as much a reason to distrust the log, and silently
      // skipping it either way would hide the difference.
      try {
        const parsed = JSON.parse(line) as unknown;
        if (isRecord(parsed) && typeof parsed["digest"] === "string") {
          entries.push(parsed["digest"]);
          continue;
        }
        torn++;
      } catch {
        torn++;
      }
    }
    return { entries, torn };
  }

  /**
   * Recovery pass: sweep stale temp files left by a crashed write.
   *
   * Returns how many were swept. A temp file is not evidence and must never be
   * read as if it were; sweeping them is what stops a crash loop from turning
   * into a store full of half-written records.
   */
  recover(): number {
    this.init();
    let swept = 0;
    for (const shard of safeReaddir(this.recordsDir)) {
      const dir = join(this.recordsDir, shard);
      if (!statSync(dir).isDirectory()) continue;
      swept += sweepStaleTempFiles(dir);
    }
    swept += sweepStaleTempFiles(this.root);
    return swept;
  }

  /** Every stored digest, sorted. For integrity audits, not for hot paths. */
  digests(): string[] {
    const out: string[] = [];
    for (const shard of safeReaddir(this.recordsDir)) {
      const dir = join(this.recordsDir, shard);
      if (!statSync(dir).isDirectory()) continue;
      for (const name of safeReaddir(dir)) {
        if (name.endsWith(".json") && !name.includes(".mjolnir-")) {
          out.push(name.replace(/\.json$/, ""));
        }
      }
    }
    return out.sort();
  }

  /**
   * Audit every record against its address.
   *
   * The whole-store integrity check. A store that reports its own corruption is
   * usable; one that silently serves damaged bytes is not.
   */
  audit(): {
    total: number;
    corrupt: Array<{ digest: string; reason: string }>;
  } {
    const corrupt: Array<{ digest: string; reason: string }> = [];
    const digests = this.digests();
    for (const digest of digests) {
      const outcome = this.get(digest);
      if (outcome.status === "CORRUPT") {
        corrupt.push({ digest, reason: outcome.reason });
      }
    }
    return { total: digests.length, corrupt };
  }
}

function safeReaddir(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

/**
 * Run `fn` while holding an exclusive lock, stealing a lock whose owner is
 * gone.
 *
 * A lock file that outlives a crashed process would wedge the store
 * permanently, so a lock older than LOCK_STALE_MS is removed and retaken. The
 * window is generous on purpose: stealing a live writer's lock is recoverable
 * (the content-addressed write is atomic either way), while a wedged store is
 * not.
 */
function withLock<T>(lockPath: string, fn: () => T): T {
  mkdirSync(join(lockPath, ".."), { recursive: true });
  let acquired = false;
  for (let attempt = 0; attempt < 200 && !acquired; attempt++) {
    try {
      // wx: exclusive. Exactly one writer wins.
      closeSync(openSync(lockPath, "wx"));
      acquired = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      let stale: boolean;
      try {
        stale = Date.now() - statSync(lockPath).mtimeMs > LOCK_STALE_MS;
      } catch {
        // The lock vanished between open and stat — retry immediately.
        continue;
      }
      if (stale) {
        try {
          unlinkSync(lockPath);
        } catch {
          /* another waiter stole it first */
        }
        continue;
      }
      // A held lock: back off with a busy wait. This path is rare (a handful
      // of appends per scan) and the alternative — an async API — would
      // propagate `await` through every caller in the scan pipeline.
      sleepSync(2);
    }
  }
  try {
    return fn();
  } finally {
    try {
      unlinkSync(lockPath);
    } catch {
      /* already gone */
    }
  }
}

function sleepSync(ms: number): void {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      /* spin */
    }
  }
}

export { atomicTempPath };
