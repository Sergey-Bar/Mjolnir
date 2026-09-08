/**
 * Shared ANSI→SVG rendering primitives for the README asset generators
 * (generate-readme-hero.ts, generate-readme-demo.ts,
 * generate-readme-score-gauge.ts).
 *
 * All three are rendered from `renderTerminal`'s real ANSI output, so
 * this module owns the single copy of: the terminal metrics, the
 * typeface, the fallback palette mapping for theme.ts's bare SGR codes,
 * the truecolor ANSI parser, and the XML escaping. Change a color or the
 * font here once and regenerate all three
 * (`npm run docs:hero && npm run docs:demo && npm run docs:gauge`); the
 * reproducibility specs fail if any asset drifts from what the reporter
 * actually prints.
 *
 * TYPEFACE — the terminal assets embed Geist Mono, the same vendored file
 * scripts/video/fonts.ts puts in the demo video, inlined as a base64
 * `@font-face`. They previously named a generic `ui-monospace, …`
 * stack, which meant the README rendered in whatever mono the reader
 * happened to have — Consolas, DejaVu, Courier — so the assets looked
 * different on every machine and nothing matched the video. CHAR_W is
 * now Geist Mono's real advance (0.6em) rather than a stack average.
 *
 * PALETTE — every value resolves through src/brand/tokens.ts, the single
 * source of brand truth; this module names no hex of its own. The
 * chrome matches scripts/video/terminal-page.ts, so a still of the
 * terminal and a frame of the video are the same terminal. The COLOURED
 * text still comes from the reporter's own truecolor codes; only the
 * background, the default foreground, the window dots and the bare
 * bold/dim fallbacks live here.
 *
 * The SVG scaffolds themselves (static hero vs animated demo window)
 * stay in their own generators — only their animation differs; every
 * color, metric and font they consume must come from this module.
 */

import { readFileSync } from "node:fs";

import { SURFACE, TEXT } from "../src/brand/tokens.js";

import { FONTS, fontPath } from "./video/fonts.js";

/** Terminal metrics (px). CHAR_W is Geist Mono's advance at FONT_SIZE. */
export const FONT_SIZE = 13;
export const ADVANCE = 0.6;
export const CHAR_W = FONT_SIZE * ADVANCE;
export const LINE_HEIGHT = 19;
export const TITLE_BAR = 36;
export const PAD_X = 22;
export const PAD_TOP = TITLE_BAR + 18;
export const PAD_BOTTOM = 18;

/** The embedded family name, and the attribute every generator sets. */
export const FONT_FAMILY = "MjolnirMono, monospace";

/**
 * `@font-face` for Geist Mono Regular, inlined as a data URI. Regular
 * only: ansiLineToSpans renders SGR 1 as a brighter colour, never as a
 * bold face, so a bold file would be ~190KB of base64 nothing uses.
 */
export function fontFaceCss(): string {
  const mono = FONTS.find(
    (f) => f.family === "MjolnirMono" && f.weight === 400,
  );
  if (!mono) throw new Error("Geist Mono Regular is no longer vendored");
  const b64 = readFileSync(fontPath(mono)).toString("base64");
  return `@font-face{font-family:"MjolnirMono";font-style:normal;src:url(data:font/ttf;base64,${b64}) format("truetype")}`;
}

/**
 * The reporter (src/reporter/theme.ts) emits its Norse-forge palette as
 * 24-bit truecolor (`38;2;r;g;b`) — parsed directly in ansiLineToSpans —
 * plus the bare SGR codes 1 (bold) and 2 (dim), mapped here as fallbacks.
 */
export const ANSI_COLOR: Record<string, string> = {
  "1": TEXT.primary, // bold
  "2": TEXT.muted, // dim
};
/* The token module is `as const`, so these need widening to `string`:
   the ANSI parser assigns a computed `rgb(r,g,b)` into the same slot. */
export const DEFAULT_FG: string = TEXT.secondary;
export const BG: string = SURFACE.terminal;
/** Same tone as BG: the window's seam is shadow, never a second fill. */
export const TITLE_BAR_BG: string = SURFACE.terminalBar;
/**
 * The three window dots — one neutral, drawn three times.
 *
 * They used to be macOS traffic lights (#ff5f56 / #ffbd2e / #27c93f):
 * three saturated colours that belong to another company's window
 * chrome, sitting at the top of the two most-viewed images this project
 * has, one of them the very green the brand retired from score contexts.
 * The video's own window had already dropped them; the stills now agree.
 */
export const CHROME_DOTS: readonly string[] = [
  SURFACE.chromeDot,
  SURFACE.chromeDot,
  SURFACE.chromeDot,
];

export interface Span {
  text: string;
  color: string;
}

/** Splits one line of ANSI-coded text into colored spans for SVG <tspan>s. */
export function ansiLineToSpans(line: string): Span[] {
  const spans: Span[] = [];
  let currentColor = DEFAULT_FG;
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
    for (let k = 0; k < codes.length; k++) {
      const code = codes[k];
      if (code === "0") currentColor = DEFAULT_FG;
      else if (code === "38" && codes[k + 1] === "2") {
        currentColor = `rgb(${codes[k + 2]},${codes[k + 3]},${codes[k + 4]})`;
        k += 4;
      } else if (code && ANSI_COLOR[code]) {
        currentColor = ANSI_COLOR[code];
      }
    }
  }
  pushText(line.slice(lastIndex));
  return spans;
}

export function escapeXml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/** Strips ANSI codes to measure the visible width of a line. */
export function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}
