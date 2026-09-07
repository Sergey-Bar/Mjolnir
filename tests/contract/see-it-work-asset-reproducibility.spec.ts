/**
 * README "See it work" asset reproducibility.
 *
 * assets/readme/see-it-work.svg replaced the poster+MP4 pattern (GitHub
 * will not autoplay a repo-relative MP4) with an animated SVG that
 * sequences four real beats: the two script.demo.json captures already
 * drift-locked by video-script.spec.ts, the same diffLines() the video
 * renderer uses for the CI-file fix, and a real `mjolnir handoff`
 * excerpt. This spec is the drift lock for THIS asset: it regenerates
 * from the same code path `npm run docs:see-it-work` uses and asserts
 * the committed file matches, the same guarantee every other generated
 * README asset carries.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { buildSeeItWorkSvg } from "../../scripts/generate-readme-see-it-work.js";

const ROOT = join(import.meta.dirname, "..", "..");
const SVG_PATH = join(ROOT, "assets", "readme", "see-it-work.svg");

describe("assets/readme/see-it-work.svg reproducibility", () => {
  it("the committed SVG is byte-identical to a freshly built one", async () => {
    expect(
      await buildSeeItWorkSvg(),
      "the committed asset no longer matches script.demo.json / diffLines / " +
        "renderHandoff — regenerate with `npm run docs:see-it-work` and commit the result.",
    ).toBe(readFileSync(SVG_PATH, "utf8"));
  });

  it("the README actually references the asset", () => {
    const readme = readFileSync(join(ROOT, "README.md"), "utf8");
    expect(readme).toContain("assets/readme/see-it-work.svg");
  });

  it("all four beats (scan, fix, rescan, handoff) are present", () => {
    const svg = readFileSync(SVG_PATH, "utf8");
    for (const id of ["scan", "fix", "rescan", "handoff"]) {
      expect(svg).toContain(`class="siw siw-${id}"`);
    }
  });

  it("the docs:see-it-work script exists in package.json (regeneration is possible)", () => {
    const pkg = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    expect(pkg.scripts["docs:see-it-work"]).toBeDefined();
  });
});
