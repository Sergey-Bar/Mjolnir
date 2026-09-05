/**
 * release-changelog.mjs — the deterministic CHANGELOG transform for the
 * auto-release path (plan .kilo/plans/1788579000817).
 *
 * Fixtures mirror the real file's shape (Keep-a-Changelog with MULTIPLE
 * thematic `## [Unreleased] — …` sections, e.g. Phase 7 + Phase 8):
 * - single Unreleased section
 * - multiple Unreleased sections collapsing under one version heading
 * - zero Unreleased sections → generated "Changes since" section
 * - idempotency guard: refuse when the version heading already exists
 */

import { describe, expect, it } from "vitest";
import { applyChangelogRelease } from "../scripts/release-changelog.mjs";

const HEADER = [
  "# Changelog",
  "",
  "The format is based on Keep a Changelog.",
  "",
].join("\n");

const SINGLE_UNRELEASED = `${HEADER}## [Unreleased] — Phase 8 — Local Extensibility

### Added

- folder-based external rules, zero network.
`;

const MULTIPLE_UNRELEASED = `${HEADER}## [Unreleased] — Phase 8 — Local Extensibility

### Added

- folder-based external rules.

## [Unreleased] — Phase 7 — Agentic QA Trust

### Added

- provenance detection.
`;

const NO_UNRELEASED = `${HEADER}## [0.5.0] — 2026-08-30

### Added

- the hammer is the gauge.
`;

describe("applyChangelogRelease", () => {
  it("inserts the version heading above a single Unreleased section", () => {
    const { text, mode } = applyChangelogRelease(
      SINGLE_UNRELEASED,
      "0.5.1",
      "2026-09-05",
      [],
      "0.5.0",
    );
    expect(mode).toBe("released");
    expect(text).toContain("## [0.5.1] — 2026-09-05");
    expect(text.indexOf("## [0.5.1]")).toBeLessThan(
      text.indexOf("### Phase 8"),
    );
    expect(text).toContain("### Phase 8 — Local Extensibility");
    expect(text).toContain("- folder-based external rules, zero network.");
    // No `## [Unreleased]` heading survives the transform.
    expect(text.includes("## [Unreleased]")).toBe(false);
  });

  it("collapses multiple Unreleased sections under one version heading", () => {
    const { text, mode } = applyChangelogRelease(
      MULTIPLE_UNRELEASED,
      "1.0.0",
      "2026-09-05",
      [],
      "0.5.0",
    );
    expect(mode).toBe("released");
    expect(text.match(/## \[Unreleased\]/g)).toBeNull();
    expect(text.match(/## \[1\.0\.0\]/g)).toHaveLength(1);
    // Both thematic titles survive, demoted one level, in order.
    expect(text.indexOf("### Phase 8 — Local Extensibility")).toBeGreaterThan(
      text.indexOf("## [1.0.0] — 2026-09-05"),
    );
    expect(text.indexOf("### Phase 7 — Agentic QA Trust")).toBeGreaterThan(
      text.indexOf("### Phase 8 — Local Extensibility"),
    );
    // Content preserved verbatim under each demoted title.
    expect(text).toContain("- folder-based external rules.");
    expect(text).toContain("- provenance detection.");
  });

  it("preserves the released sections below untouched", () => {
    const text = applyChangelogRelease(
      `${SINGLE_UNRELEASED}\n${NO_UNRELEASED.slice(HEADER.length)}`,
      "0.5.1",
      "2026-09-05",
      [],
      "0.5.0",
    ).text;
    expect(text).toContain("## [0.5.0] — 2026-08-30");
    expect(text).toContain("- the hammer is the gauge.");
    // Version heading goes above Unreleased, not above the released
    // section: it must precede [0.5.0], which stays where it was.
    expect(text.indexOf("## [0.5.1]")).toBeLessThan(text.indexOf("## [0.5.0]"));
  });

  it("generates a Changes-since section when no Unreleased sections exist", () => {
    const { text, mode } = applyChangelogRelease(
      NO_UNRELEASED,
      "0.6.0",
      "2026-09-05",
      [
        "trust-plan: Phases 3–8 (#25)",
        "lint-ratchet sweep: 495 warnings to zero (#26)",
      ],
      "0.5.0",
    );
    expect(mode).toBe("generated");
    expect(text).toContain("## [0.6.0] — 2026-09-05");
    expect(text).toContain("### Changes since 0.5.0");
    expect(text).toContain("- trust-plan: Phases 3–8 (#25)");
    expect(text).toContain("- lint-ratchet sweep: 495 warnings to zero (#26)");
    // The generated block lands above the previous release heading.
    expect(text.indexOf("## [0.6.0]")).toBeLessThan(text.indexOf("## [0.5.0]"));
    expect(text).toContain("- the hammer is the gauge.");
  });

  it("refuses to run when the version heading already exists (idempotency)", () => {
    const alreadyReleased = `${NO_UNRELEASED}## [0.5.1] — 2026-09-04\n\n### Fixed\n\n- nothing.\n`;
    expect(() =>
      applyChangelogRelease(
        alreadyReleased,
        "0.5.1",
        "2026-09-05",
        [],
        "0.5.0",
      ),
    ).toThrow(/already has a \[0\.5\.1\] heading/);
  });

  it("the guard distinguishes 0.5.1 from 0.5.10 (dot is not a wildcard)", () => {
    const withZeroPointTen = `${NO_UNRELEASED}## [0.5.10] — 2026-09-04\n`;
    // 0.5.1 must NOT match the [0.5.10] heading — this should transform.
    const { text } = applyChangelogRelease(
      withZeroPointTen,
      "0.5.1",
      "2026-09-05",
      [],
      "0.5.0",
    );
    expect(text).toContain("## [0.5.1] — 2026-09-05");
  });

  it("a bare ## [Unreleased] heading (no title) demotes without inventing a title", () => {
    const bare = `${HEADER}## [Unreleased]\n\n### Added\n\n- something.\n`;
    const { text } = applyChangelogRelease(
      bare,
      "0.5.1",
      "2026-09-05",
      [],
      "0.5.0",
    );
    expect(text).toContain("## [0.5.1] — 2026-09-05");
    expect(text).toContain("- something.");
    expect(text.match(/^### Unreleased$/gm)).toBeNull();
    expect(text.match(/## \[Unreleased\]/g)).toBeNull();
  });
});
