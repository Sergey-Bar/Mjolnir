/**
 * README architecture-asset reproducibility (assets/readme/architecture.svg).
 *
 * Same law as the hero, demo, gauge and flow assets: a committed picture
 * that nothing regenerates is a claim nobody checks. This one states a
 * worthiness score, finding counts, a rule ID, the evidence weights and
 * the frozen exit codes — if any of those drift, the README's "how it
 * works" section starts explaining a product that no longer exists.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { buildArchitectureSvg } from "../../scripts/generate-readme-architecture.js";

const ROOT = join(import.meta.dirname, "..", "..");
const SVG_PATH = join(ROOT, "assets", "readme", "architecture.svg");
const README = readFileSync(join(ROOT, "README.md"), "utf8");
const svg = (): string => readFileSync(SVG_PATH, "utf8");

describe("assets/readme/architecture.svg", () => {
  it("matches what the generator produces (regenerate with `npm run docs:architecture`)", () => {
    expect(
      buildArchitectureSvg(),
      "the committed asset no longer matches the generator — run " +
        "`npm run docs:architecture` and commit the result.",
    ).toBe(svg());
  });

  it("the README references it (a generated file no page shows is a maintained orphan)", () => {
    expect(README).toContain("assets/readme/architecture.svg");
  });

  it("carries the score and rule ID the demo script asserts", () => {
    const script = JSON.parse(
      readFileSync(join(ROOT, "assets", "video", "script.demo.json"), "utf8"),
    ) as {
      beats: Array<{
        id: string;
        assertions?: { score?: number; requiredFindings?: string[] };
      }>;
    };
    const a = script.beats.find((b) => b.id === "hero-scan")?.assertions ?? {};
    const s = svg();
    expect(s).toContain(`>${a.score}<`);
    expect(s).toContain((a.requiredFindings ?? [])[0] as string);
  });

  it("names every frozen exit code, so the gate panel cannot quietly drop one", () => {
    const s = svg();
    for (const code of ["0", "1", "2", "10", "20"]) {
      expect(s, `architecture.svg no longer names exit code ${code}`).toMatch(
        new RegExp(`>${code}</text>`),
      );
    }
  });

  it("keeps the evidence ladder unequal and the runtime boundary explicit", () => {
    const s = svg();
    for (const level of ["E0", "E1", "E2"]) expect(s).toContain(`>${level}<`);
    // The whole point of the picture: E1 is not E2, and static analysis
    // cannot claim the runtime rungs.
    expect(s).toContain("weight  none · half · full");
    expect(s).toContain("Evidence level is earned, not assumed.");
    expect(s).toContain("L3–L5 require a real run.");
    expect(s).toContain("Static analysis can never claim them.");
  });

  it("states every product boundary the diagram must not overclaim past", () => {
    // Wording may move between the engine and the footer; the CLAIMS may
    // not quietly disappear. Each of these is a differentiator the README
    // leans on, so losing one silently would be the exact failure mode
    // this project exists to catch.
    const s = svg();
    for (const claim of [
      "runs your tests",
      "executes your code",
      "replaces your framework",
      "proves business correctness",
      "signals in · evidence out · nothing executed",
      "Verification trust, not business correctness.",
    ]) {
      expect(s, `architecture.svg no longer states "${claim}"`).toContain(
        claim,
      );
    }
  });

  it("labels the score as an example, so 75 is never read as universal", () => {
    expect(svg()).toContain("EXAMPLE RESULT");
  });

  it("keeps the 16:9 footprint the README embeds it at", () => {
    const s = svg();
    expect(s).toContain('viewBox="0 0 1600 900"');
    expect(README).toMatch(/architecture\.svg"[^>]*width="1600"/);
  });
});
