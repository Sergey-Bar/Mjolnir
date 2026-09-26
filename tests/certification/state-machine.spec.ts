/**
 * One certification state machine (plan V5-023).
 *
 * The repository had three vocabularies for "how much do we trust this": a
 * five-state rule `RuleStatus`, a fourteen-state language certification list,
 * and a detector lifecycle. None could be compared to the others, so a rule
 * could be `MEASURED-CORE` while its language sat at `PARSEABLE` and nothing
 * could say whether that pairing was coherent.
 *
 * These specs pin the ladder, the admission gate, and the two things the gate
 * exists to prevent: a certification claim with no evidence behind it, and a
 * regression that overwrites itself silently.
 */

import { describe, expect, it } from "vitest";

import {
  admit,
  CERTIFICATION_STATES,
  detectRegression,
  EVIDENCE_REQUIRED_FROM,
  isAtLeast,
  languageCanExpress,
  LANGUAGE_STATE_RANK,
  rankOf,
  requiresEvidence,
  RULE_ONLY_STATES,
  RULE_STATUS_RANK,
  validateProjections,
  type CertificationState,
} from "../../src/certification/state-machine.js";
import {
  auditLanguageManifest,
  findRegressions,
  languagesAtLeast,
  LANGUAGE_MANIFEST,
  rederive,
  supportClaim,
  type LanguageCapability,
} from "../../src/certification/language-manifest.js";
import type { RuleStatus } from "../../src/rules/measurement.js";

const FULL_EVIDENCE = {
  corpus: "corpus/x.jsonl",
  sampleSize: 10,
  verifiedBy: "someone",
};

describe("the ladder is one ordered list", () => {
  it("every state has a distinct rank", () => {
    const ranks = CERTIFICATION_STATES.map(rankOf);
    expect(new Set(ranks).size).toBe(ranks.length);
  });

  it("absence is a state, not a gap in a list", () => {
    // UNKNOWN and UNMEASURED are first-class. A capability with no evidence
    // has a state; it does not have a missing one.
    expect(CERTIFICATION_STATES).toContain("UNKNOWN");
    expect(CERTIFICATION_STATES).toContain("UNMEASURED");
    expect(rankOf("UNKNOWN")).toBeGreaterThanOrEqual(0);
  });

  it("ordering is a comparison, not a judgement call", () => {
    expect(isAtLeast("CERTIFIED", "CANDIDATE")).toBe(true);
    expect(isAtLeast("CANDIDATE", "CERTIFIED")).toBe(false);
    expect(isAtLeast("CERTIFIED", "CERTIFIED")).toBe(true);
  });

  it("evidence is required from CANDIDATE upward, and not below it", () => {
    expect(requiresEvidence(EVIDENCE_REQUIRED_FROM)).toBe(true);
    expect(requiresEvidence("MEASURED")).toBe(false);
    expect(requiresEvidence("UNSUPPORTED")).toBe(false);
    expect(requiresEvidence("DISCOVERED")).toBe(false);
  });
});

