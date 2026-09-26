/**
 * `npm run docs:gauge` — regenerates assets/readme/score-gauge.svg: the
 * worthiness scale, with a marker sweeping every score from 0 to 100 and
 * holding on FORGED.
 *
 * It is the website's score chapter drawn as one image — a band scale,
 * not a picture. It replaced a four-state block-art hammer that was the
 * last illustration in a system whose rule is no illustration
 * (docs/design/BRAND-SYSTEM.md), and that the reporter no longer prints.
 *
 * Nothing on it is typed by hand. Every number, verdict and band comes
 * from `deriveScoreState`, the pure function `mjolnir` calls for every
 * real scan, evaluated across the whole 0–100 domain; the band edges on
 * the scale are wherever that function changes its answer, found by
 * walking it, not copied from a table.
 *
 * Usage: npm run docs:gauge
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BRAND,
  HAIRLINE_RGB,
  SCORE,
  SURFACE,
  TEXT,
} from "../src/brand/tokens.js";
import {
  deriveScoreState,
  type ScoreBand,
} from "../src/reporter/presentation.js";
import { escapeXml } from "./readme-svg.js";
import { FONTS, fontPath } from "./video/fonts.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const OUT_PATH = join(ROOT, "assets", "readme", "score-gauge.svg");
const SANS_TTF = join(ROOT, "assets", "readme", "fonts", "Geist-SemiBold.ttf");

/** The sweep runs for SWEEP_SECONDS, then FORGED holds until the loop restarts. */
const LOOP_SECONDS = 10;
const SWEEP_SECONDS = 8;
const STEP_SECONDS = SWEEP_SECONDS / 100;

const W = 720;
const H = 248;
const X0 = 40;
const X1 = W - 40;
const TRACK_Y = 158;
const GAP = 3;

type Band = Exclude<ScoreBand, "unmeasured">;
const BANDS: Band[] = ["critical", "warning", "trusted", "forged"];
const BAND_COLOR: Record<Band, string> = {
  critical: SCORE.critical,
  warning: SCORE.warning,
  trusted: SCORE.trusted,
  forged: SCORE.forged,
};

/** Each band's [first, last] score, by walking deriveScoreState 0–100. */
function bandRanges(): Record<Band, { from: number; to: number }> {
  const out = {} as Record<Band, { from: number; to: number }>;
  for (let s = 0; s <= 100; s++) {
    const band = deriveScoreState(s).band as Band;
    const r = out[band];
    if (r) r.to = s;
    else out[band] = { from: s, to: s };
  }
  return out;
}

/** Horizontal position of a score. 100 gets its own short segment at the end. */
const FORGED_W = 8;
const SPAN = X1 - X0 - FORGED_W - GAP;
function xOf(score: number): number {
  return score >= 100 ? X1 - FORGED_W / 2 : X0 + (score / 100) * SPAN;
}

const n = (v: number): string => v.toFixed(1);

function pct(seconds: number): string {
  return ((seconds / LOOP_SECONDS) * 100).toFixed(3);
}

/** A hair after `pct(seconds)`: CSS keyframes have no half-open intervals. */
function pctAfter(seconds: number): string {
  return ((seconds / LOOP_SECONDS) * 100 + 0.001).toFixed(3);
}

function fontFaceCss(): string {
  const mono = FONTS.find(
    (f) => f.family === "MjolnirMono" && f.weight === 400,
  );
  if (!mono) throw new Error("Geist Mono Regular is no longer vendored");
  const face = (fam: string, p: string): string =>
    `@font-face{font-family:"${fam}";font-style:normal;src:url(data:font/ttf;base64,${readFileSync(p).toString("base64")}) format("truetype")}`;
  return [
    face("MjolnirMono", fontPath(mono)),
    face("MjolnirSans", SANS_TTF),
  ].join("\n");
}

/** The number, the verdict and the marker for one exact score. */
function frame(score: number): string {
  const state = deriveScoreState(score);
  const band = state.band as Band;
  const color = BAND_COLOR[band];
  const x = xOf(score);
  const cls = score === 100 ? "fr fr-100" : "fr";
  const style =
    score === 100
      ? ""
      : ` style="animation-delay:${(score * STEP_SECONDS).toFixed(3)}s"`;
  return `    <g class="${cls}"${style}>
      <text class="num" x="${X0 + 101}" y="112" text-anchor="end" xml:space="preserve">${String(score).padStart(3)}</text>
      <text class="verdict" x="${X1}" y="106" text-anchor="end" fill="${color}">${escapeXml(state.verdict)}</text>
      <rect x="${n(x - 1)}" y="${TRACK_Y - 11}" width="2" height="28" rx="1" fill="${color}"/>
    </g>`;
}

/**
 * Builds the score-gauge SVG and returns it — no writes: every input is
 * a pure function of a synthetic score 0–100. Exported so
 * tests/contract/score-gauge-asset-reproducibility.spec.ts can compare
 * the committed file against a freshly built one.
 */
