/**
 * `npm run docs:see-it-work` — regenerates assets/readme/see-it-work.svg:
 * the "found -> fixed -> re-proved -> handed to an agent" narrative as a
 * looping animated SVG, for the README's "See it work" section.
 *
 * GitHub will not autoplay a repo-relative MP4 (no <video> support off
 * its own CDN — see assets/video/README.md). This uses the same proven
 * technique as demo.svg and score-gauge.svg instead: pre-rendered panels
 * shown/hidden by CSS keyframes (steps(1,end), no JS), which GitHub does
 * render and animate inline. A GIF was tried first and rejected — the
 * full 42s narrative doesn't compress well as a GIF (no inter-frame
 * motion compensation like the MP4's H.264 has): 6-9MB at readable
 * quality, worse than the MP4 it would replace.
 *
 * Every beat is real, never staged:
 *  - scan/rescan reuse assets/video/script.demo.json's own captured ANSI
 *    output — the same evidence tests/contract/video-script.spec.ts
 *    drift-locks against real CLI behavior — truncated before the
 *    per-finding FINDINGS dump the same way generate-readme-hero.ts is:
 *    this narrative is about the score changing, not re-listing every
 *    finding (already shown by "One finding, up close" below it).
 *  - fix reuses the script's own committed before/after CI YAML
 *    (`patch`) and the exact `diffLines()` the video renderer uses — a
 *    real diff of two committed files, not drawn text.
 *  - handoff runs a real scan of examples/demo-repo and calls the real
 *    `renderHandoff` (src/commands/handoff.ts) — the same Markdown
 *    `mjolnir handoff` prints, meant to be hand to an agent (Claude
 *    Code or any other) to work through. Shown truncated (845 real
 *    lines total for this scan); the README caption says so.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runScan } from "../src/cli.js";
import { renderHandoff } from "../src/commands/handoff.js";
import { wrapText } from "../src/reporter/theme.js";
import { readScript } from "./video/script-io.js";
import { diffLines, type DiffLine } from "./video/terminal-page.js";
import {
  ansiLineToSpans,
  BG,
  CHAR_W,
  escapeXml,
  FONT_SIZE,
  LINE_HEIGHT,
  PAD_BOTTOM,
  PAD_TOP,
  PAD_X,
  stripAnsi,
  TITLE_BAR,
  TITLE_BAR_BG,
  type Span,
} from "./readme-svg.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const DEMO_REPO = join(ROOT, "examples", "demo-repo");
const OUT_PATH = join(ROOT, "assets", "readme", "see-it-work.svg");

/** Real accent blue (src/reporter/theme.ts NORSE.accent) — reused here
 * for the handoff excerpt's markdown headings, which carry no ANSI of
 * their own (`mjolnir handoff` prints plain text, meant for piping). */
const ACCENT = "rgb(138,180,216)";
const DIM = "#7c8590";
const DEFAULT_FG = "#d7d3c8";

const DIFF_COLOR: Record<DiffLine["kind"], string> = {
  add: "#4FB477",
  remove: "#E5544E",
  header: DIM,
  // diffLines() never actually emits "context" (it's add/remove/header
  // only — see its own doc comment), but the type allows it.
  context: DEFAULT_FG,
};

interface Beat {
  id: string;
  command: string;
  rows: Span[][];
}

/** This narrative is about the score changing, not every finding — cut
 * right before FINDINGS, same boundary generate-readme-hero.ts uses. */
function truncateBeforeFindings(ansiLines: string[]): string[] {
  const idx = ansiLines.findIndex((l) => stripAnsi(l).trim() === "▚ FINDINGS");
  return idx === -1 ? ansiLines : ansiLines.slice(0, idx);
}

function ansiRows(lines: string[]): Span[][] {
  return lines.map((l) => ansiLineToSpans(l));
}

function plainRow(text: string, color: string): Span[] {
  return [{ text: escapeXml(text), color }];
}

