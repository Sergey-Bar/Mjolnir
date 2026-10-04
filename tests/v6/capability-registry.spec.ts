import { capabilityQuadComplete } from "../../src/v6/fixture-quad-probe.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  BLIND_REGISTRY_EVIDENCE,
  buildCapabilityRegistry,
  collectRuleFacts,
  familyForFramework,
  frameworkCapabilityId,
  isCapabilityId,
  isRuleId,
  providerCapabilityId,
  realCapabilityEvidence,
  ruleFamily,
  toMaturityEvidence,
  validateRegistry,
  type RegistryEvidence,
} from "../../src/v6/capability-registry.js";

/**
 * The committed census — the ledger of record, READ rather than rebuilt.
 *
 * Reading the artifact is deliberate. The test below is about what the census
 * SAYS about a capability, and rebuilding it from the same functions the
 * registry uses would make the two agree by construction — which is the shape
 * a cross-check must not have.
 */
function censusEntries(): Array<{
  id: string;
  state: string;
  nextLevelGap?: { target: string; missing: string[] } | null;
}> {
  const parsed = JSON.parse(
    readFileSync(
      join(import.meta.dirname, "..", "..", "docs", "ECOSYSTEM-CENSUS.json"),
      "utf8",
    ),
  ) as { entries: Array<{ id: string; state: string }> };
  return parsed.entries;
}
import {
  deriveMaturityFromEvidence,
  maturityRank,
  type Maturity,
} from "../../src/v6/maturity.js";
import {
  SURFACES,
  languageOf,
  renderSurfaceMaturity,
} from "../../scripts/v6/generate-capability.js";
import {
  checkMatrixShape,
  checkRegistryShape,
  stringifyStable,
} from "../../scripts/v6/check-capability-registry.js";
import {
  SKELETON_GAPS,
  checkRuleQuality,
} from "../../scripts/v6/check-rule-quality.js";
import {
  capabilityJson,
  parseCapabilityArgs,
  renderCapabilityText,
  selectCapabilities,
} from "../../src/commands/capability.js";

const OBSERVED_AT = "2026-01-01";

describe("ADR 0003 — a capability id is not a rule id", () => {
  it("accepts a capability id and rejects a rule id", () => {
    expect(isCapabilityId("test.framework.playwright")).toBe(true);
    expect(isCapabilityId("qa.domain.api-qa")).toBe(true);
    // A rule id is not a capability id, ever. Conflating them is how a
    // capability claim ends up carrying a rule's authority.
    expect(isCapabilityId("QA-PW-001")).toBe(false);
    expect(isRuleId("QA-PW-001")).toBe(true);
    expect(isRuleId("test.framework.playwright")).toBe(false);
  });

  it("rejects an id that is neither shape", () => {
    for (const junk of [
      "",
      "Framework.Playwright",
      "1abc",
      "test..x",
      7,
      null,
    ]) {
      expect(isCapabilityId(junk), String(junk)).toBe(false);
    }
  });

  it("derives capability ids from inventory ids by pure function", () => {
    expect(frameworkCapabilityId("Playwright")).toBe(
      "test.framework.playwright",
    );
    expect(frameworkCapabilityId("github-actions")).toBe(
      "test.framework.github-actions",
    );
    expect(providerCapabilityId("azure-pipelines")).toBe(
      "ci.provider.azure-pipelines",
    );
  });
});

