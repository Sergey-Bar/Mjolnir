/**
 * `npm run docs:hero` — regenerates assets/readme/terminal-hero.svg from
 * a REAL scan of examples/demo-repo (Sprint 7, Task 29,
 * Master-Stabilization-Plan.md).
 *
 * The previous hero asset was a hand-crafted SVG with no generator and
 * no drift check — and had in fact already drifted: it was missing the
 * "FIX THIS FIRST" section (added in Sprint 5) and showed stale
 * deduction numbers and a stale top-issues list from before the
 * evidence-discount scoring change. This script closes that gap by
 * rendering the SVG directly from `renderTerminal`'s real ANSI output
 * against a real scan — it can't drift from actual behavior because it
 * IS actual behavior, just recolored as SVG text spans instead of ANSI
 * escape codes.
 *
 * Usage: npm run docs:hero
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runScan } from "../src/cli.js";
import { renderTerminal } from "../src/reporter/terminal.js";
import {
  ansiLineToSpans,
  BG,
  CHAR_W,
  FONT_SIZE,
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
const DEMO_REPO = join(ROOT, "examples", "demo-repo");
const OUT_PATH = join(ROOT, "assets", "readme", "terminal-hero.svg");

function renderSvg(lines: string[]): string {
  const longest = Math.max(...lines.map((l) => stripAnsi(l).length));
  const width = Math.ceil(PAD_X * 2 + longest * CHAR_W);
  const height = Math.ceil(PAD_TOP + lines.length * LINE_HEIGHT + PAD_BOTTOM);

  const textLines = lines
    .map((line, i) => {
      const y = PAD_TOP + i * LINE_HEIGHT;
      const spans = ansiLineToSpans(line);
      if (spans.length === 0) return "";
      const tspans = spans
        .map((s) => `<tspan fill="${s.color}">${s.text}</tspan>`)
        .join("");
      return `    <text x="${PAD_X}" y="${y.toFixed(1)}" xml:space="preserve">${tspans}</text>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace, 'SF Mono', 'Cascadia Code', 'Cascadia Mono', Consolas, 'DejaVu Sans Mono', Menlo, monospace" font-size="${FONT_SIZE}">
  <defs>
    <clipPath id="winClip">
      <rect x="0" y="0" width="${width}" height="${height}" rx="8" ry="8"/>
    </clipPath>
  </defs>

  <g clip-path="url(#winClip)">
    <rect x="0" y="0" width="${width}" height="${height}" fill="${BG}"/>
    <rect x="0" y="0" width="${width}" height="${TITLE_BAR}" fill="${TITLE_BAR_BG}"/>
    <circle cx="20" cy="${TITLE_BAR / 2}" r="6" fill="#ff5f56"/>
    <circle cx="40" cy="${TITLE_BAR / 2}" r="6" fill="#ffbd2e"/>
    <circle cx="60" cy="${TITLE_BAR / 2}" r="6" fill="#27c93f"/>
    <text x="${width / 2}" y="${TITLE_BAR / 2 + 4}" fill="#a0a0a0" font-size="12" text-anchor="middle">demo-repo &#8212; mjolnir</text>

${textLines}
  </g>

  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="7.5" ry="7.5" fill="none" stroke="#000000" stroke-opacity="0.5"/>
</svg>
`;
}

async function main(): Promise<void> {
  if (!existsSync(DEMO_REPO)) {
    console.error(`examples/demo-repo not found at ${DEMO_REPO}`);
    process.exit(1);
  }
  const result = await runScan({
    target: DEMO_REPO,
    json: false,
    verbose: false,
    maxDurationMs: Number.POSITIVE_INFINITY,
    scopeChanged: false,
    format: "terminal",
    // Same rationale as generate-readme-demo.ts: the committed asset and
    // its drift-lock spec must reproduce the identical strict scan.
    strict: true,
  });

  // isTTY: true forces real ANSI color codes even though this script's
  // own stdout is likely piped — the SVG needs colors regardless of
  // whether THIS process's terminal happens to be interactive.
  const rendered = renderTerminal(result, { isTTY: true, ascii: false });
  const lines = rendered.split("\n").map((l) => `$ ${l}`.replace("$ ", ""));
  // Prepend the invocation line shown in the original hero asset.
  const allLines = [
    "\x1b[92m$ \x1b[0m\x1b[1mnpx mjolnir-qa@latest\x1b[0m",
    ...lines,
  ].map((line) =>
    // The wall-clock duration on the "Analysis: complete · Nms" line is
    // real but non-deterministic run-to-run — masking it here (only in
    // this asset, never in the actual reporter) keeps regenerating the
    // hero asset a no-op diff when nothing about the scan itself
    // changed, instead of a spurious diff on every single run.
    line.replace(/· \d+ms$/, "· a few ms"),
  );

  const svg = renderSvg(allLines);
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, svg);
  console.log(`Wrote ${OUT_PATH} from a real scan of ${DEMO_REPO}`);
  console.log(
    `(${allLines.length} lines, longest visible width ${Math.max(...allLines.map((l) => stripAnsi(l).length))})`,
  );
}

await main();
