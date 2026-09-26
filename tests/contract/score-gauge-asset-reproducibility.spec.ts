/**
 * README score-gauge asset reproducibility.
 *
 * assets/readme/score-gauge.svg is the worthiness scale with a marker
 * sweeping every score 0-100, rendered from `deriveScoreState` — the
 * pure function the CLI calls for every scan — not hand-drawn. This spec
 * is the drift lock: it regenerates the asset from the same code path
 * `npm run docs:gauge` uses and asserts the committed file matches, the
 * same guarantee hero-asset-reproducibility.spec.ts makes for
 * terminal-hero.svg.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { buildScoreGaugeSvg } from "../../scripts/generate-readme-score-gauge.js";
import { deriveScoreState } from "../../src/reporter/presentation.js";

const ROOT = join(import.meta.dirname, "..", "..");
const SVG_PATH = join(ROOT, "assets", "readme", "score-gauge.svg");

describe("assets/readme/score-gauge.svg reproducibility", () => {
  it("the committed SVG is byte-identical to a freshly built one", () => {
    expect(
      buildScoreGaugeSvg(),
      "the committed asset no longer matches deriveScoreState — regenerate " +
        "with `npm run docs:gauge` and commit the result.",
    ).toBe(readFileSync(SVG_PATH, "utf8"));
  });

  it("the README actually references the score-gauge asset", () => {
    const readme = readFileSync(join(ROOT, "README.md"), "utf8");
    expect(readme).toContain("assets/readme/score-gauge.svg");
  });

  it("contains a frame for every integer score 0-100 (no gaps in the sweep)", () => {
    const svg = readFileSync(SVG_PATH, "utf8");
    for (let score = 0; score <= 100; score++) {
      const padded = String(score).padStart(3);
      expect(
        svg,
        `score-gauge asset has no frame for score ${score}`,
      ).toContain(`>${padded}<`);
    }
  });

  it("draws every real band exactly once, named by the verdict it carries", () => {
    const svg = readFileSync(SVG_PATH, "utf8");
    const sample = { critical: 0, warning: 50, trusted: 80, forged: 100 };
    for (const [band, score] of Object.entries(sample)) {
      const matches =
        svg.match(new RegExp(`class="band band-${band}"`, "g")) ?? [];
      expect(matches.length).toBe(1);
      expect(svg).toContain(`>${deriveScoreState(score).verdict}<`);
    }
  });

  it("the docs:gauge script exists in package.json (regeneration is possible)", () => {
    const pkg = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    expect(pkg.scripts["docs:gauge"]).toBeDefined();
  });
});
