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

async function main(): Promise<void> {
  if (!existsSync(DEMO_REPO)) {
    console.error(`examples/demo-repo not found at ${DEMO_REPO}`);
    process.exit(1);
  }
  const result = await runScan({
    target: DEMO_REPO,
    json: false,
    verbose: true,
    maxDurationMs: Number.POSITIVE_INFINITY,
    scopeChanged: false,
    format: "terminal",
    // The committed demo asset must reflect the same scan the
    // precision-contract spec asserts (which runs --strict): quarantine
    // rules like the measured-into-quarantine QA-TEST-001 stay visible
    // at severity=info/E0 so the demo score band is reproducible.
    strict: true,
  });

  // verbose: true → the reporter prints every finding, not the top 5.
  // ascii: false pins Unicode glyphs (matching generate-readme-hero.ts) so
  // the committed SVG does not depend on whoever ran the generator last —
  // shouldUseAscii() is host/env-dependent and made this asset drift in CI.
  const rendered = renderTerminal(result, {
    isTTY: true,
    verbose: true,
    ascii: false,
  });
  const lines = [
    "\x1b[92m$\x1b[0m \x1b[1mnpx mjolnir-qa@latest --verbose\x1b[0m",
    ...rendered.split("\n"),
  ].map((line) =>
    // The wall-clock duration is real but non-deterministic run-to-run —
    // masked here (only in this asset, never in the real reporter) so
    // regenerating is a no-op diff when the scan itself is unchanged.
    line.replace(/· \d+ms$/, "· a few ms"),
  );

  const svg = renderSvg(lines);
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, svg);
  console.log(`Wrote ${OUT_PATH} from a real --verbose scan of ${DEMO_REPO}`);
  console.log(
    `(${lines.length} lines, longest visible width ${Math.max(
      ...lines.map((l) => stripAnsi(l).length),
    )})`,
  );
}

await main();
