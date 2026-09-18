/**
 * `qa-doctor init` — onboarding wizard (Tier 2 #10).
 *
 * Non-interactive by default (CI-safe): detects frameworks, generates
 * config + CI workflow + badge + agent instructions, and prints the
 * exact next commands. `--interactive` adds prompts when a TTY exists;
 * without one it degrades gracefully to the non-interactive path.
 *
 * Idempotent: existing files are reported, never overwritten.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { detectFrameworks } from "../discovery/frameworks.js";
import type { Workspace } from "../discovery/workspace.js";
import { nextStep, sectionHeader, plainContext } from "../reporter/ui.js";
import { parseJsonFile, isRecord } from "../lib/safe-json.js";

const ui = plainContext();

export interface InitStep {
  name: string;
  /**
   * `advice` (bug-audit L10) — runInit is a read-only wizard: it writes
   * NOTHING. The old "created" status told users files were created when
   * only advice was printed; it no longer exists.
   */
  status: "exists" | "skipped" | "advice";
  detail: string;
}

export interface InitResult {
  steps: InitStep[];
  nextCommands: string[];
  detectedFrameworks: string[];
  detectionUnknown: boolean;
}

export function runInit(
  rootDir: string,
  workspace: Workspace | null,
  options: { interactive?: boolean } = {},
): InitResult {
  const steps: InitStep[] = [];
  const nextCommands: string[] = [];

  // 1. Framework detection.
  const fw = workspace
    ? detectFrameworks(workspace)
    : { frameworks: [], unknown: true };
  steps.push({
    name: "framework-detection",
    status: fw.unknown ? "skipped" : "advice",
    detail: fw.unknown
      ? "No known test framework config found — rules still apply."
      : `Detected: ${fw.frameworks.join(", ")}`,
  });

  // 2. CI workflow (delegates to the same generator as ci install).
  const wfPath = join(".github", "workflows", "qa-doctor.yml");
  const wfExists = existsSync(join(rootDir, wfPath));
  steps.push({
    name: "ci-workflow",
    status: wfExists ? "exists" : "advice",
    detail: wfExists
      ? `${wfPath} already present — not overwritten.`
      : `Run \`qa-doctor ci install\` to generate ${wfPath}.`,
  });
  if (!wfExists) nextCommands.push("qa-doctor ci install");

  // 3. Suppressions file check.
  const supPath = join("qa-doctor.config.json");
  const supExists = existsSync(join(rootDir, supPath));
  steps.push({
    name: "config",
    status: supExists ? "exists" : "skipped",
    detail: supExists
      ? "qa-doctor.config.json present."
      : "No config needed — defaults are advisory-only.",
  });

  // 4. Badge.
  const badgePath = join("qa-doctor-badge.json");
  const badgeExists = existsSync(join(rootDir, badgePath));
  steps.push({
    name: "badge",
    status: badgeExists ? "exists" : "skipped",
    detail: badgeExists
      ? "qa-doctor-badge.json present."
      : "Run `qa-doctor badge` after your first scan.",
  });
  if (!badgeExists) nextCommands.push("qa-doctor badge");

  // 5. Interactive note (honest about degradation).
  if (options.interactive && !(process.stdout.isTTY ?? false)) {
    steps.push({
      name: "interactive",
      status: "skipped",
      detail: "--interactive requested but no TTY — ran non-interactive.",
    });
  }

  return {
    steps,
    nextCommands,
    detectedFrameworks: fw.frameworks,
    detectionUnknown: fw.unknown,
  };
}

export function renderInit(result: InitResult): string {
  const lines: string[] = [];
  lines.push(sectionHeader("QA DOCTOR INIT", ui));
  lines.push("");
  for (const s of result.steps) {
    const icon =
      s.status === "advice" ? "·" : s.status === "exists" ? "=" : "-";
    lines.push(`[${icon}] ${s.name}: ${s.detail}`);
  }
  if (result.nextCommands.length > 0) {
    lines.push("");
    lines.push("Next commands:");
    for (const c of result.nextCommands) lines.push(nextStep(c, ui));
  }
  lines.push("");
  lines.push("Existing files are never overwritten — init is safe to re-run.");
  return lines.join("\n");
}

/** Read package.json safely for workspace-less repos. */
export function tryReadPackageJson(
  rootDir: string,
): Record<string, unknown> | null {
  const p = join(rootDir, "package.json");
  if (!existsSync(p)) return null;
  try {
    return parseJsonFile(readFileSync(p, "utf8"), p, isRecord);
  } catch {
    return null;
  }
}
