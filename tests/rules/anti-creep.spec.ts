/**
 * The anti-creep law (`CLAUDE.md` law 1) as an executable ratchet.
 *
 * Law 1 says "every addition to the launch set requires an equal-size
 * removal" and, before 6.0, named no launch set. `docs/ANTI-CREEP.md` fixes
 * it at the core tier — the rules that ship in the default report.
 *
 * `checkAntiCreep` used to count the tier and compare the count to
 * `CORE_CAP = 65`. With the tier empty after the 6.0 demotion, that left 65
 * free slots: the law was satisfied by any amount of growth, because the
 * number it compared against had been chosen before any rule could earn the
 * tier. The absolute cap stays — it is the 80% coverage floor of this check —
 * and the net-growth ratchet is the law.
 *
 * The shipped tree exercises the pass path. Every failure arm below is
 * synthetic, because no registry rule is in core and none can be promoted
 * without a `corePromotion` that the registry check now requires. A guard
 * whose failing branch has never run is not a guard, and asserting the
 * absence of violations is not a substitute for running the arithmetic.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ANTI_CREEP_EXCEPTION_MARKER,
  CORE_CAP,
  checkAntiCreep,
  checkCorePromotion,
  checkQuarantineOwnership,
  checkRegistry,
  checkTierEnforcement,
  exceptionInUnreleasedChangelog,
  evaluateAntiCreep,
  type AntiCreepBaseline,
} from "../../src/commands/doctor.js";
import { hasValidMeasurement } from "../../src/rules/measurement.js";
import type { CorePromotion, QADoctorRule } from "../../src/rules/rule.js";
import { RULES } from "../../src/rules/index.js";
import { effectiveTier } from "../../src/rules/measurement.js";

const SOUND_PROMOTION: CorePromotion = {
  rationale:
    "A mutable shared across tests is a defect regardless of how often it fires, " +
    "and the premise was reviewed against the module-level state model rather than read off a sample.",
  owner: "Sergey (maintainer)",
  grantedAt: "2026-09-28",
  expiresOn: "2026-12-27",
  evidenceRefs: [
    "tests/corpus/verdicts/QA-JV-101.jsonl",
    "docs/adr/0011-core.md",
  ],
};

/** A rule carrying a valid core measurement is the promotion path; synthetic. */
function coreRule(id: string): QADoctorRule {
  return {
    id,
    category: "QA-TEST",
    title: `synthetic core rule ${id}`,
    severity: "warning",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "FALSE-GREEN",
    appliesTo: "typescript",
    languages: ["typescript"],
    frameworks: ["vitest"],
    falsePositiveRisk: "low",
    autofix: false,
    detectionStrategy: "AST",
    introduced: "5.0.0",
    tier: "core",
    severityFallback: "warning",
  } as unknown as QADoctorRule;
}

/**
 * The baseline as the committed file now records it: the 45 rules that ship,
 * with the PREVIOUS value left at 0 so the redefinition reads as growth.
 *
 * The `recordedAtSha` here is a fixture, not the file's — the assertions that
 * care about the real one read `docs/ANTI-CREEP-BASELINE.json` directly.
 */
const BASELINE: AntiCreepBaseline = {
  baselineCore: 45,
  previousBaselineCore: 0,
  recordedAt: "2026-10-01",
  recordedAtSha: "a806496160aeefe64c1795823f90b64cce582835",
};

const NO_CHANGELOG = "## 5.0.0\n\nNothing about tiers here.\n";
const EXCEPTION_CHANGELOG =
  `## 5.0.0\n\n${ANTI_CREEP_EXCEPTION_MARKER}: QA-PW-117 re-sampled and its\n` +
  "interval now clears the 10% ceiling. Recorded by the maintainer.\n";

/** The two fixture rules: one with a live measurement, one without. */
const UNMEASURED = "QA-PW-147";
const MEASURED = "QA-PW-117";

