/**
 * `mjolnir badge` — evidentiary shields.io endpoint JSON (Tier 1 #5).
 *
 * Static JSON, no server. The badge makes falsifiable claims:
 * score + date + commit. Anyone can click through and verify.
 */

import { execSync } from "node:child_process";
import { writeFileAtomic } from "../lib/fs-atomic.js";
import { join } from "node:path";

import type { ScanResult } from "../types.js";
import { deriveScoreState } from "../reporter/score-state.js";

export interface BadgeOptions {
  /** Where to write mjolnir-badge.json. */
  outDir: string;
  /**
   * Audit (badge): HEAD commit of the scanned repo ("unknown" outside a
   * git checkout) — a badge must be attributable to the code it measured.
   */
  commit?: string;
}

export interface BadgeJson {
  schemaVersion: 1;
  label: string;
  message: string;
  color: string;
  namedLogo?: string;
  style?: string;
  /**
   * Audit (badge): HEAD commit of the scanned repo when available
   * ("unknown" outside a git checkout) — a badge must be attributable
   * to the code it measured.
   */
  commit?: string;
}

/**
 * Badge colors follow the SAME ScoreState bands as the terminal
 * (≥80 trusted / ≥50 warning / <50 critical / 100 forged) — this
 * retarget fixes the historical threshold drift (the badge used
 * ≥90/≥75/≥50 with four bands while the reporter used ≥80/≥50).
 *
 * Shields.io has no cyan or white-gold, so the mapping is documented
 * here: trusted → `important` (blue-family, closest to aurora-cyan),
 * forged → `success` (the strongest positive signal shields offers).
 * The badge is a peripheral surface; ScoreState remains the truth.
 */
function colorFor(score: number | null): string {
  const band = deriveScoreState(score).band;
  if (band === "unmeasured") return "lightgrey";
  if (band === "forged") return "success";
  if (band === "trusted") return "important";
  return band === "warning" ? "yellow" : "red";
}

/** Build the shields.io endpoint payload from a scan result. */
export function buildBadge(result: ScanResult, commit?: string): BadgeJson {
  const errors = result.findings.filter((f) => f.severity === "error").length;
  const score = result.score;
  const message =
    score === null
      ? "no tests found"
      : score === 100 && errors === 0
        ? "100/100 · forged"
        : `${score}/100 · ${errors} error${errors === 1 ? "" : "s"}`;
  return {
    schemaVersion: 1,
    label: "MJÖLNIR",
    message,
    color: colorFor(score),
    namedLogo: "vitest",
    ...(commit !== undefined ? { commit } : {}),
  };
}

/**
 * Full README-ready markdown snippet with commit-bound verification line
 * (the falsifiable claim: "verified at commit X on date Y").
 */
export function renderBadgeSnippet(
  result: ScanResult,
  repoUrl = "https://github.com/Sergey-Bar/Mjolnir",
): string {
  let commit = "unknown";
  try {
    commit = execSync("git rev-parse --short HEAD", {
      cwd: process.cwd(),
      encoding: "utf8",
      // Silence git's own "fatal: not a git repository" on stderr — the
      // catch below is the honest fallback, no need to leak the noise.
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    /* not a git repo or git missing — honest fallback */
  }
  const date = new Date().toISOString().slice(0, 10);
  const errors = result.findings.filter((f) => f.severity === "error").length;
  const lines = [
    "```markdown",
    "[![MJÖLNIR](https://img.shields.io/endpoint?url=<your-badge-json-url>)](" +
      repoUrl +
      ")",
    "<!-- Mjölnir verified at commit " +
      commit +
      " on " +
      date +
      ": " +
      (result.score === null ? "no tests found" : result.score + "/100") +
      ", " +
      errors +
      " blocking error(s) -->",
    "```",
  ];
  return lines.join("\n");
}

export function writeBadge(result: ScanResult, options: BadgeOptions): string {
  const path = join(options.outDir, "mjolnir-badge.json");
  writeFileAtomic(
    path,
    JSON.stringify(buildBadge(result, options.commit), null, 2),
  );
  return path;
}