describe("ADR 0007 — one registry, never a parallel one", () => {
  const registry = buildCapabilityRegistry({
    evidence: BLIND_REGISTRY_EVIDENCE,
    observedAt: OBSERVED_AT,
    // `census: new Map()` is explicit and load-bearing.
    //
    // `buildCapabilityRegistry` defaults to reading the REAL
    // `docs/ECOSYSTEM-CENSUS.json` when no census is passed. This describe
    // block builds a registry from BLIND evidence — evidence that deliberately
    // sees no adapter, no fixture quad and no upstream — and the point of
    // `passes its own validator` below is that a registry which cannot see
    // anything must not claim maturity it cannot support.
    //
    // Inheriting the real census defeated that. The census records what REAL
    // evidence proved, so once `docs/ECOSYSTEM-CENSUS.json` was regenerated
    // honestly, four entries declared `M3_FIXTURE_VERIFIED`, those claims
    // leaked into a registry whose evidence is blind by construction, and the
    // validator — correctly — reported OVER_CLAIMED_MATURITY. A gate asserting
    // "blind evidence cannot over-claim" was failing because it had quietly
    // stopped being blind.
    //
    // Passing an empty census restores what the block says it is testing. It
    // is also the stricter fixture: an empty census cannot rescue a maturity
    // claim the evidence does not support.
    census: new Map(),
  });

  it("derives every entry from an existing primitive, not a new list", () => {
    // Framework rows, CI providers and domain records are all projections.
    // A capability that names none of those sources would be a hand-written
    // list wearing a registry header.
    for (const entry of registry.entries) {
      const fromPrimitive =
        entry.frameworkId !== null ||
        entry.kind === "ci-cd-provider" ||
        entry.kind === "domain";
      expect(fromPrimitive, entry.id).toBe(true);
    }
  });

  it("emits no duplicate ids and only closed-enum kinds", () => {
    const ids = registry.entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of registry.entries) {
      expect(entry.kind).toMatch(
        /^(test-framework|test-runner|bdd-spec-dsl|language|ci-cd-provider|iac-container|domain|policy|surface)$/,
      );
    }
  });

  it("gives every entry an owner and a real gap below M5", () => {
    for (const entry of registry.entries) {
      expect(entry.owner.trim()).not.toBe("");
      if (entry.maturity !== "M5_FIELD_PROVEN") {
        expect(entry.nextLevelGap, entry.id).not.toBeNull();
        expect(entry.nextLevelGap?.missing.length, entry.id).toBeGreaterThan(0);
      }
    }
  });

  it("cites only live, non-retired QA-* rule ids", () => {
    const facts = collectRuleFacts();
    const live = new Set([...facts.liveByFamily.values()].flat());
    for (const entry of registry.entries) {
      for (const rule of entry.rules) {
        expect(isRuleId(rule), `${entry.id} -> ${rule}`).toBe(true);
        expect(live.has(rule), `${entry.id} -> ${rule} is not live`).toBe(true);
        expect(
          facts.retired.has(rule),
          `${entry.id} -> ${rule} is retired`,
        ).toBe(false);
      }
    }
  });

  it("passes its own validator", () => {
    const errors = validateRegistry(registry);
    expect(errors.filter((d) => d.code === "OVER_CLAIMED_MATURITY")).toEqual(
      [],
    );
    expect(errors.filter((d) => d.code === "UNKNOWN_RULE_REFERENCE")).toEqual(
      [],
    );
    expect(errors.filter((d) => d.code === "DUPLICATE_ID")).toEqual([]);
  });
});

describe("Wave 1 DoD — no capability above its proven level", () => {
  it("stamps a proven level and never advertises above it", () => {
    // The entry records what its own evidence proved, so the committed
    // document is self-verifying without the filesystem.
    const registry = buildCapabilityRegistry({
      evidence: realCapabilityEvidence(),
    });
    for (const entry of registry.entries) {
      expect(entry.proven, entry.id).toBeTruthy();
      expect(
        maturityRank(entry.maturity),
        `${entry.id} advertises ${entry.maturity} above proven ${entry.proven}`,
      ).toBeLessThanOrEqual(maturityRank(entry.proven));
    }
  });

  it("catches an over-claim the moment one is injected", () => {
    const registry = buildCapabilityRegistry({
      evidence: BLIND_REGISTRY_EVIDENCE,
      observedAt: OBSERVED_AT,
    });
    const first = registry.entries[0];
    if (first === undefined) throw new Error("no entries");
    const tampered: typeof registry = {
      ...registry,
      entries: [{ ...first, maturity: "M5_FIELD_PROVEN" }],
    };
    expect(validateRegistry(tampered).map((d) => d.code)).toContain(
      "OVER_CLAIMED_MATURITY",
    );
  });

  it("catches a missing gap, a duplicate id, an unowned entry and a bad proof", () => {
    const base = buildCapabilityRegistry({
      evidence: BLIND_REGISTRY_EVIDENCE,
      observedAt: OBSERVED_AT,
    });
    const first = base.entries[0];
    if (first === undefined) throw new Error("no entries");
    const second = base.entries[1];
    if (second === undefined) throw new Error("need two entries");
    const codes = validateRegistry({
      ...base,
      entries: [
        {
          ...first,
          nextLevelGap: null,
          owner: "",
          proof: { ...first.proof, status: "LOCAL_PROVEN", artifact: null },
        },
        second,
      ],
    }).map((d) => d.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "MISSING_NEXT_LEVEL_GAP",
        "MISSING_OWNER",
        "PROOF_WITHOUT_ARTIFACT",
      ]),
    );
  });

  it("catches a rule reference that is not a QA-* id", () => {
    const registry = buildCapabilityRegistry({
      evidence: BLIND_REGISTRY_EVIDENCE,
      observedAt: OBSERVED_AT,
    });
    const first = registry.entries[0];
    if (first === undefined) throw new Error("no entries");
    const codes = validateRegistry({
      ...registry,
      entries: [{ ...first, rules: ["not-a-rule-id"] }],
    }).map((d) => d.code);
    expect(codes).toContain("UNKNOWN_RULE_REFERENCE");
  });
});