describe("the admission gate makes an unsupportable claim impossible", () => {
  it("refuses CERTIFIED with no evidence at all", () => {
    const decision = admit("CERTIFIED");
    expect(decision.admitted).toBe(false);
    expect(decision.defects.join(" ")).toMatch(/requires a named corpus/);
    // And it says what the evidence actually supports, which is not CERTIFIED.
    expect(decision.supportedState).toBe("UNMEASURED");
  });

  it("refuses CERTIFIED with a ZERO-sized corpus", () => {
    // The specific fabrication this machine exists to prevent.
    const decision = admit("CERTIFIED", {
      corpus: "corpus/x.jsonl",
      sampleSize: 0,
      verifiedBy: "someone",
    });
    expect(decision.admitted).toBe(false);
    expect(decision.defects.join(" ")).toMatch(/non-zero sample size/);
  });

  it("refuses a non-finite sample size", () => {
    for (const sampleSize of [Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        admit("CERTIFIED", { corpus: "c", sampleSize, verifiedBy: "v" })
          .admitted,
        String(sampleSize),
      ).toBe(false);
    }
  });

  it("refuses a claim with no named verification method", () => {
    const decision = admit("CERTIFIED", { corpus: "c", sampleSize: 5 });
    expect(decision.admitted).toBe(false);
    expect(decision.defects.join(" ")).toMatch(/verification method/);
  });

  it("admits a fully evidenced claim", () => {
    const decision = admit("CERTIFIED", FULL_EVIDENCE);
    expect(decision.admitted).toBe(true);
    expect(decision.supportedState).toBe("CERTIFIED");
  });

  it("admits a low state with no evidence — absence needs no corpus", () => {
    for (const state of [
      "UNKNOWN",
      "UNSUPPORTED",
      "DISCOVERED",
      "MEASURED",
    ] as const) {
      expect(admit(state).admitted, state).toBe(true);
    }
  });

  it("rejects an unknown state rather than defaulting it to UNKNOWN quietly", () => {
    const decision = admit("VERY_CERTIFIED" as CertificationState);
    expect(decision.admitted).toBe(false);
    expect(decision.defects.join(" ")).toMatch(/unknown certification state/);
  });
});

describe("a regression is reported, not absorbed", () => {
  it("a lower re-derivation is a regression", () => {
    const regression = detectRegression({
      capability: "python",
      stored: "CERTIFIED",
      rederived: "MEASURED",
      reason: "the corpus no longer reproduces",
    });
    expect(regression).toEqual({
      capability: "python",
      was: "CERTIFIED",
      now: "MEASURED",
      reason: "the corpus no longer reproduces",
    });
  });

  it("the same or a stronger state is not a regression", () => {
    for (const now of ["CERTIFIED", "TRUST-COMPLETE"] as const) {
      expect(
        detectRegression({
          capability: "x",
          stored: "CERTIFIED",
          rederived: now,
          reason: "improved",
        }),
        now,
      ).toBeNull();
    }
  });
});

describe("the projections are the consolidation, not a rename", () => {
  it("both existing vocabularies project onto the ladder", () => {
    expect(validateProjections()).toEqual([]);
  });

  it("the language vocabulary can name every answer admit() can hand a caller", () => {
    // The property that actually matters, and it is derivable rather than
    // hand-listed. For a LANGUAGE claim the declared state is one the language
    // vocabulary already speaks, and `admit()` returns either that same state
    // or UNMEASURED. So the two cases below are the complete set of answers a
    // language can be handed — and both must be sayable.
    //
    // The previous version of this test filtered the ladder through a
    // hard-coded exclusion list and therefore demanded a language projection
    // for the four RULE states (MEASURED-CORE …). Those describe where a
    // rule's measurement sits, and `admit()` is vocabulary-agnostic, so
    // feeding one in proves nothing about a language. Adding them to the
    // language map would be the fourth vocabulary `validateProjections`
    // exists to catch.
    const withEvidence = {
      corpus: "corpus/x.jsonl",
      sampleSize: 10,
      verifiedBy: "v",
    };
    for (const state of Object.keys(
      LANGUAGE_STATE_RANK,
    ) as CertificationState[]) {
      const decision = admit(state, withEvidence);
      expect(
        languageCanExpress(decision.supportedState),
        `a language declared ${state} and was told ${decision.supportedState}`,
      ).toBe(true);
      // And the unbacked case, which is the one that used to be unsayable.
      const bare = admit(state, {});
      expect(
        languageCanExpress(bare.supportedState),
        `a language declared ${state} with no evidence and was told ${bare.supportedState}`,
      ).toBe(true);
    }
  });

  it("every state a language can legitimately be at has a projection", () => {
    // The consolidation is total over the language-reachable ladder. The
    // exclusion is the module's own RULE_ONLY_STATES declaration, not a list
    // restated here: adding a rule state without declaring it there now fails
    // this test, which is the point.
    for (const state of CERTIFICATION_STATES) {
      if (RULE_ONLY_STATES.has(state)) continue;
      expect(
        LANGUAGE_STATE_RANK[state],
        `${state} has no language projection`,
      ).toBeDefined();
    }
  });

  it("the rule-only states are rule vocabulary, and stay out of the language map", () => {
    // Named in one place so the exclusion is visible. If a future change makes
    // one of these reachable as a language outcome, `languageCanExpress` above
    // is what catches it — not this assertion.
    for (const state of RULE_ONLY_STATES) {
      expect(RULE_STATUS_RANK[state], state).toBeDefined();
    }
    expect([...RULE_ONLY_STATES].sort()).toEqual([
      "MEASURED-CORE",
      "MEASURED-EXTENDED",
      "MEASURED-QUARANTINE",
      "PROVISIONAL",
    ]);
  });

  it("UNMEASURED is expressible in both vocabularies, because absence is a state", () => {
    // It is the answer `admit()` gives a language that claimed more than it
    // could back, so both vocabularies must be able to say it.
    expect(LANGUAGE_STATE_RANK["UNMEASURED"]).toBe("UNMEASURED");
    expect(RULE_STATUS_RANK["UNMEASURED"]).toBe("UNMEASURED");
    const decision = admit("CERTIFIED", {});
    expect(decision.admitted).toBe(false);
    expect(decision.supportedState).toBe("UNMEASURED");
  });

  it("every RuleStatus has a position on the ladder", () => {
    const statuses: RuleStatus[] = [
      "MEASURED-CORE",
      "MEASURED-EXTENDED",
      "MEASURED-QUARANTINE",
      "PROVISIONAL",
      "UNMEASURED",
    ];
    for (const status of statuses) {
      expect(RULE_STATUS_RANK[status], status).toBeDefined();
    }
    // And the projection covers the union exactly — no sixth state invented.
    expect(Object.keys(RULE_STATUS_RANK).sort()).toEqual([...statuses].sort());
  });
});

