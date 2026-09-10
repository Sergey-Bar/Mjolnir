/**
 * ffmpeg resolution and invocation.
 *
 * ffmpeg is NOT a dependency of this repo. Adding an ~80MB binary to
 * devDependencies to serve one opt-in script would tax every `npm ci` in
 * the project, so it is resolved from the environment and its absence is
 * reported as an actionable message rather than a stack trace.
 */

import { execFileSync, spawnSync } from "node:child_process";

/** Where the encoder looks, in order. */
export function resolveFfmpeg(bin: "ffmpeg" | "ffprobe" = "ffmpeg"): string {
  const override =
    process.env[bin === "ffmpeg" ? "MJOLNIR_FFMPEG" : "MJOLNIR_FFPROBE"];
  if (override) return override;
  const found = spawnSync("which", [bin], { encoding: "utf8" });
  const path = found.stdout.trim();
  if (path) return path;
  throw new Error(
    `${bin} not found. The demo-video renderer needs an ffmpeg build with ` +
      `libx264 — it is deliberately not a dependency of this repo.\n` +
      `  Debian/Ubuntu: apt-get install -y --no-install-recommends ffmpeg\n` +
      `  or:            npx ffmpeg-static  (then set MJOLNIR_FFMPEG)\n` +
      `Playwright's bundled ffmpeg will NOT work: it is built ` +
      `--disable-everything with only VP8/WebM, no H.264 and no MP4 muxer.`,
  );
}

/** Fails early and clearly rather than mid-encode on a 20-minute render. */
export function assertH264(ffmpeg: string): void {
  const encoders = execFileSync(ffmpeg, ["-hide_banner", "-encoders"], {
    encoding: "utf8",
    maxBuffer: 1 << 24,
  });
  if (!/\blibx264\b/.test(encoders)) {
    throw new Error(
      `${ffmpeg} has no libx264 encoder, so it cannot produce the H.264 MP4 ` +
        `this pipeline ships. Install a full ffmpeg build.`,
    );
  }
}

export interface EncodeOptions {
  fps: number;
  out: string;
  /** Constant-quality target; defaults to `CRF`. */
  crf?: number;
}

/**
 * Constant-quality target.
 *
 * 18 is visually transparent and produced a 31 MB demo — nearly three
 * times the 12 MB budget `video-media.spec.ts` enforces on an asset
 * every clone pays for. The 8.7 MB file that actually shipped was
 * produced by some compression step that lived outside this repository,
 * which meant the documented command could not reproduce the artifact
 * readers download, and nothing checked the one that did ship.
 *
 * Calibrated by rendering, not guessed: at 2560x1440 / 30 fps / 42.7 s
 * this demo measures 31.2 MB at CRF 18 and 18.7 MB at CRF 24. 32 is the
 * step that lands it inside the budget with margin, at a bitrate close
 * to the 1.63 Mbps the previously shipped file happened to use.
 *
 * The visible cost is small because of what the content is: flat colour
 * on flat ground, with motion confined to a typing caret and a scrolling
 * report. That is the easiest thing x264 encodes, and CRF 18 was
 * spending five megabits per second describing a near-black background
 * in perfect fidelity.
 */
export const CRF = 32;

/**
 * PNG frames on stdin to an H.264 MP4.
 *
 * yuv420p, not yuv444p: 4:4:4 keeps coloured text fractionally crisper,
 * but LinkedIn, X, iOS Safari and most players reject or silently
 * re-encode it, and a re-encode costs far more sharpness than the chroma
 * subsampling does. Rendering at 1440p and letting the platform downscale
 * is the better trade.
 *
 * scenecut=0 with a fixed keyint keeps the GOP structure identical run to
 * run; libx264's scene detection is content-adaptive and would otherwise
 * make byte-identical output depend on the encoder's mood.
 */
export function ffmpegArgs({ fps, out, crf = CRF }: EncodeOptions): string[] {
  return [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-f",
    "image2pipe",
    "-c:v",
    "png",
    "-framerate",
    String(fps),
    "-i",
    "-",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    String(crf),
    "-profile:v",
    "high",
    "-pix_fmt",
    "yuv420p",
    "-x264-params",
    `keyint=${fps * 2}:min-keyint=${fps}:scenecut=0`,
    "-movflags",
    "+faststart",
    "-an",
    out,
  ];
}

/** Pulls a single frame out of the finished video as the poster image. */
export function extractPoster(
  ffmpeg: string,
  video: string,
  frame: number,
  out: string,
): void {
  execFileSync(
    ffmpeg,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      video,
      "-vf",
      `select=eq(n\\,${frame})`,
      "-vsync",
      "0",
      "-frames:v",
      "1",
      out,
    ],
    { stdio: "inherit" },
  );
}
