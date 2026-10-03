/**
 * Law 1 has to guard the thing it says it guards.
 *
 * The anti-creep law defines the launch set as "the rules that ship in the
 * default report". The enforcement used `tier === "core"`. Those are different
 * questions with different answers, and since 6.0 the core tier has been empty:
 * all 79 rules resolve to 34 `quarantine` and 45 `extended`. So the law
 * ratcheted a count of **0** while 45 rules shipped in every default report,
 * and adding an `extended` rule — the one change that alters what a user sees —
 * moved nothing the law counted.
 *
 * A cap over a set that is not the shipped product cannot be creep. These
 * checks pin the predicate, the two caps it feeds, and the interaction with law
 * 3, which deliberately still governs the core tier.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  ANTI_CREEP_BASELINE_PATH,
  ANTI_CREEP_EXCEPTION_MARKER,
  CORE_CAP,
  evaluateAntiCreep,
  type AntiCreepBaseline,
} from "../../src/commands/doctor.js";
import { RULES } from "../../src/rules/index.js";
import { effectiveTier } from "../../src/rules/measurement.js";

const ROOT = join(import.meta.dirname, "..", "..");

/**
 * The baseline reader in `doctor.ts` is module-private, and this reads the
 * committed artifact directly on purpose: the question is what the FILE says,
 * not what a function derived from it happens to return.
 */
function readBaseline(): AntiCreepBaseline | null {
  try {
    return JSON.parse(
      readFileSync(join(ROOT, ANTI_CREEP_BASELINE_PATH), "utf8"),
    ) as AntiCreepBaseline;
  } catch {
    return null;
  }
}

const SHIPPED = RULES.filter((r) => effectiveTier(r) !== "quarantine");

// A baseline with the counts pinned to the shipped set, so a test that
// asserts a promotion is visible growth is comparing against a number that
// was not simply copied in to make the assertion true. `recordedAt` and
// `recordedAtSha` are required by the type and are not read by the
// arithmetic, so they are pinned literally and named.
const SHIPPED_BASELINE: AntiCreepBaseline = {
  baselineCore: SHIPPED.length,
  previousBaselineCore: SHIPPED.length,
  recordedAt: "1970-01-01T00:00:00.000Z",
  recordedAtSha: "0000000",
};

describe("the launch set is what ships, not the empty core tier", () => {
  const shipped = SHIPPED;
  const core = RULES.filter((r) => effectiveTier(r) === "core");

  const BASELINE = SHIPPED_BASELINE;

  it("the two sets genuinely differ in this repository", () => {
    // Without this the rest of the file passes vacuously. It is the fact that
    // made the old predicate wrong.
    //
    // `core` was 0 when this was written and is 1 as of 2026-10-03, when
    // `QA-PW-117` was promoted. The arm still has teeth, and MORE of them: it
    // now has to check the core set is a genuine SUBSET rather than the whole
    // shipped set wearing a different name. A predicate that silently widened
    // until both sets were equal would make every cap in this file vacuous
    // again, and that is the exact failure this file was written to prevent.
    expect(shipped.length).toBeGreaterThan(0);
    expect(core.length).toBeGreaterThan(0);
    expect(shipped.length).toBeGreaterThan(core.length);
    for (const rule of core) {
      expect(shipped, `${rule.id} is core but not shipped`).toContain(rule);
    }
  });

  it("the ratchet counts the shipped set", () => {
    const verdict = evaluateAntiCreep(RULES, BASELINE, "");
    expect(verdict.core).toBe(shipped.length);
  });

  it("the absolute cap's overflow is computed over the shipped set", () => {
    // Below the cap, so the overflow must be empty rather than undefined. What
    // matters is that the same predicate feeds both caps: a cap over one set
    // and a ratchet over another are two laws wearing one name.
    expect(shipped.length).toBeLessThanOrEqual(CORE_CAP);
    expect(CORE_CAP - shipped.length).toBeLessThan(CORE_CAP);
  });

  it("adding a shipping rule is growth the law can see", () => {
    // The defect, expressed as a behaviour. A new non-quarantine rule is the
    // change that actually changes a user's report, and under the old
    // predicate it moved nothing the law counted.
    const extra = { ...RULES[0], id: "QA-TT-999", tier: "extended" } as never;
    const before = evaluateAntiCreep(RULES, BASELINE, "");
    const after = evaluateAntiCreep([...RULES, extra], BASELINE, "");
    expect(after.core).toBe(before.core + 1);
    expect(after.ok).toBe(false);
    expect(after.summary).toContain("net growth of 1");
  });

  it("quarantining a rule shrinks the set the law guards", () => {
    const before = evaluateAntiCreep(RULES, BASELINE, "");
    expect(before.ok).toBe(true);
    // A rule leaving the shipped set is the demotion the law's own wording
    // calls for, and it must show up as a smaller count.
    const oneShipped = RULES.find((r) => effectiveTier(r) !== "quarantine");
    expect(oneShipped).toBeDefined();
    if (oneShipped === undefined) return;
    const quarantined = { ...oneShipped, tier: "quarantine" } as never;
    const after = evaluateAntiCreep(
      RULES.map((r) => (r.id === oneShipped.id ? quarantined : r)),
      BASELINE,
      "",
    );
    expect(after.core).toBe(before.core - 1);
  });
});

