/**
 * `npm run docs:video:render` — draws the committed scripts into MP4s.
 *
 * The presentation half of the pipeline. It reads assets/video/script.*.json
 * and may render nothing that is not in them: the capture layer is the
 * evidence, this is only how the evidence is shown.
 *
 * Frames are stepped by index, never by a clock. `window.__renderFrame(n)`
 * paints exactly the state of frame n, so the sequence is a pure function
 * of (script, pinned pacing, frame index). Screenshots go straight into
 * ffmpeg's stdin as PNG — no intermediate frame directory, no lossy
 * screencast codec between the render and the encoder.
 *
 * What this does NOT establish: that two different machines produce
 * byte-identical MP4s. A different Chromium build can rasterize
 * sub-pixels differently. Content and timeline are reproducible
 * anywhere; byte identity is a property of one pinned environment.
 */

import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

import { assertGlyphCoverage } from "./check-glyphs.js";
import {
  assertH264,
  extractPoster,
  ffmpegArgs,
  resolveFfmpeg,
} from "./encode.js";
import { resolveChromium } from "./fonts.js";
import { pacingFor } from "./pacing.js";
import { readScript, SCRIPT_DIR } from "./script-io.js";
import type { VideoScript } from "./script-types.js";
import { buildPage, planFrames, posterFrame } from "./terminal-page.js";
import { stripAnsi } from "../readme-svg.js";

export const OUT_DIR = join(SCRIPT_DIR, "out");

export function videoPath(id: VideoScript["id"]): string {
  return join(OUT_DIR, `mjolnir-${id}.mp4`);
}
export function posterPath(id: VideoScript["id"]): string {
  return join(OUT_DIR, `mjolnir-${id}-poster.png`);
}

/** Guards the render against drawing a character no vendored face has. */
function assertRenderableGlyphs(script: VideoScript): void {
  const text = script.beats
    .flatMap((b) => b.ansi)
    .map(stripAnsi)
    .join("");
  assertGlyphCoverage([
    ...new Set([...text].filter((c) => (c.codePointAt(0) ?? 0) > 0x20)),
  ]);
}

/**
 * Screenshots individual frames without encoding anything.
 *
 * A full render is minutes of Chromium screenshots; tuning pacing or
 * checking that a glyph landed does not need to pay that. Frame indices
 * come from planFrames, so a preview shows exactly what the video will.
 */
export async function previewFrames(
  id: VideoScript["id"],
  indices: number[],
): Promise<void> {
  const script = readScript(id);
  const pacing = pacingFor(id);
  const frames = planFrames(script);
  const wanted = indices.length > 0 ? indices : [posterFrame(script)];

  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ executablePath: resolveChromium() });
  try {
    const page = await browser.newPage({
      viewport: { width: pacing.viewport[0], height: pacing.viewport[1] },
      deviceScaleFactor: pacing.deviceScaleFactor,
    });
    await page.setContent(buildPage(script));
    // A string expression, not a callback: tsconfig deliberately has no
    // DOM lib (this is a Node project), so `document` has no type here.
    // Adding DOM globally to satisfy two lines would weaken typing
    // everywhere else.
    await page.evaluate("document.fonts.ready");
    for (const i of wanted) {
      const frame = frames[i];
      if (!frame)
        throw new Error(`frame ${i} is past the end (${frames.length})`);
      await page.evaluate(
        (f) =>
          (
            window as unknown as { __renderFrame: (f: unknown) => void }
          ).__renderFrame(f),
        frame,
      );
      const path = join(OUT_DIR, `preview-${id}-${i}.png`);
      await page.screenshot({ path });
      console.log(`  ${path}  ${JSON.stringify(frame)}`);
    }
  } finally {
    await browser.close();
  }
}

export async function renderVideo(id: VideoScript["id"]): Promise<void> {
  const script = readScript(id);
  const pacing = pacingFor(id);
  const frames = planFrames(script);

  // Fail before spending minutes on an encode that would ship tofu boxes
  // or die at the last step for want of a codec.
  assertRenderableGlyphs(script);
  const ffmpeg = resolveFfmpeg();
  assertH264(ffmpeg);

  mkdirSync(OUT_DIR, { recursive: true });
  const out = videoPath(id);

  const browser = await chromium.launch({ executablePath: resolveChromium() });
  const encoder = spawn(ffmpeg, ffmpegArgs({ fps: pacing.fps, out }), {
    stdio: ["pipe", "inherit", "inherit"],
  });
  const finished = new Promise<void>((resolve, reject) => {
    encoder.on("error", reject);
    encoder.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)),
    );
  });

  try {
    const page = await browser.newPage({
      viewport: { width: pacing.viewport[0], height: pacing.viewport[1] },
      deviceScaleFactor: pacing.deviceScaleFactor,
    });
    await page.setContent(buildPage(script));
    // A string expression, not a callback: tsconfig deliberately has no
    // DOM lib (this is a Node project), so `document` has no type here.
    // Adding DOM globally to satisfy two lines would weaken typing
    // everywhere else.
    await page.evaluate("document.fonts.ready");

    const started = Date.now();
    for (const [i, frame] of frames.entries()) {
      await page.evaluate(
        (f) =>
          (
            window as unknown as { __renderFrame: (f: unknown) => void }
          ).__renderFrame(f),
        frame,
      );
      const png = await page.screenshot({ type: "png" });
      if (!encoder.stdin.write(png)) {
        await new Promise((r) => encoder.stdin.once("drain", r));
      }
      if (i % 100 === 0 || i === frames.length - 1) {
        const pct = Math.round(((i + 1) / frames.length) * 100);
        const secs = ((Date.now() - started) / 1000).toFixed(0);
        process.stderr.write(
          `\r  ${id}: frame ${i + 1}/${frames.length} (${pct}%) ${secs}s`,
        );
      }
    }
    process.stderr.write("\n");
  } finally {
    encoder.stdin.end();
    await browser.close();
  }
  await finished;

  // The frame the video is "about" — the score on screen, picked by
  // content rather than a hardcoded index.
  const poster = posterFrame(script);
  extractPoster(ffmpeg, out, poster, posterPath(id));

  const seconds = (frames.length / pacing.fps).toFixed(1);
  console.log(
    `  ${id}: ${frames.length} frames, ${seconds}s -> ${out}\n` +
      `  ${id}: poster from frame ${poster} -> ${posterPath(id)}`,
  );
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const only = argv.filter((a) => !a.startsWith("-"));
  const ids: Array<VideoScript["id"]> =
    only.length > 0 ? (only as Array<VideoScript["id"]>) : ["demo", "tour"];

  // --preview[=1,2,3] screenshots frames instead of encoding a video.
  const preview = argv.find((a) => a.startsWith("--preview"));
  if (preview) {
    const list = preview.includes("=") ? preview.split("=")[1] : "";
    const indices = (list ?? "").split(",").filter(Boolean).map(Number);
    for (const id of ids) await previewFrames(id, indices);
    return;
  }

  for (const id of ids) await renderVideo(id);
}

if (process.argv[1]?.endsWith("render.ts")) await main();