/**
 * A shipped rule, re-typed as core.
 *
 * Looked up by id rather than hand-built so the measurement under test is the
 * real one, and returned as a value rather than asserted non-null at every
 * call site — a `!` that throws inside an expectation is a failure with a
 * stack trace instead of a named one.
 */
function asCore(id: string, extra: Partial<QADoctorRule> = {}): QADoctorRule {
  const rule = RULES.find((r) => r.id === id);
  if (rule === undefined) throw new Error(`no rule ${id} in RULES`);
  return { ...rule, ...extra, tier: "core" };
}
describe("the launch set is the shipped set, and the baseline is 45", () => {
  it("the shipped tree is the recorded count, and the growth is declared", () => {
    // The launch set is every rule that ships by default — effective tier
    // other than `quarantine` — which is 45 of 79. The core tier has been empty
    // since 6.0, so the old predicate counted 0 rules while 45 shipped.
    const shipped = RULES.filter(
      (r) => effectiveTier(r) !== "quarantine",
    ).length;
    expect(shipped).toBe(45);

    // With previousBaselineCore at 0, the move from 0 to 45 is growth — and it
    // is legal only because the unreleased changelog entry declares it. So the
    // no-changelog case is the one that must fail.
    const undeclared = evaluateAntiCreep(RULES, BASELINE, NO_CHANGELOG);
    expect(undeclared.core).toBe(shipped);
    expect(undeclared.ok).toBe(false);
    expect(undeclared.summary).toContain("net growth of 45");

    const declared = evaluateAntiCreep(
      RULES,
      BASELINE,
      `## Unreleased\n\n${ANTI_CREEP_EXCEPTION_MARKER}: the launch set was\n` +
        "redefined from an empty core tier to the 45 rules that ship.\n",
    );
    expect(declared.ok).toBe(true);
    expect(declared.core).toBe(shipped);
  });

  it("the committed baseline file parses and records the shipped count", () => {
    // The baseline is a data file precisely so it cannot be edited as a side
    // effect of editing the check. Reading it here means a malformed edit is
    // a failing test rather than an INCONCLUSIVE doctor line nobody reads.
    const baseline = JSON.parse(
      readFileSync(
        join(
          import.meta.dirname,
          "..",
          "..",
          "docs",
          "ANTI-CREEP-BASELINE.json",
        ),
        "utf8",
      ),
    ) as AntiCreepBaseline;
    expect(baseline.baselineCore).toBe(
      RULES.filter((r) => effectiveTier(r) !== "quarantine").length,
    );
    // `previousBaselineCore` stays 0 so the redefinition shows as growth
    // rather than as a legal no-op. The law compares against the PREVIOUS
    // value precisely so that lowering the current one in the same edit cannot
    // hide the change to what is governed.
    expect(baseline.previousBaselineCore).toBe(0);
    expect(baseline.recordedAtSha).toMatch(/^[0-9a-f]{40}$/);
  });

  it("the absolute cap is a guard, not the law", () => {
    // 65 against a shipped set of 45 is 20 free slots. This assertion exists
    // to make the distinction explicit: if CORE_CAP is ever raised to "make
    // room", the net-growth ratchet is the thing that still says no.
    expect(CORE_CAP).toBe(65);
    expect(
      evaluateAntiCreep(RULES, BASELINE, EXCEPTION_CHANGELOG).core,
    ).toBeLessThan(CORE_CAP);
  });
});

