/**
 * The demo video's pixels actually carry the brand.
 *
 * Everything else about this artifact was checked — codec, resolution,
 * frame count, byte budget, and that it is the file `npm run docs:video`
 * produces — and none of that says anything about what it LOOKS like.
 * The one time its colour was verified, it was me sampling a corner by
 * hand, once, and writing the number in a document. That is not
 * evidence, it is an anecdote with a hex value in it.
 *
 * So: decode the poster frame and read its ground.
 *
 * PURE NODE, NO FFMPEG. The media contract next door skips when ffprobe
 * is absent, which is correct for format checks but would make this one
 * useless — a colour check that only runs on the machine that just
 * rendered is the same non-rule as the size budget that used to measure
 * the wrong file. PNG's first scanline is cheap to decode without any
 * dependency: zlib is built in, and row 0's filters reference a
 * prior row of zeros, so it needs no other row.
 *
 * TOLERANCE IS PART OF THE MEASUREMENT. The poster is extracted from
 * H.264 at CRF 32 in yuv420p, so the ground is the canonical colour
 * after chroma subsampling and quantisation, not the canonical colour.
 * The bound below is wide enough for that round trip and far too narrow
 * for a different colour: the pre-unification ground it replaced sits
 * more than four times further away than the limit.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import { SURFACE } from "../../src/brand/tokens.js";

const ROOT = join(import.meta.dirname, "..", "..");
const POSTER = join(ROOT, "assets", "video", "mjolnir-demo-poster.png");

/** The pre-unification terminal ground, for the contrast below. */
const RETIRED_GROUND = "#08090A";

interface Rgb {
  r: number;
  g: number;
  b: number;
}

/**
 * The first pixel of a PNG's first scanline.
 *
 * Only the pieces this needs: IHDR for the geometry, the concatenated
 * IDAT stream, and one un-filtered row. Interlaced or palettised PNGs
 * would need more, and the renderer emits neither — so it throws rather
 * than guessing, because a decoder that quietly returns the wrong pixel
 * is worse than no decoder.
 */
export function firstPixel(png: Buffer): Rgb {
  if (png.readUInt32BE(0) !== 0x89504e47)
    throw new Error("not a PNG: bad signature");

  let pos = 8;
  let width = 0;
  let depth = 0;
  let colorType = -1;
  let interlace = 0;
  const idat: Buffer[] = [];

  while (pos < png.length) {
    const length = png.readUInt32BE(pos);
    const type = png.toString("ascii", pos + 4, pos + 8);
    const body = png.subarray(pos + 8, pos + 8 + length);
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      depth = body[8] ?? 0;
      colorType = body[9] ?? -1;
      interlace = body[12] ?? 0;
    } else if (type === "IDAT") idat.push(body);
    else if (type === "IEND") break;
    pos += 12 + length;
  }

  if (depth !== 8) throw new Error(`unsupported bit depth ${depth}`);
  if (colorType !== 2 && colorType !== 6)
    throw new Error(`unsupported colour type ${colorType} (need RGB or RGBA)`);
  if (interlace !== 0) throw new Error("interlaced PNG is not supported");
  if (idat.length === 0) throw new Error("no IDAT data");

  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  // One row is all that is needed, and inflateSync gives the whole
  // stream — the poster is ~170 KB, so this costs nothing worth saving.
  const raw = inflateSync(Buffer.concat(idat));

  const filter = raw[0];
  const row = raw.subarray(1, 1 + stride);
  // Row 0 only. Every filter's "previous row" term is zero here, so Sub
  // and Paeth reduce to Sub and Up/Average reduce to identity — for the
  // FIRST pixel of the row the left term is zero too, which makes all
  // five filters agree on the first `channels` bytes.
  if (filter === undefined || filter > 4)
    throw new Error(`unknown PNG filter type ${String(filter)}`);

  return { r: row[0] ?? 0, g: row[1] ?? 0, b: row[2] ?? 0 };
}

function hexToRgb(hex: string): Rgb {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

/** Straight-line distance in RGB. Crude, and sufficient: this is
 * "is it that colour or a different one", not a perceptual judgement. */
function distance(a: Rgb, b: Rgb): number {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

/** Wide enough for yuv420p at CRF 32; far too narrow for another colour. */
const TOLERANCE = 12;

describe.skipIf(!existsSync(POSTER))(
  "the demo video's poster carries the brand ground",
  () => {
    const pixel = firstPixel(readFileSync(POSTER));
    const want = hexToRgb(SURFACE.terminal);

    it("its corner is the canonical terminal ground", () => {
      const off = distance(pixel, want);
      expect(
        off,
        `the poster's corner is rgb(${pixel.r}, ${pixel.g}, ${pixel.b}), ` +
          `${off.toFixed(1)} from SURFACE.terminal ${SURFACE.terminal}. ` +
          `Either the video was rendered before a palette change and needs ` +
          `\`npm run docs:video\`, or the terminal page stopped using the token.`,
      ).toBeLessThanOrEqual(TOLERANCE);
    });

    it("and is not the ground it replaced", () => {
      // The check that makes the one above mean something: if the
      // tolerance were wide enough to admit the retired near-black, it
      // would be wide enough to admit anything dark.
      const fromRetired = distance(pixel, hexToRgb(RETIRED_GROUND));
      expect(fromRetired).toBeGreaterThan(TOLERANCE);
    });
  },
);
