/**
 * The brand gate, inside `npm test`.
 *
 * CI runs `npm run brand:doctor` as its own step, which is the blocking
 * gate. This runs the same rule functions in-process so a local
 * `npm test` catches brand drift too — the same reason the repository
 * locks its generated assets both in CI and in a spec.
 *
 * It asserts three things, and the second two matter as much as the
 * first:
 *
 *   - no hard findings
 *   - every known-open entry still fires (a stale allowlist is how a
 *     gate quietly becomes decoration)
 *   - the allowlist is well-formed: every entry names the phase that
 *     closes it and gives a reason
 */

import { describe, expect, it } from "vitest";

// The gate is plain Node and deliberately dependency-free, so it has no
// types; the shapes it returns are declared below and asserted here.
import { KNOWN_OPEN, runAll } from "../../scripts/brand-doctor.mjs";

interface Finding {
  known?: string;
  text?: string;
}
interface Rule {
  n: number;
  name: string;
  gap?: string;
  failures?: (string | Finding)[];
}

const rules = (runAll() as Rule[]).filter((r) => !r.gap);
const findings = rules.flatMap((r) =>
  (r.failures ?? []).map((f) => ({ rule: r.n, f })),
);

describe("brand doctor", () => {
  it("reports no hard findings", () => {
    const hard = findings
      .filter(({ f }) => typeof f === "string")
      .map(({ rule, f }) => `rule ${rule}: ${f as string}`);
    expect(
      hard,
      `${hard.length} brand finding(s) — run \`npm run brand:doctor\` for the detail`,
    ).toEqual([]);
  });

  it("every known-open entry still fires", () => {
    // The ratchet. An entry that no longer fires means the debt was paid
    // and the allowlist was not updated — from then on it is silencing
    // something nobody has looked at.
    const fired = new Set(
      findings
        .filter(({ f }) => typeof f !== "string")
        .map(({ f }) => (f as Finding).known),
    );
    const stale = (KNOWN_OPEN as { id: string; phase: string }[])
      .filter((k) => !fired.has(k.id))
      .map((k) => `${k.id} (${k.phase})`);
    expect(
      stale,
      "these known-open entries no longer fire — remove them from KNOWN_OPEN",
    ).toEqual([]);
  });

  it("every known-open entry names a phase and a reason", () => {
    for (const k of KNOWN_OPEN as {
      id: string;
      phase?: string;
      reason?: string;
    }[]) {
      expect(k.phase, `${k.id} has no phase`).toBeTruthy();
      expect(k.reason, `${k.id} has no reason`).toBeTruthy();
      // A one-word reason is not a reason. The allowlist is the one place
      // where "why is this still open" has to be written down.
      expect(
        (k.reason ?? "").length,
        `${k.id}'s reason is too thin`,
      ).toBeGreaterThan(30);
    }
  });
});