describe("net growth without a demotion is a failure", () => {
  it("one promotion above the baseline fails", () => {
    const verdict = evaluateAntiCreep(
      [coreRule("QA-PW-117")],
      BASELINE,
      NO_CHANGELOG,
    );
    expect(verdict.ok).toBe(false);
    expect(verdict.core).toBe(1);
    expect(verdict.summary).toContain("net growth of 1");
    expect(verdict.summary).toContain(ANTI_CREEP_EXCEPTION_MARKER);
  });

  it("a demotion of rules that were never in the tier is still growth", () => {
    // The law's actual shape: net growth ≤ 0. Two promotions and two
    // demotions is a legal rewrite of the launch set; the point is the NET.
    //
    // "In the tier" now means "ships by default", so a demotion is a move to
    // `quarantine` — `extended` is IN the set, not outside it. Under the old
    // predicate a rule re-typed `extended` left the count; under this one it
    // does not, which is the whole point of the change.
    const rules = [
      coreRule("QA-PW-117"),
      coreRule("QA-PY-002"),
      {
        ...coreRule("QA-JV-105"),
        id: "QA-JV-105",
        tier: "quarantine" as const,
      },
      {
        ...coreRule("QA-CS-102"),
        id: "QA-CS-102",
        tier: "quarantine" as const,
      },
    ];
    const verdict = evaluateAntiCreep(
      rules,
      { ...BASELINE, baselineCore: 0, previousBaselineCore: 0 },
      NO_CHANGELOG,
    );
    expect(verdict.core).toBe(2);
    // Growth of 2 with no demotion visible in the count is still growth: the
    // baseline is a count, and a demotion of a rule that was never in the
    // tier does not offset it. Asserted because it is the case that looks
    // legal and is not.
    expect(verdict.ok).toBe(false);
  });

  it("quarantine is the only demotion — extended is still in the launch set", () => {
    // Pinned explicitly because it is the property the predicate change rests
    // on, and because it is invisible in a test that only counts.
    const asExtended = { ...coreRule("QA-PW-117"), tier: "extended" as const };
    expect(
      evaluateAntiCreep(
        [asExtended],
        { ...BASELINE, baselineCore: 1 },
        NO_CHANGELOG,
      ).core,
    ).toBe(1);
    const asQuarantine = {
      ...coreRule("QA-PW-117"),
      tier: "quarantine" as const,
    };
    expect(
      evaluateAntiCreep(
        [asQuarantine],
        { ...BASELINE, baselineCore: 1 },
        NO_CHANGELOG,
      ).core,
    ).toBe(0);
  });

  it("an exception marker in CHANGELOG.md makes growth legal", () => {
    const verdict = evaluateAntiCreep(
      [coreRule("QA-PW-117")],
      { ...BASELINE, baselineCore: 1, previousBaselineCore: 0 },
      EXCEPTION_CHANGELOG,
    );
    expect(verdict.ok).toBe(true);
    expect(verdict.exceptionPresent).toBe(true);
    expect(verdict.summary).toContain("covered by an");
  });

  it("a marker from a PREVIOUS release does not license a new promotion", () => {
    // The escape the first version had open, and the one that would have
    // switched the law off permanently. `changelog.includes(marker)` over an
    // append-only file is true forever once any entry carries the string, so
    // the FIRST core promotion — the one this whole change set makes possible
    // — would have switched the law off for good.
    // Newest first, as a changelog actually reads. The marker sits in the
    // 5.0.0 entry, which is now the SECOND one down.
    const stale =
      "## 5.1.0\n\nA routine change with no tier movement.\n\n" +
      "## 5.0.0\n\n" +
      `${ANTI_CREEP_EXCEPTION_MARKER}: a promotion in a PAST release.\n`;
    expect(
      exceptionInUnreleasedChangelog(stale, ANTI_CREEP_EXCEPTION_MARKER),
    ).toBe(false);
    const verdict = evaluateAntiCreep(
      [coreRule("QA-PW-117")],
      { ...BASELINE, baselineCore: 1, previousBaselineCore: 0 },
      stale,
    );
    expect(verdict.ok).toBe(false);
    expect(verdict.summary).toContain("unreleased CHANGELOG entry");
  });

  it("a marker in the top entry DOES license it", () => {
    const fresh =
      "## 5.1.0\n\n" +
      `${ANTI_CREEP_EXCEPTION_MARKER}: QA-PW-117 re-sampled.\n\n` +
      "## 5.0.0\n\nAn older release.\n";
    expect(
      exceptionInUnreleasedChangelog(fresh, ANTI_CREEP_EXCEPTION_MARKER),
    ).toBe(true);
  });

  it("a marker in the release BELOW an empty [Unreleased] still licenses it", () => {
    // The release-cut case, and the reason the parser is not a "first `## `"
    // lookup any more.
    //
    // Cutting a release empties `[Unreleased]` — that is what the section is
    // for — and moves the change's notes into the version heading below it. A
    // strict top-heading lookup then stopped finding a declaration that had not
    // moved a single character, and the law reported legitimate growth as
    // unlicensed. That is a check that switches itself off at release time,
    // which is the worst moment for it to do anything.
    const cut =
      "## [Unreleased]\n\n" +
      "## [5.1.0] — 2026-10-01\n\n" +
      `${ANTI_CREEP_EXCEPTION_MARKER}: the launch set was redefined to the\n` +
      `rules that already shipped.\n\n` +
      "## [5.0.0] — 2026-09-27\n\nAn older release.\n";
    expect(
      exceptionInUnreleasedChangelog(cut, ANTI_CREEP_EXCEPTION_MARKER),
    ).toBe(true);
    const verdict = evaluateAntiCreep(
      [coreRule("QA-PW-117")],
      { ...BASELINE, baselineCore: 1, previousBaselineCore: 0 },
      cut,
    );
    expect(verdict.ok).toBe(true);
  });

  it("an empty [Unreleased] does not open the WHOLE file to old markers", () => {
    // The escape the release-cut handling must not reopen. A marker three
    // releases down is history; qualifying it would make the exemption
    // permanent again, which is the defect the scoping existed to fix.
    const stale =
      "## [Unreleased]\n\n" +
      "## [5.1.0] — 2026-10-01\n\nA routine change.\n\n" +
      "## [5.0.0] — 2026-09-27\n\n" +
      `${ANTI_CREEP_EXCEPTION_MARKER}: a promotion from a PAST release.\n`;
    expect(
      exceptionInUnreleasedChangelog(stale, ANTI_CREEP_EXCEPTION_MARKER),
    ).toBe(false);
  });

  it("a non-empty [Unreleased] shadows the release heading below it", () => {
    // Unreleased work has not been cut yet, so the notes for THAT change
    // belong in `[Unreleased]`. A marker in the release below it belongs to a
    // different change and must not license this one.
    const shadowed =
      "## [Unreleased]\n\nAn unrelated unreleased change.\n\n" +
      "## [5.1.0] — 2026-10-01\n\n" +
      `${ANTI_CREEP_EXCEPTION_MARKER}: a cut release's marker.\n`;
    expect(
      exceptionInUnreleasedChangelog(shadowed, ANTI_CREEP_EXCEPTION_MARKER),
    ).toBe(false);
  });

  it("lowering the baseline to match a grown tier is refused", () => {
    // The silent escape, and the reason the baseline records its own previous
    // value. Promoting one rule and lowering `baselineCore` from 0 to 1 makes
    // `core - baselineCore` zero — the law reads as satisfied, in one
    // uncross-checked JSON edit. The check compares against the PREVIOUS
    // baseline, so the growth is still visible and still needs a marker.
    const verdict = evaluateAntiCreep(
      [coreRule("QA-PW-117")],
      { ...BASELINE, baselineCore: 1, previousBaselineCore: 0 },
      NO_CHANGELOG,
    );
    expect(verdict.ok).toBe(false);
    expect(verdict.summary).toContain("against a previous baseline of 0");
  });

  it("a baseline with no recorded previous value falls back to itself", () => {
    // The permissive reading, and it is deliberate. A baseline file written
    // before `previousBaselineCore` existed cannot be judged against a state
    // it never recorded, and failing it on the day the rule lands would make
    // the gate unpassable for exactly the file that has to be updated. The
    // shipped baseline carries the field, so the fallback only ever applies
    // once, to a legacy file — and the asymmetry is stated here so nobody
    // later reads it as the check being lenient.
    const verdict = evaluateAntiCreep(
      [coreRule("QA-PW-117")],
      {
        baselineCore: 1,
        recordedAt: "2026-09-28",
        recordedAtSha: "0".repeat(40),
      },
      NO_CHANGELOG,
    );
    expect(verdict.ok).toBe(true);
    expect(verdict.summary).toContain("at or under the recorded baseline of 1");
  });

  it("the shipped baseline carries the field, so the fallback is not in play", () => {
    // If this ever regresses, every check above about the silent escape stops
    // meaning anything and the gate silently reverts to the lenient reading.
    const committed = JSON.parse(
      readFileSync(
        join(
          import.meta.dirname,
          "..",
          "..",
          "docs",
          "ANTI-CREEP-BASELINE.json",
        ),
        "utf8",
      ),
    ) as { previousBaselineCore?: number };
    expect(typeof committed.previousBaselineCore).toBe("number");
  });

  it("a demotion with the baseline correctly lowered needs no marker", () => {
    // The legitimate version of the same edit: the tier shrank, so the
    // baseline went down with it and the growth is negative.
    const verdict = evaluateAntiCreep(
      [],
      { ...BASELINE, baselineCore: 0, previousBaselineCore: 1 },
      NO_CHANGELOG,
    );
    expect(verdict.ok).toBe(true);
    expect(verdict.summary).toContain("net growth -1");
  });

  it("the marker must be the marker", () => {
    // "anti-creep exception" in prose is not the marker. A gate that matched
    // the concept rather than the string would accept a changelog that merely
    // discusses the law.
    for (const prose of [
      "## 5.0.0\n\nThis release discusses the anti-creep exception process.\n",
      "## 5.0.0\n\nanti-creep-exception: see the doc\n",
      "## 5.0.0\n\nANTI CREEP EXCEPTION\n",
    ]) {
      expect(
        evaluateAntiCreep([coreRule("QA-PW-117")], BASELINE, prose).ok,
        prose,
      ).toBe(false);
    }
  });

  it("the check renders the failing arm as a doctor check, not a pass", () => {
    const result = checkAntiCreep(
      [coreRule("QA-PW-117")],
      BASELINE,
      NO_CHANGELOG,
    );
    expect(result.status).toBe("fail");
    expect(result.details.join("\n")).toContain("net growth of 1");
  });
});