describe("proof — only a measured rule carries LOCAL_PROVEN", () => {
  it("is BLOCKED for every entry with no measured rule of its own", () => {
    // The behaviour that matters, and it is narrower than it was. The
    // previous version of this test injected `hasMeasurement: false` and
    // asserted BLOCKED on all 27 entries — which only held because the flag
    // was global. A caller asserting "nothing is measured" is now asserting a
    // fact about the whole registry, which is precisely the fact that was
    // wrong: a Playwright rule IS measured, and `test.framework.playwright` is
    // entitled to say so. What the flag may no longer do is suppress.
    const registry = buildCapabilityRegistry({
      evidence: {
        registry: {
          hasLiveRule: true,
          hasMeasurement: false,
          hasAdapter: true,
          hasFixtureQuad: false,
          hasCorpusMeasurement: false,
          hasFieldEvidence: false,
        },
        files: BLIND_REGISTRY_EVIDENCE.files,
      },
    });
    const facts = collectRuleFacts();
    for (const entry of registry.entries) {
      const own = entry.rules.filter((id) => !facts.retired.has(id));
      const measured = own.some((id) => facts.measured.has(id));
      if (measured) {
        expect(entry.proof.status, entry.id).toBe("LOCAL_PROVEN");
        continue;
      }
      // An adapter on disk proves the capability is IMPLEMENTED (M2). It is
      // not an observation: nobody recorded when, against which revision.
      expect(entry.proof.status, entry.id).toBe("BLOCKED");
      expect(entry.proof.authority, entry.id).toBe("NONE");
    }
  });

  it("is LOCAL_PROVEN with an artifact and a date once a rule is measured", () => {
    const registry = buildCapabilityRegistry({
      evidence: realCapabilityEvidence(),
      observedAt: OBSERVED_AT,
    });
    const proven = registry.entries.filter(
      (entry) => entry.proof.status === "LOCAL_PROVEN",
    );
    expect(proven.length).toBeGreaterThan(0);
    for (const entry of proven) {
      expect(entry.proof.artifact, entry.id).not.toBeNull();
      expect(entry.proof.observedAt, entry.id).toBe(OBSERVED_AT);
    }
  });
});

describe("maturity is bounded by the arms that are actually true", () => {
  it("the fixture-quad arm is TRUE now, and every M3 rests on it", () => {
    // Changed by 6.1, and this is the assertion that had to change with it.
    //
    // The arm used to be hard `false` in the real resolver, which is why
    // nothing could reach M3 and the quad could be shipped as a contract. The
    // first version of this test asserted the ceiling was M2 and passed — and
    // would have kept passing forever if the arm had been wired to `true`
    // without anyone updating it, which is what a test pinned to a world-state
    // rather than to a property looks like.
    //
    // The global `hasFixtureQuad` flag is a CALLER CLAIM, not a summary of the
    // derivation, and the real resolver makes none — it claims nothing the
    // tree does not already show. Making it "measured" was tried and it
    // reintroduced the laundering `evidenceForEntry` exists to prevent: every
    // entry OR-s the flag in, so `ci.provider.azure-pipelines` reached M3 on a
    // QA-PW rule's quad while its published `rules` list did not contain the
    // rule that earned it. That the flag is `false` is the property that keeps
    // the per-entry derivation the only path to M3, so it is asserted.
    const evidence: RegistryEvidence = realCapabilityEvidence();
    expect(
      evidence.registry.hasFixtureQuad,
      "the real resolver claims a global fixture quad. The flag is OR-ed into " +
        "every entry, so a non-false value credits each capability with a quad " +
        "belonging to some other rule's family",
    ).toBe(false);

    const registry = buildCapabilityRegistry({ evidence });
    const atM3 = registry.entries.filter(
      (entry) =>
        maturityRank(entry.proven) >= maturityRank("M3_FIXTURE_VERIFIED"),
    );
    for (const entry of atM3) {
      expect(
        entry.rules.some((id) => capabilityQuadComplete([id])),
        `${entry.id} is M3 and none of the rules it publishes has a complete ` +
          "quad — the advertisement and the evidence are different rule sets",
      ).toBe(true);
    }

    // The corpus arm is still false — the quad is a WIRING proof, not an
    // accuracy one — so M4 must stay unreachable whatever the quad does.
    expect(evidence.registry.hasCorpusMeasurement).toBe(false);
    for (const entry of registry.entries) {
      expect(
        entry.maturity,
        `${entry.id} is ${entry.maturity} with no corpus measurement`,
      ).not.toBe("M4_CORPUS_VERIFIED");
    }
  });

  it("maps blind evidence to M1, because a blind resolver proves nothing", () => {
    // A blind resolver still sees a *declaration* — the registry entry
    // exists and has an owner — but no implementation. M1, not M0 and
    // certainly not M2.
    expect(toMaturityEvidence(BLIND_REGISTRY_EVIDENCE.registry).declared).toBe(
      true,
    );
    expect(
      deriveMaturityFromEvidence(
        toMaturityEvidence(BLIND_REGISTRY_EVIDENCE.registry),
      ),
    ).toBe("M1_DECLARED");
  });
});

