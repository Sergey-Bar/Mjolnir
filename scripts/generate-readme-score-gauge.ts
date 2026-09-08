/**
 * `npm run docs:gauge` — regenerates assets/readme/score-gauge.svg: the
 * hammer sweeping every score from 0 to 100 and holding on FORGED, in
 * place of the old static score/verdict table.
 *
 * Every frame is real renderer output, not hand-drawn art. `deriveScoreState`,
 * `renderHammer` and `scoreGauge` are the exact pure functions `mjolnir`
 * calls for every real scan — this script just calls them across the
 * whole 0-100 domain instead of one scan's score, so nothing on screen is
 * a state the CLI couldn't actually produce. The hammer itself only has
 * four real states (critical/warning/trusted/forged — see
 * src/reporter/art.ts's HAMMER_STATES), so it snaps between them exactly
 * at the real thresholds instead of a smoothly-interpolated fake in-between
 * shape that doesn't exist in the tool.
 *
 * Usage: npm run docs:gauge
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { renderHammer } from "../src/reporter/art.js";
import {
  deriveScoreState,
  type ScoreBand,
} from "../src/reporter/score-state.js";
import {
  gaugeColorForBand,
  palette,
  scoreGauge,
} from "../src/reporter/theme.js";
import {
  ansiLineToSpans,
  BG,
  CHAR_W,
  FONT_FAMILY,
  FONT_SIZE,
  fontFaceCss,
  LINE_HEIGHT,
  PAD_BOTTOM,
  PAD_TOP,
  PAD_X,
  stripAnsi,
  TITLE_BAR,
  TITLE_BAR_BG,
} from "./readme-svg.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const OUT_PATH = join(ROOT, "assets", "readme", "score-gauge.svg");

const p = palette(true);

/** Total loop length; the 0-100 sweep runs for the first SWEEP_SECONDS,
 * then FORGED holds for the remainder before the loop restarts. */
const LOOP_SECONDS = 10;
const SWEEP_SECONDS = 8;
const STEP_SECONDS = SWEEP_SECONDS / 100;

/** Fixed row slots every band renders into, so the hammer never jumps
 * vertically when its band changes — only `forged` draws an aura row
 * above the head and an underglow row below the pommel; the other
 * bands simply leave those two rows empty. */
const ROW = {
  AURA: 0,
  RUNES: 1,
  HEAD_TOP: 2,
  HEAD_FACE: 3,
  HEAD_BROW: 4,
  HAFT0: 5,
  HAFT1: 6,
  HAFT2: 7,
  POMMEL: 8,
  UNDERGLOW: 9,
  CAPTION: 10,
  BLANK: 11,
  HEADER: 12,
  BAR: 13,
} as const;
const TOTAL_ROWS = 14;

/** One representative score per band — deriveScoreState is a pure step
 * function, so any score inside a band's range renders identical art. */
const BAND_SAMPLE_SCORE: Record<ScoreBand, number> = {
  critical: 0,
  warning: 50,
  trusted: 80,
  forged: 100,
};

/** The real hammer thresholds (src/reporter/score-state.ts), expressed
 * as [start, end) seconds into the sweep/hold timeline. */
const BAND_WINDOW: Record<ScoreBand, { start: number; end: number }> = {
  critical: { start: 0, end: 50 * STEP_SECONDS },
  warning: { start: 50 * STEP_SECONDS, end: 80 * STEP_SECONDS },
  trusted: { start: 80 * STEP_SECONDS, end: 100 * STEP_SECONDS },
  forged: { start: SWEEP_SECONDS, end: LOOP_SECONDS },
};

function pct(seconds: number): string {
  return ((seconds / LOOP_SECONDS) * 100).toFixed(3);
}

/** A hair after `pct(seconds)`, for the "just turned off" keyframe stop —
 * CSS percentages don't support "closed-open" intervals directly, so an
 * instant step needs two adjacent keyframe stops instead. */
function pctAfter(seconds: number): string {
  return ((seconds / LOOP_SECONDS) * 100 + 0.001).toFixed(3);
}

