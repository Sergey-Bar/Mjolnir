/**
 * Minimal sfnt character-map reader — "does this font file actually
 * contain a glyph for this codepoint?", answered from the file itself.
 *
 * The browser cannot answer that question. `document.fonts.check()`
 * consults system fallback and returns true for characters the family has
 * never contained, and comparing rasterized pixels against a nonexistent
 * family is unsound because Chromium's fallback chain for an unknown
 * family differs from its chain for a known family missing one glyph.
 * Both were tried; both certified emoji as covered by JetBrains Mono.
 * The font's own cmap has no such ambiguity.
 *
 * Supports the two subtable formats that matter for these faces: format 4
 * (BMP) and format 12 (full range). Both vendored files are plain sfnt
 * TrueType for exactly this reason — a WOFF2 container would need a
 * brotli-and-table-transform decoder to reach the same bytes.
 */

import { readFileSync } from "node:fs";

/** Reads the set of Unicode codepoints a font file can render. */
export function readCodepoints(path: string): Set<number> {
  const buf = readFileSync(path);
  const numTables = buf.readUInt16BE(4);

  let cmapOffset = -1;
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    if (buf.toString("ascii", rec, rec + 4) === "cmap") {
      cmapOffset = buf.readUInt32BE(rec + 8);
      break;
    }
  }
  if (cmapOffset < 0) throw new Error(`${path}: no cmap table`);

  // Prefer a full-range (format 12) subtable when the font ships one;
  // fall back to the BMP Windows/Unicode subtable otherwise.
  const numSub = buf.readUInt16BE(cmapOffset + 2);
  let best = -1;
  let bestFormat = -1;
  for (let i = 0; i < numSub; i++) {
    const rec = cmapOffset + 4 + i * 8;
    const platform = buf.readUInt16BE(rec);
    const encoding = buf.readUInt16BE(rec + 2);
    const sub = cmapOffset + buf.readUInt32BE(rec + 4);
    const format = buf.readUInt16BE(sub);
    const unicode =
      platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
    if (!unicode) continue;
    if (format === 12 && bestFormat !== 12) {
      best = sub;
      bestFormat = 12;
    } else if (format === 4 && bestFormat < 4) {
      best = sub;
      bestFormat = 4;
    }
  }
  if (best < 0) throw new Error(`${path}: no usable Unicode cmap subtable`);

  const points = new Set<number>();
  if (bestFormat === 12) {
    const nGroups = buf.readUInt32BE(best + 12);
    for (let g = 0; g < nGroups; g++) {
      const rec = best + 16 + g * 12;
      const start = buf.readUInt32BE(rec);
      const end = buf.readUInt32BE(rec + 4);
      const glyph = buf.readUInt32BE(rec + 8);
      if (glyph === 0) continue; // maps to .notdef — not real coverage
      for (let cp = start; cp <= end; cp++) points.add(cp);
    }
    return points;
  }

  // format 4
  const segX2 = buf.readUInt16BE(best + 6);
  const segs = segX2 / 2;
  const endBase = best + 14;
  const startBase = endBase + segX2 + 2;
  const deltaBase = startBase + segX2;
  const rangeBase = deltaBase + segX2;
  for (let s = 0; s < segs; s++) {
    const end = buf.readUInt16BE(endBase + s * 2);
    const start = buf.readUInt16BE(startBase + s * 2);
    if (start > end) continue;
    const delta = buf.readInt16BE(deltaBase + s * 2);
    const rangeOffset = buf.readUInt16BE(rangeBase + s * 2);
    for (let cp = start; cp <= end && cp !== 0xffff; cp++) {
      let glyph: number;
      if (rangeOffset === 0) {
        glyph = (cp + delta) & 0xffff;
      } else {
        const gi = rangeBase + s * 2 + rangeOffset + (cp - start) * 2;
        if (gi + 1 >= buf.length) continue;
        const raw = buf.readUInt16BE(gi);
        glyph = raw === 0 ? 0 : (raw + delta) & 0xffff;
      }
      if (glyph !== 0) points.add(cp);
    }
  }
  return points;
}
