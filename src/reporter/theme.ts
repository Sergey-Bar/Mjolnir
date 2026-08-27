/**
 * Retro CRT/arcade theme system. Pure string-in → string-out helpers.
 * Respects NO_COLOR and non-TTY via `palette(isTTY)` — every renderer
 * receives a palette and never touches process.env directly.
 *
 * Symbols always accompany color (color-blind safe, R11).
 *
 * Terminal robustness (Master-Stabilization-Plan Sprint 5 Task 22):
 * box-drawing/gauge helpers accept an explicit width so callers can
 * reflow for narrow terminals or a `--width` override, and an `ascii`
 * flag so output degrades to plain characters on cmd.exe/legacy
 * consoles that mangle box-drawing glyphs and emoji.
 */

export interface Palette {
  /** Neon green — healthy / primary accent. */
  ok: (s: string) => string;
  /** Cyan — info / secondary accent. */
  info: (s: string) => string;
  /** Magenta — flair, headers. */
  accent: (s: string) => string;
  /** Yellow — warnings. */
  warning: (s: string) => string;
  /** Red — errors. */
  error: (s: string) => string;
  bold: (s: string) => string;
  dim: (s: string) => string;
}

const on = {
  ok: neon(92),
  info: neon(96),
  accent: neon(95),
  warning: neon(93),
  error: neon(91),
  bold: neon(1),
  dim: neon(2),
};

const off = {
  ok: id,
  info: id,
  accent: id,
  warning: id,
  error: id,
  bold: id,
  dim: id,
};

function neon(code: number) {
  return (s: string) => `\x1b[${code}m${s}\x1b[0m`;
}
function id(s: string) {
  return s;
}

/** True when colors should be emitted for this render call. */
export function shouldColorize(isTTY: boolean): boolean {
  return isTTY && !process.env["NO_COLOR"];
}

export function palette(enabled: boolean): Palette {
  return enabled ? on : off;
}

/* ── Box drawing ─────────────────────────────────────────────── */

/**
 * True when box-drawing/emoji glyphs should be replaced with plain
 * ASCII. cmd.exe and other legacy Windows consoles (not Windows
 * Terminal, not modern PowerShell hosts) frequently mangle box-drawing
 * characters into "?" or misaligned glyphs — this degrades gracefully
 * to plain characters that render correctly everywhere, including in
 * flat CI logs where Unicode support is unverified.
 */
export function shouldUseAscii(): boolean {
  if (process.env["MJOLNIR_ASCII"] === "1") return true;
  if (process.env["MJOLNIR_ASCII"] === "0") return false;
  // ConEmuANSI/WT_SESSION/TERM_PROGRAM all indicate a modern terminal
  // host that renders Unicode box-drawing correctly even on Windows.
  const modernHost =
    process.env["WT_SESSION"] ??
    process.env["TERM_PROGRAM"] ??
    process.env["ConEmuANSI"];
  if (modernHost) return false;
  // Bare cmd.exe / legacy conhost: no TERM, no modern-host marker, and
  // on win32. This is a heuristic, not a certainty — QA_DOCTOR_ASCII
  // above always overrides it for a user who knows better.
  return process.platform === "win32" && !process.env["TERM"];
}

/** Wraps a single line of plain text (no ANSI) to fit within `width`,
 * breaking on whitespace where possible. Never splits mid-word unless
 * a single word alone exceeds the width. */
export function wrapText(text: string, width: number): string[] {
  if (width <= 0) return [text];
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate) <= width || current === "") {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

/**
 * Wrap lines in a rounded box, reflowing any line wider than
 * `maxWidth` (default: no cap, matches historical behavior). Falls
 * back to a plain `+`/`-`/`|` border when `ascii` is set.
 */
export function box(
  lines: string[],
  pad = 1,
  opts: { maxWidth?: number; ascii?: boolean } = {},
): string[] {
  const contentCap = opts.maxWidth
    ? Math.max(1, opts.maxWidth - pad * 2 - 2)
    : Number.POSITIVE_INFINITY;
  const wrapped = lines.flatMap((line) =>
    measure(line) > contentCap ? wrapText(line, contentCap) : [line],
  );
  const width = Math.max(...wrapped.map(measure)) + pad * 2;
  const corners = opts.ascii
    ? { tl: "+", tr: "+", bl: "+", br: "+", h: "-", v: "|" }
    : { tl: "╭", tr: "╮", bl: "╰", br: "╯", h: "─", v: "│" };
  const out = [`${corners.tl}${corners.h.repeat(width)}${corners.tr}`];
  for (const line of wrapped) {
    out.push(
      `${corners.v}${" ".repeat(pad)}${line}${" ".repeat(width - measure(line) - pad)}${corners.v}`,
    );
  }
  out.push(`${corners.bl}${corners.h.repeat(width)}${corners.br}`);
  return out;
}

/** Visible length of a line, ignoring ANSI escape sequences. */
export function measure(s: string): number {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, "").length;
}

/** Pad a line (ANSI-aware) to a visible width. */
export function padTo(s: string, width: number): string {
  return s + " ".repeat(Math.max(0, width - measure(s)));
}

/* ── Gauges & bars ───────────────────────────────────────────── */

/**
 * Score gauge: colored block bar with gradient segments.
 * Color by range: red <50, yellow <80, green ≥80.
 * Falls back to `#`/`.` blocks when `ascii` is set (block-drawing
 * characters `█`/`▓`/`░` render as "?" on some legacy Windows consoles).
 */
export function scoreGauge(
  score: number,
  p: Palette,
  width = 30,
  ascii = false,
): string {
  const filled = Math.round((score / 100) * width);
  const color = gaugeColor(score, p);
  if (ascii) {
    return color("#".repeat(filled)) + ".".repeat(Math.max(0, width - filled));
  }
  const head = filled > 0 && filled < width ? "▓" : "";
  const bar =
    color("█".repeat(Math.max(0, filled - (head ? 1 : 0)))) +
    color(head) +
    "░".repeat(width - filled);
  return bar;
}

/** Horizontal meter for per-category scores (0–100). */
export function meter(
  score: number,
  p: Palette,
  width = 20,
  ascii = false,
): string {
  return scoreGauge(score, p, width, ascii);
}

function gaugeColor(score: number, p: Palette): (s: string) => string {
  if (score >= 80) return p.ok;
  return score >= 50 ? p.warning : p.error;
}

/** Severity glyph + label, themed. Falls back to plain ASCII glyphs
 * (X/!/i) when `ascii` is set — ✗/⚠/ℹ render as "?" boxes on some
 * legacy Windows consoles, and color already carries the same signal
 * (color-blind-safe symbols remain: the label text itself). */
export function severityTag(
  severity: "error" | "warning" | "info",
  p: Palette,
  ascii = false,
): string {
  const glyphs = ascii
    ? { error: "X", warning: "!", info: "i" }
    : { error: "✗", warning: "⚠", info: "ℹ" };
  if (severity === "error")
    return `${p.error(glyphs.error)} ${p.error("ERROR  ")}`;
  if (severity === "warning")
    return `${p.warning(glyphs.warning)} ${p.warning("WARN   ")}`;
  return `${p.info(glyphs.info)} ${p.info("INFO   ")}`;
}
