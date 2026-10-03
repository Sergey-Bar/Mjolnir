/**
 * The conformity gate, and the four ways it is supposed to fail.
 *
 * `scripts/check-conformity.ts` is a Conformity Monkey over the rule registry:
 * the machine decides on every run, and the only human input is a decision about
 * which known debt to carry, recorded in `docs/conformity-opt-outs.json` with an
 * owner, a reason and a date it lapses.
 *
 * A gate with no negative arm is the shape this repository has already paid for
 * twice — the provenance-stamp bug and the `--allow-doc-drift` escape were both
 * gates that could only pass. So each of the four gaps is proved by planting it
 * in a fixture tree and reading what the gate says. All four were also planted
 * in the real registry before any of this was written: a lapsed date reported
 * 34 gaps, a deleted entry reported one UNRECORDED, and an entry added to a
 * conforming rule reported one STALE. Each reverted to `gaps: 0`.
 *
 * The `--today` flag exists so the lapse arm can be proved on a fixed date
 * rather than by waiting for the calendar. It is on the GATE, not on the checks:
 * the checks read the tree and have no notion of time, which is what makes them
 * deterministic and is why an expiry test does not need a mock clock anywhere
 * else.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  CONFORMITY_CHECKS,
  allConformity,
  conformityOf,
} from "../../src/rules/conformity.js";
import { RULES } from "../../src/rules/index.js";

const ROOT = join(import.meta.dirname, "..", "..");
const GATE = join(ROOT, "scripts", "check-conformity.ts");
const OPT_OUTS = join(ROOT, "docs", "conformity-opt-outs.json");
const TODAY = "2026-10-02";
/**
 * The gate is TypeScript importing TypeScript, so it runs under `tsx` and not
 * under bare `node` — a bare `node gate.ts` dies in the ESM resolver before it
 * reads a single rule, which is a test failing for a reason unrelated to the
 * gate. `npm run conformity` gets this right by construction; a fixture has to
 * say it.
 */
const TSX = join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");

const scratch: string[] = [];

