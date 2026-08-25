/**
 * Retro CRT/arcade theme system. Pure string-in → string-out helpers.
 * Respects NO_COLOR and non-TTY via `palette(isTTY)` — every renderer
 * receives a palette and never touches process.env directly.
 *
 * Symbols always accompany color (color-blind safe, R11).
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

/** Wrap lines in a rounded box. Width = longest line + padding. */
export function box(lines: string[], pad = 1): string[] {
  const width = Math.max(...lines.map(measure)) + pad * 2;
  const out = [`╭${"─".repeat(width)}╮`];
  for (const line of lines) {
    out.push(
      `│${" ".repeat(pad)}${line}${" ".repeat(width - measure(line) - pad)}│`,
    );
  }
  out.push(`╰${"─".repeat(width)}╯`);
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
 */
export function scoreGauge(score: number, p: Palette, width = 30): string {
  const filled = Math.round((score / 100) * width);
  const color = gaugeColor(score, p);
  const head = filled > 0 && filled < width ? "▓" : "";
  const bar =
    color("█".repeat(Math.max(0, filled - (head ? 1 : 0)))) +
    color(head) +
    "░".repeat(width - filled);
  return bar;
}

/** Horizontal meter for per-category scores (0–100). */
export function meter(score: number, p: Palette, width = 20): string {
  return scoreGauge(score, p, width);
}

function gaugeColor(score: number, p: Palette): (s: string) => string {
  if (score >= 80) return p.ok;
  return score >= 50 ? p.warning : p.error;
}

/** Severity glyph + label, themed. */
export function severityTag(
  severity: "error" | "warning" | "info",
  p: Palette,
): string {
  if (severity === "error") return `${p.error("✗")} ${p.error("ERROR  ")}`;
  if (severity === "warning")
    return `${p.warning("⚠")} ${p.warning("WARN   ")}`;
  return `${p.info("ℹ")} ${p.info("INFO   ")}`;
}