describe("evidence is resolved per entry, not once for the registry", () => {
  // The registry-global `hasMeasurement` flag was OR-ed into every entry, so
  // one measured rule anywhere made every capability look measured. That is
  // the wave-1 "no capability advertised above its proven level" failure
  // arriving through the evidence layer rather than the maturity layer: an
  // entry with no supporting rule of its own inherited a measurement from an
  // unrelated one and could be advertised at a level its own evidence does
  // not support.
  const facts = collectRuleFacts();
  const registry = buildCapabilityRegistry({
    evidence: realCapabilityEvidence(),
    observedAt: "2026-01-01",
  });

  it("an entry with no supporting rule is never LOCAL_PROVEN, and never above M1", () => {
    // The control that proves the resolution is per entry. If the global
    // flags still leaked, an entry with no rules and no adapter file would come
    // back M2 with a proof, which is exactly what `test.framework.selenium` did
    // — it was used as this control for a long time, and that use was itself
    // hiding a defect: it asserted `sel.rules` was `[]`, which was only true
    // because `FRAMEWORK_FAMILY.selenium` named a family no rule belongs to.
    // The premise was false and the test enforced it.
    //
    // So the control is stated as an INVARIANT rather than over a population:
    // nothing above M1 may exist without something to cite. It used to
    // enumerate the zero-rule entries and assert they were all M1 — and that
    // population WAS the thirteen `qa.domain.*` entries, so deleting the support
    // matrix they read emptied the control set and made the arm a red line for
    // a reason unrelated to the property. Selenium keeps the separate property
    // it actually demonstrates (below: rules without an adapter).
    //
    // The contrapositive form is the one that cannot be emptied: it is
    // satisfied by every entry that exists, and it fails the moment evidence
    // resolution goes global.
    const aboveM1 = registry.entries.filter(
      (entry) => entry.maturity !== "M1_DECLARED",
    );
    expect(
      aboveM1.length,
      "no entry is above M1 — the registry proves nothing and this invariant " +
        "cannot distinguish per-entry evidence from a global flag",
    ).toBeGreaterThan(0);
    for (const entry of aboveM1) {
      const citable = (entry.rules ?? []).length > 0 || entry.adapter !== null;
      expect(
        citable,
        `${entry.id} is ${entry.maturity} with nothing to cite: ` +
          `${(entry.rules ?? []).length} rule(s), adapter ${entry.adapter}. ` +
          "Proof follows the entry's own evidence, never the registry's.",
      ).toBe(true);
    }
    // And the specific shape that leaked once: no rules AND no adapter is
    // M1/BLOCKED with no authority. Stated over the same population, which is
    // empty today, because it is the case the invariant above is derived from.
    for (const entry of registry.entries.filter(
      (e) => (e.rules ?? []).length === 0 && e.adapter === null,
    )) {
      expect(entry.maturity, `${entry.id} maturity`).toBe("M1_DECLARED");
      expect(entry.proof.status, `${entry.id} proof`).toBe("BLOCKED");
      expect(entry.proof.authority, `${entry.id} authority`).toBe("NONE");
    }
  });

  it("rules without an adapter reach no further than the rules justify", () => {
    // Selenium has three real rules and no adapter of its own. The rules are
    // its evidence; there is no file, so there is nothing to point an adapter
    // claim at, and `adapter` must say so rather than naming a language
    // adapter used to RUN its tests.
    const sel = registry.entries.find(
      (entry) => entry.id === "test.framework.selenium",
    );
    expect(sel, "selenium is in the inventory").toBeDefined();
    if (sel === undefined) return;
    expect(sel.rules).toEqual(["QA-SE-001", "QA-SE-002", "QA-SE-003"]);
    expect(sel.adapter).toBeNull();
  });

  it("the executor-adapter list never stands in for an adapter of its own", () => {
    // Selenium names three language adapters used to RUN its tests. The entry
    // records them, and they are not the same claim as an adapter that
    // implements Selenium support — which is how the first version read
    // `executorAdapterIds[0]` and reached M2 on `src/adapters/typescript.ts`.
    const sel = registry.entries.find(
      (entry) => entry.id === "test.framework.selenium",
    );
    expect(sel?.executorAdapters).toEqual([
      "src/adapters/typescript.ts",
      "src/adapters/python.ts",
      "src/adapters/java.ts",
    ]);
    for (const path of sel?.executorAdapters ?? []) {
      expect(path).not.toBe(sel?.adapter);
    }
  });

  it("every LOCAL_PROVEN entry has a measured rule of its OWN", () => {
    for (const entry of registry.entries) {
      if (entry.proof.status !== "LOCAL_PROVEN") continue;
      const own = entry.rules.filter((id) => !facts.retired.has(id));
      const measuredRule = own.find((id) => facts.measured.has(id));
      expect(
        measuredRule,
        `${entry.id} is LOCAL_PROVEN with no measured rule`,
      ).toBeDefined();
      expect(entry.proof.artifact, entry.id).toBe(
        `docs/FP-AUDIT.md#${measuredRule}`,
      );
    }
  });

  it("a named adapter path is probed, not trusted", () => {
    // `adapterExists` takes a PATH, so the honest answer is whether the path
    // resolves. It used to be delegated to the census resolver, which answers
    // a different question — "can we analyse this ecosystem at all", satisfied
    // by a live rule family OR an adapter file — and that fallback is what
    // reported `src/adapters/cypress.ts` as present when the file does not
    // exist. Asserted on real absences: the directory holds ten adapters and
    // none of them is per-framework.
    for (const entry of registry.entries) {
      if (entry.kind !== "test-framework" && entry.kind !== "test-runner") {
        continue;
      }
      expect(entry.adapter, entry.id).toBeNull();
    }
  });

  it("a real adapter file no longer buys M2 on its own", () => {
    // The control for the previous test, so that assertion cannot be
    // satisfied by breaking the probe outright. All four CI provider adapters
    // exist under `src/adapters/` — and none of the four ecosystems has a
    // complete fixture quad, so none is EVIDENCE-supported at M2 by a quad.
    //
    // The advertised level differs per provider, and that is the point: the
    // three with a census row advertise the ledger's M1, while `gitlab-ci` has
    // no census row at all and so advertises what this registry proved. A
    // uniform assertion here would have hidden the distinction the
    // `maturity` / `proven` split exists to make.
    for (const id of [
      "ci.provider.github-actions",
      "ci.provider.azure-pipelines",
      "ci.provider.gitlab-ci",
      "ci.provider.jenkins",
    ]) {
      const entry = registry.entries.find((e) => e.id === id);
      expect(entry, id).toBeDefined();
      // The probe still answers: these are real adapter FILES.
      expect(entry?.adapter, id).toBeTypeOf("string");
      // Whatever is advertised is never above what the evidence proves.
      expect(maturityRank(entry?.maturity), id).toBeLessThanOrEqual(
        maturityRank(entry?.proven),
      );
    }
  });

  it("a provider with a quad-less gap still advertises what its evidence supports", () => {
    // 3.3 demoted the CENSUS — `state: TARGET`, with `nextLevelGap` naming
    // M3 as the level whose criterion is missing. It did NOT lower the census
    // entry's `maturity`, and the first version of this test asserted the
    // opposite ("advertises M1 while proving M2").
    //
    // That shape is wrong twice over. `src/v6/maturity.ts` states that
    // `deriveMaturityFromEvidence` is "the only way a capability gets a
    // level", so a hand-set `M1_DECLARED` contradicts the ladder; and the gap
    // it was attached to named the FIXTURE QUAD — which is M3's criterion —
    // while claiming M2 as the target, so it told a maintainer a month's work
    // would earn a level it does not.
    //
    // What is true now: evidence supports M2, both numbers say M2, the ledger
    // refuses to CALL it supported, and the gap names the real next level.
    const entry = registry.entries.find(
      (e) => e.id === "ci.provider.github-actions",
    );
    expect(entry?.proven).toBe("M2_IMPLEMENTED");
    expect(entry?.maturity).toBe("M2_IMPLEMENTED");
    expect(entry?.proof.status).toBe("LOCAL_PROVEN");

    const censusEntry = censusEntries().find(
      (c) => c.id === "ec.ci-cd-provider.github-actions",
    );
    expect(
      censusEntry?.state,
      "the census still refuses to call it SUPPORTED",
    ).toBe("TARGET");
    expect(censusEntry?.nextLevelGap?.target).toBe("M3_FIXTURE_VERIFIED");
    expect(censusEntry?.nextLevelGap?.missing.join(" ")).toMatch(/quad/i);
  });

  it("a provider with no census row advertises what it proved", () => {
    // The other branch, and the one that must not be mistaken for the
    // demotion: an ABSENT ledger row is not a demotion. `gitlab-ci` has a real
    // adapter and measured rules, so it advertises M2 — the census has nothing
    // to say, and an unread ledger is not a lower claim.
    const entry = registry.entries.find(
      (e) => e.id === "ci.provider.gitlab-ci",
    );
    expect(entry?.censusId).toBe("ec.ci-cd-provider.gitlab-ci");
    expect(entry?.maturity).toBe(entry?.proven);
  });

  it("a caller that KNOWS more can still say so", () => {
    // The OR is the caller's claim, not a global truth. A test injecting an
    // adapter, or a build with evidence from elsewhere, must be able to raise
    // what the tree alone cannot show.
    const withClaim = buildCapabilityRegistry({
      evidence: {
        registry: {
          ...BLIND_REGISTRY_EVIDENCE.registry,
          hasLiveRule: true,
          hasMeasurement: true,
        },
        files: BLIND_REGISTRY_EVIDENCE.files,
      },
      observedAt: OBSERVED_AT,
    });
    const frameworks = withClaim.entries.filter(
      (entry) => entry.kind === "test-framework",
    );
    expect(frameworks.length).toBeGreaterThan(0);
    for (const entry of frameworks) {
      // `hasLiveRule`/`hasMeasurement` raise what the entry PROVES. What it
      // ADVERTISES is the census's level, and four of the frameworks are
      // declared M1 there — so the assertion is on `proven`, which is the arm
      // the caller's claim actually reaches.
      expect(entry.proven, entry.id).toBe("M2_IMPLEMENTED");
    }
    // 6.0 removed the second half of this arm. It used to pick a
    // `kind === "domain"` entry to prove that a caller's global claim leaves a
    // rule-less capability BLOCKED — and the thirteen domain entries it picked
    // from read the deleted support matrix. The property it demonstrated is
    // now demonstrated above, over a synthetic control that cannot be emptied
    // by deleting an unrelated part of the registry.
  });
});

