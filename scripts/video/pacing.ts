/**
 * Pinned rendering configuration — the presentation half of the pipeline.
 *
 * Kept out of the committed scripts on purpose. Those files are evidence
 * and a spec asserts they still match what the CLI prints; if pacing
 * lived there too, retiming a beat would read as CLI output drift and the
 * content contract would cry wolf on a purely presentational edit.
 *
 * Every value is a constant. The renderer is a pure function of
 * (script, this config, frame index) — no wall clock anywhere — which is
 * what makes the timeline reproducible rather than merely repeatable.
 */

import type { VideoScript } from "./script-types.js";

export interface Pacing {
  /** Reporter columns requested from renderTerminal. */
  reporterWidth: number;
  /** CSS pixels; at deviceScaleFactor 2 this renders 2560x1440. */
  viewport: [number, number];
  deviceScaleFactor: number;
  fps: number;
  /** Frames per character while a command types on screen. */
  framesPerTypedChar: number;
  /** Frames between successive output lines appearing. */
  framesPerOutputLine: number;
  /** Frames per line while a patch is revealed. */
  framesPerPatchLine: number;
  /** Frames to hold a completed beat before moving on. */
  holdFrames: number;
  /** Frames to hold the final frame before the loop restarts. */
  finalHoldFrames: number;
  /**
   * Substrings that, when a revealed line contains one, earn an extra
   * pause. The score section is the point of the whole report and it
   * scrolls out of view within a couple of seconds otherwise — this
   * holds on it while it is still on screen. Content-derived and
   * therefore deterministic: the same capture always pauses in the same
   * places.
   */
  lingerOn: readonly string[];
  lingerFrames: number;
}

const SHARED = {
  reporterWidth: 92,
  viewport: [1280, 720] as [number, number],
  deviceScaleFactor: 2,
  fps: 30,
} as const;

/**
 * The hero loops, so it reads at a deliberate pace: the whole point is
 * that a viewer can follow one finding from report to fix to re-proof.
 */
const DEMO: Pacing = {
  ...SHARED,
  framesPerTypedChar: 3,
  framesPerOutputLine: 2,
  framesPerPatchLine: 4,
  holdFrames: 70,
  finalHoldFrames: 90,
  lingerOn: ["WORTHINESS"],
  lingerFrames: 75,
};

/**
 * The tour is longer and denser — a verbose report scrolls past, so each
 * line gets more time and each beat a longer settle before the next
 * command.
 */
const TOUR: Pacing = {
  ...SHARED,
  framesPerTypedChar: 3,
  framesPerOutputLine: 6,
  framesPerPatchLine: 6,
  holdFrames: 110,
  finalHoldFrames: 120,
  lingerOn: ["WORTHINESS", "FIX THIS FIRST", "FLAKINESS LEADERBOARD"],
  lingerFrames: 90,
};

export function pacingFor(id: VideoScript["id"]): Pacing {
  return id === "demo" ? DEMO : TOUR;
}

/** Values that are the same for every video (capture-time settings). */
export const PACING = SHARED;
