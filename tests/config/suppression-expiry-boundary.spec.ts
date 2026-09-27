/**
 * T6 — a clock-dependent verdict must be askable "as of when".
 *
 * `loadSuppressions` decides, per entry, whether a suppression is `active` or
 * `expired`, and it called `isSuppressionActive(ign, new Date())` with the
 * clock hard-coded at the call site. Two consequences, both of them about
 * trust rather than about bugs:
 *
 *   1. The same repository read on two days produced two different sets of
 *      live suppressions, and nothing recorded WHICH instant the answer was
 *      about. A suppression report is a statement about now; a statement
 *      whose subject is implicit cannot be checked.
 *   2. The boundary could only be tested by waiting for a real midnight. The
 *      repository's existing tests could therefore only test the far-from-the
 *      line cases, which is exactly how `isSuppressionActive`'s own timezone
 *      bug (audit 3.9) survived: `expires: <today>` behaved differently in
 *      UTC+3 and UTC-8, and the deep-equal harness hid it.
 *
 * The fix mirrors `computeSuppressionGovernanceGate` (suppression-governance.ts:51),
 * which already took `now: Date = new Date()` and threaded it. The durable
 * half is the source invariant at the end of this file.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { isSuppressionActive } from "../../src/config/config.js";
import { loadSuppressions } from "../../src/config/suppressions.js";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "mjolnir-suppression-clock-"));
  mkdirSync(join(root, ".mjolnir"), { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** Write a config carrying one ignore entry with the given expiry. */
function writeConfig(expires: string | null): void {
  writeFileSync(
    join(root, "mjolnir.config.json"),
    JSON.stringify({
      version: 1,
      ...(expires === null
        ? { ignore: [{ ruleId: "QA-TEST-001", reason: "known gap" }] }
        : {
            ignore: [
              {
                ruleId: "QA-TEST-001",
                reason: "known gap",
                expires,
              },
            ],
          }),
    }),
  );
}

/** The entry the fixtures above create, as config validation will hold it. */
const ENTRY = { ruleId: "QA-TEST-001", reason: "known gap" };

describe("T6: expiry is evaluated as of the instant the caller names", () => {
  it("the same config gives different answers for different `now`", () => {
    // The defect, stated as a property: one file, two instants, two answers —
    // and the caller could not have asked for either before.
    writeConfig("2026-09-10");
    const before = loadSuppressions(root, new Date("2026-09-09T23:59:59Z"));
    const after = loadSuppressions(root, new Date("2026-09-10T00:00:01Z"));
    expect(before.entries[0]?.status).toBe("active");
    expect(after.entries[0]?.status).toBe("expired");
    expect(before.total).toBe(1);
    expect(after.total).toBe(1);
    // "expired" is a different claim from "removed", and the report has to
    // keep both counts: a reader needs to see that something is still there.
    expect(after.expired).toBe(1);
    expect(after.active).toBe(0);
  });

  it("the suppression expires AT the start of its expiry date, not at the end", () => {
    // The exact boundary the old harness could not reach. `expires:
    // 2026-09-10` reads as "this stops applying on the 10th", and the
    // implementation is the strict comparison `utcMidnight(expires) >
    // utcMidnightOf(now)`. Audit 3.9 fixed the timezone drift by comparing
    // UTC midnights; this pins the RESULT, so a future change to
    // `utcMidnightOf` — or a `>=` that slipped in — fails here rather than
    // in production on a machine in a negative-offset timezone.
    const ign = { ...ENTRY, expires: "2026-09-10" };
    expect(isSuppressionActive(ign, new Date("2026-09-09T23:59:59Z"))).toBe(
      true,
    );
    expect(isSuppressionActive(ign, new Date("2026-09-10T00:00:00Z"))).toBe(
      false,
    );
    expect(isSuppressionActive(ign, new Date("2026-09-10T23:59:59Z"))).toBe(
      false,
    );
    expect(isSuppressionActive(ign, new Date("2026-09-11T00:00:00Z"))).toBe(
      false,
    );
  });

  it("an entry with no expiry date stays active, at any instant", () => {
    const ign = { ...ENTRY };
    expect(isSuppressionActive(ign, new Date("2026-09-10T00:00:00Z"))).toBe(
      true,
    );
    expect(isSuppressionActive(ign, new Date("2099-01-01T00:00:00Z"))).toBe(
      true,
    );
  });

  it("expiry follows the UTC day, not the local one — the timezone half", () => {
    // The bug audit 3.9 actually found, restated as a test. All three of
    // these instants are the SAME LOCAL DATE in their own zone, and they
    // split across the UTC-day boundary: the first is still the 9th in UTC
    // (active), the other two are the 10th in UTC (expired). Under the
    // pre-fix comparison against a local `now`, a UTC-8 machine would have
    // expired this suppression at 16:00 on the 9th — a day early.
    const ign = { ...ENTRY, expires: "2026-09-10" };
    const cases: Array<[string, boolean]> = [
      ["2026-09-10T00:30:00+08:00", true], // 2026-09-09T16:30Z — still the 9th
      ["2026-09-10T12:00:00Z", false],
      ["2026-09-09T20:00:00-08:00", false], // 2026-09-10T04:00Z
    ];
    for (const [at, expected] of cases) {
      expect(
        isSuppressionActive(ign, new Date(at)),
        `${at} (local date 2026-09-10, UTC date ${new Date(at)
          .toISOString()
          .slice(0, 10)})`,
      ).toBe(expected);
    }
  });

  it("the default parameter still answers, so no existing caller changed behaviour", () => {
    writeConfig("2099-01-01");
    const implicit = loadSuppressions(root);
    const explicit = loadSuppressions(root, new Date());
    expect(implicit).toEqual(explicit);
    expect(implicit.entries[0]?.status).toBe("active");
  });
});