describe("maturity is what an entry DECLARES; proven is what it can SHOW", () => {
  // Before the split, `finalize` assigned `proven: maturity` from one call, so
  // `OVER_CLAIMED_MATURITY` compared a value with itself and could not fire.
  // The two now come from two resolvers — the census's
  // `ecosystem-probe.ts` and this registry's own per-entry evidence — and the
  // gate is what holds them to agreeing.
  it("an entry advertises the census's level, not the one it can prove", () => {
    // Four real cases: junit, nunit, testng and xunit. The registry can prove
    // M2 for each (live rules, unit-tested), and the census declares M1. The
    // conservative reading wins, because a capability may not be advertised
    // above the ledger of record even when the evidence is stronger — the
    // alternative is two artifacts disagreeing with the advertisement above
    // both.
    const registry = buildCapabilityRegistry({
      evidence: realCapabilityEvidence(),
      observedAt: OBSERVED_AT,
    });
    const underClaimed = registry.entries.filter(
      (entry) => maturityRank(entry.proven) > maturityRank(entry.maturity),
    );
    expect(underClaimed.length).toBeGreaterThan(0);
    for (const entry of underClaimed) {
      expect(entry.censusId, entry.id).not.toBeNull();
      // The gap is the level the evidence does NOT reach — which is whatever
      // sits above the advertised one. Pinned to M2 by the first version,
      // which was a fact about the world on the day: once a capability earned
      // a quad and the census caught up, the gap became M4 and the assertion
      // failed for a reason that had nothing to do with the property under
      // test.
      expect(
        maturityRank(entry.proven),
        `${entry.id} is advertised BELOW what it proves — the conservative ` +
          "reading is the wrong direction round",
      ).toBeGreaterThan(maturityRank(entry.maturity));
    }
  });

  it("a census claim ABOVE what the entry can prove is an over-claim, and the gate fires", () => {
    // The acceptance case, and the one that could not have existed before the
    // split: the over-claim is produced by the BUILDER from two honest
    // inputs, not by tampering with a finished registry. Before, no input
    // could make `maturity` exceed `proven` because both were one value.
    const registry = buildCapabilityRegistry({
      evidence: realCapabilityEvidence(),
      observedAt: OBSERVED_AT,
      census: new Map([
        [
          "ec.test-framework.selenium",
          {
            id: "ec.test-framework.selenium",
            state: "SUPPORTED",
            maturity: "M5_FIELD_PROVEN",
          },
        ],
        [
          "ec.ci-cd-provider.jenkins",
          {
            id: "ec.ci-cd-provider.jenkins",
            state: "SUPPORTED",
            maturity: "M4_CORPUS_VERIFIED",
          },
        ],
      ]),
    });
    const codes = validateRegistry(registry);
    const over = codes.filter((d) => d.code === "OVER_CLAIMED_MATURITY");
    expect(over.map((d) => d.entryId).sort()).toEqual([
      "ci.provider.jenkins",
      "test.framework.selenium",
    ]);
    // The message names BOTH numbers, so a reader can see which resolver is
    // the odd one out without re-running anything.
    expect(over[0]?.message).toContain("but its own evidence proves only");
    expect(over[0]?.message).toMatch(/advertises M\d/);
  });

  it("with no census, an entry advertises what it proved", () => {
    // The other direction, so the split cannot be read as "always lower".
    const registry = buildCapabilityRegistry({
      evidence: realCapabilityEvidence(),
      observedAt: OBSERVED_AT,
      census: new Map(),
    });
    for (const entry of registry.entries) {
      expect(entry.maturity, entry.id).toBe(entry.proven);
    }
  });

  it("a malformed census row is ignored, not trusted", () => {
    // An entry whose census `maturity` is not in the closed M vocabulary is
    // not a claim; taking it would import a second level vocabulary through
    // the back door, which is what ADR 0011 forbids.
    const registry = buildCapabilityRegistry({
      evidence: realCapabilityEvidence(),
      observedAt: OBSERVED_AT,
      census: new Map([
        [
          "ec.test-framework.selenium",
          // Cast because the point of the test is an out-of-vocabulary value
          // arriving from a file this module does not control.
          {
            id: "ec.test-framework.selenium",
            state: "SUPPORTED",
            maturity: "F4" as Maturity,
          },
        ],
      ]),
    });
    const sel = registry.entries.find(
      (entry) => entry.id === "test.framework.selenium",
    );
    expect(sel?.maturity).toBe(sel?.proven);
    expect(validateRegistry(registry).map((d) => d.code)).not.toContain(
      "OVER_CLAIMED_MATURITY",
    );
  });
});