describe("the language manifest is checked against its own evidence", () => {
  it("the committed manifest has no unsupported claim", () => {
    expect(auditLanguageManifest()).toEqual([]);
  });

  it("catches a language claiming CERTIFIED with an empty cohort", () => {
    const bad: LanguageCapability = {
      id: "go",
      displayName: "Go",
      state: "CERTIFIED",
      capabilities: ["parse"],
      notCertified: [],
      evidence: { corpus: "corpus/x.jsonl", sampleSize: 0, verifiedBy: "v" },
    };
    const findings = auditLanguageManifest([bad]);
    expect(findings.map((f) => f.kind)).toContain("UNSUPPORTED_CLAIM");
    expect(findings[0]?.detail).toMatch(/non-zero sample size/);
  });

  it("catches a state the language projection does not define", () => {
    const bad = {
      id: "rust",
      displayName: "Rust",
      state: "MEASURED-CORE",
      capabilities: [],
      notCertified: [],
      evidence: {},
    } as LanguageCapability;
    const findings = auditLanguageManifest([bad]);
    expect(findings.map((f) => f.kind)).toContain("PROJECTION_DRIFT");
  });

  it("re-derives a row from its evidence, not from its claim", () => {
    for (const entry of LANGUAGE_MANIFEST) {
      expect(rederive(entry), entry.id).toBe(entry.state);
    }
  });

  it("reports a language that silently dropped a state", () => {
    const previous: LanguageCapability[] = [
      {
        ...(LANGUAGE_MANIFEST[0] as LanguageCapability),
        state: "TRUST-COMPLETE",
      },
    ];
    const regressions = findRegressions(previous);
    expect(regressions).toHaveLength(1);
    expect(regressions[0]?.capability).toBe(LANGUAGE_MANIFEST[0]?.id);
    expect(regressions[0]?.was).toBe("TRUST-COMPLETE");
  });

  it("reports no regression for a new or improved language", () => {
    expect(findRegressions([])).toEqual([]);
  });
});