export function buildScoreGaugeSvg(): string {
  const ranges = bandRanges();

  const segments = BANDS.map((band) => {
    const { from, to } = ranges[band];
    const left = band === "forged" ? X1 - FORGED_W : xOf(from);
    const right = band === "forged" ? X1 : xOf(to + 1) - GAP;
    // FORGED is one score wide, so its name cannot sit under its own
    // segment without running into WORTHY's; it labels the pip from
    // above instead, right-aligned to the end of the scale.
    const forged = band === "forged";
    const mid = forged ? X1 : (left + right) / 2;
    const anchor = forged ? "end" : "middle";
    const nameY = forged ? TRACK_Y - 16 : 214;
    const verdict = deriveScoreState(from).verdict;
    return `    <g class="band band-${band}">
      <rect x="${n(left)}" y="${TRACK_Y}" width="${n(right - left)}" height="6" rx="3" fill="${BAND_COLOR[band]}" fill-opacity="0.32"/>
      <text class="name" x="${n(mid)}" y="${nameY}" text-anchor="${anchor}" fill="${BAND_COLOR[band]}">${escapeXml(verdict)}</text>
    </g>`;
  }).join("\n");

  const ticks = [
    [ranges.critical.from, X0, "start"],
    [ranges.warning.from, xOf(ranges.warning.from) - GAP / 2, "middle"],
    [ranges.trusted.from, xOf(ranges.trusted.from) - GAP / 2, "middle"],
    [ranges.forged.from, X1, "end"],
  ] as const;
  const tickText = ticks
    .map(
      ([v, x, a]) =>
        `    <text class="tick" x="${n(x)}" y="190" text-anchor="${a}">${v}</text>`,
    )
    .join("\n");

  const frames = Array.from({ length: 101 }, (_, s) => frame(s)).join("\n");

  const tick = pct(STEP_SECONDS);
  const tickAfter = pctAfter(STEP_SECONDS);
  const hold = pct(SWEEP_SECONDS);
  const holdAfter = pctAfter(SWEEP_SECONDS);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="gaugeTitle">
  <title id="gaugeTitle">The worthiness scale: UNWORTHY from ${ranges.critical.from} to ${ranges.critical.to}, NEEDS WORK from ${ranges.warning.from} to ${ranges.warning.to}, WORTHY from ${ranges.trusted.from} to ${ranges.trusted.to}, FORGED at ${ranges.forged.from}</title>
  <style>
${fontFaceCss()}
    .eyebrow, .name { font-family: MjolnirSans, sans-serif; font-size: 11px; letter-spacing: 0.18em; }
    .eyebrow { fill: ${TEXT.muted}; }
    .num { font-family: MjolnirMono, monospace; font-size: 56px; fill: ${TEXT.primary}; }
    .of { font-family: MjolnirMono, monospace; font-size: 22px; fill: ${TEXT.muted}; }
    .verdict { font-family: MjolnirSans, sans-serif; font-size: 15px; letter-spacing: 0.16em; }
    .tick { font-family: MjolnirMono, monospace; font-size: 11px; fill: ${TEXT.muted}; }
    .fr { opacity: 0; animation: mj-tick ${LOOP_SECONDS}s steps(1, end) infinite; }
    .fr-100 { animation: mj-hold ${LOOP_SECONDS}s steps(1, end) infinite; }
    @keyframes mj-tick { 0% { opacity: 0; } 0.001% { opacity: 1; } ${tick}% { opacity: 1; } ${tickAfter}% { opacity: 0; } 100% { opacity: 0; } }
    @keyframes mj-hold { 0% { opacity: 0; } ${hold}% { opacity: 0; } ${holdAfter}% { opacity: 1; } 100% { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) {
      .fr { animation: none; opacity: 0; }
      .fr-100 { opacity: 1; }
    }
  </style>
  <defs>
    <clipPath id="cardClip">
      <rect x="0" y="0" width="${W}" height="${H}" rx="10" ry="10"/>
    </clipPath>
    <linearGradient id="aurora" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${BRAND.auroraGreen}"/>
      <stop offset="0.5" stop-color="${BRAND.auroraCyan}"/>
      <stop offset="1" stop-color="${BRAND.auroraViolet}"/>
    </linearGradient>
  </defs>

  <g clip-path="url(#cardClip)">
    <rect x="0" y="0" width="${W}" height="${H}" fill="${SURFACE.ink950}"/>
    <rect x="0" y="0" width="${W}" height="2" fill="url(#aurora)"/>
    <text class="eyebrow" x="${X0}" y="52">WORTHINESS</text>
    <text class="of" x="${X0 + 106}" y="112">/100</text>
${segments}
${tickText}
${frames}
  </g>

  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="9.5" ry="9.5" fill="none" stroke="rgb(${HAIRLINE_RGB})" stroke-opacity="0.14"/>
</svg>
`;
}

function main(): void {
  const svg = buildScoreGaugeSvg();
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, svg);
  console.log(`Wrote ${OUT_PATH} — deriveScoreState swept across scores 0-100`);
}

// Only when invoked as a script — see buildScoreGaugeSvg's note.
if (process.argv[1]?.endsWith("generate-readme-score-gauge.ts")) main();
