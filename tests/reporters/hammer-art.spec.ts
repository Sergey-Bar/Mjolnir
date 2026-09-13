/**
 * Score-state art (art.ts). The four-state hammer that used to live here
 * was removed from the report — the verdict word carries the state
 * without colour (R11) — so what remains to lock is the band colour
 * mapping, the unmeasured state, and the FORGED wordmark.
 */

import { describe, expect, it } from "vitest";
import { FORGED_WORDMARK } from "../../src/reporter/art.js";
import { gaugeColorForBand, palette } from "../../src/reporter/theme.js";
import { deriveScoreState } from "../../src/reporter/score-state.js";

describe("unmeasured state", () => {
  it("deriveScoreState(null) maps to the unmeasured band and dim color", () => {
    const state = deriveScoreState(null);
    expect(state.band).toBe("unmeasured");
    expect(state.color).toBe("dim");
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
