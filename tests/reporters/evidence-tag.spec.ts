/**
 * `evidenceTag` is the single definition site for the evidence tag that both
 * the markdown and the HTML trust-report surfaces render. It has a per-file
 * coverage threshold in vitest.config.ts, and it had no test at all Ã¢â‚¬” a
 * four-branch renderer whose output is quoted in release-facing reports.
 *
 * The branches matter because they encode the difference between "we ran it"
 * and "we found something", and between "deterministic" evidence and a
 * pattern match. A renderer that silently flipped those would misdescribe
 * evidence rather than break the build.
 */
import { describe, expect, it } from "vitest";

import { evidenceTag } from "../../src/reporter/evidence-tag.js";
import type { Finding } from "../../src/types.js";

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: "F-1",
    severity: "info",
    category: "test",
    title: "a finding",
    description: "a finding",
    file: "src/a.ts",
    line: 1,
    column: 1,
    evidenceLevel: "E2",
    ...overrides,
  } as Finding;
}

describe("evidenceTag", () => {
  it("reports a corroborated defect as a run, and says so", () => {
    expect(
      evidenceTag(
        finding({
          runtimeCorroboration: { level: "defect", source: "playwright" },
        } as unknown as Partial<Finding>),
      ),
    ).toBe("run corroborated");
  });

  it("reports a corroborated non-defect as a run without over-claiming", () => {
    expect(
      evidenceTag(
        finding({
          runtimeCorroboration: { level: "executed", source: "playwright" },
        } as unknown as Partial<Finding>),
      ),
    ).toBe("run executed");
  });

  it("prefers the runtime corroboration over the static evidence level", () => {
    // A pattern-level finding that a run then executed is still a run. The
    // reverse ordering would label it "pattern" and lose the fact that it ran.
    expect(
      evidenceTag(
        finding({
          evidenceLevel: "E1",
          runtimeCorroboration: { level: "executed", source: "playwright" },
        } as unknown as Partial<Finding>),
      ),
    ).toBe("run executed");
  });

  it("calls uncorroborated E2 evidence deterministic", () => {
    expect(evidenceTag(finding({ evidenceLevel: "E2" }))).toBe("deterministic");
  });

  it("defaults an absent evidence level to E2 rather than to a pattern", () => {
    // The default is the honest one: a finding with no stated level has not
    // been shown to be pattern-level either.
    expect(evidenceTag(finding({ evidenceLevel: undefined as never }))).toBe(
      "deterministic",
    );
  });

  it("calls a non-E2 level a pattern", () => {
    for (const level of ["E0", "E1"] as const) {
      expect(evidenceTag(finding({ evidenceLevel: level }))).toBe("pattern");
    }
  });
});
