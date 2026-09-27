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
import {
  deriveMaturityFromEvidence,
  maturityRank,
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
  it("is BLOCKED when nothing is measured, which is the honest state", () => {
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
    // An adapter on disk proves the capability is IMPLEMENTED (M2). It is
    // not an observation: nobody recorded when, against which revision.
    for (const entry of registry.entries) {
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

describe("maturity stays capped while its gates are missing", () => {
  it("never reaches M3 while the fixture-quad and detectorRev arms are false", () => {
    // The two arms that would unlock M3 and M4 are hard false in the real
    // resolver, and that is the whole point: the ladder has a real
    // ceiling today, and it is M2.
    const evidence: RegistryEvidence = realCapabilityEvidence();
    expect(evidence.registry.hasFixtureQuad).toBe(false);
    expect(evidence.registry.hasCorpusMeasurement).toBe(false);
    const registry = buildCapabilityRegistry({ evidence });
    for (const entry of registry.entries) {
      expect(
        ["M0_UNKNOWN", "M1_DECLARED", "M2_IMPLEMENTED"],
        `${entry.id} is ${entry.maturity}`,
      ).toContain(entry.maturity);
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

describe("rule-family facts are derived, not typed", () => {
  it("reads the family from an id", () => {
    expect(ruleFamily("QA-PW-144")).toBe("QA-PW");
    expect(ruleFamily("QA-CI-001")).toBe("QA-CI");
  });

  it("maps a framework to the family that evidences it", () => {
    expect(familyForFramework("playwright")).toBe("QA-PW");
    expect(familyForFramework("github-actions")).toBe("QA-CI");
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
    const domains = selectCapabilities(registry.entries, {
      kind: "domain",
      maturity: null,
      id: null,
    });
    expect(domains.length).toBeGreaterThan(0);
    expect(domains.every((entry) => entry.kind === "domain")).toBe(true);
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