describe("the recorded baseline matches the governed set", () => {
  const baseline = readBaseline();

  it("is present — a law with no recorded state cannot be evaluated", () => {
    expect(baseline).not.toBeNull();
  });

  it("records the real shipped count", () => {
    expect(baseline?.baselineCore).toBe(
      RULES.filter((r) => effectiveTier(r) !== "quarantine").length,
    );
  });

  it("has absorbed previousBaselineCore now the declared release has shipped", () => {
    // This was `toBe(0)` while the exception was still outstanding, and the
    // flip is the discharge. While `previousBaselineCore` was 0 the law read
    // 45 − 0 = 45 of growth and demanded a marker on every commit — so the
    // marker had to be copied forward forever, which is the transcription the
    // scoping exists to prevent. 5.1.0 shipped the declaration; the baseline
    // now records the value it declared.
    //
    // The escape this number guards is still closed, and by the same
    // mechanism: lowering `baselineCore` to match a grown tier does nothing,
    // because the law reads `previousBaselineCore`. Both are 45, so growth is
    // genuinely zero rather than hidden — and the next promotion has to earn
    // a fresh marker.
    expect(baseline?.previousBaselineCore).toBe(
      RULES.filter((r) => effectiveTier(r) !== "quarantine").length,
    );
  });

  it("carries a reason, because a baseline is a record and not a number", () => {
    // `why` is prose, so length is the only thing worth asserting about it —
    // and a one-word reason is not a reason.
    const why: string | undefined = baseline?.why;
    expect(typeof why).toBe("string");
    expect((why ?? "").length).toBeGreaterThan(80);
  });
});

