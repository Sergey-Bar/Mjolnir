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

describe("the launch set is what ships, not the empty core tier", () => {
  const shipped = RULES.filter((r) => effectiveTier(r) !== "quarantine");
  const core = RULES.filter((r) => effectiveTier(r) === "core");

  it("the two sets genuinely differ in this repository", () => {
    // Without this the rest of the file passes vacuously. It is the fact that
    // made the old predicate wrong.
    expect(shipped.length).toBeGreaterThan(0);
    expect(core.length).toBe(0);
    expect(shipped.length).toBeGreaterThan(core.length);
  });

  it("the ratchet counts the shipped set", () => {
    const verdict = evaluateAntiCreep(
      RULES,
      {
        baselineCore: 45,
        previousBaselineCore: 45,
      },
      "",
    );
    expect(verdict.core).toBe(shipped.length);
  });

  it("the absolute cap's overflow is computed over the shipped set", () => {
    // Below the cap, so the overflow must be empty rather than undefined. What
    // matters is that the same predicate feeds both caps: a cap over one set
    // and a ratchet over another is two laws wearing one name.
    expect(shipped.length).toBeLessThanOrEqual(CORE_CAP);
    expect(CORE_CAP - shipped.length).toBeLessThan(CORE_CAP);
  });

  it("adding a shipping rule is growth the law can see", () => {
    // The defect, expressed as a behaviour. A new non-quarantine rule is the
    // change that actually changes a user's report, and under the old
    // predicate it moved nothing the law counted.
    const extra = { ...RULES[0], id: "QA-TT-999", tier: "extended" } as never;
    const before = evaluateAntiCreep(
      RULES,
      { baselineCore: 45, previousBaselineCore: 45 },
      "",
    );
    const after = evaluateAntiCreep(
      [...RULES, extra],
      { baselineCore: 45, previousBaselineCore: 45 },
      "",
    );
    expect(after.core).toBe(before.core + 1);
    expect(after.ok).toBe(false);
    expect(after.summary).toContain("net growth of 1");
  });

  it("quarantining a rule shrinks the set the law guards", () => {
    const before = evaluateAntiCreep(
      RULES,
      { baselineCore: 45, previousBaselineCore: 45 },
      "",
    );
    expect(before.ok).toBe(true);
    // A rule leaving the shipped set is the demotion the law's own wording
    // calls for, and it must show up as a smaller count.
    const oneShipped = RULES.find((r) => effectiveTier(r) !== "quarantine");
    expect(oneShipped).toBeDefined();
    if (oneShipped === undefined) return;
    const quarantined = { ...oneShipped, tier: "quarantine" } as never;
    const after = evaluateAntiCreep(
      RULES.map((r) => (r.id === oneShipped.id ? quarantined : r)),
      { baselineCore: 45, previousBaselineCore: 45 },
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

  it("leaves previousBaselineCore at 0 so the redefinition shows as growth", () => {
    // The law compares against the PREVIOUS value. Setting it to 45 in the same
    // edit would make a change to what the law governs read as a legal no-op —
    // the exact escape that comparison exists to close.
    expect(baseline?.previousBaselineCore).toBe(0);
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
  it("the unreleased changelog entry carries the exception with a reason", () => {
    const changelog = readFileSync(join(ROOT, "CHANGELOG.md"), "utf8");
    // The UNRELEASED entry, which is the first `## ` heading — not the file
    // preamble above it. Scoped the same way `exceptionInUnreleasedChangelog`
    // scopes it, because a marker in a past release is not a declaration for
    // this one.
    const first = changelog.search(/^## /m);
    expect(first, "CHANGELOG.md has no release heading").toBeGreaterThan(-1);
    const rest = changelog.slice(first);
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
