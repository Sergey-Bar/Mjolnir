/**
 * `npm run docs:demo` — regenerates assets/readme/demo.svg from a REAL,
 * full (`--verbose`) scan of examples/demo-repo.
 *
 * Same philosophy as scripts/generate-readme-hero.ts: the asset is
 * rendered directly from `renderTerminal`'s real output against a real
 * scan, so it cannot drift from actual behavior because it IS actual
 * behavior — here, recolored as SVG <tspan>s in a plain terminal window
 * and revealed line-by-line with a CSS animation.
 *
 * The animation is decoration only. The underlying content is a valid,
 * complete static SVG: every line is present from the first frame, just
 * transparent until its reveal delay (and fully opaque under
 * prefers-reduced-motion). `tests/demo-asset-reproducibility.spec.ts`
 * asserts the committed file still matches the current reporter output.
 *
 * Usage: npm run docs:demo
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
const OUT_PATH = join(ROOT, "assets", "readme", "demo.svg");

/** Per-line reveal cadence and how long the finished frame holds before looping. */
const LINE_DELAY_S = 0.05;
const HOLD_S = 8;

function renderSvg(lines: string[]): string {
  const longest = Math.max(...lines.map((l) => stripAnsi(l).length));
  const width = Math.ceil(PAD_X * 2 + longest * CHAR_W);
  const height = Math.ceil(PAD_TOP + lines.length * LINE_HEIGHT + PAD_BOTTOM);

  const cycle = (lines.length * LINE_DELAY_S + HOLD_S).toFixed(2);
  const revealPct = ((0.35 / Number(cycle)) * 100).toFixed(3);

  const textLines = lines
    .map((line, i) => {
      const y = PAD_TOP + i * LINE_HEIGHT;
      const spans = ansiLineToSpans(line);
      if (spans.length === 0) return "";
      const tspans = spans
        .map((s) => `<tspan fill="${s.color}">${s.text}</tspan>`)
        .join("");
      const delay = (i * LINE_DELAY_S).toFixed(2);
      return `    <text class="ln" style="animation-delay:${delay}s" x="${PAD_X}" y="${y.toFixed(
        1,
      )}" xml:space="preserve">${tspans}</text>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace, 'SF Mono', 'Cascadia Code', 'Cascadia Mono', Consolas, 'DejaVu Sans Mono', Menlo, monospace" font-size="${FONT_SIZE}">
  <defs>
    <style>
      .ln { opacity: 0; animation: mjolnir-reveal ${cycle}s steps(1, end) infinite; }
      @keyframes mjolnir-reveal {
        0% { opacity: 0; }
        ${revealPct}% { opacity: 1; }
        96% { opacity: 1; }
        100% { opacity: 0; }
      }
      @media (prefers-reduced-motion: reduce) {
        .ln { opacity: 1; animation: none; }
      }
    </style>
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
    <text x="${width / 2}" y="${
      TITLE_BAR / 2 + 4
    }" fill="#a0a0a0" font-size="12" text-anchor="middle">demo-repo — mjolnir</text>

${textLines}
  </g>

  <rect x="0.5" y="0.5" width="${width - 1}" height="${
    height - 1
  }" rx="7.5" ry="7.5" fill="none" stroke="#000000" stroke-opacity="0.5"/>
</svg>
`;
}

/**
 * Builds the SVG from a real scan and returns it — no writes, no console.
 *
 * Exported so tests/contract/demo-asset-reproducibility.spec.ts can
 * compare the committed file against a freshly built one. Importing this
 * module must never write the asset: a spec that regenerates its own
 * expected value cannot fail.
 */
export async function buildDemoSvg(): Promise<string> {
  if (!existsSync(DEMO_REPO)) {
    throw new Error(`examples/demo-repo not found at ${DEMO_REPO}`);
  }
  const result = await runScan({
    target: DEMO_REPO,
    json: false,
    verbose: true,
    maxDurationMs: Number.POSITIVE_INFINITY,
    scopeChanged: false,
    format: "terminal",
    strict: true,
  });
  const rendered = renderTerminal(result, {
    isTTY: true,
    verbose: true,
    ascii: false,
  });
  const lines = [
    "\x1b[92m$\x1b[0m \x1b[1mnpx mjolnir-qa@latest --verbose\x1b[0m",
    ...rendered.split("\n"),
  ].map((line) => line.replace(/· \d+ms$/, "· a few ms"));
  return renderSvg(lines);
}

async function main(): Promise<void> {
  const svg = await buildDemoSvg();
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, svg);
  console.log(`Wrote ${OUT_PATH} from a real --verbose scan of ${DEMO_REPO}`);
}

// Only when invoked as a script — see buildDemoSvg's note.
if (process.argv[1]?.endsWith("generate-readme-demo.ts")) await main();
