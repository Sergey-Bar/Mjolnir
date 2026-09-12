/**
 * README flow-asset reproducibility (assets/readme/flow.svg).
 *
 * Same law as the hero, demo and gauge assets: a committed picture that
 * nothing regenerates is a claim nobody checks. This asset is the
 * "See it work" panel — it states a before score, an after score,
 * finding counts and two rule IDs, all read from
 * assets/video/script.demo.json. If the demo script changes and the
 * picture does not, the README would show numbers the demo no longer
 * produces, in the section whose whole point is that the numbers are
 * real.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { buildFlowSvg } from "../../scripts/generate-readme-flow.js";

const ROOT = join(import.meta.dirname, "..", "..");
const SVG_PATH = join(ROOT, "assets", "readme", "flow.svg");
const README = readFileSync(join(ROOT, "README.md"), "utf8");

describe("assets/readme/flow.svg", () => {
  it("matches what the generator produces (regenerate with `npm run docs:flow`)", () => {
    expect(
      buildFlowSvg(),
      "the committed asset no longer matches the generator — run " +
        "`npm run docs:flow` and commit the result.",
    ).toBe(readFileSync(SVG_PATH, "utf8"));
  });

  it("the README references it (a generated file no page shows is a maintained orphan)", () => {
    expect(README).toContain("assets/readme/flow.svg");
  });

  it("carries the scores and rule IDs the demo script asserts", () => {
    const script = JSON.parse(
      readFileSync(join(ROOT, "assets", "video", "script.demo.json"), "utf8"),
    ) as {
      beats: Array<{
        id: string;
        assertions?: { score?: number; absentFindings?: string[] };
      }>;
    };
    const at = (id: string): { score?: number; absentFindings?: string[] } =>
      script.beats.find((b) => b.id === id)?.assertions ?? {};
    const svg = readFileSync(SVG_PATH, "utf8");

    expect(svg).toContain(`>${at("hero-scan").score}<`);
    expect(svg).toContain(`>${at("hero-rescan").score}<`);
    for (const rule of at("hero-rescan").absentFindings ?? []) {
      expect(svg, `flow.svg no longer names ${rule}`).toContain(rule);
    }
  });

  it("keeps the 16:9 footprint the README embeds it at", () => {
    const svg = readFileSync(SVG_PATH, "utf8");
    expect(svg).toContain('width="900"');
    expect(svg).toContain('height="506"');
    // The README must embed it at that same width, or the section's
    // layout silently drifts from what the generator lays out for.
    expect(README).toMatch(/flow\.svg"[^>]*width="900"/);
  });
});