describe("a missing or unreadable baseline is inconclusive, not a pass", () => {
  // G2/22: a check that cannot be evaluated never renders as pass. The
  // distinction from a violation is reported separately, because "the law has
  // no recorded state" and "the law was broken" call for different responses.
  it("a null baseline blocks", () => {
    const verdict = evaluateAntiCreep(RULES, null, NO_CHANGELOG);
    expect(verdict.ok).toBe(false);
    expect(verdict.baseline).toBeNull();
    expect(verdict.summary).toContain("INCONCLUSIVE");
  });

  it("the check says so in words a maintainer can act on", () => {
    const result = checkAntiCreep(RULES, null, NO_CHANGELOG);
    expect(result.status).toBe("fail");
    expect(result.details.join("\n")).toContain("INCONCLUSIVE, not a pass");
  });

  it("an exception marker does not excuse a missing baseline", () => {
    // Otherwise the marker becomes a universal bypass: delete the file, add a
    // changelog line, ship anything.
    const verdict = evaluateAntiCreep(RULES, null, EXCEPTION_CHANGELOG);
    expect(verdict.ok).toBe(false);
    expect(verdict.summary).toContain("INCONCLUSIVE");
  });
});

describe("corePromotion is a record, not a boolean", () => {
  const sound = SOUND_PROMOTION;

  it("a sound record produces no problems", () => {
    expect(checkCorePromotion(sound, "2026-10-01")).toEqual([]);
  });

  it("an unowned claim is rejected", () => {
    const problems = checkCorePromotion(
      { ...sound, owner: "  " },
      "2026-10-01",
    );
    expect(problems.join("\n")).toContain("no owner");
  });

  it("a rationale shorter than an argument is rejected", () => {
    const problems = checkCorePromotion(
      { ...sound, rationale: "seemed fine" },
      "2026-10-01",
    );
    expect(problems.join("\n")).toContain("rationale is too short");
  });

  it("an expired grant is rejected by name and date", () => {
    const problems = checkCorePromotion(sound, "2027-01-01");
    expect(problems.join("\n")).toContain("EXPIRED on 2026-12-27");
  });

  it("a grant longer than 180 days is rejected as a tier in disguise", () => {
    const problems = checkCorePromotion(
      { ...sound, grantedAt: "2026-01-01", expiresOn: "2026-12-27" },
      "2026-10-01",
    );
    expect(problems.join("\n")).toContain("rather than a grant");
  });

  it("a malformed date is named, with the value", () => {
    const problems = checkCorePromotion(
      { ...sound, expiresOn: "December" },
      "2026-10-01",
    );
    expect(problems.join("\n")).toContain('expiresOn "December"');
  });

  it("an expiry before the grant is rejected", () => {
    const problems = checkCorePromotion(
      { ...sound, grantedAt: "2026-09-28", expiresOn: "2026-09-01" },
      "2026-10-01",
    );
    expect(problems.join("\n")).toContain("precedes grantedAt");
  });

  it("an expiry equal to the grant is legal — a one-day grant is a decision", () => {
    expect(
      checkCorePromotion(
        { ...sound, grantedAt: "2026-10-01", expiresOn: "2026-10-01" },
        "2026-10-01",
      ),
    ).toEqual([]);
  });

  it("a sound record still needs its dates in order, so the order check is not skipped when grantedAt is malformed", () => {
    // Two malformed dates at once must produce BOTH messages. An `else` on the
    // expiry branch would report only one and let the other through until a
    // human noticed.
    const problems = checkCorePromotion(
      { ...sound, grantedAt: "nope", expiresOn: "also nope" },
      "2026-10-01",
    );
    expect(problems.length).toBe(2);
  });
});