export async function buildSeeItWorkSvg(): Promise<string> {
  const demoScript = readScript("demo");
  const scanBeat = demoScript.beats.find((b) => b.id === "hero-scan");
  const rescanBeat = demoScript.beats.find((b) => b.id === "hero-rescan");
  if (!scanBeat || !rescanBeat || !demoScript.patch) {
    throw new Error(
      "assets/video/script.demo.json is missing hero-scan/hero-rescan/patch — regenerate it with `npm run docs:video:capture` first.",
    );
  }

  const scan: Beat = {
    id: "scan",
    command: scanBeat.command,
    rows: ansiRows(truncateBeforeFindings(scanBeat.ansi)),
  };

  const diff = diffLines(demoScript.patch);
  const fix: Beat = {
    id: "fix",
    command: "$EDITOR .github/workflows/ci.yml",
    rows: diff.map((d) => {
      const mark = d.kind === "add" ? "+" : d.kind === "remove" ? "-" : " ";
      const prefix = d.kind === "header" ? "" : `${mark} `;
      return plainRow(prefix + d.text, DIFF_COLOR[d.kind]);
    }),
  };

  const rescan: Beat = {
    id: "rescan",
    command: rescanBeat.command,
    rows: ansiRows(truncateBeforeFindings(rescanBeat.ansi)),
  };

  // Real scan, real renderHandoff — not the video script's captured
  // output (handoff isn't part of the video), so this beat re-runs the
  // same strict scan generate-readme-hero.ts/-demo.ts use for parity.
  const result = await runScan({
    target: DEMO_REPO,
    json: false,
    verbose: false,
    maxDurationMs: Number.POSITIVE_INFINITY,
    scopeChanged: false,
    format: "terminal",
    strict: true,
  });
  const handoffLines = renderHandoff(result).split("\n");
  // Lines 0-30: title, score, intro, "how to use" bullets, and the first
  // remediation group through its fix instruction — a complete slice,
  // not a mid-sentence cut. The real document continues per finding
  // (845 lines for this scan); the README caption says so.
  const handoffExcerpt = handoffLines.slice(0, 31);
  // renderHandoff() writes for a FILE, not a terminal — its prose runs
  // to 169 columns unwrapped, which is what was driving this whole
  // asset's width. Wrap it to the same column budget `mjolnir explain`
  // already uses (theme.ts's wrapText), skipping headings/fences/rules,
  // which read fine short and would wrap oddly.
  const handoffRows: Span[][] = [];
  for (const line of handoffExcerpt) {
    const isStructural =
      /^#{1,3}\s/.test(line) || line.startsWith("```") || line === "";
    const color = /^#{2,3}\s/.test(line) ? ACCENT : DEFAULT_FG;
    const wrapped = isStructural ? [line] : wrapText(line, 88);
    for (const w of wrapped) handoffRows.push(plainRow(w, color));
  }
  const handoff: Beat = {
    id: "handoff",
    command: "mjolnir handoff",
    rows: handoffRows,
  };

  return renderSvg([scan, fix, rescan, handoff]);
}

/** Seconds each beat holds on screen before the next one appears. */
const BEAT_SECONDS: Record<string, number> = {
  scan: 4.5,
  fix: 3.5,
  rescan: 4,
  handoff: 4.5,
};

