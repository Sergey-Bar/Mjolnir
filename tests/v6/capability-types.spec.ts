import { describe, expect, it } from "vitest";

import {
  DEFAULT_DEPLOYMENT_MODE,
  DEPLOYMENT_MODES,
  EVIDENCE_CLASSES,
  GAP_ID_PATTERN,
  GAP_SEVERITIES,
  GAP_STATUSES,
  HUMAN_EVIDENCE_MATURITY_CEILING,
  PROOF_STATUSES,
  REQUIREMENT_STATES,
  UNOWNED_PLACEHOLDERS,
  WAVE_IDS,
  isHumanEvidence,
  isNamedOwner,
  modeAllowsHosted,
} from "../../src/v6/capability-types.js";
import { MATURITY_LEVELS, isOverClaiming } from "../../src/v6/maturity.js";

describe("capability-types — the vocabularies are closed", () => {
  it("keeps every enum a set a renderer can exhaust", () => {
    // A determination or evidence state set that can grow silently is a set
    // a renderer will eventually forget a case of, and a forgotten case
    // renders as the default — which is how an UNKNOWN becomes a PASS.
    for (const vocabulary of [
      EVIDENCE_CLASSES,
      PROOF_STATUSES,
      GAP_SEVERITIES,
      GAP_STATUSES,
      REQUIREMENT_STATES,
      WAVE_IDS,
      DEPLOYMENT_MODES,
      MATURITY_LEVELS,
    ]) {
      expect(vocabulary.length).toBeGreaterThan(0);
      expect(new Set(vocabulary).size).toBe(vocabulary.length);
    }
  });

  it("includes every evidence class the constitution and the ADRs name", () => {
    for (const required of [
      "E-MACHINE",
      "E-RUNTIME",
      "E-CORPUS",
      "E-ARTIFACT",
      "E-CONFIG",
      "E-HUMAN",
      "E-REMOTE",
    ]) {
      expect(EVIDENCE_CLASSES).toContain(required);
    }
  });

  it("caps human evidence at M3 and says why the cap is a function of the class", () => {
    // ADR 0009 invariant 3: human evidence may take a human-observed axis to
    // M3 and never to M4, which needs a classified machine corpus.
    expect(HUMAN_EVIDENCE_MATURITY_CEILING).toBe("M3_FIXTURE_VERIFIED");
    expect(HUMAN_EVIDENCE_MATURITY_CEILING).not.toBe("M4_CORPUS_VERIFIED");
    expect(HUMAN_EVIDENCE_MATURITY_CEILING).not.toBe("M5_FIELD_PROVEN");
  });

  it("identifies the human class and nothing else", () => {
    expect(isHumanEvidence("E-HUMAN")).toBe(true);
    for (const other of EVIDENCE_CLASSES) {
      if (other === "E-HUMAN") continue;
      expect(isHumanEvidence(other)).toBe(false);
    }
    expect(isHumanEvidence("human")).toBe(false);
    expect(isHumanEvidence(undefined)).toBe(false);
  });

  it("makes REMOTE_PROVEN the only status that can reach M5", () => {
    // M5 requires external field evidence, which the zero-network default
    // never produces. A local proof claiming M5 is an over-claim, and
    // `isOverClaiming` is the function every surface calls before it
    // renders a maturity badge.
    expect(PROOF_STATUSES).toEqual([
      "BLOCKED",
      "LOCAL_PROVEN",
      "REMOTE_PROVEN",
    ]);
    const claimed = "M5_FIELD_PROVEN" as const;
    expect(isOverClaiming(claimed, "M4_CORPUS_VERIFIED")).toBe(true);
    expect(isOverClaiming(claimed, "M5_FIELD_PROVEN")).toBe(false);
  });
});