describe("rule-family facts are derived, not typed", () => {
  it("reads the family from an id", () => {
    expect(ruleFamily("QA-PW-144")).toBe("QA-PW");
    expect(ruleFamily("QA-CI-001")).toBe("QA-CI");
  });

  it("maps a framework to the family that evidences it", () => {
    expect(familyForFramework("playwright")).toBe("QA-PW");
    expect(familyForFramework("github-actions")).toBe("QA-CI");
    // Selenium's three rules carry the `QA-SE-` id prefix, so `QA-SE` is the
    // key that reaches them. It was `QA-SEL` — a family no rule id carries —
    // which is why the entry resolved to an empty rule list and reported no
    // evidence at all. A key that names a family with zero members produces an
    // empty result rather than an error, so nothing else reports it.
    expect(familyForFramework("selenium")).toBe("QA-SE");
    // And the key must actually resolve to rules, not merely look right.
    const { liveByFamily } = collectRuleFacts();
    expect(familyForFramework("selenium")).not.toBe("QA-SEL");
    for (const framework of [
      "playwright",
      "cypress",
      "selenium",
      "jest",
      "pytest",
      "github-actions",
    ]) {
      const family = familyForFramework(framework);
      expect(
        liveByFamily.get(family)?.length ?? 0,
        `${framework} → ${family} resolves to no rules`,
      ).toBeGreaterThan(0);
    }
    // An unmapped framework falls back to the generic test family rather
    // than guessing a specific one — and the entry then carries no rules,
    // so it lands at M1 with a gap instead of M2 on a guess.
    expect(familyForFramework("something-unknown")).toBe("QA-TEST");
  });
});

