/**
 * Brand token surface reproducibility.
 *
 * `src/brand/tokens.ts` is the single source of brand truth and
 * `npm run brand:tokens` emits the machine-consumable surfaces from it.
 * The whole arrangement is worth nothing if a committed surface can
 * silently stop matching the tokens — that is the exact defect the
 * generator exists to prevent, six copies of a palette with one guarded
 * edge between them.
 *
 * So: regenerate through the same code path the npm script uses and
 * assert the committed files are byte-identical. Same shape as the four
 * README asset reproducibility specs, for the same reason.
 *
 * The determinism assertion is not decoration either. A generator that
 * emits a timestamp, or iterates a hash map, produces a different file
 * on every run and turns its own drift lock into noise the next reader
 * learns to ignore.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildTokensJson,
  buildVarsCss,
} from "../../scripts/generate-brand-tokens.js";
import {
  BRAND,
  EVIDENCE,
  SCORE,
  STATUS,
  SURFACE,
  TEXT,
  TRUST,
  TRUST_RUNTIME_BOUNDARY,
} from "../../src/brand/tokens.js";

const ROOT = join(import.meta.dirname, "..", "..");
const TOKENS_JSON = join(ROOT, "assets", "brand", "tokens.json");
const VARS_CSS = join(ROOT, "site", ".vitepress", "theme", "styles", "vars.css");

/** WCAG 2.1 relative luminance. */
function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const channel = (c: number): number => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel((n >> 16) & 0xff) +
    0.7152 * channel((n >> 8) & 0xff) +
    0.0722 * channel(n & 0xff)
  );
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

describe("brand token surfaces", () => {
  it("assets/brand/tokens.json is byte-identical to a freshly built one", async () => {
    expect(
      await buildTokensJson(),
      "the committed token surface no longer matches src/brand/tokens.ts — " +
        "regenerate with `npm run brand:tokens` and commit the result.",
    ).toBe(readFileSync(TOKENS_JSON, "utf8"));
  });

  it("site vars.css is byte-identical to a freshly built one", async () => {
    expect(
      await buildVarsCss(),
      "the committed site variables no longer match src/brand/tokens.ts — " +
        "regenerate with `npm run brand:tokens` and commit the result.",
    ).toBe(readFileSync(VARS_CSS, "utf8"));
  });

  it("the generator is deterministic — same tokens in, same bytes out", async () => {
    expect(await buildTokensJson()).toBe(await buildTokensJson());
    expect(await buildVarsCss()).toBe(await buildVarsCss());
  });
});

describe("brand token semantics", () => {
  it("every foreground token clears WCAG AA on every surface it may sit on", () => {
    // The check that would have caught the one real accessibility defect
    // in the palette: the terminal's rune-red at 4.36:1 on its own
    // background. Computed, never estimated — see brand-doctor rule 8,
    // which runs the same arithmetic over the whole repository.
    const surfaces = [
      SURFACE.ink950,
      SURFACE.ink900,
      SURFACE.ink850,
      SURFACE.ink800,
      SURFACE.panel,
    ];
    const foregrounds = {
      ...BRAND,
      ...TEXT,
      ...STATUS,
      ...SCORE,
      ...EVIDENCE,
      ...TRUST,
    } as Record<string, string>;

    // Two tokens are backgrounds, not foregrounds, and are asserted the
    // other way round below: `onGold` is the ink set ON gold, and
    // `goldDeep` is the pressed/deepest gold VitePress uses as
    // `--vp-c-brand-3` behind that ink. Neither is ever text on the ink
    // ramp, and 4.26:1 for goldDeep-on-ink800 is the arithmetic saying
    // exactly that — not a defect to paper over.
    const backgroundOnly = new Set(["onGold", "goldDeep"]);

    const failures: string[] = [];
    for (const [name, fg] of Object.entries(foregrounds)) {
      if (backgroundOnly.has(name)) continue;
      for (const bg of surfaces) {
        const ratio = contrast(fg, bg);
        if (ratio < 4.5)
          failures.push(`${name} ${fg} on ${bg} — ${ratio.toFixed(2)}:1`);
      }
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });

  it("text on gold clears AA on every gold step", () => {
    // Including goldDeep, which is only ever a background: 5.20:1.
    for (const gold of [
      BRAND.gold,
      BRAND.goldBright,
      BRAND.goldHot,
      BRAND.goldDeep,
    ]) {
      expect(
        contrast(TEXT.onGold, gold),
        `TEXT.onGold on ${gold}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("the trust ladder changes hue exactly at the runtime boundary", () => {
    // L0-L2 are static and share the neutral steel ramp; L3-L5 require a
    // real run and share the aurora ramp. If a future edit blurs that
    // into one continuous gradient, the ladder stops communicating the
    // one thing it exists to communicate — that a static-only finding
    // cannot climb past L2, however confident it is.
    const rungs = [TRUST.l0, TRUST.l1, TRUST.l2, TRUST.l3, TRUST.l4, TRUST.l5];
    const chroma = (hex: string): number => {
      const n = Number.parseInt(hex.slice(1), 16);
      const [r, g, b] = [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
      return Math.max(r, g, b) - Math.min(r, g, b);
    };
    const staticRungs = rungs.slice(0, TRUST_RUNTIME_BOUNDARY);
    const runtimeRungs = rungs.slice(TRUST_RUNTIME_BOUNDARY);

    // Neutral below the boundary, chromatic above it.
    for (const rung of staticRungs) expect(chroma(rung)).toBeLessThan(40);
    for (const rung of runtimeRungs) expect(chroma(rung)).toBeGreaterThan(60);
  });

  it("the unmeasured score state is neutral, never the error colour", () => {
    // UNKNOWN is a legitimate answer. Painting it red would say "this is
    // broken" where the honest statement is "this was not measured" —
    // the same failure mode as a CI gate that reports green without
    // having run.
    expect(SCORE.unmeasured).not.toBe(SCORE.critical);
    expect(SCORE.unmeasured).not.toBe(STATUS.error);
    expect(SCORE.unmeasured).toBe(TEXT.muted);
  });

  it("evidence levels are a hue-free brightness ramp", () => {
    // Certainty is not a value judgement: E2 is a defect we are sure
    // about, not good news. Brightness carries the ramp and the mark's
    // geometry carries the meaning, so it survives --ascii and NO_COLOR.
    const levels = [EVIDENCE.e0, EVIDENCE.e1, EVIDENCE.e2];
    for (let i = 1; i < levels.length; i++) {
      expect(luminance(levels[i]!)).toBeGreaterThan(luminance(levels[i - 1]!));
    }
  });
});
