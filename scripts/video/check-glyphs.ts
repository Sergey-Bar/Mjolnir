/**
 * Font/glyph prerequisite gate — runs BEFORE any frame is rendered.
 *
 * A missing glyph in a terminal screencast does not look like an error,
 * it looks like a tofu box, and a tofu box where `renderTerminal` printed
 * `ᚦ` or `█` is the video misrepresenting what the tool prints. That is
 * the failure class this whole pipeline exists to prevent, so it is
 * checked first and fails hard.
 *
 * Answered from the vendored font files' own character maps, in Node —
 * not from the browser. Two browser-side approaches were tried and both
 * produced FALSE PASSES: `document.fonts.check()` consults system
 * fallback and returns true for characters a family has never contained,
 * and comparing rasterized pixels against a nonexistent family is unsound
 * because Chromium's fallback chain for an unknown family differs from
 * its chain for a known family missing one glyph. Both certified emoji as
 * covered by JetBrains Mono. Reading the cmap has no such ambiguity, and
 * costs no Chromium — so this gate runs in the standing test gate.
 *
 * Usage: npx tsx scripts/video/check-glyphs.ts
 */

import { readCodepoints } from "./cmap.js";
import { FONTS, fontPath } from "./fonts.js";
import { requiredGlyphs } from "./glyph-inventory.js";

export interface GlyphCoverage {
  /** Character → the vendored family that supplies it, in stack order. */
  suppliedBy: Map<string, string>;
  /** Characters no vendored face supplies. Non-empty ⇒ hard failure. */
  missing: string[];
}

/**
 * A must-not-fire control, probed on every run alongside the real
 * inventory. No vendored text face contains U+1F600, so a run reporting
 * it as COVERED proves the probe itself has stopped discriminating —
 * which is not hypothetical. It caught both browser-based implementations
 * of this gate. A gate that can only pass is not a gate.
 */
export const SELF_TEST_CHAR = "\u{1F600}";

/** `U+16A6 ᚦ` — the form every diagnostic here uses. */
export function describe(ch: string): string {
  const cp = (ch.codePointAt(0) ?? 0)
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");
  return `U+${cp} ${ch}`;
}

export function probeGlyphs(chars: string[]): GlyphCoverage {
  // Families in stack order, each merged from every weight we ship: a
  // glyph present in Regular but not Bold is still supplied by the family.
  const byFamily: Array<{ family: string; points: Set<number> }> = [];
  for (const font of FONTS) {
    const points = readCodepoints(fontPath(font));
    const existing = byFamily.find((f) => f.family === font.family);
    if (existing) for (const cp of points) existing.points.add(cp);
    else byFamily.push({ family: font.family, points });
  }

  const covers = (ch: string): string | undefined =>
    byFamily.find((f) => f.points.has(ch.codePointAt(0) ?? 0))?.family;

  const selfTest = covers(SELF_TEST_CHAR);
  if (selfTest !== undefined) {
    throw new Error(
      `glyph probe is not discriminating: it reports ${describe(SELF_TEST_CHAR)} ` +
        `as covered by "${selfTest}", which no vendored text face contains. ` +
        `Every "covered" result from this run is untrustworthy — fix the ` +
        `probe before trusting its coverage report.`,
    );
  }

  const suppliedBy = new Map<string, string>();
  const missing: string[] = [];
  for (const ch of chars) {
    const family = covers(ch);
    if (family === undefined) missing.push(ch);
    else suppliedBy.set(ch, family);
  }
  return { suppliedBy, missing };
}

/** Throws with an actionable message when anything is uncovered. */
export function assertGlyphCoverage(chars: string[] = requiredGlyphs()): void {
  const { missing } = probeGlyphs(chars);
  if (missing.length === 0) return;
  throw new Error(
    `${missing.length} required glyph(s) resolve in NO vendored face:\n` +
      missing.map((c) => `  ${describe(c)}`).join("\n") +
      `\n\nRendering would draw a tofu box where the reporter prints these.` +
      `\nAdd a face that covers them to assets/video/fonts/ and register it` +
      `\nin scripts/video/fonts.ts, or the video will misrepresent the CLI.`,
  );
}

function main(): void {
  const chars = requiredGlyphs();
  const { suppliedBy, missing } = probeGlyphs(chars);

  const grouped = new Map<string, string[]>();
  for (const [ch, family] of suppliedBy) {
    grouped.set(family, [...(grouped.get(family) ?? []), ch]);
  }
  console.log(`Probed ${chars.length} required glyphs.`);
  for (const [family, list] of grouped) {
    const nonAscii = list.filter((c) => (c.codePointAt(0) ?? 0) > 127);
    console.log(
      `  ${family}: ${list.length} glyphs` +
        (nonAscii.length > 0 ? ` (non-ASCII: ${nonAscii.join(" ")})` : ""),
    );
  }
  if (missing.length > 0) {
    console.error("");
    assertGlyphCoverage(chars);
  }
  console.log("\nEvery required glyph resolves in the vendored stack.");
}

if (process.argv[1]?.endsWith("check-glyphs.ts")) main();
