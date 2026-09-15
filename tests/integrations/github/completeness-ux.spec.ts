/**
 * Completeness & Framework-Limitation UX (PRUX-006) — test suite.
 */

import { describe, expect, it } from "vitest";

import {
  renderCompletenessWarning,
  renderFrameworkLimitations,
} from "../../../src/integrations/github/completeness-ux.js";
import type { FrameworkSupportSummary } from "../../../src/integrations/github/pr-comment-contract.js";

describe("renderCompletenessWarning", () => {
  it("returns empty string for COMPLETE analysis", () => {
    expect(renderCompletenessWarning("COMPLETE", 0)).toBe("");
  });

  it("returns warning for PARTIAL analysis", () => {
    const result = renderCompletenessWarning("PARTIAL", 0);
    expect(result).toContain("Partial Analysis");
    expect(result).toContain("not all files were fully analyzed");
    expect(result).toContain("A partial scan cannot block CI");
  });

  it("includes file count in PARTIAL warning when > 0", () => {
    const result = renderCompletenessWarning("PARTIAL", 5);
    expect(result).toContain("5 file(s) were only partially analyzed");
  });

  it("omits file count in PARTIAL warning when 0", () => {
    const result = renderCompletenessWarning("PARTIAL", 0);
    expect(result).not.toContain("file(s) were only partially analyzed");
  });

  it("returns error warning for ERROR analysis", () => {
    const result = renderCompletenessWarning("ERROR", 0);
    expect(result).toContain("Analysis Error");
    expect(result).toContain("encountered errors");
    expect(result).toContain("incomplete or unreliable");
  });
});

describe("renderFrameworkLimitations", () => {
  const emptySummary: FrameworkSupportSummary = {
    detected: [],
    unknown: false,
    details: "",
  };

  it("returns empty string when no limitations", () => {
    expect(renderFrameworkLimitations(emptySummary)).toBe("");
  });

  it("warns when framework detection is unknown", () => {
    const summary: FrameworkSupportSummary = {
      detected: [],
      unknown: true,
      details: "",
    };
    const result = renderFrameworkLimitations(summary);
    expect(result).toContain("Framework detection uncertain");
    expect(result).toContain("Some rules may not have been applied");
  });

  it("includes details when present", () => {
    const summary: FrameworkSupportSummary = {
      detected: ["jest"],
      unknown: false,
      details: "Jest detected but no Playwright",
    };
    const result = renderFrameworkLimitations(summary);
    expect(result).toContain("Jest detected but no Playwright");
  });

  it("renders both unknown warning and details", () => {
    const summary: FrameworkSupportSummary = {
      detected: [],
      unknown: true,
      details: "No test framework imports found",
    };
    const result = renderFrameworkLimitations(summary);
    expect(result).toContain("Framework detection uncertain");
    expect(result).toContain("No test framework imports found");
  });

  it("returns empty when detected frameworks exist and not unknown", () => {
    const summary: FrameworkSupportSummary = {
      detected: ["vitest", "playwright"],
      unknown: false,
      details: "",
    };
    // When unknown is false and detected has items but no details,
    // the function returns empty (no limitations to report).
    // The renderer handles showing detected frameworks separately.
    expect(renderFrameworkLimitations(summary)).toBe("");
  });
});
