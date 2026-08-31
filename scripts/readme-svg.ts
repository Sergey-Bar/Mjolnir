/**
 * Shared ANSI→SVG rendering primitives for the README asset generators
 * (generate-readme-hero.ts, generate-readme-demo.ts).
 *
 * Both assets are rendered from `renderTerminal`'s real ANSI output, so
 * this module owns the single copy of: the terminal metrics, the
 * fallback palette mapping for theme.ts's bare SGR codes, the truecolor
 * ANSI parser, and the XML escaping. The palette values here mirror
 * src/reporter/theme.ts's Norse-forge hex colors — when the theme
 * changes, change them here once and regenerate BOTH assets
 * (`npm run docs:hero && npm run docs:demo`); the reproducibility specs
 * fail if either asset drifts from what the reporter actually prints.
 *
 * The SVG scaffolds themselves (static hero vs animated demo window)
 * stay in their own generators — only their animation differs; every
 * color and metric they consume must come from this module.
 */

/** Terminal metrics (px). CHAR_W is the advance of the monospace stack at FONT_SIZE. */
export const FONT_SIZE = 13;
export const CHAR_W = 7.82;
export const LINE_HEIGHT = 19;
export const TITLE_BAR = 36;
export const PAD_X = 22;
export const PAD_TOP = TITLE_BAR + 18;
export const PAD_BOTTOM = 18;

/**
 * The reporter (src/reporter/theme.ts) emits its Norse-forge palette as
 * 24-bit truecolor (`38;2;r;g;b`) — parsed directly in ansiLineToSpans —
 * plus the bare SGR codes 1 (bold) and 2 (dim), mapped here as fallbacks.
 */
export const ANSI_COLOR: Record<string, string> = {
  "1": "#ede6d6", // bold  — bone white
  "2": "#7c8590", // dim   — weathered stone
};
export const DEFAULT_FG = "#d7d3c8"; // parchment
export const BG = "#14171c"; // cold iron
export const TITLE_BAR_BG = "#20242b";

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
