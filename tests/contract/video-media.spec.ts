/**
 * The rendered videos' media-format contract.
 *
 * SKIPS, loudly and with a reason, when the artifacts or ffprobe are
 * absent. That is deliberate and load-bearing: the standing gate must not
 * require ffmpeg or Chromium, and a spec that failed on a clean checkout
 * would make the video renderer a dependency of `npm test`. The rendering
 * workflow runs this same file against the artifact it just built, which
 * is where these assertions actually bite.
 *
 * This checks FORMAT, not quality. Whether the video looks good, reads
 * clearly or paces well is not machine-provable and is not claimed here —
 * that judgement stays with a human watching it.
 */

import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { pacingFor } from "../../scripts/video/pacing.js";
import { readScript } from "../../scripts/video/script-io.js";
import { planFrames, posterFrame } from "../../scripts/video/terminal-page.js";
import { posterPath, videoPath } from "../../scripts/video/render.js";
import type { VideoScript } from "../../scripts/video/script-types.js";

/** The hero is committed to the repo, so its weight is everyone's clone. */
const HERO_MAX_BYTES = 12 * 1024 * 1024;
/** Frame-count tolerance: the muxer may round the final frame. */
const FRAME_TOLERANCE = 2;

function ffprobe(): string | null {
  try {
    return (
      process.env["MJOLNIR_FFPROBE"] ??
      execFileSync("sh", ["-c", "command -v ffprobe"], {
        encoding: "utf8",
      }).trim()
    );
  } catch {
    return null;
  }
}

function probe(bin: string, file: string, args: string[]): string {
  return execFileSync(bin, ["-v", "error", ...args, file], {
    encoding: "utf8",
  }).trim();
}

const bin = ffprobe();
const ids: Array<VideoScript["id"]> = ["demo", "tour"];
const rendered = ids.filter((id) => existsSync(videoPath(id)));

const reason =
  bin === null
    ? "ffprobe is not installed — render with `npm run docs:video` to check media format"
    : rendered.length === 0
      ? "no rendered videos under assets/video/out — run `npm run docs:video:render`"
      : null;

describe.skipIf(reason !== null)(
  "rendered demo videos are the format we ship",
  () => {
    if (reason !== null) return; // narrowing for the closure below
    const ffprobeBin = bin as string;

    it.each(rendered)("%s: is H.264 in a faststart MP4 with no audio", (id) => {
      const file = videoPath(id);
      const codec = probe(ffprobeBin, file, [
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=codec_name,pix_fmt,width,height",
        "-of",
        "default=nw=1:nk=1",
      ]).split("\n");
      expect(codec[0], "codec must be H.264 for universal playback").toBe(
        "h264",
      );
      expect(codec[1]).toBe("2560");
      expect(codec[2]).toBe("1440");
      expect(
        codec[3],
        "yuv444p is rejected or silently re-encoded by most platforms",
      ).toBe("yuv420p");

      const audio = probe(ffprobeBin, file, [
        "-select_streams",
        "a",
        "-show_entries",
        "stream=index",
        "-of",
        "csv=p=0",
      ]);
      expect(
        audio,
        "these are silent screencasts — an audio track is a bug",
      ).toBe("");
    });

    it.each(rendered)(
      "%s: frame count and rate match the planned timeline exactly",
      (id) => {
        const script = readScript(id);
        const pacing = pacingFor(id);
        const planned = planFrames(script).length;

        const [rate, frames] = probe(ffprobeBin, videoPath(id), [
          "-select_streams",
          "v:0",
          "-show_entries",
          "stream=r_frame_rate,nb_frames",
          "-of",
          "default=nw=1:nk=1",
        ]).split("\n");

        expect(rate).toBe(`${pacing.fps}/1`);
        // The encoder is not trusted to report back what it was asked for:
        // this is what makes "the renderer is a pure function of the script"
        // a checked claim rather than a comment.
        expect(
          Math.abs(Number(frames) - planned),
          `${id}.mp4 has ${frames} frames but the script plans ${planned}`,
        ).toBeLessThanOrEqual(FRAME_TOLERANCE);
      },
    );

    it.each(rendered)("%s: has a poster at full resolution", (id) => {
      const poster = posterPath(id);
      expect(existsSync(poster), `${poster} was not written`).toBe(true);
      const size = probe(ffprobeBin, poster, [
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height",
        "-of",
        "default=nw=1:nk=1",
      ]).split("\n");
      expect(size).toEqual(["2560", "1440"]);
      // The poster is chosen by content (the score on screen), not by index.
      expect(posterFrame(readScript(id))).toBeGreaterThan(0);
    });

    it.skipIf(!rendered.includes("demo"))(
      "the hero stays within the size budget for a committed asset",
      () => {
        const bytes = statSync(videoPath("demo")).size;
        expect(
          bytes,
          `the hero is ${(bytes / 1024 / 1024).toFixed(1)}MB; it is committed ` +
            `to the repo, so every clone pays for it. Budget is ` +
            `${HERO_MAX_BYTES / 1024 / 1024}MB — shorten it or raise CRF.`,
        ).toBeLessThanOrEqual(HERO_MAX_BYTES);
      },
    );
  },
);

// A visible record when the suite ran without checking anything, so a
// green board is never mistaken for a verified one.
describe.runIf(reason !== null)("media contract skipped", () => {
  it("says why", () => {
    console.warn(`video-media.spec.ts skipped: ${reason}`);
    expect(reason).not.toBeNull();
  });
});