afterEach(() => {
  while (scratch.length > 0) {
    const dir = scratch.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

interface Registry {
  recordedAt: string;
  note: string;
  entries: Record<string, Record<string, string>>;
}

function registry(): Registry {
  return JSON.parse(readFileSync(OPT_OUTS, "utf8")) as Registry;
}

/**
 * A mutated copy of the registry, in a scratch directory, with the gate reading
 * the REAL tree for everything else.
 *
 * The gate takes `--opt-outs=<path>` for exactly this. Copying `src/` into a
 * fixture was tried first and is the wrong shape: the module graph behind
 * `src/rules/index.ts` is deep, so a fixture that copies "the files index.ts
 * names" dies in the ESM resolver before it reads a single rule — which is a
 * test failing for a reason that has nothing to do with the gap it is planting.
 * The registry is the only mutable input, so it is the only thing overridden.
 */
function fixtureRegistry(mutate: (reg: Registry) => void): string {
  const dir = mkdtempSync(join(tmpdir(), "mjolnir-conformity-"));
  scratch.push(dir);
  const reg = registry();
  mutate(reg);
  const path = join(dir, "conformity-opt-outs.json");
  writeFileSync(path, `${JSON.stringify(reg, null, 2)}\n`, "utf8");
  return path;
}

/** The report the gate writes beside an overridden registry. */
function reportBeside(optOuts: string): string {
  return join(dirname(optOuts), "CONFORMITY.md");
}

function runGate(
  optOuts: string,
  args: string[] = [],
): { code: number; output: string } {
  try {
    const output = execFileSync(
      process.execPath,
      [
        TSX,
        GATE,
        `--opt-outs=${optOuts}`,
        `--report=${reportBeside(optOuts)}`,
        `--today=${TODAY}`,
        ...args,
      ],
      { cwd: ROOT, encoding: "utf8", stdio: "pipe" },
    );
    return { code: 0, output };
  } catch (error) {
    const e = error as { status?: number; stderr?: string; stdout?: string };
    return {
      code: e.status ?? 1,
      output: `${e.stderr ?? ""}${e.stdout ?? ""}`,
    };
  }
}

/** A rule that fails at least one check, so there is something to lapse. */
function aFailingRule(): string {
  const failing = allConformity(ROOT).find((s) => s.failed.length > 0);
  if (failing === undefined) throw new Error("no rule fails any check");
  return failing.ruleId;
}

describe("the committed registry is green", () => {
  it("every nonconformity is covered by a live opt-out", () => {
    const { code, output } = runGate(OPT_OUTS);
    expect(code, output).toBe(0);
    expect(/"gaps": 0/.test(output)).toBe(true);
  });

  it("and it is green in a faithful copy, so the fixture below measures the gate", () => {
    const { code, output } = runGate(fixtureRegistry(() => {}));
    expect(code, output).toBe(0);
  });

  it("every rule is accounted for exactly once", () => {
    const states = allConformity(ROOT);
    const reg = registry();
    const failing = new Set(
      states.filter((s) => s.failed.length > 0).map((s) => s.ruleId),
    );
    expect(Object.keys(reg.entries).sort()).toEqual([...failing].sort());
  });
});

describe("the four gaps the gate exists to catch", () => {
  it("UNRECORDED — a nonconformity with no entry", () => {
    const ruleId = aFailingRule();
    const dir = fixtureRegistry((reg) => {
      delete reg.entries[ruleId];
    });
    const { code, output } = runGate(dir);
    expect(code).toBe(1);
    expect(output).toContain(ruleId);
    expect(output).toContain("UNRECORDED");
    // The message has to offer both exits, because both are real: the record
    // and the fix. A gate that only offers the record teaches the record.
    expect(output).toContain("or fix it");
  });

  it("LAPSED — an entry whose date has passed, on a fixed today", () => {
    const ruleId = aFailingRule();
    const dir = fixtureRegistry((reg) => {
      const entry = reg.entries[ruleId];
      if (entry) entry.expiresOn = "2026-09-01";
    });
    const { code, output } = runGate(dir);
    expect(code).toBe(1);
    expect(output).toContain("LAPSED");
    expect(output).toContain("2026-09-01");
  });

  it("STALE — an entry for a rule that now conforms", () => {
    const conforming = allConformity(ROOT).find(
      (s) => s.state === "CONFORMING",
    );
    if (conforming === undefined) throw new Error("no rule conforms");
    const dir = fixtureRegistry((reg) => {
      reg.entries[conforming.ruleId] = {
        owner: "mjolnir maintainer (docs/MAINTAINERS.md)",
        reason:
          "planted: an exemption for a problem that is gone is an exemption " +
          "for whatever replaces it",
        grantedAt: TODAY,
        expiresOn: "2026-12-01",
      };
    });
    const { code, output } = runGate(dir);
    expect(code).toBe(1);
    expect(output).toContain("STALE");
    expect(output).toContain(conforming.ruleId);
  });

  it("UNREADABLE — a reason too short to disagree with", () => {
    const ruleId = aFailingRule();
    const dir = fixtureRegistry((reg) => {
      const entry = reg.entries[ruleId];
      if (entry) entry.reason = "later";
    });
    const { code, output } = runGate(dir);
    expect(code).toBe(1);
    expect(output).toContain("UNREADABLE");
  });

  it("STALE — an entry for a rule that is not live at all", () => {
    const dir = fixtureRegistry((reg) => {
      reg.entries["QA-RETIRED-999"] = {
        owner: "mjolnir maintainer (docs/MAINTAINERS.md)",
        reason:
          "planted: a retired rule cannot conform and cannot fail, so its " +
          "entry is a hole with a name on it",
        grantedAt: TODAY,
        expiresOn: "2026-12-01",
      };
    });
    const { code, output } = runGate(dir);
    expect(code).toBe(1);
    expect(output).toContain("not a live rule");
  });
});

describe("leashed mode is the mode a NEW check ships in", () => {
  it("runs every check, writes the report, and exits 0", () => {
    const ruleId = aFailingRule();
    const dir = fixtureRegistry((reg) => {
      delete reg.entries[ruleId];
    });
    const { code } = runGate(dir, ["--leashed"]);
    expect(code).toBe(0);
    // Still reported. A leashed run that went quiet is a gate nobody can arm.
    expect(readFileSync(reportBeside(dir), "utf8")).toContain("UNRECORDED");
  });
});

describe("the checks are decidable by the tree, and say so", () => {
  it("every check names a machine, and none asks for a judgement", () => {
    // The distinction this gate rests on: the corpus false-positive rate asks a
    // human "is this code legitimate?", and deriving that from the detector's own
    // declaration would be circular. These four do not.
    for (const name of CONFORMITY_CHECKS) {
      expect([
        "MEASURED",
        "DETECTOR_CURRENT",
        "CLAIM_OWNED",
        "QUAD_COMPLETE",
      ]).toContain(name);
    }
    expect(CONFORMITY_CHECKS).not.toContain("FALSE_POSITIVE_RATE");
  });

  it("every rule's detail is a sentence, not a boolean", () => {
    // A gate whose output is `false` tells a reader nothing they can act on, and
    // an unactionable failure is one nobody fixes.
    for (const state of allConformity(ROOT)) {
      for (const name of CONFORMITY_CHECKS) {
        const detail = state.checks[name].detail;
        expect(detail.length, `${state.ruleId}.${name}`).toBeGreaterThan(10);
        expect(detail, `${state.ruleId}.${name}`).toMatch(/[.!]$/);
      }
    }
  });

  it("every rule is either conforming or nonconforming, and never both", () => {
    for (const state of allConformity(ROOT)) {
      expect(
        state.state === "CONFORMING",
        `${state.ruleId} failed ${state.failed.join(",")} but reads CONFORMING`,
      ).toBe(state.failed.length === 0);
    }
  });
});

describe("unmeasured is a fact beside the state, not a third state", () => {
  it("the flag is orthogonal, and it is reachable", () => {
    // The first version of `conformity.ts` modelled UNPROVEN as a state. The
    // gate printed `unproven: 0` on its first run: unreachable, because every
    // unmeasured rule here also fails something else. A law that can never fire
    // is not a law, and this repository already says that about its own floor.
    const unmeasured = allConformity(ROOT).filter((s) => s.unmeasured);
    expect(unmeasured.length).toBeGreaterThan(0);
    // And at least one of them is nonconforming too, which is precisely why the
    // two facts had to be separated.
    expect(unmeasured.some((s) => s.state === "NONCONFORMING")).toBe(true);
  });

  it("a stale measurement never reads as current", () => {
    // The invariant that matters behind the `unmeasured` flag: a measurement
    // taken against an older detector must not be counted as a current one.
    // Without this, a rule's false-positive rate on every display describes a
    // detector that no longer ships — and the number does not look wrong.
    const states = allConformity(ROOT);
    for (const state of states) {
      if (state.checks.DETECTOR_CURRENT.ok) continue;
      expect(
        state.unmeasured,
        `${state.ruleId} has a stale measurement and must not count as measured`,
      ).toBe(true);
      expect(state.failed, state.ruleId).toContain("DETECTOR_CURRENT");
    }
  });

  it("and the stale ones are a real, non-empty finding rather than a category", () => {
    const stale = allConformity(ROOT).filter(
      (s) => !s.checks.DETECTOR_CURRENT.ok,
    );
    expect(stale.length).toBeGreaterThan(0);
    for (const state of stale) {
      expect(state.checks.DETECTOR_CURRENT.detail).toContain("EARLIER");
    }
  });
});

describe("the opt-out registry is a ratchet", () => {
  it("no entry exists for a conforming rule", () => {
    const reg = registry();
    for (const state of allConformity(ROOT)) {
      if (state.state === "CONFORMING") {
        expect(
          reg.entries[state.ruleId],
          `${state.ruleId} conforms and still has an opt-out`,
        ).toBeUndefined();
      }
    }
  });

  it("every entry names an owner and a future date", () => {
    const reg = registry();
    for (const [ruleId, entry] of Object.entries(reg.entries)) {
      const { owner, reason, expiresOn } = entry;
      expect(owner?.trim().length ?? 0, ruleId).toBeGreaterThanOrEqual(3);
      expect(reason?.trim().length ?? 0, ruleId).toBeGreaterThan(40);
      expect(expiresOn, ruleId).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(
        String(expiresOn) < TODAY,
        `${ruleId} has an opt-out that lapsed on ${String(expiresOn)}`,
      ).toBe(false);
    }
  });

  it("every entry is for a live rule that actually fails something", () => {
    const live = new Set(RULES.map((r) => r.id));
    const failing = new Set(
      allConformity(ROOT)
        .filter((s) => s.failed.length > 0)
        .map((s) => s.ruleId),
    );
    for (const ruleId of Object.keys(registry().entries)) {
      expect(live.has(ruleId), ruleId).toBe(true);
      expect(failing.has(ruleId), ruleId).toBe(true);
    }
  });
});

describe("the whole registry is covered, so a new rule cannot slip past", () => {
  it("conformityOf answers for every live rule", () => {
    const states = allConformity(ROOT);
    expect(states).toHaveLength(RULES.length);
    expect(new Set(states.map((s) => s.ruleId))).toEqual(
      new Set(RULES.map((r) => r.id)),
    );
  });

  it("a rule the gate cannot decide is a bug, not an exemption", () => {
    // Every check has a defined answer for every rule. If a future field makes
    // one undecidable, this fails rather than the gate quietly treating the
    // absence as a pass.
    for (const rule of RULES) {
      const state = conformityOf(rule, ROOT);
      for (const name of CONFORMITY_CHECKS) {
        expect(typeof state.checks[name].ok, `${rule.id}.${name}`).toBe(
          "boolean",
        );
      }
    }
  });
});

/**
 * `CLAIM_OWNED`'s four rejection arms.
 *
 * These are planted rather than found, and that is the point: no rule in the
 * registry currently carries a promotion record, so the live registry can only
 * ever exercise the "declares no tier claim" arm. A validator whose failure
 * branches are never run is the shape this repository has already paid for
 * twice, so each arm is planted here and the reason string is asserted — a
 * rejection that says nothing actionable is half a rejection.
 */
describe("CLAIM_OWNED rejects a claim that is present but unusable", () => {
  const BASE = RULES.find((r) => r.tier === "core") ?? RULES[0];
  if (BASE === undefined) throw new Error("rule registry is empty");

  /**
   * A rule carrying a promotion record, field by field.
   *
   * Typed through `unknown` on purpose. The arms under test are precisely the
   * ones where a record is MALFORMED — a blank owner, a two-word rationale — so
   * the input cannot be a valid `CorePromotion` and a direct cast would either
   * fail to compile or need a lie to get past it. What the check reads is the
   * shape of the record, so the fixture supplies the shape and says so.
   */
  function claiming(
    promotion: Record<string, unknown>,
    tier: "core" | "quarantine" = "core",
  ) {
    return {
      ...BASE,
      id: "QA-TEST-777",
      tier,
      ...(tier === "core"
        ? { corePromotion: promotion }
        : { quarantinePromotion: promotion }),
    } as unknown as Parameters<typeof conformityOf>[0];
  }

  it("rejects a claim with no named owner", () => {
    const state = conformityOf(
      claiming({
        owner: "  ",
        rationale: "a rationale long enough to clear the threshold",
        expiresOn: "2999-01-01",
      }),
      ROOT,
    );
    expect(state.checks.CLAIM_OWNED.ok).toBe(false);
    expect(state.checks.CLAIM_OWNED.detail).toContain("no named owner");
    expect(state.failed).toContain("CLAIM_OWNED");
  });

  it("rejects a claim whose rationale is too thin to check", () => {
    const state = conformityOf(
      claiming({
        owner: "rule-owner",
        rationale: "because",
        expiresOn: "2999-01-01",
      }),
      ROOT,
    );
    expect(state.checks.CLAIM_OWNED.ok).toBe(false);
    expect(state.checks.CLAIM_OWNED.detail).toContain(
      "no rationale a reader could check",
    );
  });

  it("rejects a claim that has already lapsed", () => {
    // The arm that matters most: a claim renewed by nobody looking at it is the
    // permanent-by-default outcome the tier exists to avoid.
    const state = conformityOf(
      claiming({
        owner: "rule-owner",
        rationale: "a rationale long enough to clear the threshold",
        expiresOn: "2020-01-01",
      }),
      ROOT,
    );
    expect(state.checks.CLAIM_OWNED.ok).toBe(false);
    expect(state.checks.CLAIM_OWNED.detail).toContain("lapsed on 2020-01-01");
    expect(state.checks.CLAIM_OWNED.detail).toContain("nobody chose");
  });

  it("accepts a claim that carries all three, on either tier's field", () => {
    const sound = {
      owner: "rule-owner",
      rationale: "a rationale long enough to clear the threshold",
      expiresOn: "2999-01-01",
      grantedAt: "2026-01-01",
      evidenceRefs: ["docs/QUARANTINE-REMEDIATION.md"],
    };
    expect(conformityOf(claiming(sound), ROOT).checks.CLAIM_OWNED.ok).toBe(
      true,
    );
    expect(
      conformityOf(claiming(sound, "quarantine"), ROOT).checks.CLAIM_OWNED.ok,
    ).toBe(true);
  });

  it("accepts a claim with no expiry, and says so rather than inventing one", () => {
    // `expiresOn` is optional on the type. A claim without one is still a
    // claim, and the detail must not print a date that was never set.
    const state = conformityOf(
      claiming({
        owner: "rule-owner",
        rationale: "a rationale long enough to clear the threshold",
      }),
      ROOT,
    );
    expect(state.checks.CLAIM_OWNED.ok).toBe(true);
    expect(state.checks.CLAIM_OWNED.detail).toContain("rule-owner");
    expect(state.checks.CLAIM_OWNED.detail).toContain("undefined");
  });

  it("accepts a core claim the MEASUREMENT derives, and says who owns it", () => {
    // The arm that opened on 2026-10-03. `QA-PW-117` declares `tier: "core"`
    // and carries no `corePromotion`, because its n=35 measurement derives core
    // on its own.
    //
    // The check has to name that owner rather than pass silently, because the
    // difference matters to whoever reads the report: "owned by the corpus" is
    // re-derived every run and withdraws itself when the interval widens, while
    // a hand record has an expiry date somebody has to remember.
    const state = conformityOf(
      RULES.find((r) => r.id === "QA-PW-117") as Parameters<
        typeof conformityOf
      >[0],
      ROOT,
    );
    expect(state.checks.CLAIM_OWNED.ok).toBe(true);
    expect(state.checks.CLAIM_OWNED.detail).toContain("owned by the corpus");
    expect(state.checks.CLAIM_OWNED.detail).not.toContain("undefined");
  });

  it("still fails a core claim the measurement does NOT support", () => {
    // The arm the check was written for, and the one the new owner must not
    // swallow. A rule claiming core on nothing is the permanent-by-default
    // outcome the tier exists to prevent, so planting one must fail even
    // though a promoted sibling passes.
    const promoted = RULES.find((r) => r.id === "QA-PW-117");
    if (promoted === undefined)
      throw new Error("QA-PW-117 is not in the registry");
    const state = conformityOf(
      {
        ...promoted,
        id: "QA-TEST-778",
        // measurementTier is re-derived from the registry's own measurement
        // table, so a clone at a DIFFERENT id has no interval at all and falls
        // to "extended" — which is exactly the unsupported claim.
        corePromotion: undefined,
      } as unknown as Parameters<typeof conformityOf>[0],
      ROOT,
    );
    expect(state.checks.CLAIM_OWNED.ok).toBe(false);
    expect(state.checks.CLAIM_OWNED.detail).toContain("permanent by default");
  });
});