describe("a declared core rule on a thin measurement needs the record", () => {
  // A rule with NO valid measurement. QA-PW-117 is the wrong fixture here: it
  // carries a current measurement, so `hasValidMeasurement` is true and the
  // promotion requirement never arms — the first version of this suite used
  // it and asserted a failure the code correctly did not report. The
  // distinction is the whole design: the record is for claims the corpus
  // cannot support, not a second source of truth for a measured claim.
  it("QA-PW-147 really is unmeasured, so the fixture is measuring what it claims", () => {
    const rule = RULES.find((r) => r.id === UNMEASURED);
    expect(rule, `no rule ${UNMEASURED} in RULES`).toBeDefined();
    if (rule === undefined) return;
    expect(hasValidMeasurement(rule)).toBe(false);
  });

  it("no registry rule is in core, so the registry check has nothing to demand", () => {
    // The counterpart to the demotion ratchet: 6.0 demoted the nineteen, and
    // this asserts the tier is still empty so a future promotion cannot arrive
    // without tripping `checkRegistry`'s corePromotion requirement.
    expect(RULES.filter((r) => r.tier === "core")).toEqual([]);
  });

  it("the registry check reports a core rule carrying no promotion", () => {
    const result = checkRegistry([asCore(UNMEASURED)]);
    expect(result.status).toBe("fail");
    expect(result.details.join("\n")).toContain(
      "without a corePromotion record",
    );
  });

  it("and reports one that carries a defective promotion", () => {
    const result = checkRegistry([
      asCore(UNMEASURED, {
        corePromotion: {
          rationale: "x",
          owner: "",
          grantedAt: "nope",
          expiresOn: "nope",
          evidenceRefs: [],
        },
      }),
    ]);
    expect(result.status).toBe("fail");
    const text = result.details.join("\n");
    expect(text).toContain("rationale is too short");
    expect(text).toContain("no owner");
  });

  it("a core rule WITH a valid measurement is not asked for a promotion", () => {
    // The design, stated as a test: the measurement is the record. Requiring a
    // hand-written rationale beside it would be a second source of truth for
    // the same fact, and it would expire a claim the corpus is already
    // supporting.
    const result = checkRegistry([asCore(MEASURED)]);
    expect(result.status).toBe("pass");
    expect(result.details.join("\n")).not.toContain("corePromotion");
  });

  it("a promotion on a measured rule is not rejected — it is simply not required", () => {
    // Direction matters: the check must not become a trap that refuses a
    // maintainer's extra documentation.
    const result = checkRegistry([
      asCore(MEASURED, { corePromotion: SOUND_PROMOTION }),
    ]);
    expect(result.status).toBe("pass");
  });
});

