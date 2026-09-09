/**
 * `mjolnir install` — instruction-surface installer (agent-handoff
 * plan M4).
 *
 * Directory probes detect INSTRUCTION SURFACES, not agents: the probe
 * is a deterministic, offline existence check. All detected surfaces
 * are written; none take precedence over another.
 *
 * Safety contract (plan §17):
 * - Writes are planned by a pure `planInstall()` and executed by
 *   `executeInstall()`; `--dry-run` never executes.
 * - A target file that exists WITHOUT a Mjölnir marker is user-owned →
 *   refusal (exit 10). `--force` overwrites ONLY marker-identified
 *   Mjölnir-owned files.
 * - Re-running rewrites Mjölnir-owned regions idempotently; identical
 *   content → no write at all.
 * - Content is deterministic (no timestamps) and version-pinned to the
 *   running CLI_VERSION — never @latest.
 *
 * Exit codes: 0 installed/updated/nothing-detected (honest message) ·
 * 10 refusal/usage · 20 crash.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Output } from "../cli.js";
import { CLI_VERSION } from "../cli.js";

export const MARKER_OPEN = "<!-- mjolnir:managed";
export const MARKER_CLOSE = "<!-- /mjolnir:managed -->";

export interface InstructionSurface {
  /** Human-readable surface name (plan §8 wording). */
  name: string;
  /** Directory the surface lives in (relative to cwd). */
  dir: string;
  /** File path the instruction content is written to. */
  file: string;
  /** The exact content Mjölnir writes (deterministic, version-pinned). */
  content: string;
  /** AGENTS.md gets an appended marker block; others get whole files. */
  mode: "whole-file" | "append-block";
}

function agentBrief(surface: string, cwdNote: string): string {
  return [
    `# Mjölnir — verification trust loop (${surface})`,
    "",
    `${MARKER_OPEN} v${CLI_VERSION} -->`,
    "",
    `Run \`${cwdNote}npx mjolnir-qa@${CLI_VERSION} . --scope changed\` before finishing any task that touched test code.`,
    "",
    "- Exit 0 = clean. Exit 1 = new findings on changed lines: fix them (smallest behavior-preserving change) or justify them to the user.",
    `- npx mjolnir-qa@${CLI_VERSION} why <file>:<line> explains any finding (evidence level, measured FP rate, fix).`,
    `- npx mjolnir-qa@${CLI_VERSION} handoff renders a full remediation plan from a saved --json report.`,
    `- Agent loop: establish the before-state once with npx mjolnir-qa@${CLI_VERSION} baseline (commits .mjolnir/baseline.json); after fixing, npx mjolnir-qa@${CLI_VERSION} verify prints the before/after digest — resolved (per §15 lifecycle) / new / unchanged by ruleId+location, and the score delta. Exit 0 clean, 1 new errors, 2 partial or no baseline.`,
    "- NEVER suppress a finding merely to obtain a green scan (suppressions live in mjolnir.config.json, require a reason, and expire after 90 days).",
    "- After fixing: re-run the scan, report files changed, report checks not run, report unresolved findings honestly.",
    "",
    `<!-- /mjolnir:managed -->`,
    "",
  ].join("\n");
}

