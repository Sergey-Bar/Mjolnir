/**
 * README brand assets (hero, scan, finding anatomy, stack, trust ladder,
 * closing) — the drift lock for scripts/generate-readme-brand.ts, on the
 * same terms as the hero, demo, gauge and architecture assets: a
 * committed picture nothing regenerates is a claim nobody checks.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  BRAND_ASSETS,
  buildScanSvg,
  scanFindings,
} from "../../scripts/generate-readme-brand.js";

const ROOT = join(import.meta.dirname, "..", "..");
const README = readFileSync(join(ROOT, "README.md"), "utf8");
const FILES = Object.keys(BRAND_ASSETS);
const committed = (file: string): string =>
  readFileSync(join(ROOT, "assets", "readme", file), "utf8");

describe("README brand assets", () => {
  it.each(FILES)(
    "assets/readme/%s matches its generator (npm run docs:readme-brand)",
    (file) => {
      expect(
        BRAND_ASSETS[file]?.(),
        `assets/readme/${file} no longer matches the generator — run ` +
          "`npm run docs:readme-brand` and commit the result.",
      ).toBe(committed(file));
    },
  );

  it.each(FILES)(
    "the README shows assets/readme/%s (a generated file no page shows is a maintained orphan)",
    (file) => {
      expect(README).toContain(`assets/readme/${file}`);
    },
  );

  it.each(FILES)(
    "assets/readme/%s plays once and holds still under reduced motion",
    (file) => {
      const svg = committed(file);
      expect(svg).not.toMatch(/\binfinite\b/);
      expect(svg).toContain("@media (prefers-reduced-motion: reduce)");
    },
  );

  it("the scan draws every finding the demo report holds for the file, at the line reported", () => {
    const findings = scanFindings();
    expect(findings.length).toBeGreaterThan(0);
    const svg = buildScanSvg();
    expect(svg.match(/<g class="chip"/g) ?? []).toHaveLength(findings.length);
    for (const x of findings)
      expect(svg).toContain(`line ${x.line}, ${x.severity}, ${x.ruleId}`);
  });

  it("how-it-works.svg keeps every claim the poster makes", () => {
    const svg = committed("how-it-works.svg");
    for (const code of ["0", "1", "2", "10", "20"])
      expect(svg, `exit code ${code} is missing`).toMatch(
        new RegExp(`>${code}</text>`),
      );
    for (const w of ["weight none", "weight half", "weight full"])
      expect(svg).toContain(w);
    expect(svg).toContain(
      "L3–L5 require a real run. Static analysis can never claim them.",
    );
    expect(svg).toContain("EXAMPLE RESULT");
    for (const claim of [
      "runs your tests",
      "executes your code",
      "replaces your framework",
      "proves business correctness",
      "signals in · evidence out · nothing executed",
      "Verification trust, not business correctness.",
    ])
      expect(svg, `"${claim}" is missing`).toContain(claim);
  });

  it("how-it-works.svg is shown at the width it was composed at, so nothing is scaled down", () => {
    expect(committed("how-it-works.svg")).toContain('width="880"');
    expect(README).toMatch(/how-it-works\.svg"[^>]*width="880"/);
  });
});
