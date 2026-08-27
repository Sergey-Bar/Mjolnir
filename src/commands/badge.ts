/**
 * `mjolnir badge` — evidentiary shields.io endpoint JSON (Tier 1 #5).
 *
 * Static JSON, no server. The badge makes falsifiable claims:
 * score + date + commit. Anyone can click through and verify.
 */

import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import type { ScanResult } from "../types.js";

export interface BadgeOptions {
  /** Where to write mjolnir-badge.json. */
  outDir: string;
}

export interface BadgeJson {
  schemaVersion: 1;
  label: string;
  message: string;
  color: string;
  namedLogo?: string;
  style?: string;
}

function colorFor(score: number | null): string {
  if (score === null) return "lightgrey";
  if (score >= 90) return "brightgreen";
  if (score >= 75) return "green";
  if (score >= 50) return "yellow";
  return "red";
}

/** Build the shields.io endpoint payload from a scan result. */
export function buildBadge(result: ScanResult): BadgeJson {
  const errors = result.findings.filter((f) => f.severity === "error").length;
  const score = result.score;
  const message =
    score === null
      ? "no tests found"
      : `${score}/100 · ${errors} error${errors === 1 ? "" : "s"}`;
  return {
    schemaVersion: 1,
    label: "MJÖLNIR",
    message,
    color: colorFor(score),
    namedLogo: "vitest",
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
  writeFileSync(path, JSON.stringify(buildBadge(result), null, 2));
  return path;
}