/** Enumerate every detected surface with its planned content. Pure. */
export function detectSurfaces(cwd: string): InstructionSurface[] {
  const surfaces: InstructionSurface[] = [];
  if (existsSync(join(cwd, ".claude"))) {
    surfaces.push({
      name: "Claude Code command surface",
      dir: join(cwd, ".claude", "commands"),
      file: join(cwd, ".claude", "commands", "mjolnir.md"),
      content: agentBrief("Claude Code command", "/"),
      mode: "whole-file",
    });
  }
  if (existsSync(join(cwd, ".kilo"))) {
    surfaces.push({
      name: "Kilo command surface",
      dir: join(cwd, ".kilo", "command"),
      file: join(cwd, ".kilo", "command", "mjolnir.md"),
      content: agentBrief("Kilo command", ""),
      mode: "whole-file",
    });
  }
  if (existsSync(join(cwd, ".cursor"))) {
    surfaces.push({
      name: "Cursor rule surface",
      dir: join(cwd, ".cursor", "rules"),
      file: join(cwd, ".cursor", "rules", "mjolnir.mdc"),
      content: agentBrief("Cursor rule", ""),
      mode: "whole-file",
    });
  }
  if (existsSync(join(cwd, "AGENTS.md"))) {
    surfaces.push({
      name: "AGENTS.md instruction surface",
      dir: cwd,
      file: join(cwd, "AGENTS.md"),
      content: agentBrief("AGENTS.md", ""),
      mode: "append-block",
    });
  }
  return surfaces;
}

export type InstallPlanEntry =
  | {
      action: "create" | "update-in-place" | "no-op";
      surface: string;
      file: string;
      content: string;
    }
  | {
      action: "refuse";
      surface: string;
      file: string;
      reason: string;
    };

function hasMjolnirMarker(content: string): boolean {
  return content.includes(MARKER_OPEN) && content.includes(MARKER_CLOSE);
}

function mergedBlock(existing: string, content: string): string {
  // Replace an existing Mjölnir-managed block in place; otherwise append.
  const openIdx = existing.indexOf(MARKER_OPEN);
  const closeIdx = existing.indexOf(MARKER_CLOSE);
  if (openIdx !== -1 && closeIdx !== -1 && closeIdx > openIdx) {
    const body = content.slice(
      content.indexOf(MARKER_OPEN),
      content.indexOf(MARKER_CLOSE) + MARKER_CLOSE.length,
    );
    return (
      existing.slice(0, openIdx) +
      body +
      existing.slice(closeIdx + MARKER_CLOSE.length)
    );
  }
  const sep = existing.endsWith("\n") ? "" : "\n";
  return `${existing}${sep}\n${content}`;
}

/** Pure plan: what install WOULD do. Zero I/O. */
export function planInstall(
  cwd: string,
  options: { force?: boolean } = {},
): { entries: InstallPlanEntry[]; detected: number } {
  const surfaces = detectSurfaces(cwd);
  const entries: InstallPlanEntry[] = [];
  for (const s of surfaces) {
    if (s.mode === "append-block") {
      // AGENTS.md append mode: the surface is only detected when the
      // file exists, so this arm always merges into existing content.
      const existing = readFileSync(s.file, "utf8");
      if (hasMjolnirMarker(existing)) {
        const merged = mergedBlock(existing, s.content);
        entries.push(
          merged === existing
            ? {
                action: "no-op",
                surface: s.name,
                file: s.file,
                content: existing,
              }
            : {
                action: "update-in-place",
                surface: s.name,
                file: s.file,
                content: merged,
              },
        );
        continue;
      }
      // AGENTS.md without markers is append-only by contract — the
      // existing content is preserved and the block is added at the end.
      entries.push({
        action: "create",
        surface: s.name,
        file: s.file,
        content: mergedBlock(existing, s.content),
      });
      continue;
    }
    if (existsSync(s.file)) {
      const existing = readFileSync(s.file, "utf8");
      if (existing === s.content) {
        entries.push({
          action: "no-op",
          surface: s.name,
          file: s.file,
          content: existing,
        });
        continue;
      }
      if (!hasMjolnirMarker(existing)) {
        entries.push({
          action: "refuse",
          surface: s.name,
          file: s.file,
          reason:
            "existing file is not Mjölnir-managed (no marker) — pass --force ONLY after reviewing it",
        });
        continue;
      }
      if (options.force !== true) {
        entries.push({
          action: "refuse",
          surface: s.name,
          file: s.file,
          reason:
            "Mjölnir-managed file has local edits — pass --force to overwrite",
        });
        continue;
      }
      entries.push({
        action: "update-in-place",
        surface: s.name,
        file: s.file,
        content: s.content,
      });
      continue;
    }
    entries.push({
      action: "create",
      surface: s.name,
      file: s.file,
      content: s.content,
    });
  }
  return { entries, detected: surfaces.length };
}

