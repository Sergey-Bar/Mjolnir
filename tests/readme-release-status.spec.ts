import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { syncTranslation } from "../scripts/readme-release-status.mjs";
import {
  STRUCTURAL_GAP_THRESHOLD,
  extractSections,
  missingSections,
  translationStatus,
} from "../scripts/lib/readme-translation-status.mjs";

const root = join(import.meta.dirname, "..");
const source = readFileSync(join(root, "README.md"), "utf8");
const translation = readFileSync(join(root, "README.de.md"), "utf8");

// The rule lives in an untyped .mjs module, so TypeScript sees every value
// crossing the boundary as `any`. These aliases are the one place that
// boundary is described, and they are deliberately explicit about it.
const extractHeadings = extractSections as (text: string) => string[];
const findMissing = missingSections as (
  source: string[],
  translation: string[],
) => string[];
const decide = translationStatus as (input: {
  readmeDate: string | null;
  syncedDate: string;
  sourceHash: string | null;
  currentHash: string | null;
  sourceSections: string[];
  translationSections: string[];
}) => { status: string; findings: string[] };

// What the real translation looks like to the rule: it is missing whole
// sections of the English source, and it is behind the source date.
const REAL_SOURCE_SECTIONS: string[] = extractHeadings(source);
const REAL_TRANSLATION_SECTIONS: string[] = extractHeadings(translation);

const baseInput = {
  sourceHash: "abc123abc123",
  currentHash: "abc123abc123",
  sourceSections: REAL_SOURCE_SECTIONS,
  translationSections: REAL_TRANSLATION_SECTIONS,
};

describe("README release status synchronization", () => {
  it("ports the canonical release section and command rows", () => {
    const synced = syncTranslation(translation, source, "2026-09-25");
    expect(synced).toContain("## Release status (English canonical)");
    expect(synced).toContain("Machine-assisted canonical text");
    expect(synced).toContain("| `mjolnir release-report`");
    expect(synced).toContain("Source hash: `");
    expect(synced).toContain("Last synced: 2026-09-25");
  });

  it("exposes the remaining structural translation gap in strict mode", () => {
    const result = spawnSync(
      process.execPath,
      [join(root, "scripts", "check-readme-translations.mjs"), "--strict"],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("structurally incomplete");
  });

  it("is idempotent", () => {
    const once = syncTranslation(translation, source, "2026-09-25");
    expect(syncTranslation(once, source, "2026-09-25")).toBe(once);
  });
});

describe("translation status verdicts", () => {
  it("keeps the structural verdict when the translation is also stale", () => {
    // The regression. This verdict used to be gated behind a fresh date, so
    // the day after README.md changed every translation collapsed to
    // "stale by 1 day" and the structural finding disappeared from the report
    // entirely — which is when it matters most. The strict-mode contract test
    // above asserts the verdict is present, so the report went quiet and that
    // test went red.
    const { status, findings } = decide({
      ...baseInput,
      readmeDate: "2026-09-27",
      syncedDate: "2026-09-26",
    });

    expect(status).toContain("stale by 1 day");
    expect(status).toContain("structurally incomplete");
    expect(findings).toHaveLength(2);
  });

  it("still reports staleness alone for a structurally complete translation", () => {
    const { status } = decide({
      ...baseInput,
      readmeDate: "2026-09-27",
      syncedDate: "2026-09-26",
      translationSections: REAL_SOURCE_SECTIONS,
    });

    expect(status).toBe("stale by 1 day");
    expect(status).not.toContain("structurally incomplete");
  });

  it("reports a structurally complete, current translation as fresh", () => {
    const { status, findings } = decide({
      ...baseInput,
      readmeDate: "2026-09-26",
      syncedDate: "2026-09-26",
      translationSections: REAL_SOURCE_SECTIONS,
    });

    expect(status).toBe("fresh");
    expect(findings).toEqual([]);
  });

  it("keeps the structural verdict as the only finding when the date is current", () => {
    const { status } = decide({
      ...baseInput,
      readmeDate: "2026-09-26",
      syncedDate: "2026-09-26",
    });

    expect(status).toContain("structurally incomplete");
    expect(status).not.toContain("stale");
  });

  it("lets a source-hash mismatch win, because claiming currency is worse", () => {
    const { status } = decide({
      ...baseInput,
      readmeDate: "2026-09-27",
      syncedDate: "2026-09-26",
      sourceHash: "000000000000",
    });

    expect(status).toContain("content changed");
    expect(status).not.toContain("structurally incomplete");
  });

  it("says the date is unknown rather than guessing when git cannot answer", () => {
    const { status } = decide({
      ...baseInput,
      readmeDate: null,
      syncedDate: "2026-09-26",
    });

    expect(status).toBe("unknown (README.md date unavailable)");
  });

  it("ignores a small heading gap, which is just rephrasing", () => {
    // Two headings short of the source: under the threshold, so not reported.
    const { status } = decide({
      ...baseInput,
      readmeDate: "2026-09-26",
      syncedDate: "2026-09-26",
      translationSections: REAL_SOURCE_SECTIONS.slice(0, -2),
    });

    expect(status).toBe("fresh");
  });

  it("reports a gap once it exceeds the rephrasing threshold", () => {
    // Headings are matched on a 10-character prefix, so the count of missing
    // sections is derived rather than assumed: two source headings can share
    // a prefix and collapse into one finding.
    const partial: string[] = REAL_SOURCE_SECTIONS.slice(
      0,
      REAL_SOURCE_SECTIONS.length - 8,
    );
    const missing: string[] = findMissing(REAL_SOURCE_SECTIONS, partial);
    expect(missing.length).toBeGreaterThan(STRUCTURAL_GAP_THRESHOLD);

    const { status } = decide({
      ...baseInput,
      readmeDate: "2026-09-26",
      syncedDate: "2026-09-26",
      translationSections: partial,
    });

    expect(status).toBe(
      `structurally incomplete (missing ~${missing.length} sections)`,
    );
  });
});
