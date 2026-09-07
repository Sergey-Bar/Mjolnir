/**
 * README score-gauge asset reproducibility.
 *
 * assets/readme/score-gauge.svg replaced the old static score/verdict
 * table with a real sweep of `deriveScoreState`/`renderHammer`/
 * `scoreGauge` across every score 0-100 — it's a rendering of the exact
 * pure functions the CLI calls for every scan, not hand-drawn art. This
 * spec is the drift lock: it regenerates the asset from the same code
 * path `npm run docs:gauge` uses and asserts the committed file matches,
 * the same guarantee hero-asset-reproducibility.spec.ts makes for
 * terminal-hero.svg.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { buildScoreGaugeSvg } from "../../scripts/generate-readme-score-gauge.js";

const ROOT = join(import.meta.dirname, "..", "..");
const SVG_PATH = join(ROOT, "assets", "readme", "score-gauge.svg");

describe("assets/readme/score-gauge.svg reproducibility", () => {
  it("the committed SVG is byte-identical to a freshly built one", () => {
    expect(
      buildScoreGaugeSvg(),
      "the committed asset no longer matches deriveScoreState/renderHammer/" +
        "scoreGauge — regenerate with `npm run docs:gauge` and commit the result.",
    ).toBe(readFileSync(SVG_PATH, "utf8"));
  });

  it("the README actually references the score-gauge asset", () => {
    const readme = readFileSync(join(ROOT, "README.md"), "utf8");
    expect(readme).toContain("assets/readme/score-gauge.svg");
  });

  it("contains a frame for every integer score 0-100 (no gaps in the sweep)", () => {
    const svg = readFileSync(SVG_PATH, "utf8");
    for (const score of [0, 1, 49, 50, 79, 80, 99, 100]) {
      const padded = String(score).padStart(3);
      expect(
        svg,
        `score-gauge asset has no frame for score ${score}`,
      ).toContain(`>${padded}<`);
    }
  });

  it("every real hammer band (critical/warning/trusted/forged) appears exactly once", () => {
    const svg = readFileSync(SVG_PATH, "utf8");
    for (const band of ["critical", "warning", "trusted", "forged"]) {
      const matches = svg.match(new RegExp(`class="hb hb-${band}"`, "g")) ?? [];
      expect(matches.length).toBe(1);
    }
  });

  it("the docs:gauge script exists in package.json (regeneration is possible)", () => {
    const pkg = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    expect(pkg.scripts["docs:gauge"]).toBeDefined();
  });
});