describe("capability-types — gap identity", () => {
  it("accepts a gap id that extends the M26 scheme", () => {
    // A second gap namespace would split the ledgers, so the v6 ids are
    // validated against the M26 pattern rather than a new one.
    for (const id of [
      "GAP-M26-014",
      "GAP-V6-001",
      "GAP-MATRIX-EXTERNAL-CERTIFICATION-001",
      "GAP-V6.1",
    ]) {
      expect(GAP_ID_PATTERN.test(id), id).toBe(true);
    }
  });

  it("rejects an id that would collide with another namespace or be ambiguous", () => {
    // Note the case: the scheme is upper-case, so a lower-case id is a
    // different id — and two ids differing only in case are two rows in a
    // ledger that a human reads as one.
    for (const id of [
      "",
      "M26-014",
      "gap-v6-001",
      "GAP-",
      "-GAP-x",
      "GAP lower",
      "GAP-V6-legacy_1",
    ]) {
      expect(GAP_ID_PATTERN.test(id), id).toBe(false);
    }
  });
});

describe("capability-types — an owner is a name, not a placeholder", () => {
  it("rejects every placeholder, case-insensitively and with padding", () => {
    for (const placeholder of UNOWNED_PLACEHOLDERS) {
      expect(isNamedOwner(placeholder)).toBe(false);
      expect(isNamedOwner(placeholder.toUpperCase())).toBe(false);
      expect(isNamedOwner(`  ${placeholder}  `)).toBe(false);
    }
  });

  it("rejects non-strings, which are not owners", () => {
    for (const junk of [undefined, null, 7, {}, []]) {
      expect(isNamedOwner(junk)).toBe(false);
    }
  });

  it("accepts a real owner", () => {
    expect(isNamedOwner("ecosystem-census")).toBe(true);
    expect(isNamedOwner("  framework-inventory  ")).toBe(true);
  });
});

describe("capability-types — deployment mode is a state, not a promise", () => {
  it("defaults to the safe mode and keeps the enum closed", () => {
    // An unset mode defaulting to anything but LOCAL_ONLY would make a typo
    // a privacy incident.
    expect(DEFAULT_DEPLOYMENT_MODE).toBe("LOCAL_ONLY");
    expect(DEPLOYMENT_MODES).toHaveLength(4);
  });

  it("refuses hosted paths for the local and air-gapped modes", () => {
    expect(modeAllowsHosted("LOCAL_ONLY")).toBe(false);
    expect(modeAllowsHosted("AIR_GAPPED")).toBe(false);
    expect(modeAllowsHosted("CLOUD")).toBe(true);
    // SELF_HOSTED is the customer's own instance, so egress is to them.
    expect(modeAllowsHosted("SELF_HOSTED")).toBe(true);
  });
});

describe("capability-types — waves", () => {
  it("numbers every wave of the program exactly once, from 0 to 14", () => {
    // Wave 0 is truth, wave 14 is the architecture freeze, and a gap that
    // names a wave outside the program has nowhere to go.
    expect(WAVE_IDS).toHaveLength(15);
    expect(WAVE_IDS[0]).toBe("0");
    expect(WAVE_IDS[14]).toBe("14");
    expect(new Set(WAVE_IDS).size).toBe(WAVE_IDS.length);
  });
});

describe("capability-types — requirement states", () => {
  it("keeps MISSING and PARTIALLY_COMPLETE distinct", () => {
    // §100's whole point is that these are different words. Collapsing them
    // is how a `MISSING` becomes an unrecorded `PARTIALLY_COMPLETE`.
    expect(REQUIREMENT_STATES).toContain("MISSING");
    expect(REQUIREMENT_STATES).toContain("PARTIALLY_COMPLETE");
    expect(REQUIREMENT_STATES).toContain("INCORRECT");
    expect(REQUIREMENT_STATES).toContain("DUPLICATED");
    expect(REQUIREMENT_STATES).toContain("OBSOLETE");
    expect(REQUIREMENT_STATES).toContain("BLOCKED");
    expect(REQUIREMENT_STATES).toContain("ALREADY_COMPLETE");
  });
});
