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

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const DEMO_REPO = join(ROOT, "examples", "demo-repo");
const OUT_PATH = join(ROOT, "assets", "readme", "terminal-hero.svg");

/** ANSI 256/16-color SGR code → hex, matching theme.ts's neon() palette. */
const ANSI_COLOR: Record<string, string> = {
  "91": "#FF6B6B", // error (bright red)
  "92": "#3CFF57", // ok (bright green)
  "93": "#FFC94D", // warning (bright yellow)
  "95": "#E37CFF", // accent (bright magenta)
  "96": "#5DD6E8", // info (bright cyan)
  "1": "#EAFFF1", // bold — near-white, matches the hand-crafted original
  "2": "#5C7A68", // dim
};

interface Span {
  text: string;
  color: string;
}

/** Splits one line of ANSI-coded text into colored spans for SVG <tspan>s. */
function ansiLineToSpans(line: string): Span[] {
  const spans: Span[] = [];
  let currentColor = "#EAFFF1"; // default foreground, matches the original SVG
  // eslint-disable-next-line no-control-regex
  const re = /\x1b\[([0-9;]*)m/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const pushText = (text: string): void => {
    if (text.length === 0) return;
    spans.push({ text: escapeXml(text), color: currentColor });
  };
  while ((match = re.exec(line)) !== null) {
    pushText(line.slice(lastIndex, match.index));
    lastIndex = match.index + match[0].length;
    const codes = (match[1] ?? "0").split(";").filter(Boolean);
    for (const code of codes) {
      if (code === "0") currentColor = "#EAFFF1";
      else if (ANSI_COLOR[code]) currentColor = ANSI_COLOR[code] as string;
    }
  }
  pushText(line.slice(lastIndex));
  return spans;
}

function escapeXml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/** Strips ANSI codes to measure the visible width of a line. */
function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

function renderSvg(lines: string[]): string {
  const LINE_HEIGHT = 20.5;
  const TOP_PAD = 82.5;
  const LEFT_PAD = 30;
  const width = 900;
  const contentHeight = lines.length * LINE_HEIGHT;
  const height = Math.round(TOP_PAD + contentHeight + 40);

  const textLines = lines
    .map((line, i) => {
      const y = TOP_PAD + i * LINE_HEIGHT;
      const spans = ansiLineToSpans(line);
      if (spans.length === 0) return "";
      const tspans = spans
        .map((s) => `<tspan fill="${s.color}">${s.text}</tspan>`)
        .join("");
      return `    <text x="${LEFT_PAD}" y="${y.toFixed(1)}" xml:space="preserve">${tspans}</text>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="'SF Mono', 'Cascadia Code', Consolas, Menlo, 'DejaVu Sans Mono', monospace" font-size="14.5">
  <defs>
    <clipPath id="winClip">
      <rect x="0" y="0" width="${width}" height="${height}" rx="14" ry="14"/>
    </clipPath>
    <linearGradient id="titlebarGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#141d18"/>
      <stop offset="1" stop-color="#0e1512"/>
    </linearGradient>
    <radialGradient id="vignette" cx="50%" cy="38%" r="75%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="78%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.55"/>
    </radialGradient>
    <pattern id="scanlines" width="3" height="3" patternUnits="userSpaceOnUse">
      <rect width="3" height="1.4" fill="#000000" fill-opacity="0.22"/>
    </pattern>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.1" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <g clip-path="url(#winClip)">
    <rect x="0" y="0" width="${width}" height="${height}" fill="#070b09"/>

    <rect x="0" y="0" width="${width}" height="42" fill="url(#titlebarGrad)"/>
    <line x1="0" y1="42" x2="${width}" y2="42" stroke="#39FF14" stroke-opacity="0.14"/>
    <circle cx="24" cy="21" r="6.5" fill="#ff5f56"/>
    <circle cx="46" cy="21" r="6.5" fill="#ffbd2e"/>
    <circle cx="68" cy="21" r="6.5" fill="#27c93f"/>
    <text x="${width / 2}" y="25.5" fill="#5C7A68" font-size="12.5" text-anchor="middle" letter-spacing="0.5">user@ci: ~/demo-repo &#8212; mjolnir scan</text>

    <g filter="url(#glow)">
${textLines}
    </g>

    <rect x="0" y="42" width="${width}" height="${height - 42}" fill="url(#scanlines)"/>
    <rect x="0" y="0" width="${width}" height="${height}" fill="url(#vignette)"/>
  </g>

  <rect x="0.6" y="0.6" width="${width - 1.2}" height="${height - 1.2}" rx="13.5" ry="13.5" fill="none" stroke="#39FF14" stroke-opacity="0.28" stroke-width="1.2"/>
</svg>
`;
}

function main(): void {
  if (!existsSync(DEMO_REPO)) {
    console.error(`examples/demo-repo not found at ${DEMO_REPO}`);
    process.exit(1);
  }
  const result = runScan({
    target: DEMO_REPO,
    json: false,
    verbose: false,
    maxDurationMs: Number.POSITIVE_INFINITY,
    scopeChanged: false,
    format: "terminal",
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

main();