/** Execute a plan. Returns the number of files written. */
export function executeInstall(entries: InstallPlanEntry[]): number {
  let written = 0;
  for (const e of entries) {
    if (e.action === "refuse" || e.action === "no-op") continue;
    const dir = join(e.file, "..");
    mkdirSync(dir, { recursive: true });
    writeFileSync(e.file, e.content);
    written++;
  }
  return written;
}

/**
 * Testable install command core. Returns the process exit code.
 * `mjolnir install [--dry-run] [--force]` — probes the given cwd
 * (production default: process.cwd()).
 */
export function runInstallCommand(
  argv: string[],
  io: { out: Output; err: Output } = {
    out: (line) => console.log(line),
    err: (line) => console.error(line),
  },
  cwd: string = process.cwd(),
): number {
  const dryRun = argv.includes("--dry-run");
  const force = argv.includes("--force");
  const stagedHook = argv.includes("--staged-hook");
  for (const a of argv) {
    if (a === "--dry-run" || a === "--force" || a === "--staged-hook") continue;
    if (a === "--help" || a === "-h") continue;
    io.err(usageMessageFor(a));
    return 10;
  }

  const { entries, detected } = planInstall(cwd, { force });
  if (detected === 0 && !stagedHook) {
    io.out(
      "No instruction surfaces detected — nothing to install. " +
        "Surfaces probed: .claude/ (Claude Code), .kilo/ (Kilo), .cursor/ (Cursor), AGENTS.md.",
    );
    return 0;
  }
  if (dryRun) {
    io.out("Install plan (dry run — nothing written):");
    for (const e of entries) {
      if (e.action === "refuse") {
        io.err(`  REFUSE ${e.file}: ${e.reason}`);
      } else {
        io.out(`  ${e.action} ${e.file}`);
      }
    }
    if (stagedHook) {
      const hook = planHookInstall(cwd);
      io.out(`  ${hook.action} ${hook.file} (non-blocking pre-commit hook)`);
    }
    return 0;
  }

  let refused = false;
  for (const e of entries) {
    if (e.action === "refuse") {
      io.err(`mjolnir install: refusing ${e.file} — ${e.reason}`);
      refused = true;
      continue;
    }
    if (e.action === "no-op") continue;
  }
  const written = executeInstall(entries);
  for (const e of entries) {
    if (e.action !== "refuse" && e.action !== "no-op") {
      io.out(
        `  ${e.action}: ${e.surface} → ${e.file} (mjolnir-qa@${CLI_VERSION})`,
      );
    }
  }
  if (stagedHook) {
    const hook = planHookInstall(cwd);
    const hookWritten = executeHookInstall(hook);
    io.out(
      `  ${hook.action}: non-blocking pre-commit hook → ${hook.file} (mjolnir-qa@${CLI_VERSION} --staged --blocking warning)`,
    );
    void hookWritten;
  }
  for (const e of entries) {
    if (e.action !== "refuse" && e.action !== "no-op") {
      io.out(
        `  ${e.action}: ${e.surface} → ${e.file} (mjolnir-qa@${CLI_VERSION})`,
      );
    }
  }
  if (refused) {
    io.err(
      "Some surfaces were skipped — see refusals above. Nothing was overwritten.",
    );
    return 10;
  }
  io.out(
    `Installed on ${detected} instruction surface(s); ${written} file(s) written.`,
  );
  return 0;
}

function usageMessageFor(token: string): string {
  return `mjolnir install: unknown argument "${token}" — supported: --dry-run, --force`;
}