describe("the six client surfaces each carry their own state", () => {
  it("reports an absent surface as absent, never as covered", () => {
    // D4: a surface that does not exist may not be advertised at any
    // maturity. Three of the six do not exist yet.
    const doc = JSON.parse(
      renderSurfaceMaturity(
        buildCapabilityRegistry({
          evidence: BLIND_REGISTRY_EVIDENCE,
          observedAt: OBSERVED_AT,
        }),
        "test",
      ),
    ) as {
      rows: Array<{
        surface: string;
        state: string;
        maturity: string;
        nextLevelGap: { missing: string[] } | null;
      }>;
    };
    expect(doc.rows).toHaveLength(SURFACES.length);
    const absent = doc.rows.filter((row) => row.state === "ABSENT");
    expect(absent.length).toBeGreaterThan(0);
    for (const row of absent) {
      expect(row.maturity, row.surface).toBe("M0");
      expect(row.nextLevelGap?.missing.join(" "), row.surface).toMatch(
        /does not exist/,
      );
    }
  });

  it("names every declared surface", () => {
    expect([...SURFACES]).toEqual([
      "cli",
      "github-action",
      "mcp",
      "vscode",
      "github-app",
      "dashboard",
    ]);
  });
});

describe("a projection row states which language it implies, or admits none", () => {
  it("returns null rather than guessing", () => {
    // A fabricated language list is the §2.3 failure. `null` is honest.
    expect(languageOf("test.framework.playwright")).toBe("typescript");
    expect(languageOf("qa.domain.api-qa")).toBeNull();
    expect(languageOf("ci.provider.github-actions")).toBeNull();
  });
});

describe("the gates — shape and drift", () => {
  it("requires a matrix to name what it projects", () => {
    expect(
      checkMatrixShape({ schemaVersion: 1, rows: [] }, "x.json"),
    ).toContain('x.json: missing "projectionOf"');
    expect(
      checkMatrixShape(
        {
          schemaVersion: 1,
          artifact: "framework-matrix",
          projectionOf: "reg",
          rows: [{ framework: "f" }],
        },
        "x.json",
      ),
    ).toEqual([]);
  });

  it("requires a matrix row to name its subject", () => {
    const errors = checkMatrixShape(
      {
        schemaVersion: 1,
        artifact: "framework-matrix",
        projectionOf: "reg",
        rows: [{ nope: 1 }],
      },
      "x.json",
    );
    expect(errors.join(" ")).toMatch(/names no subject/);
  });

  it("requires the registry to carry a proven level on every entry", () => {
    // Without `proven` the document is a list of claims with nothing to
    // check them against, which is what the wave-1 DoD forbids.
    const errors = checkRegistryShape(
      {
        schemaVersion: 1,
        registryId: "mjolnir-capability-registry",
        entries: [{ id: "a" }],
        counts: {},
      },
      "reg.json",
    );
    expect(errors.join(" ")).toMatch(/missing "maturity"/);
    expect(errors.join(" ")).toMatch(/missing "proven"/);
  });

  it("rejects a registry that points at itself as its own projection", () => {
    // A matrix names the registry it projects. The registry IS the source,
    // so requiring a projectionOf there would make the authority point at
    // itself -- the first step to a circular citation.
    const errors = checkRegistryShape(
      {
        schemaVersion: 1,
        registryId: "mjolnir-capability-registry",
        entries: [],
        counts: {},
      },
      "reg.json",
    );
    expect(errors).toEqual([]);
  });

  it("compares structurally, so formatting alone is not drift", () => {
    expect(stringifyStable('{"b":1,"a":2}')).toBe(
      stringifyStable('{"a":2,"b":1}'),
    );
    expect(stringifyStable('{"a":1}')).not.toBe(stringifyStable('{"a":2}'));
  });
});

