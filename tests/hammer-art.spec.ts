/**
 * Hammer score instrument (art.ts) — the score-state art. Locks the
 * pure-function contract across all four bands × {unicode, ascii} ×
 * {color, nocolor}, the width budget, and the caption that carries the
 * state without color (symbols-accompany-color, R11).
 */

import { describe, expect, it } from "vitest";
import {
  HAMMER_CAPTIONS,
  HAMMER_STATES,
  FORGED_WORDMARK,
  renderHammer,
} from "../src/reporter/art.js";
import { gaugeColorForBand, palette } from "../src/reporter/theme.js";
import { deriveScoreState } from "../src/reporter/score-state.js";

const BANDS = ["critical", "warning", "trusted", "forged"] as const;
type Band = (typeof BANDS)[number];
const SCORES: Record<Band, number> = {
  critical: 20,
  warning: 65,
  trusted: 90,
  forged: 100,
};

describe("HAMMER_STATES covers every score band in both glyph systems", () => {
  it("all four bands have unicode and ascii variants", () => {
    for (const band of BANDS) {
      expect(HAMMER_STATES[band]?.unicode).toBeDefined();
      expect(HAMMER_STATES[band]?.ascii).toBeDefined();
    }
  });

  it("art rows stay within the 22-col budget", () => {
    for (const band of BANDS) {
      for (const variant of ["unicode", "ascii"] as const) {
        const art = HAMMER_STATES[band][variant];
        const rows = [
          ...art.aura,
          art.runes,
          art.headTop,
          art.headFace,
          art.headBrow,
          ...art.haft,
          art.pommel,
          ...art.underglow,
        ];
        for (const row of rows) expect(row.length).toBeLessThanOrEqual(22);
      }
    }
  });
});

describe("renderHammer — all 4 states × {unicode, ascii} × {color, nocolor}", () => {
  it.each(BANDS)("%s: renders the caption line in both modes", (band) => {
    const state = deriveScoreState(SCORES[band]);
    const colored = renderHammer(state, palette(true), false);
    const plain = renderHammer(state, palette(false), false);
    expect(colored.join("\n")).toContain(HAMMER_CAPTIONS[band]);
    expect(plain.join("\n")).toContain(HAMMER_CAPTIONS[band]);
  });

  it.each(BANDS)("%s: ASCII mode emits no box-drawing/block glyphs", (band) => {
    const state = deriveScoreState(SCORES[band]);
    const out = renderHammer(state, palette(false), true).join("\n");
    expect(out).not.toMatch(/[█▓░▄▀╔╗╚╝║═╠╬╦╩╱╲─│⚠✗⚡]/);
    expect(out).toContain(HAMMER_CAPTIONS[band]);
  });

  it("critical carries the fracture glyphs in the unicode head", () => {
    const state = deriveScoreState(SCORES.critical);
    const out = renderHammer(state, palette(true), false).join("\n");
    expect(out).toContain("╱╲");
  });

  it("warning shows partially-lit runes (fewer than trusted)", () => {
    const warn = HAMMER_STATES.warning.unicode.runes.trim();
    const trust = HAMMER_STATES.trusted.unicode.runes.trim();
    expect(warn.length).toBeGreaterThan(0);
    expect(warn.length).toBeLessThan(trust.length);
  });

  it("trusted renders energy arcs flanking the head", () => {
    const state = deriveScoreState(SCORES.trusted);
    const out = renderHammer(state, palette(true), false).join("\n");
    expect(out).toMatch(/~/);
  });

  it("forged renders the halo row and lightning underglow", () => {
    const state = deriveScoreState(SCORES.forged);
    const out = renderHammer(state, palette(true), false).join("\n");
    expect(out).toContain("╭");
    expect(out).toContain("⚡");
  });

  it("is deterministic — same state, same output", () => {
    for (const band of BANDS) {
      const state = deriveScoreState(SCORES[band]);
      expect(renderHammer(state, palette(true), false)).toEqual(
        renderHammer(state, palette(true), false),
      );
      expect(renderHammer(state, palette(false), true)).toEqual(
        renderHammer(state, palette(false), true),
      );
    }
  });

  it("NO_COLOR palette emits zero ANSI escapes but keeps every line legible", () => {
    for (const band of BANDS) {
      const state = deriveScoreState(SCORES[band]);
      const out = renderHammer(state, palette(false), false).join("\n");
      // eslint-disable-next-line no-control-regex
      expect(/\x1b\[/.test(out)).toBe(false);
      expect(out).toContain(HAMMER_CAPTIONS[band]);
    }
  });

  it("colored palettes actually color the state lines", () => {
    const trusted = renderHammer(
      deriveScoreState(SCORES.trusted),
      palette(true),
      false,
    ).join("\n");
    const forged = renderHammer(
      deriveScoreState(SCORES.forged),
      palette(true),
      false,
    ).join("\n");
    // trusted → aurora-cyan, forged → white-gold (NORSE values)
    expect(trusted).toContain("\x1b[38;2;92;196;224m");
    expect(forged).toContain("\x1b[38;2;244;220;156m");
  });
});

describe("unmeasured state — the hammer cannot be weighed", () => {
  it("deriveScoreState(null) maps to the unmeasured band and dim color", () => {
    const state = deriveScoreState(null);
    expect(state.band).toBe("unmeasured");
    expect(state.color).toBe("dim");
  });

  it("renderHammer degrades to the one-line caption in both glyph modes", () => {
    const state = deriveScoreState(null);
    for (const ascii of [false, true]) {
      const lines = renderHammer(state, palette(true), ascii);
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain("[UNMEASURED]");
      expect(lines.join("\n")).not.toMatch(/[█▓╔⚡]/);
    }
  });

  it("gaugeColorForBand resolves every band, unmeasured to dim", () => {
    const p = palette(true);
    expect(gaugeColorForBand("forged", p)("x")).toBe(p.forged("x"));
    expect(gaugeColorForBand("trusted", p)("x")).toBe(p.trusted("x"));
    expect(gaugeColorForBand("warning", p)("x")).toBe(p.warning("x"));
    expect(gaugeColorForBand("critical", p)("x")).toBe(p.error("x"));
    expect(gaugeColorForBand("unmeasured", p)("x")).toBe(p.dim("x"));
  });
});

describe("FORGED_WORDMARK", () => {
  it("is the spaced 100-state wordmark", () => {
    expect(FORGED_WORDMARK).toContain("F O R G E D");
  });
});
