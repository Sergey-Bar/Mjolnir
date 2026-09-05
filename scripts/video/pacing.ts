/**
 * Pinned rendering configuration — the presentation half of the pipeline.
 *
 * Kept out of the committed script on purpose. The script is evidence and
 * a spec asserts it still matches what the CLI prints; if pacing lived
 * there too, retiming a beat would read as CLI output drift and the
 * contract would cry wolf. Here, retiming changes only the video.
 *
 * Every value is a constant: the renderer is a pure function of
 * (script, this config, frame index), with no wall clock anywhere.
 */
export const PACING = {
  /** Reporter columns. Narrower than a default terminal so the text can be
   *  large enough to read in a 1440p frame without any upscaling. */
  reporterWidth: 92,
  /** CSS pixels; at deviceScaleFactor 2 this renders 2560×1440. */
  viewport: [1280, 720] as [number, number],
  deviceScaleFactor: 2,
  fps: 30,
  /** Frames per character while a command types on screen. */
  framesPerTypedChar: 2,
  /** Frames between successive output lines appearing. */
  framesPerOutputLine: 1,
  /** Frames to hold a completed beat before moving on. */
  holdFrames: 45,
  /** Frames to hold the final frame before the loop restarts. */
  finalHoldFrames: 75,
} as const;
