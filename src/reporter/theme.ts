/**
 * Norse-forge theme system. Pure string-in → string-out helpers.
 * Respects NO_COLOR and non-TTY via `palette(isTTY)` — every renderer
 * receives a palette and never touches process.env directly.
 *
 * Palette: a cold northern set — frost-steel, aurora teal, Yggdrasil
 * green — with amber for warnings (Mjölnir's lightning) and a
 * rune-red for errors. No magenta/pink. Emitted as 24-bit truecolor
 * SGR (`38;2;r;g;b`), which every modern terminal renders and which
 * `shouldColorize` already gates behind TTY + !NO_COLOR.
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
  /** Yggdrasil green — healthy / passing. */
  ok: (s: string) => string;
  /** Aurora teal — info / detected frameworks. */
  info: (s: string) => string;
  /** Frost-steel blue — the hammer, section headers. */
  accent: (s: string) => string;
  /** Amber — warnings (Mjölnir's lightning). */
  warning: (s: string) => string;
  /** Rune-red — errors. */
  error: (s: string) => string;
  bold: (s: string) => string;
  dim: (s: string) => string;
}

/** Norse-forge palette, 24-bit truecolor. */
export const NORSE = {
  ok: [0x4f, 0xb4, 0x77], // Yggdrasil green
  info: [0x3f, 0xb0, 0xa0], // aurora teal
  accent: [0x8a, 0xb4, 0xd8], // frost-steel blue
  warning: [0xe0, 0xa5, 0x26], // amber / lightning
  error: [0xd0, 0x45, 0x3b], // rune-red
  bold: [0xed, 0xe6, 0xd6], // bone white
  dim: [0x7c, 0x85, 0x90], // weathered stone
} as const;

const on = {
  ok: rgb(NORSE.ok),
  info: rgb(NORSE.info),
  accent: rgb(NORSE.accent),
  warning: rgb(NORSE.warning),
  error: rgb(NORSE.error),
  // bold keeps the SGR bold-intensity attribute as well as the tint.
  bold: (s: string) => `\x1b[1m${rgb(NORSE.bold)(s)}`,
  dim: rgb(NORSE.dim),
};

/**
 * Bug-audit QA-2026-08-30 QA-10: finding metadata (file paths, plugin
 * rule messages) is untrusted data that ends up on a terminal or in a
 * markdown PR comment. ANSI escapes embedded in a hostile filename could
 * clear/redraw the screen or forge output; control characters could
 * corrupt the layout. Strip escapes and C0 controls (keeping tab/LF for
 * legitimate multi-line messages) before any data reaches a renderer.
 */
export function sanitizeData(s: string): string {
  return s
    .replace(/\x1b\[[0-9;:?]*[ -/]*[@-~]/g, "") // CSI … final byte
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)?/g, "") // OSC … BEL/ST
    .replace(/\x1b[@-Z\\-_]/g, "") // two-byte C1 feeders
    .replace(/\x1b/g, "") // any residual escape
    .replace(/[\x00-\x08\x0b-\x1f\x7f]/g, ""); // other C0 + DEL
}

const inertId = (s: string) => sanitizeData(s);

const off = {
  ok: inertId,
  info: inertId,
  accent: inertId,
  warning: inertId,
  error: inertId,
  bold: inertId,
  dim: inertId,
};

function rgb([r, g, b]: readonly [number, number, number]) {
  return (s: string) => `\x1b[38;2;${r};${g};${b}m${sanitizeData(s)}\x1b[0m`;
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