describe("the quarantine tier has the same owner/date/exit obligation", () => {
  // The mirror of `corePromotion`. A rule in quarantine asserts that it is
  // NOT trusted, and an assertion nobody owns and nobody re-examines is
  // permanent by default — which is the outcome the tier exists to avoid.
  //
  // Reported rather than fatal until the field is populated, the same shape
  // the 6.0 demotion ratchet shipped in. The point is that the backlog is
  // VISIBLE from the first run, not that CI is red on the day the check lands.
  it("every live quarantine rule is counted, and every one is currently unowned", () => {
    const quarantined = RULES.filter((r) => r.tier === "quarantine");
    expect(quarantined.length).toBeGreaterThan(0);
    const unowned = quarantined.filter(
      (r) => r.quarantinePromotion === undefined,
    );
    expect(unowned.length, "the backlog shrank — update this assertion").toBe(
      quarantined.length,
    );
  });

  it("the doctor says so in one line, and names the obligation", () => {
    const result = checkQuarantineOwnership();
    expect(result.status, result.details.join("\n")).toBe("pass");
    const summary = result.details[0] ?? "";
    expect(summary).toMatch(/quarantine rules carry no quarantinePromotion/);
    // The failure direction: a count that FALLS must not be a failure. If it
    // were, the check could only be satisfied by filling the field in, and
    // filling a field in is not the same as deciding a rule's fate.
    expect(summary).toContain("permanent by default");
  });

  it("a quarantine rule that DOES carry a defective promotion is blocking", () => {
    // The report is permissive about absence and strict about presence: a
    // malformed record is a claim someone made badly, and it is treated as
    // such immediately.
    const quarantined = RULES.find((r) => r.tier === "quarantine");
    expect(
      quarantined,
      "no quarantine rule to build the case from",
    ).toBeDefined();
    if (quarantined === undefined) return;
    const broken: QADoctorRule = {
      ...quarantined,
      quarantinePromotion: {
        rationale: "x",
        owner: "",
        grantedAt: "2020-01-01",
        expiresOn: "2020-02-01",
        evidenceRefs: [],
      },
    };
    const result = checkQuarantineOwnership([broken]);
    expect(result.status).toBe("fail");
    const text = result.details.join("\n");
    expect(text).toContain("quarantinePromotion");
    expect(text).toContain("no owner");
  });

  it("an unexpired, owned quarantine promotion is accepted", () => {
    const quarantined = RULES.find((r) => r.tier === "quarantine");
    expect(quarantined).toBeDefined();
    if (quarantined === undefined) return;
    const result = checkQuarantineOwnership([
      {
        ...quarantined,
        quarantinePromotion: SOUND_PROMOTION,
      },
    ]);
    expect(result.status, result.details.join("\n")).toBe("pass");
    // The backlog line now reads 0/1, which is the check's whole point: a
    // rule WITH a record stops being counted. Asserted on the count rather
    // than the absence of a word, because the summary always mentions the
    // field.
    expect(
      result.details[0],
      "the backlog line did not fall to zero",
    ).toContain("0/1 quarantine rules");
  });
});

