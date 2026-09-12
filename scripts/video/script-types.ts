/**
 * The committed intermediate the demo videos are rendered from.
 *
 * This file is the evidence layer. Every line of terminal output in a
 * video comes from here, and everything here came from a real Mjölnir
 * execution — the renderer may only draw what a validated script
 * contains and never invents CLI content.
 *
 * Deliberately NOT in this schema: frame timings. Pacing lives in
 * `pacing.ts` as pinned configuration, so that retiming a beat cannot
 * masquerade as a change in what the tool printed. The script holds
 * evidence; the renderer holds presentation.
 */

/** Semantic claims a beat makes, checked against a real scan. */
export interface BeatAssertions {
  /** Rule IDs that MUST appear in this beat's scan. */
  requiredFindings?: string[];
  /** Rule IDs that MUST NOT appear — the fix-and-re-run proof. */
  absentFindings?: string[];
  /** Worthiness score, discovered from the scan and never hand-written. */
  score?: number | null;
  /** Findings at severity=error, discovered from the scan. */
  errorCount?: number;
  /** Total findings, discovered from the scan. */
  findingCount?: number;
}

export interface Beat {
  /** Stable identifier, referenced by the renderer and the specs. */
  id: string;
  /** What this beat claims to show, in one line, for a human reviewer. */
  narrative: string;
  /** Repo-relative fixture this beat ran against. */
  source: string;
  /** The command line typed on screen. */
  command: string;
  /** Exactly what the CLI printed, ANSI intact. */
  ansi: string[];
  /** Machine-checked claims. Absent for beats that make none. */
  assertions?: BeatAssertions;
}

export interface VideoScript {
  schemaVersion: 1;
  /** Which video this drives. */
  id: "demo" | "tour";
  /**
   * The only normalization applied to captured output, spelled out so a
   * reader can tell exactly how far the recording is from raw stdout.
   */
  normalization: string[];
  /**
   * Diagnostic metadata for explaining why two renders differ. NOT
   * evidence that a render is correct, and no spec treats it as such.
   */
  environment: {
    reporterWidth: number;
    viewport: [number, number];
    deviceScaleFactor: number;
    fps: number;
    fonts: string[];
  };
  beats: Beat[];
  /**
   * The before/after workflow the fix beat displays. Both sides are the
   * real files the two scans actually ran against.
   */
  patch?: { file: string; before: string[]; after: string[] };
}