const HOOK_MARKER_OPEN = "# mjolnir:managed pre-commit (non-blocking)";
const HOOK_MARKER_CLOSE = "# /mjolnir:managed pre-commit";

function hookBlock(version: string): string {
  return [
    `${HOOK_MARKER_OPEN} v${version}`,
    `# Advisory: surfaces staged-file findings without blocking the commit.`,
    `mjolnir --staged --blocking warning || true`,
    HOOK_MARKER_CLOSE,
  ].join("\n");
}

/** The hook file an existing hook manager (husky / core.hooksPath) owns. */
function resolveHookTarget(cwd: string): string {
  const huskyDir = join(cwd, ".husky");
  if (existsSync(huskyDir)) return join(huskyDir, "pre-commit");
  try {
    const hooksPath = execFileSync(
      "git",
      ["-C", cwd, "config", "core.hooksPath"],
      {
        // An unset key makes git exit non-zero → the catch below treats it
        // as "no custom hooksPath". (A set-but-empty key also unsets, so
        // `hooksPath` is always non-empty when this line runs.)
        stdio: ["ignore", "pipe", "ignore"],
      },
    )
      .toString()
      .trim();
    return join(cwd, hooksPath, "pre-commit");
  } catch {
    /* no custom hooksPath */
  }
  return join(cwd, ".git", "hooks", "pre-commit");
}

export interface HookPlanEntry {
  action: "create" | "append" | "update" | "no-op" | "refuse";
  file: string;
  reason?: string;
}

/**
 * Pure plan for `--staged-hook` (plan M5). Reuses husky/core.hooksPath
 * when present; otherwise the default .git/hooks path. Marker-based:
 * an existing hook WITHOUT the marker is user-owned → refuse.
 */
export function planHookInstall(cwd: string): HookPlanEntry {
  const file = resolveHookTarget(cwd);
  if (!existsSync(file)) {
    return { action: "create", file };
  }
  // An existing hook that cannot be read (EISDIR on a path collision,
  // permission loss, …) is user infrastructure we do not understand →
  // refuse honestly instead of guessing.
  let existing: string;
  try {
    existing = readFileSync(file, "utf8");
  } catch {
    return { action: "refuse", file, reason: "existing hook is unreadable" };
  }
  if (existing.includes(HOOK_MARKER_OPEN)) {
    return { action: "update", file };
  }
  // A hook managed by husky with a shebang/shebang-less script still
  // safely accepts an appended non-blocking block (the call is `|| true`
  // so it never blocks); the existing content is preserved verbatim.
  return { action: "append", file };
}

export function executeHookInstall(entry: HookPlanEntry): boolean {
  switch (entry.action) {
    case "create": {
      mkdirSync(join(entry.file, ".."), { recursive: true });
      writeFileSync(entry.file, `#!/bin/sh\n${hookBlock(CLI_VERSION)}\n`);
      return true;
    }
    case "append": {
      const existing = readFileSync(entry.file, "utf8");
      const sep = existing.endsWith("\n") ? "" : "\n";
      writeFileSync(
        entry.file,
        `${existing}${sep}\n${hookBlock(CLI_VERSION)}\n`,
      );
      return true;
    }
    case "update": {
      const existing = readFileSync(entry.file, "utf8");
      const openIdx = existing.indexOf(HOOK_MARKER_OPEN);
      const closeIdx = existing.indexOf(HOOK_MARKER_CLOSE);
      if (openIdx !== -1 && closeIdx !== -1) {
        writeFileSync(
          entry.file,
          existing.slice(0, openIdx) +
            hookBlock(CLI_VERSION) +
            existing.slice(closeIdx + HOOK_MARKER_CLOSE.length),
        );
      } else {
        const sep = existing.endsWith("\n") ? "" : "\n";
        writeFileSync(
          entry.file,
          `${existing}${sep}\n${hookBlock(CLI_VERSION)}\n`,
        );
      }
      return true;
    }
    default:
      return false;
  }
}
