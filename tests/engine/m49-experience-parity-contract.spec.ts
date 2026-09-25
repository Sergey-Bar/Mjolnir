import { describe, expect, it } from "vitest";

import {
  M49_ACCESSIBILITY_STATES,
  M49_EXPERIENCE_SCHEMA,
  M49_LIMITS,
  M49_LOCALIZATION_STATES,
  M49_PARITY_SCHEMA,
  M49_PERSONAS,
  M49_RECOVERY_STATES,
  M49_RESULT_VERDICTS,
  M49_SECTIONS,
  M49_SECTION_STATES,
  M49_SURFACE_ADAPTERS,
  M49_SURFACE_ADAPTER_SCHEMA,
  M49_SURFACE_OBSERVATION_SCHEMA,
  M49_SURFACES,
  adaptM49ResultToSurface,
  createM49CanonicalResultViewModel,
  evaluateM49Parity,
  evaluateM49PersonaCompletion,
  type M49CandidateBinding,
  type M49CanonicalResultInput,
  type M49CanonicalResultViewModel,
  type M49ExperienceEvidence,
  type M49SectionView,
  type M49Surface,
  type M49SurfaceObservation,
} from "../../src/engine/m49-experience-parity-contract.js";

const GENERATED_AT = "2026-09-25T08:00:00.000Z";
const CAPTURED_AT = "2026-09-25T12:00:00.000Z";
const EVALUATED_AT = "2026-09-25T12:00:00.000Z";
const BINDING: M49CandidateBinding = Object.freeze({
  repositoryId: "Sergey-Bar/Mjolnir",
  candidateId: "candidate-m49",
  revision: "a".repeat(40),
});

function sections(reverse = false): readonly M49SectionView[] {
  const values = M49_SECTIONS.map((id) => ({
    id,
    state: "COMPLETE" as const,
    title: `${id} title`,
    summary: `${id} summary`,
  }));
  return Object.freeze(reverse ? values.reverse() : values);
}

function canonicalInput(
  overrides: Partial<M49CanonicalResultViewModel> = {},
): M49CanonicalResultInput {
  return {
    schema: M49_EXPERIENCE_SCHEMA,
    resultId: "result-m49",
    binding: BINDING,
    generatedAt: GENERATED_AT,
    verdict: "FINDINGS",
    completeness: "COMPLETE",
    headline: "One blocked test gap",
    summary: "The candidate has one deterministic finding.",
    primaryAction: "Open the finding and rerun verification.",
    sections: sections(),
    ...overrides,
  };
}

function canonical(
  overrides: Partial<M49CanonicalResultViewModel> = {},
): M49CanonicalResultViewModel {
  return createM49CanonicalResultViewModel(canonicalInput(overrides));
}

function positiveExperience(): M49ExperienceEvidence {
  return Object.freeze({
    accessibility: "PASS",
    localization: "CURRENT",
    recovery: "AVAILABLE",
  });
}

function unsupportedExperience(): M49ExperienceEvidence {
  return Object.freeze({
    accessibility: "UNSUPPORTED",
    localization: "UNSUPPORTED",
    recovery: "UNSUPPORTED",
  });
}

function observation(
  model: M49CanonicalResultViewModel,
  surface: M49Surface,
  overrides: Partial<M49SurfaceObservation> = {},
): M49SurfaceObservation {
  const selectedAdapter =
    overrides.adapter === undefined
      ? adaptM49ResultToSurface(model, surface)
      : overrides.adapter;
  return Object.freeze({
    schema: M49_SURFACE_OBSERVATION_SCHEMA,
    surface,
    support: "SUPPORTED",
    completeness: "COMPLETE",
    capturedAt: CAPTURED_AT,
    binding: freezeBinding(model.binding),
    adapter: selectedAdapter,
    experience: positiveExperience(),
    unsupportedReason: null,
    ...overrides,
  });
}

function freezeBinding(binding: M49CandidateBinding): M49CandidateBinding {
  return Object.freeze({ ...binding });
}

function observations(
  model: M49CanonicalResultViewModel,
): readonly M49SurfaceObservation[] {
  return M49_SURFACES.map((surface) => observation(model, surface));
}

function withObservation(
  values: readonly M49SurfaceObservation[],
  surface: M49Surface,
  replacement: M49SurfaceObservation,
): readonly M49SurfaceObservation[] {
  return values.map((value) =>
    value.surface === surface ? replacement : value,
  );
}

function evaluate(
  model: M49CanonicalResultViewModel,
  values: readonly M49SurfaceObservation[] = observations(model),
) {
  return evaluateM49Parity(model, values, { evaluatedAt: EVALUATED_AT });
}