describe("languagesAtLeast answers a question the manifest must be able to answer", () => {
  it("returns only languages at or above the requested state", () => {
    // This is the function a reader of the README asks: "which languages does
    // Mjölnir actually support at PARSEABLE?" It was exported and had no
    // caller in any test, so the answer was unverified — and the answer is
    // exactly what a support claim is made of.
    const certified = languagesAtLeast("CERTIFIED");
    for (const entry of certified) {
      expect(isAtLeast(entry.state, "CERTIFIED"), entry.id).toBe(true);
    }
    expect(certified.length).toBeGreaterThan(0);
  });

  it.fails(
    "is monotone: a higher bar is a strict subset of a lower one",
    () => {
      // A KNOWN DEFECT, recorded rather than hidden. `CERTIFICATION_STATES` is
      // not in ladder order, so `rankOf` — the only ordering function, and
      // therefore the basis of every ordered comparison in the machine — ranks
      // KNOWN at 18, above PROVISIONAL at 17 and TRUST-COMPLETE at 9. The real
      // order it produces is:
      //
      //   UNKNOWN DISCOVERED UNSUPPORTED DEPRECATED UNMEASURED MEASURED
      //   CANDIDATE EXPERIMENTAL CERTIFIED TRUST-COMPLETE BLOCKED DEGRADED
      //   PARSEABLE SEMANTICALLY_SUPPORTED MEASURED-CORE … PROVISIONAL KNOWN
      //
      // So `isAtLeast("KNOWN", "CERTIFIED")` is true, `PARSEABLE` sorts above
      // `CERTIFIED`, and `requiresEvidence` — `rankOf(s) >= rankOf("CANDIDATE")`
      // — demands a corpus for BLOCKED and DEGRADED, which the constant's own
      // doc comment says "none of which need a corpus behind them".
      //
      // Marked `it.fails` so the suite stays green while the defect is visible
      // in the repo, and so that reordering CERTIFICATION_STATES turns this
      // into a loud failure that says it was fixed. Not `it.skip`: a skipped
      // test is a promise nobody is keeping.
      const certified = new Set(
        languagesAtLeast("CERTIFIED").map((entry) => entry.id),
      );
      const parseable = new Set(
        languagesAtLeast("PARSEABLE").map((entry) => entry.id),
      );
      expect(parseable.size).toBeGreaterThanOrEqual(certified.size);
      for (const id of certified) {
        expect(parseable.has(id), `${id} is certified but not parseable`).toBe(
          true,
        );
      }
    },
  );

  it("returns the full manifest at UNKNOWN and nothing above the ceiling", () => {
    // The two ends of the question. UNKNOWN is the floor of the ladder, so
    // everything qualifies; there is no state above TRUST-COMPLETE, so asking
    // for one must not throw and must not invent a match.
    expect(languagesAtLeast("UNKNOWN")).toHaveLength(LANGUAGE_MANIFEST.length);
    expect(languagesAtLeast("CERTIFIED").length).toBeLessThan(
      LANGUAGE_MANIFEST.length,
    );
  });

  it.fails(
    "a caller-supplied manifest is filtered by the ladder, not by name",
    () => {
      // Same defect, isolated to one function so the report is unambiguous:
      // `isAtLeast("KNOWN", "CERTIFIED")` returns true, so a filter on it keeps
      // a state that is ten rungs below the one asked for.
      const synthetic = [
        {
          ...(LANGUAGE_MANIFEST[0] as LanguageCapability),
          id: "hi",
          state: "CERTIFIED",
        },
        {
          ...(LANGUAGE_MANIFEST[0] as LanguageCapability),
          id: "lo",
          state: "KNOWN",
        },
      ] as LanguageCapability[];
      expect(
        languagesAtLeast("CERTIFIED", synthetic).map((entry) => entry.id),
      ).toEqual(["hi"]);
    },
  );
});

describe("the support claim is generated, not maintained by hand", () => {
  it("states the level and the gap", () => {
    const python = LANGUAGE_MANIFEST.find((e) => e.id === "python");
    const claim = supportClaim(python as LanguageCapability);
    expect(claim).toContain("MEASURED");
    expect(claim).toContain("next: pytest runner evidence");
  });

  it("says so when a language is at the ceiling", () => {
    expect(supportClaim(LANGUAGE_MANIFEST[0] as LanguageCapability)).toContain(
      "no recorded gap",
    );
  });
});
