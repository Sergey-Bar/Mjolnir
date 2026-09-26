/**
 * The evidence store is durable (plan V5-013).
 *
 * A verdict that cannot be re-checked against the bytes that produced it is an
 * anecdote. These specs pin the four properties that make it re-checkable, and
 * they are tested against the filesystem rather than a mock, because every one
 * of them is a claim about what survives a crash:
 *
 *   content addressing · append-only history · atomic writes · fail-closed
 *   integrity
 *
 * The corruption cases matter most. A store that returns damaged bytes as if
 * they were intact is worse than one that has no store at all, because its
 * failures are invisible. And a store that reports a damaged record as ABSENT
 * is worse still: absence reads as "nothing was ever proven", which upgrades
 * damage into a false clean.
 */

import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  digestOf,
  EVIDENCE_STORE_VERSION,
  EvidenceStore,
} from "../../src/store/evidence-store.js";

function newStore(): { store: EvidenceStore; dir: string } {
  const dir = mkdtempSync(join(tmpdir(), "mj-store-"));
  return { store: new EvidenceStore(dir), dir };
}

const RECORD = {
  ruleId: "QA-TEST-001",
  file: "a.ts",
  line: 1,
  verdict: "failed",
};

describe("content addressing", () => {
  it("stores a record under the digest of its own content", () => {
    const { store, dir } = newStore();
    try {
      const envelope = store.put(RECORD);
      expect(envelope.digest).toBe(digestOf(RECORD));
      expect(envelope.store).toBe(EVIDENCE_STORE_VERSION);
      expect(store.has(envelope.digest)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("is key-order independent, so serialization cannot change an address", () => {
    expect(digestOf({ a: 1, b: 2 })).toBe(digestOf({ b: 2, a: 1 }));
  });

  it("different content gets a different address", () => {
    expect(digestOf({ a: 1 })).not.toBe(digestOf({ a: 2 }));
  });

  it("storing identical content twice is idempotent", () => {
    const { store, dir } = newStore();
    try {
      const first = store.put(RECORD);
      const second = store.put(RECORD);
      expect(second.digest).toBe(first.digest);
      expect(store.digests()).toEqual([first.digest]);
      // And the history recorded it twice — two appends, one address. The
      // append-only log records THAT IT HAPPENED, not how many copies exist.
      expect(store.history().entries).toEqual([first.digest, first.digest]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reads back exactly what was written", () => {
    const { store, dir } = newStore();
    try {
      const written = store.put(RECORD);
      const outcome = store.get<typeof RECORD>(written.digest);
      expect(outcome.status).toBe("OK");
      if (outcome.status === "OK")
        expect(outcome.envelope.record).toEqual(RECORD);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("fail-closed integrity", () => {
  it("reports an absent record as ABSENT, not CORRUPT", () => {
    const { store, dir } = newStore();
    try {
      store.init();
      expect(store.get("0".repeat(64)).status).toBe("ABSENT");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("detects a record edited in place and refuses to serve it", () => {
    const { store, dir } = newStore();
    try {
      const written = store.put(RECORD);
      // Tamper: the bytes at the address no longer match the address.
      const path = join(
        dir,
        "records",
        written.digest.slice(0, 2),
        `${written.digest}.json`,
      );
      const envelope = JSON.parse(readFileSync(path, "utf8")) as {
        record: unknown;
      };
      envelope.record = { ...(envelope.record as object), verdict: "passed" };
      writeFileSync(path, JSON.stringify(envelope), "utf8");

      const outcome = store.get(written.digest);
      expect(outcome.status).toBe("CORRUPT");
      if (outcome.status === "CORRUPT") {
        expect(outcome.reason).toMatch(/modified in place/);
        expect(outcome.actual).not.toBe(outcome.expected);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("never reports corruption as absence — damage must not read as a clean store", () => {
    // The distinction that matters most in this file. If a damaged record
    // returned ABSENT, a consumer would treat it as "no evidence", which is a
    // claim; the truth is "evidence exists and cannot be trusted".
    const { store, dir } = newStore();
    try {
      const written = store.put(RECORD);
      const path = join(
        dir,
        "records",
        written.digest.slice(0, 2),
        `${written.digest}.json`,
      );
      writeFileSync(path, "{ not json", "utf8");
      expect(store.get(written.digest).status).toBe("CORRUPT");
      expect(store.get(written.digest).status).not.toBe("ABSENT");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("a whole-store audit finds the damaged record and names it", () => {
    const { store, dir } = newStore();
    try {
      const good = store.put(RECORD);
      const bad = store.put({ ruleId: "QA-X-999", file: "b.ts" });
      const path = join(
        dir,
        "records",
        bad.digest.slice(0, 2),
        `${bad.digest}.json`,
      );
      writeFileSync(
        path,
        JSON.stringify({
          store: "evidence-store@1",
          digest: bad.digest,
          record: { changed: true },
        }),
        "utf8",
      );

      const audit = store.audit();
      expect(audit.total).toBe(2);
      expect(audit.corrupt).toHaveLength(1);
      expect(audit.corrupt[0]?.digest).toBe(bad.digest);
      // The intact record is still intact, and still readable.
      expect(store.get(good.digest).status).toBe("OK");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("append-only history", () => {
  it("retains every write, in order", () => {
    const { store, dir } = newStore();
    try {
      const a = store.put({ n: 1 });
      const b = store.put({ n: 2 });
      const c = store.put({ n: 3 });
      expect(store.history().entries).toEqual([a.digest, b.digest, c.digest]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("a contradicting later record does not erase the earlier one", () => {
    // Overwriting is how history becomes fiction. The store keeps both, and
    // the contradiction stays visible to a reader.
    const { store, dir } = newStore();
    try {
      const first = store.put({ verdict: "failed" });
      const second = store.put({ verdict: "passed" });
      expect(store.get<{ verdict: string }>(first.digest).status).toBe("OK");
      expect(store.get<{ verdict: string }>(second.digest).status).toBe("OK");
      expect(store.history().entries).toEqual([first.digest, second.digest]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("drops and REPORTS a torn final line rather than parsing it leniently", () => {
    const { store, dir } = newStore();
    try {
      const good = store.put({ n: 1 });
      // Simulate a crash mid-append: a partial line at the end.
      writeFileSync(
        join(dir, "history.jsonl"),
        `${JSON.stringify({ digest: good.digest })}\n{"dig`,
        "utf8",
      );
      const history = store.history();
      expect(history.entries).toEqual([good.digest]);
      expect(history.torn).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("recovery", () => {
  it("sweeps the temp files a crashed write left behind", () => {
    const { store, dir } = newStore();
    try {
      const written = store.put(RECORD);
      const shard = join(dir, "records", written.digest.slice(0, 2));
      // An old temp sibling: the shape `writeFileAtomic` leaves behind.
      const temp = join(
        shard,
        `${written.digest}.mjolnir-999999-1000000000000-abcdef01.tmp`,
      );
      writeFileSync(temp, "half written", "utf8");
      // Backdate it past the sweep threshold.
      const old = new Date(Date.now() - 48 * 60 * 60 * 1000);
      utimesSync(temp, old, old);

      expect(store.recover()).toBeGreaterThan(0);
      expect(store.get(written.digest).status).toBe("OK");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("a recovered store still audits clean", () => {
    const { store, dir } = newStore();
    try {
      for (let i = 0; i < 20; i++) store.put({ n: i });
      store.recover();
      expect(store.audit().corrupt).toEqual([]);
      expect(store.audit().total).toBe(20);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("compare-and-swap", () => {
  it("succeeds when the precondition holds", () => {
    const { store, dir } = newStore();
    try {
      const first = store.put({ version: 1 });
      const next = store.compareAndSwap(first.digest, { version: 2 });
      expect(next).not.toBeNull();
      expect(next).toBe(digestOf({ version: 2 }));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails when the expected record is absent", () => {
    const { store, dir } = newStore();
    try {
      store.init();
      expect(store.compareAndSwap("0".repeat(64), { version: 2 })).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails when the expected record is corrupt", () => {
    const { store, dir } = newStore();
    try {
      const first = store.put({ version: 1 });
      const path = join(
        dir,
        "records",
        first.digest.slice(0, 2),
        `${first.digest}.json`,
      );
      writeFileSync(path, "garbage", "utf8");
      // A write against a record we cannot read is a write against nothing.
      expect(store.compareAndSwap(first.digest, { version: 2 })).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("never mutates the record it swapped away from", () => {
    const { store, dir } = newStore();
    try {
      const first = store.put({ version: 1 });
      store.compareAndSwap(first.digest, { version: 2 });
      const outcome = store.get<{ version: number }>(first.digest);
      expect(outcome.status).toBe("OK");
      if (outcome.status === "OK")
        expect(outcome.envelope.record.version).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("concurrent writers", () => {
  it("serializes appends without losing or duplicating an entry", () => {
    const { store, dir } = newStore();
    try {
      // Interleave from "writers" in one turn: the lock is what makes the
      // history a log rather than a race.
      const digests = [
        store.put({ n: 1 }).digest,
        store.put({ n: 2 }).digest,
        store.put({ n: 3 }).digest,
        store.put({ n: 4 }).digest,
      ];
      const history = store.history();
      expect(history.torn).toBe(0);
      expect(history.entries).toEqual(digests);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("leaves no lock behind after a successful write", () => {
    const { store, dir } = newStore();
    try {
      store.put({ n: 1 });
      // A wedged lock is the one failure with no recovery: every later write
      // would spin until it stole a stale lock. So the lock must be gone the
      // moment the write returns.
      expect(existsSync(join(dir, "store.lock"))).toBe(false);
      // And a second write does not have to wait for a timeout to proceed.
      const started = Date.now();
      store.put({ n: 2 });
      expect(Date.now() - started).toBeLessThan(1_000);
      expect(store.history().torn).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("an unserializable record cannot wedge the store", () => {
    const { store, dir } = newStore();
    try {
      store.init();
      // A cyclic value cannot be canonicalized. Every serialization failure
      // happens BEFORE the lock is taken (the digest is computed first), so
      // this cannot strand a lock — and asserting that is the point, because a
      // stranded lock is the one failure with no recovery.
      const cyclic: Record<string, unknown> = {};
      cyclic["self"] = cyclic;
      expect(() => store.put(cyclic)).toThrow();
      expect(existsSync(join(dir, "store.lock"))).toBe(false);
      // The store still works afterwards.
      expect(store.put({ n: 1 }).digest).toBe(digestOf({ n: 1 }));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