/** Renders one band's hammer into the fixed 14-row template above. */
function hammerRows(band: ScoreBand): string[] {
  const state = deriveScoreState(BAND_SAMPLE_SCORE[band]);
  const raw = renderHammer(state, p, false);
  let i = 0;
  const next = (): string => {
    const line = raw[i];
    i += 1;
    if (line === undefined) {
      throw new Error(
        `renderHammer(${band}) produced fewer lines than the fixed row template expects`,
      );
    }
    return line;
  };
  const rows = new Array<string>(TOTAL_ROWS).fill("");
  if (band === "forged") rows[ROW.AURA] = next();
  if (band !== "critical") rows[ROW.RUNES] = next();
  rows[ROW.HEAD_TOP] = next();
  rows[ROW.HEAD_FACE] = next();
  rows[ROW.HEAD_BROW] = next();
  rows[ROW.HAFT0] = next();
  rows[ROW.HAFT1] = next();
  rows[ROW.HAFT2] = next();
  rows[ROW.POMMEL] = next();
  if (band === "forged") rows[ROW.UNDERGLOW] = next();
  rows[ROW.CAPTION] = next();
  return rows;
}

/** Renders the WORTHINESS header + gauge bar for one exact score. */
function scoreRows(score: number): string[] {
  const state = deriveScoreState(score);
  const color = gaugeColorForBand(state.band, p);
  const scoreText = String(score).padStart(3);
  const rows = new Array<string>(TOTAL_ROWS).fill("");
  rows[ROW.HEADER] =
    `${p.bold("WORTHINESS")} ${p.bold(scoreText)}${p.dim("/100")}  ${color(state.verdict)}`;
  rows[ROW.BAR] = `  ${scoreGauge(score, p, 22, false)}`;
  return rows;
}

function textEl(x: number, y: number, ansiLine: string): string {
  const spans = ansiLineToSpans(ansiLine);
  if (spans.length === 0) return "";
  const tspans = spans
    .map((s) => `<tspan fill="${s.color}">${s.text}</tspan>`)
    .join("");
  return `<text x="${x}" y="${y.toFixed(1)}" xml:space="preserve">${tspans}</text>`;
}

const BANDS: ScoreBand[] = ["critical", "warning", "trusted", "forged"];
const KEYFRAME_NAME: Record<ScoreBand, string> = {
  critical: "mj-crit",
  warning: "mj-warn",
  trusted: "mj-trust",
  forged: "mj-forge",
};

/**
 * On for [startSeconds, endSeconds), off the rest of the loop. `critical`
 * starts already-on at 0%; every other band turns on partway through.
 * A window that runs to the very end of the loop (`forged`) just holds
 * opacity 1 through 100% — the wrap back to the next iteration's 0%
 * (defined as opacity 0 for every band but `critical`) is itself the
 * off transition, and 100%+epsilon isn't a valid keyframe stop.
 */
function bandKeyframe(
  name: string,
  startSeconds: number,
  endSeconds: number,
): string {
  const runsToLoopEnd = endSeconds === LOOP_SECONDS;
  const endPct = pct(endSeconds);
  const endStop = runsToLoopEnd
    ? `${endPct}% { opacity: 1; }`
    : `${endPct}% { opacity: 1; } ${pctAfter(endSeconds)}% { opacity: 0; } 100% { opacity: 0; }`;
  if (startSeconds === 0) {
    return `@keyframes ${name} { 0% { opacity: 1; } ${endStop} }`;
  }
  const startPct = pct(startSeconds);
  const startAfter = pctAfter(startSeconds);
  return (
    `@keyframes ${name} { 0% { opacity: 0; } ${startPct}% { opacity: 0; } ` +
    `${startAfter}% { opacity: 1; } ${endStop} }`
  );
}

/**
 * Builds the score-gauge SVG and returns it — no writes, no I/O at all:
 * every input is a pure function of a synthetic score 0-100, so this
 * never touches a scan or the filesystem. Exported so
 * tests/contract/score-gauge-asset-reproducibility.spec.ts can compare
 * the committed file against a freshly built one.
 */
