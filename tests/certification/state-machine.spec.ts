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
  LANGUAGE_STATE_RANK,
  rankOf,
  requiresEvidence,
  RULE_STATUS_RANK,
  validateProjections,
  type CertificationState,
} from "../../src/certification/state-machine.js";
import {
  auditLanguageManifest,
  findRegressions,
  LANGUAGE_MANIFEST,
  rederive,
  supportClaim,
  type LanguageCapability,
} from "../../src/certification/language-manifest.js";
import { M40_LANGUAGE_CERTIFICATION_STATES } from "../../src/engine/m40-language-expansion-contract.js";
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

  it("every M40 language state has a position on the ladder", () => {
    for (const state of M40_LANGUAGE_CERTIFICATION_STATES) {
      expect(
        LANGUAGE_STATE_RANK[state],
        `${state} is in the M40 contract but not on the ladder`,
      ).toBeDefined();
    }
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