describe("the Law #3 ratchet is not vacuous on an empty tier", () => {
  // The ratchet used to count only rules with fewer than 10 classified
  // verdicts, and the 6.0 demotion emptied core — so MAX_UNMEASURED_CORE = 0
  // was satisfied by an empty set and the next promotion would have arrived
  // with the check already green. A rule is now accounted for by a
  // measurement OR by an unexpired `corePromotion`; anything else counts.
  const VERDICTS = join(import.meta.dirname, "..", "corpus", "verdicts");

  it("the shipped tree has no core rules, and says so rather than claiming a pass", () => {
    const result = checkTierEnforcement(VERDICTS);
    expect(result.status).toBe("pass");
    expect(result.details[0]).toContain("0 core rules");
    expect(result.details[0]).toContain("Vacuous by construction");
  });

  it("a core rule with neither a measurement nor a promotion is unaccounted", () => {
    // The case the old check could not see. QA-PW-147 is unmeasured and
    // carries no `corePromotion`, so declaring it core must fail the ratchet
    // at cap 0 — which is exactly what the previous version's empty-set pass
    // would have missed.
    const result = checkTierEnforcement(VERDICTS, [asCore(UNMEASURED)]);
    expect(result.status).toBe("fail");
    expect(result.details.join("\n")).toContain("no corePromotion");
  });

  it("an unexpired corePromotion accounts for a rule the corpus cannot support", () => {
    // The legitimate route. It is not a hole: the record names an owner and an
    // expiry, and `checkRegistry` independently refuses a core claim without
    // one.
    const result = checkTierEnforcement(VERDICTS, [
      asCore(UNMEASURED, { corePromotion: SOUND_PROMOTION }),
    ]);
    expect(result.status).toBe("pass");
    expect(result.details.join("\n")).toContain("core tier on a corePromotion");
    expect(result.details.join("\n")).toContain("owner");
  });

  it("an EXPIRED promotion does not account for anything", () => {
    // Otherwise the expiry is decorative: a lapsed grant would keep satisfying
    // the ratchet forever, which is precisely the tier-in-disguise the record's
    // own `expiresOn` field exists to prevent.
    const result = checkTierEnforcement(VERDICTS, [
      asCore(UNMEASURED, {
        // `grantedAt` moved with it, so the ONLY defect is the lapse. A
        // promotion that is both backdated and expired reports the ordering
        // problem first, which is the more useful of the two and would
        // otherwise mask the one this test is about.
        corePromotion: {
          ...SOUND_PROMOTION,
          grantedAt: "2025-10-01",
          expiresOn: "2026-01-01",
        },
      }),
    ]);
    expect(result.status).toBe("fail");
    expect(result.details.join("\n")).toContain("DEFECTIVE corePromotion");
    expect(result.details.join("\n")).toContain("EXPIRED");
  });

  it("a promotion with no owner does not account for anything", () => {
    // Per P9 an unowned claim is a default. The ratchet must agree with the
    // registry check, or the two would disagree about the same rule.
    const result = checkTierEnforcement(VERDICTS, [
      asCore(UNMEASURED, {
        corePromotion: { ...SOUND_PROMOTION, owner: "" },
      }),
    ]);
    expect(result.status).toBe("fail");
    expect(result.details.join("\n")).toContain("no owner");
  });

  it("a measured core rule needs no promotion", () => {
    // QA-PW-117 carries live verdicts, so the measurement is the record and
    // the ratchet is satisfied without one. Asserted on the COUNT rather than
    // the word "unaccounted", which appears in the summary line of every
    // result and would have made this pass for the wrong reason.
    const result = checkTierEnforcement(VERDICTS, [asCore(MEASURED)]);
    expect(result.status).toBe("pass");
    expect(result.details[0]).toContain("0/1 core rules unaccounted");
    // And nothing below the summary names this rule as a problem.
    expect(result.details.slice(1)).toEqual([]);
  });
});