export function buildScoreGaugeSvg(): string {
  const bandRows: Record<ScoreBand, string[]> = {
    critical: hammerRows("critical"),
    warning: hammerRows("warning"),
    trusted: hammerRows("trusted"),
    forged: hammerRows("forged"),
  };
  const allScoreRows = Array.from({ length: 101 }, (_, score) =>
    scoreRows(score),
  );

  const allLines = [
    ...BANDS.flatMap((b) => bandRows[b]),
    ...allScoreRows.flat(),
  ];
  const longest = Math.max(...allLines.map((l) => stripAnsi(l).length));
  const width = Math.ceil(PAD_X * 2 + longest * CHAR_W);
  const height = Math.ceil(PAD_TOP + TOTAL_ROWS * LINE_HEIGHT + PAD_BOTTOM);

  const bandGroups = BANDS.map((band) => {
    const rows = bandRows[band];
    const lines = rows
      .map((line, row) => textEl(PAD_X, PAD_TOP + row * LINE_HEIGHT, line))
      .filter(Boolean)
      .join("\n      ");
    return `    <g class="hb hb-${band}">\n      ${lines}\n    </g>`;
  }).join("\n");

  const frameGroups = allScoreRows
    .map((rows, score) => {
      const lines = [ROW.HEADER, ROW.BAR]
        .map((row) =>
          textEl(PAD_X, PAD_TOP + row * LINE_HEIGHT, rows[row] ?? ""),
        )
        .filter(Boolean)
        .join("\n      ");
      const cls = score === 100 ? "fr fr-100" : "fr";
      const style =
        score === 100
          ? ""
          : ` style="animation-delay:${(score * STEP_SECONDS).toFixed(3)}s"`;
      return `    <g class="${cls}"${style}>\n      ${lines}\n    </g>`;
    })
    .join("\n");

  const tickWidthPct = pct(STEP_SECONDS);
  const tickWidthAfter = pctAfter(STEP_SECONDS);
  const keyframes = [
    ...BANDS.map((b) =>
      bandKeyframe(KEYFRAME_NAME[b], BAND_WINDOW[b].start, BAND_WINDOW[b].end),
    ),
    `@keyframes mj-tick { 0% { opacity: 0; } 0.001% { opacity: 1; } ${tickWidthPct}% { opacity: 1; } ${tickWidthAfter}% { opacity: 0; } 100% { opacity: 0; } }`,
  ].join("\n      ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="${FONT_FAMILY}" font-size="${FONT_SIZE}">
  <style>
${fontFaceCss()}
  </style>
  <defs>
    <style>
      .hb, .fr { opacity: 0; }
      .hb-critical { animation: ${KEYFRAME_NAME.critical} ${LOOP_SECONDS}s steps(1, end) infinite; }
      .hb-warning  { animation: ${KEYFRAME_NAME.warning} ${LOOP_SECONDS}s steps(1, end) infinite; }
      .hb-trusted  { animation: ${KEYFRAME_NAME.trusted} ${LOOP_SECONDS}s steps(1, end) infinite; }
      .hb-forged   { animation: ${KEYFRAME_NAME.forged} ${LOOP_SECONDS}s steps(1, end) infinite; }
      .fr    { animation: mj-tick ${LOOP_SECONDS}s steps(1, end) infinite; }
      .fr-100 { animation: ${KEYFRAME_NAME.forged} ${LOOP_SECONDS}s steps(1, end) infinite; }
      ${keyframes}
      @media (prefers-reduced-motion: reduce) {
        .hb, .fr { animation: none; opacity: 0; }
        .hb-forged, .fr-100 { opacity: 1; }
      }
    </style>
    <clipPath id="gaugeClip">
      <rect x="0" y="0" width="${width}" height="${height}" rx="8" ry="8"/>
    </clipPath>
  </defs>

  <g clip-path="url(#gaugeClip)">
    <rect x="0" y="0" width="${width}" height="${height}" fill="${BG}"/>
    <rect x="0" y="0" width="${width}" height="${TITLE_BAR}" fill="${TITLE_BAR_BG}"/>
    <circle cx="20" cy="${TITLE_BAR / 2}" r="6" fill="#ff5f56"/>
    <circle cx="40" cy="${TITLE_BAR / 2}" r="6" fill="#ffbd2e"/>
    <circle cx="60" cy="${TITLE_BAR / 2}" r="6" fill="#27c93f"/>

${bandGroups}
${frameGroups}
  </g>

  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="7.5" ry="7.5" fill="none" stroke="#000000" stroke-opacity="0.5"/>
</svg>
`;
}

function main(): void {
  const svg = buildScoreGaugeSvg();
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, svg);
  console.log(
    `Wrote ${OUT_PATH} — a pure sweep of deriveScoreState/renderHammer/scoreGauge across scores 0-100`,
  );
}

// Only when invoked as a script — see buildScoreGaugeSvg's note.
if (process.argv[1]?.endsWith("generate-readme-score-gauge.ts")) main();
