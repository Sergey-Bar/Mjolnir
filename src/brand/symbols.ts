/**
 * The Mjölnir symbol vocabulary.
 *
 * Three marks carry the product's epistemics, and before this each one
 * looked different on every surface it appeared on: evidence level was a
 * gold chip on the site, bracket text in the terminal and a coloured bar
 * in the architecture diagram; the trust ladder existed as six bars in
 * one SVG and one line of prose everywhere else.
 *
 * This module is the single geometric source. Like `tokens.ts` it is
 * PURE DATA — no I/O, no rendering, no imports beyond the tokens — so
 * the SVG generators, the website and the terminal can each draw the
 * same idea in their own medium without three definitions of it.
 *
 * TWO RULES GOVERN EVERY MARK HERE.
 *
 * 1. Geometry carries the meaning; colour only reinforces it. Every mark
 *    is distinguishable in monochrome, in `--ascii`, and under
 *    `NO_COLOR`. That is not a nicety — it is R11, and it is what makes
 *    the marks legible to a colour-blind reader and in a CI log.
 *
 * 2. A mark may never overstate what the product knows. The evidence
 *    ramp is hue-free because certainty is not good news; the trust
 *    ladder breaks at L2|L3 because that is a change of kind, not of
 *    degree.
 */

import { EVIDENCE, TRUST, TRUST_RUNTIME_BOUNDARY } from "./tokens.js";

/* ── Evidence marks ──────────────────────────────────────────── */

/**
 * E0 → E1 → E2, drawn as a ring that fills.
 *
 *     E0   ○   open        observation — nothing is closed yet
 *     E1   ◐   half        pattern evidence — half the ring, half the weight
 *     E2   ●   sealed      deterministic proof — the ring is closed
 *
 * The fill fraction IS the weight the scorer applies (none, half, full),
 * so the mark is not a decoration of the model — it is the model. A
 * reader who never reads the legend still learns that E1 counts for half
 * of E2, because it looks like half of E2.
 */
export interface EvidenceMark {
  level: "E0" | "E1" | "E2";
  /** What the level asserts, in the product's own words. */
  meaning: string;
  /** Fraction of the mark that is filled: the scorer's weight. */
  fill: 0 | 0.5 | 1;
  /** Unicode glyph for a terminal that renders it. */
  glyph: string;
  /** `--ascii` fallback for consoles that mangle the glyph. */
  ascii: string;
  /** Token colour. Reinforcement only — never the sole signal. */
  color: string;
}

export const EVIDENCE_MARKS: readonly EvidenceMark[] = [
  {
    level: "E0",
    meaning: "observation",
    fill: 0,
    glyph: "○",
    ascii: "( )",
    color: EVIDENCE.e0,
  },
  {
    level: "E1",
    meaning: "pattern evidence",
    fill: 0.5,
    glyph: "◐",
    ascii: "(-)",
    color: EVIDENCE.e1,
  },
  {
    level: "E2",
    meaning: "deterministic proof",
    fill: 1,
    glyph: "●",
    ascii: "(#)",
    color: EVIDENCE.e2,
  },
] as const;

/* ── Trust ladder ────────────────────────────────────────────── */

/**
 * L0 → L5, and the one boundary that matters.
 *
 *     L0  L1  L2  │  L3  L4  L5
 *     static      │  runtime required
 *
 * The rungs rise, but the ramp is not continuous: L0–L2 are neutral
 * steel and L3–L5 are aurora, with a visible gap between them. A
 * gradient would say "more of the same"; the break says what is true,
 * which is that a static-only finding cannot reach L3 however confident
 * it is. Any surface drawing this ladder must draw the break.
 */
export interface TrustRung {
  level: `L${0 | 1 | 2 | 3 | 4 | 5}`;
  /** What the rung claims. */
  meaning: string;
  /** True when the rung can only be reached with a real run report. */
  runtime: boolean;
  color: string;
}

const RUNG_MEANINGS = [
  "observation only",
  "heuristic static",
  "deterministic static",
  "the finding's file executed",
  "the finding's test executed",
  "the run verdict corroborates",
] as const;

const RUNG_COLORS = [
  TRUST.l0,
  TRUST.l1,
  TRUST.l2,
  TRUST.l3,
  TRUST.l4,
  TRUST.l5,
] as const;

export const TRUST_RUNGS: readonly TrustRung[] = RUNG_MEANINGS.map(
  (meaning, i) => ({
    level: `L${i as 0 | 1 | 2 | 3 | 4 | 5}`,
    meaning,
    runtime: i >= TRUST_RUNTIME_BOUNDARY,
    color: RUNG_COLORS[i as 0 | 1 | 2 | 3 | 4 | 5],
  }),
);

/** The index the ladder breaks at. Re-exported so a surface drawing the
 * ladder never hardcodes 3. */
export const RUNTIME_BOUNDARY = TRUST_RUNTIME_BOUNDARY;

/* ── Drawing helpers ─────────────────────────────────────────── */

/**
 * The evidence mark as SVG, centred on (cx, cy) with radius r.
 *
 * One ring, one clipped fill. The half state is a true half-disc rather
 * than a lighter ring, because "half filled" has to survive being
 * printed in black and white — a tint does not.
 */
export function evidenceMarkSvg(
  mark: EvidenceMark,
  cx: number,
  cy: number,
  r: number,
  opts: { stroke?: number } = {},
): string {
  const sw = opts.stroke ?? Math.max(1, r * 0.28);
  const ring = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${mark.color}" stroke-width="${sw}"/>`;
  if (mark.fill === 0) return ring;
  if (mark.fill === 1)
    return `${ring}<circle cx="${cx}" cy="${cy}" r="${r - sw / 2}" fill="${mark.color}"/>`;
  // Left half-disc: a wedge from top to bottom through the left side.
  const rr = r - sw / 2;
  return `${ring}<path d="M ${cx} ${cy - rr} A ${rr} ${rr} 0 0 0 ${cx} ${cy + rr} Z" fill="${mark.color}"/>`;
}

/**
 * The trust ladder as SVG: six rungs rising left to right, with a real
 * gap where the runtime boundary is.
 *
 * `gap` is added once, at the boundary — that empty column is the whole
 * point of the drawing and must not be tuned away to tighten the layout.
 */
export function trustLadderSvg(
  x: number,
  baseY: number,
  opts: {
    step?: number;
    width?: number;
    minHeight?: number;
    rise?: number;
    gap?: number;
    radius?: number;
  } = {},
): { svg: string; width: number; tickXs: number[] } {
  const step = opts.step ?? 24;
  const w = opts.width ?? 14;
  const minH = opts.minHeight ?? 6;
  const rise = opts.rise ?? 3.2;
  const gap = opts.gap ?? step * 0.5;
  const radius = opts.radius ?? 2;

  const parts: string[] = [];
  const tickXs: number[] = [];
  let cursor = x;
  for (const [i, rung] of TRUST_RUNGS.entries()) {
    if (i === RUNTIME_BOUNDARY) cursor += gap;
    const h = minH + i * rise;
    parts.push(
      `<rect x="${cursor}" y="${baseY - h}" width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="${rung.color}"/>`,
    );
    tickXs.push(cursor + w / 2);
    cursor += step;
  }
  return { svg: parts.join("\n"), width: cursor - step + w - x, tickXs };
}
