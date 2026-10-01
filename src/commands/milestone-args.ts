/**
 * The argument layer every milestone command shares.
 *
 * `parseMilestoneArgs`, `rejectUnexpectedOptions`, `validateTarget` and
 * `isWorkflowFile` were one private set inside `commands/milestone.ts`. Seven
 * commands used them, and the v6 collapse moved those commands to `ci
 * <sub>` and `explain --call` without moving the parser, so a file named after
 * a milestone milestone held the arg parsing for commands that are not
 * milestones.
 *
 * Exported rather than copied, deliberately: a flag rule that exists in two
 * places is a flag rule that can disagree with itself, and the copy a pipeline
 * runs is the one that has to be right.
 *
 * Carve 1.6.1.
 */

import { existsSync, statSync } from "node:fs";
import { basename } from "node:path";
import { EXIT_USAGE } from "../exit-codes.js";
import type { Output } from "../cli-io.js";

/**
 * The parsed shape every milestone command starts from. Declared HERE rather
 * than in the module that consumes it, because three modules parse it and one
 * module owns the parsing — and a type with three homes is a type with none.
 */
export interface MilestoneArgs {
  target: string;
  json: boolean;
  maxDurationMs: number;
  framework?: string;
  policy?: string;
  history?: string;
  recordedAt?: string;
  contract?: string;
  file?: string;
  rule?: string;
}

export function startsWithFlag(value: string): boolean {
  return value.charCodeAt(0) === 45;
}

export function parseMilestoneArgs(
  argv: string[],
  io: { err: Output },
): MilestoneArgs | null {
  const args: MilestoneArgs = {
    target: ".",
    json: false,
    maxDurationMs: Number.POSITIVE_INFINITY,
  };
  let targetSeen = false;

  const value = (index: number, flag: string): string | null => {
    const candidate = argv[index];
    if (candidate === undefined || startsWithFlag(candidate)) {
      io.err(`mjolnir: ${flag} requires a value`);
      return null;
    }
    return candidate;
  };

  for (let index = 0; index < argv.length; index++) {
    const token = argv[index] ?? "";
    switch (token) {
      case "--json":
        args.json = true;
        break;
      case "--format": {
        const format = value(++index, "--format");
        if (format === null) return null;
        if (format === "json") args.json = true;
        else if (format !== "terminal") {
          io.err("mjolnir: milestone commands support --format terminal|json");
          return null;
        }
        break;
      }
      case "--no-progress":
        break;
      case "--max-duration": {
        const raw = value(++index, "--max-duration");
        if (raw === null) return null;
        const seconds = Number(raw);
        if (!Number.isFinite(seconds) || seconds <= 0) {
          io.err("mjolnir: --max-duration requires positive seconds");
          return null;
        }
        args.maxDurationMs = seconds * 1000;
        break;
      }
      case "--framework": {
        const framework = value(++index, "--framework");
        if (framework === null) return null;
        args.framework = framework;
        break;
      }
      case "--policy": {
        const policy = value(++index, "--policy");
        if (policy === null) return null;
        args.policy = policy;
        break;
      }
      case "--history": {
        const history = value(++index, "--history");
        if (history === null) return null;
        args.history = history;
        break;
      }
      case "--recorded-at": {
        const recordedAt = value(++index, "--recorded-at");
        if (recordedAt === null || Number.isNaN(Date.parse(recordedAt))) {
          io.err("mjolnir: --recorded-at requires an ISO-8601 timestamp");
          return null;
        }
        args.recordedAt = recordedAt;
        break;
      }
      case "--contract": {
        const contract = value(++index, "--contract");
        if (contract === null) return null;
        args.contract = contract;
        break;
      }
      case "--file": {
        const file = value(++index, "--file");
        if (file === null) return null;
        args.file = file;
        break;
      }
      case "--rule": {
        const rule = value(++index, "--rule");
        if (rule === null) return null;
        args.rule = rule;
        break;
      }
      default: {
        if (startsWithFlag(token)) {
          io.err(`mjolnir: unknown milestone command flag "${token}"`);
          return null;
        }
        if (targetSeen) {
          io.err("mjolnir: milestone commands accept one target path");
          return null;
        }
        args.target = token;
        targetSeen = true;
      }
    }
  }

  return args;
}

export function rejectUnexpectedOptions(
  args: MilestoneArgs,
  allowed: ReadonlySet<keyof MilestoneArgs>,
  io: { err: Output },
): boolean {
  const unexpected = (
    [
      "framework",
      "policy",
      "history",
      "recordedAt",
      "contract",
      "file",
      "rule",
    ] as const
  ).find((key) => args[key] !== undefined && !allowed.has(key));
  if (!unexpected) return false;
  io.err(`mjolnir: option --${unexpected} is not valid for this command`);
  return true;
}

export function validateTarget(
  target: string,
  io: { err: Output },
): { target: string } | { code: number } {
  if (!existsSync(target)) {
    io.err(`mjolnir: scan target does not exist: ${target}`);
    return { code: EXIT_USAGE };
  }
  if (!statSync(target).isDirectory()) {
    io.err(`mjolnir: scan target is not a directory: ${target}`);
    return { code: EXIT_USAGE };
  }
  return { target };
}

export function isWorkflowFile(path: string): boolean {
  const normalized = path.replaceAll("\\", "/");
  return (
    normalized.startsWith(".github/workflows/") ||
    normalized === ".gitlab-ci.yml" ||
    normalized === ".gitlab-ci.yaml" ||
    basename(normalized) === "Jenkinsfile"
  );
}