describe("M49 full-product experience parity contract", () => {
  it("defines one bounded canonical model and seven surface adapters", () => {
    const model = canonical();
    const adapters = M49_SURFACES.map((surface) =>
      adaptM49ResultToSurface(model, surface),
    );
    const first = adapters[0];

    expect(M49_SURFACES).toEqual([
      "cli",
      "json",
      "sarif",
      "pr",
      "web",
      "mcp",
      "agent",
    ]);
    expect(M49_SECTIONS).toEqual([
      "change",
      "risk",
      "verification",
      "evidence",
      "gaps",
      "trust",
      "action",
    ]);
    expect(M49_PERSONAS).toEqual([
      "beginner",
      "expert",
      "keyboard-screen-reader",
      "error-recovery",
      "clean-consumer",
    ]);
    expect(M49_LIMITS.maxSurfaceObservations).toBe(7);
    expect(
      new Set(adapters.map((adapter) => adapter.canonicalDigest)).size,
    ).toBe(1);
    expect(
      adapters.every((adapter) =>
        adapter.projection.sectionOrder.every(
          (id, index) => id === M49_SECTIONS[index],
        ),
      ),
    ).toBe(true);
    expect(
      adapters.every(
        (adapter) =>
          adapter.projection === first?.projection ||
          JSON.stringify(adapter.projection) ===
            JSON.stringify(first?.projection),
      ),
    ).toBe(true);
    expect(adapters.map((adapter) => adapter.mediaType)).toEqual([
      M49_SURFACE_ADAPTERS.cli.mediaType,
      M49_SURFACE_ADAPTERS.json.mediaType,
      M49_SURFACE_ADAPTERS.sarif.mediaType,
      M49_SURFACE_ADAPTERS.pr.mediaType,
      M49_SURFACE_ADAPTERS.web.mediaType,
      M49_SURFACE_ADAPTERS.mcp.mediaType,
      M49_SURFACE_ADAPTERS.agent.mediaType,
    ]);
    expect(Object.isFrozen(model)).toBe(true);
    expect(Object.isFrozen(model.sections[0])).toBe(true);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first?.projection)).toBe(true);
  });

  it("normalizes section order and rejects incomplete PASS or missing sections", () => {
    const reordered = createM49CanonicalResultViewModel(
      canonicalInput({ sections: sections(true) }),
    );
    const incompletePass = canonicalInput({
      completeness: "PARTIAL",
      verdict: "PASS",
    });
    const missingSection = canonicalInput({
      sections: sections().slice(0, -1),
    });

    expect(reordered.sections.map((section) => section.id)).toEqual(
      M49_SECTIONS,
    );
    expect(() => createM49CanonicalResultViewModel(incompletePass)).toThrow(
      /contradict/,
    );
    expect(() => createM49CanonicalResultViewModel(missingSection)).toThrow(
      /every section/,
    );
  });

  it("reports deterministic PASS for complete current supported surfaces", () => {
    const model = canonical();
    const values = observations(model);
    const forward = evaluateM49Parity(model, values, {
      evaluatedAt: EVALUATED_AT,
    });
    const reverse = evaluateM49Parity(model, [...values].reverse(), {
      evaluatedAt: EVALUATED_AT,
    });
    const personas = evaluateM49PersonaCompletion(forward);

    expect(forward).toEqual(reverse);
    expect(JSON.stringify(forward)).toBe(JSON.stringify(reverse));
    expect(forward.schema).toBe(M49_PARITY_SCHEMA);
    expect(forward.inputState).toBe("COMPLETE");
    expect(forward.verdict).toBe("PASS");
    expect(forward.canonicalCompleteness).toBe("COMPLETE");
    expect(forward.surfaces.map((surface) => surface.verdict)).toEqual(
      Array<string>(7).fill("MATCH"),
    );
    expect(personas.every((persona) => persona.completion === "COMPLETE")).toBe(
      true,
    );
  });

  it("rejects stale evidence as inconclusive and never completes a persona", () => {
    const model = canonical();
    const values = observations(model);
    const stale = observation(model, "web", {
      capturedAt: "2026-09-23T11:59:59.999Z",
    });
    const report = evaluate(model, withObservation(values, "web", stale));
    const web = report.surfaces.find((surface) => surface.surface === "web");

    expect(web?.verdict).toBe("STALE");
    expect(web?.reasons).toEqual(["EVIDENCE_STALE"]);
    expect(report.verdict).toBe("INCONCLUSIVE");
    expect(
      evaluateM49PersonaCompletion(report).every(
        (persona) => persona.completion === "INCOMPLETE",
      ),
    ).toBe(true);
  });

  it("rejects foreign evidence as inconclusive", () => {
    const model = canonical();
    const values = observations(model);
    const foreign = observation(model, "mcp", {
      binding: Object.freeze({
        ...model.binding,
        candidateId: "candidate-foreign",
      }),
    });
    const report = evaluate(model, withObservation(values, "mcp", foreign));
    const mcp = report.surfaces.find((surface) => surface.surface === "mcp");

    expect(mcp?.verdict).toBe("FOREIGN");
    expect(mcp?.reasons).toEqual(["CANDIDATE_FOREIGN"]);
    expect(report.verdict).toBe("INCONCLUSIVE");
  });

  it("rejects a partial surface without discarding its honest experience state", () => {
    const model = canonical();
    const values = observations(model);
    const partial = observation(model, "pr", { completeness: "PARTIAL" });
    const report = evaluate(model, withObservation(values, "pr", partial));
    const pr = report.surfaces.find((surface) => surface.surface === "pr");

    expect(pr?.verdict).toBe("PARTIAL");
    expect(pr?.reasons).toEqual(["SURFACE_PARTIAL"]);
    expect(pr?.experience).toEqual(positiveExperience());
    expect(report.verdict).toBe("PARTIAL");
  });

  it("rejects malformed and unknown surface observations deterministically", () => {
    const model = canonical();
    const values = observations(model);
    const malformed = observation(model, "agent", { adapter: null });
    const malformedReport = evaluate(
      model,
      withObservation(values, "agent", malformed),
    );
    const unknown = {
      ...observation(model, "cli"),
      surface: "future-surface",
    } as unknown as M49SurfaceObservation;
    const unknownValues = [...values];
    unknownValues[0] = unknown;
    const unknownReport = evaluateM49Parity(model, unknownValues, {
      evaluatedAt: EVALUATED_AT,
    });

    expect(
      malformedReport.surfaces.find((surface) => surface.surface === "agent"),
    ).toMatchObject({
      verdict: "MALFORMED",
      reasons: ["OBSERVATION_MALFORMED"],
    });
    expect(malformedReport.verdict).toBe("INCONCLUSIVE");
    expect(unknownReport.inputState).toBe("MALFORMED");
    expect(unknownReport.verdict).toBe("INCONCLUSIVE");
    expect(
      evaluateM49Parity(model, {}, { evaluatedAt: EVALUATED_AT }).inputState,
    ).toBe("MALFORMED");
  });

  it("keeps unsupported surfaces explicit and blocks persona completion", () => {
    const model = canonical();
    const values = observations(model);
    const unsupported = observation(model, "sarif", {
      support: "UNSUPPORTED",
      adapter: null,
      experience: unsupportedExperience(),
      unsupportedReason: "No SARIF journey is exercised by this candidate.",
    });
    const report = evaluate(
      model,
      withObservation(values, "sarif", unsupported),
    );
    const sarif = report.surfaces.find(
      (surface) => surface.surface === "sarif",
    );

    expect(sarif?.verdict).toBe("UNSUPPORTED");
    expect(sarif?.reasons).toEqual(["SURFACE_UNSUPPORTED"]);
    expect(report.verdict).toBe("UNSUPPORTED");
    expect(
      evaluateM49PersonaCompletion(report).every(
        (persona) => persona.completion === "INCOMPLETE",
      ),
    ).toBe(true);
  });

  it.each([
    ["accessibility", { accessibility: "FAIL" }, "ACCESSIBILITY_NOT_PASS"],
    ["localization", { localization: "STALE" }, "LOCALIZATION_NOT_CURRENT"],
    ["recovery", { recovery: "MISSING" }, "RECOVERY_NOT_AVAILABLE"],
  ] as const)(
    "keeps a non-passing %s state explicit",
    (_state, experience, reason) => {
      const model = canonical();
      const values = observations(model);
      const degraded = observation(model, "web", {
        experience: { ...positiveExperience(), ...experience },
      });
      const report = evaluate(model, withObservation(values, "web", degraded));
      const web = report.surfaces.find((surface) => surface.surface === "web");

      expect(web?.verdict).toBe("INCOMPLETE");
      expect(web?.reasons).toEqual([reason]);
      expect(report.verdict).toBe("PARTIAL");
      expect(
        evaluateM49PersonaCompletion(report).every(
          (persona) => persona.completion === "INCOMPLETE",
        ),
      ).toBe(true);
    },
  );

  it("rejects a surface projection that diverges from the canonical result", () => {
    const model = canonical();
    const values = observations(model);
    const adapter = adaptM49ResultToSurface(model, "json");
    const divergent = observation(model, "json", {
      adapter: Object.freeze({
        ...adapter,
        projection: Object.freeze({
          ...adapter.projection,
          primaryAction: "Hide the required action.",
        }),
      }),
    });
    const report = evaluate(model, withObservation(values, "json", divergent));

    expect(
      report.surfaces.find((surface) => surface.surface === "json"),
    ).toMatchObject({
      verdict: "DIVERGENT",
      reasons: ["PROJECTION_DIVERGENT"],
    });
    expect(report.verdict).toBe("FAIL");
  });

  it("never completes a persona from a faithful projection of a partial result", () => {
    const partialModel = canonical({
      completeness: "PARTIAL",
      verdict: "PARTIAL",
    });
    const report = evaluate(partialModel);
    const personas = evaluateM49PersonaCompletion(report);

    expect(report.verdict).toBe("PASS");
    expect(report.canonicalCompleteness).toBe("PARTIAL");
    expect(
      personas.every((persona) => persona.completion === "INCOMPLETE"),
    ).toBe(true);
    expect(personas[0]?.reasons).toContain("CANONICAL_PARTIAL");
  });

  it("ignores forged PASS claims when any required persona surface is not matched", () => {
    const report = evaluate(canonical());
    const forged = structuredClone(report) as unknown as {
      surfaces: Array<{
        surface: M49Surface;
        verdict: string;
        reasons: string[];
      }>;
      candidate: unknown;
    };
    const first = forged.surfaces[0];
    if (first === undefined) throw new Error("Missing parity fixture surface");
    first.verdict = "DIVERGENT";
    first.reasons = ["PROJECTION_DIVERGENT"];
    const personas = evaluateM49PersonaCompletion(forged);
    forged.candidate = null;
    const unbound = evaluateM49PersonaCompletion(forged);

    expect(
      personas.every((persona) => persona.completion === "INCOMPLETE"),
    ).toBe(true);
    expect(personas[0]?.reasons).toContain("SURFACE_NOT_MATCH");
    expect(
      unbound.every((persona) => persona.completion === "INCOMPLETE"),
    ).toBe(true);
    expect(unbound[0]?.reasons).toEqual(["PARITY_REPORT_INVALID"]);
  });

  it("bounds duplicate, missing, and over-limit observation sets", () => {
    const model = canonical();
    const values = observations(model);
    const duplicate = [...values.slice(0, -1), observation(model, "cli")];
    const missing = values.slice(0, -1);
    const overLimit = [...values, observation(model, "cli")];
    const duplicateReport = evaluate(model, duplicate);
    const missingReport = evaluate(model, missing);
    const overLimitReport = evaluate(model, overLimit);

    expect(duplicateReport.inputState).toBe("MALFORMED");
    expect(
      duplicateReport.surfaces.find((surface) => surface.surface === "cli"),
    ).toMatchObject({
      verdict: "MALFORMED",
      reasons: ["DUPLICATE_SURFACE"],
    });
    expect(missingReport.inputState).toBe("PARTIAL");
    expect(
      missingReport.surfaces.find((surface) => surface.surface === "agent"),
    ).toMatchObject({
      verdict: "INCOMPLETE",
      reasons: ["SURFACE_MISSING"],
    });
    expect(overLimitReport.inputState).toBe("PARTIAL");
    expect(overLimitReport.unprocessedCount).toBe(1);
  });

  it("rejects future evidence and contradictory unsupported state", () => {
    const model = canonical();
    const values = observations(model);
    const future = observation(model, "cli", {
      capturedAt: "2026-09-25T12:00:00.001Z",
    });
    const contradictory = observation(model, "pr", {
      support: "UNSUPPORTED",
      adapter: null,
      experience: positiveExperience(),
      unsupportedReason: "Unsupported surface.",
    });
    const futureReport = evaluate(
      model,
      withObservation(values, "cli", future),
    );
    const unsupportedReport = evaluate(
      model,
      withObservation(values, "pr", contradictory),
    );

    expect(
      futureReport.surfaces.find((surface) => surface.surface === "cli"),
    ).toMatchObject({
      verdict: "MALFORMED",
      reasons: ["EVIDENCE_FUTURE"],
    });
    expect(
      unsupportedReport.surfaces.find((surface) => surface.surface === "pr"),
    ).toMatchObject({
      verdict: "UNSUPPORTED",
      reasons: ["SURFACE_UNSUPPORTED", "EXPERIENCE_STATE_CONFLICT"],
    });
  });

  it("publishes closed state vocabularies and immutable adapter metadata", () => {
    const model = canonical();
    const adapter = adaptM49ResultToSurface(model, "web");

    expect(M49_RESULT_VERDICTS).toContain("PASS");
    expect(M49_SECTION_STATES).toContain("UNSUPPORTED");
    expect(M49_ACCESSIBILITY_STATES).toContain("FAIL");
    expect(M49_LOCALIZATION_STATES).toContain("STALE");
    expect(M49_RECOVERY_STATES).toContain("MISSING");
    expect(Object.isFrozen(M49_SURFACE_ADAPTERS)).toBe(true);
    expect(Object.isFrozen(M49_SURFACE_ADAPTERS.web)).toBe(true);
    expect(adapter.schema).toBe(M49_SURFACE_ADAPTER_SCHEMA);
    expect(adapter.outputKind).toBe("html-document");
  });
});
