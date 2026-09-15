import { describe, expect, it } from "vitest";
import {
  getSemanticConcept,
  getAllConcepts,
  SEMANTIC_CONCEPT_COUNT,
} from "../../src/engine/semantic-model-api.js";

const EXPECTED_CONCEPTS = [
  "test",
  "suite",
  "assertion",
  "action",
  "navigation",
  "wait",
  "retry",
  "locator",
  "lifecycle",
  "fixture",
  "mock",
  "parameterization",
  "shared-state",
  "async",
] as const;

describe("semantic-model-api", () => {
  it("registers all 14 concepts", () => {
    expect(SEMANTIC_CONCEPT_COUNT).toBe(14);
    expect(getAllConcepts()).toHaveLength(14);
  });

  it.each(EXPECTED_CONCEPTS)("%s concept is registered", (name) => {
    const concept = getSemanticConcept(name);
    expect(concept).toBeDefined();
    expect(concept?.name).toBe(name);
    expect(concept?.description).toBeTruthy();
    expect(concept?.applicableFrameworks.length).toBeGreaterThan(0);
  });

  it("returns undefined for unknown concept name", () => {
    // @ts-expect-error -- deliberate invalid input
    expect(getSemanticConcept("nonexistent")).toBeUndefined();
  });

  it("filters by activeConcepts", () => {
    const concepts = getAllConcepts({ activeConcepts: ["test", "assertion"] });
    expect(concepts).toHaveLength(2);
    expect(concepts.map((c) => c.name)).toEqual(["test", "assertion"]);
  });

  it("filters by frameworks", () => {
    const concepts = getAllConcepts({ frameworks: ["pytest"] });
    const names = concepts.map((c) => c.name);
    expect(names).toContain("fixture");
    expect(names).toContain("assertion");
    expect(names).not.toContain("navigation");
  });

  it("filters by both activeConcepts and frameworks", () => {
    const concepts = getAllConcepts({
      activeConcepts: ["fixture", "navigation"],
      frameworks: ["pytest"],
    });
    expect(concepts).toHaveLength(1);
    expect(concepts[0]?.name).toBe("fixture");
  });

  it("returns all concepts when config is undefined", () => {
    expect(getAllConcepts(undefined)).toHaveLength(14);
  });

  it("returns all concepts when config has empty frameworks", () => {
    expect(getAllConcepts({ frameworks: [] })).toHaveLength(14);
  });

  it("every concept has applicable frameworks list", () => {
    for (const concept of getAllConcepts()) {
      expect(concept.applicableFrameworks).toBeInstanceOf(Array);
      expect(concept.applicableFrameworks.length).toBeGreaterThan(0);
    }
  });
});
