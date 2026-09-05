/**
 * Mjölnir design-system core. Single source of truth for the visual
 * language every renderer shares: section headers, panels, severity
 * icons, key-value rows, bullets, dividers, next-step affordances and
 * footers.
 *
 * Contract with the rest of the reporter stack:
 * - Pure string-in → string-out. Nothing here touches process.env
 *   except through the injected `UiContext` (TTY + ascii + width are
 *   resolved once by the entry point, e.g. cli.ts, and passed in).
 * - Color comes from a Palette (theme.ts). Glyph choice comes from the
 *   ascii flag. Width comes from the context. Renderers never reach
 *   for globals.
 * - The design tokens (header glyph, severity glyphs, box style,
 *   divider length) are canonical: no renderer invents its own.
 *
 * ASCII fallbacks mirror theme.ts: `= TITLE` headers, `X ! i` severities,
 * `+ - |` boxes, `-` dividers.
 */

import type { Palette } from "./theme.js";
import { box, measure, padTo, wrapText } from "./theme.js";

/** Resolved render context — built once per command run, passed down. */
export interface UiContext {
  p: Palette;
  ascii: boolean;
  width: number;
}

/** Canonical divider length (art.ts DIVIDER matches; keep in sync). */
export const DIVIDER_WIDTH = 58;

/** Canonical severity glyphs. Symbols always accompany color (R11). */
export const SEVERITY_GLYPHS = {
  unicode: { error: "✗", warning: "⚠", info: "ℹ" },
  ascii: { error: "X", warning: "!", info: "i" },
} as const;

export type Severity = keyof typeof SEVERITY_GLYPHS.unicode;

/** Success / true-flake glyphs (unicode only; ascii degrades to text). */
export const OK_GLYPH_UNICODE = "✓";
export const OK_GLYPH_ASCII = "v";
export const FLAKE_GLYPH = "🔥";

/** Section header: `▚ TITLE` (ascii `= TITLE`). The one header style. */
export function sectionHeader(title: string, ui: UiContext): string {
  const glyph = ui.ascii ? "=" : "▚";
  return `  ${ui.p.accent(`${glyph} ${title}`)}`;
}

/** Rounded panel around wrapped text lines, indented two spaces. */
export function panel(lines: string[], ui: UiContext, pad = 1): string[] {
  return box(lines, pad, { maxWidth: ui.width - 2, ascii: ui.ascii }).map(
    (l) => `  ${l}`,
  );
}

/** `LABEL  value` row with the label padded to a shared column. */
export function keyValue(
  label: string,
  value: string,
  ui: UiContext,
  labelWidth?: number,
): string {
  const w = labelWidth ?? label.length;
  return `  ${ui.p.dim(padTo(label, w))}  ${value}`;
}

/** `- text` bullet (ascii identical minus glyph weight; `-` is ascii-safe). */
export function bullet(text: string, ui: UiContext): string {
  return `  ${ui.p.dim("-")} ${text}`;
}

/** Horizontal rule under a section block. */
export function divider(ui: UiContext): string {
  return ui.p.dim((ui.ascii ? "-" : "─").repeat(DIVIDER_WIDTH));
}

/**
 * Next-step affordance: dim `$ command` line. The `$` prefix is the
 * universal "type this in your shell" marker; the command itself is
 * plain (not dimmed) so it copies cleanly from a terminal.
 */
export function nextStep(command: string, ui: UiContext): string {
  return `  ${ui.p.dim("$")} ${command}`;
}

/** Themed severity icon: glyph + padded label, e.g. `✗ ERROR  `. */
export function severityIcon(severity: Severity, ui: UiContext): string {
  const g = (ui.ascii ? SEVERITY_GLYPHS.ascii : SEVERITY_GLYPHS.unicode)[
    severity
  ];
  if (severity === "error") return `${ui.p.error(g)} ${ui.p.error("ERROR  ")}`;
  if (severity === "warning")
    return `${ui.p.warning(g)} ${ui.p.warning("WARN   ")}`;
  return `${ui.p.info(g)} ${ui.p.info("INFO   ")}`;
}

/** Themed success icon (`✓` / `v` in ascii). */
export function okIcon(ui: UiContext): string {
  const g = ui.ascii ? OK_GLYPH_ASCII : OK_GLYPH_UNICODE;
  return ui.p.ok(g);
}

/** Inline severity glyph without the label (compact contexts). */
export function severityGlyph(severity: Severity, ui: UiContext): string {
  const g = (ui.ascii ? SEVERITY_GLYPHS.ascii : SEVERITY_GLYPHS.unicode)[
    severity
  ];
  if (severity === "error") return ui.p.error(g);
  if (severity === "warning") return ui.p.warning(g);
  return ui.p.info(g);
}

/**
 * Footer builder: `Analysis complete · <duration>ms` + optional
 * suppressed count + optional next action. `durationMs` is formatted
 * by formatDuration; `next` is rendered as a `$ command` line.
 */
export function buildFooter(opts: {
  ui: UiContext;
  complete: boolean;
  durationMs?: number;
  suppressedCount?: number;
  next?: string;
}): string[] {
  const { ui } = opts;
  const lines: string[] = [];
  lines.push(divider(ui));
  const status = opts.complete
    ? `${ui.p.ok("complete")} · ${formatDuration(opts.durationMs)}`
    : `${ui.p.warning("PARTIAL — verdict may be incomplete")} · ${formatDuration(opts.durationMs)}`;
  lines.push(`  Analysis: ${status}`);
  if (opts.suppressedCount && opts.suppressedCount > 0) {
    lines.push(
      ui.p.dim(`  ${opts.suppressedCount} finding(s) suppressed by config`),
    );
  }
  if (opts.next) lines.push(nextStep(opts.next, ui));
  return lines;
}

/** Human duration: `1.2s` above a second, `850ms` below. */
export function formatDuration(ms?: number): string {
  if (ms === undefined) return "?";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

/** Wrap plain text to the context width minus an indent. */
export function wrapFor(text: string, ui: UiContext, indent = 2): string[] {
  return wrapText(text, Math.max(10, ui.width - indent));
}

/** Visible-width-aware center pad — for title bars. */
export function centerIn(text: string, width: number): string {
  const visible = measure(text);
  if (visible >= width) return text;
  const left = Math.floor((width - visible) / 2);
  const right = width - visible - left;
  return `${" ".repeat(left)}${text}${" ".repeat(right)}`;
}