function renderSvg(beats: Beat[]): string {
  const commandRow = (command: string): Span[] => [
    { text: "$ ", color: "#3fb0a0" },
    { text: escapeXml(command), color: "#ede6d6" },
  ];

  const allRows = beats.flatMap((b) => [commandRow(b.command), ...b.rows]);
  const longest = Math.max(
    ...allRows.map((spans) => spans.reduce((n, s) => n + s.text.length, 0)),
  );
  const maxRows = Math.max(...beats.map((b) => b.rows.length + 1));
  const width = Math.ceil(PAD_X * 2 + longest * CHAR_W);
  const height = Math.ceil(PAD_TOP + maxRows * LINE_HEIGHT + PAD_BOTTOM);

  const loopSeconds = beats.reduce((n, b) => n + (BEAT_SECONDS[b.id] ?? 4), 0);
  let cursor = 0;
  const windows = beats.map((b) => {
    const start = cursor;
    cursor += BEAT_SECONDS[b.id] ?? 4;
    return { id: b.id, start, end: cursor };
  });

  const pct = (s: number) => ((s / loopSeconds) * 100).toFixed(3);
  const pctAfter = (s: number) => ((s / loopSeconds) * 100 + 0.001).toFixed(3);

  const keyframes = windows
    .map((w, i) => {
      const runsToLoopEnd = i === windows.length - 1;
      const endStop = runsToLoopEnd
        ? `${pct(w.end)}% { opacity: 1; }`
        : `${pct(w.end)}% { opacity: 1; } ${pctAfter(w.end)}% { opacity: 0; } 100% { opacity: 0; }`;
      if (w.start === 0) {
        return `@keyframes siw-${w.id} { 0% { opacity: 1; } ${endStop} }`;
      }
      return (
        `@keyframes siw-${w.id} { 0% { opacity: 0; } ${pct(w.start)}% { opacity: 0; } ` +
        `${pctAfter(w.start)}% { opacity: 1; } ${endStop} }`
      );
    })
    .join("\n      ");

  const beatGroups = beats
    .map((b) => {
      const rows = [commandRow(b.command), ...b.rows];
      const lines = rows
        .map((spans, row) => {
          if (spans.length === 0) return "";
          const y = PAD_TOP + row * LINE_HEIGHT;
          const tspans = spans
            .map((s) => `<tspan fill="${s.color}">${s.text}</tspan>`)
            .join("");
          return `<text x="${PAD_X}" y="${y.toFixed(1)}" xml:space="preserve">${tspans}</text>`;
        })
        .filter(Boolean)
        .join("\n      ");
      return `    <g class="siw siw-${b.id}">\n      ${lines}\n    </g>`;
    })
    .join("\n");

  const cssRules = beats
    .map(
      (b) =>
        `.siw-${b.id} { animation: siw-${b.id} ${loopSeconds}s steps(1, end) infinite; }`,
    )
    .join("\n      ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace, 'SF Mono', 'Cascadia Code', 'Cascadia Mono', Consolas, 'DejaVu Sans Mono', Menlo, monospace" font-size="${FONT_SIZE}">
  <defs>
    <style>
      .siw { opacity: 0; }
      ${cssRules}
      ${keyframes}
      @media (prefers-reduced-motion: reduce) {
        .siw { animation: none; opacity: 0; }
        .siw-scan { opacity: 1; }
      }
    </style>
    <clipPath id="siwClip">
      <rect x="0" y="0" width="${width}" height="${height}" rx="8" ry="8"/>
    </clipPath>
  </defs>

  <g clip-path="url(#siwClip)">
    <rect x="0" y="0" width="${width}" height="${height}" fill="${BG}"/>
    <rect x="0" y="0" width="${width}" height="${TITLE_BAR}" fill="${TITLE_BAR_BG}"/>
    <circle cx="20" cy="${TITLE_BAR / 2}" r="6" fill="#ff5f56"/>
    <circle cx="40" cy="${TITLE_BAR / 2}" r="6" fill="#ffbd2e"/>
    <circle cx="60" cy="${TITLE_BAR / 2}" r="6" fill="#27c93f"/>
    <text x="${width / 2}" y="${TITLE_BAR / 2 + 4}" fill="#a0a0a0" font-size="12" text-anchor="middle">demo-repo &#8212; mjolnir</text>

${beatGroups}
  </g>

  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="7.5" ry="7.5" fill="none" stroke="#000000" stroke-opacity="0.5"/>
</svg>
`;
}

async function main(): Promise<void> {
  const svg = await buildSeeItWorkSvg();
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, svg);
  console.log(`Wrote ${OUT_PATH} — scan/fix/rescan/handoff, all real`);
}

if (process.argv[1]?.endsWith("generate-readme-see-it-work.ts")) await main();