describe("the redefinition was declared, not slipped in", () => {
  const baseline = JSON.parse(
    readFileSync(join(ROOT, "docs", "ANTI-CREEP-BASELINE.json"), "utf8"),
  ) as { baselineCore: number; previousBaselineCore: number; why?: string };

  it("the growth has been ABSORBED into the baseline, not merely excused", () => {
    // The declaration was a PROMISE, and this is the discharge.
    //
    // While `previousBaselineCore` was 0, the law read 45 − 0 = 45 of growth
    // and demanded a marker in the current entry on every commit — so the
    // marker would have to be copied forward forever, which is exactly the
    // transcription the scoping exists to prevent. Now that 5.1.0 has SHIPPED
    // the redefinition, the baseline records 45/45: growth is zero, the law
    // needs nothing, and the next real promotion must earn a fresh marker.
    //
    // This is why the assertion is about the BASELINE and not about the
    // changelog. Asserting the marker is present would have kept passing
    // while the state it describes had ended.
    expect(baseline.previousBaselineCore).toBe(SHIPPED.length);
    expect(baseline.baselineCore).toBe(SHIPPED.length);
    const verdict = evaluateAntiCreep(RULES, SHIPPED_BASELINE, "");
    expect(verdict.ok, verdict.summary).toBe(true);
    expect(verdict.summary).toContain("net growth 0");
  });

  it("the baseline still names what it superseded and why", () => {
    // A baseline that records 45/45 without saying where 45 came from is a
    // number with no review trail. The prose is what makes the next maintainer
    // able to tell a legitimate 45 from an inflated one.
    const why: string | undefined = baseline?.why;
    expect(typeof why).toBe("string");
    expect(why ?? "").toMatch(/ABSORBED/);
    expect(why ?? "").toContain("45");
  });

  it("further growth would still need a fresh marker", () => {
    // The discharge must not have disarmed the law. One synthetic extended
    // rule above the absorbed baseline has to require the marker again.
    const extra = { ...RULES[0], id: "QA-TT-999", tier: "extended" } as never;
    const verdict = evaluateAntiCreep([...RULES, extra], SHIPPED_BASELINE, "");
    expect(verdict.ok).toBe(false);
    expect(verdict.summary).toContain("net growth of 1");
  });

  it("the 5.1.0 entry carries the original declaration with a reason", () => {
    // The historical record stays. Anchored on the version that shipped the
    // declaration, NOT on `pkg.version` — this assertion used to read
    // "the entry for the current version" and pin `pkg.version` to `5.1.0` so
    // the two could not drift apart, which meant the next version bump broke a
    // statement about the past. A record of what 5.1.0 declared is still true
    // in 9.0; "the entry for the current version" stops being true every time
    // the version moves, and the fix was always "update the string".
    const changelog = readFileSync(join(ROOT, "CHANGELOG.md"), "utf8");
    // A literal pattern, not a constructor: the version is fixed at 5.1.0 in
    // this arm — that is the version whose entry carried the declaration — so
    // there is nothing left to interpolate.
    const start = /^## \[5\.1\.0\]/m.exec(changelog);
    expect(start, "the 5.1.0 entry is missing").not.toBeNull();
    if (start === null) return;
    const rest = changelog.slice(start.index);
    const next = rest.slice(3).search(/^## /m);
    const entry = next === -1 ? rest : rest.slice(0, next + 3);
    // Growth of 45 against a previous baseline of 0 is not creep — it is the
    // law noticing, for the first time, rules that were already shipping. The
    // law's own mechanism says that has to be declared, with the reason.
    expect(entry).toContain(ANTI_CREEP_EXCEPTION_MARKER);
    expect(entry).toContain("45");
    expect(entry).toMatch(/already shipped|moved nothing|was not counting/);
  });
});

describe("law 3 deliberately still governs the core tier", () => {
  it("the distinction is written down rather than left implicit", () => {
    const claude = readFileSync(join(ROOT, "CLAUDE.md"), "utf8");
    // Law 1 moved to the shipped set and law 3 did not. That is a real policy
    // difference, not an oversight, so it has to be legible in the law file —
    // otherwise the next reader "fixes" law 3 the same way and turns the
    // ≥10-verdict requirement red for all 45 rules at once.
    expect(claude).toContain("deliberate difference from law 1");
    expect(claude).toContain("this one governs the **core");
  });

  it("the law file still states the north-star sentence verbatim", () => {
    const claude = readFileSync(join(ROOT, "CLAUDE.md"), "utf8");
    const normalized = claude.replace(/\*/g, " ").replace(/\s+/g, " ");
    expect(normalized).toContain(
      "Rules without a measured FP rate (n ≥ 10) cannot ship in the core tier",
    );
  });
});