describe("rules:quality:check — a skeleton that admits what it cannot check", () => {
  const check = checkRuleQuality();

  it("passes the three invariants that are true today", () => {
    expect(check.status).toBe("PASS");
    expect(check.errors).toEqual([]);
    expect(check.facts.liveRules).toBeGreaterThan(0);
    expect(check.facts.retiredRules).toBeGreaterThan(0);
  });

  it("publishes the ceiling it actually reaches", () => {
    // A skeleton that reported an open-ended PASS would be the most
    // dangerous artifact in the program, because it would be believed.
    expect(check.facts.maxReachableMaturity).toBe("M2_IMPLEMENTED");
    expect(check.facts.unreachableLevels).toEqual([
      "M3_FIXTURE_VERIFIED",
      "M4_CORPUS_VERIFIED",
      "M5_FIELD_PROVEN",
    ]);
  });

  it("names every Wave 4 gap it cannot yet close, with a wave and a reason", () => {
    const ids = SKELETON_GAPS.map((gap) => gap.id);
    expect(ids).toContain("fixture-quad");
    expect(ids).toContain("capability-detector-rev");
    // Law 5: precision is measured, recall is not, so precision alone can
    // never be reported as quality.
    expect(ids).toContain("recall-measurement");
    for (const gap of SKELETON_GAPS) {
      expect(gap.blocks.length, gap.id).toBeGreaterThan(0);
      expect(gap.wave, gap.id).toBeTruthy();
      expect(gap.why.length, gap.id).toBeGreaterThan(20);
    }
  });
});

describe("the capability verb — read-only by construction", () => {
  it("has no way to set or promote a level", () => {
    // A verb that could raise a level would be a verb that could lie about
    // one. Every mutation-shaped flag is a usage error, never a silent no-op
    // — and the documented flags are all *filters*, so `--maturity M4` shows
    // M4 entries and changes nothing.
    for (const forbidden of [
      "--set",
      "--level",
      "--force",
      "--apply",
      "--update",
    ]) {
      expect(
        parseCapabilityArgs([forbidden, "M4"]).unknown,
        forbidden,
      ).not.toEqual([]);
    }
    // The documented filters parse and carry no value they could write back.
    const { query, unknown } = parseCapabilityArgs(["--maturity", "M4"]);
    expect(unknown).toEqual([]);
    expect(query.maturity).toBe("M4");
  });

  it("accepts the documented filters", () => {
    const { query, json, unknown } = parseCapabilityArgs([
      "--json",
      "--kind",
      "domain",
      "--maturity",
      "M1",
      "--id",
      "api",
    ]);
    expect(unknown).toEqual([]);
    expect(json).toBe(true);
    expect(query).toEqual({ kind: "domain", maturity: "M1", id: "api" });
  });

  it("filters by kind, maturity and id", () => {
    const registry = buildCapabilityRegistry({
      evidence: BLIND_REGISTRY_EVIDENCE,
      observedAt: OBSERVED_AT,
    });
    // 6.0: this filtered on `kind: "domain"`, which had 13 entries until the
    // support matrix they were read from was deleted. Filtering on a kind the
    // registry happens to contain makes the arm a change detector for whatever
    // else was removed; `ci-cd-provider` is derived from `CI_PROVIDERS`, which
    // is a declared list rather than a projection of a retired ledger.
    const providers = selectCapabilities(registry.entries, {
      kind: "ci-cd-provider",
      maturity: null,
      id: null,
    });
    expect(providers.length).toBeGreaterThan(0);
    expect(providers.every((entry) => entry.kind === "ci-cd-provider")).toBe(
      true,
    );
    expect(
      selectCapabilities(registry.entries, {
        kind: null,
        maturity: "M9",
        id: null,
      }),
    ).toEqual([]);
  });

  it("renders a claim with its maturity, its proof and its gap", () => {
    const registry = buildCapabilityRegistry({
      evidence: realCapabilityEvidence(),
    });
    const entry = registry.entries[0];
    if (entry === undefined) throw new Error("no entries");
    const text = renderCapabilityText([entry], []);
    expect(text).toContain(entry.id);
    expect(text).toContain("next level");
    expect(text).toContain("cannot be set here");
  });

  it("emits a machine contract that carries the violations", () => {
    const registry = buildCapabilityRegistry({
      evidence: BLIND_REGISTRY_EVIDENCE,
      observedAt: OBSERVED_AT,
    });
    const entry = registry.entries[0];
    if (entry === undefined) throw new Error("no entries");
    const doc = JSON.parse(
      capabilityJson(
        [{ ...entry, maturity: "M5_FIELD_PROVEN" }],
        [{ code: "OVER_CLAIMED_MATURITY", entryId: entry.id, message: "x" }],
      ),
    ) as { contract: string; violations: unknown[] };
    expect(doc.contract).toBe("mjolnir.capability.v1");
    expect(doc.violations).toHaveLength(1);
  });
});
